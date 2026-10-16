import { icon } from "./icons.js";
import { dateLong, escapeHtml, moneyLong, t } from "./i18n.js";
import { countryFormsOf, href, siteYears, store } from "./data.js";
import { areMilestonesShown, chartMilestones, milestoneNotes, milestonesOn, toggleMilestones } from "./milestones.js";
import { disposeCharts } from "./charts.js";
import { isPresent } from "./values.js";
import { parseHash } from "./routes.js";

export function flowColor(flow) { return `var(--${flow})`; }

export function loadingStatus(text) { return `<p class="status" role="status">${escapeHtml(text)}</p>`; }

export function errorAlert(text) { return `<div class="error" role="alert">${escapeHtml(text)}</div>`; }

export function loadingPage(text = t("loading")) { return `<div class="page">${loadingStatus(text)}</div>`; }

export function errorPage(text) { return `<div class="page"><div class="intro">${errorAlert(text)}</div></div>`; }

export function notFoundPage(title, linkHref, linkLabel) {
  return `<div class="page"><div class="intro"><h1>${escapeHtml(title)}</h1><p class="lede"><a href="${linkHref}">${escapeHtml(linkLabel)}</a></p></div></div>`;
}

export function goodToKnowSection(notes) {
  return `<section class="section" style="padding-top:48px"><h2 style="font-size:var(--fs-title)">${escapeHtml(t("product.goodToKnow"))}</h2>
    <ul class="prose" style="padding-left:1.2em;margin-top:12px;color:var(--ink-2)">${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul></section>`;
}

export function setPressed(buttons, isPressed) {
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(isPressed(button))));
}

const SWAP_FADE_MS = 140;

export function fadeThen(element, update, delay = SWAP_FADE_MS) {
  element.classList.add("is-swapping");
  setTimeout(() => { if (element.isConnected) update(); }, delay);
}

export function keepingSelectFocus(root, repaint) {
  const focusedRole = root.contains(document.activeElement) ? document.activeElement.dataset.role : null;
  const scrollY = window.scrollY;
  repaint();
  window.scrollTo({ top: scrollY });
  if (focusedRole) root.querySelector(`select[data-role="${focusedRole}"]`)?.focus({ preventScroll: true });
}

export function repaintKeepingScrollAndFocus(main, flow, repaint) {
  const scrollY = window.scrollY;
  repaint();
  window.scrollTo({ top: scrollY });
  main.querySelector(`.switch button[data-flow="${flow}"]`)?.focus();
}

export function flowSwitch(flow) {
  const button = (buttonFlow) => `<button type="button" data-flow="${buttonFlow}" aria-pressed="${flow === buttonFlow}">
    <i class="dot dot--${buttonFlow}"></i>${escapeHtml(t(`flow.${buttonFlow}`))} <small>${escapeHtml(t(`flow.${buttonFlow}.long`))}</small></button>`;
  return `<div class="switch" role="group" aria-label="${escapeHtml(t("flow.switch"))}">${button("imp")}${button("exp")}</div>`;
}

export function bindFlowSwitch(root, onChange) {
  root.querySelectorAll(".switch button").forEach((button) => {
    button.addEventListener("click", () => onChange(button.dataset.flow));
  });
}

function sourceLine() {
  return t("source", { dataset: store.meta.dataset, date: dateLong(store.meta.source_updated) });
}

function figureTabs(id, tabs, active) {
  if (tabs.length <= 1) return "";
  return `<div class="figure__tabs" role="tablist">${tabs.map((tab) =>
    `<button type="button" role="tab" id="${id}-tab-${tab.id}" data-tab="${tab.id}" aria-selected="${tab.id === active}" tabindex="${tab.id === active ? 0 : -1}" aria-controls="${id}-body">${icon(tab.icon)}${escapeHtml(tab.label)}</button>`).join("")}</div>`;
}

function milestonesToggle() {
  return `<button type="button" data-action="milestones" aria-pressed="${areMilestonesShown()}" hidden>${icon("flag")}${escapeHtml(t("action.milestones"))}</button>`;
}

function figureActions(explain, milestones) {
  return `<div class="figure__actions">
      ${explain ? `<button type="button" data-action="explain" aria-expanded="false">${icon("lightbulb")}<span>${escapeHtml(t("action.explain"))}</span></button>` : ""}
      ${milestones ? milestonesToggle() : ""}
      <button type="button" data-action="csv">${icon("download")}${escapeHtml(t("action.download"))}</button>
      <button type="button" data-action="share">${icon("share-2")}${escapeHtml(t("action.share"))}</button>
      <button type="button" data-action="embed" aria-expanded="false">${icon("code")}${escapeHtml(t("action.embed"))}</button>
    </div>`;
}

export function figure({ id, title, subtitle, tabs = [], active, explain = true, milestones = false, extra = "", level = 3 }) {
  const tabPanel = tabs.length > 1 ? ` role="tabpanel" aria-labelledby="${id}-tab-${active}"` : "";
  return `<figure class="figure" id="${id}" role="group" aria-labelledby="${id}-title">
    <div class="figure__head"><h${level} data-role="title" id="${id}-title">${title}</h${level}>${subtitle ? `<p data-role="subtitle">${subtitle}</p>` : ""}</div>
    ${figureTabs(id, tabs, active)}
    <div class="figure__body flow-swap" id="${id}-body"${tabPanel}>${extra}<div data-role="body"></div></div>
    ${milestones ? `<div data-role="milestones"></div>` : ""}
    <div class="explain prose" data-role="explain" hidden style="padding:0 20px 16px"></div>
    <div class="figure__foot"><span>${escapeHtml(sourceLine())}</span>${figureActions(explain, milestones)}</div>
    <div class="embed-code" data-role="embed" hidden><label class="sr-only" for="${id}-embed">${escapeHtml(t("action.embed"))}</label><textarea id="${id}-embed" rows="3" readonly></textarea></div>
  </figure>`;
}

export function refreshOpenExplanation(root, explain) {
  const panel = root.querySelector("[data-role=explain]");
  if (panel && !panel.hidden) panel.innerHTML = explain?.() || "";
}

function bindFigureTabs(root, { tab, explain }) {
  const buttons = [...root.querySelectorAll(".figure__tabs button")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      disposeCharts(root);
      buttons.forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab === button));
        tab.tabIndex = tab === button ? 0 : -1;
      });
      root.querySelector("[role=tabpanel]")?.setAttribute("aria-labelledby", button.id);
      tab?.(button.dataset.tab);
      refreshOpenExplanation(root, explain);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      next.click();
    });
  });
}

function togglePanel(button, panel) {
  const opening = panel.hidden;
  panel.hidden = !opening;
  button.setAttribute("aria-expanded", String(opening));
  return opening;
}

function bindEmbedButton(root, embedPath) {
  const button = root.querySelector("[data-action=embed]");
  button?.addEventListener("click", async () => {
    const box = root.querySelector("[data-role=embed]");
    if (!togglePanel(button, box)) return;
    const pageAddress = location.href.split("#")[0];
    const { parts, params } = parseHash(`#/${embedPath()}`);
    const code = `<iframe src="${pageAddress}${href(parts, params)}" loading="lazy" style="width:100%;height:640px;border:0" title="${escapeHtml(document.title)}"></iframe>`;
    const area = box.querySelector("textarea");
    area.value = code;
    area.select();
    const copied = await copyText(code);
    showToast(t(copied ? "action.codeCopied" : "action.copyFailed"));
  });
}

function bindExplainButton(root, explain) {
  const button = root.querySelector("[data-action=explain]");
  button?.addEventListener("click", () => {
    const panel = root.querySelector("[data-role=explain]");
    const opening = togglePanel(button, panel);
    button.querySelector("span").textContent = t(opening ? "action.hideExplain" : "action.explain");
    if (opening) panel.innerHTML = explain?.() || "";
  });
}

const redrawByFigureWithMilestones = new Map();

function redrawFiguresWithMilestones() {
  for (const [figureRoot, redraw] of redrawByFigureWithMilestones) {
    if (!figureRoot.isConnected) {
      redrawByFigureWithMilestones.delete(figureRoot);
      continue;
    }
    figureRoot.querySelector("[data-action=milestones]").setAttribute("aria-pressed", String(areMilestonesShown()));
    redraw();
  }
}

function bindMilestonesToggle(root, redraw) {
  const button = root.querySelector("[data-action=milestones]");
  if (!button || !redraw) return;
  redrawByFigureWithMilestones.set(root, redraw);
  button.addEventListener("click", () => {
    toggleMilestones();
    redrawFiguresWithMilestones();
  });
}

export function paintMilestones(root, page) {
  const concerned = Boolean(page) && milestonesOn(page).length > 0;
  const button = root.querySelector("[data-action=milestones]");
  if (button) button.hidden = !concerned;
  const notes = root.querySelector("[data-role=milestones]");
  if (notes) notes.innerHTML = concerned ? milestoneNotes(page) : "";
  return concerned ? chartMilestones(page) : [];
}

export function bindFigure(root, { tab, csv, explain, embedPath, milestones }) {
  bindFigureTabs(root, { tab, explain });
  bindMilestonesToggle(root, milestones);
  root.querySelector("[data-action=csv]")?.addEventListener("click", () => {
    const { name, rows } = csv();
    downloadCsv(name, rows);
  });
  root.querySelector("[data-action=share]")?.addEventListener("click", () => {
    shareOrCopyLink({ title: document.title, url: location.href }, location.href, { nativeShareOnTouchOnly: true });
  });
  bindEmbedButton(root, embedPath);
  bindExplainButton(root, explain);
}

export function setFigureText(root, { title, subtitle }) {
  if (title !== undefined) root.querySelector("[data-role=title]").innerHTML = title;
  if (subtitle === undefined) return;
  let paragraph = root.querySelector("[data-role=subtitle]");
  if (!paragraph && subtitle) {
    paragraph = document.createElement("p");
    paragraph.dataset.role = "subtitle";
    root.querySelector(".figure__head").appendChild(paragraph);
  }
  if (!paragraph) return;
  paragraph.innerHTML = subtitle;
  paragraph.hidden = !subtitle;
}

function copyThroughHiddenTextarea(text) {
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyThroughHiddenTextarea(text);
  }
}

async function sharedNatively(shareData) {
  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    return error.name === "AbortError";
  }
}

export async function shareOrCopyLink(shareData, textToCopy, { nativeShareOnTouchOnly = false } = {}) {
  const nativeShareAllowed = navigator.share && (!nativeShareOnTouchOnly || matchMedia("(pointer: coarse)").matches);
  if (nativeShareAllowed && await sharedNatively(shareData)) return;
  const copied = await copyText(textToCopy);
  showToast(t(copied ? "action.copied" : "action.copyFailed"));
}

const TOAST_DURATION_MS = 2200;
let toastTimer = 0;

export function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), TOAST_DURATION_MS);
}

const UTF8_BYTE_ORDER_MARK = "﻿";

function csvCell(cell) {
  const text = isPresent(cell) ? String(cell) : "";
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(name, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([UTF8_BYTE_ORDER_MARK + csv], { type: "text/csv;charset=utf-8" }));
  link.download = name;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

function compareWithMissingLast(a, b, direction) {
  if (a === b) return 0;
  if (!isPresent(a)) return 1;
  if (!isPresent(b)) return -1;
  return (a > b ? 1 : -1) * direction;
}

function tableHeader(column, index, sortColumn, sortDirection) {
  const sorted = index === sortColumn;
  const ariaSort = sorted ? ` aria-sort="${sortDirection > 0 ? "ascending" : "descending"}"` : "";
  const arrow = sorted ? `<span aria-hidden="true">${sortDirection > 0 ? " ↑" : " ↓"}</span>` : "";
  return `<th scope="col" class="${column.numeric ? "n" : ""}"${ariaSort}><button type="button" data-col="${index}">${escapeHtml(column.label)}${arrow}</button></th>`;
}

function tableCell(column, row) {
  const content = column.html ? column.html(row) : escapeHtml(column.format ? column.format(column.get(row)) : column.get(row));
  return `<td class="${column.numeric ? "n" : ""}">${content}</td>`;
}

export function sortableTable(container, columns, rows, { sort = 1, direction = -1, caption = "" } = {}) {
  let sortColumn = sort, sortDirection = direction;
  const render = () => {
    const sorted = [...rows].sort((a, b) => compareWithMissingLast(columns[sortColumn].get(a), columns[sortColumn].get(b), sortDirection));
    container.innerHTML = `<div class="table-wrap"><table>${caption ? `<caption class="sr-only">${escapeHtml(caption)}</caption>` : ""}<thead><tr>${columns.map((column, index) => tableHeader(column, index, sortColumn, sortDirection)).join("")}</tr></thead>
      <tbody>${sorted.map((row) => `<tr>${columns.map((column) => tableCell(column, row)).join("")}</tr>`).join("")}</tbody></table></div>`;
    container.querySelectorAll("th button").forEach((button) => button.addEventListener("click", () => {
      const clicked = Number(button.dataset.col);
      if (clicked === sortColumn) sortDirection = -sortDirection;
      else {
        sortColumn = clicked;
        sortDirection = columns[clicked].numeric ? -1 : 1;
      }
      render();
      container.querySelector(`th button[data-col="${clicked}"]`)?.focus();
    }));
  };
  render();
}

function neighboursToggle(neighboursHidden) {
  return `<div class="mini-switch"><button type="button" data-role="neighbours" aria-pressed="${neighboursHidden}" title="${escapeHtml(t("neighbours.title"))}">${escapeHtml(t("neighbours.toggle"))}</button></div>`;
}

export function withNeighboursNote(subtitle, neighboursHidden, balanceMap = false) {
  if (!neighboursHidden) return subtitle;
  const note = escapeHtml(t(balanceMap ? "neighbours.noteBalance" : "neighbours.note"));
  if (!subtitle) return note;
  return `${subtitle}${/[.!?]$/.test(subtitle) ? "" : "."} ${note}`;
}

export function yearPicker(year, years) {
  const options = [...years].reverse().map((optionYear) => `<option value="${optionYear}"${Number(optionYear) === Number(year) ? " selected" : ""}>${optionYear}</option>`).join("");
  return `<label class="year-pick"><span>${escapeHtml(t("year.label"))}</span><span class="year-pick__box"><select data-role="year">${options}</select>${icon("chevron-down")}</span></label>`;
}

export function bindYearPicker(root, onChange) {
  root.querySelector("[data-role=year]")?.addEventListener("change", (event) => onChange(Number(event.target.value)));
}

function yearSelect(role, label, years, selected) {
  const options = years.map((year) => `<option value="${year}"${year === selected ? " selected" : ""}>${year}</option>`).join("");
  return `<label class="year-pick"><span>${escapeHtml(label)}</span><span class="year-pick__box"><select data-role="${role}">${options}</select>${icon("chevron-down")}</span></label>`;
}

export function periodPicker({ from, until }, years = siteYears()) {
  return `<div class="period-pick" role="group" aria-label="${escapeHtml(t("period.label"))}">
    ${yearSelect("from", t("period.from"), years.filter((year) => year < until), from)}
    ${yearSelect("year", t("period.to"), years.filter((year) => year > from).reverse(), until)}</div>`;
}

export function bindPeriodPicker(root, onChange) {
  root.querySelector("[data-role=from]")?.addEventListener("change", (event) => onChange({ from: Number(event.target.value) }));
  bindYearPicker(root, (until) => onChange({ until }));
}

function zoneSwitch(zone) {
  return `<div class="mini-switch" role="group" aria-label="${escapeHtml(t("map.zone"))}">
      <button type="button" data-zone="europe" aria-pressed="${zone === "europe"}">${escapeHtml(t("map.europe"))}</button>
      <button type="button" data-zone="world" aria-pressed="${zone === "world"}">${escapeHtml(t("map.world"))}</button></div>`;
}

export function yearlyToolbar({ year, years, neighboursHidden, zone = null }) {
  return `<div class="toolbar"><div class="toolbar__group">${yearPicker(year, years)}${neighboursToggle(neighboursHidden)}</div><div class="toolbar__group">${zone ? zoneSwitch(zone) : ""}</div></div>`;
}

export function bindYearlyToolbar(root, { onYear, onZone, onNeighbours }) {
  bindYearPicker(root, onYear);
  root.querySelectorAll("[data-zone]").forEach((button) => button.addEventListener("click", () => onZone(button.dataset.zone)));
  root.querySelector("[data-role=neighbours]")?.addEventListener("click", (event) => onNeighbours(event.currentTarget.getAttribute("aria-pressed") !== "true"));
}

export function largestBalanceGap(balances) {
  let largest = null;
  for (const [code, entry] of balances) if (!largest || Math.abs(entry.balance) > Math.abs(largest.balance)) largest = { code, ...entry };
  if (!largest || !largest.balance) return "";
  const forms = countryFormsOf(largest.code);
  return t(largest.balance < 0 ? "balance.gap.imp" : "balance.gap.exp", { def: forms.definite, dative: forms.dative, amount: moneyLong(Math.abs(largest.balance)) });
}
