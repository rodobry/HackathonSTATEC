const EUROSTAT_COMEXT_URL = "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409";
const CACHING_RELAY_PATH = "api/v1/eurostat";
const REQUEST_TIMEOUT_MS = 35000;
const FLOW_CODES = { imp: "1", exp: "2" };

const datasetsByQuery = new Map();
let relayIsServed = null;

async function fetchDataset(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
    const payload = await response.json();
    if (payload.class !== "dataset") throw new Error("Eurostat: réponse inattendue");
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchThroughRelayOrEurostat(query) {
  if (relayIsServed !== false) {
    try {
      const payload = await fetchDataset(`${CACHING_RELAY_PATH}?${query}`);
      relayIsServed = true;
      return payload;
    } catch (error) {
      // Static hosting has no relay. Server errors and quotas must remain visible.
      if (relayIsServed || ![404, 405].includes(error.status)) throw error;
      relayIsServed = false;
    }
  }
  return fetchDataset(`${EUROSTAT_COMEXT_URL}?${query}`);
}

export function decodeJsonStat(payload) {
  const dimensionIds = payload.id;
  const sizes = payload.size;
  const categoryPositions = dimensionIds.map((id) => payload.dimension[id].category.index);
  const strides = sizes.map((_, dimension) => sizes.slice(dimension + 1).reduce((product, size) => product * size, 1));
  const values = payload.value || {};
  return {
    categories: (id) => Object.keys(payload.dimension[id].category.index),
    get(coordinates) {
      let offset = 0;
      for (let dimension = 0; dimension < dimensionIds.length; dimension++) {
        const category = coordinates[dimensionIds[dimension]];
        const position = category === undefined ? 0 : categoryPositions[dimension][category];
        if (position === undefined) return null;
        offset += position * strides[dimension];
      }
      const value = Array.isArray(values) ? values[offset] : values[String(offset)];
      return value === undefined ? null : value;
    },
  };
}

async function requestDataset(query) {
  const key = query.toString();
  if (!datasetsByQuery.has(key)) {
    const request = fetchThroughRelayOrEurostat(key);
    request.catch(() => datasetsByQuery.delete(key));
    datasetsByQuery.set(key, request);
  }
  return decodeJsonStat(await datasetsByQuery.get(key));
}

function tradeQuery({ product, reporters, flow, frequency = "A" }) {
  const query = new URLSearchParams({ format: "JSON", lang: "EN" });
  for (const reporter of reporters) query.append("reporter", reporter);
  query.append("product", product);
  query.append("indicators", "VALUE_IN_EUROS");
  query.append("freq", frequency);
  for (const flowName of flow ? [flow] : ["imp", "exp"]) query.append("flow", FLOW_CODES[flowName]);
  return query;
}

function appendPeriod(query, { years, since }) {
  if (years) for (const year of years) query.append("time", String(year));
  else if (since) query.append("sinceTimePeriod", String(since));
}

export async function fetchLuxembourgTrade({ product, partner, flow, years, since }) {
  const query = tradeQuery({ product, reporters: ["LU"], flow });
  if (partner) query.append("partner", partner);
  appendPeriod(query, { years, since });
  const dataset = await requestDataset(query);
  return {
    partners: () => dataset.categories("partner"),
    years: () => dataset.categories("time"),
    value: (partnerCode, flowName, year) => dataset.get({ partner: partnerCode, flow: FLOW_CODES[flowName], time: String(year) }),
  };
}

export async function fetchMonthlyTrade({ product, partner, since }) {
  const query = tradeQuery({ product, reporters: ["LU"], frequency: "M" });
  query.append("partner", partner);
  query.append("sinceTimePeriod", since);
  const dataset = await requestDataset(query);
  return { value: (flowName, month) => dataset.get({ partner, flow: FLOW_CODES[flowName], time: month }) };
}

export async function fetchReportersWorldTrade({ product, reporters, years, since }) {
  const query = tradeQuery({ product, reporters });
  query.append("partner", "WORLD");
  appendPeriod(query, { years, since });
  const dataset = await requestDataset(query);
  return {
    value: (reporter, flowName, year) => dataset.get({ reporter, partner: "WORLD", flow: FLOW_CODES[flowName], time: String(year) }),
  };
}
