import {
  countryName, flowParam, href, isProductCode, latestYear, loadData, NEIGHBOURS, periodParam, productName, siteYears, store, withoutCodeSuffix, yearParam,
} from "../data.js";
import { escapeHtml, euroAmount, lang, lowerFirst, money, moneyLong, number, ordinal, percent, percentAxis, productOf, t } from "../i18n.js";
import { icon } from "../icons.js";
import { barList, lineChart } from "../charts.js";
import {
  bindFigure, bindFlowSwitch, bindYearPicker, errorAlert, fadeThen, figure, flowSwitch, goodToKnowSection, keepingSelectFocus, loadingStatus,
  periodPicker, refreshOpenExplanation, setFigureText, setPressed, sortableTable, yearPicker,
} from "../ui.js";
import { updateParams } from "../app.js";
import { fetchReportersWorldTrade } from "../live.js";
import { search } from "../search.js";
import { productOption } from "../searchbox.js";
import { bindCombobox, isSearchable } from "../combobox.js";
import { representativeProductIcon, SUGGESTED_PRODUCTS } from "../catalog.js";
import { EU27, MEASURES, measureSeries, measureTable } from "../measures.js";

const VIEWS = ["classement", "evolution", "tableau"];
const DEFAULT_PEERS = NEIGHBOURS;
const MAX_PEERS = 6;
const PICKER_SEARCH_DELAY_MS = 120;

export async function render(main, _parts, params, { embed = false } = {}) {
  const requestedProduct = params.get("produit") || "";
  const product = isProductCode(requestedProduct) ? requestedProduct : "";
  const measure = MEASURES.includes(params.get("mesure")) ? params.get("mesure") : "habitant";
  const state = {
    product, embed,
    flow: flowParam(params),
    measure: !product && measure === "part" ? "habitant" : measure,
    view: VIEWS.includes(params.get("vue")) ? params.get("vue") : "classement",
    year: yearParam(params),
    from: periodParam(params).from,
    peers: parsePeers(params.get("pays")),
  };
  state.name = await displayName(product);
  if (!main.isConnected) return;
  document.title = `${t("nav.compare")} · ${t("site.title")}`;
  paint(main, state);
  await loadComparison(main, state);
}

function parsePeers(requested) {
  const peers = (requested || "").split(",").map((code) => code.trim().toUpperCase()).filter((code) => EU27.includes(code) && code !== "LU");
  return peers.length ? [...new Set(peers)].slice(0, MAX_PEERS) : [...DEFAULT_PEERS];
}

async function displayName(code) {
  if (!code) return t("compare.allGoods");
  let name = productName(code);
  if (name === code) {
    const catalog = await loadData(`catalog-${lang()}.json`).catch(() => ({}));
    name = catalog[code] || code;
  }
  return withoutCodeSuffix(name);
}

function peersParam(peers) {
  const joined = peers.join(",");
  return joined === DEFAULT_PEERS.join(",") ? "" : joined;
}

function compareHref(state, product) {
  return href("comparer", {
    produit: product, flux: state.flow, mesure: !product && state.measure === "part" ? "" : state.measure,
    vue: state.view === "classement" ? "" : state.view, annee: state.year === latestYear() ? "" : state.year,
    depuis: state.view === "evolution" && evolutionPeriod(state).from !== store.meta.first_year ? evolutionPeriod(state).from : "",
    pays: peersParam(state.peers),
  });
}

function paint(main, state) {
  const tabs = [
    { id: "classement", label: t("tab.ranking"), icon: "chart-bar-big" },
    { id: "evolution", label: t("tab.evolution"), icon: "chart-line" },
    { id: "tableau", label: t("tab.table"), icon: "table-2" },
  ];
  main.innerHTML = `<div class="page">
    ${state.embed ? "" : `<section class="intro">
      <h1>${escapeHtml(t("compare.title"))}</h1>
      <p class="lede" data-role="lede">${escapeHtml(t("compare.loading"))}</p>
      ${productPicker(state)}
      <div style="margin-top:22px">${flowSwitch(state.flow)}</div>
    </section>`}
    <div class="flow-swap" data-role="swap">
      ${figure({ id: "compare-figure", title: escapeHtml(state.name), tabs, active: state.view, level: 2 })}
      ${state.embed ? "" : goodToKnowSection(["workers", "ports", "years", "live"].map((note) => t(`compare.note.${note}`)))}
    </div>
  </div>`;
  if (state.embed) return;
  bindProductPicker(main, state);
  bindFlowSwitch(main.querySelector(".intro"), (flow) => {
    if (flow === state.flow || !state.data) return;
    const swap = main.querySelector("[data-role=swap]");
    fadeThen(swap, () => {
      state.flow = flow;
      updateParams({ flux: flow });
      setPressed(main.querySelectorAll(".intro .switch button"), (button) => button.dataset.flow === flow);
      draw(main, state);
      swap.classList.remove("is-swapping");
    });
  });
}

function showLoadError(main, state, body) {
  body.innerHTML = `${errorAlert(t("compare.error"))}<p style="margin-top:12px"><button type="button" class="button button--ghost" data-role="retry">${icon("rotate-ccw")}${escapeHtml(t("compare.retry"))}</button></p>`;
  const lede = main.querySelector("[data-role=lede]");
  if (lede) lede.textContent = t("compare.error");
  body.querySelector("[data-role=retry]").addEventListener("click", () => loadComparison(main, state));
}

function explanation(state) {
  return `<p>${escapeHtml(t("compare.explain", { flowNoun: t(`compare.flowNoun.${state.flow}`) }))}</p>`;
}

async function loadComparison(main, state) {
  const root = main.querySelector("#compare-figure");
  const body = root.querySelector("[data-role=body]");
  body.innerHTML = loadingStatus(t("compare.loading"));
  try {
    const since = store.meta.first_year;
    const [population, trade, allGoods] = await Promise.all([
      loadData("population.json"),
      fetchReportersWorldTrade({ product: state.product || "TOTAL", reporters: EU27, since }),
      state.product ? fetchReportersWorldTrade({ product: "TOTAL", reporters: EU27, since }) : null,
    ]);
    if (!main.isConnected) return;
    state.data = { population, value: trade.value, total: (allGoods || trade).value };
  } catch (error) {
    if (!main.isConnected) return;
    console.error(error);
    showLoadError(main, state, body);
    return;
  }
  bindFigure(root, {
    tab: (view) => {
      state.view = view;
      updateParams({ vue: view === "classement" ? null : view });
      draw(main, state);
    },
    csv: () => csvFor(state),
    explain: () => explanation(state),
    embedPath: () => `integrer/${compareHref(state, state.product).slice(2)}`,
  });
  draw(main, state);
}

function measureOptions(state) {
  return { value: state.data.value, total: state.data.total, population: state.data.population, flow: state.flow, measure: state.measure };
}

function sentenceWords(state, table) {
  const luxembourg = table.rows.find((row) => row.code === "LU");
  return {
    lu: luxembourg,
    flowNoun: t(`compare.flowNoun.${state.flow}`),
    year: state.year,
    count: table.count,
    FlowNoun: t(`compare.flowNom.${state.flow}`),
    of: state.product ? productOf(state.name) : t("compare.ofAll"),
    name: state.product ? (lang() === "de" ? state.name : lowerFirst(state.name)) : t("compare.nameAll"),
    ord: luxembourg?.rank ? ordinal(luxembourg.rank) : "",
    n: luxembourg?.rank ?? "",
  };
}

function measureFormat(measure, inWords = false) {
  if (measure === "part") return (value) => percent(value, Math.abs(value) < 0.01 ? 2 : 1);
  if (measure === "habitant") return inWords ? moneyLong : euroAmount;
  return inWords ? moneyLong : money;
}

function ledeHtml(state, table, words) {
  if (words.lu?.metric == null) return escapeHtml(t("compare.lede.none", { year: state.year }));
  const inWords = measureFormat(state.measure, true);
  const strong = (value) => `<strong>${escapeHtml(value)}</strong>`;
  const vars = { ...words, of: escapeHtml(words.of), name: escapeHtml(words.name), value: strong(inWords(words.lu.metric)), eu: strong(inWords(table.eu.metric)), ord: escapeHtml(words.ord) };
  if (state.measure === "euros") {
    const perHead = measureTable({ ...measureOptions(state), measure: "habitant", year: state.year }).rows.find((row) => row.code === "LU");
    Object.assign(vars, { ordHead: escapeHtml(perHead?.rank ? ordinal(perHead.rank) : ""), nHead: perHead?.rank ?? "" });
  }
  return t(`compare.lede.${state.measure}.${state.flow}`, vars);
}

function chartTitle(state, table, words) {
  if (words.lu?.metric == null) return state.name;
  const ratioToEu = table.eu.metric ? words.lu.metric / table.eu.metric : null;
  if (state.view === "evolution" && ratioToEu) {
    const measure = t(`compare.measureLong.${state.measure}`, { flowNoun: words.flowNoun });
    return t("compare.title.evolution", { Measure: measure, x: number(ratioToEu, ratioToEu < 10 ? 1 : 0), year: state.year });
  }
  return t(`compare.title.${state.measure}`, words);
}

function evolutionPeriod(state) {
  const until = Math.max(state.year, store.meta.first_year + 1);
  return { from: state.from < until ? state.from : store.meta.first_year, until };
}

function evolutionYears(state) {
  const { from, until } = evolutionPeriod(state);
  return siteYears().filter((year) => year >= from && year <= until);
}

function subtitle(state, words) {
  const { from, until } = evolutionPeriod(state);
  const when = state.view === "evolution" ? t("compare.when.range", { first: from, last: until }) : t("compare.when.year", { year: state.year });
  return t(`compare.sub.${state.measure}`, { ...words, when });
}

function toolbar(state) {
  const measures = MEASURES.filter((measure) => measure !== "part" || state.product);
  const button = (measure) => `<button type="button" data-measure="${measure}" aria-pressed="${state.measure === measure}">${escapeHtml(t(`compare.measure.${measure}`))}</button>`;
  return `<div class="toolbar"><div class="toolbar__group"><div class="mini-switch" role="group" aria-label="${escapeHtml(t("compare.measure"))}">${measures.map(button).join("")}</div></div>
    <div class="toolbar__group">${state.view === "evolution" ? periodPicker(evolutionPeriod(state)) : yearPicker(state.year, siteYears())}</div></div>`;
}

function drawRanking(body, state, table) {
  const rows = table.ranked.map((row) => ({ label: `${row.rank}. ${countryName(row.code)}`, value: row.metric, accent: row.code === "LU" }));
  if (table.eu.metric !== null && state.measure !== "euros") {
    const firstBelowEu = rows.findIndex((row) => row.value < table.eu.metric);
    rows.splice(firstBelowEu < 0 ? rows.length : firstBelowEu, 0, { label: t("compare.euAverage"), value: table.eu.metric, muted: true });
  }
  const ranking = rows.length
    ? barList(rows, { flow: state.flow, format: measureFormat(state.measure), short: true })
    : `<p class="empty">${escapeHtml(t("compare.lede.none", { year: state.year }))}</p>`;
  body.innerHTML = `${toolbar(state)}${ranking}`;
}

function peersPicker(state) {
  const tokens = state.peers.map((code) => `<button type="button" class="token" data-remove="${code}" aria-label="${escapeHtml(t("compare.remove", { name: countryName(code) }))}">${escapeHtml(countryName(code))}${icon("x")}</button>`).join("");
  const others = EU27.filter((code) => code !== "LU" && !state.peers.includes(code)).sort((a, b) => countryName(a).localeCompare(countryName(b), lang()));
  const addSelect = state.peers.length < MAX_PEERS ? `<label class="year-pick"><span class="sr-only">${escapeHtml(t("compare.add"))}</span><span class="year-pick__box"><select data-role="add">
    <option value="">${escapeHtml(t("compare.add"))}</option>${others.map((code) => `<option value="${code}">${escapeHtml(countryName(code))}</option>`).join("")}</select>${icon("chevron-down")}</span></label>` : "";
  return `<div class="peers"><span class="peers__label">${escapeHtml(t("compare.peers"))}</span>${tokens}${addSelect}</div>`;
}

function drawEvolution(body, state, table, words) {
  body.innerHTML = `${toolbar(state)}${peersPicker(state)}<div data-role="chart"></div>`;
  const years = evolutionYears(state);
  const options = measureOptions(state);
  const series = [
    ...state.peers.map((code) => ({ label: countryName(code), color: "var(--context)", values: measureSeries(options, years, code), context: true })),
    { label: t("compare.euAverage"), color: "var(--neutral)", values: measureSeries(options, years, "EU") },
    { label: countryName("LU"), color: "var(--accent)", values: measureSeries(options, years, "LU"), strong: true },
  ];
  lineChart(body.querySelector("[data-role=chart]"), {
    x: years.map(String), series, format: measureFormat(state.measure), axisFormat: state.measure === "part" ? percentAxis : money,
    height: 360, ariaLabel: chartTitle(state, table, words),
  });
}

const TABLE_SORT_COLUMN = { euros: 1, habitant: 2, part: 3 };

function drawTable(body, state, table, words) {
  body.innerHTML = `${toolbar(state)}<div data-role="table"></div>`;
  const rows = table.rows.map((row) => ({ ...row, name: countryName(row.code) }));
  rows.push({ ...table.eu, name: t("compare.euAverage"), rank: null });
  const columns = [
    { label: t("table.country"), get: (row) => row.name, html: (row) => (row.code === "LU" ? `<strong>${escapeHtml(row.name)}</strong>` : escapeHtml(row.name)) },
    { label: t("compare.col.value", { FlowNoun: words.FlowNoun, year: state.year }), numeric: true, get: (row) => row.value, format: money },
    { label: t("compare.measure.habitant"), numeric: true, get: (row) => row.perHead, format: euroAmount },
    ...(state.product ? [{ label: t("compare.measure.part"), numeric: true, get: (row) => row.share, format: measureFormat("part") }] : []),
    { label: t("compare.col.rank"), numeric: true, get: (row) => row.rank ?? null, format: (rank) => (rank === null || rank === undefined ? "" : String(rank)) },
  ];
  sortableTable(body.querySelector("[data-role=table]"), columns, rows, { sort: TABLE_SORT_COLUMN[state.measure], direction: -1, caption: chartTitle(state, table, words) });
}

const COMPARE_VIEWS = { classement: drawRanking, evolution: drawEvolution, tableau: drawTable };

function draw(main, state) {
  const root = main.querySelector("#compare-figure");
  const table = measureTable({ ...measureOptions(state), year: state.year });
  const words = sentenceWords(state, table);
  const lede = main.querySelector("[data-role=lede]");
  if (lede) lede.innerHTML = ledeHtml(state, table, words);
  setFigureText(root, { title: escapeHtml(chartTitle(state, table, words)), subtitle: escapeHtml(subtitle(state, words)) });
  COMPARE_VIEWS[state.view](root.querySelector("[data-role=body]"), state, table, words);
  bindTools(main, state);
  refreshOpenExplanation(root, () => explanation(state));
  main.querySelectorAll("[data-chip]").forEach((chip) => chip.setAttribute("href", compareHref(state, chip.dataset.chip)));
}

function bindTools(main, state) {
  const body = main.querySelector("#compare-figure [data-role=body]");
  const change = (changes, params) => {
    Object.assign(state, changes);
    updateParams(params);
    keepingSelectFocus(main, () => draw(main, state));
  };
  const changePeers = (peers) => change({ peers }, { pays: peersParam(peers) || null });
  body.querySelectorAll("[data-measure]").forEach((button) => button.addEventListener("click", () => {
    const measure = button.dataset.measure;
    change({ measure }, { mesure: measure === "habitant" ? null : measure });
  }));
  bindYearPicker(body, (year) => change({ year }, { annee: year === latestYear() ? null : year }));
  body.querySelector("[data-role=from]")?.addEventListener("change", (event) => {
    const from = Number(event.target.value);
    change({ from }, { depuis: from === store.meta.first_year ? null : from });
  });
  body.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
    changePeers(state.peers.filter((code) => code !== button.dataset.remove));
    body.querySelector("[data-role=add]")?.focus();
  }));
  body.querySelector("[data-role=add]")?.addEventListener("change", (event) => {
    if (event.target.value) changePeers([...state.peers, event.target.value]);
  });
}

function csvFor(state) {
  const base = `comparaison-${state.product || "total"}-${state.flow}`;
  if (state.view === "evolution") {
    const years = siteYears();
    const codes = ["LU", "EU", ...state.peers];
    const series = codes.map((code) => measureSeries(measureOptions(state), years, code));
    return { name: `${base}-${state.measure}.csv`, rows: [["year", ...codes], ...years.map((year, index) => [year, ...series.map((values) => values[index])])] };
  }
  const table = measureTable({ ...measureOptions(state), year: state.year });
  return {
    name: `${base}-${state.year}.csv`,
    rows: [["reporter", "name", "value_eur", "population", "per_inhabitant_eur", ...(state.product ? ["share_of_total"] : []), `rank_${state.measure}`],
      ...table.rows.map((row) => [row.code, countryName(row.code), row.value, row.population, row.perHead?.toFixed(2), ...(state.product ? [row.share?.toFixed(6)] : []), row.rank ?? ""])],
  };
}

function productPicker(state) {
  const chips = [["", t("compare.allGoods")], ...SUGGESTED_PRODUCTS.map((code) => [code, productName(code)])];
  return `<form class="search picker" data-role="picker" role="search" autocomplete="off">
    <label class="picker__label" for="compare-product">${escapeHtml(t("compare.product"))}</label>
    <div class="search__box"><div class="search__field">${icon("search")}<input id="compare-product" name="q" type="search" value="${state.product ? escapeHtml(state.name) : ""}"
      placeholder="${escapeHtml(t("compare.productPlaceholder"))}" role="combobox" aria-expanded="false" aria-controls="compare-product-list" aria-autocomplete="list" enterkeyhint="search"></div>
      <div class="search__results" id="compare-product-list" role="listbox" hidden></div></div>
    <ul class="chips" role="list">${chips.map(([code, label]) => `<li><a class="chip" data-chip="${code}" href="${compareHref(state, code)}"${code === state.product ? ' aria-current="true"' : ""}>${representativeProductIcon(code)}${escapeHtml(label)}</a></li>`).join("")}</ul>
  </form>`;
}

function pickerOptions(state, codes) {
  return codes.length
    ? codes.map((code) => productOption({ id: `cmp-${code}`, code, label: productName(code), link: compareHref(state, code) })).join("")
    : `<p class="empty" style="padding:8px 12px">${escapeHtml(t("search.none"))}</p>`;
}

function bindProductPicker(main, state) {
  const form = main.querySelector("[data-role=picker]");
  const input = form.querySelector("input");
  const list = form.querySelector(".search__results");
  const showSuggestions = () => {
    const query = input.value.trim();
    if (isSearchable(query)) combobox.showOptions(pickerOptions(state, search(query).products));
    else combobox.close();
  };
  const combobox = bindCombobox({ form, input, list, showSuggestions });
  const firstSuggestionForCurrentText = () => {
    showSuggestions();
    return list.hidden ? undefined : combobox.firstOption();
  };
  input.addEventListener("focus", () => input.select());
  input.addEventListener("input", () => {
    combobox.clearActiveOption();
    combobox.scheduleSuggestions(PICKER_SEARCH_DELAY_MS);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    combobox.cancelScheduledSuggestions();
    const target = combobox.activeOption() ?? firstSuggestionForCurrentText();
    if (target) combobox.followOption(target);
  });
}
