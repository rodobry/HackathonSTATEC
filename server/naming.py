from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

LEXICON = Path(__file__).resolve().parent / "lexicon.json"
LANGS = ("fr", "en", "de")
REPORTER = "LU"
GROUPS_AND_UK_SUBDIVISIONS = {"EU", "XI", "XU"}
UNSPECIFIED_CODE = "ZZ"
UNSPECIFIED = {"fr": "Pays non précisés", "en": "Unspecified countries", "de": "Nicht ermittelte Länder"}
EVERYDAY_COUNTRY_NAMES = {
    "DE": {"fr": "Allemagne", "en": "Germany", "de": "Deutschland"},
    "GB": {"fr": "Royaume-Uni", "en": "United Kingdom", "de": "Vereinigtes Königreich"},
    "US": {"fr": "États-Unis", "en": "United States", "de": "Vereinigte Staaten"},
    "CN": {"fr": "Chine", "en": "China", "de": "China"},
    "KR": {"fr": "Corée du Sud", "en": "South Korea", "de": "Südkorea"},
    "KP": {"fr": "Corée du Nord", "en": "North Korea", "de": "Nordkorea"},
    "RU": {"fr": "Russie", "en": "Russia", "de": "Russland"},
    "TW": {"fr": "Taïwan", "en": "Taiwan", "de": "Taiwan"},
    "HK": {"fr": "Hong Kong", "en": "Hong Kong", "de": "Hongkong"},
    "VN": {"fr": "Viêt Nam", "en": "Vietnam", "de": "Vietnam"},
    "AE": {"fr": "Émirats arabes unis", "en": "United Arab Emirates", "de": "Vereinigte Arabische Emirate"},
    "CZ": {"fr": "Tchéquie", "en": "Czechia", "de": "Tschechien"},
    "IR": {"fr": "Iran", "en": "Iran", "de": "Iran"},
    "SY": {"fr": "Syrie", "en": "Syria", "de": "Syrien"},
    "VE": {"fr": "Venezuela", "en": "Venezuela", "de": "Venezuela"},
    "BO": {"fr": "Bolivie", "en": "Bolivia", "de": "Bolivien"},
    "TZ": {"fr": "Tanzanie", "en": "Tanzania", "de": "Tansania"},
    "MD": {"fr": "Moldavie", "en": "Moldova", "de": "Moldau"},
    "MK": {"fr": "Macédoine du Nord", "en": "North Macedonia", "de": "Nordmazedonien"},
    "XS": {"fr": "Serbie", "en": "Serbia", "de": "Serbien"},
    "XK": {"fr": "Kosovo", "en": "Kosovo", "de": "Kosovo"},
    "XM": {"fr": "Monténégro", "en": "Montenegro", "de": "Montenegro"},
    "XC": {"fr": "Ceuta", "en": "Ceuta", "de": "Ceuta"},
    "XL": {"fr": "Melilla", "en": "Melilla", "de": "Melilla"},
    "LA": {"fr": "Laos", "en": "Laos", "de": "Laos"},
    "PS": {"fr": "Palestine", "en": "Palestine", "de": "Palästina"},
    "VA": {"fr": "Vatican", "en": "Vatican City", "de": "Vatikanstadt"},
    "CD": {"fr": "RD Congo", "en": "DR Congo", "de": "DR Kongo"},
    "CG": {"fr": "Congo", "en": "Congo", "de": "Kongo"},
}

TWO_LETTER_CODE = re.compile(r"[A-Z]{2}")
VERSION_PERIOD_MARKER = re.compile(r"\(\d{4}-\d{4}\)")
EXCLUSION_OR_DETAIL_IN_PARENTHESES = re.compile(
    r"\s*\((?:[^()]*(?:excl|ausg|à l.excl|autres que|other than|non dénommé|n\.d\.a|n\.e\.s|a\.n\.g|nicht|"
    r"y\.c|incl|einschl|sauf|außer|except|\d{4}-\d{4})[^()]*)\)", re.I)
QUALIFIER_START = re.compile(r"^(même|whether|auch|y\.c\.|incl\.|einschl\.|d'un|d’un|of a|mit|n\.d\.a|n\.e\.s|a\.n\.g)", re.I)
NESTED_PARENTHESES_DEPTH = 3
VERY_SHORT_FIRST_PART = 12
WORD_SEPARATORS = " ,;("
PHRASE_SEPARATORS = ",;("


def is_partner_code(code: str) -> bool:
    return bool(TWO_LETTER_CODE.fullmatch(code))


def is_secret_zone(code: str) -> bool:
    return code.startswith("Q") and code != "QA"


def is_country(code: str) -> bool:
    return (is_partner_code(code) and code != REPORTER and code not in GROUPS_AND_UK_SUBDIVISIONS
            and not is_secret_zone(code))


def load_lexicon() -> dict:
    if LEXICON.exists():
        return json.loads(LEXICON.read_text(encoding="utf-8"))
    return {"chapters": {}, "products": []}


def clean_country_label(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.split(r"\s*\(", text)[0]
    return text.strip(" ,")


def short_label(text: str, limit: int = 60) -> str:
    text = _without_details(_first_clause(text))
    if text.isupper():
        text = text.capitalize()
    text = _truncate_at_word(_first_comma_part(text), limit)
    return text[:1].upper() + text[1:]


def _first_clause(text: str) -> str:
    return VERSION_PERIOD_MARKER.sub(";", text.replace("\xa0", " ")).split(";")[0]


def _without_details(text: str) -> str:
    for _ in range(NESTED_PARENTHESES_DEPTH):
        text = EXCLUSION_OR_DETAIL_IN_PARENTHESES.sub("", text)
    text = re.sub(r"\s*\{[^}]*\}", "", text)
    return re.sub(r"\s+", " ", text).strip(" ,.:")


def _first_comma_part(text: str) -> str:
    parts = text.split(", ")
    if len(parts[0]) < VERY_SHORT_FIRST_PART and len(parts) > 1 and not QUALIFIER_START.match(parts[1]):
        return f"{parts[0]}, {parts[1]}"
    return parts[0]


def _truncate_at_word(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" ,;:") + "…"


def _label_in_force(text: str) -> str:
    text = text.replace("\xa0", " ")
    marker = VERSION_PERIOD_MARKER.search(text)
    return text[: marker.start()].strip(" ;,") if marker else text.strip()


def _tidy_fragment(text: str, limit: int) -> str:
    text = re.sub(r"\s+", " ", text).strip(" ,;:.")
    text = re.sub(r"\s*\([^)]*$", "", EXCLUSION_OR_DETAIL_IN_PARENTHESES.sub("", text)).strip(" ,;:")
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[: cut.rfind(" ")].rstrip(" ,;:(") + "…"


def _start_of_word(text: str, position: int) -> int:
    while position > 0 and text[position - 1] not in WORD_SEPARATORS:
        position -= 1
    return position


def _end_of_phrase(text: str, position: int) -> int:
    while position < len(text) and text[position] not in PHRASE_SEPARATORS:
        position += 1
    return position


def _common_suffix_length(texts: list[str], prefix_length: int) -> int:
    common = len(os.path.commonprefix([text[::-1] for text in texts]))
    return min(common, *(len(text) - prefix_length for text in texts))


def _fragment_candidates(labels: dict[str, str]):
    texts = list(labels.values())
    prefix = len(os.path.commonprefix(texts))
    suffix = _common_suffix_length(texts, prefix)
    starts = {code: _start_of_word(text, prefix) for code, text in labels.items()}
    yield {code: _tidy_fragment(text[starts[code]:_end_of_phrase(text, len(text) - suffix)], 60)
           for code, text in labels.items()}
    yield {code: _tidy_fragment(text[starts[code]:], 55) for code, text in labels.items()}
    yield {code: _tidy_fragment(re.split(r"[,;] ", text)[-1], 55) for code, text in labels.items()}
    yield {code: _tidy_fragment(text[starts[code]:], 110) for code, text in labels.items()}


def _unique_fragment_count(fragments: dict[str, str]) -> int:
    counts = Counter(fragments.values())
    return sum(1 for fragment in fragments.values() if fragment and counts[fragment] == 1)


def _distinguishing_fragments(official_labels: dict[str, str]) -> dict[str, str]:
    hyphens_as_spaces = {code: re.sub(r"(?<=\w)-(?=\w)", " ", _label_in_force(label))
                         for code, label in official_labels.items()}
    best = max(_fragment_candidates(hyphens_as_spaces), key=_unique_fragment_count)
    counts = Counter(best.values())
    return {code: fragment if fragment and counts[fragment] == 1 else code for code, fragment in best.items()}


def _siblings_by_parent(codes) -> dict[str, list[str]]:
    siblings = defaultdict(list)
    for code in codes:
        siblings[code[:-2] if len(code) > 2 else ""].append(code)
    return siblings


def _codes_by_name(names: dict, codes: list[str], lang: str) -> dict[str, list[str]]:
    groups = defaultdict(list)
    for code in codes:
        groups[names[code][lang]].append(code)
    return groups


def _append_codes_to_remaining_duplicates(names: dict, siblings: list[str], lang: str) -> None:
    for same_name in _codes_by_name(names, siblings, lang).values():
        if len(same_name) > 1:
            for code in same_name:
                names[code][lang] = f"{names[code][lang]} ({code})"


class Naming:
    def __init__(self, product_labels: dict, partner_labels: dict):
        self.product_labels, self.partner_labels = product_labels, partner_labels
        self.lexicon = load_lexicon()
        self.everyday_names = dict(self.lexicon.get("chapters", {}))
        for product in self.lexicon.get("products", []):
            self.everyday_names[product["code"]] = product["names"]
        self.distinct_names: dict = {}

    def official_label(self, code: str, lang: str) -> str:
        return self.product_labels.get(lang, {}).get(code, code).replace("\xa0", " ")

    def official_labels(self, code: str) -> dict:
        return {lang: self.official_label(code, lang) for lang in LANGS}

    def plain_product_names(self, code: str) -> dict:
        everyday = self.everyday_names.get(code)
        return {lang: everyday[lang] if everyday and everyday.get(lang) else short_label(self.official_label(code, lang))
                for lang in LANGS}

    def distinguish_siblings(self, codes) -> None:
        self.distinct_names = self.disambiguate({code: self.plain_product_names(code) for code in codes})

    def distinct_product_names(self, code: str) -> dict:
        return self.distinct_names.get(code) or self.plain_product_names(code)

    def country_names(self, code: str) -> dict:
        if code in EVERYDAY_COUNTRY_NAMES:
            return dict(EVERYDAY_COUNTRY_NAMES[code])
        return {lang: clean_country_label(self.partner_labels.get(lang, {}).get(code, code)) for lang in LANGS}

    def disambiguate(self, names: dict) -> dict:
        distinct = {code: dict(value) for code, value in names.items()}
        for siblings in _siblings_by_parent(distinct).values():
            for lang in LANGS:
                self._add_distinguishing_fragments(distinct, siblings, lang)
                _append_codes_to_remaining_duplicates(distinct, siblings, lang)
        return distinct

    def _add_distinguishing_fragments(self, names: dict, siblings: list[str], lang: str) -> None:
        for name, same_name in _codes_by_name(names, siblings, lang).items():
            if len(same_name) < 2:
                continue
            fragments = _distinguishing_fragments({code: self.official_label(code, lang) for code in same_name})
            for code in same_name:
                names[code][lang] = f"{name} · {fragments[code]}"
