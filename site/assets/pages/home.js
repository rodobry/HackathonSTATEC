import {
  chapterRanking, countryFormsOf, countryName, flowParam, href, latestYear, loadData, loadProductBundle, NEIGHBOURS, partnerRanking, periodParam,
  periodUrlParams, productName, store, UNSPECIFIED_PARTNER, withinPeriod, yearIndex,
} from "../data.js";
import { capitalize, dateLong, escapeHtml, lang, lowerFirst, money, moneyLong, percent, signedMoney, signedPercent, t } from "../i18n.js";
import { icon } from "../icons.js";
import { barList, columnChart, lineChart } from "../charts.js";
import { changeBars, yearOnYearContributions } from "../contributions.js";
import { bindFigure, bindPeriodPicker, fadeThen, figure, keepingSelectFocus, paintMilestones, periodPicker, setPressed } from "../ui.js";
import { updateParams } from "../app.js";
import { searchBox } from "../searchbox.js";
import { EVERYDAY_PRODUCTS, representativeProductIcon, SUGGESTED_PRODUCTS } from "../catalog.js";
import { changeSentence, recentSparkline } from "./changes.js";
import { difference } from "../values.js";

const EXPORT_INDEX_BASE_YEAR = "2015";
const INSIGHT_SWAP_FADE_MS = 120;
const CHANGES_IN_TEASER = 4;

function totalsOf(year) {
  const index = yearIndex(year);
  const totals = { imp: store.overview.totals.imp[index], exp: store.overview.totals.exp[index] };
  return { totals, imp: totals.imp, exp: totals.exp };
}

function periodContext(period) {
  return { overview: store.overview, period, year: period.until, ...totalsOf(period.until) };
}

function shareOfTopThree(rows, total) { return (rows[0][1] + rows[1][1] + rows[2][1]) / total; }

function topThreeProducts(rows, total) {
  return rows.slice(0, 3).map(([code, value]) => `${lowerFirst(productName(code))} (${percent(value / total)})`).join(", ");
}

function totalsInsight({ overview, period, year, imp, exp }) {
  const years = withinPeriod(overview.years, period);
  const imports = withinPeriod(overview.totals.imp, period), exports = withinPeriod(overview.totals.exp, period);
  return {
    id: "i1", more: href("pays"),
    title: t("home.i1.title", { perDay: moneyLong(imp / 365) }),
    text: t("home.i1.text", { year, imp: moneyLong(imp), exp: moneyLong(exp), coverage: Math.round((exp / imp) * 100) }),
    chart: t("home.i1.chart"), hasMilestones: true,
    draw: (element, _flow, milestones) => lineChart(element, {
      x: years, format: money, height: 280, ariaLabel: t("home.i1.chart"), milestones,
      series: [
        { label: t("flow.imp"), color: "var(--imp)", values: imports, strong: true },
        { label: t("flow.exp"), color: "var(--exp)", values: exports, strong: true },
      ],
    }),
    csv: () => ({
      name: `luxembourg-totals-${period.from}-${year}.csv`,
      rows: [["year", "imports_eur", "exports_eur"], ...years.map((rowYear, index) => [rowYear, imports[index], exports[index]])],
    }),
  };
}

function balanceInsight({ overview, period, year }) {
  const years = withinPeriod(overview.years, period);
  const exports = withinPeriod(overview.totals.exp, period);
  const balance = withinPeriod(overview.totals.imp, period).map((imports, index) => difference(exports[index], imports));
  const chosenYearIndex = balance.length - 1;
  return {
    id: "i2", more: href("comprendre", { terme: "services" }),
    title: t("home.i2.title"), text: t("home.i2.text"), chart: t("home.i2.chart"), hasMilestones: true,
    draw: (element, _flow, milestones) => columnChart(element, {
      x: years, values: balance, format: money, height: 240, ariaLabel: t("home.i2.chart"), milestones,
      color: (_, index) => (index === chosenYearIndex ? "var(--ink-2)" : "var(--neutral)"), seriesLabel: t("country.fact.balance"),
    }),
    csv: () => ({ name: `luxembourg-balance-${period.from}-${year}.csv`, rows: [["year", "balance_eur"], ...years.map((rowYear, index) => [rowYear, balance[index]])] }),
  };
}

function partnersInsight({ year, totals, imp }) {
  const rankings = { imp: partnerRanking("imp", year), exp: partnerRanking("exp", year) };
  const suppliers = rankings.imp;
  const definite = (code) => countryFormsOf(code).definite;
  const topThreeAreNeighbours = suppliers.slice(0, 3).every(([code]) => NEIGHBOURS.includes(code));
  return {
    id: "i3", more: href("pays", { annee: year === latestYear() ? null : year }), hasFlowSwitch: true,
    title: t(topThreeAreNeighbours ? "home.i3.title" : "home.i3.titleTopThree", { share3: percent(shareOfTopThree(suppliers, imp)) }),
    text: t("home.i3.text", { first: capitalize(definite(suppliers[0][0])), second: definite(suppliers[1][0]), third: definite(suppliers[2][0]) }),
    chart: t("home.i3.chart", { year }),
    draw: (element, flow) => {
      element.innerHTML = barList(rankings[flow].slice(0, 8).map(([code, value]) => ({
        label: countryName(code), value, share: value / totals[flow], href: href(`pays/${code}`, { flux: flow, annee: year === latestYear() ? null : year }),
      })), { flow, format: money });
    },
    csv: (flow) => ({
      name: `luxembourg-partners-${flow}-${year}.csv`,
      rows: [["partner_code", "partner", "value_eur", "share"], ...rankings[flow].map(([code, value]) => [code, countryName(code), value, (value / totals[flow]).toFixed(4)])],
    }),
  };
}

function chaptersInsight({ year, totals, imp, exp }) {
  const rankings = { imp: chapterRanking("imp", year), exp: chapterRanking("exp", year) };
  return {
    id: "i4", more: href("produits", { annee: year === latestYear() ? null : year }), hasFlowSwitch: true,
    title: t("home.i4.title", { share: percent(shareOfTopThree(rankings.imp, imp)) }),
    text: t("home.i4.text", { imp: topThreeProducts(rankings.imp, imp), exp: topThreeProducts(rankings.exp, exp) }),
    chart: t("home.i4.chart", { year }),
    draw: (element, flow) => {
      element.innerHTML = barList(rankings[flow].slice(0, 8).map(([code, value]) => ({
        label: productName(code), value, share: value / totals[flow], href: href(`produit/${code}`, { flux: flow, annee: year === latestYear() ? null : year }),
      })), { flow, format: money });
    },
    csv: (flow) => ({
      name: `luxembourg-chapters-${flow}-${year}.csv`,
      rows: [["chapter", "name", "value_eur", "share"], ...rankings[flow].map(([code, value]) => [code, productName(code), value, (value / totals[flow]).toFixed(4)])],
    }),
  };
}

function chapterYearPairs(overview, flow, year) {
  const index = yearIndex(year);
  return Object.entries(overview.chapter_series).map(([code, series]) => [code, series[flow]?.[index] ?? null, series[flow]?.[index - 1] ?? null]);
}

function chapterContributions(overview, flow, year) {
  const index = yearIndex(year);
  const items = chapterYearPairs(overview, flow, year).map(([code, after, before]) => ({ label: productName(code), before, after, href: href(`produit/${code}`, { flux: flow }) }));
  return yearOnYearContributions(items, overview.totals[flow][index - 1], overview.totals[flow][index]);
}

function changesInsight({ overview, year }) {
  const previous = year - 1;
  const contributionsOf = (flow) => chapterContributions(overview, flow, year);
  const purchases = contributionsOf("imp");
  const [largest] = [...purchases.shown].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return {
    id: "i6", more: href("produits"), hasFlowSwitch: true,
    title: t("home.i6.title", { year, top: largest.label, change: signedMoney(largest.change) }),
    text: t("home.i6.text", { previous, year, imp: signedMoney(purchases.totalChange), exp: signedMoney(contributionsOf("exp").totalChange) }),
    chart: t("home.i6.chart", { previous, year }),
    draw: (element, flow) => { element.innerHTML = changeBars(contributionsOf(flow), { flow }); },
    csv: (flow) => ({
      name: `luxembourg-changes-${flow}-${previous}-${year}.csv`,
      rows: [["chapter", "name", `value_${previous}_eur`, `value_${year}_eur`], ...chapterYearPairs(overview, flow, year).map(([code, after, before]) => [code, productName(code), before, after])],
    }),
  };
}

function exportIndex(overview, years, code) {
  const exports = overview.neighbours[code]?.exp;
  return years.map((year) => {
    const base = exports?.[EXPORT_INDEX_BASE_YEAR], value = exports?.[year];
    return base && value ? (value / base) * 100 : null;
  });
}

function neighboursInsight({ overview }) {
  const year = latestYear();
  const years = overview.years.slice(overview.years.indexOf(EXPORT_INDEX_BASE_YEAR));
  const reporters = Object.keys(overview.neighbours);
  const indexOf = (code) => exportIndex(overview, years, code);
  return {
    id: "i5", more: href("quiz"),
    title: t("home.i5.title"), text: t("home.i5.text", { lu: signedPercent((indexOf("LU").at(-1) ?? 100) / 100 - 1), year }),
    chart: t("home.i5.chart"),
    draw: (element) => lineChart(element, {
      x: years, format: (value) => Math.round(value).toString(), height: 340, baseline: 100, yMin: 80, ariaLabel: t("home.i5.chart"),
      series: reporters.map((code) => {
        const values = indexOf(code), luxembourg = code === "LU";
        return {
          label: countryName(code), endText: `${countryName(code)} ${Math.round(values.at(-1) ?? 0)}`,
          color: luxembourg ? "var(--accent)" : "var(--context)", values, strong: luxembourg, context: !luxembourg,
        };
      }),
    }),
    csv: () => ({ name: "exports-index-2015.csv", rows: [["reporter", ...years], ...reporters.map((code) => [code, ...indexOf(code).map((value) => value?.toFixed(1))])] }),
  };
}

function insights(period) {
  const context = periodContext(period);
  return [totalsInsight(context), balanceInsight(context), partnersInsight(context), chaptersInsight(context), changesInsight(context), neighboursInsight(context)];
}

function miniFlowSwitch() {
  return `<div class="toggle-row"><div class="mini-switch" role="group" aria-label="${escapeHtml(t("flow.switch"))}">
    <button type="button" data-flow="imp" aria-pressed="true">${escapeHtml(t("flow.imp"))}</button>
    <button type="button" data-flow="exp" aria-pressed="false">${escapeHtml(t("flow.exp"))}</button></div></div>`;
}

function insightFigure(insight) {
  return figure({ id: `fig-${insight.id}`, title: escapeHtml(insight.chart), explain: false, milestones: insight.hasMilestones, extra: insight.hasFlowSwitch ? miniFlowSwitch() : "" });
}

const LUXEMBOURG_AS_A_WHOLE = {};

function mountInsight(root, insight, period, initialFlow = "imp") {
  let flow = initialFlow;
  const body = root.querySelector("[data-role=body]");
  const flowButtons = root.querySelectorAll(".mini-switch button");
  body.classList.add("flow-swap");
  const paint = () => {
    setPressed(flowButtons, (button) => button.dataset.flow === flow);
    insight.draw(body, flow, insight.hasMilestones ? paintMilestones(root, LUXEMBOURG_AS_A_WHOLE) : []);
  };
  flowButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.flow === flow) return;
    fadeThen(body, () => {
      flow = button.dataset.flow;
      paint();
      body.classList.remove("is-swapping");
    }, INSIGHT_SWAP_FADE_MS);
  }));
  paint();
  bindFigure(root, {
    csv: () => insight.csv(flow),
    embedPath: () => href(`integrer/essentiel/${insight.id}`, { flux: flow, ...periodUrlParams(period), lang: lang() }).replace(/^#\//, ""),
    milestones: paint,
  });
}

function insightArticle(insight) {
  return `<article class="insight">
        <div><h3>${escapeHtml(insight.title)}</h3><p>${escapeHtml(insight.text)}</p>
          <a class="more" href="${insight.more}">${escapeHtml(t("home.more"))} ${icon("arrow-right")}</a></div>
        ${insightFigure(insight)}
      </article>`;
}

function paintInsights(container, period) {
  const homeInsights = insights(period);
  container.innerHTML = homeInsights.map(insightArticle).join("");
  for (const insight of homeInsights) mountInsight(container.querySelector(`#fig-${insight.id}`), insight, period);
}

function mountPeriodChoice(section, period, onChange) {
  const picker = section.querySelector("[data-role=period]");
  const paint = () => {
    picker.innerHTML = periodPicker(period);
    bindPeriodPicker(picker, (change) => {
      period = { ...period, ...change };
      keepingSelectFocus(picker, paint);
      onChange(period);
    });
  };
  paint();
}

export async function render(main, _parts, params) {
  const year = latestYear();
  const { imp, exp } = totalsOf(year);
  document.title = `${t("site.title")} · ${t("site.subtitle")}`;
  main.innerHTML = `<div class="page">
    <section class="intro intro--wide">
      <h1>${escapeHtml(t("home.title"))}</h1>
      <p class="lede">${t("home.lede", { year, imp: escapeHtml(moneyLong(imp)), exp: escapeHtml(moneyLong(exp)) })}</p>
      <p class="meta-line"><span>${escapeHtml(t("home.meta", { date: dateLong(store.meta.source_updated) }))}</span><a href="${href("comprendre")}">${escapeHtml(t("home.method"))}</a></p>
      ${searchBox({ id: "home-search", chips: SUGGESTED_PRODUCTS })}
    </section>

    <section class="section" aria-labelledby="insights" data-role="insights-section">
      <div class="section__head"><h2 id="insights">${escapeHtml(t("home.insights"))}</h2><div data-role="period"></div></div>
      <div class="insights" data-role="insights"></div>
    </section>

    <section class="section" aria-labelledby="daily">
      <h2 id="daily">${escapeHtml(t("home.daily"))}</h2>
      <p class="section__lede">${escapeHtml(t("home.daily.lede", { year }))}</p>
      <ul class="daily" id="daily-list" role="list"></ul>
    </section>

    <div class="band">
      <section class="section" aria-labelledby="changes-teaser">
        <h2 id="changes-teaser">${escapeHtml(t("home.changes"))}</h2>
        <p class="section__lede">${escapeHtml(t("home.changes.lede"))}</p>
        <div class="changes" id="changes-teaser-list"></div>
        <p style="margin-top:20px"><a class="button button--ghost" href="${href("changements")}">${escapeHtml(t("home.changes.all"))} ${icon("arrow-right")}</a></p>
      </section>
    </div>

    <section class="section" aria-labelledby="quiz-teaser">
      <h2 id="quiz-teaser">${escapeHtml(t("home.quiz"))}</h2>
      <p class="section__lede" style="margin-top:12px">${escapeHtml(t("home.quiz.text"))}</p>
      <p style="margin-top:20px"><a class="button" href="${href("quiz")}">${icon("circle-help")} ${escapeHtml(t("home.quiz.start"))}</a></p>
    </section>

    <section class="section" aria-labelledby="learn-teaser">
      <h2 id="learn-teaser">${escapeHtml(t("home.learn"))}</h2>
      <div id="learn-list"></div>
    </section>
  </div>`;
  const insightsContainer = main.querySelector("[data-role=insights]");
  const period = periodParam(params);
  paintInsights(insightsContainer, period);
  mountPeriodChoice(main.querySelector("[data-role=insights-section]"), period, (chosen) => {
    updateParams(periodUrlParams(chosen));
    paintInsights(insightsContainer, chosen);
  });
  renderEverydayProducts(main.querySelector("#daily-list"), year);
  loadData("changes.json").then((changes) => {
    main.querySelector("#changes-teaser-list").innerHTML = changes.items.slice(0, CHANGES_IN_TEASER).map(changeTeaser).join("");
  }).catch(console.error);
  const { learnTeaser } = await import("./learn.js");
  main.querySelector("#learn-list").innerHTML = learnTeaser();
}

export function renderInsightEmbed(main, id, params) {
  const period = periodParam(params);
  const insight = insights(period).find((candidate) => candidate.id === id);
  if (!insight) {
    main.innerHTML = `<p class="empty">${escapeHtml(t("error.notFound"))}</p>`;
    return;
  }
  document.title = `${insight.title} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro" style="padding:16px 20px 12px"><h1 style="font-size:var(--fs-subhead);max-width:none">${escapeHtml(insight.title)}</h1></section>
    ${insightFigure(insight)}</div>`;
  mountInsight(main.querySelector(`#fig-${insight.id}`), insight, period, flowParam(params));
}

async function everydayProduct(code, index) {
  const bundle = await loadProductBundle(code);
  const entry = bundle.items[code];
  if (!entry) return null;
  const total = entry.series.imp?.[index];
  const topSupplier = entry.partners.imp.find(([partner, value]) => partner !== UNSPECIFIED_PARTNER && value);
  if (!total || !topSupplier) return null;
  return { code, supplier: topSupplier[0], share: topSupplier[1] / total };
}

function everydayProductItem({ code, supplier, share }) {
  return `<li><a href="${href(`produit/${code}`, { flux: "imp" })}">
    <span class="glyph">${representativeProductIcon(code)}</span>
    <span><strong>${escapeHtml(productName(code))}</strong><small>${escapeHtml(t("home.daily.from", { from: countryFormsOf(supplier).from }))}</small></span>
    <span class="share">${escapeHtml(percent(share))}</span></a></li>`;
}

async function renderEverydayProducts(list, year) {
  const index = yearIndex(year);
  const products = await Promise.all(EVERYDAY_PRODUCTS.map((code) => everydayProduct(code, index).catch((error) => {
    console.error(error);
    return null;
  })));
  list.innerHTML = products.filter(Boolean).map(everydayProductItem).join("");
}

function changeTeaser(change) {
  const { title, detail } = changeSentence(change);
  return `<div class="change">
    <div><h3><a href="${href(`produit/${change.code}`, { flux: change.flow })}">${title}</a></h3><p>${detail}</p></div>
    ${recentSparkline(change)}
  </div>`;
}
