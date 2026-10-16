from __future__ import annotations

import itertools
import json
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from pathlib import Path
from xml.etree import ElementTree

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "server"))

import views  # noqa: E402
from eurostat import Relay  # noqa: E402

CN8_VALUES_BY_FLOW = {"22042111": {"1": 100e6, "2": 2e6}, "84713000": {"1": 50e6, "2": 80e6}}
PARTNER_SHARES = {"FR": 0.6, "BE": 0.3, "DE": 0.05, "QS": 0.05}
AGGREGATES = {"WORLD": list(PARTNER_SHARES), "INT_EU27_2020": ["FR", "BE", "DE"]}
PRODUCT_CODES = ["TOTAL", "22", "2204", "220421", "22042111", "84", "8471", "847130", "84713000"]
PARTNERS = list(PARTNER_SHARES) + list(AGGREGATES)
COUNTRY_LABELS = {"FR": "France", "BE": "Belgium", "DE": "Germany"}
YEARS = [str(year) for year in range(1999, 2026)]
VERSION = "2026-09-15T11:00:00+0200"


def month_range(first: str, last: str) -> list[str]:
    year, month = map(int, first.split("-"))
    last_year, last_month = map(int, last.split("-"))
    months = []
    while (year, month) <= (last_year, last_month):
        months.append(f"{year}-{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return months


MONTHS = month_range("2023-01", "2026-06")


def product_total(product: str, flow: str) -> float:
    return sum(values[flow] for code, values in CN8_VALUES_BY_FLOW.items() if product == "TOTAL" or code.startswith(product))


def value(reporter, partner, product, flow, indicator, period):
    share = sum(PARTNER_SHARES[member] for member in AGGREGATES[partner]) if partner in AGGREGATES else PARTNER_SHARES.get(partner)
    if share is None:
        return None
    if len(period) == 4:
        amount = product_total(product, flow) * (1 + 0.02 * (int(period) - 1999))
    else:
        amount = product_total(product, flow) * 1.52 / 12 * (1 + 0.002 * MONTHS.index(period))
    amount *= share * (1 if reporter == "LU" else 2)
    return round(amount / 1000 if indicator == views.QUANTITY else amount)


def as_strings(value) -> list[str]:
    return [str(item) for item in (value if isinstance(value, (list, tuple)) else [value])]


def fake_label(dimension: str, code: str, lang: str) -> str:
    return f"{lang}:{code}" if dimension == "product" else COUNTRY_LABELS.get(code, code)


class FakeComext(views.EurostatReader):
    def __init__(self):
        super().__init__(relay=None, workers=2)

    def cube(self, **params):
        self.calls += 1
        params = {**self.DEFAULTS, **params}
        periods = YEARS if params["freq"] == "A" else MONTHS
        if "time" in params:
            periods = [period for period in periods if period in as_strings(params["time"])]
        elif "sinceTimePeriod" in params:
            periods = [period for period in periods if period >= str(params["sinceTimePeriod"])]
        dimensions = [("freq", [params["freq"]]), ("reporter", as_strings(params["reporter"])),
                      ("partner", as_strings(params["partner"]) if "partner" in params else PARTNERS),
                      ("product", as_strings(params["product"]) if "product" in params else PRODUCT_CODES),
                      ("flow", as_strings(params.get("flow", ["1", "2"]))),
                      ("indicators", as_strings(params["indicators"])), ("time", periods)]
        values = {}
        for position, (_, reporter, partner, product, flow, indicator, period) in enumerate(
                itertools.product(*(codes for _, codes in dimensions))):
            cell = value(reporter, partner, product, flow, indicator, period)
            if cell is not None:
                values[str(position)] = cell
        return views.Cube({"class": "dataset", "updated": VERSION, "id": [name for name, _ in dimensions],
                           "size": [len(codes) for _, codes in dimensions],
                           "dimension": {name: {"category": {"index": {code: index for index, code in enumerate(codes)},
                                                             "label": {code: fake_label(name, code, params["lang"]) for code in codes}}}
                                         for name, codes in dimensions},
                           "value": values})

    def population(self, first_year):
        return {"updated": "2026-09-25", "values": {(code, year): 1_000_000 for code in views.EU27 for year in range(first_year, 2026)}}


class Build(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reader = FakeComext()
        cls.files = views.build(cls.reader, log=lambda *_: None)

    def test_every_site_file_is_built(self):
        for name in ("meta.json", "overview.json", "countries.json", "products/22.json", "products/84.json", "changes.json",
                     "quiz.json", "search.json", "catalog-fr.json", "catalog-de.json", "population.json", "feed.xml", "feed-en.xml"):
            self.assertIn(name, self.files)
        meta = self.files["meta.json"]
        self.assertEqual((meta["latest_year"], meta["months"], meta["chapters"]), (2025, ["2023-12", "2026-06"], ["22", "84"]))
        self.assertEqual(meta["source_updated"], "2026-09-15")
        self.assertIn("<rss", self.files["feed.xml"])

    def test_feeds_use_english_urls_in_every_language(self):
        for language, name in [("fr", "feed.xml"), ("en", "feed-en.xml"), ("de", "feed-de.xml")]:
            with self.subTest(language=language):
                links = [link.text for link in ElementTree.fromstring(self.files[name]).iter("link")]
                self.assertTrue(links[0].endswith(f"#/changes?lang={language}"))
                self.assertGreater(len(links), 1)
                for link in links[1:]:
                    self.assertRegex(link, rf"#/product/\d+\?flow=(imports|exports)&lang={language}$")

    def test_overview_totals_and_partners(self):
        overview = self.files["overview.json"]
        self.assertEqual(overview["totals"]["imp"][-1], value("LU", "WORLD", "TOTAL", "1", views.VALUE, "2025"))
        rows = overview["partners"]["imp"]["rows"]
        self.assertEqual([row[0] for row in rows], ["FR", "BE", "DE"])
        self.assertEqual(overview["partners"]["imp"]["unspecified"], value("LU", "QS", "TOTAL", "1", views.VALUE, "2025"))
        self.assertEqual(overview["kg"]["imp"], value("LU", "WORLD", "TOTAL", "1", views.QUANTITY, "2025") * 100)
        self.assertEqual(overview["neighbours"]["BE"]["exp"]["2025"], value("BE", "WORLD", "TOTAL", "2", views.VALUE, "2025"))
        self.assertEqual(set(overview["chapter_series"]), {"22", "84"})
        self.assertEqual(overview["chapter_series"]["22"]["imp"], self.files["products/22.json"]["items"]["22"]["series"]["imp"])

    def test_products(self):
        wine = self.files["products/22.json"]["items"]["2204"]
        self.assertEqual(wine["name"]["fr"], "Vin")
        self.assertEqual([row[0] for row in wine["partners"]["imp"]], ["FR", "BE", "DE", "ZZ"])
        self.assertEqual(wine["children"]["imp"][0][0], "220421")
        self.assertEqual(sorted(wine["history"]["imp"]), ["BE", "DE", "FR"])
        self.assertEqual(len(wine["monthly"]["imp"]), 31)
        subheading = self.files["products/22.json"]["items"]["220421"]
        self.assertLessEqual(len(subheading["partners"]["imp"]), 5)
        self.assertIsNone(subheading["monthly"]["imp"])
        self.assertIn("22042111", self.files["catalog-fr.json"])

    def test_countries_changes_and_quiz(self):
        countries = self.files["countries.json"]
        self.assertEqual(sorted(countries["countries"]), ["BE", "DE", "FR"])
        self.assertEqual(countries["names"]["FR"]["en"], "France")
        self.assertEqual(countries["countries"]["FR"]["products"]["imp"][0][0], "2204")
        changes = self.files["changes.json"]
        self.assertEqual(changes["window"]["now"], ["2025-07", "2026-06"])
        for item in changes["items"]:
            self.assertEqual(item["delta"], item["now"] - item["before"])
        answers = {question["id"]: question.get("answer") for question in self.files["quiz.json"]["questions"]}
        self.assertEqual(answers["top_supplier"], "FR")
        self.assertEqual(answers["wine"], "FR")


class Store(unittest.TestCase):
    def test_visiting_published_data_checks_for_a_new_release(self):
        relay = Mock(version=VERSION)
        store = views.ViewStore(relay, None)
        store.files, store.version = {"meta.json": b"{}"}, VERSION
        relay.probe_if_due.side_effect = lambda: setattr(relay, "version", "2026-10-15")
        with patch("views.threading.Thread") as worker:
            self.assertEqual(store.get("meta.json"), b"{}")
            worker.return_value.start.assert_called_once()
        relay.probe_if_due.assert_called_once()

    def test_a_failed_build_does_not_restart_on_every_request(self):
        relay = Mock(version=VERSION)
        store = views.ViewStore(relay, None, log=lambda _: None)
        with patch.object(store, "_build_in_process", side_effect=RuntimeError("offline")):
            store._build()
        self.assertIn("offline", store.health()["error"])
        with patch("views.threading.Thread") as worker:
            store.get("meta.json")
            store.get("overview.json")
            worker.assert_not_called()

    def test_saved_publication_is_served_after_a_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "views"
            views.save_publication(folder, VERSION, {"meta.json": b'{"latest_year": 2025}', "products/22.json": b"{}"})
            store = views.ViewStore(Relay(), folder)
            store.build_if_due = lambda: None
            self.assertEqual(json.loads(store.get("meta.json")), {"latest_year": 2025})
            self.assertEqual(store.get("products/22.json"), b"{}")
            self.assertIsNone(store.get("absent.json"))
            self.assertEqual(store.health()["version"], VERSION)

    def test_files_saved_in_an_older_format_are_rebuilt_not_served(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "views"
            views.save_publication(folder, VERSION, {"meta.json": b"{}"})
            (folder / (folder / views.CURRENT_POINTER).read_text() / views.FORMAT_FILE).unlink()
            store = views.ViewStore(Relay(), folder)
            self.assertEqual(store.files, {})
            self.assertEqual(store.health()["source"], "snapshot")

    def test_complete_months_drop_a_partial_last_month(self):
        months = {f"2026-{month:02d}": 100 for month in range(1, 7)}
        months["2026-07"] = 20
        self.assertEqual(views.complete_months(months)[-1], "2026-06")


class MissingObservations(unittest.TestCase):
    def test_monthly_comparisons_require_both_complete_windows(self):
        window = views.ComparisonWindow(recent=["2025-01", "2025-02"], previous=["2024-01", "2024-02"])
        complete = {"2024-01": 5_000_000, "2024-02": 0, "2025-01": 6_000_000, "2025-02": 0}
        self.assertEqual(window.change("22", complete).delta, 1_000_000)
        for missing in ({key: value for key, value in complete.items() if key != "2024-02"}, {**complete, "2025-02": None}):
            self.assertIsNone(window.change("22", missing))
            self.assertEqual(views.product_changes({"2204": {"imp": missing}}, "imp", window), [])

    def test_small_rankings_never_list_the_same_change_twice(self):
        changes = [views.Change("22", 2, 1, 1), views.Change("84", 1, 2, -1)]
        self.assertEqual(len(views.largest_rises_and_falls(changes, 8)), 2)


if __name__ == "__main__":
    unittest.main()
