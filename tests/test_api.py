from __future__ import annotations

import itertools
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import AsyncMock, patch
from xml.etree import ElementTree
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "server"))
os.environ.setdefault("ALLOWED_HOSTS", "testserver")
os.environ.setdefault("RATE_LIMIT", "1000")
os.environ.setdefault("VIEWS", "snapshot")

from starlette.testclient import TestClient  # noqa: E402

import app as webapp  # noqa: E402
from eurostat import Relay, RelayError, validated_query  # noqa: E402

PUBLISHED = "2026-09-15T11:00:00+0200"
NEXT_PUBLICATION = "2026-10-15T11:00:00+0200"
NEVER = 10**12
WINE_QUERY = [("product", "22041011"), ("flow", "1"), ("time", "2025")]
MCP_HEADERS = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json",
               "MCP-Protocol-Version": "2025-06-18"}


def json_stat_response(version: str, first_value: int = 5) -> dict:
    return {
        "class": "dataset", "id": ["partner", "flow", "time"], "size": [2, 1, 2], "updated": version,
        "dimension": {"partner": {"category": {"index": {"FR": 0, "WORLD": 1}}}, "flow": {"category": {"index": {"1": 0}}},
                      "time": {"category": {"index": {"2024": 0, "2025": 1}}}, "product": {"category": {"label": {}}}},
        "value": {"0": first_value, "1": 8, "2": 10, "3": 20},
    }


def is_publication_probe(url: str) -> bool:
    return ("product=TOTAL" in url and "sinceTimePeriod" in url and "partner=WORLD" in url and "reporter=LU" in url
            and "flow=1" in url and "flow=2" not in url)


class FakeEurostat:
    def __init__(self, version: str = PUBLISHED):
        self.version, self.first_value, self.delay, self.down = version, 5, 0.0, False
        self.calls, self.probes = [], 0
        self.lock = threading.Lock()

    def __call__(self, request):
        url = str(request.url)
        if is_publication_probe(url):
            self.probes += 1
            return httpx.Response(200, json=json_stat_response(self.version))
        with self.lock:
            self.calls.append(url)
        if self.delay:
            time.sleep(self.delay)
        if self.down:
            return httpx.Response(503)
        if "22049999" in url:
            return httpx.Response(413, json={"error": "EXTRACTION_TOO_BIG"})
        return httpx.Response(200, json=json_stat_response(self.version, self.first_value))


def relay_on(eurostat: FakeEurostat, cache_dir: str | None = None, **options) -> Relay:
    options.setdefault("probe_interval", NEVER)
    options.setdefault("warm_pause", 0)
    return Relay(cache_dir=cache_dir, client=httpx.Client(transport=httpx.MockTransport(eurostat)), **options)


def first_cell(copy) -> int:
    return json.loads(copy.body)["value"]["0"]


class Server(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(webapp.app).__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_site_and_health(self):
        page = self.client.get("/")
        self.assertEqual(page.status_code, 200)
        self.assertIn(f"v/{webapp.VERSION}/assets/app.js", page.text)
        self.assertEqual(page.headers["cache-control"], "no-cache")
        asset = self.client.get(f"/v/{webapp.VERSION}/assets/app.js")
        self.assertEqual(asset.status_code, 200)
        expected_cache = "no-cache" if webapp.VERSION == "dev" else "immutable"
        self.assertIn(expected_cache, asset.headers["cache-control"])
        self.assertEqual(self.client.get("/v/another-release/assets/app.js").status_code, 404)
        self.assertEqual(self.client.get("/v/x/../server/app.py").status_code, 404)
        self.assertIn("content-security-policy", page.headers)
        data = self.client.get("/data/meta.json")
        self.assertIn("stale-while-revalidate", data.headers["cache-control"])
        self.assertEqual(self.client.get("/data/meta.json", headers={"if-none-match": data.headers["etag"]}).status_code, 304)
        self.assertEqual(self.client.get("/data/meta.json", headers={"if-none-match": '"older", W/' + data.headers["etag"]}).status_code, 304)
        self.assertEqual(self.client.get("/data/../server/app.py").status_code, 404)
        self.assertEqual(self.client.get("/feed.xml").headers["content-type"], "application/rss+xml")
        health = self.client.get("/health").json()
        self.assertEqual(health["status"], "ok")

    def test_large_responses_are_compressed(self):
        search = self.client.get("/data/search.json", headers={"accept-encoding": "gzip"})
        self.assertEqual(search.headers["content-encoding"], "gzip")
        self.assertLess(int(search.headers["content-length"]), len(search.content) / 2)
        self.assertIn("content-security-policy", search.headers)
        self.assertNotIn("content-encoding", self.client.get("/health", headers={"accept-encoding": "gzip"}).headers)

    def test_rest_endpoints(self):
        self.assertIn("endpoints", self.client.get("/api/v1/").json())
        overview = self.client.get("/api/v1/overview?lang=en").json()
        self.assertGreater(overview["imports_eur"], overview["exports_eur"])
        search = self.client.get("/api/v1/search?q=caf%C3%A9").json()
        self.assertEqual(search["results"][0]["code"], "0901")
        wine = self.client.get("/api/v1/products/2204?flow=imports").json()
        self.assertEqual(wine["top_partners"][0]["country_code"], "FR")
        self.assertEqual(self.client.get("/api/v1/countries/FR").json()["country"]["code"], "FR")
        self.assertIn("items", self.client.get("/api/v1/changes?flow=exports&limit=3").json())
        self.assertIn("explanation", self.client.get("/api/v1/terms/expedition").json())

    def test_rest_errors(self):
        self.assertEqual(self.client.get("/api/v1/search").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/overview?lang=xx").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/countries/Atlantide").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/products/123").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/products/a2204").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/eurostat?product=2204&reporter=FR&url=x").status_code, 400)

    def test_mcp_over_http(self):
        init = self.client.post("/mcp", headers=MCP_HEADERS, json={
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}}})
        self.assertEqual(init.status_code, 200, init.text)
        tools = self.client.post("/mcp", headers=MCP_HEADERS, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"}).json()
        names = {tool["name"] for tool in tools["result"]["tools"]}
        self.assertIn("product_trade", names)
        call = self.client.post("/mcp", headers=MCP_HEADERS, json={
            "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "search_products", "arguments": {"query": "vin"}}}).json()
        self.assertFalse(call["result"].get("isError"))

    def test_mcp_rejects_unknown_host(self):
        response = self.client.post("/mcp", headers={"Host": "evil.example", "Accept": "application/json, text/event-stream",
                                                      "Content-Type": "application/json"},
                                    json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        self.assertIn(response.status_code, (400, 403, 421))

    def test_forwarded_headers_cannot_bypass_rate_limits(self):
        with patch.object(webapp, "RATE_LIMITER", webapp.RateLimiter()), patch.object(webapp, "API_REQUESTS_PER_MINUTE", 2):
            for number in range(2):
                response = self.client.get("/api/v1/overview", headers={"cf-connecting-ip": f"203.0.113.{number}",
                                                                         "x-forwarded-for": f"198.51.100.{number}"})
                self.assertEqual(response.status_code, 200)
            refused = self.client.get("/api/v1/overview", headers={"cf-connecting-ip": "203.0.113.99"})
            self.assertEqual(refused.status_code, 429)
            self.assertEqual(refused.headers["cache-control"], "no-store")
            self.assertEqual(refused.headers["retry-after"], "60")
            self.assertIn("content-security-policy", refused.headers)

    def test_share_preview_and_hsts_follow_the_public_url(self):
        with patch.object(webapp, "PUBLIC_URL", "https://example.test/trade"):
            page = self.client.get("/")
        self.assertIn('content="https://example.test/trade/assets/share.png"', page.text)
        self.assertIn('content="https://example.test/trade/"', page.text)
        self.assertEqual(page.headers["strict-transport-security"], "max-age=31536000")
        self.assertNotIn("strict-transport-security", self.client.get("/").headers)
        for icon in ("/favicon.ico", "/apple-touch-icon.png", "/assets/share.png"):
            self.assertEqual(self.client.get(icon).status_code, 200, icon)

    def test_rss_links_use_the_configured_public_url(self):
        with patch.object(webapp, "PUBLIC_URL", "https://example.test/trade"):
            feed = self.client.get("/feed-en.xml")
        links = [link.text for link in ElementTree.fromstring(feed.content).iter("link")]
        self.assertTrue(links)
        self.assertTrue(all(link.startswith("https://example.test/trade/index.html#/") for link in links))
        self.assertTrue(links[0].endswith("#/changes?lang=en"))
        self.assertTrue(all("#/product/" in link and "flow=" in link for link in links[1:]))

    def test_cached_french_feed_links_are_updated_to_english(self):
        legacy = b'''<rss><channel><link>https://old.test/index.html#/changements?lang=de</link>
            <item><link>https://old.test/index.html#/produit/2204?flux=imp&amp;lang=de</link><guid>imp-2204</guid></item>
            <item><link>https://old.test/index.html#/produit/72?flux=exp&amp;lang=de</link><guid>exp-72</guid></item>
            </channel></rss>'''
        with patch.object(webapp, "_computed_file", AsyncMock(return_value=legacy)), \
                patch.object(webapp, "PUBLIC_URL", "https://example.test/trade"):
            response = self.client.get("/feed-de.xml")
        self.assertEqual(response.status_code, 200)
        document = ElementTree.fromstring(response.content)
        self.assertEqual([link.text for link in document.iter("link")], [
            "https://example.test/trade/index.html#/changes?lang=de",
            "https://example.test/trade/index.html#/product/2204?flow=imports&lang=de",
            "https://example.test/trade/index.html#/product/72?flow=exports&lang=de",
        ])
        self.assertEqual([guid.text for guid in document.iter("guid")], ["imp-2204", "exp-72"])


class Relaying(unittest.TestCase):
    def test_parameters_are_filtered(self):
        query = validated_query([("product", "2204"), ("flow", "1"), ("time", "2025")])
        self.assertEqual(query[:2], [("format", "JSON"), ("reporter", "LU")])
        rejected_queries = (
            [("product", "22")],
            [("product", "2204"), ("time", "2025"), ("callback", "x")],
            [("product", "2204"), ("time", "2025"), ("partner", "FR; DROP")],
            [("product", "abc"), ("time", "2025")],
            [("product", "2204"), ("time", "2025"), ("reporter", "FR")],
            [("product", "2204"), ("time", "2025"), ("reporter", "US"), ("partner", "WORLD")],
        )
        for rejected in rejected_queries:
            with self.assertRaises(RelayError):
                validated_query(rejected)

    def test_eu_reporters_for_comparisons(self):
        query = validated_query([("product", "TOTAL"), ("partner", "WORLD"), ("sinceTimePeriod", "2002"),
                                 ("reporter", "LU"), ("reporter", "BE"), ("reporter", "BE")])
        self.assertEqual([value for key, value in query if key == "reporter"], ["BE", "LU"])
        self.assertIn(("product", "TOTAL"), query)


class Caching(unittest.TestCase):
    def test_copies_follow_eurostat_publications(self):
        eurostat = FakeEurostat()
        with tempfile.TemporaryDirectory() as cache_dir:
            relay = relay_on(eurostat, cache_dir)
            self.assertEqual(relay.check_version(), eurostat.version)
            self.assertEqual(relay.fetch_entry(WINE_QUERY)[1], "network")
            self.assertEqual(relay.fetch_entry(WINE_QUERY)[1], "memory")
            relay.memory.clear()
            self.assertEqual(relay.fetch_entry(WINE_QUERY)[1], "disk")
            self.assertEqual(len(eurostat.calls), 1)

            eurostat.version, eurostat.first_value = NEXT_PUBLICATION, 7
            relay.check_version()
            relay.drain()
            self.assertEqual(relay.stats["warmed"], 1)
            copy, origin, _ = relay.fetch_entry(WINE_QUERY)
            self.assertEqual(origin, "memory")
            self.assertEqual(first_cell(copy), 7)
            self.assertEqual(len(eurostat.calls), 2)

            restarted = relay_on(eurostat, cache_dir)
            restarted.check_version()
            self.assertEqual(restarted.fetch_entry(WINE_QUERY)[1], "disk")
            self.assertEqual(len(eurostat.calls), 2)

    def test_stale_copy_is_served_while_refreshing_and_kept_when_eurostat_is_down(self):
        eurostat = FakeEurostat()
        relay = relay_on(eurostat, warm_count=0)
        relay.check_version()
        relay.fetch_entry(WINE_QUERY)
        eurostat.version, eurostat.first_value = NEXT_PUBLICATION, 7
        relay.check_version()
        copy, origin, _ = relay.fetch_entry(WINE_QUERY)
        self.assertEqual((origin, first_cell(copy)), ("stale", 5))
        relay.drain()
        copy, origin, _ = relay.fetch_entry(WINE_QUERY)
        self.assertEqual((origin, first_cell(copy)), ("memory", 7))

        eurostat.version, eurostat.down = "2026-11-16T11:00:00+0200", True
        relay.check_version()
        for _ in range(3):
            copy, origin, _ = relay.fetch_entry(WINE_QUERY)
            relay.drain()
        self.assertEqual((origin, first_cell(copy)), ("stale", 7))
        self.assertGreater(relay.stats["errors"], 0)

    def test_simultaneous_requests_share_one_upstream_call(self):
        eurostat = FakeEurostat()
        eurostat.delay = 0.3
        relay = relay_on(eurostat)
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(lambda _: relay.fetch_entry(WINE_QUERY), range(10)))
        self.assertEqual(len(eurostat.calls), 1)
        self.assertEqual(sorted(origin for _, origin, _ in results).count("network"), 1)
        self.assertEqual(len({copy.etag for copy, _, _ in results}), 1)

    def test_memory_and_disk_are_bounded(self):
        eurostat = FakeEurostat()
        size = len(json.dumps(json_stat_response(eurostat.version)).encode())
        with tempfile.TemporaryDirectory() as cache_dir:
            relay = relay_on(eurostat, cache_dir, memory_bytes=3 * size, disk_bytes=4 * size)
            for year in range(2010, 2020):
                relay.fetch_entry([("product", "2204"), ("flow", "1"), ("time", str(year))])
            self.assertLessEqual(relay.memory_size, 3 * size)
            self.assertLessEqual(len(list(Path(cache_dir).glob("*.json"))), 4)
            self.assertGreater(relay.stats["evicted"], 0)

            relay.memory.clear()
            self.assertEqual(relay.fetch_entry([("product", "2204"), ("flow", "1"), ("time", "2019")])[1], "disk")

    def test_one_large_response_does_not_exceed_the_memory_budget(self):
        relay = relay_on(FakeEurostat(), memory_bytes=10)
        self.assertEqual(relay.fetch_entry(WINE_QUERY)[1], "network")
        self.assertEqual(relay.memory_size, 0)
        self.assertFalse(relay.memory)

    def test_concurrent_disk_evictions_do_not_fail_requests(self):
        with tempfile.TemporaryDirectory() as cache_dir:
            relay = relay_on(FakeEurostat(), cache_dir, memory_bytes=1000, disk_bytes=1500)
            def fetch(year):
                return relay.fetch_entry([("product", "2204"), ("flow", "1"), ("time", str(year))])[0]
            with ThreadPoolExecutor(max_workers=12) as pool:
                copies = list(pool.map(fetch, range(1990, 2030)))
            self.assertEqual(len(copies), 40)
            self.assertLessEqual(sum(path.stat().st_size for path in Path(cache_dir).glob("*.json")), 1500)

    def test_malformed_upstream_json_becomes_an_api_error(self):
        for payload in ([], None, {"error": "not a dataset"}):
            with self.subTest(payload=payload):
                relay = Relay(client=httpx.Client(transport=httpx.MockTransport(lambda _, body=payload: httpx.Response(200, content=json.dumps(body)))),
                              probe_interval=NEVER)
                with self.assertRaises(RelayError) as caught:
                    relay.fetch_entry(WINE_QUERY)
                self.assertEqual(caught.exception.status, 502)

    def test_refusals_are_remembered(self):
        eurostat = FakeEurostat()
        relay = relay_on(eurostat)
        for _ in range(3):
            with self.assertRaises(RelayError) as caught:
                relay.fetch_entry([("product", "22049999"), ("time", "2025")])
            self.assertEqual(caught.exception.status, 413)
        self.assertEqual(len(eurostat.calls), 1)
        self.assertEqual(relay.stats["negative"], 2)


class RelayEndpoint(unittest.TestCase):
    client_addresses = (f"203.0.113.{number}" for number in itertools.count(1))

    def setUp(self):
        self.eurostat = FakeEurostat()
        self.original_client_and_budget = (webapp.relay.client, webapp.EUROSTAT_REQUESTS_PER_MINUTE)
        webapp.relay.client = httpx.Client(transport=httpx.MockTransport(self.eurostat))
        webapp.relay.memory.clear()
        webapp.relay.memory_size = 0
        webapp.EUROSTAT_REQUESTS_PER_MINUTE = 2
        self.client = TestClient(webapp.app, client=(next(RelayEndpoint.client_addresses), 50000))

    def tearDown(self):
        webapp.relay.drain()
        webapp.relay.client, webapp.EUROSTAT_REQUESTS_PER_MINUTE = self.original_client_and_budget

    def get(self, year, **headers):
        return self.client.get(f"/api/v1/eurostat?product=2204&flow=1&time={year}", headers=headers)

    def test_etag_and_not_modified(self):
        first = self.get(2001)
        self.assertEqual(first.status_code, 200)
        self.assertIn("stale-while-revalidate", first.headers["cache-control"])
        self.assertEqual(first.headers["x-eurostat-updated"], self.eurostat.version)
        again = self.get(2001, **{"if-none-match": first.headers["etag"]})
        self.assertEqual(again.status_code, 304)
        self.assertEqual(again.content, b"")
        self.assertEqual(again.headers["x-relay-cache"], "memory")

    def test_budget_counts_only_upstream_calls(self):
        self.assertEqual(self.get(2002).status_code, 200)
        self.assertEqual(self.get(2003).status_code, 200)
        self.assertEqual(self.get(2004).status_code, 429)
        for _ in range(5):
            self.assertEqual(self.get(2002).status_code, 200)
        self.assertEqual(len(self.eurostat.calls), 2)
        health = self.client.get("/health").json()["relay"]
        self.assertGreaterEqual(health["memory"], 5)
        self.assertIn("hit_ratio", health)


if __name__ == "__main__":
    unittest.main()
