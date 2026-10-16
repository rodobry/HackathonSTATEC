import {
  countryFormsOf, countryName, flowParam, href, isConfidentialPartnerGroup, isCountry, isMeasuredInLitres, isProductCode, latestYear, loadData,
  loadProductBundle, monthPeriods, NEIGHBOURS, productName, siteYears, store, UNSPECIFIED_PARTNER, withoutCodeSuffix, withoutPartners, yearIndex, yearParam,
} from "../data.js";
import { capitalize, escapeHtml, euroAmount, lang, lowerFirst, mass, money, moneyLong, monthAxisLabel, monthName, percent, productOf, signedPercent, t } from "../i18n.js";
import { icon } from "../icons.js";
import { balanceLegend, balanceMapChart, balanceScale, barList, columnChart, lineChart, mapChart, mapLegend } from "../charts.js";
import {
  bindFigure, bindFlowSwitch, bindYearlyToolbar, errorAlert, errorPage, fadeThen, figure, flowColor, flowSwitch, goodToKnowSection, largestBalanceGap,
  bindPeriodPicker, keepingSelectFocus, loadingPage, loadingStatus, notFoundPage, paintMilestones, periodPicker, refreshOpenExplanation,
  repaintKeepingScrollAndFocus, setFigureText, setPressed, sortableTable, withNeighboursNote, yearlyToolbar,
} from "../ui.js";
import { updateParams } from "../app.js";
import { representativeProductIcon } from "../catalog.js";
import { fetchLuxembourgTrade } from "../live.js";
import { EU27 } from "../measures.js";
import { changeSection, yearOnYearContributions } from "../contributions.js";
import { isPresent } from "../values.js";
import { drawSeasonality, seasonalityCsv } from "../seasonality.js";

const VIEWS = ["carte", "solde", "classement", "evolution", "mois", "saisonnalite", "tableau"];
const YEARLY_VIEWS = new Set(["carte", "solde", "classement", "tableau"]);
const SHORTEST_CODE_READ_LIVE = 6;
const LIVE_HISTORY_YEARS = 10;
const LIVE_HISTORY_PARTNERS = 5;
const EUROPE_ZONE_MINIMUM_SHARE = 0.8;
const SMALL_TRADE_LIMIT = 5e6;
const TOTAL_LABEL = { fr: "Total", en: "Total", de: "Gesamt" };

const otherFlow = (flow) => (flow === "imp" ? "exp" : "imp");
const siteFilesListEveryPartner = (code) => code.length <= 4;

export async function render(main, [requestedCode], params, { embed = false } = {}) {
  const code = requestedCode || "";
  const state = {
    code,
    flow: flowParam(params),
    view: VIEWS.includes(params.get("vue")) ? params.get("vue") : "carte",
    zone: ["europe", "world"].includes(params.get("zone")) ? params.get("zone") : null,
    neighboursHidden: params.get("voisins") === "non",
    seasonMode: "season",
    embed,
  };
  main.innerHTML = loadingPage();
  if (!isProductCode(code)) {
    main.innerHTML = productNotFound();
    return;
  }
  const bundle = await loadProductBundle(code).catch(() => null);
  if (!main.isConnected) return;
  let entry = bundle?.items[code] || null, live = false, liveData = null;
  if (!entry && code.length >= SHORTEST_CODE_READ_LIVE) {
    main.innerHTML = loadingPage(t("product.liveLoading"));
    try {
      ({ entry, trade: liveData } = await loadLiveEntry(code));
      if (!main.isConnected) return;
      live = true;
    } catch (error) {
      console.error(error);
      main.innerHTML = errorPage(t("product.liveError"));
      return;
    }
  }
  if (!hasTrade(entry)) {
    main.innerHTML = productNotFound();
    return;
  }
  const world = await loadData("world.json");
  if (!main.isConnected) return;
  Object.assign(state, { bundle, entry, live, liveData, world, latest: live ? entry.latest : latestYear(), byYear: new Map(), pending: new Map() });
  state.year = yearParam(params, state.latest);
  state.from = Number(params.get("depuis"));
  state.byYear.set(state.latest, yearFromSiteFiles(state));
  paintPage(main, state);
}

function hasTrade(entry) {
  return entry && ["imp", "exp"].some((flow) => (entry.series[flow] || []).some((value) => value));
}

function productNotFound() { return notFoundPage(t("error.product"), href("produits"), t("nav.products")); }

function displayName(state) {
  const { entry } = state;
  return withoutCodeSuffix(entry.name ? entry.name[lang()] || entry.name.fr : productName(state.code, state.bundle));
}

function latestIndex(state) {
  return state.live ? state.entry.years.indexOf(String(state.latest)) : yearIndex(state.latest);
}

function yearFromSiteFiles(state) {
  const { entry } = state;
  const index = latestIndex(state);
  return {
    year: state.latest, imp: entry.partners.imp || [], exp: entry.partners.exp || [],
    totals: { imp: entry.series.imp?.[index] ?? null, exp: entry.series.exp?.[index] ?? null },
    complete: state.live || siteFilesListEveryPartner(state.code),
  };
}

function partnersFromEurostat(trade, flow, year) {
  const rows = [];
  let unspecified = 0, unspecifiedPrevious = 0;
  for (const partner of trade.partners()) {
    const value = trade.value(partner, flow, year);
    const previous = trade.value(partner, flow, year - 1);
    if (!value && !previous) continue;
    if (isCountry(partner)) rows.push([partner, value, previous]);
    else if (isConfidentialPartnerGroup(partner)) {
      unspecified += value || 0;
      unspecifiedPrevious += previous || 0;
    }
  }
  rows.sort((a, b) => (b[1] || 0) - (a[1] || 0));
  if (unspecified || unspecifiedPrevious) rows.push([UNSPECIFIED_PARTNER, unspecified || null, unspecifiedPrevious || null]);
  return rows;
}

function yearFromEurostat(trade, year) {
  return {
    year, complete: true,
    totals: { imp: trade.value("WORLD", "imp", year), exp: trade.value("WORLD", "exp", year) },
    imp: partnersFromEurostat(trade, "imp", year),
    exp: partnersFromEurostat(trade, "exp", year),
  };
}

function loadCompleteYear(state, year) {
  const known = state.byYear.get(year);
  if (known?.complete) return Promise.resolve(known);
  if (!state.pending.has(year)) {
    const request = (async () => {
      const coveredByLiveData = state.liveData?.years().includes(String(year));
      const trade = coveredByLiveData ? state.liveData : await fetchLuxembourgTrade({ product: state.code, years: [year, year - 1] });
      const yearData = yearFromEurostat(trade, year);
      state.byYear.set(year, yearData);
      return yearData;
    })();
    const forget = () => state.pending.delete(year);
    state.pending.set(year, request);
    request.then(forget, forget);
  }
  return state.pending.get(year);
}

function yearFigures(flow, yearData) {
  const total = yearData.totals[flow] ?? null;
  const rows = (yearData[flow] || []).filter(([, value, previous]) => value || previous);
  const countries = rows
    .filter(([code, value]) => code !== UNSPECIFIED_PARTNER && value)
    .map(([code, value, previous]) => ({ code, value, previous, share: total ? value / total : null }));
  const unspecified = rows.find(([code]) => code === UNSPECIFIED_PARTNER);
  return { year: yearData.year, total, countries, unspecified: unspecified?.[1] || 0, data: yearData };
}

function figuresOfYear(state, yearData) {
  const index = seriesYears(state).indexOf(String(yearData.year));
  const series = state.entry.series[state.flow] || [];
  return { ...yearFigures(state.flow, yearData), index, previousYear: series[index - 1] ?? null, tenYearsAgo: series[index - 10] ?? null };
}

function latestFigures(state) { return figuresOfYear(state, yearFromSiteFiles(state)); }

function evolutionPeriod(state) {
  const years = seriesYears(state).map(Number);
  const until = Math.max(state.year, years[0] + 1);
  return { from: state.from >= years[0] && state.from < until ? state.from : years[0], until };
}

function withinEvolutionPeriod(state, values) {
  const { from, until } = evolutionPeriod(state);
  const years = seriesYears(state).map(Number);
  return (values || years.map(() => null)).filter((_, index) => years[index] >= from && years[index] <= until);
}

function europeanShare(world, countries) {
  const isEuropean = (code) => world.features.find((feature) => feature.id === code)?.region === "europe";
  return countries.filter((row) => isEuropean(row.code)).reduce((sum, row) => sum + (row.share || 0), 0);
}

function productTabs(state) {
  return [
    { id: "carte", label: t("tab.map"), icon: "map" },
    { id: "solde", label: t("tab.balance"), icon: "scale" },
    { id: "classement", label: t("tab.ranking"), icon: "chart-bar-big" },
    { id: "evolution", label: t("tab.evolution"), icon: "chart-line" },
    ...(state.entry.monthly?.[state.flow] ? [{ id: "mois", label: t("tab.months"), icon: "chart-bar-big" }] : []),
    { id: "saisonnalite", label: t("tab.seasonality"), icon: "calendar-days" },
    { id: "tableau", label: t("tab.table"), icon: "table-2" },
  ];
}

function embedPath(state) {
  const year = state.year !== state.latest ? `&annee=${state.year}` : "";
  const { from } = evolutionPeriod(state);
  const usesPeriod = state.view === "evolution" || state.view === "saisonnalite";
  const since = usesPeriod && from !== Number(seriesYears(state)[0]) ? `&depuis=${from}` : "";
  const neighbours = state.neighboursHidden ? "&voisins=non" : "";
  return `integrer/produit/${state.code}?flux=${state.flow}&vue=${state.view}${year}${since}${neighbours}&lang=${lang()}`;
}

function paintPage(main, state) {
  const name = displayName(state);
  const figures = latestFigures(state);
  state.latestFigures = figures;
  state.shownFigures = figures;
  const title = t(state.flow === "imp" ? "product.titleImp" : "product.titleExp", { name });
  document.title = `${name} · ${t("site.title")}`;
  if (!state.zone) state.zone = europeanShare(state.world, figures.countries) >= EUROPE_ZONE_MINIMUM_SHARE ? "europe" : "world";
  const tabs = productTabs(state);
  if (!tabs.some((tab) => tab.id === state.view)) state.view = "carte";
  main.innerHTML = `<div class="page">
    ${state.embed ? "" : breadcrumb(state)}
    <div class="flow-swap" data-role="swap">
      <section class="intro" style="padding-top:${state.embed ? 16 : 24}px">
        ${state.embed ? "" : `<div style="margin-bottom:18px">${flowSwitch(state.flow)}</div>`}
        <h1>${escapeHtml(title)}</h1>
        <p class="lede" data-role="lede">${lede(state, figures, name)}</p>
        ${state.embed ? "" : `<div data-role="details">${details(state, figures)}</div>`}
      </section>
      ${figure({ id: "product-figure", title: escapeHtml(chartTitleText(state, figures, name)), subtitle: chartSubtitle(state, figures), tabs, active: state.view, milestones: true, level: 2 })}
      ${state.embed ? "" : `<p class="more-link"><a href="${href("comparer", { produit: state.code, flux: state.flow })}">${escapeHtml(t("compare.link"))}${icon("arrow-right")}</a></p>`}
      ${state.embed ? "" : `${notesSection(state, figures, name)}<div data-role="year-sections">${yearSections(state, figures)}</div>${relatedSection(state)}${officialCodeSection(state)}`}
    </div>
  </div>`;
  state.main = main;
  const root = main.querySelector("#product-figure");
  const draw = () => drawView(root, state, name);
  draw();
  if (state.year !== state.latest) paintChosenYear(state, name);
  bindFigure(root, {
    tab: (view) => {
      state.view = view;
      updateParams({ vue: view });
      draw();
    },
    csv: () => csvFor(state, state.shownFigures),
    explain: () => explanation(state, state.shownFigures, name),
    embedPath: () => embedPath(state),
    milestones: draw,
  });
  bindFlowSwitch(main, (flow) => {
    if (flow === state.flow) return;
    fadeThen(main.querySelector("[data-role=swap]"), () => repaintKeepingScrollAndFocus(main, flow, () => {
      state.flow = flow;
      state.zone = null;
      updateParams({ flux: flow });
      paintPage(main, state);
    }));
  });
}

function breadcrumb(state) {
  const crumbs = [`<a href="${href("produits")}">${escapeHtml(t("nav.products"))}</a>`];
  for (let length = 2; length < state.code.length; length += 2) {
    const parent = state.code.slice(0, length);
    crumbs.push(`<a href="${href(`produit/${parent}`, { flux: state.flow })}">${escapeHtml(productName(parent, state.bundle))}</a>`);
  }
  return `<nav class="breadcrumb" aria-label="${escapeHtml(t("breadcrumb"))}">${crumbs.join(icon("chevron-right"))}</nav>`;
}

function lede(state, figures, name) {
  if (!figures.total) return escapeHtml(t("product.none", { year: figures.year }));
  let text = t(state.flow === "imp" ? "product.ledeImp" : "product.ledeExp", { year: figures.year, value: escapeHtml(moneyLong(figures.total)), of: escapeHtml(productOf(name)) });
  const [first, second, third] = figures.countries;
  if (!first) return text;
  const forms = countryFormsOf(first.code);
  text += t(state.flow === "imp" ? "product.topImp" : "product.topExp", { Top: escapeHtml(capitalize(forms.definite)), top: escapeHtml(forms.definite), share: percent(first.share) });
  if (second) text += t("product.ahead", { second: escapeHtml(countryFormsOf(second.code).dative), s2: percent(second.share) });
  if (third) text += t("product.ahead2", { third: escapeHtml(countryFormsOf(third.code).dative), s3: percent(third.share) });
  return text + ".";
}

function yearSections(state, figures) {
  return `${componentsSection(state, figures)}${changesSection(state, figures)}`;
}

function paintChosenYear(state, name) {
  const { main } = state;
  if (!main?.isConnected) return;
  const yearData = state.byYear.get(state.year);
  if (!yearData) {
    loadCompleteYear(state, state.year).then(() => paintChosenYear(state, name)).catch(console.error);
    return;
  }
  const figures = figuresOfYear(state, yearData);
  const paint = (role, html) => { const element = main.querySelector(`[data-role=${role}]`); if (element) element.innerHTML = html; };
  paint("lede", lede(state, figures, name));
  paint("details", details(state, figures));
  paint("year-sections", yearSections(state, figures));
}

function unitPriceText(code, unitPrice) {
  if (isMeasuredInLitres(code)) return t("product.price.litre", { n: euroAmount(unitPrice) });
  return unitPrice < 0.5 ? t("product.price.tonne", { n: euroAmount(unitPrice * 1000) }) : t("product.price.kg", { n: euroAmount(unitPrice) });
}

function quantitySentence(state, figures) {
  const kilograms = state.entry.kg?.[state.flow]?.[figures.index];
  if (!kilograms) return null;
  return escapeHtml(t("product.moreMass", { mass: mass(kilograms, isMeasuredInLitres(state.code)), price: unitPriceText(state.code, figures.total / kilograms) }));
}

function trendSentence(figures) {
  const strongChange = (reference) => `<strong>${escapeHtml(signedPercent(figures.total / reference - 1))}</strong>`;
  const change = figures.previousYear ? strongChange(figures.previousYear) : null;
  const ten = figures.tenYearsAgo ? strongChange(figures.tenYearsAgo) : null;
  if (change && ten) return t("product.moreTrend", { change, ten });
  return change ? t("product.moreTrend1", { change }) : null;
}

function details(state, figures) {
  if (!figures.total) return "";
  const sentences = [quantitySentence(state, figures), trendSentence(figures)].filter(Boolean);
  return sentences.length ? `<p class="lede lede--second">${sentences.join(" ")}</p>` : "";
}

function seriesYears(state) { return state.live ? state.entry.years : store.overview.years; }

function firstYearWithData(state) {
  const years = withinEvolutionPeriod(state, seriesYears(state));
  const first = withinEvolutionPeriod(state, state.entry.series[state.flow]).findIndex(isPresent);
  return years[Math.max(0, first)];
}

function balanceTitle(figures, name) {
  const gap = largestBalanceGap(balanceScale(partnerBalances(figures.data)).values);
  if (!gap) return name;
  return t("product.balance.title", { name, gap: lang() === "de" ? capitalize(gap) : gap });
}

function chartTitleText(state, figures, name) {
  if (state.view === "evolution") return t("product.chart.evoTitle", { name, flow: t(`flow.${state.flow}.long`), first: firstYearWithData(state) });
  if (state.view === "mois") return t("product.chart.monthsTitle", { name, n: monthPeriods().length });
  if (state.view === "saisonnalite") return t("seasonality.titlePlain", { name });
  if (state.view === "solde") return balanceTitle(figures, name);
  const first = figures.countries[0];
  if (!first) return name;
  const forms = countryFormsOf(first.code);
  return t(state.flow === "imp" ? "product.chart.map" : "product.chart.mapExp", { name, share: percent(first.share), from: forms.from, to: forms.to, vers: forms.goingTo });
}

function chartSubtitle(state, figures) {
  if (state.view === "evolution") return escapeHtml(t("product.chart.evoSub"));
  if (state.view === "saisonnalite") return escapeHtml(t(state.seasonMode === "season" ? "seasonality.subSeason" : "seasonality.sub", evolutionPeriod(state)));
  if (state.view === "solde") return escapeHtml(t("product.balance.sub", { year: figures.year }));
  if (state.view === "mois") {
    const months = monthPeriods();
    return escapeHtml(t("product.chart.monthsSub", { from: monthName(months[0]), to: monthName(months.at(-1)) }));
  }
  return escapeHtml(t("product.chart.sub", { flow: t(`flow.${state.flow}.long`), year: figures.year }));
}

function showYearLoading(root, body, state, name) {
  setFigureText(root, { title: escapeHtml(name), subtitle: escapeHtml(t("year.loading", { year: state.year })) });
  body.innerHTML = `${toolbar(state)}${loadingStatus(t("year.loading", { year: state.year }))}`;
  bindToolbar(root, state, name);
}

function showYearError(root, body, state, name) {
  body.innerHTML = `${toolbar(state)}${errorAlert(t("year.error", { year: state.year }))}`;
  bindToolbar(root, state, name);
}

function figuresForChosenYear(root, body, state, name) {
  const yearData = state.byYear.get(state.year);
  const requested = { year: state.year, view: state.view };
  const stillRequested = () => root.isConnected && state.year === requested.year && state.view === requested.view;
  const redrawWhenLoaded = () => loadCompleteYear(state, state.year).then(() => { if (stillRequested()) drawView(root, state, name); });
  const needsEveryPartner = state.view === "solde";
  if (!yearData || (needsEveryPartner && !yearData.complete)) {
    showYearLoading(root, body, state, name);
    redrawWhenLoaded().catch((error) => {
      console.error(error);
      if (stillRequested()) showYearError(root, body, state, name);
    });
    return null;
  }
  if (!yearData.complete) redrawWhenLoaded().catch(() => {});
  return yearFigures(state.flow, state.neighboursHidden ? withoutPartners(yearData, NEIGHBOURS) : yearData);
}

function drawView(root, state, name) {
  const body = root.querySelector("[data-role=body]");
  body.className = "";
  paintMilestones(root, null);
  const yearly = YEARLY_VIEWS.has(state.view);
  const figures = yearly ? figuresForChosenYear(root, body, state, name) : state.latestFigures;
  if (!figures) return;
  state.shownFigures = figures;
  const neighboursHidden = state.neighboursHidden && yearly;
  const label = neighboursHidden ? `${name} ${t("neighbours.suffix")}` : name;
  setFigureText(root, {
    title: escapeHtml(chartTitleText(state, figures, label)),
    subtitle: withNeighboursNote(chartSubtitle(state, figures), neighboursHidden, state.view === "solde"),
  });
  refreshOpenExplanation(root, () => explanation(state, figures, name));
  body.innerHTML = "";
  const view = { root, body, state, name, label, figures, neighboursHidden };
  const nothingToShow = yearly && !figures.total && !(state.view === "solde" && figures.data.totals[otherFlow(state.flow)]);
  if (nothingToShow) drawNothingToShow(view);
  else PRODUCT_VIEWS[state.view](view);
  if (yearly) bindToolbar(root, state, name);
}

function drawNothingToShow({ body, state, figures, neighboursHidden }) {
  const tradedOnlyWithNeighbours = neighboursHidden && state.byYear.get(state.year)?.totals[state.flow];
  const message = tradedOnlyWithNeighbours ? t("neighbours.only", { year: figures.year }) : t("product.none", { year: figures.year });
  body.innerHTML = `${toolbar(state)}<p class="empty">${escapeHtml(message)}</p>`;
}

function mapOptions({ state, figures, label, neighboursHidden }) {
  return {
    world: state.world, view: state.zone, names: countryName,
    onSelect: (code) => { location.hash = href(`pays/${code}`, { flux: state.flow }); },
    ariaLabel: chartTitleText(state, figures, label), excluded: neighboursHidden ? new Set(NEIGHBOURS) : null,
  };
}

function drawShareMap(view) {
  const { body, state, figures, neighboursHidden } = view;
  body.innerHTML = `${toolbar(state, true)}${mapLegend(state.flow, { excluded: neighboursHidden })}
      <div data-role="map"></div>
      <div data-role="below" style="margin-top:12px"></div>`;
  const values = new Map(figures.countries.map((row) => [row.code, { share: row.share, value: row.value }]));
  mapChart(body.querySelector("[data-role=map]"), { ...mapOptions(view), values, flow: state.flow, format: money });
  body.querySelector("[data-role=below]").innerHTML = barList(rankingRows(state, figures, 5), { flow: state.flow, format: money });
}

function drawBalanceMap(view) {
  const { body, state, figures, neighboursHidden } = view;
  const { values, breaks } = balanceScale(partnerBalances(figures.data));
  body.innerHTML = `${toolbar(state, true)}${balanceLegend(breaks, money, { excluded: neighboursHidden })}<div data-role="map"></div>${balanceLists(state, values)}`;
  balanceMapChart(body.querySelector("[data-role=map]"), { ...mapOptions(view), values, balanceLabel: t("balance.label") });
}

function drawRanking({ body, state, figures }) {
  body.innerHTML = `${toolbar(state)}${barList(rankingRows(state, figures, 10), { flow: state.flow, format: money })}`;
}

function topPartnersByLatestValue(history) {
  return Object.keys(history).sort((a, b) => (history[b].at(-1) || 0) - (history[a].at(-1) || 0)).slice(0, 5);
}

function drawEvolution({ root, body, state, figures, name }) {
  const history = state.entry.history?.[state.flow] || {};
  const topPartners = topPartnersByLatestValue(history);
  const color = flowColor(state.flow);
  const milestones = paintMilestones(root, { product: state.code });
  const totals = withinEvolutionPeriod(state, state.entry.series[state.flow]);
  body.innerHTML = `<div class="toolbar"><div class="toolbar__group">${evolutionPeriodPicker(state)}</div><div class="toolbar__group"><div class="mini-switch" role="group" aria-label="${escapeHtml(t("chart.display"))}">
      <button type="button" data-mode="total" aria-pressed="true">${escapeHtml(TOTAL_LABEL[lang()])}</button>
      ${topPartners.length ? `<button type="button" data-mode="countries" aria-pressed="false">${escapeHtml(t("tab.ranking"))}</button>` : ""}</div></div></div><div data-role="chart"></div>`;
  const modeButtons = body.querySelectorAll("[data-mode]");
  const paint = (mode) => {
    setPressed(modeButtons, (button) => button.dataset.mode === mode);
    const series = mode === "total"
      ? [{ label: name, endText: money(totals.at(-1)), color, values: totals, strong: true }]
      : topPartners.map((code, rank) => ({ label: countryName(code), color: rank === 0 ? color : "var(--neutral)", values: withinEvolutionPeriod(state, history[code]), strong: rank === 0, context: rank > 0 }));
    lineChart(body.querySelector("[data-role=chart]"), { x: withinEvolutionPeriod(state, seriesYears(state)), series, format: money, height: 320, area: mode === "total", milestones, ariaLabel: chartTitleText(state, figures, name) });
  };
  modeButtons.forEach((button) => button.addEventListener("click", () => paint(button.dataset.mode)));
  paint("total");
  bindEvolutionPeriod(root, body, state, name);
}

function drawMonths({ body, state, figures, name }) {
  const values = state.entry.monthly[state.flow];
  body.innerHTML = `<div data-role="chart"></div>`;
  columnChart(body.querySelector("[data-role=chart]"), {
    x: monthPeriods().map(monthAxisLabel), values, format: money, height: 280,
    color: () => flowColor(state.flow), seriesLabel: name, labelStep: 3, ariaLabel: chartTitleText(state, figures, name), highlight: values.length - 1,
  });
}

function drawPartnerTable({ body, state, figures, label }) {
  body.innerHTML = `${toolbar(state)}<div data-role="table"></div>`;
  const rows = figures.countries.map((row) => ({ ...row, name: countryName(row.code) }));
  if (figures.unspecified) {
    rows.push({ code: UNSPECIFIED_PARTNER, name: t("unspecified"), value: figures.unspecified, share: figures.total ? figures.unspecified / figures.total : null, previous: null });
  }
  sortableTable(body.querySelector("[data-role=table]"), [
    {
      label: t("table.country"), get: (row) => row.name,
      html: (row) => (row.code === UNSPECIFIED_PARTNER ? escapeHtml(row.name) : `<a href="${href(`pays/${row.code}`, { flux: state.flow })}">${escapeHtml(row.name)}</a>`),
    },
    { label: t("table.value", { year: figures.year }), numeric: true, get: (row) => row.value, format: money },
    { label: t("table.share"), numeric: true, get: (row) => row.share, format: (share) => percent(share, 1) },
    { label: t("table.change"), numeric: true, get: (row) => (row.previous ? row.value / row.previous - 1 : null), format: (change) => signedPercent(change) },
  ], rows, { sort: 1, caption: chartTitleText(state, figures, label) });
}

function evolutionPeriodPicker(state) {
  return state.embed ? "" : periodPicker(evolutionPeriod(state), seriesYears(state).map(Number).filter((year) => year <= state.latest));
}

function bindEvolutionPeriod(root, body, state, name) {
  bindPeriodPicker(body, ({ from, until }) => {
    if (from !== undefined) {
      state.from = from;
      updateParams({ depuis: from === Number(seriesYears(state)[0]) ? null : from });
    } else {
      state.year = until;
      updateParams({ annee: until === state.latest ? null : until });
      paintChosenYear(state, name);
    }
    keepingSelectFocus(root, () => drawView(root, state, name));
  });
}

function drawSeasonalityView({ root, body, state, name }) {
  const shownView = state.view, shownFlow = state.flow, shownPeriod = evolutionPeriod(state);
  drawSeasonality(root, body, {
    product: state.code, flow: state.flow, period: shownPeriod, name, state, toolbar: evolutionPeriodPicker(state),
    isStillShown: () => root.isConnected && state.view === shownView && state.flow === shownFlow
      && evolutionPeriod(state).from === shownPeriod.from && evolutionPeriod(state).until === shownPeriod.until,
    bind: () => bindEvolutionPeriod(root, body, state, name),
  });
}

const PRODUCT_VIEWS = {
  carte: drawShareMap, solde: drawBalanceMap, classement: drawRanking, evolution: drawEvolution, mois: drawMonths, saisonnalite: drawSeasonalityView, tableau: drawPartnerTable,
};

function toolbar(state, withZone = false) {
  return yearlyToolbar({
    year: state.year, years: siteYears().filter((year) => year <= state.latest),
    neighboursHidden: state.neighboursHidden, zone: withZone ? state.zone : null,
  });
}

function bindToolbar(root, state, name) {
  const change = (changes, params) => {
    const yearChanged = "year" in changes && changes.year !== state.year;
    Object.assign(state, changes);
    updateParams(params);
    keepingSelectFocus(root, () => drawView(root, state, name));
    if (yearChanged) paintChosenYear(state, name);
  };
  bindYearlyToolbar(root.querySelector("[data-role=body]"), {
    onYear: (year) => change({ year }, { annee: year === state.latest ? null : year }),
    onZone: (zone) => change({ zone }, { zone }),
    onNeighbours: (hidden) => change({ neighboursHidden: hidden }, { voisins: hidden ? "non" : null }),
  });
}

function partnerBalances(yearData) {
  const balances = new Map();
  for (const flow of ["imp", "exp"]) {
    for (const [code, value] of yearData[flow] || []) {
      if (code === UNSPECIFIED_PARTNER) continue;
      const balance = balances.get(code) || { code, imp: null, exp: null };
      balance[flow] = value;
      balances.set(code, balance);
    }
  }
  return [...balances.values()];
}

function balanceLists(state, values) {
  const unbalanced = [...values.entries()].map(([code, entry]) => ({ code, ...entry })).filter((entry) => entry.balanceClass);
  const largestGap = Math.max(1, ...unbalanced.map((entry) => Math.abs(entry.balance)));
  const list = (flow) => {
    const rows = unbalanced.filter((entry) => (flow === "imp" ? entry.balance < 0 : entry.balance > 0))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 5)
      .map((entry) => ({ label: countryName(entry.code), value: Math.abs(entry.balance), href: href(`pays/${entry.code}`, { flux: state.flow }) }));
    return `<section><h4><i class="dot dot--${flow}"></i>${escapeHtml(t(flow === "imp" ? "balance.listImp" : "balance.listExp"))}</h4>
      ${rows.length ? barList(rows, { flow, format: money, max: largestGap }) : `<p class="note">${escapeHtml(t("balance.none"))}</p>`}</section>`;
  };
  return `<div class="balance-lists">${list("imp")}${list("exp")}</div>`;
}

function rankingRows(state, figures, limit) {
  const shareOfTotal = (value) => (figures.total ? value / figures.total : null);
  const rows = figures.countries.slice(0, limit).map((row) => ({
    label: countryName(row.code), value: row.value, share: row.share, href: href(`pays/${row.code}`, { flux: state.flow }),
  }));
  const others = figures.countries.slice(limit).reduce((sum, row) => sum + row.value, 0);
  if (others > 0) rows.push({ label: `${t("others")} (${figures.countries.length - limit})`, value: others, share: shareOfTotal(others), muted: true });
  if (figures.unspecified) rows.push({ label: t("unspecified"), value: figures.unspecified, share: shareOfTotal(figures.unspecified), muted: true });
  return rows;
}

function notesSection(state, figures, name) {
  const notes = [];
  const top = figures.countries[0];
  if (state.flow === "imp" && top && EU27.includes(top.code)) {
    notes.push(t("product.note.dispatch", { Top: capitalize(countryFormsOf(top.code).definite), name_lc: lowerFirst(name) }));
  }
  const series = state.entry.series[state.flow] || [];
  const first = series.findIndex(isPresent);
  if (first >= 0 && series.slice(first).some((value) => !isPresent(value))) notes.push(t("product.note.gaps"));
  if (figures.total && figures.total < SMALL_TRADE_LIMIT) notes.push(t("product.note.small"));
  notes.push(t("product.note.money"));
  if (state.live) notes.push(t("product.live"));
  return goodToKnowSection(notes);
}

function childrenInYear(state, figures) {
  if (figures.year === state.latest) return (state.entry.children?.[state.flow] || []).filter(([, value]) => value);
  const { code, bundle, flow } = state;
  return Object.values(bundle?.items || {})
    .filter((item) => item.code.length === code.length + 2 && item.code.startsWith(code))
    .map((item) => [item.code, item.series[flow]?.[figures.index] ?? null])
    .filter(([, value]) => value)
    .sort((a, b) => b[1] - a[1]);
}

function componentsSection(state, figures) {
  const components = childrenInYear(state, figures);
  if (!components.length || !figures.total) return "";
  const rows = components.slice(0, 12).map(([code, value]) => ({
    label: productName(code, state.bundle), value, share: value / figures.total,
    href: state.bundle?.items?.[code] ? href(`produit/${code}`, { flux: state.flow }) : undefined,
  }));
  return `<section class="section" style="padding-top:56px"><h2>${escapeHtml(t("product.inside"))}</h2>
    <p class="section__lede">${escapeHtml(t("product.insideLede", { year: figures.year }))}</p>${barList(rows, { flow: state.flow, format: money })}</section>`;
}

function componentContributions(state, figures) {
  const items = childrenInYear(state, figures).flatMap(([code]) => {
    const series = state.bundle?.items?.[code]?.series?.[state.flow];
    if (!series) return [];
    return [{ label: productName(code, state.bundle), before: series[figures.index - 1], after: series[figures.index], href: href(`produit/${code}`, { flux: state.flow }) }];
  });
  const series = state.entry.series[state.flow] || [];
  return yearOnYearContributions(items, series[figures.index - 1], series[figures.index]);
}

function changesSection(state, figures) {
  const changes = changeSection(componentContributions(state, figures), { year: figures.year, flow: state.flow });
  return changes ? `<section class="section" style="padding-top:56px">${changes}</section>` : "";
}

function siblingCodes(state) {
  const { code, flow, bundle } = state;
  if (code.length === 2) return store.overview.chapters[flow].map(([chapter]) => chapter).filter((chapter) => chapter !== code).slice(0, 8);
  const parent = code.slice(0, code.length - 2);
  const latestValue = (sibling) => (sibling.series[flow] || []).at(-1) || 0;
  return Object.values(bundle.items)
    .filter((sibling) => sibling.code.length === code.length && sibling.code.startsWith(parent) && sibling.code !== code)
    .sort((a, b) => latestValue(b) - latestValue(a))
    .slice(0, 8).map((sibling) => sibling.code);
}

function relatedSection(state) {
  if (!state.bundle) return "";
  const siblings = siblingCodes(state);
  if (!siblings.length) return "";
  return `<section class="section" style="padding-top:48px"><h2 style="font-size:var(--fs-title)">${escapeHtml(t("product.related"))}</h2>
    <ul class="chips" role="list">${siblings.map((code) => `<li><a class="chip" href="${href(`produit/${code}`, { flux: state.flow })}">${representativeProductIcon(code)}${escapeHtml(productName(code, state.bundle))}</a></li>`).join("")}</ul></section>`;
}

function officialCodeSection(state) {
  const official = state.bundle?.official?.[state.code] || state.entry.official;
  const label = official ? official[lang()] || official.fr : null;
  return `<section class="section" style="padding-top:48px"><details class="prose">
    <summary style="cursor:pointer;font-weight:650">${escapeHtml(t("product.code"))}</summary>
    <p style="margin-top:12px">${escapeHtml(t("product.codeText", { level: t(`product.level.${state.code.length}`), code: state.code }))} ${escapeHtml(t("product.levels"))}</p>
    ${label ? `<blockquote class="note" style="margin:8px 0 0">« ${escapeHtml(label)} »</blockquote>` : ""}
    <p class="note" style="margin-top:8px"><a href="${href("comprendre", { terme: "codes" })}">${escapeHtml(t("nav.learn"))}</a></p>
  </details></section>`;
}

function csvFor(state, figures) {
  const base = `${state.code}-${state.flow}`;
  if (state.view === "solde") {
    const { values } = balanceScale(partnerBalances(figures.data));
    return {
      name: `${state.code}-balance-${figures.year}.csv`,
      rows: [["partner_code", "partner", "imports_eur", "exports_eur", "balance_eur"],
        ...[...values].sort((a, b) => a[1].balance - b[1].balance).map(([code, entry]) => [code, countryName(code), entry.imp, entry.exp, entry.balance])],
    };
  }
  if (state.view === "evolution") {
    const history = state.entry.history?.[state.flow] || {};
    const partners = Object.keys(history);
    const total = withinEvolutionPeriod(state, state.entry.series[state.flow]);
    const partnerValues = partners.map((code) => withinEvolutionPeriod(state, history[code]));
    const years = withinEvolutionPeriod(state, seriesYears(state));
    return {
      name: `${base}-evolution-${years[0]}-${years.at(-1)}.csv`,
      rows: [["year", "total_eur", ...partners], ...years.map((year, index) => [year, total[index], ...partnerValues.map((values) => values[index])])],
    };
  }
  if (state.view === "saisonnalite") {
    const { from, until } = evolutionPeriod(state);
    return seasonalityCsv(state.seasonalityRows || [], `${base}-months-${from}-${until}.csv`);
  }
  if (state.view === "mois") {
    const values = state.entry.monthly[state.flow];
    return { name: `${base}-months.csv`, rows: [["month", "value_eur"], ...monthPeriods().map((month, index) => [month, values[index]])] };
  }
  const unspecifiedRow = figures.unspecified ? [[UNSPECIFIED_PARTNER, t("unspecified"), figures.unspecified, figures.total ? (figures.unspecified / figures.total).toFixed(4) : "", ""]] : [];
  return {
    name: `${base}-${figures.year}.csv`,
    rows: [["partner_code", "partner", "value_eur", "share", `value_eur_${figures.year - 1}`],
      ...figures.countries.map((row) => [row.code, countryName(row.code), row.value, row.share?.toFixed(4), row.previous]),
      ...unspecifiedRow],
  };
}

function balanceExplanation(figures) {
  const { values, breaks } = balanceScale(partnerBalances(figures.data));
  const entries = [...values.values()];
  return t("balance.explain", {
    year: figures.year, low: money(breaks[0]), high: money(breaks[1]),
    sells: entries.filter((entry) => entry.balanceClass > 0).length,
    buys: entries.filter((entry) => entry.balanceClass < 0).length,
    even: entries.filter((entry) => !entry.balanceClass).length,
  });
}

function mapExplanation(state, figures, name) {
  const [first, second] = figures.countries;
  const topThree = figures.countries.slice(0, 3);
  return t("product.explain.map", {
    flow: t(`flow.${state.flow}.long`), of: productOf(name), year: figures.year, Top: capitalize(countryFormsOf(first.code).definite), share: percent(first.share),
    ahead: second ? t("product.ahead", { second: countryFormsOf(second.code).dative, s2: percent(second.share) }) : "",
    n: topThree.length, cum: percent(topThree.reduce((sum, row) => sum + row.share, 0)),
  });
}

function rankingExplanation(state, figures) {
  const [first] = figures.countries;
  return t("product.explain.ranking", {
    year: figures.year, Top: capitalize(countryFormsOf(first.code).definite), share: percent(first.share),
    flow: t(`flow.${state.flow}.long`), value: moneyLong(first.value), count: figures.countries.length,
  });
}

function evolutionExplanation(state, figures) {
  const years = seriesYears(state);
  const series = state.entry.series[state.flow];
  const first = series.findIndex((value) => value);
  let peak = first;
  series.forEach((value, index) => { if ((value || 0) > (series[peak] || 0)) peak = index; });
  return t("product.explain.evolution", {
    flow: t(`flow.${state.flow}.long`), first: years[first], start: moneyLong(series[first]), end: moneyLong(figures.total), year: figures.year,
    change: signedPercent(figures.total / series[first] - 1), peakYear: years[peak], peak: moneyLong(series[peak]),
  });
}

function explanationText(state, figures, name) {
  const hasTopPartner = Boolean(figures.countries[0]);
  if (state.view === "solde") return balanceExplanation(figures);
  if (state.view === "carte" && hasTopPartner) return mapExplanation(state, figures, name);
  if (state.view === "classement" && hasTopPartner) return rankingExplanation(state, figures);
  if (state.view === "evolution") return evolutionExplanation(state, figures);
  if (state.view === "mois") return t("product.explain.months");
  if (state.view === "saisonnalite") return t("seasonality.explain");
  return t("product.explain.table");
}

function explanation(state, figures, name) {
  return `<p>${escapeHtml(explanationText(state, figures, name))}</p><p class="note">${escapeHtml(t("product.explain.caveat"))}</p>`;
}

async function loadLiveEntry(code) {
  const latest = latestYear();
  const since = latest - LIVE_HISTORY_YEARS;
  const trade = await fetchLuxembourgTrade({ product: code, since });
  const years = [];
  for (let year = since; year <= latest; year++) years.push(String(year));
  const entry = { code, live: true, latest, years, series: {}, partners: {}, history: {}, children: {}, monthly: null, kg: {} };
  const latestYearData = yearFromEurostat(trade, latest);
  for (const flow of ["imp", "exp"]) {
    entry.series[flow] = years.map((year) => trade.value("WORLD", flow, year));
    entry.partners[flow] = latestYearData[flow];
    const historyPartners = latestYearData[flow].filter(([partner]) => partner !== UNSPECIFIED_PARTNER).slice(0, LIVE_HISTORY_PARTNERS);
    entry.history[flow] = Object.fromEntries(historyPartners.map(([partner]) => [partner, years.map((year) => trade.value(partner, flow, year))]));
  }
  const catalog = await loadData(`catalog-${lang()}.json`).catch(() => ({}));
  const label = catalog[code] || code;
  entry.name = { fr: label, en: label, de: label };
  return { entry, trade };
}
