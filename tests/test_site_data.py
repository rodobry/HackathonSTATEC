from __future__ import annotations

import json
import re
import sys
import unittest
from urllib.parse import urlsplit
from xml.etree import ElementTree
from pathlib import Path
from types import SimpleNamespace

PROJECT = Path(__file__).resolve().parents[1]
DATA = PROJECT / "site" / "data"
sys.path.insert(0, str(PROJECT / "server"))

import trade_core  # noqa: E402
from naming import short_label  # noqa: E402

SEPARATE_ROUNDING_MARGIN = 1.0001
RAW_CODE_AT_END = re.compile(r"(· |\()\d{4,8}\)?$")


def read_data(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def read_chapter(chapter):
    return read_data(f"products/{chapter}.json")


class EurostatWithoutFigures:
    def fetch_entry(self, query):
        payload = {"id": ["product", "partner", "time"], "size": [1, 1, 2], "value": {},
                   "dimension": {"product": {"category": {"index": {"27112100": 0}, "label": {"27112100": "Natural gas"}}},
                                 "partner": {"category": {"index": {"WORLD": 0}}},
                                 "time": {"category": {"index": {"2024": 0, "2025": 1}}}}}
        return SimpleNamespace(body=json.dumps(payload)), "network", "https://eurostat.test"


class SiteData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = read_data("meta.json")
        cls.overview = read_data("overview.json")
        cls.countries = read_data("countries.json")
        cls.search = read_data("search.json")
        cls.first = cls.meta["first_year"]
        cls.latest = cls.meta["latest_year"]
        cls.latest_position = cls.latest - cls.first

    def test_chapters_add_up_to_totals(self):
        for flow in ("imp", "exp"):
            total = self.overview["totals"][flow][self.latest_position]
            chapters = sum(value for _, value, _ in self.overview["chapters"][flow])
            self.assertLessEqual(chapters, total * SEPARATE_ROUNDING_MARGIN)
            self.assertGreater(chapters / total, 0.97, flow)

    def test_product_bundles_are_consistent(self):
        position = self.latest_position
        for chapter in self.meta["chapters"]:
            bundle = read_chapter(chapter)
            entry = bundle["items"][chapter]
            for flow in ("imp", "exp"):
                total = (entry["series"][flow] or [None] * (position + 1))[position] or 0
                partners = sum(value or 0 for _, value, _ in entry["partners"][flow])
                self.assertAlmostEqual(partners, total, delta=max(5, total * 1e-6), msg=f"{chapter} {flow}")
                children = sum(value for _, value in entry["children"][flow])
                self.assertLessEqual(children, total + 1, f"{chapter} {flow}")
            for code, item in bundle["items"].items():
                self.assertTrue(code.startswith(chapter))
                self.assertEqual(set(item["name"]), {"fr", "en", "de"})

    def test_sibling_names_are_distinct(self):
        for chapter in self.meta["chapters"]:
            bundle = read_chapter(chapter)
            for lang in ("fr", "en", "de"):
                seen = {}
                for code, item in bundle["items"].items():
                    key = (code[:-2], item["name"][lang])
                    self.assertNotIn(key, seen, f"{code} and {seen.get(key)}: \"{item['name'][lang]}\" ({lang})")
                    seen[key] = code

    def test_sentences_never_show_raw_codes(self):
        for item in read_data("changes.json")["items"]:
            for lang, name in item["name"].items():
                self.assertIsNone(RAW_CODE_AT_END.search(name), f"{item['code']} {lang}: {name}")
        feed = (PROJECT / "site" / "feed.xml").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"· \d{4,8}", feed))

    def test_missing_years_stay_null(self):
        smartphones = read_chapter("85")["items"].get("851713")
        if smartphones:
            self.assertIsNone(smartphones["series"]["imp"][0], "a code created in 2022 has no value in 1999")

    def test_population_covers_the_eu_and_the_site_years(self):
        population = read_data("population.json")
        self.assertEqual((population["first_year"], population["latest_year"]), (self.first, self.latest))
        self.assertEqual(len(population["values"]), 27)
        for code, row in population["values"].items():
            self.assertEqual(len(row), self.latest - self.first + 1, code)
            self.assertTrue(all(value is None or value > 100_000 for value in row), code)
        self.assertGreater(population["values"]["LU"][-1], 600_000)

    def test_countries_have_three_names(self):
        for code, names in self.countries["names"].items():
            self.assertEqual(set(names), {"fr", "en", "de"}, code)
            self.assertTrue(all(names.values()), code)

    def test_lexicon_codes_have_pages(self):
        codes = {code for _, code, _ in self.search["synonyms"]}
        for code in codes:
            self.assertIn(code, read_chapter(code[:2])["items"], code)

    def test_quiz_answers_are_options(self):
        for question in read_data("quiz.json")["questions"]:
            if question["kind"] != "draw":
                self.assertIn(question["answer"], question["options"], question["id"])

    def test_changes_compare_two_full_years_of_months(self):
        changes = read_data("changes.json")
        self.assertEqual(len(changes["months"]), 24)
        for item in changes["items"]:
            self.assertEqual(item["delta"], item["now"] - item["before"])
            self.assertNotIn(None, item["monthly"], f"{item['code']}: incomplete comparison")
            self.assertEqual(item["before"], sum(item["monthly"][:12]))
            self.assertEqual(item["now"], sum(item["monthly"][12:]))

    def test_feeds_contain_absolute_links(self):
        for name in ("feed.xml", "feed-en.xml", "feed-de.xml"):
            for link in ElementTree.parse(PROJECT / "site" / name).iter("link"):
                self.assertIn(urlsplit(link.text).scheme, ("https", "http"))

    def test_months_are_complete(self):
        months = self.overview["monthly"]["imp"]
        median = sorted(months)[len(months) // 2]
        self.assertGreater(months[-1], median * 0.5)


class Labels(unittest.TestCase):
    def test_short_labels(self):
        self.assertEqual(short_label("Café, même torréfié ou décaféiné; coques et pellicules de café"), "Café")
        self.assertEqual(short_label("Pneumatiques neufs, en caoutchouc"), "Pneumatiques neufs")
        self.assertEqual(short_label("FONTE, FER ET ACIER"), "Fonte, fer et acier")


class McpCore(unittest.TestCase):
    def test_search_and_trade(self):
        self.assertEqual(trade_core.search_products("café")[0]["code"], "0901")
        self.assertEqual(trade_core.search_products("2204")[0]["code"], "2204")
        result = trade_core.product_trade("0901")
        self.assertEqual(result["flow"], "imports")
        self.assertAlmostEqual(sum(partner["share"] for partner in result["top_partners"] if partner["share"]), 1, delta=0.2)
        self.assertIn("source", result)

    def test_country_resolution(self):
        self.assertEqual(trade_core.resolve_country("Allemagne"), "DE")
        self.assertEqual(trade_core.resolve_country("germany"), "DE")
        self.assertEqual(trade_core.resolve_country("fr"), "FR")
        self.assertIn("error", trade_core.country_trade("Atlantide"))

    def test_bad_inputs_return_errors(self):
        self.assertIn("error", trade_core.product_trade("123"))
        with self.assertRaises(ValueError):
            trade_core.product_trade("0901", flow="sideways")

    def test_products_without_figures_say_so(self):
        published = trade_core.product_trade("271121", flow="imports")
        self.assertEqual(published["product"]["code"], "271121")
        self.assertIn("does not mean zero", published["error"])
        self.assertIn("source", published)
        self.assertNotIn("error", trade_core.product_trade("271121", flow="exports"))
        live = trade_core.product_trade("27112100", relay=EurostatWithoutFigures())
        self.assertEqual(live["product"]["name"], "Natural gas")
        self.assertIn("2024-2025", live["error"])


if __name__ == "__main__":
    unittest.main()
