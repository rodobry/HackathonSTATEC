import {
  countryFormsOf, countryName, flowParam, href, isCountry, latestYear, loadData, monthPeriods, NEIGHBOURS, periodParam, periodUrlParams, productName,
  siteYears, store, withinPeriod, yearIndex, yearParam,
} from "../data.js";
import { capitalize, escapeHtml, lang, lowerFirst, money, moneyLong, monthAxisLabel, monthName, percent, rankWord, signedMoney, t } from "../i18n.js";
import { icon } from "../icons.js";
import { balanceLegend, balanceMapChart, balanceScale, barList, columnChart, lineChart, mapChart, mapLegend } from "../charts.js";
import {
  bindFigure, bindFlowSwitch, bindPeriodPicker, bindYearlyToolbar, fadeThen, figure, flowColor, flowSwitch, keepingSelectFocus, largestBalanceGap,
  loadingPage, notFoundPage, paintMilestones, periodPicker, repaintKeepingScrollAndFocus, setFigureText, sortableTable, withNeighboursNote, yearlyToolbar,
} from "../ui.js";
import { updateParams } from "../app.js";
import { foldAccents } from "../search.js";
import { changeSection, yearOnYearContributions } from "../contributions.js";
import { difference } from "../values.js";
import { drawSeasonality, seasonalityCsv } from "../seasonality.js";

const PAGE_VIEWS = ["evolution", "mois", "saisonnalite", "tableau"];
const EMBED_VIEWS = ["evolution", "produits", "mois", "saisonnalite", "tableau"];

export async function render(main, [requestedCode], params, { embed = false } = {}) {
  const flow = flowParam(params);
  main.innerHTML = loadingPage();
  if (!requestedCode) {
    const world = await loadData("world.json");
    if (!main.isConnected) return;
    renderIndex(main, {
      flow, world, zone: params.get("zone") === "europe" ? "europe" : "world", year: yearParam(params),
      view: params.get("vue") === "solde" ? "solde" : "carte", neighboursHidden: params.get("voisins") === "non",
    });
    return;
  }
  const code = requestedCode.toUpperCase();
  const country = store.countries.countries[code];
  if (!country || !isCountry(code)) {
    main.innerHTML = notFoundPage(t("error.country"), href("pays"), t("country.index.all"));
    return;
  }
  const views = embed ? EMBED_VIEWS : PAGE_VIEWS;
  paintCountry(main, {
    code, country, flow, period: periodParam(params), seasonMode: "season", embed,
    view: views.includes(params.get("vue")) ? params.get("vue") : "evolution",
  });
}

function rankAmongPartners(code, flow, year) {
  const index = yearIndex(year);
  const ranked = Object.entries(store.countries.countries)
    .filter(([partner]) => isCountry(partner))
    .map(([partner, country]) => [partner, country.series[flow]?.[index] || 0])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  return ranked.findIndex(([partner]) => partner === code) + 1;
}

function summaryOf({ code, country }, year) {
  const index = yearIndex(year);
  return { year, index, name: countryName(code), forms: countryFormsOf(code), imp: country.series.imp?.[index] ?? null, exp: country.series.exp?.[index] ?? null };
}

function countryLede(code, summary) {
  const { year, index, forms, imp, exp } = summary;
  const rankImp = rankAmongPartners(code, "imp", year);
  const rankExp = rankAmongPartners(code, "exp", year);
  const sentences = [];
  if (imp && exp && rankImp && rankExp) {
    sentences.push(t("country.lede.both", {
      Name: escapeHtml(capitalize(forms.definite)), rankExp: rankWord(rankExp), rankImp: rankWord(rankImp), rankExpN: rankExp, rankImpN: rankImp, year,
      shareExp: percent(exp / store.overview.totals.exp[index]), exp: escapeHtml(moneyLong(exp)),
      shareImp: percent(imp / store.overview.totals.imp[index]), imp: escapeHtml(moneyLong(imp)),
    }));
  }
  const balance = difference(exp, imp);
  if (balance !== null) sentences.push(escapeHtml(t(balance >= 0 ? "country.lede.balancePos" : "country.lede.balanceNeg", { balance: moneyLong(Math.abs(balance)) })));
  else sentences.push(escapeHtml(t("country.missing")));
  return sentences.join(" ");
}

function countryTabs(embed) {
  return [
    { id: "evolution", label: t("tab.evolution"), icon: "chart-line" },
    ...(embed ? [{ id: "produits", label: t("tab.products"), icon: "chart-bar-big" }] : []),
    { id: "mois", label: t("tab.months"), icon: "chart-bar-big" },
    { id: "saisonnalite", label: t("tab.seasonality"), icon: "calendar-days" },
    { id: "tableau", label: t("tab.table"), icon: "table-2" },
  ];
}

function breadcrumb(name) {
  return `<nav class="breadcrumb" aria-label="${escapeHtml(t("breadcrumb"))}"><a href="${href("pays")}">${escapeHtml(t("nav.countries"))}</a>${icon("chevron-right")}<span>${escapeHtml(name)}</span></nav>`;
}

function paintCountry(main, state) {
  const { code, country } = state;
  const summary = summaryOf(state, state.period.until);
  const title = t("country.title", { name: summary.forms.definite });
  document.title = `${title} · ${t("site.title")}`;
  main.innerHTML = `<div class="page">
    ${state.embed ? "" : breadcrumb(summary.name)}
    <div class="flow-swap" data-role="swap">
      <section class="intro" style="padding-top:24px">
        ${state.embed ? "" : `<div style="margin-bottom:18px">${flowSwitch(state.flow)}</div>`}
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${countryLede(code, summary)}</p>
        ${state.embed || summary.year !== latestYear() ? "" : topProductsSentence(state, summary)}
      </section>
      ${figure({ id: "country-figure", title: escapeHtml(evolutionTitle(state, summary)), subtitle: escapeHtml(t("country.chart.evoSub")), tabs: countryTabs(state.embed), active: state.view, milestones: true, level: 2 })}
      ${state.embed ? "" : `<section class="section" style="padding-top:56px" data-role="products-section"></section>`}
    </div>
  </div>`;
  const root = main.querySelector("#country-figure");
  const draw = () => drawCountryView(root, state, summary);
  draw();
  bindFigure(root, {
    tab: (view) => {
      state.view = view;
      updateParams({ vue: view });
      draw();
    },
    csv: () => {
      if (state.view === "saisonnalite") {
        return seasonalityCsv(state.seasonalityRows || [], `luxembourg-${code}-${state.flow}-months-${state.period.from}-${state.period.until}.csv`);
      }
      const imports = withinPeriod(country.series.imp, state.period), exports = withinPeriod(country.series.exp, state.period);
      return {
        name: `luxembourg-${code}-${state.period.from}-${state.period.until}.csv`,
        rows: [["year", "imports_eur", "exports_eur"], ...withinPeriod(store.overview.years, state.period).map((year, index) => [year, imports[index], exports[index]])],
      };
    },
    explain: () => `<p>${escapeHtml(explanation(summary, state.period))}</p><p class="note">${escapeHtml(t("product.explain.caveat"))}</p>`,
    embedPath: () => href(`integrer/pays/${code}`, { vue: state.view, flux: state.flow, ...periodUrlParams(state.period) }).replace(/^#\//, ""),
    milestones: draw,
  });
  if (!state.embed) paintTopProducts(main, state, summaryOf(state, latestYear()));
  bindFlowSwitch(main.querySelector(".intro"), (flow) => {
    if (flow === state.flow) return;
    fadeThen(main.querySelector("[data-role=swap]"), () => repaintKeepingScrollAndFocus(main, flow, () => {
      state.flow = flow;
      updateParams({ flux: flow });
      paintCountry(main, state);
    }));
  });
}

function flowTotal(state, summary) { return state.country.series[state.flow]?.[summary.index] || 0; }

function topProductsSentence(state, summary) {
  const total = flowTotal(state, summary);
  const rows = (state.country.products[state.flow] || []).slice(0, 3);
  if (!total || !rows.length) return "";
  const list = rows.map(([code, value]) => `${escapeHtml(lowerFirst(productName(code)))} (<strong>${escapeHtml(percent(value / total))}</strong>)`).join(", ");
  return `<p class="lede lede--second">${t(`country.products.${state.flow}`, { list })}</p>`;
}

function balanceSign(country, index) {
  const balance = difference(country.series.exp?.[index], country.series.imp?.[index]);
  return balance === null ? null : balance >= 0 ? 1 : -1;
}

function evolutionTitle(state, summary) {
  const years = store.overview.years;
  const last = yearIndex(state.period.until);
  const first = yearIndex(state.period.from);
  const sign = balanceSign(state.country, last);
  if (sign === null) return t("country.chart.availableTitle", { name: summary.name });
  let since = last;
  while (since > first && balanceSign(state.country, since - 1) === sign) since--;
  const direction = sign > 0 ? "pos" : "neg";
  const key = since === last ? `country.title.year.${direction}` : `country.title.since.${direction}`;
  return t(key, { since: years[since], year: summary.year, to: summary.forms.to, from: summary.forms.from });
}

function topProductsTitle(state, summary) {
  const key = state.flow === "imp" ? "country.chart.productsImp" : "country.chart.productsExp";
  return t(key, { from: summary.forms.from, to: summary.forms.to, year: summary.year });
}

function periodToolbar(state) {
  return state.embed ? "" : `<div class="toolbar"><div class="toolbar__group">${periodPicker(state.period)}</div></div>`;
}

function drawEvolution(root, body, state, summary) {
  const years = withinPeriod(store.overview.years, state.period);
  const title = evolutionTitle(state, summary);
  setFigureText(root, { title: escapeHtml(title), subtitle: escapeHtml(t("country.chart.evoSub")) });
  body.innerHTML = `${periodToolbar(state)}<div class="legend"><span><i class="line-key" style="background:var(--imp)"></i>${escapeHtml(t("flow.imp"))}</span><span><i class="line-key" style="background:var(--exp)"></i>${escapeHtml(t("flow.exp"))}</span></div><div data-role="chart"></div>`;
  lineChart(body.querySelector("[data-role=chart]"), {
    x: years, format: money, height: 320, ariaLabel: title, milestones: paintMilestones(root, { country: state.code }),
    series: ["imp", "exp"].map((flow) => ({ label: t(`flow.${flow}`), color: flowColor(flow), values: state.country.series[flow] ? withinPeriod(state.country.series[flow], state.period) : years.map(() => null), strong: true })),
  });
}

function drawProducts(root, body, state) {
  const latest = summaryOf(state, latestYear());
  setFigureText(root, { title: escapeHtml(topProductsTitle(state, latest)), subtitle: escapeHtml(t("country.chart.productsSub")) });
  body.innerHTML = topProductBars(state, latest, 12);
}

function drawMonths(root, body, state, summary) {
  const months = monthPeriods();
  const titleKey = state.flow === "imp" ? "country.chart.monthsImp" : "country.chart.monthsExp";
  setFigureText(root, {
    title: escapeHtml(t(titleKey, { from: summary.forms.from, to: summary.forms.to })),
    subtitle: escapeHtml(t("product.chart.monthsSub", { from: monthName(months[0]), to: monthName(months.at(-1)) })),
  });
  body.innerHTML = `<div data-role="chart"></div>`;
  columnChart(body.querySelector("[data-role=chart]"), {
    x: months.map(monthAxisLabel), values: state.country.monthly[state.flow], format: money, height: 260, labelStep: 3,
    color: () => flowColor(state.flow), seriesLabel: t(`flow.${state.flow}`),
  });
}

function drawTable(root, body, state, summary) {
  const title = evolutionTitle(state, summary);
  setFigureText(root, { title: escapeHtml(title), subtitle: escapeHtml(t("country.chart.evoSub")) });
  const { series } = state.country;
  const imports = withinPeriod(series.imp, state.period), exports = withinPeriod(series.exp, state.period);
  const rows = withinPeriod(store.overview.years, state.period).map((year, index) => ({ year, imp: imports[index] ?? null, exp: exports[index] ?? null })).reverse();
  body.innerHTML = `${periodToolbar(state)}<div data-role="table"></div>`;
  sortableTable(body.querySelector("[data-role=table]"), [
    { label: t("table.year"), get: (row) => row.year },
    { label: t("flow.imp"), numeric: true, get: (row) => row.imp, format: money },
    { label: t("flow.exp"), numeric: true, get: (row) => row.exp, format: money },
    { label: t("country.fact.balance"), numeric: true, get: (row) => difference(row.exp, row.imp), format: signedMoney },
  ], rows, { sort: 0, direction: -1, caption: title });
}

function bindCountryPeriod(root, state) {
  bindPeriodPicker(root, (change) => {
    state.period = { ...state.period, ...change };
    updateParams(periodUrlParams(state.period));
    const main = root.closest("main") || document.querySelector("main");
    keepingSelectFocus(main, () => paintCountry(main, state));
  });
}

function drawSeasonalityView(root, body, state, summary) {
  const shown = { view: state.view, flow: state.flow, period: state.period };
  drawSeasonality(root, body, {
    partner: state.code, flow: state.flow, period: state.period, name: summary.name, state, toolbar: state.embed ? "" : periodPicker(state.period),
    isStillShown: () => root.isConnected && state.view === shown.view && state.flow === shown.flow && state.period === shown.period,
    bind: () => bindCountryPeriod(root, state),
  });
}

const COUNTRY_VIEWS = { evolution: drawEvolution, produits: drawProducts, mois: drawMonths, saisonnalite: drawSeasonalityView, tableau: drawTable };

function drawCountryView(root, state, summary) {
  paintMilestones(root, null);
  COUNTRY_VIEWS[state.view](root, root.querySelector("[data-role=body]"), state, summary);
  if (state.view !== "saisonnalite") bindCountryPeriod(root, state);
}

function topProductBars(state, summary, limit) {
  const { flow } = state;
  const total = flowTotal(state, summary);
  const rows = (state.country.products[flow] || []).slice(0, limit).map(([code, value]) => ({
    label: productName(code), value, share: total ? value / total : null, href: href(`produit/${code}`, { flux: flow }),
  }));
  return rows.length ? barList(rows, { flow, format: money }) : `<p class="empty">${escapeHtml(t("na"))}</p>`;
}

function productContributions(state, summary) {
  const series = state.country.series[state.flow] || [];
  const items = (state.country.products[state.flow] || []).map(([code, after, before]) => ({
    label: productName(code), before, after, href: href(`produit/${code}`, { flux: state.flow }),
  }));
  return yearOnYearContributions(items, series[summary.index - 1], series[summary.index]);
}

function paintTopProducts(main, state, summary) {
  const changes = changeSection(productContributions(state, summary), { year: summary.year, flow: state.flow, level: 3 });
  const subtitle = t("country.chart.productsSub");
  const lede = state.period.until === summary.year ? subtitle
    : `${subtitle}${/[.!?]$/.test(subtitle) ? "" : "."} ${t("period.single", { latest: summary.year })}`;
  main.querySelector("[data-role=products-section]").innerHTML = `<h2>${escapeHtml(topProductsTitle(state, summary))}</h2>
    <p class="section__lede">${escapeHtml(lede)}</p>
    ${topProductBars(state, summary, 10)}
    ${changes ? `<div style="margin-top:40px">${changes}</div>` : ""}`;
}

function explanation(summary, { from }) {
  const texts = {
    fr: `Les deux courbes montrent, chaque année depuis ${from}, ce que le Luxembourg achète ${summary.forms.to} (en brun) et ce qu’il lui vend (en vert). En ${summary.year}, les achats atteignent ${moneyLong(summary.imp)} et les ventes ${moneyLong(summary.exp)}.`,
    en: `The two lines show, each year since ${from}, what Luxembourg buys ${summary.forms.from} (brown) and what it sells ${summary.forms.to} (green). In ${summary.year}, purchases reached ${moneyLong(summary.imp)} and sales ${moneyLong(summary.exp)}.`,
    de: `Die beiden Kurven zeigen für jedes Jahr seit ${from}, was Luxemburg ${summary.forms.from} kauft (braun) und was es ${summary.forms.to} verkauft (grün). ${summary.year} erreichten die Einkäufe ${moneyLong(summary.imp)} und die Verkäufe ${moneyLong(summary.exp)}.`,
  };
  return texts[lang()];
}

function tradingPartners(year) {
  const index = yearIndex(year);
  return Object.entries(store.countries.countries).filter(([code, country]) => isCountry(code) && ((country.series.imp?.[index] || 0) + (country.series.exp?.[index] || 0)) > 0);
}

function partnerRows(year) {
  const index = yearIndex(year);
  return tradingPartners(year).map(([code, country]) => ({ code, name: countryName(code), imp: country.series.imp?.[index] ?? null, exp: country.series.exp?.[index] ?? null }));
}

function countryPageLink(code, flow, year) {
  return href(`pays/${code}`, { flux: flow, annee: year === latestYear() ? null : year });
}

function partnerColumns(flow, year) {
  return [
    { label: t("table.country"), get: (row) => row.name, html: (row) => `<a href="${countryPageLink(row.code, flow, year)}">${escapeHtml(row.name)}</a>` },
    { label: `${t("flow.imp")} ${year}`, numeric: true, get: (row) => row.imp, format: money },
    { label: `${t("flow.exp")} ${year}`, numeric: true, get: (row) => row.exp, format: money },
    { label: t("country.fact.balance"), numeric: true, get: (row) => difference(row.exp, row.imp), format: signedMoney },
  ];
}

function drawBalanceMap(root, body, state, { shown, toolbar, mapOptions }) {
  const { values, breaks } = balanceScale(shown);
  const gap = largestBalanceGap(values);
  const title = gap ? capitalize(gap) : t("tab.balance");
  setFigureText(root, { title: escapeHtml(title), subtitle: withNeighboursNote(escapeHtml(t("country.index.balanceSub", { year: state.year })), state.neighboursHidden, true) });
  body.innerHTML = `${toolbar}${balanceLegend(breaks, money, { excluded: state.neighboursHidden })}<div data-role="map"></div>`;
  balanceMapChart(body.querySelector("[data-role=map]"), { ...mapOptions, values, ariaLabel: title, balanceLabel: t("country.fact.balance") });
}

function drawShareMap(root, body, state, { rows, shown, toolbar, mapOptions }) {
  const { flow, year } = state;
  const hiddenNeighboursValue = state.neighboursHidden ? rows.filter((row) => NEIGHBOURS.includes(row.code)).reduce((sum, row) => sum + row[flow], 0) : 0;
  const total = store.overview.totals[flow][yearIndex(year)] - hiddenNeighboursValue;
  const values = new Map(shown.map((row) => [row.code, { share: row[flow] / total, value: row[flow] }]).filter(([, entry]) => entry.value > 0));
  const title = t("country.index.map", { flow: t(`flow.${flow}.long`), year });
  setFigureText(root, { title: escapeHtml(title), subtitle: withNeighboursNote("", state.neighboursHidden) });
  body.innerHTML = `${toolbar}${mapLegend(flow, { excluded: state.neighboursHidden })}<div data-role="map"></div>`;
  mapChart(body.querySelector("[data-role=map]"), { ...mapOptions, values, flow, format: money, ariaLabel: title });
}

function renderIndex(main, options) {
  const state = { ...options };
  const latest = latestYear();
  document.title = `${t("nav.countries")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page">
    <section class="intro"><h1>${escapeHtml(t("country.index.title"))}</h1>
      <p class="lede" data-role="lede"></p>
      <div style="margin-top:22px">${flowSwitch(state.flow)}</div></section>
    <div class="flow-swap" data-role="swap">
      ${figure({ id: "countries-map", title: "", tabs: [{ id: "carte", label: t("tab.map"), icon: "map" }, { id: "solde", label: t("tab.balance"), icon: "scale" }], active: state.view, explain: false, level: 2 })}
      <p class="more-link"><a href="${href("comparer", { flux: state.flow })}">${escapeHtml(t("compare.link"))}${icon("arrow-right")}</a></p>
      <section class="section"><h2>${escapeHtml(t("country.index.all"))}</h2>
        <div class="search" style="margin-top:12px;max-width:24rem"><div class="search__field">${icon("search")}<input type="search" data-role="filter" aria-label="${escapeHtml(t("country.index.filter"))}" placeholder="${escapeHtml(t("country.index.filter"))}"></div></div>
        <div data-role="table" style="margin-top:16px"></div></section>
    </div>
  </div>`;
  const root = main.querySelector("#countries-map");
  const body = root.querySelector("[data-role=body]");
  const table = main.querySelector("[data-role=table]");
  const filter = main.querySelector("[data-role=filter]");
  let rows = [], columns = [];
  const paintTable = () => {
    const query = foldAccents(filter.value);
    sortableTable(table, columns, rows.filter((row) => foldAccents(row.name).includes(query)), { sort: state.flow === "imp" ? 1 : 2, caption: `${t("country.index.all")} (${state.year})` });
  };
  const draw = () => {
    main.querySelector("[data-role=lede]").textContent = t("country.index.lede", { count: tradingPartners(state.year).length, year: state.year });
    rows = partnerRows(state.year);
    columns = partnerColumns(state.flow, state.year);
    paintTable();
    const shown = state.neighboursHidden ? rows.filter((row) => !NEIGHBOURS.includes(row.code)) : rows;
    const mapOptions = {
      world: state.world, view: state.zone, names: countryName, excluded: state.neighboursHidden ? new Set(NEIGHBOURS) : null,
      onSelect: (code) => { location.hash = countryPageLink(code, state.flow, state.year); },
    };
    const toolbar = yearlyToolbar({ year: state.year, years: siteYears(), neighboursHidden: state.neighboursHidden, zone: state.zone });
    const drawMap = state.view === "solde" ? drawBalanceMap : drawShareMap;
    drawMap(root, body, state, { rows, shown, toolbar, mapOptions });
    bindYearlyToolbar(body, {
      onYear: (year) => change({ year }, { annee: year === latest ? null : year }),
      onZone: (zone) => change({ zone }, { zone }),
      onNeighbours: (hidden) => change({ neighboursHidden: hidden }, { voisins: hidden ? "non" : null }),
    });
  };
  const change = (changes, params) => {
    Object.assign(state, changes);
    updateParams(params);
    keepingSelectFocus(root, draw);
  };
  draw();
  bindFigure(root, {
    tab: (view) => change({ view }, { vue: view === "solde" ? "solde" : null }),
    csv: () => ({
      name: `luxembourg-partners-${state.year}.csv`,
      rows: [["partner_code", "partner", "imports_eur", "exports_eur", "balance_eur"], ...rows.map((row) => [row.code, row.name, row.imp, row.exp, difference(row.exp, row.imp)])],
    }),
    embedPath: () => `integrer/pays?flux=${state.flow}${state.view === "solde" ? "&vue=solde" : ""}${state.year !== latest ? `&annee=${state.year}` : ""}${state.neighboursHidden ? "&voisins=non" : ""}&lang=${lang()}`,
  });
  filter.addEventListener("input", paintTable);
  bindFlowSwitch(main, (flow) => {
    if (flow === state.flow) return;
    fadeThen(main.querySelector("[data-role=swap]"), () => {
      updateParams({ flux: flow });
      renderIndex(main, { ...state, flow });
    });
  });
}
