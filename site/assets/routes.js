// Public URLs use English; the renderers keep their existing route and filter IDs.
const ROUTES = new Map([
  ["produits", "products"], ["produit", "product"], ["pays", "countries"],
  ["comparer", "compare"], ["changements", "changes"], ["comprendre", "understand"],
  ["a-propos", "about"], ["recherche", "search"], ["integrer", "embed"],
  ["essentiel", "insight"], ["accessibilite", "accessibility"],
]);
const PARAMETERS = new Map([
  ["flux", "flow"], ["vue", "view"], ["annee", "year"], ["depuis", "from"], ["voisins", "neighbours"],
  ["produit", "product"], ["mesure", "measure"], ["pays", "countries"], ["terme", "term"],
]);
const VALUES = new Map([
  ["flux", new Map([["imp", "imports"], ["exp", "exports"]])],
  ["vue", new Map([
    ["carte", "map"], ["solde", "balance"], ["classement", "ranking"],
    ["evolution", "trend"], ["mois", "months"], ["saisonnalite", "seasonality"], ["tableau", "table"], ["produits", "products"],
  ])],
  ["mesure", new Map([["habitant", "per-capita"], ["part", "share"]])],
  ["voisins", new Map([["non", "hidden"]])],
  ["terme", new Map([
    ["flux", "flows"], ["expedition", "dispatch"], ["secret", "confidentiality"],
    ["provisoire", "provisional"], ["saisons", "seasons"], ["avant1999", "before-1999"], ["reperes", "key-events"],
  ])],
]);

const reversed = (map) => new Map([...map].map(([key, value]) => [value, key]));
const LEGACY_ROUTES = reversed(ROUTES);
LEGACY_ROUTES.set("country", "pays");
const LEGACY_PARAMETERS = reversed(PARAMETERS);
const LEGACY_VALUES = new Map([...VALUES].map(([key, values]) => [key, reversed(values)]));

function internalParts(parts) {
  const result = [...parts];
  if (result.length) result[0] = LEGACY_ROUTES.get(result[0]) ?? result[0];
  if (result[0] === "integrer" && result.length > 1) result[1] = LEGACY_ROUTES.get(result[1]) ?? result[1];
  return result;
}

function publicParts(parts) {
  const result = internalParts(parts);
  const pageIndex = result[0] === "integrer" ? 1 : 0;
  if (result[pageIndex] === "pays" && result.length > pageIndex + 1) result[pageIndex] = "country";
  else if (result[pageIndex]) result[pageIndex] = ROUTES.get(result[pageIndex]) ?? result[pageIndex];
  if (pageIndex === 1) result[0] = "embed";
  return result;
}

function internalParams(params) {
  const result = new URLSearchParams();
  for (const [key, value] of params) {
    const internalKey = LEGACY_PARAMETERS.get(key) ?? key;
    const publicKey = PARAMETERS.get(internalKey);
    // A canonical parameter takes precedence over its legacy alias.
    if (publicKey && key !== publicKey && params.has(publicKey)) continue;
    result.append(internalKey, LEGACY_VALUES.get(internalKey)?.get(value) ?? value);
  }
  return result;
}

export function parseHash(hash = location.hash) {
  const route = hash.replace(/^#\/?/, "");
  const separator = route.indexOf("?");
  const path = separator < 0 ? route : route.slice(0, separator);
  const query = separator < 0 ? "" : route.slice(separator + 1);
  const decode = (part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  };
  return {
    parts: internalParts(path.split("/").filter(Boolean).map(decode)),
    params: internalParams(new URLSearchParams(query)),
  };
}

export function formatHash(path, params = {}) {
  const parts = Array.isArray(path) ? path : path.split("/").filter(Boolean);
  const supplied = params instanceof URLSearchParams ? params
    : new URLSearchParams(Object.entries(params).filter(([, value]) => value !== null && value !== undefined));
  const query = new URLSearchParams();
  for (const [key, value] of internalParams(supplied)) {
    if (value === "") continue;
    query.append(PARAMETERS.get(key) ?? key, VALUES.get(key)?.get(value) ?? value);
  }
  const search = query.toString();
  return `#/${publicParts(parts).map(encodeURIComponent).join("/")}${search ? `?${search}` : ""}`;
}
