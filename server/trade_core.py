from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from eurostat import Cube, Relay
from naming import UNSPECIFIED_CODE, is_country

SNAPSHOT_DIR = Path(__file__).resolve().parents[1] / "site" / "data"
FLOW_KEYS = {"imports": "imp", "imp": "imp", "achats": "imp", "1": "imp",
             "exports": "exp", "exp": "exp", "ventes": "exp", "2": "exp"}
FLOW_LABELS = {"imp": "imports", "exp": "exports"}
FLOW_CODES = {"imp": "1", "exp": "2"}
LANGS = ("fr", "en", "de")
TOP_OVERVIEW_ROWS = 8
INVALID_PRODUCT_CODE = "code must have 2, 4, 6 or 8 digits; use search_products first"

READING_NOTES = {
    "fr": ["Marchandises seules : ces chiffres laissent de côté les services (finance, assurance…).",
           "Montants en euros courants, sans correction de l'inflation.",
           "Pour les achats venant de l'UE, les chiffres donnent le pays d'expédition, qui peut différer du pays d'origine.",
           "Ces chiffres décrivent les échanges et ne disent rien de leurs causes."],
    "en": ["Goods only: these figures leave out services (finance, insurance…).",
           "Amounts in current euros, with no inflation adjustment.",
           "For purchases from the EU, the figures give the country of dispatch, which may differ from the country of origin.",
           "These figures describe trade and say nothing about its causes."],
    "de": ["Nur Waren: Dienstleistungen (Finanzen, Versicherungen…) fehlen in diesen Zahlen.",
           "Beträge in jeweiligen Euro, ohne Inflationsbereinigung.",
           "Bei Einkäufen aus der EU nennen die Zahlen das Versendungsland, das vom Ursprungsland abweichen kann.",
           "Diese Zahlen beschreiben den Handel und sagen nichts über seine Ursachen."],
}
DISPATCH_COUNTRY_NOTE = 2

GLOSSARY = {
    "services": {"fr": "Le site compte les marchandises et laisse de côté les services. Le Luxembourg achète plus de biens qu'il n'en vend mais vend beaucoup plus de services : le déficit des biens montre la moitié de son commerce.",
                 "en": "The site counts goods and leaves out services. Luxembourg buys more goods than it sells but sells far more services, so the goods deficit shows half of its trade.",
                 "de": "Die Website zählt Waren und lässt Dienstleistungen außen vor. Luxemburg kauft mehr Waren, als es verkauft, verkauft aber weit mehr Dienstleistungen."},
    "expedition": {"fr": "Dans l'Union, la statistique retient le pays d'expédition : un café cultivé au Brésil et torréfié en Allemagne apparaît comme un achat à l'Allemagne.",
                   "en": "Within the EU, statistics record the country of dispatch: coffee grown in Brazil and roasted in Germany shows up as a purchase from Germany.",
                   "de": "In der EU erfasst die Statistik das Versendungsland: In Brasilien angebauter, in Deutschland gerösteter Kaffee erscheint als Einkauf aus Deutschland."},
    "euros": {"fr": "Les montants sont en euros courants, sans correction de l'inflation : une hausse peut venir des prix comme des quantités.",
              "en": "Amounts are in current euros, with no inflation adjustment: a rise can come from prices as well as quantities.",
              "de": "Beträge in jeweiligen Euro, ohne Inflationsbereinigung: Ein Anstieg kann von Preisen wie von Mengen kommen."},
    "codes": {"fr": "Les produits ont des codes à 2 (chapitre), 4 (position SH), 6 (sous-position SH) ou 8 chiffres (nomenclature combinée de l'UE). Les 6 premiers chiffres sont communs au monde entier.",
              "en": "Products have 2-digit (chapter), 4-digit (HS heading), 6-digit (HS subheading) or 8-digit codes (EU Combined Nomenclature). The first 6 digits are shared worldwide.",
              "de": "Waren haben 2-stellige (Kapitel), 4-stellige (HS-Position), 6-stellige (HS-Unterposition) oder 8-stellige Codes (Kombinierte Nomenklatur der EU)."},
    "secret": {"fr": "Une partie des montants passe dans des « pays non précisés » pour protéger les entreprises (secret statistique).",
               "en": "Part of the amounts goes under “unspecified countries” to protect companies (statistical confidentiality).",
               "de": "Ein Teil der Beträge landet zum Schutz der Unternehmen bei „nicht ermittelten Ländern“."},
    "provisoire": {"fr": "Les mois récents sont provisoires et Eurostat peut les réviser.",
                   "en": "Recent months are provisional, and Eurostat may revise them.",
                   "de": "Die letzten Monate sind vorläufig, Eurostat kann sie noch revidieren."},
    "avant1999": {"fr": "Jusqu'en 1998, la Belgique et le Luxembourg déclaraient ensemble ; les séries commencent en 1999.",
                  "en": "Until 1998, Belgium and Luxembourg reported together; the series start in 1999.",
                  "de": "Bis 1998 meldeten Belgien und Luxemburg gemeinsam; die Reihen beginnen 1999."},
}
TERM_ALIASES = {"service": "services", "origine": "expedition", "origin": "expedition", "dispatch": "expedition",
                "inflation": "euros", "code": "codes", "nomenclature": "codes", "sh": "codes", "hs": "codes", "nc": "codes",
                "confidential": "secret", "provisional": "provisoire", "revision": "provisoire",
                "belgique": "avant1999", "1999": "avant1999"}
CHANGES_CAUTION = {"fr": "Une seule grosse livraison peut suffire à faire bondir un produit ; ces chiffres ne disent pas pourquoi.",
                   "en": "A single large delivery can make a product jump; these figures do not say why.",
                   "de": "Eine einzige große Lieferung kann eine Ware sprunghaft steigen lassen; die Zahlen sagen nicht, warum."}
BILLIONS = {"fr": "milliards d'euros", "en": "billion euros", "de": "Milliarden Euro"}
MILLIONS = {"fr": "millions d'euros", "en": "million euros", "de": "Millionen Euro"}

_fetch_computed_file = None
_decoded_computed_files: dict = {}
_decoded_snapshot_files: dict = {}
_relay_for_local_use = None


def use_computed_files(fetch_file) -> None:
    global _fetch_computed_file
    _fetch_computed_file = fetch_file
    _decoded_computed_files.clear()


def _optional_file(name: str):
    body = _fetch_computed_file(name) if _fetch_computed_file else None
    if body is None:
        return _snapshot_file(name)
    decoded = _decoded_computed_files.get(name)
    if decoded and decoded[0] is body:
        return decoded[1]
    value = json.loads(body)
    _decoded_computed_files[name] = (body, value)
    return value


def _snapshot_file(name: str):
    if name not in _decoded_snapshot_files:
        path = SNAPSHOT_DIR / name
        _decoded_snapshot_files[name] = json.loads(path.read_bytes()) if path.exists() else None
    return _decoded_snapshot_files[name]


def read_file(name: str):
    value = _optional_file(name)
    if value is None:
        raise FileNotFoundError(name)
    return value


def meta():
    return read_file("meta.json")


def source_citation():
    published = meta()
    return {"dataset": f"Eurostat Comext {published['dataset']}", "published": published["source_updated"],
            "url": published["source_url"], "unit": "EUR (current prices)", "latest_full_year": published["latest_year"]}


ELIDED_ARTICLE = re.compile(r"\b(?:qu|[cdjlmnst])'")


def searchable_text(text: str) -> str:
    text = unicodedata.normalize("NFD", str(text).lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9ßæœ' ]+", " ", text.replace("’", "'"))
    return re.sub(r"\s+", " ", ELIDED_ARTICLE.sub("", text)).strip()


def _supported_lang(lang: str) -> str:
    lang = (lang or "fr").lower()[:2]
    return lang if lang in LANGS else "fr"


def _flow_key(flow: str) -> str:
    key = str(flow or "imports").lower()
    if key not in FLOW_KEYS:
        raise ValueError("flow must be 'imports' or 'exports'")
    return FLOW_KEYS[key]


def _reading_notes(lang: str, flow: str = "imp") -> list[str]:
    if flow == "imp":
        return READING_NOTES[lang]
    return [note for position, note in enumerate(READING_NOTES[lang]) if position != DISPATCH_COUNTRY_NOTE]


def _value_at(series, position: int):
    return series[position] if series and 0 <= position < len(series) else None


def _share(value, total):
    return round(value / total, 4) if value is not None and total else None


def _difference(after, before):
    return after - before if after is not None and before is not None else None


def _latest_year_position() -> int:
    published = meta()
    return published["latest_year"] - published["first_year"]


def _year_labels() -> list[str]:
    published = meta()
    return [str(year) for year in range(published["first_year"], published["latest_year"] + 1)]


def country_name(code: str, lang: str = "fr") -> str:
    names = read_file("countries.json")["names"].get(code)
    return names[_supported_lang(lang)] if names else code


def resolve_country(text: str) -> str | None:
    if not text:
        return None
    raw = text.strip()
    if re.fullmatch(r"[A-Za-z]{2}", raw) and raw.upper() in read_file("countries.json")["countries"]:
        return raw.upper()
    wanted = searchable_text(raw)
    best_prefix_match, best_length = None, None
    for code, names in read_file("countries.json")["names"].items():
        for name in names.values():
            candidate = searchable_text(name)
            if candidate == wanted:
                return code
            if candidate.startswith(wanted) and (best_length is None or len(candidate) < best_length):
                best_prefix_match, best_length = code, len(candidate)
    return best_prefix_match


def _chapter_file(chapter: str):
    return _optional_file(f"products/{chapter}.json") if re.fullmatch(r"\d{2}", chapter) else None


def product_entry(code: str):
    chapter = _chapter_file(code[:2])
    return (chapter or {}).get("items", {}).get(code), chapter


def product_name(code: str, lang: str = "fr") -> str:
    lang = _supported_lang(lang)
    entry, _ = product_entry(code)
    if entry:
        return entry["name"][lang]
    for row in read_file("search.json")["products"]:
        if row["code"] == code:
            return row["name"][lang]
    return code


def search_products(query: str, lang: str = "fr", limit: int = 8) -> list[dict]:
    wanted = searchable_text(query)
    if not wanted:
        return []
    index = read_file("search.json")
    scores: dict[str, float] = {}
    _score_code_prefix(scores, wanted, index["products"])
    _score_synonyms(scores, wanted, index["synonyms"])
    _score_name_words(scores, wanted, index["products"])
    best = sorted(scores.items(), key=lambda item: -item[1])[:limit]
    return [_search_result(code, index["products"], lang) for code, _ in best]


def _raise_score(scores: dict, code: str, score: float) -> None:
    scores[code] = max(scores.get(code, 0), score)


def _score_code_prefix(scores: dict, wanted: str, products: list) -> None:
    digits = wanted.replace(" ", "")
    if not re.fullmatch(r"\d{2,8}", digits):
        return
    for row in products:
        if row["code"].startswith(digits):
            scores[row["code"]] = 200 if row["code"] == digits else 100 - len(row["code"])


def _score_synonyms(scores: dict, wanted: str, synonyms: list) -> None:
    for word, code, _ in synonyms:
        synonym = searchable_text(word)
        if synonym == wanted:
            _raise_score(scores, code, 150)
        elif len(wanted) >= 3 and synonym.startswith(wanted):
            _raise_score(scores, code, 110 - (len(synonym) - len(wanted)))


def _without_plural_ending(token: str) -> str:
    return token[:-1] if len(token) > 4 and token[-1] in "sx" else token


def _score_name_words(scores: dict, wanted: str, products: list) -> None:
    tokens = [_without_plural_ending(token) for token in wanted.split() if len(token) >= 3]
    if not tokens:
        return
    for row in products:
        for name in row["name"].values():
            words = searchable_text(name).split()
            if all(any(word.startswith(token) for word in words) for token in tokens):
                _raise_score(scores, row["code"], _name_match_score(row))
                break


def _name_match_score(row: dict) -> float:
    trade_value = (row.get("imp") or 0) + (row.get("exp") or 0)
    heading_bonus = 6 if len(row["code"]) == 4 else 0
    return 40 + heading_bonus + len(str(trade_value)) / 2


def _search_result(code: str, products: list, lang: str) -> dict:
    row = next((candidate for candidate in products if candidate["code"] == code), None)
    return {"code": code, "name": product_name(code, lang), "level_digits": len(code),
            "imports_latest_eur": row.get("imp") if row else None, "exports_latest_eur": row.get("exp") if row else None}


def product_trade(code: str, flow: str = "imports", lang: str = "fr", top: int = 10, relay=None) -> dict:
    lang = _supported_lang(lang)
    flow = _flow_key(flow)
    if not re.fullmatch(r"(?:[0-9]{2}){1,4}", code or ""):
        return {"error": INVALID_PRODUCT_CODE}
    entry, _ = product_entry(code)
    if not entry and len(code) >= 6:
        return _live_product_trade(code, flow, lang, top, relay or _local_relay())
    if not entry:
        return {"error": f"no trade recorded for product {code}"}
    return _published_product_trade(code, entry, flow, lang, top)


def _has_figures(values) -> bool:
    return any(value is not None for value in values)


def _no_published_figures(code: str, name: str, flow: str, years: str) -> dict:
    return {"product": {"code": code, "name": name}, "flow": FLOW_LABELS[flow], "years": years,
            "error": f"Eurostat publishes no {FLOW_LABELS[flow]} figures for Luxembourg for this product in {years}; "
                     "a missing figure does not mean zero trade.",
            "source": source_citation()}


def _published_product_trade(code: str, entry: dict, flow: str, lang: str, top: int) -> dict:
    year = meta()["latest_year"]
    position = _latest_year_position()
    series = entry["series"].get(flow) or []
    if not _has_figures(series):
        return _no_published_figures(code, entry["name"][lang], flow, f"{meta()['first_year']}-{year}")
    total = _value_at(series, position)
    partners = [{"country_code": partner, "country": country_name(partner, lang) if partner != UNSPECIFIED_CODE else "unspecified",
                 "value_eur": value, "share": _share(value, total), "value_previous_year_eur": previous}
                for partner, value, previous in [row for row in entry["partners"].get(flow, []) if row[1]][:top]]
    previous_total = _value_at(series, position - 1)
    return {
        "product": {"code": code, "name": entry["name"][lang]},
        "flow": FLOW_LABELS[flow],
        "year": year,
        "total_eur": total,
        "quantity_kg": _value_at(entry.get("kg", {}).get(flow) or [], position),
        "change_vs_previous_year": _share(_difference(total, previous_total), previous_total),
        "top_partners": partners,
        "annual_totals_eur": dict(zip(_year_labels(), series)),
        "sentence": _product_sentence(entry["name"][lang], flow, year, total, partners, lang),
        "notes": _reading_notes(lang, flow),
        "source": source_citation(),
    }


def _product_sentence(name: str, flow: str, year: int, total, partners: list, lang: str) -> str:
    if not total:
        return ""
    amount = _spoken_amount(total, lang)
    main = next((partner for partner in partners if partner["country_code"] != UNSPECIFIED_CODE), None)
    share = f"{round(main['share'] * 100)} %" if main and main["share"] else ""
    if lang == "en":
        verb = "bought" if flow == "imp" else "sold"
        return f"In {year}, Luxembourg {verb} {amount} of {name.lower()}" + (f"; {main['country']} accounted for {share}." if main else ".")
    if lang == "de":
        verb = "gekauft" if flow == "imp" else "verkauft"
        return f"{year} hat Luxemburg {name} im Wert von {amount} {verb}" + (f"; auf {main['country']} entfielen {share}." if main else ".")
    verb = "acheté" if flow == "imp" else "vendu"
    return f"En {year}, le Luxembourg a {verb} pour {amount} de {name.lower()}" + (f" ; {main['country']} : {share}." if main else ".")


def _spoken_amount(value, lang: str) -> str:
    if abs(value) >= 1e9:
        number, unit = value / 1e9, BILLIONS[lang]
    elif abs(value) >= 1e6:
        number, unit = value / 1e6, MILLIONS[lang]
    else:
        return f"{round(value):,} EUR".replace(",", " ")
    text = f"{number:.1f}" if number < 100 else f"{number:.0f}"
    return (text.replace(".", ",") if lang != "en" else text) + " " + unit


def country_trade(country: str, lang: str = "fr", top: int = 8) -> dict:
    lang = _supported_lang(lang)
    code = resolve_country(country)
    countries = read_file("countries.json")["countries"]
    if not code or code not in countries or not is_country(code):
        return {"error": f"unknown country: {country}"}
    position = _latest_year_position()
    totals = read_file("overview.json")["totals"]
    trade = {"country": {"code": code, "name": country_name(code, lang)}, "year": meta()["latest_year"],
             "source": source_citation(), "notes": READING_NOTES[lang]}
    for flow, label in FLOW_LABELS.items():
        trade[label] = _country_flow(code, countries, flow, position, totals[flow][position], lang, top)
    trade["balance_eur"] = _difference(trade["exports"]["value_eur"], trade["imports"]["value_eur"])
    return trade


def _country_flow(code: str, countries: dict, flow: str, position: int, luxembourg_total, lang: str, top: int) -> dict:
    entry = countries[code]
    value = _value_at(entry["series"].get(flow), position)
    return {
        "value_eur": value,
        "share_of_luxembourg_total": _share(value, luxembourg_total),
        "rank": _country_rank(code, countries, flow, position),
        "top_products": [{"code": product, "name": product_name(product, lang), "value_eur": amount, "share": _share(amount, value)}
                         for product, amount, *_ in (entry.get("products", {}).get(flow) or [])[:top]],
        "annual_eur": dict(zip(_year_labels(), entry["series"].get(flow) or [])),
    }


def _country_rank(code: str, countries: dict, flow: str, position: int) -> int | None:
    ranking = sorted(((other, value) for other, entry in countries.items()
                      if is_country(other) and (value := _value_at(entry["series"].get(flow), position)) is not None),
                     key=lambda item: -item[1])
    return next((rank for rank, (other, _) in enumerate(ranking, start=1) if other == code), None)


def overview(lang: str = "fr") -> dict:
    lang = _supported_lang(lang)
    published = read_file("overview.json")
    position = _latest_year_position()
    imports, exports = published["totals"]["imp"][position], published["totals"]["exp"][position]
    return {
        "year": meta()["latest_year"], "imports_eur": imports, "exports_eur": exports, "balance_eur": exports - imports,
        "coverage_ratio": round(exports / imports, 4), "imports_per_day_eur": round(imports / 365),
        "top_suppliers": _top_shares(published["partners"]["imp"]["rows"], imports, country_name, lang),
        "top_customers": _top_shares(published["partners"]["exp"]["rows"], exports, country_name, lang),
        "top_import_groups": _top_shares(published["chapters"]["imp"], imports, product_name, lang),
        "top_export_groups": _top_shares(published["chapters"]["exp"], exports, product_name, lang),
        "notes": READING_NOTES[lang], "source": source_citation(),
    }


def _top_shares(rows: list, total, name_of, lang: str) -> list[dict]:
    return [{"code": code, "name": name_of(code, lang), "share": _share(value, total)}
            for code, value, _ in rows[:TOP_OVERVIEW_ROWS]]


def whats_changing(flow: str | None = None, lang: str = "fr", limit: int = 10) -> dict:
    lang = _supported_lang(lang)
    changes = read_file("changes.json")
    flow = _flow_key(flow) if flow else None
    selected = [change for change in changes["items"] if not flow or change["flow"] == flow][:limit]
    return {
        "window": changes["window"],
        "items": [_described_change(change, lang) for change in selected],
        "caution": CHANGES_CAUTION[lang],
        "source": source_citation(),
    }


def _described_change(change: dict, lang: str) -> dict:
    return {"flow": FLOW_LABELS[change["flow"]], "product": {"code": change["code"], "name": change["name"][lang]},
            "last_12_months_eur": change["now"], "previous_12_months_eur": change["before"], "change_eur": change["delta"],
            "change_ratio": _share(change["delta"], change["before"]),
            "main_partners_in_change": [{"code": code, "name": country_name(code, lang), "change_eur": delta}
                                        for code, delta in change["drivers"]]}


def explain_term(term: str, lang: str = "fr") -> dict:
    lang = _supported_lang(lang)
    key = searchable_text(term)
    key = TERM_ALIASES.get(key, key)
    if key not in GLOSSARY:
        return {"terms": sorted(GLOSSARY), "error": f"unknown term: {term}"}
    return {"term": key, "explanation": GLOSSARY[key][lang], "source": source_citation()}


def _local_relay() -> Relay:
    global _relay_for_local_use
    if _relay_for_local_use is None:
        _relay_for_local_use = Relay()
    return _relay_for_local_use


def _live_product_trade(code: str, flow: str, lang: str, top: int, relay) -> dict:
    latest_year = meta()["latest_year"]
    year, previous_year = str(latest_year), str(latest_year - 1)
    query = [("lang", lang.upper()), ("product", code), ("flow", FLOW_CODES[flow]), ("time", year), ("time", previous_year)]
    response, origin, url = relay.fetch_entry(query)
    payload = json.loads(response.body)
    cube = Cube(payload)
    if not _has_figures(value for _, value in cube.cells()):
        return _no_published_figures(code, cube.labels["product"].get(code, code), flow, f"{previous_year}-{year}")
    total = cube.value_at(partner="WORLD", time=year)
    partners = sorted(((partner, cube.value_at(partner=partner, time=year), cube.value_at(partner=partner, time=previous_year))
                       for partner in cube.positions["partner"] if is_country(partner)), key=lambda row: -(row[1] or 0))
    rows = [{"country_code": partner, "country": country_name(partner, lang), "value_eur": value, "share": _share(value, total),
             "value_previous_year_eur": previous} for partner, value, previous in partners if value][:top]
    return {"product": {"code": code, "name": cube.labels["product"].get(code, code)}, "flow": FLOW_LABELS[flow],
            "year": latest_year, "total_eur": total, "top_partners": rows, "live": True, "cache": origin, "api_url": url,
            "notes": _reading_notes(lang, flow), "source": {**source_citation(), "published": payload.get("updated")}}
