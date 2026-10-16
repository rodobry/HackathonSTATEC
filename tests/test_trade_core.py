from __future__ import annotations

import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

import trade_core
from eurostat import Cube


class SearchText(unittest.TestCase):
    def test_elided_articles_are_dropped_like_on_the_site(self):
        self.assertEqual(trade_core.searchable_text("Lingot d’Or, l'Inde, aujourd'hui"), "lingot or inde aujourd'hui")

    def test_gold_is_found_with_or_without_its_article(self):
        self.assertEqual(trade_core.search_products("l'or")[0]["code"], trade_core.search_products("or")[0]["code"])


class MissingFigures(unittest.TestCase):
    def test_invalid_product_strings_are_not_converted_to_another_code(self):
        for code in ("a2204", "%E0%A4%A", "22.04", "٢٢٠٤"):
            self.assertEqual(trade_core.product_trade(code), {"error": trade_core.INVALID_PRODUCT_CODE})

    def test_unknown_country_flow_does_not_become_a_balance(self):
        with patch.object(trade_core, "_country_flow", side_effect=[{"value_eur": None}, {"value_eur": 30}]):
            self.assertIsNone(trade_core.country_trade("FR")["balance_eur"])
        countries = {"FR": {"series": {"imp": [None]}}, "BE": {"series": {"imp": [0]}}}
        self.assertIsNone(trade_core._country_rank("FR", countries, "imp", 0))
        self.assertEqual(trade_core._country_rank("BE", countries, "imp", 0), 1)

    def test_zero_is_a_known_share_and_change(self):
        self.assertEqual(trade_core._share(0, 100), 0)
        self.assertIsNone(trade_core._share(None, 100))
        self.assertIsNone(trade_core._share(100, 0))
        entry = {"name": {"fr": "Test"}, "series": {"imp": [100] * trade_core._latest_year_position() + [None]},
                 "partners": {"imp": []}}
        missing = trade_core._published_product_trade("22", entry, "imp", "fr", 10)
        self.assertIsNone(missing["change_vs_previous_year"])
        entry["series"]["imp"][-1] = 100
        self.assertEqual(trade_core._published_product_trade("22", entry, "imp", "fr", 10)["change_vs_previous_year"], 0)

    def test_dense_json_stat_missing_tail_is_not_an_index_error(self):
        cube = Cube({"id": ["time"], "size": [2], "dimension": {"time": {"category": {"index": {"2024": 0, "2025": 1}}}},
                     "value": [0]})
        self.assertEqual(cube.value_at(time="2024"), 0)
        self.assertIsNone(cube.value_at(time="2025"))
