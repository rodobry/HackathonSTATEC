from __future__ import annotations

import json
import math
import os
import shutil
import statistics
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple
from xml.sax.saxutils import escape

from eurostat import EU27, Cube, Relay
from naming import LANGS, UNSPECIFIED, UNSPECIFIED_CODE, Naming, is_country, is_partner_code, short_label

FIRST_YEAR = 1999
DATASET = "DS-045409"
SOURCE_URL = "https://ec.europa.eu/eurostat/databrowser/view/ds-045409/legacyMultiFreq/table?category=ext_go.ext_go_detail"
SNAPSHOT_PUBLIC_URL = "https://hackathon.rodolpheaubry.com"
POPULATION_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan"
POPULATION_SOURCE_URL = "https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table"
GEO_CODES_IN_DEMOGRAPHY = {"GR": "EL"}
COMPARED_REPORTERS = ("LU", "BE", "DE", "FR", "NL", "IE", "MT", "CY", "EE")
FLOW_CODES = ["1", "2"]
FLOW_OF_CODE = {"1": "imp", "2": "exp"}
FLOWS = ("imp", "exp")
VALUE, QUANTITY = "VALUE_IN_EUROS", "QUANTITY_IN_100KG"

CODES_PER_WORLD_REQUEST = 100
CODES_PER_PARTNER_REQUEST = 25
CODES_PER_HISTORY_REQUEST = 10
CODES_PER_MONTHLY_PARTNER_REQUEST = 4
PARTNERS_WITH_HISTORY = 5
PARTNERS_OF_SUBHEADING = 5
CHILDREN_OF_HEADING = 12
TOP_HEADINGS_PER_COUNTRY = 12
TOP_CHAPTERS_PER_COUNTRY = 8
MIN_SEARCHABLE_SUBHEADING_TRADE = 1_000_000
CATALOG_LABEL_LENGTH = 90
PUBLISHED_MONTHS_READ = 31
MEDIAN_REFERENCE_MONTHS = 12
MIN_SHARE_OF_RECENT_MEDIAN = 0.5
COMPARISON_MONTHS = 12
MIN_LISTED_PRODUCT_TOTAL = 5_000_000
PRODUCT_CHANGES_PER_DIRECTION = 8
PARTNER_CHANGES_PER_DIRECTION = 5
DRIVERS_PER_CHANGE = 2
FEED_ITEMS = 12

TOP_PARTNER_QUESTIONS = (("imp", "top_supplier", ("DE", "FR", "CN", "NL", "US")),
                         ("exp", "top_client", ("FR", "BE", "US", "CN", "NL")))
PRODUCT_PARTNER_QUESTIONS = (("2204", "imp", "wine", ("IT", "PT", "ES", "FR", "DE")),
                             ("0901", "imp", "coffee", ("BR", "CO", "ET", "VN", "BE")),
                             ("8703", "imp", "cars", ("DE", "FR", "JP", "BE", "CN")),
                             ("4011", "exp", "tyres", ("DE", "FR", "US", "BE", "NL")))
EXPORT_CHAPTER_DISTRACTORS = ("72", "40", "22", "87", "39")
QUIZ_DISTRACTORS = 3
QUIZ_REFERENCE_YEAR = "2015"

FEED_TEXT = {
    "fr": {"title": "Le Luxembourg et le monde · ce qui change", "up": "en hausse", "down": "en baisse",
           "imp": "Achats", "exp": "Ventes", "line": "{flow} de {name} {sense} de {delta} sur les 12 derniers mois ({pct})."},
    "en": {"title": "Luxembourg and the world · what is changing", "up": "up", "down": "down",
           "imp": "Purchases", "exp": "Sales", "line": "{flow} of {name} {sense} {delta} over the last 12 months ({pct})."},
    "de": {"title": "Luxemburg und die Welt · was sich ändert", "up": "gestiegen", "down": "gesunken",
           "imp": "Einkäufe", "exp": "Verkäufe", "line": "{flow} von {name} {sense} um {delta} in den letzten 12 Monaten ({pct})."},
}

CURRENT_POINTER = "current"
VERSION_FILE = "version"
FORMAT_FILE = "format"
FILES_FORMAT = "2"
BUILD_TIMEOUT = 3 * 3600
BUILD_RETRY_SECONDS = 5 * 60
BUILD_LOG_LINES_KEPT = 12
ERROR_EXCERPT_LENGTH = 300
BUILD_MEMORY_CACHE = 8 * 1024 * 1024
DEFAULT_SNAPSHOT_CACHE = Path(__file__).resolve().parents[1] / ".cache" / "eurostat"
USAGE = "usage: views.py --build <views folder> | --write <site/data folder>"


def rounded(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return int(round(value))


def kilograms(quantity_in_100kg):
    return quantity_in_100kg * 100


def latest_value(series):
    return (series or [None])[-1]


def latest_and_previous(series):
    return (series[-1], series[-2]) if series else (None, None)


def monthly_series(values: dict, months: list[str]) -> list:
    return [rounded(values.get(month)) for month in months]


def chunks(items: list, size: int) -> list[list]:
    return [items[start:start + size] for start in range(0, len(items), size)]


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def print_now(message: str) -> None:
    print(message, flush=True)


def _take_result(future):
    result = future.result()
    future._result = None
    return result


class EurostatReader:
    QUERY_ORDER = ("lang", "reporter", "product", "partner", "flow", "indicators", "freq", "time", "sinceTimePeriod")
    DEFAULTS = {"lang": "EN", "reporter": "LU", "indicators": VALUE, "freq": "A"}

    def __init__(self, relay: Relay, workers: int = 3):
        self.relay, self.workers = relay, workers
        self.calls = 0

    def query(self, params: dict) -> list[tuple[str, str]]:
        params = {**self.DEFAULTS, **params}
        query = [("format", "JSON")]
        for key in self.QUERY_ORDER:
            value = params.get(key)
            if value is not None:
                query.extend((key, str(item)) for item in (value if isinstance(value, (list, tuple)) else [value]))
        return query

    def cube(self, **params) -> Cube:
        return self._fetch_cube(self.query(params))

    def _fetch_cube(self, query: list, base_url: str | None = None) -> Cube:
        self.calls += 1
        return Cube(json.loads(self.relay.fetch_trusted(query, base_url=base_url).body))

    def cubes(self, requests: list[dict]):
        with ThreadPoolExecutor(max_workers=self.workers) as pool:
            futures = [pool.submit(self.cube, **params) for params in requests]
            for future in futures:
                yield _take_result(future)

    def cubes_in_batches(self, codes: list[str], batch_size: int, **params):
        return self.cubes([{**params, "product": batch} for batch in chunks(codes, batch_size)])

    def population(self, first_year: int) -> dict:
        query = [("format", "JSON"), ("lang", "EN"), ("sex", "T"), ("age", "TOTAL"), ("unit", "NR"),
                 ("sinceTimePeriod", str(first_year))] + [("geo", GEO_CODES_IN_DEMOGRAPHY.get(code, code)) for code in EU27]
        cube = self._fetch_cube(query, base_url=POPULATION_API)
        comext_code = {demography: comext for comext, demography in GEO_CODES_IN_DEMOGRAPHY.items()}
        values = {(comext_code.get(cell["geo"], cell["geo"]), int(cell["time"])): int(value) for cell, value in cube.cells()}
        return {"updated": (cube.updated or "")[:10], "values": values}


class Years:
    def __init__(self, latest: int):
        self.latest = latest
        self.labels = [str(year) for year in range(FIRST_YEAR, latest + 1)]
        self.position = {label: index for index, label in enumerate(self.labels)}

    def empty_series(self) -> list:
        return [None] * len(self.labels)


@dataclass
class Publication:
    version: str | None
    years: Years
    world: dict
    naming: Naming
    recently_traded: set
    codes: list
    chapters: list
    series: dict
    masses: dict
    partners: dict
    heading_partner_values: dict
    history: dict
    partner_months: dict
    months: list
    code_months: dict


def complete_months(totals: dict) -> list[str]:
    complete, ordered = [], sorted(totals.items())
    for index, (period, value) in enumerate(ordered):
        previous = [total for _, total in ordered[max(0, index - MEDIAN_REFERENCE_MONTHS):index]]
        if not previous or value >= MIN_SHARE_OF_RECENT_MEDIAN * statistics.median(previous):
            complete.append(period)
        else:
            break
    return complete


def ranked_partners(values: dict) -> list:
    countries, unspecified_latest, unspecified_previous = [], 0, 0
    for partner, (latest, previous) in values.items():
        if is_country(partner):
            countries.append([partner, rounded(latest), rounded(previous)])
        else:
            unspecified_latest += latest or 0
            unspecified_previous += previous or 0
    countries.sort(key=lambda row: -(row[1] or 0))
    if unspecified_latest or unspecified_previous:
        countries.append([UNSPECIFIED_CODE, rounded(unspecified_latest), rounded(unspecified_previous)])
    return countries


def top_partner_codes(ranked_rows: list) -> list[str]:
    return [row[0] for row in ranked_rows if row[0] != UNSPECIFIED_CODE and row[1]][:PARTNERS_WITH_HISTORY]


def traded_in_last_two_years(series_by_flow: dict) -> bool:
    return any(series and (series[-1] or series[-2]) for series in (series_by_flow.get("imp"), series_by_flow.get("exp")))


def read_world_totals(reader: EurostatReader) -> tuple[str | None, dict]:
    cube = reader.cube(product="TOTAL", partner="WORLD", flow=FLOW_CODES, indicators=[VALUE, QUANTITY], sinceTimePeriod=FIRST_YEAR)
    return cube.updated, {(cell["indicators"], FLOW_OF_CODE[cell["flow"]], cell["time"]): value for cell, value in cube.cells()}


def latest_complete_year(world: dict) -> int:
    published = {int(period) for indicator, _, period in world if indicator == VALUE and len(period) == 4}
    return max(year for year in published if (VALUE, "imp", str(year)) in world and (VALUE, "exp", str(year)) in world)


def read_product_labels(reader: EurostatReader, latest: int) -> tuple[dict, set]:
    labels, recently_traded = {}, set()
    for lang in LANGS:
        periods = [str(latest - 2), str(latest - 1), str(latest)] if lang == "fr" else [str(latest)]
        cube = reader.cube(lang=lang.upper(), partner="WORLD", flow=FLOW_CODES, time=periods)
        labels[lang] = cube.labels["product"]
        if lang == "fr":
            recently_traded = {cell["product"] for cell, value in cube.cells() if value}
    return labels, recently_traded


def read_partner_labels(reader: EurostatReader, latest: int) -> dict:
    return {lang: reader.cube(lang=lang.upper(), product="TOTAL", flow="1", time=str(latest)).labels["partner"] for lang in LANGS}


def read_annual_series(cubes, dimension: str, years: Years, include=lambda code: True) -> tuple[dict, dict]:
    values, masses = {}, {}
    for cube in cubes:
        for cell, value in cube.cells():
            if cell["time"] not in years.position or not include(cell[dimension]):
                continue
            is_value = cell["indicators"] == VALUE
            target = values if is_value else masses
            series = target.setdefault(cell[dimension], {}).setdefault(FLOW_OF_CODE[cell["flow"]], years.empty_series())
            series[years.position[cell["time"]]] = rounded(value if is_value else kilograms(value))
    return values, masses


def _latest_and_previous_by_partner(cube: Cube, latest: int) -> dict:
    values = {}
    for cell, value in cube.cells():
        if not is_partner_code(cell["partner"]):
            continue
        by_partner = values.setdefault(cell["product"], {}).setdefault(FLOW_OF_CODE[cell["flow"]], {})
        by_partner.setdefault(cell["partner"], [None, None])[0 if cell["time"] == str(latest) else 1] = value
    return values


def read_partners(reader: EurostatReader, codes: list[str], latest: int) -> tuple[dict, dict]:
    ranked, heading_values = {}, {}
    for cube in reader.cubes_in_batches(codes, CODES_PER_PARTNER_REQUEST, flow=FLOW_CODES, time=[str(latest - 1), str(latest)]):
        for code, values_by_flow in _latest_and_previous_by_partner(cube, latest).items():
            ranked[code] = {flow: ranked_partners(values) for flow, values in values_by_flow.items()}
            if len(code) <= 4:
                heading_values[code] = values_by_flow
    return ranked, heading_values


def _partners_worth_a_history(codes: list[str], partners: dict) -> dict[str, set]:
    wanted = {}
    for code in codes:
        if len(code) <= 4:
            tops = {partner for rows in partners.get(code, {}).values() for partner in top_partner_codes(rows)}
            if tops:
                wanted[code] = tops
    return wanted


def read_partner_history(reader: EurostatReader, codes: list[str], partners: dict, years: Years) -> dict:
    wanted = _partners_worth_a_history(codes, partners)
    requests = [dict(product=batch, partner=sorted(set().union(*(wanted[code] for code in batch))), flow=FLOW_CODES,
                     sinceTimePeriod=FIRST_YEAR) for batch in chunks(sorted(wanted), CODES_PER_HISTORY_REQUEST)]
    history = {}
    for cube in reader.cubes(requests):
        for cell, value in cube.cells():
            if cell["time"] in years.position:
                by_partner = history.setdefault(cell["product"], {}).setdefault(FLOW_OF_CODE[cell["flow"]], {})
                by_partner.setdefault(cell["partner"], years.empty_series())[years.position[cell["time"]]] = rounded(value)
    return {code: {flow: _only_top_partners(series_by_partner, partners.get(code, {}).get(flow, []))
                   for flow, series_by_partner in series_by_flow.items()}
            for code, series_by_flow in history.items()}


def _only_top_partners(series_by_partner: dict, ranked_rows: list) -> dict:
    return {partner: series_by_partner[partner] for partner in top_partner_codes(ranked_rows) if partner in series_by_partner}


def monthly_values(cubes, dimension: str) -> dict:
    values = {}
    for cube in cubes:
        for cell, value in cube.cells():
            values.setdefault(cell[dimension], {}).setdefault(FLOW_OF_CODE[cell["flow"]], {})[cell["time"]] = value
    return values


def read_months(reader: EurostatReader, codes: list[str], latest: int) -> tuple[dict, list[str], dict]:
    first_month = f"{latest - 2}-01"
    partner_months = monthly_values([reader.cube(product="TOTAL", flow=FLOW_CODES, freq="M", sinceTimePeriod=first_month)], "partner")
    world = partner_months.get("WORLD", {})
    published = sorted({month for values in world.values() for month in values})[-PUBLISHED_MONTHS_READ:]
    months = complete_months({month: sum(world.get(flow, {}).get(month, 0) for flow in FLOWS) for month in published})
    headings = [code for code in codes if len(code) <= 4]
    code_months = monthly_values(reader.cubes_in_batches(headings, CODES_PER_WORLD_REQUEST, partner="WORLD", flow=FLOW_CODES,
                                                         freq="M", sinceTimePeriod=months[0]), "product")
    return partner_months, months, code_months


def read_publication(reader: EurostatReader, log) -> Publication:
    version, world = read_world_totals(reader)
    years = Years(latest_complete_year(world))
    log(f"release {version}, latest year {years.latest}")

    product_labels, recently_traded = read_product_labels(reader, years.latest)
    naming = Naming(product_labels, read_partner_labels(reader, years.latest))
    candidates = sorted(code for code in product_labels["fr"] if code.isdigit() and len(code) in (2, 4, 6))
    log(f"{len(candidates)} codes with 2, 4 and 6 digits; {reader.calls} requests")

    annual_cubes = reader.cubes_in_batches(candidates, CODES_PER_WORLD_REQUEST, partner="WORLD", flow=FLOW_CODES,
                                           indicators=[VALUE, QUANTITY], sinceTimePeriod=FIRST_YEAR)
    series, masses = read_annual_series(annual_cubes, "product", years)
    codes = sorted(series)
    naming.distinguish_siblings(codes)
    log(f"{len(codes)} codes with trade; {reader.calls} requests")

    recent_codes = [code for code in codes if traded_in_last_two_years(series[code])]
    partners, heading_partner_values = read_partners(reader, recent_codes, years.latest)
    log(f"partners of {len(partners)} codes; {reader.calls} requests")

    history = read_partner_history(reader, codes, partners, years)
    log(f"history of {len(history)} codes; {reader.calls} requests")

    partner_months, months, code_months = read_months(reader, codes, years.latest)
    log(f"months {months[0]} to {months[-1]}; {reader.calls} requests")

    return Publication(version=version, years=years, world=world, naming=naming, recently_traded=recently_traded,
                       codes=codes, chapters=[code for code in codes if len(code) == 2], series=series, masses=masses,
                       partners=partners, heading_partner_values=heading_partner_values, history=history,
                       partner_months=partner_months, months=months, code_months=code_months)


def largest_children(code: str, flow: str, children: list[str], series: dict) -> list:
    if len(code) >= 6:
        return []
    values = [[child, latest_value(series[child].get(flow))] for child in children]
    largest = sorted((row for row in values if row[1] is not None), key=lambda row: -row[1])
    return largest[:CHILDREN_OF_HEADING] if len(code) == 4 else largest


def product_entry(code: str, children: list[str], publication: Publication) -> dict:
    is_heading_or_chapter = len(code) <= 4
    code_months = publication.code_months.get(code, {})
    return {
        "code": code,
        "name": publication.naming.distinct_product_names(code),
        "series": {flow: publication.series[code].get(flow) for flow in FLOWS},
        "kg": {flow: publication.masses.get(code, {}).get(flow) for flow in FLOWS},
        "partners": {flow: _partner_rows(code, publication.partners.get(code, {}).get(flow, [])) for flow in FLOWS},
        "history": {flow: publication.history.get(code, {}).get(flow, {}) if is_heading_or_chapter else {} for flow in FLOWS},
        "children": {flow: largest_children(code, flow, children, publication.series) for flow in FLOWS},
        "monthly": {flow: monthly_series(code_months[flow], publication.months)
                    if is_heading_or_chapter and flow in code_months else None for flow in FLOWS},
    }


def _partner_rows(code: str, rows: list) -> list:
    return rows[:PARTNERS_OF_SUBHEADING] if len(code) == 6 else rows


def product_entries(publication: Publication) -> dict[str, dict]:
    children_by_parent = {}
    for code in publication.codes:
        if len(code) > 2:
            children_by_parent.setdefault(code[:-2], []).append(code)
    return {code: product_entry(code, children_by_parent.get(code, []), publication) for code in publication.codes}


def group_by_chapter(entries: dict[str, dict], chapters: list[str]) -> dict[str, dict]:
    by_chapter = {chapter: {} for chapter in chapters}
    for code, entry in entries.items():
        if code[:2] in by_chapter:
            by_chapter[code[:2]][code] = entry
    return by_chapter


def chapter_file(chapter: str, entries: dict, naming: Naming) -> dict:
    return {"chapter": chapter, "items": entries,
            "official": {code: naming.official_labels(code) for code in entries if len(code) <= 4}}


def search_rows(entries_by_chapter: dict) -> list[dict]:
    rows = []
    for entries in entries_by_chapter.values():
        for code, entry in entries.items():
            imports, exports = latest_value(entry["series"]["imp"]), latest_value(entry["series"]["exp"])
            if len(code) <= 4 or (imports or 0) + (exports or 0) >= MIN_SEARCHABLE_SUBHEADING_TRADE:
                rows.append({"code": code, "name": entry["name"], "imp": imports, "exp": exports})
    return sorted(rows, key=lambda row: row["code"])


def search_file(entries_by_chapter: dict, lexicon: dict) -> dict:
    products = lexicon.get("products", [])
    return {"products": search_rows(entries_by_chapter),
            "synonyms": [[word, product["code"], lang] for product in products
                         for lang, words in product.get("synonyms", {}).items() for word in words],
            "themes": {product["code"]: product.get("theme") for product in products},
            "litres": sorted(product["code"] for product in products if product.get("litres"))}


def catalog_files(publication: Publication) -> dict:
    naming = publication.naming
    codes = sorted(code for code in publication.recently_traded if len(code) == 8 and code.isdigit())
    names = naming.disambiguate({code: {lang: short_label(naming.official_label(code, lang), CATALOG_LABEL_LENGTH) for lang in LANGS}
                                 for code in codes})
    return {f"catalog-{lang}.json": {code: names[code][lang] for code in codes} for lang in LANGS}


def top_products_by_country(heading_partner_values: dict, digits: int, limit: int) -> dict:
    grouped = {}
    for code, values_by_flow in heading_partner_values.items():
        if len(code) != digits:
            continue
        for flow, values in values_by_flow.items():
            for partner, (latest, previous) in values.items():
                if is_country(partner) and latest is not None:
                    grouped.setdefault(partner, {}).setdefault(flow, []).append([code, rounded(latest), rounded(previous)])
    return {partner: {flow: sorted(rows, key=lambda row: -(row[1] or 0))[:limit] for flow, rows in rows_by_flow.items()}
            for partner, rows_by_flow in grouped.items()}


def countries_file(publication: Publication, country_series: dict, country_masses: dict) -> dict:
    top_headings = top_products_by_country(publication.heading_partner_values, 4, TOP_HEADINGS_PER_COUNTRY)
    top_chapters = top_products_by_country(publication.heading_partner_values, 2, TOP_CHAPTERS_PER_COUNTRY)
    countries, names = {}, {}
    for code, series_by_flow in country_series.items():
        if not is_country(code):
            continue
        months = publication.partner_months.get(code, {})
        countries[code] = {
            "series": {flow: series_by_flow.get(flow) for flow in FLOWS},
            "kg": {flow: country_masses.get(code, {}).get(flow) for flow in FLOWS},
            "products": top_headings.get(code, {}),
            "chapters": top_chapters.get(code, {}),
            "monthly": {flow: monthly_series(months.get(flow, {}), publication.months) for flow in FLOWS},
        }
        names[code] = publication.naming.country_names(code)
    product_codes = {code for entry in countries.values() for kind in ("products", "chapters")
                     for rows in entry[kind].values() for code, *_ in rows}
    return {"countries": countries, "names": names,
            "products": {code: publication.naming.distinct_product_names(code) for code in product_codes}}


def overview_partners(country_series: dict, flow: str) -> dict:
    values = {partner: latest_and_previous(series_by_flow.get(flow)) for partner, series_by_flow in country_series.items()}
    ranked = ranked_partners({partner: pair for partner, pair in values.items() if pair[0] is not None})
    unspecified = ranked.pop()[1] if ranked and ranked[-1][0] == UNSPECIFIED_CODE else 0
    return {"rows": ranked, "unspecified": rounded(unspecified)}


def chapter_ranking(publication: Publication, flow: str) -> list:
    rows = [[chapter, *latest_and_previous(publication.series[chapter].get(flow))] for chapter in publication.chapters]
    return sorted((row for row in rows if row[1] is not None), key=lambda row: -(row[1] or 0))


def chapter_series(publication: Publication) -> dict:
    return {chapter: {flow: publication.series[chapter].get(flow) for flow in FLOWS} for chapter in publication.chapters}


def read_neighbours(reader: EurostatReader, years: Years) -> dict:
    cube = reader.cube(reporter=list(COMPARED_REPORTERS), product="TOTAL", partner="WORLD", flow=FLOW_CODES, sinceTimePeriod=FIRST_YEAR)
    values = {}
    for cell, value in cube.cells():
        if cell["time"] in years.position:
            values.setdefault(cell["reporter"], {}).setdefault(FLOW_OF_CODE[cell["flow"]], {})[cell["time"]] = rounded(value)
    return {reporter: values[reporter] for reporter in COMPARED_REPORTERS if reporter in values}


def overview_file(reader: EurostatReader, publication: Publication, country_series: dict) -> dict:
    years, world = publication.years, publication.world
    world_months = publication.partner_months.get("WORLD", {})
    return {
        "years": years.labels,
        "totals": {flow: [rounded(world.get((VALUE, flow, year))) for year in years.labels] for flow in FLOWS},
        "kg": {flow: rounded(kilograms(world.get((QUANTITY, flow, years.labels[-1])) or 0)) for flow in FLOWS},
        "partners": {flow: overview_partners(country_series, flow) for flow in FLOWS},
        "chapters": {flow: chapter_ranking(publication, flow) for flow in FLOWS},
        "chapter_series": chapter_series(publication),
        "months": publication.months,
        "monthly": {flow: monthly_series(world_months.get(flow, {}), publication.months) for flow in FLOWS},
        "neighbours": read_neighbours(reader, years),
    }


class Change(NamedTuple):
    code: str
    now: float
    before: float
    delta: float


@dataclass
class ComparisonWindow:
    recent: list[str]
    previous: list[str]

    def totals(self, values: dict) -> tuple[float | None, float | None]:
        return _sum_months(values, self.recent), _sum_months(values, self.previous)

    def change(self, code: str, values: dict) -> Change | None:
        now, before = self.totals(values)
        return Change(code, now, before, now - before) if now is not None and before is not None else None


def _sum_months(values: dict, months: list[str]) -> float | None:
    if not months or any(values.get(month) is None for month in months):
        return None
    return sum(values[month] for month in months)


def largest_rises_and_falls(changes: list[Change], count: int) -> list[Change]:
    by_rise = sorted(changes, key=lambda change: -change.delta)
    by_fall = sorted(by_rise, key=lambda change: change.delta)
    return list(dict.fromkeys(by_rise[:count] + by_fall[:count]))


def _moves_in_same_direction(partner_delta: float, product_delta: float) -> bool:
    return partner_delta > 0 if product_delta > 0 else partner_delta < 0


def product_changes(code_months: dict, flow: str, window: ComparisonWindow) -> list[Change]:
    changes = []
    for code, values_by_flow in code_months.items():
        if len(code) != 4 or flow not in values_by_flow:
            continue
        change = window.change(code, values_by_flow[flow])
        if change and (change.before >= MIN_LISTED_PRODUCT_TOTAL or change.now >= MIN_LISTED_PRODUCT_TOTAL):
            changes.append(change)
    return changes


def read_partner_months_of_products(reader: EurostatReader, codes: list[str], window: ComparisonWindow) -> dict:
    values = {}
    for cube in reader.cubes_in_batches(codes, CODES_PER_MONTHLY_PARTNER_REQUEST, flow=FLOW_CODES, freq="M",
                                        sinceTimePeriod=window.previous[0]):
        for cell, value in cube.cells():
            if is_country(cell["partner"]):
                by_partner = values.setdefault((FLOW_OF_CODE[cell["flow"]], cell["product"]), {})
                by_partner.setdefault(cell["partner"], {})[cell["time"]] = value
    return values


def change_item(flow: str, change: Change, partner_months: dict, publication: Publication, window: ComparisonWindow) -> dict:
    partner_moves = [window.change(partner, values) for partner, values in partner_months.get((flow, change.code), {}).items()]
    drivers = sorted((move for move in partner_moves if move and _moves_in_same_direction(move.delta, change.delta)),
                     key=lambda move: -abs(move.delta))
    return {
        "flow": flow, "code": change.code, "name": publication.naming.plain_product_names(change.code),
        "now": rounded(change.now), "before": rounded(change.before), "delta": rounded(change.delta),
        "drivers": [[driver.code, rounded(driver.delta)] for driver in drivers[:DRIVERS_PER_CHANGE]],
        "monthly": monthly_series(publication.code_months[change.code][flow], window.previous + window.recent),
    }


def partner_changes(partner_months: dict, window: ComparisonWindow) -> list[dict]:
    rows = []
    for flow in FLOWS:
        changes = [change for partner, values_by_flow in partner_months.items()
                   if is_country(partner) and flow in values_by_flow
                   if (change := window.change(partner, values_by_flow[flow])) is not None]
        for change in largest_rises_and_falls(changes, PARTNER_CHANGES_PER_DIRECTION):
            rows.append({"flow": flow, "code": change.code, "now": rounded(change.now), "before": rounded(change.before),
                         "delta": rounded(change.delta)})
    return rows


def changes_file(reader: EurostatReader, publication: Publication) -> dict:
    months = publication.months
    if len(months) < 2 * COMPARISON_MONTHS:
        return {"window": None, "items": []}
    window = ComparisonWindow(recent=months[-COMPARISON_MONTHS:], previous=months[-2 * COMPARISON_MONTHS:-COMPARISON_MONTHS])
    picks = [(flow, change) for flow in FLOWS
             for change in largest_rises_and_falls(product_changes(publication.code_months, flow, window), PRODUCT_CHANGES_PER_DIRECTION)]
    partner_months = read_partner_months_of_products(reader, sorted({change.code for _, change in picks}), window)
    changed_products = [change_item(flow, change, partner_months, publication, window) for flow, change in picks]
    world = publication.partner_months.get("WORLD", {})
    return {
        "window": {"now": [window.recent[0], window.recent[-1]], "before": [window.previous[0], window.previous[-1]]},
        "months": window.previous + window.recent,
        "totals": {flow: dict(zip(("now", "before"), map(rounded, window.totals(world.get(flow, {}))))) for flow in FLOWS},
        "items": sorted(changed_products, key=lambda change: -abs(change["delta"])),
        "partners": partner_changes(publication.partner_months, window),
    }


def quiz_options(answer: str, distractors) -> list[str]:
    return sorted([answer] + [option for option in distractors if option != answer][:QUIZ_DISTRACTORS])


def per_day_question(imports) -> dict:
    per_day = imports / 365
    return {"id": "per_day", "kind": "number", "answer": rounded(per_day),
            "options": [rounded(per_day / 10), rounded(per_day), rounded(per_day * 10)]}


def coverage_question(imports, exports) -> dict:
    coverage = round(exports / imports * 100)
    return {"id": "coverage", "kind": "number", "answer": coverage, "options": sorted({max(5, coverage - 40), coverage, coverage + 55})}


def top_partner_question(overview: dict, flow: str, question_id: str, distractors, total) -> dict:
    leader, value, _ = overview["partners"][flow]["rows"][0]
    return {"id": question_id, "kind": "country", "flow": flow, "answer": leader, "options": quiz_options(leader, distractors),
            "share": value / total}


def product_partner_question(products: dict, code: str, flow: str, question_id: str, distractors) -> dict | None:
    entry = products.get(code)
    rows = [row for row in (entry or {}).get("partners", {}).get(flow, []) if row[0] != UNSPECIFIED_CODE and row[1]]
    if not rows:
        return None
    leader, value, _ = rows[0]
    total = entry["series"][flow][-1]
    return {"id": question_id, "kind": "country", "flow": flow, "product": code, "answer": leader,
            "options": quiz_options(leader, distractors), "share": value / total if total else None}


def top_export_chapter_question(overview: dict, exports) -> dict:
    chapter, value, _ = overview["chapters"]["exp"][0]
    return {"id": "top_export_chapter", "kind": "chapter", "answer": chapter,
            "options": quiz_options(chapter, EXPORT_CHAPTER_DISTRACTORS), "share": value / exports}


def draw_exports_question(overview: dict) -> dict:
    start = overview["years"].index(QUIZ_REFERENCE_YEAR)
    return {"id": "draw_exports", "kind": "draw", "years": overview["years"][start:], "values": overview["totals"]["exp"][start:]}


def growth_rank_question(overview: dict, latest: int) -> dict:
    growth = {}
    for reporter, flows in overview["neighbours"].items():
        exports = flows.get("exp", {})
        if exports.get(QUIZ_REFERENCE_YEAR) and exports.get(str(latest)):
            growth[reporter] = exports[str(latest)] / exports[QUIZ_REFERENCE_YEAR] * 100
    order = sorted(growth, key=growth.get)
    answer = "lowest" if order[0] == "LU" else ("highest" if order[-1] == "LU" else "middle")
    return {"id": "growth_rank", "kind": "rank", "answer": answer, "options": ["highest", "middle", "lowest"],
            "growth": {reporter: round(value, 1) for reporter, value in growth.items()}}


def quiz_questions(overview: dict, products: dict, latest: int) -> list[dict]:
    imports, exports = overview["totals"]["imp"][-1], overview["totals"]["exp"][-1]
    totals = {"imp": imports, "exp": exports}
    questions = [per_day_question(imports), coverage_question(imports, exports)]
    questions += [top_partner_question(overview, flow, question_id, distractors, totals[flow])
                  for flow, question_id, distractors in TOP_PARTNER_QUESTIONS]
    questions += [question for question in (product_partner_question(products, *spec) for spec in PRODUCT_PARTNER_QUESTIONS) if question]
    questions.append(top_export_chapter_question(overview, exports))
    questions.append(draw_exports_question(overview))
    questions.append(growth_rank_question(overview, latest))
    questions.append({"id": "balance", "kind": "yesno", "answer": "no" if exports < imports else "yes", "options": ["yes", "no"]})
    return questions


def feed_money(value, lang: str) -> str:
    millions = abs(value) / 1e6
    text = f"{millions:,.0f}" if millions >= 10 else f"{millions:,.1f}"
    if lang == "fr":
        return text.replace(",", " ").replace(".", ",") + " M€"
    if lang == "de":
        return text.replace(",", ".") + " Mio. €"
    return "€" + text + "m"


def rss_item(change: dict, lang: str, window_end: str, published: str) -> str:
    text = FEED_TEXT[lang]
    before = change["before"] or 0
    percent = f"{change['delta'] / before * 100:+.0f} %" if before else "n.d."
    line = text["line"].format(flow=text[change["flow"]], name=change["name"][lang].lower(),
                               sense=text["up"] if change["delta"] > 0 else text["down"],
                               delta=feed_money(change["delta"], lang), pct=percent)
    flow = "imports" if change["flow"] == "imp" else "exports"
    link = f"{SNAPSHOT_PUBLIC_URL}/index.html#/product/{change['code']}?flow={flow}&lang={lang}"
    return (f"<item><title>{escape(line)}</title><link>{escape(link)}</link>"
            f"<guid isPermaLink=\"false\">{change['flow']}-{change['code']}-{window_end}</guid><pubDate>{published}</pubDate></item>")


def rss_feed(lang: str, changes: list[dict], window_end: str, published: str) -> str:
    return (f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\"><channel>"
            f"<title>{escape(FEED_TEXT[lang]['title'])}</title><link>{SNAPSHOT_PUBLIC_URL}/index.html#/changes?lang={lang}</link>"
            f"<description>Eurostat Comext {DATASET}</description><language>{lang}</language>"
            + "".join(rss_item(change, lang, window_end, published) for change in changes) + "</channel></rss>\n")


def feeds(changes: dict, updated: str) -> dict:
    if not changes.get("items"):
        return {}
    window_end = changes["window"]["now"][1]
    published = datetime.strptime(updated, "%Y-%m-%d").strftime("%a, %d %b %Y 11:00:00 +0200") if updated else ""
    return {("feed.xml" if lang == "fr" else f"feed-{lang}.xml"): rss_feed(lang, changes["items"][:FEED_ITEMS], window_end, published)
            for lang in LANGS}


def population_file(reader: EurostatReader, latest: int) -> dict:
    population = reader.population(FIRST_YEAR)
    return {"dataset": "demo_pjan", "source_url": POPULATION_SOURCE_URL, "updated": population["updated"],
            "first_year": FIRST_YEAR, "latest_year": latest,
            "values": {code: [population["values"].get((code, year)) for year in range(FIRST_YEAR, latest + 1)] for code in EU27}}


def meta_file(publication: Publication) -> dict:
    naming = publication.naming
    return {
        "dataset": DATASET, "source_url": SOURCE_URL, "source_updated": (publication.version or "")[:10],
        "generated": utc_timestamp(),
        "latest_year": publication.years.latest, "first_year": FIRST_YEAR, "months": [publication.months[0], publication.months[-1]],
        "unspecified": UNSPECIFIED, "chapters": publication.chapters,
        "chapter_names": {chapter: naming.distinct_product_names(chapter) for chapter in publication.chapters},
        "eurostat_version": publication.version, "source": "api",
    }


def build(reader: EurostatReader, log=print) -> dict:
    started = time.time()
    publication = read_publication(reader, log)
    entries = product_entries(publication)
    entries_by_chapter = group_by_chapter(entries, publication.chapters)
    files = {f"products/{chapter}.json": chapter_file(chapter, chapter_entries, publication.naming)
             for chapter, chapter_entries in entries_by_chapter.items()}
    country_series, country_masses = read_annual_series(
        [reader.cube(product="TOTAL", flow=FLOW_CODES, indicators=[VALUE, QUANTITY], sinceTimePeriod=FIRST_YEAR)],
        "partner", publication.years, include=is_partner_code)
    files["countries.json"] = countries_file(publication, country_series, country_masses)
    files["overview.json"] = overview_file(reader, publication, country_series)
    files["changes.json"] = changes_file(reader, publication)
    files["quiz.json"] = {"questions": quiz_questions(files["overview.json"], entries, publication.years.latest)}
    files["search.json"] = search_file(entries_by_chapter, publication.naming.lexicon)
    files.update(catalog_files(publication))
    files["population.json"] = population_file(reader, publication.years.latest)
    files["meta.json"] = meta_file(publication)
    files.update(feeds(files["changes.json"], files["meta.json"]["source_updated"]))
    log(f"{len(files)} files in {time.time() - started:.0f} s, {reader.calls} requests")
    return files


def encode_file(content) -> bytes:
    if isinstance(content, str):
        return content.encode("utf-8")
    return json.dumps(content, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


class ViewStore:
    def __init__(self, relay: Relay, folder: str | os.PathLike | None, log=None):
        self.relay = relay
        self.folder = Path(folder) if folder else None
        self.log = log or (lambda message: print(f"[vues] {message}", flush=True))
        self.lock = threading.Lock()
        self.building = False
        self.retry_at = 0.0
        self.files: dict[str, bytes] = {}
        self.version: str | None = None
        self.state = {"built": None, "duration": None, "requests": None, "error": None, "files": 0}
        self._load_saved_publication()

    def _load_saved_publication(self) -> None:
        if not self.folder or not (self.folder / CURRENT_POINTER).exists():
            return
        base = self.folder / (self.folder / CURRENT_POINTER).read_text().strip()
        if not base.is_dir() or not _has_current_format(base):
            return
        files = {str(path.relative_to(base)): path.read_bytes() for path in base.rglob("*")
                 if path.is_file() and path.name not in (VERSION_FILE, FORMAT_FILE)}
        version = (base / VERSION_FILE).read_text().strip() if (base / VERSION_FILE).exists() else None
        with self.lock:
            self.files, self.version = files, version
            self.state["files"] = len(files)

    def get(self, name: str) -> bytes | None:
        self.build_if_due()
        with self.lock:
            return self.files.get(name)

    def build_if_due(self) -> None:
        self.relay.probe_if_due()
        current = self.relay.version
        with self.lock:
            due = (not self.building and time.monotonic() >= self.retry_at
                   and (not self.files or (current is not None and current != self.version)))
            if due:
                self.building = True
        if due:
            threading.Thread(target=self._build, name="views-build", daemon=True).start()

    def _build(self) -> None:
        started = time.time()
        try:
            if self.relay.version is None:
                self.relay.check_version()
            requests = self._build_in_subprocess() if self.folder and self.relay.cache_dir else self._build_in_process()
            with self.lock:
                self.state.update(built=utc_timestamp(), duration=round(time.time() - started),
                                  requests=requests, error=None, files=len(self.files))
        except Exception as error:
            self.log(f"build failed: {error!r}")
            with self.lock:
                self.state["error"] = repr(error)[:ERROR_EXCERPT_LENGTH]
                self.retry_at = time.monotonic() + BUILD_RETRY_SECONDS
        finally:
            with self.lock:
                self.building = False

    def _build_in_subprocess(self) -> int | None:
        environment = {**os.environ, "CACHE_DIR": str(self.relay.cache_dir)}
        done = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--build", str(self.folder)],
                              env=environment, capture_output=True, text=True, timeout=BUILD_TIMEOUT)
        for line in done.stdout.splitlines()[-BUILD_LOG_LINES_KEPT:]:
            self.log(line)
        if done.returncode != 0:
            raise RuntimeError(f"calcul interrompu (code {done.returncode}) : {done.stderr.strip()[-ERROR_EXCERPT_LENGTH:]}")
        report = json.loads(done.stdout.strip().splitlines()[-1])
        self._load_saved_publication()
        return report.get("requests")

    def _build_in_process(self) -> int:
        reader = EurostatReader(self.relay)
        files = build(reader, log=self.log)
        with self.lock:
            self.files = {name: encode_file(content) for name, content in files.items()}
            self.version = files["meta.json"].get("eurostat_version")
        return reader.calls

    def health(self) -> dict:
        with self.lock:
            return {**self.state, "version": self.version, "building": self.building, "source": "api" if self.files else "snapshot"}


def _has_current_format(base: Path) -> bool:
    format_file = base / FORMAT_FILE
    return format_file.exists() and format_file.read_text().strip() == FILES_FORMAT


def save_publication(folder: Path, version: str | None, files: dict[str, bytes]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    slug = "".join(character if character.isalnum() else "-" for character in (version or "inconnue"))
    partial = folder / f"{slug}.part"
    shutil.rmtree(partial, ignore_errors=True)
    for name, body in files.items():
        path = partial / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
    (partial / VERSION_FILE).write_text(version or "")
    (partial / FORMAT_FILE).write_text(FILES_FORMAT)
    shutil.rmtree(folder / slug, ignore_errors=True)
    partial.rename(folder / slug)
    (folder / f"{CURRENT_POINTER}.part").write_text(slug)
    (folder / f"{CURRENT_POINTER}.part").replace(folder / CURRENT_POINTER)
    for other in folder.iterdir():
        if other.is_dir() and other.name != slug:
            shutil.rmtree(other, ignore_errors=True)


def _relay_for_build(cache_dir: str | None) -> Relay:
    relay = Relay(cache_dir=cache_dir, memory_bytes=BUILD_MEMORY_CACHE, warm_count=0)
    relay.check_version()
    return relay


def build_and_save(folder: Path, cache_dir: str | None) -> None:
    reader = EurostatReader(_relay_for_build(cache_dir))
    files = build(reader, log=print_now)
    save_publication(folder, files["meta.json"].get("eurostat_version"), {name: encode_file(content) for name, content in files.items()})
    print(json.dumps({"requests": reader.calls, "files": len(files)}), flush=True)


def write_snapshot(target: Path, cache_dir: str | None = None) -> None:
    files = build(EurostatReader(_relay_for_build(cache_dir), workers=4), log=print_now)
    for name, content in files.items():
        path = (target.parent / name) if name.startswith("feed") else (target / name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encode_file(content))
    print(f"snapshot written to {target}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--build":
        build_and_save(Path(sys.argv[2]), os.environ.get("CACHE_DIR") or None)
    elif len(sys.argv) >= 3 and sys.argv[1] == "--write":
        write_snapshot(Path(sys.argv[2]).resolve(), os.environ.get("CACHE_DIR") or str(DEFAULT_SNAPSHOT_CACHE))
    else:
        print(USAGE)
