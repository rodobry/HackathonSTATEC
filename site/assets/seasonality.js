import { escapeHtml, money, monthOfYear, percent, signedPercent, t } from "./i18n.js";
import { store } from "./data.js";
import { fetchMonthlyTrade } from "./live.js";
import { errorAlert, loadingStatus, setFigureText, setPressed } from "./ui.js";
import { isPresent } from "./values.js";

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const CLASS_COUNT = 5;
const LIMITS_AROUND_YEAR_AVERAGE = [0.85, 0.95, 1.05, 1.15];

export function yearRows(monthly, flow, { from, until }) {
  const rows = [];
  for (let year = from; year <= until; year++) {
    const values = MONTHS.map((month) => monthly.value(flow, `${year}-${month}`) ?? null);
    const complete = values.every(isPresent);
    const average = complete ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    rows.push({ year, values, ratios: values.map((value) => (average ? value / average : null)) });
  }
  return rows;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function usualPeakMonth(rows) {
  const completeRows = rows.filter((row) => row.ratios.every(isPresent));
  if (!completeRows.length) return null;
  const typicalRatio = MONTHS.map((_, index) => median(completeRows.map((row) => row.ratios[index])));
  return MONTHS[typicalRatio.indexOf(Math.max(...typicalRatio))];
}

function quantileLimits(values) {
  const sorted = values.filter(isPresent).sort((a, b) => a - b);
  if (!sorted.length) return [];
  return Array.from({ length: CLASS_COUNT - 1 }, (_, index) => sorted[Math.floor(((index + 1) / CLASS_COUNT) * (sorted.length - 1))]);
}

function wholeSignedPercent(ratio) {
  const gap = ratio - 1;
  return (gap > 0 ? "+" : gap < 0 ? "−" : "") + percent(Math.abs(gap), 0);
}

function subtitle(mode, period) {
  return t(mode === "season" ? "seasonality.subSeason" : "seasonality.sub", { from: period.from, until: period.until });
}

function colourClass(value, limits) {
  return isPresent(value) ? 1 + limits.filter((limit) => value >= limit).length : 0;
}

function scaleFor(rows, mode) {
  if (mode === "season") {
    return { pick: (row) => row.ratios, limits: LIMITS_AROUND_YEAR_AVERAGE, label: wholeSignedPercent };
  }
  return { pick: (row) => row.values, limits: quantileLimits(rows.flatMap((row) => row.values)), label: money };
}

function legendLabels(scale) {
  const labels = scale.limits.map(scale.label);
  if (!labels.length) return [];
  const between = labels.slice(1).map((label, index) => `${labels[index]} – ${label}`);
  return [`< ${labels[0]}`, ...between, `≥ ${labels.at(-1)}`];
}

function legend(flow, scale) {
  const swatches = legendLabels(scale).map((label, index) => `<span><i class="swatch" style="background:var(--${flow}-${index + 1})"></i>${escapeHtml(label)}</span>`);
  return `<div class="legend">${swatches.join("")}<span><i class="swatch heat--none"></i>${escapeHtml(t("map.noData"))}</span></div>`;
}

function cell(row, index, flow, scale) {
  const value = row.values[index];
  const month = `${monthOfYear(MONTHS[index])} ${row.year}`;
  if (!isPresent(value)) return `<td class="heat heat--none" title="${escapeHtml(`${month} · ${t("na")}`)}"><span class="sr-only">${escapeHtml(t("na"))}</span></td>`;
  const shown = scale.pick(row)[index];
  const ratio = row.ratios[index];
  const description = isPresent(ratio) ? `${money(value)} (${t("seasonality.versusAverage", { change: signedPercent(ratio - 1) })})` : money(value);
  const colour = colourClass(shown, scale.limits);
  return `<td class="heat" style="${colour ? `background:var(--${flow}-${colour})` : ""}" title="${escapeHtml(`${month} · ${description}`)}"><span class="sr-only">${escapeHtml(description)}</span></td>`;
}

function heatmapTable(rows, flow, mode, caption) {
  const scale = scaleFor(rows, mode);
  const header = MONTHS.map((month) => `<th scope="col"><abbr title="${escapeHtml(monthOfYear(month))}"><span class="heatmap__short">${escapeHtml(monthOfYear(month, "short"))}</span><span class="heatmap__narrow" aria-hidden="true">${escapeHtml(monthOfYear(month, "narrow"))}</span></abbr></th>`).join("");
  const body = rows.map((row) => `<tr><th scope="row">${row.year}</th>${MONTHS.map((_, index) => cell(row, index, flow, scale)).join("")}</tr>`).join("");
  return `${legend(flow, scale)}<div class="heatmap-wrap"><table class="heatmap"><caption class="sr-only">${escapeHtml(caption)}</caption>
    <thead><tr><th scope="col"><span class="sr-only">${escapeHtml(t("table.year"))}</span></th>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function modeSwitch(mode) {
  const button = (id) => `<button type="button" data-season-mode="${id}" aria-pressed="${mode === id}">${escapeHtml(t(`seasonality.mode.${id}`))}</button>`;
  return `<div class="mini-switch" role="group" aria-label="${escapeHtml(t("seasonality.mode"))}">${button("season")}${button("values")}</div>`;
}

function seasonalityTitle(name, flow, month) {
  return month ? t(`seasonality.title.${flow}`, { name, month: monthOfYear(month) }) : t("seasonality.titlePlain", { name });
}

export function seasonalityCsv(rows, fileName) {
  return {
    name: fileName,
    rows: [["month", "value_eur", "versus_year_average"], ...rows.flatMap((row) => MONTHS.map((month, index) => [`${row.year}-${month}`, row.values[index], row.ratios[index]?.toFixed(4) ?? ""]))],
  };
}

export async function drawSeasonality(root, body, { product = "TOTAL", partner = "WORLD", flow, period, name, toolbar, state, isStillShown, bind }) {
  const paint = (content) => {
    body.innerHTML = `<div class="toolbar"><div class="toolbar__group">${toolbar}</div><div class="toolbar__group">${modeSwitch(state.seasonMode)}</div></div>${content}`;
    bind();
  };
  setFigureText(root, { title: escapeHtml(seasonalityTitle(name, flow, null)), subtitle: escapeHtml(subtitle(state.seasonMode, period)) });
  paint(loadingStatus(t("seasonality.loading")));
  let monthly;
  try {
    monthly = await fetchMonthlyTrade({ product, partner, since: `${store.meta.first_year}-01` });
  } catch (error) {
    console.error(error);
    if (isStillShown()) paint(errorAlert(t("seasonality.error")));
    return;
  }
  if (!isStillShown()) return;
  const rows = yearRows(monthly, flow, period);
  state.seasonalityRows = rows;
  const title = seasonalityTitle(name, flow, usualPeakMonth(rows));
  setFigureText(root, { title: escapeHtml(title), subtitle: escapeHtml(subtitle(state.seasonMode, period)) });
  paint(`<div data-role="heatmap">${heatmapTable(rows, flow, state.seasonMode, title)}</div>`);
  const buttons = body.querySelectorAll("[data-season-mode]");
  buttons.forEach((button) => button.addEventListener("click", () => {
    state.seasonMode = button.dataset.seasonMode;
    setPressed(buttons, (candidate) => candidate === button);
    setFigureText(root, { title: escapeHtml(title), subtitle: escapeHtml(subtitle(state.seasonMode, period)) });
    body.querySelector("[data-role=heatmap]").innerHTML = heatmapTable(rows, flow, state.seasonMode, title);
  }));
}
