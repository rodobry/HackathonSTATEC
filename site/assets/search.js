import { countryFormsOf, href, latestYear, loadData, loadProductBundle, productName, store, UNSPECIFIED_PARTNER, yearIndex } from "./data.js";
import { capitalize, escapeHtml, lang, LANGS, moneyLong, percent, productOf, t } from "./i18n.js";
import { fetchLuxembourgTrade } from "./live.js";

const COMBINING_ACCENTS = /[\u0300-\u036f]/g;

export function foldAccents(text) {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_ACCENTS, "");
}

const ELIDED_ARTICLE = /\b(?:qu|[cdjlmnst])'/g;

export function normalize(text) {
  return foldAccents(String(text || "")).replace(/[’`]/g, "'").replace(/[^a-z0-9ßæœ' ]+/g, " ")
    .replace(ELIDED_ARTICLE, "").replace(/\s+/g, " ").trim();
}

const DEMONYMS = {
  FR: ["francais", "francaise", "french", "franzosisch", "frankreich"], DE: ["allemand", "allemande", "german", "deutsch", "deutschland"],
  BE: ["belge", "belgian", "belgisch"], IT: ["italien", "italienne", "italian", "italienisch"], NL: ["neerlandais", "hollande", "dutch", "holland", "niederlandisch"],
  CN: ["chinois", "chinoise", "chinese", "chinesisch", "chine"], JP: ["japonais", "japanese", "japanisch"], US: ["americain", "americaine", "usa", "amerique", "american", "amerika", "etats unis"],
  GB: ["britannique", "anglais", "angleterre", "uk", "british", "england", "britisch", "grossbritannien"], ES: ["espagnol", "spanish", "spanisch"],
  PT: ["portugais", "portuguese", "portugiesisch"], CH: ["suisse", "swiss", "schweizer"], PL: ["polonais", "polish", "polnisch"],
  IE: ["irlandais", "irish", "irisch"], AT: ["autrichien", "austrian", "osterreichisch"], TR: ["turc", "turkish", "turkei"],
  RU: ["russe", "russian", "russisch"], IN: ["indien", "indian", "indisch"], BR: ["bresilien", "brazilian", "brasilianisch"],
};
const LUXEMBOURG_WORDS = new Set(["luxembourg", "lux", "luxembourgeois", "luxembourgs", "luxemburg", "luxemburger"]);
const STOP_WORDS = {
  fr: new Set(("le la les l de des du d un une au aux a en et ou est sont il elle on que qui quoi quel quelle quels quelles " +
    "combien comment pourquoi par pour sur dans avec plus moins tres annee pays produit marchandises").split(" ")),
  en: new Set(("the of to from in and or is are what which who how much many does do did by for with " +
    "year country product goods").split(" ")),
  de: new Set(("der die das den dem des ein eine und oder ist sind was wer wie viel viele wieviel aus nach von im in mit fur " +
    "jahr land ware waren").split(" ")),
};
const IMPORT_WORDS = new Set(["achat", "achats", "achete", "achetent", "acheter", "achetes", "importe", "importes", "importation", "importations", "import", "imports", "imported",
  "vient", "viennent", "venir", "provient", "proviennent", "provenance", "origine", "fournisseur", "fournisseurs", "fournit", "ou",
  "buy", "buys", "bought", "purchase", "purchases", "come", "comes", "supplier", "suppliers", "where",
  "kauft", "kaufen", "gekauft", "einkauf", "einkaufe", "einfuhr", "einfuhren", "importiert", "kommt", "kommen", "woher", "lieferant", "lieferanten"]);
const EXPORT_WORDS = new Set(["vend", "vendent", "vendu", "vendus", "vendre", "vente", "ventes", "exporte", "exportes", "exportation", "exportations", "export", "exports", "exported",
  "va", "vont", "destination", "destinations", "client", "clients", "vers",
  "sell", "sells", "sold", "sale", "sales", "go", "goes", "customer", "customers",
  "verkauft", "verkaufen", "verkauf", "verkaufe", "ausfuhr", "ausfuhren", "exportiert", "geht", "gehen", "wohin", "abnehmer", "nach"]);
const QUESTION_WORDS = new Set(["combien", "ou", "qui", "quel", "quelle", "quels", "quelles", "que", "how", "where", "which", "who", "what",
  "wie", "woher", "wohin", "welche", "welcher", "welches", "wer", "was", "wieviel"]);

function isStopWord(token, language) {
  return LUXEMBOURG_WORDS.has(token) || STOP_WORDS[language].has(token);
}

function isStopWordInAnyLanguage(token) {
  return LANGS.some((language) => isStopWord(token, language));
}

function questionLanguage(tokens) {
  const stopWordCount = (language) => tokens.filter((token) => STOP_WORDS[language].has(token)).length;
  return LANGS.reduce((best, language) => (stopWordCount(language) > stopWordCount(best) ? language : best), lang());
}

const isPresent = (value) => value !== null && value !== undefined;

export function stem(token) {
  return token.length > 4 && /[sx]$/.test(token) ? token.slice(0, -1) : token;
}

function latestYearTrade(country) {
  if (!country) return 0;
  const index = yearIndex(latestYear());
  return (country.series.imp?.[index] || 0) + (country.series.exp?.[index] || 0);
}

function buildSearchIndex() {
  const synonyms = new Map();
  for (const [word, code] of store.search.synonyms) {
    const key = normalize(word);
    if (!synonyms.has(key)) synonyms.set(key, new Set());
    synonyms.get(key).add(code);
  }
  const products = store.search.products.map((row) => ({
    code: row.code,
    value: (row.imp || 0) + (row.exp || 0),
    nameTokens: Object.values(row.name).map((name) => normalize(name).split(" ")),
  }));
  const countries = Object.entries(store.countries.names).map(([code, names]) => {
    const keys = new Set(Object.values(names).map(normalize));
    for (const demonym of DEMONYMS[code] || []) keys.add(demonym);
    return { code, keys: [...keys], value: latestYearTrade(store.countries.countries[code]) };
  });
  return { synonyms, products, countries };
}

let searchIndex = null;

function getSearchIndex() {
  searchIndex ??= buildSearchIndex();
  return searchIndex;
}

const MAX_PRODUCT_RESULTS = 8;
const MAX_COUNTRY_RESULTS = 4;
const MAX_DETAILED_RESULTS = 12;

function synonymScore(word, text) {
  if (word === text) return 150;
  if (text.length >= 3 && word.startsWith(text)) return 110 - (word.length - text.length);
  if (word.length >= 4 && containsSynonym(text, word)) return 90;
  return 0;
}

function containsSynonym(text, word) {
  const isSingleWord = !text.includes(" ");
  return isSingleWord ? text.includes(word) : ` ${text} `.includes(` ${word} `);
}

function levelBonus(code) {
  if (code.length === 4) return 6;
  return code.length === 2 ? 4 : 0;
}

function matchingProducts(text) {
  const { synonyms, products } = getSearchIndex();
  const scores = new Map();
  const raiseScore = (code, score) => { if ((scores.get(code) || 0) < score) scores.set(code, score); };
  const digits = text.replace(/ /g, "");
  if (/^\d{2,8}$/.test(digits)) {
    for (const product of products) if (product.code.startsWith(digits)) raiseScore(product.code, product.code === digits ? 200 : 120 - product.code.length);
  }
  for (const [word, codes] of synonyms) {
    const score = synonymScore(word, text);
    if (score) for (const code of codes) raiseScore(code, score);
  }
  const tokens = text.split(" ").filter((token) => token.length >= 2 && !isStopWordInAnyLanguage(token)).map(stem);
  if (tokens.length) {
    for (const product of products) {
      const nameMatches = product.nameTokens.some((words) => tokens.every((token) => words.some((word) => word.startsWith(token))));
      if (nameMatches) raiseScore(product.code, 40 + levelBonus(product.code) + Math.log10(product.value + 10) * 2);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PRODUCT_RESULTS).map(([code, score]) => ({ code, score }));
}

function countryScore(keys, text) {
  let best = 0;
  for (const key of keys) {
    if (key === text) best = Math.max(best, 200);
    else if (text.length >= 2 && key.startsWith(text)) best = Math.max(best, 100);
    else if (text.length >= 3 && key.split(" ").some((part) => part.startsWith(text))) best = Math.max(best, 80);
  }
  return best;
}

function matchingCountries(text) {
  return getSearchIndex().countries.flatMap((country) => {
    const score = countryScore(country.keys, text);
    return score ? [{ code: country.code, score: score + Math.log10(country.value + 10) }] : [];
  }).sort((a, b) => b.score - a.score).slice(0, MAX_COUNTRY_RESULTS);
}

export function search(query) {
  const text = normalize(query);
  if (!text) return { countries: [], products: [] };
  const countries = matchingCountries(text), products = matchingProducts(text);
  return {
    countries: countries.map(({ code }) => code),
    products: products.map(({ code }) => code),
    productsFirst: (products[0]?.score ?? -1) > (countries[0]?.score ?? -1),
  };
}

function containsAll(text, tokens) { return tokens.every((token) => text.includes(token)); }

export async function searchDetailed(query) {
  const catalog = await loadData(`catalog-${lang()}.json`);
  const text = normalize(query);
  const isCode = /^\d{6,8}$/.test(text);
  const tokens = text.split(" ").filter((token) => token.length >= 3 && !isStopWord(token, lang()));
  if (!tokens.length && !isCode) return [];
  const matches = [];
  for (const [code, label] of Object.entries(catalog)) {
    const matched = isCode ? code.startsWith(text) : containsAll(normalize(label), tokens);
    if (!matched) continue;
    matches.push({ code, label });
    if (matches.length >= MAX_DETAILED_RESULTS) break;
  }
  return matches;
}

function findCountry(tokens) {
  const text = ` ${tokens.join(" ")} `;
  let best = null;
  for (const country of getSearchIndex().countries) {
    if (country.code === "LU") continue;
    for (const key of country.keys) {
      if (key.length >= 3 && text.includes(` ${key} `) && (!best || key.length > best.key.length)) best = { code: country.code, key };
    }
  }
  return best;
}

function isTradeWord(token) { return IMPORT_WORDS.has(token) || EXPORT_WORDS.has(token); }

function findProduct(tokens, language, countryKey = "") {
  const { synonyms } = getSearchIndex();
  const countryWords = new Set(countryKey.split(" "));
  const words = tokens.filter((token) => !countryWords.has(token) && !isStopWord(token, language) && !QUESTION_WORDS.has(token));
  for (let length = 3; length >= 1; length--) {
    for (let start = 0; start + length <= words.length; start++) {
      const phrase = words.slice(start, start + length).join(" ");
      const codes = synonyms.get(phrase) || synonyms.get(phrase.replace(/s$/, ""));
      if (codes) return [...codes][0];
    }
  }
  const remainingWords = words.filter((token) => token.length >= 3 && !isTradeWord(token) && !/^\d+$/.test(token));
  if (!remainingWords.length) return null;
  return search(remainingWords.join(" ")).products[0] || null;
}

export function looksLikeQuestion(text) {
  if (/\?/.test(text)) return true;
  const tokens = normalize(text).split(" ");
  return tokens.length >= 3 && (QUESTION_WORDS.has(tokens[0]) || tokens.some(isTradeWord));
}

export function parseQuestion(text) {
  const normalized = normalize(text);
  const tokens = normalized.split(" ");
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/);
  const importWords = tokens.filter((token) => IMPORT_WORDS.has(token)).length;
  const exportWords = tokens.filter((token) => EXPORT_WORDS.has(token)).length;
  const asksWhereGoodsGo = /\b(where to|wohin|ou va|ou vont|vers ou)\b/.test(normalized);
  const country = findCountry(tokens);
  return {
    flow: asksWhereGoodsGo || exportWords > importWords ? "exp" : "imp",
    year: yearMatch ? Number(yearMatch[0]) : null,
    country: country?.code || null,
    product: findProduct(tokens, questionLanguage(tokens), country?.key),
  };
}

function shareOf(value, total) { return total ? percent(value / total) : t("na"); }

const ANSWERS = {
  fr: {
    productCountry: "En {year}, le Luxembourg a {verb} pour <strong>{value}</strong> {of} {dir}{nb}: {share} du total.",
    productTop: "En {year}, le Luxembourg a {verb} pour <strong>{value}</strong> {of}. {Top} arrive en tête avec {share}.",
    country: "En {year}, le Luxembourg a {verb} pour <strong>{value}</strong> de marchandises {dir}.",
    countryTop: " Premier produit{nb}: {product} ({share}).",
    totals: "En {year}, le Luxembourg a acheté pour <strong>{imp}</strong> de marchandises et en a vendu pour <strong>{exp}</strong>.",
    noYear: "Le détail par pays de cette année n’est pas dans les données du site{nb}; voici la dernière année disponible.",
    zero: "Aucun échange {of} {dir} n’a été observé en {year}.",
    dirImp: "venant {from}", dirExp: "{to}",
  },
  en: {
    productCountry: "In {year}, Luxembourg {verb} <strong>{value}</strong> {of} {dir}: {share} of the total.",
    productTop: "In {year}, Luxembourg {verb} <strong>{value}</strong> {of}. {Top} comes first with {share}.",
    country: "In {year}, Luxembourg {verb} <strong>{value}</strong> of goods {dir}.",
    countryTop: " Top product: {product} ({share}).",
    totals: "In {year}, Luxembourg bought <strong>{imp}</strong> of goods and sold <strong>{exp}</strong>.",
    noYear: "The country detail for that year is not in the site’s data; here is the latest available year.",
    zero: "No trade {of} {dir} was recorded in {year}.",
    dirImp: "{from}", dirExp: "{to}",
  },
  de: {
    productCountry: "{year} hat Luxemburg {of} im Wert von <strong>{value}</strong> {dir} {verb}: {share} des Gesamtwerts.",
    productTop: "{year} hat Luxemburg {of} im Wert von <strong>{value}</strong> {verb}. {Top} liegt mit {share} vorn.",
    country: "{year} hat Luxemburg Waren im Wert von <strong>{value}</strong> {dir} {verb}.",
    countryTop: " Wichtigste Ware: {product} ({share}).",
    totals: "{year} hat Luxemburg Waren im Wert von <strong>{imp}</strong> gekauft und für <strong>{exp}</strong> verkauft.",
    noYear: "Die Länderdetails für dieses Jahr sind nicht in den Daten der Website; hier das letzte verfügbare Jahr.",
    zero: "{year} wurde kein Handel {of} {dir} erfasst.",
    dirImp: "{from}", dirExp: "{to}",
  },
};

function answerText(key, vars) {
  const defaults = { nb: lang() === "fr" ? "\u00a0" : "" };
  return ANSWERS[lang()][key].replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : defaults[name] ?? ""));
}

function direction({ flow }, code) {
  const forms = countryFormsOf(code);
  return answerText(flow === "imp" ? "dirImp" : "dirExp", { from: forms.from, to: forms.to });
}

function storedPartnerValue({ flow, country }, entry, year) {
  const fromHistory = entry.history[flow]?.[country]?.[yearIndex(year)];
  if (isPresent(fromHistory)) return fromHistory;
  const row = entry.partners[flow].find(([code]) => code === country);
  if (year === latestYear()) return row?.[1] ?? null;
  if (year === latestYear() - 1) return row?.[2] ?? null;
  return fromHistory;
}

async function partnerValue(question, entry, year) {
  const stored = storedPartnerValue(question, entry, year);
  const canAskEurostat = question.product.length <= 6 && navigator.onLine;
  if (isPresent(stored) || !canAskEurostat) return stored;
  try {
    const live = await fetchLuxembourgTrade({ product: question.product, partner: question.country, flow: question.flow, years: [year] });
    return live.value(question.country, question.flow, String(year)) ?? 0;
  } catch {
    return null;
  }
}

async function productAnswer(question, year) {
  const { product, flow, country } = question;
  const bundle = await loadProductBundle(product);
  const entry = bundle.items[product];
  if (!entry) return null;
  const of = productOf(productName(product, bundle));
  const verb = t(`flow.${flow}.verb`);
  const link = href(`produit/${product}`, { flux: flow });
  const totalOfYear = entry.series[flow]?.[yearIndex(year)];
  if (country) {
    const value = await partnerValue(question, entry, year);
    if (!value) return { html: answerText("zero", { of, dir: direction(question, country), year }), href: link };
    return { html: answerText("productCountry", { year, verb, value: moneyLong(value), of, dir: direction(question, country), share: shareOf(value, totalOfYear) }), href: link };
  }
  const partners = entry.partners[flow].filter(([code, value]) => code !== UNSPECIFIED_PARTNER && value);
  if (!totalOfYear || !partners.length) return { html: t("product.none", { year }), href: link };
  const latest = latestYear();
  const latestTotal = entry.series[flow][yearIndex(latest)];
  const [topCode, topValue] = partners[0];
  const latestYearNotice = year !== latest ? answerText("noYear", {}) + " " : "";
  const topSentence = answerText("productTop", {
    year: latest, verb, value: moneyLong(latestTotal), of, Top: capitalize(countryFormsOf(topCode).definite), share: shareOf(topValue, latestTotal),
  });
  return { html: latestYearNotice + topSentence, href: link };
}

function countryAnswer(question, year) {
  const { country: code, flow } = question;
  const country = store.countries.countries[code];
  if (!country) return null;
  const value = country.series[flow]?.[yearIndex(year)];
  const topProduct = year === latestYear() ? (country.products?.[flow] || [])[0] : null;
  let html = answerText("country", { year, verb: t(`flow.${flow}.verb`), value: moneyLong(value), dir: direction(question, code) });
  if (topProduct) html += answerText("countryTop", { product: escapeHtml(productName(topProduct[0])), share: shareOf(topProduct[1], value) });
  return { html, href: href(`pays/${code}`, { flux: flow }) };
}

function totalsAnswer(year) {
  const index = yearIndex(year);
  const { totals } = store.overview;
  return { html: answerText("totals", { year, imp: moneyLong(totals.imp[index]), exp: moneyLong(totals.exp[index]) }), href: href("") };
}

export async function answer(text) {
  const question = parseQuestion(text);
  const latest = latestYear();
  const year = question.year && question.year >= store.meta.first_year && question.year <= latest ? question.year : latest;
  if (question.product) return productAnswer(question, year);
  if (question.country) return countryAnswer(question, year);
  return totalsAnswer(year);
}
