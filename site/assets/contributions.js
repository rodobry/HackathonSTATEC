import { escapeHtml, signedMoney, t } from "./i18n.js";

const SHOWN_CONTRIBUTIONS = 8;
const SMALLEST_REST_SHARE = 0.01;

const isPresent = (value) => value !== null && value !== undefined;

export function yearOnYearContributions(items, totalBefore, totalAfter, limit = SHOWN_CONTRIBUTIONS) {
  if (!isPresent(totalBefore) || !isPresent(totalAfter)) return null;
  const known = items
    .filter(({ before, after }) => isPresent(before) && isPresent(after) && after !== before)
    .map((item) => ({ ...item, change: item.after - item.before }));
  const shown = known.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, limit).sort((a, b) => b.change - a.change);
  const totalChange = totalAfter - totalBefore;
  const rest = totalChange - shown.reduce((sum, item) => sum + item.change, 0);
  return { totalChange, shown, rest };
}

function changeBar({ label, change, href, rest = false }, largest, flow) {
  const size = Math.min(1, Math.abs(change) / largest);
  const direction = change >= 0 ? "up" : "down";
  const tone = rest ? "rest" : `${flow}-${direction}`;
  const tag = href ? "a" : "div";
  return `<li><${tag} class="change-bar${rest ? " change-bar--rest" : ""}"${href ? ` href="${escapeHtml(href)}"` : ""}>
      <span class="change-bar__label">${escapeHtml(label)}</span>
      <span class="change-bar__track"><span class="change-bar__fill change-bar__fill--${direction} change-bar__fill--${tone}" style="--size:${size.toFixed(4)}"></span></span>
      <span class="change-bar__value">${escapeHtml(signedMoney(change))}</span>
    </${tag}></li>`;
}

export function changeSection(contributions, { year, flow, level = 2 }) {
  if (!contributions?.shown.length) return "";
  return `<h${level}>${escapeHtml(t("change.title", { previous: year - 1, year }))}</h${level}>
    <p class="section__lede">${escapeHtml(t("change.sub", { total: signedMoney(contributions.totalChange) }))}</p>${changeBars(contributions, { flow })}`;
}

export function changeBars({ shown, rest }, { flow }) {
  const largest = Math.max(1, ...shown.map((item) => Math.abs(item.change)), Math.abs(rest));
  const rows = shown.map((item) => changeBar(item, largest, flow));
  if (Math.abs(rest) >= SMALLEST_REST_SHARE * largest) rows.push(changeBar({ label: t("change.rest"), change: rest, rest: true }, largest, flow));
  return `<ul class="change-bars" role="list">${rows.join("")}</ul>`;
}
