export const EU27 = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
export const MEASURES = ["habitant", "part", "euros"];

const METRIC_KEYS = { habitant: "perHead", part: "share", euros: "value" };

function metricOf(row, measure) { return row[METRIC_KEYS[measure] ?? "value"]; }

function countryRow(code, { value, total, population, flow, year }) {
  const amount = value(code, flow, year);
  const inhabitants = population.values[code]?.[year - population.first_year] ?? null;
  const allGoods = total ? total(code, flow, year) : null;
  const knownAmount = Number.isFinite(amount);
  return {
    code,
    value: knownAmount ? amount : null,
    population: inhabitants,
    total: Number.isFinite(allGoods) ? allGoods : null,
    perHead: knownAmount && inhabitants ? amount / inhabitants : null,
    share: knownAmount && Number.isFinite(allGoods) && allGoods > 0 ? amount / allGoods : null,
  };
}

function sum(rows, key) { return rows.reduce((total, row) => total + row[key], 0); }

function ratioOfSums(rows, numeratorKey, denominatorKey) {
  return rows.length ? sum(rows, numeratorKey) / sum(rows, denominatorKey) : null;
}

function average(rows, key) {
  return rows.length ? sum(rows, key) / rows.length : null;
}

function euReference(rows, measure) {
  const withKnown = (key) => rows.filter((row) => row[key] !== null);
  const eu = {
    code: "EU",
    perHead: ratioOfSums(withKnown("perHead"), "value", "population"),
    share: ratioOfSums(withKnown("share"), "value", "total"),
    value: average(withKnown("value"), "value"),
  };
  eu.metric = metricOf(eu, measure);
  return eu;
}

export function measureTable(options) {
  const rows = EU27.map((code) => countryRow(code, options));
  for (const row of rows) row.metric = metricOf(row, options.measure);
  const ranked = rows.filter((row) => row.metric !== null).sort((a, b) => b.metric - a.metric);
  ranked.forEach((row, index) => { row.rank = index + 1; });
  return { rows, ranked, eu: euReference(rows, options.measure), count: ranked.length };
}

export function measureSeries(options, years, code) {
  return years.map((year) => {
    const table = measureTable({ ...options, year });
    return code === "EU" ? table.eu.metric : table.rows.find((row) => row.code === code)?.metric ?? null;
  });
}
