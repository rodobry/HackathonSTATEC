import { countryFormsOf, countryName, href, loadData, productName } from "../data.js";
import { capitalize, escapeHtml, lang, money, monthName, productOf, signedPercent, t } from "../i18n.js";
import { icon } from "../icons.js";
import { sparkline } from "../charts.js";
import { flowColor, loadingPage, setPressed } from "../ui.js";
import { updateParams } from "../app.js";
import { relativeChange as changeRatio } from "../values.js";

const AND = { fr: " et ", en: " and ", de: " und " };
const ALL_FLOWS_LABEL = { fr: "Tout", en: "All", de: "Alle" };
const FIRST_RECENT_MONTH_INDEX = 12;
const PARTNERS_SHOWN = 10;

function relativeChange(change) { return change.before ? signedPercent(change.delta / change.before) : null; }

function driversPhrase(drivers, flow) {
  const prepositionBeforeEveryCountry = lang() === "de";
  return drivers.map(([code], index) => {
    const forms = countryFormsOf(code);
    if (index > 0 && !prepositionBeforeEveryCountry) return forms.definite;
    return flow === "imp" ? forms.comingFrom : forms.goingTo;
  }).join(AND[lang()]);
}

export function changeSentence(change) {
  const name = change.name?.[lang()] || productName(change.code);
  const title = t("changes.item", {
    Flow: capitalize(t(`flow.${change.flow}`)), of: productOf(name), name, sense: t(change.delta > 0 ? "changes.up" : "changes.down"), delta: money(Math.abs(change.delta)),
  });
  let detail = t("changes.itemDetail", { before: money(change.before), now: money(change.now), pct: relativeChange(change) ?? t("na") });
  const drivers = (change.drivers || []).filter(([, delta]) => delta);
  if (drivers.length) detail += " " + t("changes.drivers", { via: driversPhrase(drivers, change.flow) });
  return { title: escapeHtml(title), detail: escapeHtml(detail) };
}

export function recentSparkline(change) {
  return sparkline(change.monthly, { color: flowColor(change.flow), recentFrom: FIRST_RECENT_MONTH_INDEX });
}

function changeBadge(change) {
  const up = change.delta > 0;
  return `<span class="badge ${up ? "delta-up" : "delta-down"}">${icon(up ? "trending-up" : "trending-down")}${escapeHtml(relativeChange(change) ?? "")}</span>`;
}

function flowDot(flow) { return `<span class="dot dot--${flow}" style="margin-right:8px"></span>`; }

function productChange(change) {
  const { title, detail } = changeSentence(change);
  return `<div class="change">
        <div><h3>${flowDot(change.flow)}<a href="${href(`produit/${change.code}`, { flux: change.flow, vue: "mois" })}">${title}</a></h3>
          <p>${detail}</p></div>
        <div>${changeBadge(change)}
          ${recentSparkline(change)}</div>
      </div>`;
}

function partnerChange(partner) {
  const forms = countryFormsOf(partner.code);
  const title = t("changes.partnerItem", {
    Flow: capitalize(t(`flow.${partner.flow}`)), with: t(`changes.with.${partner.flow}`, { from: forms.from, to: forms.to }),
    sense: t(partner.delta > 0 ? "changes.up" : "changes.down"), delta: money(Math.abs(partner.delta)), name: countryName(partner.code),
  });
  return `<div class="change"><div><h3>${flowDot(partner.flow)}<a href="${href(`pays/${partner.code}`, { flux: partner.flow, vue: "mois" })}">${escapeHtml(title)}</a></h3>
      <p>${escapeHtml(t("changes.itemDetail", { before: money(partner.before), now: money(partner.now), pct: relativeChange(partner) ?? t("na") }))}</p></div>
      <div>${changeBadge(partner)}</div></div>`;
}

function monthRange([first, last]) { return `${monthName(first)} – ${monthName(last)}`; }

function filterButtons(selected) {
  return ["all", "imp", "exp"].map((filter) =>
    `<button type="button" data-filter="${filter}" aria-pressed="${filter === selected}">${escapeHtml(filter === "all" ? ALL_FLOWS_LABEL[lang()] : t(`flow.${filter}`))}</button>`).join("");
}

export async function render(main, _parts, params) {
  main.innerHTML = loadingPage();
  const changes = await loadData("changes.json");
  if (!main.isConnected) return;
  let selectedFlow = ["imp", "exp"].includes(params.get("flux")) ? params.get("flux") : "all";
  document.title = `${t("nav.changes")} · ${t("site.title")}`;
  if (!changes.window) {
    main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(t("changes.title"))}</h1><p class="lede">${escapeHtml(t("changes.unavailable"))}</p></section></div>`;
    return;
  }
  const totalChange = (flow) => signedPercent(changeRatio(changes.totals[flow].now, changes.totals[flow].before));
  const feed = lang() === "fr" ? "feed.xml" : `feed-${lang()}.xml`;
  main.innerHTML = `<div class="page">
    <section class="intro intro--wide"><h1>${escapeHtml(t("changes.title"))}</h1>
      <p class="lede">${t("changes.lede", { now: escapeHtml(monthRange(changes.window.now)), before: escapeHtml(monthRange(changes.window.before)), imp: totalChange("imp"), exp: totalChange("exp") })}</p>
      <div class="callout" style="max-width:44rem">${icon("info")}<p>${t("changes.caution")}</p></div>
    </section>
    <section class="section" style="padding-top:16px">
      <div class="toggle-row" style="justify-content:space-between">
        <h2>${escapeHtml(t("changes.products"))}</h2>
        <div class="mini-switch" role="group" aria-label="${escapeHtml(t("flow.switch"))}">
          ${filterButtons(selectedFlow)}
        </div>
      </div>
      <div class="changes" data-role="items" style="margin-top:12px"></div>
    </section>
    <section class="section">
      <h2>${escapeHtml(t("changes.partners"))}</h2>
      <div class="changes" data-role="partners" style="margin-top:12px"></div>
      <p style="margin-top:28px"><a href="${feed}">${icon("rss")} ${escapeHtml(t("changes.feed"))}</a></p>
    </section>
  </div>`;
  const productList = main.querySelector("[data-role=items]");
  const filters = main.querySelectorAll("[data-filter]");
  const drawProductChanges = () => {
    productList.innerHTML = changes.items.filter((change) => selectedFlow === "all" || change.flow === selectedFlow).map(productChange).join("");
    setPressed(filters, (button) => button.dataset.filter === selectedFlow);
  };
  drawProductChanges();
  filters.forEach((button) => button.addEventListener("click", () => {
    selectedFlow = button.dataset.filter;
    updateParams({ flux: selectedFlow === "all" ? null : selectedFlow });
    drawProductChanges();
  }));
  const largestChangesFirst = [...changes.partners].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  main.querySelector("[data-role=partners]").innerHTML = largestChangesFirst.slice(0, PARTNERS_SHOWN).map(partnerChange).join("");
}
