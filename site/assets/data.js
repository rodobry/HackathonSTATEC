import { countryForms, lang, t } from "./i18n.js";
import { formatHash } from "./routes.js";

const dataRequests = new Map();

export function loadData(path) {
  if (!dataRequests.has(path)) {
    const request = fetch(`data/${path}`).then((response) => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    });
    request.catch(() => dataRequests.delete(path));
    dataRequests.set(path, request);
  }
  return dataRequests.get(path);
}

export const store = { meta: null, overview: null, countries: null, search: null, names: new Map() };

function rememberName(code, names) {
  if (!store.names.has(code)) store.names.set(code, names);
}

export async function loadCoreData() {
  const [meta, overview, countries, search] = await Promise.all([
    loadData("meta.json"), loadData("overview.json"), loadData("countries.json"), loadData("search.json"),
  ]);
  Object.assign(store, { meta, overview, countries, search });
  for (const row of search.products) store.names.set(row.code, row.name);
  for (const [code, names] of Object.entries(meta.chapter_names)) store.names.set(code, names);
  for (const [code, names] of Object.entries(countries.products)) rememberName(code, names);
}

export function latestYear() { return store.meta.latest_year; }

export function yearIndex(year) { return Number(year) - store.meta.first_year; }

export function siteYears() {
  const years = [];
  for (let year = store.meta.first_year; year <= store.meta.latest_year; year++) years.push(year);
  return years;
}

export function flowParam(params) { return params.get("flux") === "exp" ? "exp" : "imp"; }

export function yearParam(params, latest = latestYear()) {
  const asked = Number(params.get("annee"));
  return Number.isInteger(asked) && asked >= store.meta.first_year && asked <= latest ? asked : latest;
}

export function periodParam(params) {
  const until = Math.max(yearParam(params), store.meta.first_year + 1);
  const asked = Number(params.get("depuis"));
  const from = Number.isInteger(asked) && asked >= store.meta.first_year && asked < until ? asked : store.meta.first_year;
  return { from, until };
}

export function periodUrlParams({ from, until }) {
  return { depuis: from === store.meta.first_year ? null : from, annee: until === latestYear() ? null : until };
}

export function withinPeriod(values, { from, until }) {
  return (values || []).slice(yearIndex(from), yearIndex(until) + 1);
}

function rankedByYear(seriesByCode, flow, year) {
  const index = yearIndex(year);
  return seriesByCode
    .map(([code, series]) => [code, series[flow]?.[index] ?? null, series[flow]?.[index - 1] ?? null])
    .filter(([, value]) => value)
    .sort((a, b) => b[1] - a[1]);
}

export function chapterRanking(flow, year) {
  return rankedByYear(Object.entries(store.overview.chapter_series), flow, year);
}

export function partnerRanking(flow, year) {
  const countries = Object.entries(store.countries.countries).filter(([code]) => isCountry(code));
  return rankedByYear(countries.map(([code, country]) => [code, country.series]), flow, year);
}

export function monthPeriods() {
  const [first, last] = store.meta.months;
  const periods = [];
  let [year, month] = first.split("-").map(Number);
  const [lastYear, lastMonth] = last.split("-").map(Number);
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return periods;
}

export const UNSPECIFIED_PARTNER = "ZZ";
const AGGREGATE_PARTNERS = ["EU", "XI", "XU", "LU"];

export function isConfidentialPartnerGroup(code) { return /^Q[A-Z]$/.test(code) && code !== "QA"; }

export function isCountry(code) {
  return /^[A-Z]{2}$/.test(code) && !AGGREGATE_PARTNERS.includes(code) && !isConfidentialPartnerGroup(code);
}

export function countryName(code) {
  if (code === UNSPECIFIED_PARTNER) return t("unspecified");
  if (code === "LU") return t("map.luxembourg");
  const names = store.countries?.names?.[code];
  return names ? names[lang()] || names.fr : code;
}

export function countryFormsOf(code) { return countryForms(code, countryName(code)); }

export function isProductCode(code) { return /^\d{2,8}$/.test(code) && code.length % 2 === 0; }

export function withoutCodeSuffix(name) { return name.replace(/\s*(· |\()\d{4,8}\)?$/, ""); }

export function productName(code, bundle) {
  const names = store.names.get(code) || bundle?.items?.[code]?.name;
  return names ? names[lang()] || names.fr : code;
}

export async function loadProductBundle(code) {
  const bundle = await loadData(`products/${code.slice(0, 2)}.json`);
  for (const [itemCode, item] of Object.entries(bundle.items)) rememberName(itemCode, item.name);
  return bundle;
}

export function isMeasuredInLitres(code) {
  return (store.search?.litres || []).some((prefix) => code.startsWith(prefix));
}

export const NEIGHBOURS = ["BE", "DE", "FR"];

export function withoutPartners(yearData, codes) {
  const dropped = new Set(codes);
  const kept = { ...yearData, totals: { ...yearData.totals } };
  for (const flow of ["imp", "exp"]) {
    const rows = yearData[flow] || [];
    const droppedValue = rows.filter(([code]) => dropped.has(code)).reduce((sum, [, value]) => sum + (value || 0), 0);
    kept[flow] = rows.filter(([code]) => !dropped.has(code));
    if (kept.totals[flow] !== null && kept.totals[flow] !== undefined) kept.totals[flow] -= droppedValue;
  }
  return kept;
}

export function href(path, params = {}) {
  const query = params instanceof URLSearchParams ? new URLSearchParams(params)
    : new URLSearchParams(Object.entries(params).filter(([, value]) => value !== null && value !== undefined));
  query.set("lang", lang());
  return formatHash(path, query);
}
