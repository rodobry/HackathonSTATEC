from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
DATA = PROJECT / "site/data"
LEXICON = PROJECT / "server/lexicon.json"
SEARCH_JS = PROJECT / "site/assets/search.js"
FLOWS = ("imp", "exp")
NAME_LANGS = ("fr", "en", "de")
SYNONYM_LANGS = ("fr", "en", "de", "lb", "pt")
SHARED_WORD_LISTS = ("LUXEMBOURG_WORDS", "IMPORT_WORDS", "EXPORT_WORDS", "QUESTION_WORDS")
QUESTION_LANGS = ("fr", "en", "de")
THEMES = {"food", "drinks", "home", "clothing", "tech", "transport", "energy", "health",
          "materials", "industry", "leisure"}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fold_like_site_search(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    folded = "".join(ch for ch in text if not unicodedata.combining(ch)).replace("’", "'")
    return re.sub(r"\b(?:qu|[cdjlmnst])'", "", folded).strip()


def quoted_words(block: str) -> set[str]:
    return {word for chunk in re.findall(r'"([^"]*)"', block) for word in chunk.split()}


def question_words_by_language() -> dict[str, set[str]]:
    if not SEARCH_JS.exists():
        return {}
    source = SEARCH_JS.read_text(encoding="utf-8")
    shared: set[str] = set()
    for name in SHARED_WORD_LISTS:
        block = re.search(rf"const {name} = (.*?);\n", source, re.S)
        if block:
            shared |= quoted_words(block.group(1))
    stop_block = re.search(r"const STOP_WORDS = \{(.*?)\n\};", source, re.S)
    stop_words = dict(re.findall(r"(\w\w): new Set\((.*?)\.split", stop_block.group(1), re.S)) if stop_block else {}
    by_language = {lang: shared | quoted_words(stop_words.get(lang, "")) for lang in QUESTION_LANGS}
    any_language = set().union(*by_language.values())
    return {lang: by_language.get(lang, any_language) for lang in SYNONYM_LANGS}


def latest_trade_by_code(chapters: list[str]) -> dict[str, float]:
    latest = {}
    for chapter in chapters:
        for code, entry in read_json(DATA / "products" / f"{chapter}.json")["items"].items():
            latest[code] = sum((entry["series"][flow] or [0])[-1] or 0 for flow in FLOWS)
    return latest


def is_valid_product_code(code: str) -> bool:
    return code.isdigit() and len(code) in (2, 4)


def missing_names(label: str, names: dict) -> list[str]:
    return [f"{label}: missing {lang} name" for lang in NAME_LANGS if not (names.get(lang) or "").strip()]


def check_chapters(chapters: dict, catalog: set[str], catalog_chapters: list[str]) -> list[str]:
    errors = []
    for code, names in chapters.items():
        if not (len(code) == 2 and code.isdigit()):
            errors.append(f"chapter {code!r}: invalid key (2 digits expected)")
        if code not in catalog:
            errors.append(f"chapter {code} missing from the catalogue")
        errors += missing_names(f"chapter {code}", names)
    unnamed = sorted(set(catalog_chapters) - set(chapters))
    if unnamed:
        errors.append(f"catalogue chapters without a name: {', '.join(unnamed)}")
    return errors


def check_synonyms(label: str, synonyms: dict) -> list[str]:
    errors = [] if synonyms.get("fr") else [f"{label}: no fr synonym"]
    for lang, words in synonyms.items():
        if lang not in SYNONYM_LANGS:
            errors.append(f"{label}: unknown synonym language {lang!r}")
        for word in words:
            if word != word.lower() or word != word.strip() or not word:
                errors.append(f"{label}: synonym {word!r} is not lowercase or badly spaced")
    return errors


def check_products(products: list, catalog: set[str], latest_trade: dict, year: str) -> list[str]:
    errors, seen = [], set()
    for position, product in enumerate(products):
        code = str(product.get("code", ""))
        label = f"product {code or '#' + str(position)}"
        if not is_valid_product_code(code):
            errors.append(f"{label}: 2- or 4-digit code expected")
            continue
        if code in seen:
            errors.append(f"{label}: duplicate code")
        seen.add(code)
        if code not in catalog:
            errors.append(f"{label}: missing from the catalogue")
        if int(latest_trade.get(code, 0)) <= 0:
            errors.append(f"{label}: no Luxembourg trade in {year}")
        errors += missing_names(label, product.get("names", {}))
        errors += check_synonyms(label, product.get("synonyms", {}))
        if product.get("theme") not in THEMES:
            errors.append(f"{label}: unknown theme {product.get('theme')!r}")
        if "litres" in product and product["litres"] is not True:
            errors.append(f"{label}: 'litres' must be true or absent")
    return errors


def synonym_owners(products: list) -> tuple[dict, dict, dict]:
    by_lang_and_word, by_folded_word, by_lang_and_folded_word = defaultdict(set), defaultdict(set), defaultdict(set)
    for product in products:
        code = str(product.get("code", ""))
        if not is_valid_product_code(code):
            continue
        for lang, words in product.get("synonyms", {}).items():
            for word in words:
                by_lang_and_word[(lang, word)].add(code)
                by_folded_word[fold_like_site_search(word)].add(code)
                by_lang_and_folded_word[(lang, fold_like_site_search(word))].add(code)
    return by_lang_and_word, by_folded_word, by_lang_and_folded_word


def shared_synonym_errors(by_lang_and_word: dict) -> list[str]:
    conflicts = sorted((lang, word, sorted(codes)) for (lang, word), codes in by_lang_and_word.items() if len(codes) > 1)
    return [f"{lang} synonym {word!r} points to several codes: {', '.join(codes)}" for lang, word, codes in conflicts]


def print_words_with_codes(words_and_codes: list) -> None:
    for word, codes in words_and_codes:
        print(f"  {word!r} -> {', '.join(codes)}")


def print_summary(chapters: dict, products: list, covered: dict, total_value: float, year: str) -> None:
    chapter_codes = {code for code in covered if len(code) == 2}
    union_value = sum(value for code, value in covered.items() if len(code) == 2)
    union_value += sum(value for code, value in covered.items() if len(code) == 4 and code[:2] not in chapter_codes)
    heading_value = sum(value for code, value in covered.items() if len(code) == 4)
    synonym_count = sum(len(words) for product in products for words in product.get("synonyms", {}).values())
    per_lang = {lang: sum(len(product.get("synonyms", {}).get(lang, [])) for product in products) for lang in SYNONYM_LANGS}
    themes = Counter(product.get("theme") for product in products)
    print(f"Chapters: {len(chapters)}")
    print(f"Products: {len(products)} ({sum(len(code) == 4 for code in covered)} HS4, {len(chapter_codes)} HS2), "
          f"{sum(1 for product in products if product.get('litres'))} in litres")
    print(f"Synonyms: {synonym_count} (" + ", ".join(f"{lang} {count}" for lang, count in per_lang.items()) + ")")
    print("Themes: " + ", ".join(f"{theme} {count}" for theme, count in sorted(themes.items())))
    print(f"Trade {year} (imports + exports): {total_value / 1e9:.2f} bn EUR")
    print(f"  covered by lexicon codes: {union_value / 1e9:.2f} bn EUR "
          f"({union_value / total_value:.1%}); by HS4 codes alone: {heading_value / 1e9:.2f} bn EUR "
          f"({heading_value / total_value:.1%})")
    smallest = sorted((value, code) for code, value in covered.items() if value > 0)[:5]
    print("  smallest codes: " + ", ".join(f"{code} {value / 1e6:.1f} M" for value, code in smallest))


def main() -> int:
    lexicon = read_json(LEXICON)
    meta = read_json(DATA / "meta.json")
    overview = read_json(DATA / "overview.json")
    year = str(meta["latest_year"])
    latest_trade = latest_trade_by_code(meta["chapters"])
    catalog = set(latest_trade)
    total_value = sum(overview["totals"][flow][-1] or 0 for flow in FLOWS)
    chapters = lexicon.get("chapters", {})
    products = lexicon.get("products", [])
    covered = {code: int(latest_trade.get(code, 0)) for code in (str(product.get("code", "")) for product in products)
               if is_valid_product_code(code)}

    errors = check_chapters(chapters, catalog, meta["chapters"]) + check_products(products, catalog, latest_trade, year)
    by_lang_and_word, by_folded_word, by_lang_and_folded_word = synonym_owners(products)
    errors += shared_synonym_errors(by_lang_and_word)
    across_languages = sorted((word, sorted(codes)) for word, codes in by_folded_word.items() if len(codes) > 1)
    question_words = question_words_by_language()
    hijacking = sorted((f"{lang}:{word}", sorted(codes)) for (lang, word), codes in by_lang_and_folded_word.items()
                       if word in question_words.get(lang, ()) or f"{word}s" in question_words.get(lang, ()))

    print_summary(chapters, products, covered, total_value, year)
    if across_languages:
        print(f"Info: {len(across_languages)} word(s) identical once accents are folded, with different codes per language:")
        print_words_with_codes(across_languages)
    if hijacking:
        print(f"Warning: {len(hijacking)} synonym(s) identical to a question word in search.js:")
        print_words_with_codes(hijacking)
    if errors:
        print(f"\nFAILED: {len(errors)} problem(s)")
        for error in errors:
            print("  - " + error)
        return 1
    print("\nOK: lexicon is valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
