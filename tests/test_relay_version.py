from __future__ import annotations

import sys
import unittest
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from eurostat import Relay  # noqa: E402

POPULATION = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan"
NEVER = 10**12


class ComextVersion(unittest.TestCase):
    def test_population_does_not_advance_the_comext_version(self):
        published = {"comext": "2026-09-15T11:00:00+0200", "population": "2026-10-01T11:00:00+0200"}

        def fake_eurostat(request):
            dataset = "population" if "demo_pjan" in str(request.url) else "comext"
            return httpx.Response(200, json={"class": "dataset", "updated": published[dataset], "id": [], "size": [],
                                             "dimension": {}, "value": {}})

        relay = Relay(client=httpx.Client(transport=httpx.MockTransport(fake_eurostat)), probe_interval=NEVER, warm_pause=0)
        self.assertEqual(relay.check_version(), published["comext"])
        relay.fetch_trusted([("geo", "LU"), ("sex", "T")], base_url=POPULATION)
        self.assertEqual(relay.version, published["comext"])
        comext = relay.fetch_entry([("product", "2204"), ("flow", "1"), ("time", "2025")])[0]
        self.assertTrue(relay.fresh(comext))

        published["comext"] = "2026-10-15T11:00:00+0200"
        relay.fetch_entry([("product", "2204"), ("flow", "1"), ("time", "2024")])
        self.assertEqual(relay.version, "2026-10-15T11:00:00+0200")


if __name__ == "__main__":
    unittest.main()
