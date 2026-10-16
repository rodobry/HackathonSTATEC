import { href } from "./data.js";
import { escapeHtml, lang, t } from "./i18n.js";

const NNBSP = " ";
const ON_EVERY_CHART = "every chart";
const HOME_CHART = { path: "" };

const SOURCES = {
  eurostat: {
    label: "Eurostat, Comext DS-045409",
    url: "https://ec.europa.eu/eurostat/databrowser/view/ds-045409/legacyMultiFreq/table?category=ext_go.ext_go_detail",
  },
  statecNote2010: {
    label: "STATEC, Note de conjoncture 1-2010, p. 55",
    url: "https://statistiques.public.lu/dam-assets/catalogue-publications/note-conjoncture/2010/PDF-Note-conjoncture-1-2010.pdf",
  },
  ecbRelease2010: {
    label: { fr: "BCE, communiqué du 10 mai 2010", en: "ECB, press release of 10 May 2010", de: "EZB, Pressemitteilung vom 10. Mai 2010" },
    url: "https://www.ecb.europa.eu/press/pr/date/2010/html/pr100510.en.html",
  },
  ecbRelease2012: {
    label: { fr: "BCE, communiqué du 6 septembre 2012", en: "ECB, press release of 6 September 2012", de: "EZB, Pressemitteilung vom 6. September 2012" },
    url: "https://www.ecb.europa.eu/press/pr/date/2012/html/pr120906_1.en.html",
  },
  ecbAccount2015: {
    label: {
      fr: "BCE, compte rendu de la réunion des 21 et 22 janvier 2015",
      en: "ECB, account of the meeting of 21–22 January 2015",
      de: "EZB, Bericht über die Sitzung vom 21.–22. Januar 2015",
    },
    url: "https://www.ecb.europa.eu/press/accounts/2015/html/mg150219.en.html",
  },
  ecbBulletin2022: {
    label: { fr: "BCE, Bulletin économique 4/2022", en: "ECB, Economic Bulletin 4/2022", de: "EZB, Wirtschaftsbericht 4/2022" },
    url: "https://www.ecb.europa.eu/pub/economic-bulletin/focus/2022/html/ecb.ebbox202204_01~68ef3c3dc6.en.html",
  },
  statecFlash2025: {
    label: { fr: "STATEC, Conjoncture Flash, octobre 2025", en: "STATEC, Conjoncture Flash, October 2025", de: "STATEC, Conjoncture Flash, Oktober 2025" },
    url: "https://statistiques.public.lu/fr/publications/series/conjoncture-flash/2025/10-25-conjflash.html",
  },
  statecNote2025: {
    label: "STATEC, Note de conjoncture 2-2025",
    url: "https://statistiques.public.lu/dam-assets/catalogue-publications/note-conjoncture/2025/ndc-2-25-web.pdf",
  },
};

const MILESTONES = [
  {
    first: "2008", last: "2009", scope: ON_EVERY_CHART, chart: HOME_CHART,
    label: { fr: "Crise financière", en: "Financial crisis", de: "Finanzkrise" },
    text: {
      fr: `En 2009, les achats de marchandises du Luxembourg baissent de 17${NNBSP}% en valeur par rapport à 2008 et ses ventes de 12${NNBSP}%. Les ventes de fer et d’acier passent de 2,7 à 1,4 milliard d’euros.`,
      en: "In 2009, Luxembourg’s purchases of goods fall by 17% in value and its sales by 12% compared with 2008. Iron and steel sales fall from €2.7 billion to €1.4 billion.",
      de: "2009 sinkt der Wert von Luxemburgs Wareneinkäufen gegenüber 2008 um 17 %, der Wert seiner Warenverkäufe um 12 %. Die Verkäufe von Eisen und Stahl fallen von 2,7 auf 1,4 Milliarden Euro.",
    },
    sources: [SOURCES.eurostat, SOURCES.statecNote2010],
  },
  {
    first: "2010", last: "2013", scope: null, chart: HOME_CHART,
    label: { fr: "Dettes de la zone euro", en: "Euro area debt crisis", de: "Schuldenkrise im Euroraum" },
    text: {
      fr: `En mai 2010, la BCE commence à acheter des titres pour calmer les tensions sur les marchés. En septembre 2012, elle annonce les opérations monétaires sur titres. Les ventes du Luxembourg baissent en 2010 (−7${NNBSP}%), en 2012 (−2${NNBSP}%) et en 2013 (−5${NNBSP}%).`,
      en: "In May 2010, the ECB starts buying securities to ease tensions on the markets. In September 2012, it announces Outright Monetary Transactions. Luxembourg’s sales fall in 2010 (−7%), 2012 (−2%) and 2013 (−5%).",
      de: "Im Mai 2010 beginnt die EZB, Wertpapiere zu kaufen, um die Spannungen an den Märkten zu dämpfen. Im September 2012 kündigt sie geldpolitische Outright-Geschäfte an. Luxemburgs Verkäufe sinken 2010 (−7 %), 2012 (−2 %) und 2013 (−5 %).",
    },
    sources: [SOURCES.ecbRelease2010, SOURCES.ecbRelease2012],
  },
  {
    first: "2014", last: "2016", scope: { products: ["27"] }, chart: { path: "produit/27", params: { flux: "imp", vue: "evolution" } },
    label: { fr: "Chute du pétrole", en: "Oil price slump", de: "Ölpreisverfall" },
    text: {
      fr: `Le prix du Brent baisse de plus de moitié entre juin 2014 et janvier 2015. Les achats de carburants et d’énergie du Luxembourg passent de 2,3 à 1,3 milliard d’euros entre 2014 et 2016 (−42${NNBSP}%).`,
      en: "The price of Brent crude falls by more than half between June 2014 and January 2015. Luxembourg’s purchases of fuels and energy go from €2.3 billion in 2014 to €1.3 billion in 2016 (−42%).",
      de: "Der Preis für Brent-Öl sinkt zwischen Juni 2014 und Januar 2015 um mehr als die Hälfte. Luxemburgs Einkäufe von Brennstoffen und Energie gehen von 2014 bis 2016 von 2,3 auf 1,3 Milliarden Euro zurück (−42 %).",
    },
    sources: [SOURCES.ecbAccount2015],
  },
  {
    first: "2020", last: "2020", scope: ON_EVERY_CHART, chart: HOME_CHART,
    label: { fr: "Covid-19", en: "Covid-19", de: "Covid-19" },
    text: {
      fr: `En 2020, les ventes de marchandises du Luxembourg baissent de 17${NNBSP}% en valeur et ses achats de 15${NNBSP}% par rapport à 2019. En 2021, les ventes augmentent de 17${NNBSP}% et les achats de 20${NNBSP}% par rapport à 2020.`,
      en: "In 2020, Luxembourg’s goods sales fall by 17% in value and purchases by 15% compared with 2019. In 2021, sales rise by 17% and purchases by 20% compared with 2020.",
      de: "2020 sinkt der Wert von Luxemburgs Warenverkäufen gegenüber 2019 um 17 %, der Wert seiner Wareneinkäufe um 15 %. 2021 steigen die Verkäufe gegenüber 2020 um 17 % und die Einkäufe um 20 %.",
    },
    sources: [SOURCES.eurostat],
  },
  {
    first: "2022", last: "2022", scope: ON_EVERY_CHART, chart: { path: "produit/27", params: { flux: "imp", vue: "evolution" } },
    label: { fr: "Guerre en Ukraine", en: "War in Ukraine", de: "Krieg in der Ukraine" },
    text: {
      fr: `La Russie envahit l’Ukraine en février 2022. Cette année-là, les achats de carburants et d’énergie du Luxembourg atteignent 4,0 milliards d’euros, contre 2,0 milliards en 2021. Pour les produits pétroliers raffinés (essence, gazole, fioul), les achats augmentent de 85${NNBSP}% en euros et de 9${NNBSP}% en tonnes par rapport à 2021. Les montants des achats de gaz naturel à l’état gazeux et d’électricité manquent pour ces deux années.`,
      en: "Russia invades Ukraine in February 2022. That year, Luxembourg’s purchases of fuels and energy reach €4.0 billion, up from €2.0 billion in 2021. Purchases of refined petroleum products (petrol, diesel, heating oil) rise by 85% in euros and 9% in tonnes compared with 2021. Purchase values for natural gas in gaseous form and electricity are missing for both years.",
      de: "Russland marschiert im Februar 2022 in die Ukraine ein. In diesem Jahr erreichen Luxemburgs Einkäufe von Brennstoffen und Energie 4,0 Milliarden Euro, gegenüber 2,0 Milliarden im Jahr 2021. Die Einkäufe raffinierter Erdölprodukte (Benzin, Diesel, Heizöl) steigen gegenüber 2021 um 85 % in Euro und um 9 % in Tonnen. Die Einkaufswerte für gasförmiges Erdgas und Strom fehlen für beide Jahre.",
    },
    countryTexts: {
      RU: {
        fr: `En février 2022, la Russie envahit l’Ukraine. Les ventes du Luxembourg à la Russie passent de 156 millions d’euros en 2021 à 9 millions en 2023 (−94${NNBSP}%). Elles avaient déjà baissé de 220 à 156 millions entre 2011 et 2013.`,
        en: "In February 2022, Russia invades Ukraine. Luxembourg’s sales to Russia go from €156 million in 2021 to €9 million in 2023 (−94%). They had already fallen from €220 million to €156 million between 2011 and 2013.",
        de: "Im Februar 2022 marschiert Russland in die Ukraine ein. Luxemburgs Verkäufe nach Russland gehen von 156 Millionen Euro im Jahr 2021 auf 9 Millionen im Jahr 2023 zurück (−94 %). Zwischen 2011 und 2013 waren sie bereits von 220 auf 156 Millionen gesunken.",
      },
    },
    sources: [SOURCES.eurostat, SOURCES.ecbBulletin2022],
  },
  {
    first: "2025", last: "2025", scope: { products: ["72", "73", "76"], countries: ["US"] }, chart: { path: "pays/US", params: { flux: "exp" } },
    label: { fr: "Droits de douane américains", en: "US tariffs", de: "US-Zölle" },
    text: {
      fr: `Les États-Unis taxent l’acier et l’aluminium européens à 25${NNBSP}% à partir du 11 février, puis à 50${NNBSP}% à partir du 4 juin, et la plupart des autres produits européens à 15${NNBSP}% depuis le 7 août. Les ventes du Luxembourg aux États-Unis restent stables (430 puis 427 millions d’euros). Celles de poutrelles baissent de 43${NNBSP}%, de palplanches de 29${NNBSP}% et d’aluminium de 13${NNBSP}%${NNBSP}; celles de charpentes métalliques passent de 2 à 17 millions.`,
      en: "The United States taxes European steel and aluminium at 25% from 11 February, then at 50% from 4 June, and most other European goods at 15% since 7 August. Luxembourg’s sales to the United States stay stable (€430 million, then €427 million). Sales of steel beams fall by 43%, sheet piling by 29% and aluminium by 13%; sales of steel structures go from €2 million to €17 million.",
      de: "Die USA belegen europäischen Stahl und europäisches Aluminium ab dem 11. Februar mit 25 % Zoll, ab dem 4. Juni mit 50 %, und die meisten anderen europäischen Waren seit dem 7. August mit 15 %. Luxemburgs Verkäufe in die USA bleiben stabil (430, dann 427 Millionen Euro). Die Verkäufe von Stahlträgern sinken um 43 %, von Spundwänden um 29 % und von Aluminium um 13 %; die von Stahlkonstruktionen steigen von 2 auf 17 Millionen.",
    },
    sources: [SOURCES.statecFlash2025, SOURCES.statecNote2025],
  },
];

let milestonesShown = false;

export function areMilestonesShown() { return milestonesShown; }

export function toggleMilestones() { milestonesShown = !milestonesShown; }

const inCurrentLang = (text) => (typeof text === "string" ? text : text[lang()]);

function concerns(milestone, { product, country }) {
  const { scope } = milestone;
  if (scope === ON_EVERY_CHART) return true;
  if (!scope) return false;
  return Boolean(product && scope.products?.some((prefix) => product.startsWith(prefix))) || Boolean(country && scope.countries?.includes(country));
}

export function milestonesOn(page) { return MILESTONES.filter((milestone) => concerns(milestone, page)); }

export function chartMilestones(page) {
  if (!milestonesShown) return [];
  return milestonesOn(page).map(({ first, last, label }) => ({ first, last, label: inCurrentLang(label) }));
}

function period({ first, last }) { return first === last ? first : `${first}–${last}`; }

function heading(milestone) { return `${period(milestone)} · ${inCurrentLang(milestone.label)}`; }

function sourceLinks(sources) {
  const links = sources.map(({ label, url }) => `<a href="${escapeHtml(url)}">${escapeHtml(inCurrentLang(label))}</a>`).join(", ");
  return `<span class="milestone-sources">${escapeHtml(t("milestones.sources"))} ${links}</span>`;
}

function noteItem(milestone, { country }) {
  const text = milestone.countryTexts?.[country] ?? milestone.text;
  return `<li><strong>${escapeHtml(heading(milestone))}.</strong> ${escapeHtml(inCurrentLang(text))} ${sourceLinks(milestone.sources)}</li>`;
}

export function milestoneNotes(page) {
  const milestones = milestonesOn(page);
  if (!milestonesShown || !milestones.length) return "";
  return `<details class="milestone-notes"><summary>${escapeHtml(t("milestones.details"))}</summary>
    <ul>${milestones.map((milestone) => noteItem(milestone, page)).join("")}</ul>
    <p>${escapeHtml(t("milestones.caution"))}</p></details>`;
}

function chartLink({ path, params }) {
  return `<a href="${href(path, params)}">${escapeHtml(t("milestones.seeChart"))}</a>`;
}

function chronologyItem(milestone) {
  const countryParagraphs = Object.entries(milestone.countryTexts ?? {}).map(([country, text]) =>
    `<p>${escapeHtml(inCurrentLang(text))} ${chartLink({ path: `pays/${country}`, params: { flux: "exp" } })}</p>`).join("");
  return `<li><h3>${escapeHtml(heading(milestone))}</h3>
    <p>${escapeHtml(inCurrentLang(milestone.text))} ${chartLink(milestone.chart)}</p>${countryParagraphs}
    <p>${sourceLinks(milestone.sources)}</p></li>`;
}

export function milestoneChronology() {
  return `<p>${escapeHtml(t("milestones.chronologyLede"))}</p>
    <ol class="chronology" role="list">${MILESTONES.map(chronologyItem).join("")}</ol>
    <p>${escapeHtml(t("milestones.caution"))}</p>`;
}
