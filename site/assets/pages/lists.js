import { chapterRanking, countryName, flowParam, href, latestYear, productName, siteYears, store, yearIndex, yearParam } from "../data.js";
import { escapeHtml, money, t } from "../i18n.js";
import { icon } from "../icons.js";
import { barList } from "../charts.js";
import { bindFlowSwitch, bindYearPicker, fadeThen, flowSwitch, setPressed, yearPicker } from "../ui.js";
import { updateParams } from "../app.js";
import { mountSearch, searchBox } from "../searchbox.js";
import { answer, looksLikeQuestion, search, searchDetailed } from "../search.js";

function noResult() { return `<p class="empty">${escapeHtml(t("search.none"))}</p>`; }

function chapterBars(flow, year, filterText) {
  const total = store.overview.totals[flow][yearIndex(year)];
  const chapters = chapterRanking(flow, year);
  const query = filterText.trim().toLowerCase();
  const rows = chapters
    .filter(([code]) => !query || productName(code).toLowerCase().includes(query) || code.startsWith(query))
    .map(([code, value]) => ({ label: productName(code), value, share: value / total, href: href(`produit/${code}`, { flux: flow, annee: year === latestYear() ? null : year }), title: code }));
  return rows.length ? barList(rows, { flow, format: money, max: chapters[0][1] }) : noResult();
}

export function renderProducts(main, _parts, params) {
  let flow = flowParam(params);
  let year = yearParam(params);
  document.title = `${t("nav.products")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page">
    <section class="intro"><h1>${escapeHtml(t("products.title"))}</h1>
      <p class="lede">${escapeHtml(t("products.lede"))}</p>
      ${searchBox({ id: "products-search" })}</section>
    <section class="section" style="padding-top:24px">
      <h2 style="font-size:var(--fs-title)" data-role="chart-title">${escapeHtml(t("products.chart", { year }))}</h2>
      <div class="toggle-row" style="margin-top:16px;gap:16px">${flowSwitch(flow)}${yearPicker(year, siteYears())}
        <div class="search" style="margin:0;flex:1;min-width:14rem;max-width:22rem"><div class="search__field">${icon("search")}<input type="search" data-role="filter" aria-label="${escapeHtml(t("products.filter"))}" placeholder="${escapeHtml(t("products.filter"))}"></div></div></div>
      <div class="flow-swap" data-role="bars" style="margin-top:12px"></div>
    </section>
  </div>`;
  const bars = main.querySelector("[data-role=bars]");
  const filter = main.querySelector("[data-role=filter]");
  const draw = () => { bars.innerHTML = chapterBars(flow, year, filter.value); };
  draw();
  filter.addEventListener("input", draw);
  bindYearPicker(main, (chosen) => {
    year = chosen;
    updateParams({ annee: year === latestYear() ? null : year });
    main.querySelector("[data-role=chart-title]").textContent = t("products.chart", { year });
    draw();
  });
  bindFlowSwitch(main, (chosen) => {
    if (chosen === flow) return;
    fadeThen(bars, () => {
      flow = chosen;
      updateParams({ flux: chosen });
      setPressed(main.querySelectorAll(".switch button"), (button) => button.dataset.flow === chosen);
      draw();
      bars.classList.remove("is-swapping");
    });
  });
}

function resultHeading(key, marginTop) {
  return `<h2 style="font-size:var(--fs-title);margin-top:${marginTop}px">${escapeHtml(t(key))}</h2>`;
}

async function answerBlock(query) {
  if (!looksLikeQuestion(query)) return "";
  const reply = await answer(query).catch(() => null);
  if (!reply) return "";
  return `<div class="answer" style="margin:0 0 24px"><p>${reply.html}</p><a href="${reply.href}">${escapeHtml(t("search.open"))} ${icon("arrow-right")}</a></div>`;
}

function countryResults(codes) {
  const index = yearIndex(latestYear());
  return resultHeading("search.countries", 16) + barList(codes.map((code) => {
    const country = store.countries.countries[code];
    return { label: countryName(code), value: (country?.series.imp?.[index] || 0) + (country?.series.exp?.[index] || 0), href: href(`pays/${code}`) };
  }), { format: money });
}

function productResults(codes) {
  return resultHeading("search.products", 28) + barList(codes.map((code) => {
    const row = store.search.products.find((product) => product.code === code);
    return { label: `${productName(code)} · ${code}`, value: (row?.imp || 0) + (row?.exp || 0), href: href(`produit/${code}`) };
  }), { format: money });
}

async function detailedResults(query, answered) {
  const detailed = await searchDetailed(query).catch(() => []);
  if (!detailed.length) return answered ? "" : noResult();
  return `${resultHeading("search.detail", 16)}<ul class="prose">${detailed.map(({ code, label }) =>
    `<li><a href="${href(`produit/${code}`)}">${escapeHtml(label)}</a> <span class="note">${code}</span></li>`).join("")}</ul>`;
}

export async function renderSearch(main, _parts, params) {
  const query = params.get("q") || "";
  document.title = `${t("search.label")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(t("search.label"))}</h1>
    ${searchBox({ id: "page-search", value: query })}</section><section data-role="results" class="column"></section></div>`;
  mountSearch(main);
  if (!query) {
    main.querySelector("#page-search").focus();
    return;
  }
  const resultsSection = main.querySelector("[data-role=results]");
  const answer = await answerBlock(query);
  let html = answer;
  const results = search(query);
  if (results.countries.length) html += countryResults(results.countries);
  if (results.products.length) html += productResults(results.products);
  if (!results.countries.length && !results.products.length) html += await detailedResults(query, Boolean(answer));
  resultsSection.innerHTML = html;
}
