import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.document = { documentElement: {} };
const i18n = await import("../../site/assets/i18n.js");
const { normalize, parseQuestion, search, stem } = await import("../../site/assets/search.js");
const { balanceFill, balanceScale, niceTicks, shareClass } = await import("../../site/assets/charts.js");
const { decodeJsonStat } = await import("../../site/assets/live.js");
const { EU27, measureSeries, measureTable } = await import("../../site/assets/measures.js");
const { chapterRanking, href, isProductCode, NEIGHBOURS, partnerRanking, periodParam, periodUrlParams, store, withinPeriod, withoutPartners, yearParam } =
  await import("../../site/assets/data.js");
const combobox = await import("../../site/assets/combobox.js");
const { difference, ratio, relativeChange } = await import("../../site/assets/values.js");
const { updateParams } = await import("../../site/assets/app.js");
const { formatHash, parseHash } = await import("../../site/assets/routes.js");
const { usualPeakMonth, yearRows } = await import("../../site/assets/seasonality.js");

test("missing observations never become a balance, share or rate of change", () => {
  assert.equal(difference(30, 0), 30);
  assert.equal(difference(30, null), null);
  assert.equal(difference(undefined, 30), null);
  assert.equal(ratio(0, 100), 0);
  assert.equal(ratio(null, 100), null);
  assert.equal(ratio(100, 0), null);
  assert.equal(relativeChange(0, 100), -1);
  assert.equal(relativeChange(100, 100), 0);
  assert.equal(relativeChange(null, 100), null);
  assert.equal(relativeChange(100, null), null);
  const { values } = balanceScale([{ code: "FR", imp: null, exp: 100 }, { code: "BE", imp: 0, exp: 100 }]);
  assert.equal(values.has("FR"), false);
  assert.equal(values.get("BE").balance, 100);
});

test("malformed URL encoding does not stop the router", () => {
  const route = parseHash("#/produit/%E0%A4%A?lang=fr");
  assert.deepEqual(route.parts, ["produit", "%E0%A4%A"]);
  assert.equal(route.params.get("lang"), "fr");
  assert.equal(isProductCode(route.parts[1]), false);
  assert.deepEqual(parseHash("#/recherche?q=caf%C3%A9").parts, ["recherche"]);
  assert.equal(formatHash(route.parts, route.params), "#/product/%25E0%25A4%25A?lang=fr");
  assert.deepEqual(parseHash("#/unknown/2204").parts, ["unknown", "2204"], "unknown routes still reach the not-found page");
});

test("public paths use English in every language, including embedded charts", () => {
  const paths = [
    ["", ""], ["produits", "products"], ["produit/2204", "product/2204"],
    ["pays", "countries"], ["pays/FR", "country/FR"], ["comparer", "compare"],
    ["changements", "changes"], ["comprendre", "understand"], ["a-propos", "about"],
    ["recherche", "search"], ["accessibilite", "accessibility"], ["quiz", "quiz"], ["api", "api"],
    ["integrer/produit/2204", "embed/product/2204"], ["integrer/pays", "embed/countries"],
    ["integrer/pays/DE", "embed/country/DE"], ["integrer/comparer", "embed/compare"],
    ["integrer/essentiel/i1", "embed/insight/i1"],
  ];
  const original = i18n.lang();
  try {
    for (const language of ["fr", "en", "de"]) {
      i18n.setLang(language);
      for (const [legacy, english] of paths) {
        const url = href(legacy);
        assert.equal(url, `#/${english}?lang=${language}`);
        assert.equal(href(english), url, "English route names are accepted too");
        assert.deepEqual(parseHash(url).parts, parseHash(`#/${legacy}`).parts);
      }
    }
  } finally {
    i18n.setLang(original);
  }
});

test("English URLs and old French links restore the same filters", () => {
  const pairs = [
    ["#/produit/2204?flux=exp&vue=carte&annee=2024&voisins=non&zone=europe&lang=en",
      "#/product/2204?flow=exports&view=map&year=2024&neighbours=hidden&zone=europe&lang=en"],
    ["#/integrer/comparer?produit=2204&flux=imp&mesure=habitant&vue=evolution&annee=2023&pays=BE%2CFR&lang=de",
      "#/embed/compare?product=2204&flow=imports&measure=per-capita&view=trend&year=2023&countries=BE%2CFR&lang=de"],
    ["#/comparer?mesure=part&vue=tableau", "#/compare?measure=share&view=table"],
    ["#/pays?vue=solde", "#/countries?view=balance"],
    ["#/produit/72?vue=classement", "#/product/72?view=ranking"],
    ["#/pays/BE?vue=mois", "#/country/BE?view=months"],
    ["#/integrer/pays/BE?vue=produits", "#/embed/country/BE?view=products"],
    ...[
      ["flux", "flows"], ["expedition", "dispatch"], ["secret", "confidentiality"],
      ["provisoire", "provisional"], ["avant1999", "before-1999"], ["reperes", "key-events"],
    ].map(([legacy, english]) => [`#/comprendre?terme=${legacy}`, `#/understand?term=${english}`]),
  ];
  for (const [legacy, english] of pairs) {
    const fromLegacy = parseHash(legacy);
    const fromEnglish = parseHash(english);
    assert.deepEqual(fromLegacy.parts, fromEnglish.parts);
    assert.deepEqual([...fromLegacy.params], [...fromEnglish.params]);
    assert.equal(formatHash(fromLegacy.parts, fromLegacy.params), english);
    assert.equal(formatHash(fromEnglish.parts, fromEnglish.params), english, "canonical URLs remain stable on reload");
  }
});

test("URL normalisation preserves search text and gives canonical parameters precedence", () => {
  const text = "flux de café ? Paris / Luxembourg & été";
  const url = formatHash("recherche", { q: text, empty: "", unset: undefined });
  assert.equal(parseHash(url).params.get("q"), text);
  assert.match(url, /^#\/search\?q=/);
  assert.equal(parseHash("#/search?q=why?here").params.get("q"), "why?here");
  const mixed = parseHash("#/product/2204?flux=imp&flow=exports&vue=carte&view=table&lang=en");
  assert.equal(mixed.params.get("flux"), "exp");
  assert.equal(mixed.params.get("vue"), "tableau");
  assert.equal(formatHash(mixed.parts, mixed.params), "#/product/2204?flow=exports&view=table&lang=en");
});

test("changing filters or language keeps the URL in English and preserves other selections", () => {
  const originalLocation = globalThis.location, originalHistory = globalThis.history;
  const originalLanguage = i18n.lang();
  let replaced;
  globalThis.location = { hash: "#/produit/2204?flux=exp&vue=carte&annee=2024&voisins=non&lang=fr" };
  globalThis.history = { replaceState: (_state, _title, url) => { replaced = url; } };
  try {
    i18n.setLang("de");
    updateParams({ vue: "classement", voisins: null });
    assert.equal(replaced, "#/product/2204?flow=exports&view=ranking&year=2024&lang=de");
  } finally {
    if (originalLocation === undefined) delete globalThis.location;
    else globalThis.location = originalLocation;
    if (originalHistory === undefined) delete globalThis.history;
    else globalThis.history = originalHistory;
    i18n.setLang(originalLanguage);
  }
});

test("a fractional year cannot index an annual data series", () => {
  const original = store.meta;
  store.meta = { first_year: 1999, latest_year: 2025 };
  try {
    assert.equal(yearParam(new URLSearchParams("annee=2024.5")), 2025);
    assert.equal(yearParam(new URLSearchParams("annee=2024")), 2024);
  } finally {
    store.meta = original;
  }
});

test("a period always spans at least two years and ends at the chosen year", () => {
  const original = store.meta;
  store.meta = { first_year: 1999, latest_year: 2025 };
  try {
    assert.deepEqual(periodParam(new URLSearchParams("")), { from: 1999, until: 2025 });
    assert.deepEqual(periodParam(new URLSearchParams("depuis=2010&annee=2020")), { from: 2010, until: 2020 });
    assert.deepEqual(periodParam(new URLSearchParams("depuis=2020&annee=2010")), { from: 1999, until: 2010 }, "a start after the end is ignored");
    assert.deepEqual(periodParam(new URLSearchParams("annee=1999")), { from: 1999, until: 2000 });
    assert.deepEqual(periodUrlParams({ from: 1999, until: 2025 }), { depuis: null, annee: null });
    assert.deepEqual(periodUrlParams({ from: 2010, until: 2020 }), { depuis: 2010, annee: 2020 });
    assert.deepEqual(withinPeriod([1, 2, 3, 4], { from: 2000, until: 2001 }), [2, 3]);
    assert.match(href("", { depuis: 2010, annee: 2020 }), /from=2010&year=2020/);
  } finally {
    store.meta = original;
  }
});

test("chapter and partner rankings can be read for any year", async () => {
  const readData = async (name) => JSON.parse(await readFile(new URL(`../../site/data/${name}.json`, import.meta.url), "utf8"));
  const [meta, overview, countries] = await Promise.all([readData("meta"), readData("overview"), readData("countries")]);
  Object.assign(store, { meta, overview, countries });
  assert.deepEqual(chapterRanking("imp", meta.latest_year).slice(0, 5), overview.chapters.imp.slice(0, 5), "the latest year matches the published ranking");
  assert.deepEqual(partnerRanking("imp", meta.latest_year).slice(0, 8).map(([code]) => code), overview.partners.imp.rows.slice(0, 8).map(([code]) => code));
  const [first, second] = chapterRanking("exp", 2005);
  assert.ok(first[1] >= second[1] && first[2] !== undefined, "rows are [code, value, previous value] sorted by value");
});

test("seasonality compares each month with its year's average and finds the usual peak", () => {
  const amounts = { "2023": [1, 1, 1, 1, 1, 1, 9, 1, 1, 1, 2, 1], "2024": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1], "2025": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1] };
  const monthly = { value: (flow, period) => (flow === "imp" ? amounts[period.slice(0, 4)]?.[Number(period.slice(5)) - 1] ?? null : null) };
  const rows = yearRows(monthly, "imp", { from: 2023, until: 2026 });
  assert.equal(rows.length, 4);
  assert.equal(rows[1].ratios[10], 2 / (13 / 12), "November against the 2024 monthly average");
  assert.ok(rows[3].ratios.every((ratio) => ratio === null), "an incomplete year has no ratios");
  assert.equal(usualPeakMonth(rows), "11", "one exceptional July does not make July the usual peak");
  assert.equal(usualPeakMonth(rows.slice(3)), null);
});

test("a relay quota error is not retried directly against Eurostat", async (context) => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return new Response("{}", { status: 429 });
  });
  const live = await import("../../site/assets/live.js?quota-test");
  await assert.rejects(live.fetchLuxembourgTrade({ product: "22", flow: "imp", years: [2025] }), /HTTP 429/);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^api\/v1\/eurostat/);
});

test("static hosting still falls back to the public Eurostat API", async (context) => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    if (calls.length === 1) return new Response("", { status: 404 });
    return Response.json({ class: "dataset", id: ["time"], size: [1], dimension: { time: { category: { index: { "2025": 0 } } } }, value: { "0": 0 } });
  });
  const live = await import("../../site/assets/live.js?static-test");
  const trade = await live.fetchLuxembourgTrade({ product: "22", flow: "imp", years: [2025] });
  assert.equal(trade.value("WORLD", "imp", 2025), 0);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^https:\/\/ec\.europa\.eu\//);
});

test("clipboard failure is reported instead of claiming a successful copy", async () => {
  const { copyText } = await import("../../site/assets/ui.js");
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let removed = false;
  globalThis.document = {
    body: { appendChild() {} },
    createElement: () => ({ select() {}, remove() { removed = true; } }),
    execCommand: () => false,
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async () => { throw new Error("denied"); } } } });
  try {
    assert.equal(await copyText("https://example.test"), false);
    assert.equal(removed, true);
  } finally {
    globalThis.document = originalDocument;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});

test("cancelling native sharing does not copy a link or show a success toast", async () => {
  const { shareOrCopyLink } = await import("../../site/assets/ui.js");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { share: async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); } } });
  try {
    await shareOrCopyLink({ url: "https://example.test" }, "https://example.test");
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});

test("French country articles and prepositions", () => {
  i18n.setLang("fr");
  assert.equal(i18n.countryForms("FR", "France").definite, "la France");
  assert.equal(i18n.countryForms("JP", "Japon").from, "du Japon");
  assert.equal(i18n.countryForms("NL", "Pays-Bas").to, "aux Pays-Bas");
  assert.equal(i18n.countryForms("DE", "Allemagne").definite, "l’Allemagne");
  assert.equal(i18n.countryForms("MT", "Malte").from, "de Malte");
  assert.equal(i18n.countryForms("IL", "Israël").from, "d’Israël");
});

test("German and English prepositions", () => {
  i18n.setLang("de");
  assert.equal(i18n.countryForms("CH", "Schweiz").from, "aus der Schweiz");
  assert.equal(i18n.countryForms("FR", "Frankreich").to, "nach Frankreich");
  assert.equal(i18n.countryForms("NL", "Niederlande").from, "aus den Niederlanden");
  i18n.setLang("en");
  assert.equal(i18n.countryForms("US", "United States").definite, "the United States");
  assert.equal(i18n.countryForms("FR", "France").from, "from France");
});

test("readable amounts", () => {
  i18n.setLang("fr");
  assert.equal(i18n.money(25097944481), "25,1 Md€");
  assert.equal(i18n.moneyLong(170_000_000), "170 millions d’euros");
  assert.equal(i18n.productOf("Acier"), "d’acier");
  assert.equal(i18n.productOf("Vin"), "de vin");
  i18n.setLang("en");
  assert.equal(i18n.money(170_000_000), "€170m");
  i18n.setLang("de");
  assert.equal(i18n.productOf("Wein"), "Wein");
  assert.equal(i18n.rankWord(2), "zweitwichtigster");
});

test("search normalisation and plurals", () => {
  assert.equal(normalize("D’où vient le Café ?"), "ou vient le cafe");
  assert.equal(normalize("lingot d'or, l'Inde, aujourd'hui"), "lingot or inde aujourd'hui");
  assert.equal(stem("pneus"), "pneu");
  assert.equal(stem("vin"), "vin");
});

test("exact products precede country prefixes; exact countries retain priority", async () => {
  const readData = async (name) => JSON.parse(await readFile(new URL(`../../site/data/${name}.json`, import.meta.url), "utf8"));
  const [meta, countries, searchData] = await Promise.all([readData("meta"), readData("countries"), readData("search")]);
  Object.assign(store, { meta, countries, search: searchData });
  const wine = search("vin");
  assert.equal(wine.products[0], "2204");
  assert.equal(wine.productsFirst, true, "wine is a closer match than Saint Vincent and the Grenadines");
  const france = search("France");
  assert.equal(france.countries[0], "FR");
  assert.equal(france.productsFirst, false);
});

test("questions read French elisions and keep French words that are English stop words", () => {
  const read = (text) => { const { product, country, year, flow } = parseQuestion(text); return { product, country, year, flow }; };
  assert.deepEqual(read("Combien de thé vient d'Inde en 2024 ?"), { product: "0902", country: "IN", year: 2024, flow: "imp" });
  assert.deepEqual(read("combien de vin vient d'Italie ?"), { product: "2204", country: "IT", year: null, flow: "imp" });
  assert.equal(read("combien d'or vient de Suisse ?").product, "7108");
  assert.equal(read("how much of the wine comes from France?").product, "2204");
  assert.equal(read("how much tea comes from India?").product, "0902");
  assert.equal(read("Wie viel Wein kommt aus Frankreich?").product, "2204");
});

test("a synonym inside a longer word only matches a single-word search", () => {
  assert.equal(search("combien de thé vient de Chine").products.includes("96"), false, "comb is not inside combien");
  assert.ok(search("rotwein").products.includes("2204"), "German compounds still find their base word");
});

test("axis ticks and map classes", () => {
  assert.deepEqual(niceTicks(0, 23, 5).ticks, [0, 5, 10, 15, 20, 25]);
  assert.equal(shareClass(0.005), 1);
  assert.equal(shareClass(0.2), 5);
  assert.equal(shareClass(null), 0);
});

test("JSON-stat decoding", () => {
  const payload = {
    id: ["partner", "flow", "time"], size: [2, 2, 2],
    dimension: {
      partner: { category: { index: { FR: 0, DE: 1 } } },
      flow: { category: { index: { 1: 0, 2: 1 } } },
      time: { category: { index: { 2024: 0, 2025: 1 } } },
    },
    value: { 0: 10, 3: 40, 7: 80 },
  };
  const data = decodeJsonStat(payload);
  assert.equal(data.get({ partner: "FR", flow: "1", time: "2024" }), 10);
  assert.equal(data.get({ partner: "FR", flow: "2", time: "2025" }), 40);
  assert.equal(data.get({ partner: "DE", flow: "2", time: "2025" }), 80);
  assert.equal(data.get({ partner: "DE", flow: "1", time: "2024" }), null);
  assert.equal(data.get({ partner: "IT", flow: "1", time: "2024" }), null);
});

test("French country gender", () => {
  i18n.setLang("fr");
  assert.equal(i18n.countryForms("CN", "Chine").comingFrom, "depuis la Chine");
  assert.equal(i18n.countryForms("NO", "Norvège").definite, "la Norvège");
  assert.equal(i18n.countryForms("KR", "Corée du Sud").definite, "la Corée du Sud");
  assert.equal(i18n.countryForms("QA", "Qatar").definite, "le Qatar");
  assert.equal(i18n.countryForms("MX", "Mexique").definite, "le Mexique");
  assert.equal(i18n.countryForms("CA", "Canada").from, "du Canada");
});

test("quantities in words", () => {
  i18n.setLang("fr");
  assert.equal(i18n.mass(46_466_671, true), "≈\u00a046,5\u00a0millions de litres");
  assert.equal(i18n.mass(16_900_000), "16\u202f900 tonnes");
  i18n.setLang("en");
  assert.equal(i18n.mass(46_466_671, true), "≈ 46.5\u00a0million litres");
});

test("balance direction, even band and order-of-magnitude classes", () => {
  const { values, breaks } = balanceScale([
    { code: "FR", imp: 105_000_000, exp: 2_000_000 },
    { code: "BE", imp: 30_000_000, exp: 31_000_000 },
    { code: "FI", imp: 0, exp: 4_000_000 },
    { code: "JP", imp: 0, exp: 50_000 },
    { code: "XX", imp: 0, exp: 0 },
  ]);
  assert.deepEqual(breaks, [1_000_000, 10_000_000]);
  assert.equal(values.get("FR").balanceClass, -3);
  assert.equal(values.get("BE").balanceClass, 0, "a 1 M€ gap on 61 M€ of trade counts as even");
  assert.equal(values.get("FI").balanceClass, 2);
  assert.equal(values.get("JP").balanceClass, 1);
  assert.equal(values.has("XX"), false, "no trade means no colour");
  assert.equal(balanceFill(-3), "var(--imp-4)");
  assert.equal(balanceFill(0), "var(--even)");
  assert.equal(balanceFill(1), "var(--exp-2)");
});

test("comparison per inhabitant, share of total and weighted EU average", () => {
  const amounts = { LU: 300, BE: 1000 }, totals = { LU: 3000, BE: 50000 };
  const population = { first_year: 2024, values: Object.fromEntries(EU27.map((c) => [c, [null, c === "LU" ? 10 : c === "BE" ? 100 : null]])) };
  const value = (code, flow, year) => (year === 2025 ? amounts[code] ?? null : null);
  const total = (code, flow, year) => (year === 2025 ? totals[code] ?? null : null);
  const head = measureTable({ value, total, population, flow: "imp", year: 2025, measure: "habitant" });
  assert.equal(head.rows.find((r) => r.code === "LU").perHead, 30);
  assert.equal(head.ranked[0].code, "LU");
  assert.equal(head.eu.metric, 1300 / 110);
  const part = measureTable({ value, total, population, flow: "imp", year: 2025, measure: "part" });
  assert.equal(part.rows.find((r) => r.code === "LU").share, 0.1);
  assert.equal(part.eu.metric, 1300 / 53000);
  assert.equal(part.count, 2, "countries without a figure are not ranked");
  assert.deepEqual(measureSeries({ value, total, population, flow: "imp", measure: "euros" }, [2024, 2025], "LU"), [null, 300]);
});

test("axis percentages without trailing zeros", () => {
  i18n.setLang("en");
  assert.equal(i18n.percentAxis(0.0025), "0.25%");
  assert.equal(i18n.percentAxis(0.005), "0.5%");
  assert.equal(i18n.percentAxis(0.01), "1%");
});

test("without neighbouring countries: rows removed, totals recomputed", () => {
  const data = { year: 2025, imp: [["FR", 60, 50], ["BE", 20, 18], ["IT", 15, 9], ["ZZ", 5, 4]], exp: [["DE", 30, 25], ["US", 10, 8]], totals: { imp: 100, exp: 40 } };
  const rest = withoutPartners(data, NEIGHBOURS);
  assert.deepEqual(rest.imp.map((r) => r[0]), ["IT", "ZZ"]);
  assert.equal(rest.totals.imp, 20);
  assert.equal(rest.totals.exp, 10);
  assert.equal(data.totals.imp, 100, "the original data stay untouched");
});

class FakeElement extends EventTarget {
  constructor(id = "") {
    super();
    this.id = id;
    this.attributes = new Map();
    this.scrolls = [];
    this.isLink = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  scrollIntoView(options) { this.scrolls.push(options); }
  closest(selector) { return selector === "a" && this.isLink ? this : null; }
}

function fakeOption(id) {
  const option = new FakeElement(id);
  option.isLink = true;
  option.setAttribute("href", `#/produit/${id}`);
  option.setAttribute("aria-selected", "false");
  return option;
}

class FakeList extends FakeElement {
  constructor() {
    super("list");
    this.hidden = true;
    this.html = "";
    this.options = [];
  }
  get innerHTML() { return this.html; }
  set innerHTML(html) {
    this.html = html;
    this.options = [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => fakeOption(id));
  }
  querySelectorAll() { return this.options; }
}

const optionsHtml = (count, prefix = "opt") => Array.from({ length: count }, (_, index) => `<a role="option" id="${prefix}-${index}"></a>`).join("");
const keydown = (key) => Object.assign(new Event("keydown", { cancelable: true }), { key });
const focusout = (relatedTarget) => Object.assign(new Event("focusout"), { relatedTarget });
const eventOn = (type, target) => Object.defineProperty(new Event(type, { cancelable: true }), "target", { value: target });
const selectedFlags = (list) => list.options.map((option) => option.getAttribute("aria-selected"));

function fakeCombobox({ html = optionsHtml(3), suggestionsStayClosed = false } = {}) {
  const input = new FakeElement("input"), list = new FakeList(), form = new FakeElement("form");
  const outside = new FakeElement("outside");
  const counts = { suggestions: 0, closes: 0 };
  form.contains = (node) => node === input || node === list || list.options.includes(node);
  const showSuggestions = () => {
    counts.suggestions++;
    if (suggestionsStayClosed) widget.close();
    else widget.showOptions(html);
  };
  const widget = combobox.bindCombobox({ form, input, list, showSuggestions, onClose: () => { counts.closes++; } });
  const press = (key, times = 1) => {
    let event;
    for (let count = 0; count < times; count++) input.dispatchEvent(event = keydown(key));
    return event;
  };
  return { input, list, form, outside, widget, counts, press };
}

test("combobox: the next active option stops at both ends without wrapping", () => {
  const { nextActiveIndex, NO_ACTIVE_OPTION } = combobox;
  assert.equal(NO_ACTIVE_OPTION, -1);
  assert.equal(nextActiveIndex(NO_ACTIVE_OPTION, 1, 3), 0);
  assert.equal(nextActiveIndex(0, 1, 3), 1);
  assert.equal(nextActiveIndex(2, 1, 3), 2, "ArrowDown on the last option stays there");
  assert.equal(nextActiveIndex(1, 25, 3), 2);
  assert.equal(nextActiveIndex(0, -1, 3), NO_ACTIVE_OPTION, "ArrowUp on the first option returns to the input");
  assert.equal(nextActiveIndex(NO_ACTIVE_OPTION, -1, 3), NO_ACTIVE_OPTION);
  assert.equal(nextActiveIndex(2, -30, 3), NO_ACTIVE_OPTION);
  assert.equal(nextActiveIndex(NO_ACTIVE_OPTION, 1, 0), NO_ACTIVE_OPTION, "an empty list has no active option");
});

test("combobox: only ArrowDown and ArrowUp move the active option", () => {
  assert.equal(combobox.arrowStep("ArrowDown"), 1);
  assert.equal(combobox.arrowStep("ArrowUp"), -1);
  for (const key of ["Home", "End", "Enter", "Escape", "Tab", "PageDown", "a"]) assert.equal(combobox.arrowStep(key), 0, key);
});

test("combobox: a query needs two characters besides surrounding spaces", () => {
  assert.equal(combobox.MINIMUM_QUERY_LENGTH, 2);
  assert.equal(combobox.isSearchable(""), false);
  assert.equal(combobox.isSearchable("v"), false);
  assert.equal(combobox.isSearchable("  v  "), false);
  assert.equal(combobox.isSearchable("vi"), true);
  assert.equal(combobox.isSearchable(" café "), true);
});

test("combobox: marking the active option sets aria-selected, aria-activedescendant and scrolls it into view", () => {
  const input = new FakeElement("input");
  const options = ["a", "b", "c"].map(fakeOption);
  combobox.markActiveOption(input, options, 1);
  assert.deepEqual(options.map((option) => option.getAttribute("aria-selected")), ["false", "true", "false"]);
  assert.equal(input.getAttribute("aria-activedescendant"), "b");
  assert.deepEqual(options.map((option) => option.scrolls), [[], [{ block: "nearest" }], []]);
  combobox.markActiveOption(input, options, combobox.NO_ACTIVE_OPTION);
  assert.deepEqual(options.map((option) => option.getAttribute("aria-selected")), ["false", "false", "false"]);
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.equal(options[1].scrolls.length, 1, "clearing does not scroll");
});

test("combobox: ArrowDown on a closed list shows suggestions and activates the first option", () => {
  const { input, list, counts, press } = fakeCombobox();
  const event = press("ArrowDown");
  assert.equal(event.defaultPrevented, true);
  assert.equal(counts.suggestions, 1);
  assert.equal(list.hidden, false);
  assert.equal(input.getAttribute("aria-expanded"), "true");
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-0");
  assert.deepEqual(selectedFlags(list), ["true", "false", "false"]);
});

test("combobox: arrows stop at both ends and ArrowUp from the first option clears the active descendant", () => {
  const { input, list, widget, counts, press } = fakeCombobox();
  press("ArrowDown", 5);
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-2");
  assert.equal(counts.suggestions, 1, "an open, current list is not searched again");
  assert.equal(widget.activeOption().id, "opt-2");
  const event = press("ArrowUp", 3);
  assert.equal(event.defaultPrevented, true);
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.deepEqual(selectedFlags(list), ["false", "false", "false"]);
  assert.equal(widget.activeOption(), undefined);
  press("ArrowUp");
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.equal(list.hidden, false, "ArrowUp never closes the list");
  press("ArrowDown");
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-0");
});

test("combobox: ArrowUp on a closed list does not open it", () => {
  const { input, list, counts, press } = fakeCombobox();
  const event = press("ArrowUp");
  assert.equal(event.defaultPrevented, true);
  assert.equal(counts.suggestions, 0);
  assert.equal(list.hidden, true);
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
});

test("combobox: Escape closes the list and clears the active option without blocking the browser", () => {
  const { input, list, counts, press } = fakeCombobox();
  press("ArrowDown", 2);
  const event = press("Escape");
  assert.equal(event.defaultPrevented, false, "the browser may still clear a search field");
  assert.equal(list.hidden, true);
  assert.equal(input.getAttribute("aria-expanded"), "false");
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.deepEqual(selectedFlags(list), ["false", "false", "false"], "no stale highlight survives in the hidden list");
  assert.equal(counts.closes, 1);
});

test("combobox: Home, End, Enter and Tab keep their native behaviour", () => {
  const { input, list, press } = fakeCombobox();
  press("ArrowDown");
  for (const key of ["Home", "End", "Enter", "Tab"]) assert.equal(press(key).defaultPrevented, false, key);
  assert.equal(list.hidden, false);
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-0");
});

test("combobox: ArrowDown never activates an option of a list that stays closed", () => {
  const { input, list, counts, press } = fakeCombobox({ suggestionsStayClosed: true });
  list.innerHTML = optionsHtml(3, "stale");
  press("ArrowDown");
  assert.equal(counts.suggestions, 1);
  assert.equal(list.hidden, true);
  assert.equal(input.getAttribute("aria-expanded"), "false");
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.deepEqual(selectedFlags(list), ["false", "false", "false"]);
});

test("combobox: a scheduled search runs once after its delay and closing cancels it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { list, widget, counts } = fakeCombobox();
  widget.scheduleSuggestions(140);
  widget.scheduleSuggestions(140);
  t.mock.timers.tick(139);
  assert.equal(counts.suggestions, 0);
  t.mock.timers.tick(1);
  assert.equal(counts.suggestions, 1, "rescheduling replaces the previous search");
  widget.scheduleSuggestions(120);
  widget.close();
  t.mock.timers.tick(1000);
  assert.equal(counts.suggestions, 1, "a closed list does not reopen later");
  assert.equal(list.hidden, true);
  widget.scheduleSuggestions(120);
  widget.cancelScheduledSuggestions();
  t.mock.timers.tick(1000);
  assert.equal(counts.suggestions, 1);
});

test("combobox: ArrowDown during the search delay searches at once and keeps the highlight", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { input, widget, counts, press } = fakeCombobox();
  press("ArrowDown");
  widget.clearActiveOption();
  widget.scheduleSuggestions(120);
  press("ArrowDown");
  assert.equal(counts.suggestions, 2, "the visible list was out of date, so the search ran at once");
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-0");
  t.mock.timers.tick(1000);
  assert.equal(counts.suggestions, 2, "the delayed search was cancelled");
  assert.equal(input.getAttribute("aria-activedescendant"), "opt-0");
});

test("combobox: new options or typing clear the active option", () => {
  const { input, list, widget, press } = fakeCombobox();
  press("ArrowDown", 2);
  widget.showOptions(optionsHtml(2, "next"));
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.equal(widget.activeOption(), undefined);
  assert.equal(widget.firstOption().id, "next-0");
  assert.equal(list.hidden, false);
  press("ArrowDown");
  widget.clearActiveOption();
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.deepEqual(selectedFlags(list), ["false", "false"]);
});

test("combobox: following an option opens its link and closes the list", () => {
  const { list, widget, counts, press } = fakeCombobox();
  globalThis.location = { hash: "" };
  try {
    press("ArrowDown", 2);
    widget.followOption(widget.activeOption());
    assert.equal(location.hash, "#/produit/opt-1");
    assert.equal(list.hidden, true);
    assert.equal(counts.closes, 1);
  } finally {
    delete globalThis.location;
  }
});

test("combobox: pressing an option keeps the focus in the input and clicking it closes the list", () => {
  const { list, press } = fakeCombobox();
  press("ArrowDown");
  const option = list.options[1];
  const pressOption = eventOn("mousedown", option);
  list.dispatchEvent(pressOption);
  assert.equal(pressOption.defaultPrevented, true);
  const pressBackground = eventOn("mousedown", list);
  list.dispatchEvent(pressBackground);
  assert.equal(pressBackground.defaultPrevented, false, "the list background and scrollbar keep their behaviour");
  list.dispatchEvent(eventOn("click", list));
  assert.equal(list.hidden, false, "a click beside the options keeps the list open");
  const clickOption = eventOn("click", option);
  list.dispatchEvent(clickOption);
  assert.equal(list.hidden, true);
  assert.equal(clickOption.defaultPrevented, false, "the option link still navigates");
});

test("combobox: the list closes when the focus leaves the form, not when it moves inside", () => {
  const { form, list, outside, press } = fakeCombobox();
  press("ArrowDown");
  form.dispatchEvent(focusout(list.options[0]));
  assert.equal(list.hidden, false);
  form.dispatchEvent(focusout(outside));
  assert.equal(list.hidden, true);
  press("ArrowDown");
  form.dispatchEvent(focusout(null));
  assert.equal(list.hidden, true, "leaving the window or clicking a blank area closes it too");
});

test("key events: hidden by default, shown on relevant charts when enabled", async () => {
  const { areMilestonesShown, chartMilestones, milestoneChronology, milestoneNotes, toggleMilestones } = await import("../../site/assets/milestones.js");
  i18n.setLang("fr");
  const firstYears = (page) => chartMilestones(page).map((milestone) => milestone.first);
  assert.equal(areMilestonesShown(), false);
  for (const page of [{}, { product: "2710" }, { country: "US" }]) {
    assert.deepEqual(chartMilestones(page), [], "chart markers stay hidden until enabled");
    assert.equal(milestoneNotes(page), "", "chart notes stay hidden until enabled");
  }
  assert.match(milestoneChronology(), /Crise financière/, "the learning timeline remains available");
  toggleMilestones();
  try {
    assert.equal(areMilestonesShown(), true);
    assert.deepEqual(firstYears({}), ["2008", "2020", "2022"]);
    assert.deepEqual(firstYears({ product: "2710" }), ["2008", "2014", "2020", "2022"]);
    assert.deepEqual(firstYears({ product: "7216" }), ["2008", "2020", "2022", "2025"]);
    assert.deepEqual(firstYears({ country: "US" }), ["2008", "2020", "2022", "2025"]);
    assert.equal(chartMilestones({})[0].label, "Crise financière");
    assert.match(milestoneNotes({}), /Crise financière/);
  } finally {
    toggleMilestones();
  }
  assert.equal(areMilestonesShown(), false);
  assert.deepEqual(chartMilestones({ country: "US" }), [], "key events can be hidden again");
  assert.equal(milestoneNotes({ country: "US" }), "");
});

test("contributions: the largest changes, then everything else up to the total change", async () => {
  const { yearOnYearContributions } = await import("../../site/assets/contributions.js");
  const items = [
    { label: "A", before: 100, after: 160 },
    { label: "B", before: 50, after: 20 },
    { label: "C", before: 10, after: 12 },
    { label: "D", before: null, after: 40 },
  ];
  const { totalChange, shown, rest } = yearOnYearContributions(items, 200, 270, 2);
  assert.equal(totalChange, 70);
  assert.deepEqual(shown.map((item) => [item.label, item.change]), [["A", 60], ["B", -30]]);
  assert.equal(rest, 40, "a missing year is left in the rest instead of counting as zero");
  assert.equal(yearOnYearContributions(items, null, 270), null);
});
