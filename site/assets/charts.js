import { escapeHtml, lang, money, percent, signedMoney, t } from "./i18n.js";
import { difference, isPresent } from "./values.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const NARROW_CHART_WIDTH = 520;
const MINIMUM_PLOT_WIDTH = 40;
const DEFAULT_ROOT_FONT_SIZE = 16;
const TICK_CHARACTER_WIDTH = 6.9;
const TICK_LABEL_GAP = 3;
const TICK_CENTER_SHIFT = "0.333em";
const X_AXIS_LABEL_OFFSET = 8;

const chartLayouts = new Map();

export function disposeCharts(root) {
  for (const [container, dispose] of chartLayouts) {
    if (!container.isConnected || root?.contains(container)) {
      dispose();
      chartLayouts.delete(container);
    }
  }
}

export function textScale() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / DEFAULT_ROOT_FONT_SIZE || 1;
}

function niceStep(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const mantissa = value / magnitude;
  if (mantissa < 1.5) return magnitude;
  if (mantissa < 3.5) return 2 * magnitude;
  return (mantissa < 7.5 ? 5 : 10) * magnitude;
}

export function niceTicks(min, max, count = 5) {
  const top = min === max ? min + 1 : max;
  const step = niceStep((top - min) / count);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(top / step) * step;
  const ticks = [];
  for (let tick = start; tick <= end + step / 2; tick += step) ticks.push(Math.round(tick / step) * step);
  return { ticks, min: start, max: end };
}

function drawAtEachWidthAndTextSize(container, draw) {
  disposeCharts(container);
  let drawnLayout = "";
  let frame = 0;
  const drawIfLayoutChanged = () => {
    const width = Math.round(container.clientWidth);
    const scale = textScale();
    if (!width || `${width}:${scale}` === drawnLayout) return;
    drawnLayout = `${width}:${scale}`;
    draw(width, scale);
  };
  drawIfLayoutChanged();
  if (!("ResizeObserver" in window)) return;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawIfLayoutChanged);
  });
  observer.observe(container);
  observer.observe(document.documentElement);
  chartLayouts.set(container, () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  });
}

const TOOLTIP_GRACE_MS = 300;
const tooltipsByElement = new WeakMap();

function dismissVisibleTooltipsOnEscape(event) {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".tooltip.is-visible").forEach((element) => dismissTooltip(tooltipsByElement.get(element)));
}

const runsInBrowser = typeof document !== "undefined" && document.addEventListener;
if (runsInBrowser) document.addEventListener("keydown", dismissVisibleTooltipsOnEscape);

function createTooltip(container) {
  const element = document.createElement("div");
  element.className = "tooltip";
  element.setAttribute("role", "status");
  const tooltip = { container, element, shownKey: null, lastPointer: null, timer: 0, onHide: () => {} };
  element.addEventListener("pointerenter", () => keepTooltip(tooltip));
  element.addEventListener("pointerleave", (event) => leaveTooltip(tooltip, event));
  tooltipsByElement.set(element, tooltip);
  return tooltip;
}

function attachTooltip(container) {
  const element = container.querySelector(":scope > .tooltip");
  return element ? tooltipsByElement.get(element) : createTooltip(container);
}

function mountTooltip(tooltip) {
  hideTooltip(tooltip);
  tooltip.container.appendChild(tooltip.element);
}

function placeTooltip({ container, element }, x, y) {
  const bounds = container.getBoundingClientRect();
  const width = element.offsetWidth, height = element.offsetHeight;
  let left = x + 14, top = y - height - 12;
  if (left + width > bounds.width) left = Math.max(0, x - width - 14);
  if (top < 0) top = Math.min(bounds.height - height, y + 14);
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function keepTooltip(tooltip) { clearTimeout(tooltip.timer); }

function runAfterGrace(tooltip, action) {
  clearTimeout(tooltip.timer);
  tooltip.timer = setTimeout(action, TOOLTIP_GRACE_MS);
}

function showTooltip(tooltip, key, html, x, y) {
  keepTooltip(tooltip);
  tooltip.shownKey = key;
  tooltip.element.innerHTML = html;
  tooltip.element.classList.add("is-visible");
  placeTooltip(tooltip, x, y);
}

function hideTooltip(tooltip) {
  keepTooltip(tooltip);
  tooltip.shownKey = null;
  tooltip.element.classList.remove("is-visible");
  tooltip.onHide();
}

function dismissTooltip(tooltip) {
  keepTooltip(tooltip);
  tooltip.element.classList.remove("is-visible");
}

function distanceToRectangle(x, y, rectangle) {
  const dx = Math.max(rectangle.left - x, 0, x - rectangle.right);
  const dy = Math.max(rectangle.top - y, 0, y - rectangle.bottom);
  return Math.hypot(dx, dy);
}

function isHeadingToTooltip({ element, lastPointer }, event) {
  if (event.pointerType === "touch" || !lastPointer || !element.classList.contains("is-visible")) return false;
  const rectangle = element.getBoundingClientRect();
  return distanceToRectangle(event.clientX, event.clientY, rectangle) < distanceToRectangle(lastPointer.x, lastPointer.y, rectangle);
}

function followPointer(tooltip, event, key, showPointedItem) {
  const headingToTooltip = isHeadingToTooltip(tooltip, event);
  tooltip.lastPointer = { x: event.clientX, y: event.clientY };
  if (key === tooltip.shownKey) keepTooltip(tooltip);
  else if (headingToTooltip) runAfterGrace(tooltip, showPointedItem);
  else showPointedItem();
}

function leaveTrigger(tooltip, event) {
  if (event.pointerType === "touch") hideTooltip(tooltip);
  else runAfterGrace(tooltip, () => hideTooltip(tooltip));
}

function leaveTooltip(tooltip, event) {
  tooltip.lastPointer = { x: event.clientX, y: event.clientY };
  runAfterGrace(tooltip, () => hideTooltip(tooltip));
}

function tooltipContent(title, rows) {
  return `<div class="tooltip__title">${escapeHtml(title)}</div>` + rows.map((row) =>
    `<div class="tooltip__row"><span>${row.color ? `<i class="line-key" style="background:${row.color}"></i>` : ""}${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("");
}

function prepareChart(container, ariaLabel) {
  container.classList.add("chart");
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", ariaLabel);
  return attachTooltip(container);
}

function showNoData(container) { container.innerHTML = `<p class="empty">${t("na")}</p>`; }

function arrowStep(key) {
  if (key === "ArrowRight") return 1;
  return key === "ArrowLeft" ? -1 : 0;
}

export function tickTextWidth(text, scale) { return String(text).length * TICK_CHARACTER_WIDTH * scale; }

export function axisWidth(ticks, format, scale) {
  const widest = Math.max(...ticks.map((tick) => tickTextWidth(format(tick), scale)));
  return Math.max(32, Math.ceil(widest + 4 * scale) + 8);
}

function labelsFit(labels, step, spacing, scale) {
  const widest = Math.max(...labels.filter((_, index) => index % step === 0).map((label) => tickTextWidth(label, scale)));
  return widest + TICK_LABEL_GAP * scale <= step * spacing;
}

export function fittingLabelStep(labels, spacing, scale, { start = 1, increment = 1 } = {}) {
  let step = start;
  while (step < labels.length && !labelsFit(labels, step, spacing, scale)) step += increment;
  return step;
}

function truncate(text, maximumLength) { return text.length > maximumLength ? text.slice(0, maximumLength - 1) + "…" : text; }

function svgOpenTag(width, height) {
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="${SVG_NAMESPACE}" aria-hidden="true">`;
}

export function gridLines(ticks, margin, width, toY) {
  return `<g class="grid">${ticks.map((tick) => `<line x1="${margin.left}" x2="${width - margin.right}" y1="${toY(tick)}" y2="${toY(tick)}"/>`).join("")}</g>`;
}

export function yAxisLabels(ticks, margin, toY, format) {
  return ticks.map((tick) => `<text class="tick" x="${margin.left - 8}" y="${toY(tick)}" dy="${TICK_CENTER_SHIFT}" text-anchor="end">${escapeHtml(format(tick))}</text>`).join("");
}

export function xAxisLabel(x, y, label) {
  return `<text class="tick" x="${x}" y="${y}" text-anchor="middle">${escapeHtml(label)}</text>`;
}

function horizontalLine(className, margin, width, y) {
  return `<line class="${className}" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"/>`;
}

function lastPresentIndex(values) {
  let index = values.length - 1;
  while (index >= 0 && !isPresent(values[index])) index--;
  return index;
}

function splitAtMissingValues(values, toPoint) {
  const segments = [];
  let current = [];
  values.forEach((value, index) => {
    if (isPresent(value)) {
      current.push(toPoint(index, value));
      return;
    }
    if (current.length) segments.push(current);
    current = [];
  });
  if (current.length) segments.push(current);
  return segments;
}

function pathData(points) {
  return points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
}

const MILESTONE_ROW_HEIGHT = 16;
const MILESTONE_LABEL_PADDING = 4;

function milestoneIndices(x, { first, last }) {
  const firstIndex = x.findIndex((label) => label >= first);
  const lastIndex = x.findLastIndex((label) => label <= last);
  return firstIndex >= 0 && firstIndex <= lastIndex ? [firstIndex, lastIndex] : null;
}

function labelFittingWidth(label, width, scale) {
  return truncate(label, Math.max(1, Math.floor(width / (TICK_CHARACTER_WIDTH * scale))));
}

function placeMilestones(milestones, x, spanOfIndices, plotLeft, plotRight, scale) {
  const rowEnds = [];
  return milestones.flatMap((milestone) => {
    const indices = milestoneIndices(x, milestone);
    if (!indices) return [];
    const [left, right] = spanOfIndices(...indices);
    const shownLabel = labelFittingWidth(milestone.label, plotRight - plotLeft, scale);
    const labelWidth = tickTextWidth(shownLabel, scale);
    const labelX = Math.max(plotLeft, Math.min(left + MILESTONE_LABEL_PADDING * scale, plotRight - labelWidth));
    let row = rowEnds.findIndex((end) => end < labelX);
    if (row < 0) row = rowEnds.length;
    rowEnds[row] = labelX + labelWidth + MILESTONE_LABEL_PADDING * scale;
    return [{ ...milestone, indices, left, right, labelX, row, shownLabel }];
  });
}

function milestoneRowsHeight(placed, scale) {
  return placed.length ? (Math.max(...placed.map((milestone) => milestone.row)) + 1) * MILESTONE_ROW_HEIGHT * scale : 0;
}

function milestoneMarks(placed, plotTop, plotBottom, scale) {
  const labelY = (row) => plotTop - row * MILESTONE_ROW_HEIGHT * scale - MILESTONE_LABEL_PADDING * scale;
  const bands = placed.map(({ left, right, row }) => {
    const bandTop = labelY(row) - (MILESTONE_ROW_HEIGHT - MILESTONE_LABEL_PADDING) * scale;
    return `<rect class="milestone" x="${left}" y="${bandTop}" width="${Math.max(1, right - left)}" height="${plotBottom - bandTop}"/>`;
  });
  const labels = placed.map(({ labelX, row, shownLabel }) => `<text class="milestone-label" x="${labelX}" y="${labelY(row)}">${escapeHtml(shownLabel)}</text>`);
  return `<g class="milestones">${bands.join("")}${labels.join("")}</g>`;
}

function titleWithMilestone(x, index, placed) {
  const milestone = placed.find(({ indices: [first, last] }) => index >= first && index <= last);
  return milestone ? `${x[index]} · ${milestone.label}` : x[index];
}

export function lineChart(container, options) {
  const tooltip = prepareChart(container, options.ariaLabel ?? "");
  drawAtEachWidthAndTextSize(container, (width, scale) => drawLineChart(container, tooltip, options, width, scale));
}

const END_LABEL_MAXIMUM_WIDTH_SHARE = 0.4;

const endLabelLength = (line) => Math.max(line.label?.length ?? 0, line.endText?.length ?? 0);

function endLabelLayout(series, width, scale) {
  const narrow = width < NARROW_CHART_WIDTH;
  const defaultSpace = narrow ? 108 : 170, defaultCharacters = narrow ? 13 : 22;
  const space = Math.min(defaultSpace * scale, Math.max(defaultSpace, width * END_LABEL_MAXIMUM_WIDTH_SHARE));
  const longestLabel = Math.max(0, ...series.map(endLabelLength));
  return {
    space: Math.min(space, 18 + longestLabel * 7.2 * scale),
    characters: Math.floor((defaultCharacters * space) / (defaultSpace * scale)),
  };
}

function drawLineChart(container, tooltip, options, width, scale) {
  const { x, series, format, axisFormat = format, yMin, area = false, baseline, milestones = [] } = options;
  const values = series.flatMap((line) => line.values.filter(isPresent));
  if (!values.length) {
    showNoData(container);
    return;
  }
  const narrow = width < NARROW_CHART_WIDTH;
  const { ticks, min, max } = niceTicks(yMin ?? Math.min(0, ...values), Math.max(...values, baseline ?? -Infinity), narrow ? 4 : 5);
  const endLabel = endLabelLayout(series, width, scale);
  const margin = { top: 14 * scale, right: endLabel.space, bottom: 28 * scale, left: axisWidth(ticks, axisFormat, scale) };
  const plotWidth = width - margin.left - margin.right;
  if (plotWidth < MINIMUM_PLOT_WIDTH) return;
  const toX = (index) => margin.left + (x.length === 1 ? plotWidth / 2 : (index / (x.length - 1)) * plotWidth);
  const halfYear = x.length === 1 ? plotWidth / 2 : plotWidth / (x.length - 1) / 2;
  const plotRight = width - margin.right;
  const placed = placeMilestones(milestones, x, (first, last) => [Math.max(margin.left, toX(first) - halfYear), Math.min(plotRight, toX(last) + halfYear)], margin.left, plotRight, scale);
  const milestonesHeight = milestoneRowsHeight(placed, scale);
  margin.top += milestonesHeight;
  const height = (options.height ?? 300) + milestonesHeight;
  const plotHeight = height - margin.top - margin.bottom;
  const toY = (value) => margin.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const plot = { x, series, format, width, height, margin, plotWidth, plotHeight, toX, toY, narrow, scale, placed, endLabelCharacters: endLabel.characters };
  let svg = svgOpenTag(width, height) + gridLines(ticks, margin, width, toY) + milestoneMarks(placed, margin.top, margin.top + plotHeight, scale);
  svg += `<g class="axis">${yAxisLabels(ticks, margin, toY, axisFormat)}${lineXAxisLabels(plot)}</g>`;
  if (min < 0 && max > 0) svg += horizontalLine("baseline", margin, width, toY(0));
  if (baseline !== undefined) svg += horizontalLine("baseline", margin, width, toY(baseline));
  svg += seriesMarks(plot, area && series.length === 1 ? toY(Math.max(min, 0)) : null);
  svg += endLabels(plot);
  svg += `<g class="hover" style="display:none"><line class="crosshair" y1="${margin.top}" y2="${margin.top + plotHeight}"/></g>`;
  svg += `<rect class="hit" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"/></svg>`;
  container.innerHTML = svg;
  mountTooltip(tooltip);
  bindLineChartHover(container, tooltip, plot);
}

function lineXAxisLabels({ x, toX, height, narrow, plotWidth, scale }) {
  const fittingStep = fittingLabelStep(x, plotWidth / Math.max(1, x.length - 1), scale);
  const step = Math.max(Math.ceil(x.length / (narrow ? 4 : 8)), fittingStep);
  const last = x.length - 1;
  return x.map((label, index) => {
    const onStep = index % step === 0 || index === last;
    const crowdsLastLabel = index !== last && last - index < Math.max(step * 0.8, fittingStep);
    return onStep && !crowdsLastLabel ? xAxisLabel(toX(index), height - X_AXIS_LABEL_OFFSET * scale, label) : "";
  }).join("");
}

function segmentMarks(line, segment, areaBottomY) {
  const path = pathData(segment);
  const [first, last] = [segment[0], segment.at(-1)];
  const areaShape = areaBottomY === null ? "" : `<path class="area" style="fill:${line.color}" d="${path}L${last[0]},${areaBottomY}L${first[0]},${areaBottomY}Z"/>`;
  if (segment.length === 1) return `${areaShape}<circle cx="${first[0]}" cy="${first[1]}" r="3" style="fill:${line.color}"/>`;
  return `${areaShape}<path class="series${line.context ? " series--context" : ""}" style="stroke:${line.color}" d="${path}"/>`;
}

function seriesMarks({ series, toX, toY }, areaBottomY) {
  const strongSeriesLast = [...series].sort((a, b) => (a.strong ? 1 : 0) - (b.strong ? 1 : 0));
  return strongSeriesLast.flatMap((line) => splitAtMissingValues(line.values, (index, value) => [toX(index), toY(value)])
    .map((segment) => segmentMarks(line, segment, areaBottomY))).join("");
}

const END_LABEL_MINIMUM_GAP = 15;

function shiftIntoPlot(labels, { margin, plotHeight }) {
  const shiftUp = Math.max(0, (labels.at(-1)?.y ?? 0) - (margin.top + plotHeight));
  const shiftDown = Math.max(0, margin.top - ((labels[0]?.y ?? margin.top) - shiftUp));
  labels.forEach((label) => { label.y += shiftDown - shiftUp; });
  return labels;
}

function spreadEndLabels(plot) {
  const { series, toX, toY, scale } = plot;
  const minimumGap = END_LABEL_MINIMUM_GAP * scale;
  const labels = series.map((line) => {
    const last = lastPresentIndex(line.values);
    if (last < 0) return null;
    const y = toY(line.values[last]);
    return { line, x: toX(last), y, targetY: y };
  }).filter(Boolean).sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 30; pass++) {
    for (let index = 1; index < labels.length; index++) {
      const gap = labels[index].y - labels[index - 1].y;
      if (gap >= minimumGap) continue;
      const push = (minimumGap - gap) / 2;
      labels[index].y += push;
      labels[index - 1].y -= push;
    }
  }
  return shiftIntoPlot(labels, plot);
}

function endLabels(plot) {
  const labelX = plot.width - plot.margin.right + 10;
  return spreadEndLabels(plot).map(({ line, x, y, targetY }) => {
    const leader = Math.abs(y - targetY) > 3 ? `<line class="leader" x1="${x + 4}" y1="${targetY}" x2="${labelX - 3}" y2="${y - 4 * plot.scale}"/>` : "";
    const text = truncate(line.endText ?? line.label, plot.endLabelCharacters);
    return `${leader}<circle class="dot-ring" cx="${x}" cy="${targetY}" r="4" style="fill:${line.color}"/>`
      + `<text class="end-label${line.strong ? " end-label--strong" : ""}" x="${labelX}" y="${y}">${escapeHtml(text)}</text>`;
  }).join("");
}

function hoverDot(x, y, color) {
  const dot = document.createElementNS(SVG_NAMESPACE, "circle");
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
  dot.setAttribute("r", 4);
  dot.setAttribute("class", "dot-ring");
  dot.setAttribute("style", `fill:${color}`);
  return dot;
}

function bindLineChartHover(container, tooltip, { x, series, format, width, margin, plotWidth, toX, toY, placed }) {
  const svg = container.querySelector("svg");
  const hover = svg.querySelector(".hover");
  const crosshair = hover.querySelector(".crosshair");
  const mainSeriesFirst = series.filter((line) => !line.context || line.strong).concat(series.filter((line) => line.context && !line.strong));
  let index = -1;
  tooltip.onHide = () => { hover.style.display = "none"; };
  const hide = () => hideTooltip(tooltip);
  const clampIndex = (requestedIndex) => Math.max(0, Math.min(x.length - 1, requestedIndex));
  const showAt = (requestedIndex, pointerX, pointerY) => {
    index = clampIndex(requestedIndex);
    const crosshairX = toX(index);
    hover.style.display = "";
    crosshair.setAttribute("x1", crosshairX);
    crosshair.setAttribute("x2", crosshairX);
    hover.querySelectorAll("circle").forEach((dot) => dot.remove());
    const rows = [];
    for (const line of mainSeriesFirst) {
      const value = line.values[index];
      if (!isPresent(value)) continue;
      hover.appendChild(hoverDot(crosshairX, toY(value), line.color));
      rows.push({ label: line.label, value: format(value), color: line.color, amount: value });
    }
    rows.sort((a, b) => b.amount - a.amount);
    showTooltip(tooltip, index, tooltipContent(titleWithMilestone(x, index, placed), rows.slice(0, 8)), pointerX ?? crosshairX, pointerY ?? margin.top + 20);
  };
  const showAtPointer = (event) => {
    const svgBounds = svg.getBoundingClientRect();
    const svgX = (event.clientX - svgBounds.left) * (width / svgBounds.width);
    const containerBounds = container.getBoundingClientRect();
    const pointedIndex = clampIndex(Math.round(((svgX - margin.left) / plotWidth) * (x.length - 1)));
    followPointer(tooltip, event, pointedIndex, () => showAt(pointedIndex, event.clientX - containerBounds.left, event.clientY - containerBounds.top));
  };
  const hit = svg.querySelector(".hit");
  hit.addEventListener("pointermove", showAtPointer);
  hit.addEventListener("pointerdown", showAtPointer);
  hit.addEventListener("pointerleave", (event) => leaveTrigger(tooltip, event));
  container.tabIndex = 0;
  container.onkeydown = (event) => {
    const step = arrowStep(event.key);
    if (step) {
      event.preventDefault();
      showAt((index < 0 ? x.length - 1 : index) + step);
    } else if (event.key === "Escape") hide();
  };
  container.onblur = hide;
}

export function columnChart(container, options) {
  const tooltip = prepareChart(container, options.ariaLabel ?? "");
  drawAtEachWidthAndTextSize(container, (width, scale) => drawColumnChart(container, tooltip, options, width, scale));
}

function columnLabelStep({ x, values, labelStep }, band, width, scale) {
  if (labelStep) return fittingLabelStep(x, band, scale, { start: labelStep, increment: labelStep });
  return Math.max(Math.ceil(values.length / (width < NARROW_CHART_WIDTH ? 5 : 10)), fittingLabelStep(x, band, scale));
}

function roundedColumnPath(centerX, columnWidth, valueY, zeroY, positive) {
  const top = Math.min(valueY, zeroY), bottom = Math.max(valueY, zeroY);
  const radius = Math.min(4, columnWidth / 2, Math.max(1, bottom - top));
  const left = centerX - columnWidth / 2, right = centerX + columnWidth / 2;
  if (positive) return `M${left},${bottom}V${top + radius}Q${left},${top} ${left + radius},${top}H${right - radius}Q${right},${top} ${right},${top + radius}V${bottom}Z`;
  return `M${left},${top}V${bottom - radius}Q${left},${bottom} ${left + radius},${bottom}H${right - radius}Q${right},${bottom} ${right},${bottom - radius}V${top}Z`;
}

function drawColumnChart(container, tooltip, options, width, scale) {
  const { x, values, color, format, axisFormat = format, highlight, milestones = [] } = options;
  const present = values.filter(isPresent);
  if (!present.length) {
    showNoData(container);
    return;
  }
  const { ticks, min, max } = niceTicks(Math.min(0, ...present), Math.max(0, ...present), 4);
  const margin = { top: 12 * scale, right: 8, bottom: 28 * scale, left: axisWidth(ticks, axisFormat, scale) };
  const plotWidth = width - margin.left - margin.right;
  if (plotWidth < MINIMUM_PLOT_WIDTH) return;
  const band = plotWidth / values.length;
  const columnWidth = Math.max(2, Math.min(24, band - 2));
  const bandCenter = (index) => margin.left + band * index + band / 2;
  const placed = placeMilestones(milestones, x, (first, last) => [margin.left + band * first, margin.left + band * (last + 1)], margin.left, width - margin.right, scale);
  const milestonesHeight = milestoneRowsHeight(placed, scale);
  margin.top += milestonesHeight;
  const height = (options.height ?? 220) + milestonesHeight;
  const plotHeight = height - margin.top - margin.bottom;
  const toY = (value) => margin.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const zeroY = toY(0);
  const step = columnLabelStep(options, band, width, scale);
  const xLabels = x.map((label, index) => (index % step === 0 ? xAxisLabel(bandCenter(index), height - X_AXIS_LABEL_OFFSET * scale, label) : "")).join("");
  const columns = values.map((value, index) => {
    if (!isPresent(value)) return "";
    const opacity = highlight !== undefined && highlight !== index ? 0.55 : 1;
    return `<path d="${roundedColumnPath(bandCenter(index), columnWidth, toY(value), zeroY, value >= 0)}" style="fill:${color(value, index)};opacity:${opacity}"/>`;
  }).join("");
  const hitAreas = values.map((_, index) =>
    `<rect class="hit" data-i="${index}" x="${margin.left + band * index}" y="${margin.top}" width="${band}" height="${plotHeight}" fill="transparent"/>`).join("");
  container.innerHTML = svgOpenTag(width, height) + gridLines(ticks, margin, width, toY) + milestoneMarks(placed, margin.top, margin.top + plotHeight, scale)
    + `<g class="axis">${yAxisLabels(ticks, margin, toY, axisFormat)}${xLabels}</g>`
    + columns + horizontalLine("baseline", margin, width, zeroY) + hitAreas + "</svg>";
  mountTooltip(tooltip);
  bindColumnChartHover(container, tooltip, options, { width, bandCenter, placed });
}

function bindColumnChartHover(container, tooltip, { x, values, color, format, seriesLabel }, { width, bandCenter, placed }) {
  const svg = container.querySelector("svg");
  const show = (index, event) => {
    const value = values[index];
    const bounds = container.getBoundingClientRect();
    const pointerX = event ? event.clientX - bounds.left : bandCenter(index) * (svg.getBoundingClientRect().width / width);
    const pointerY = event ? event.clientY - bounds.top : 30;
    const row = isPresent(value)
      ? { label: seriesLabel || "", value: format(value), color: color(value, index) }
      : { label: seriesLabel || "", value: t("na"), color: null };
    showTooltip(tooltip, index, tooltipContent(titleWithMilestone(x, index, placed), [row]), pointerX, pointerY);
  };
  svg.querySelectorAll(".hit").forEach((area) => {
    const areaIndex = Number(area.dataset.i);
    area.addEventListener("pointermove", (event) => followPointer(tooltip, event, areaIndex, () => show(areaIndex, event)));
    area.addEventListener("pointerleave", (event) => leaveTrigger(tooltip, event));
  });
  let index = values.length;
  container.tabIndex = 0;
  container.onkeydown = (event) => {
    const step = arrowStep(event.key);
    if (step) {
      event.preventDefault();
      index = Math.max(0, Math.min(values.length - 1, index + step));
      show(index);
    } else if (event.key === "Escape") hideTooltip(tooltip);
  };
  container.onblur = () => hideTooltip(tooltip);
}

const CLAMPED_LABEL_LENGTH = 40;

function barItem(row, { flow, format, longest }) {
  const ratio = Math.max(0, Math.min(1, (row.value || 0) / longest));
  const tag = row.href ? "a" : "div";
  const link = row.href ? ` href="${escapeHtml(row.href)}"` : "";
  const fillModifier = row.accent ? "bar__fill--accent" : row.muted ? "bar__fill--muted" : flow ? `bar__fill--${flow}` : "";
  const amount = isPresent(row.share)
    ? `<strong>${escapeHtml(percent(row.share))}</strong> · ${escapeHtml(format(row.value))}`
    : `<strong>${escapeHtml(format(row.value))}</strong>`;
  const fullLabel = row.title ?? (row.label.length > CLAMPED_LABEL_LENGTH ? row.label : "");
  return `<li><${tag} class="bar${row.accent ? " bar--accent" : ""}"${link}${fullLabel ? ` title="${escapeHtml(fullLabel)}"` : ""}>
      <span class="bar__label"><span>${escapeHtml(row.label)}</span></span>
      <span class="bar__track"><span class="bar__fill ${fillModifier}" style="--w:${ratio.toFixed(4)}"></span><span class="bar__value">${amount}</span></span>
    </${tag}></li>`;
}

export function barList(rows, { flow = "", format, max, short = false } = {}) {
  const longest = max ?? Math.max(...rows.map((row) => row.value || 0), 1);
  return `<ul class="bars${short ? " bars--short" : ""}" role="list">${rows.map((row) => barItem(row, { flow, format, longest })).join("")}</ul>`;
}

const SPARKLINE_WIDTH = 152;
const SPARKLINE_HEIGHT = 40;

export function sparkline(values, { color, recentFrom }) {
  const present = values.filter(isPresent);
  if (present.length < 2) return "";
  const width = SPARKLINE_WIDTH, height = SPARKLINE_HEIGHT;
  const low = Math.min(...present), high = Math.max(...present);
  const toX = (index) => 2 + (index / (values.length - 1)) * (width - 6);
  const toY = (value) => height - 6 - ((value - low) / (high - low || 1)) * (height - 12);
  const path = splitAtMissingValues(values, (index, value) => [toX(index), toY(value)]).map(pathData).join("");
  const last = lastPresentIndex(values);
  const recentBand = recentFrom ? `<rect x="${toX(recentFrom)}" y="0" width="${width - toX(recentFrom)}" height="${height}" style="fill:var(--band)"/>` : "";
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${recentBand}<path d="${path}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${toX(last)}" cy="${toY(values[last])}" r="3.5" style="fill:${color};stroke:var(--bg)" stroke-width="2"/></svg>`;
}

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const EQUAL_EARTH_A1 = 1.340264, EQUAL_EARTH_A2 = -0.081106, EQUAL_EARTH_A3 = 0.000893, EQUAL_EARTH_A4 = 0.003796;
const HALF_SQRT_3 = Math.sqrt(3) / 2;

function equalEarthProjection(longitude, latitude) {
  const lambda = toRadians(longitude), phi = toRadians(latitude);
  const theta = Math.asin(HALF_SQRT_3 * Math.sin(phi)), theta2 = theta * theta, theta6 = theta2 * theta2 * theta2;
  return [
    (lambda * Math.cos(theta)) / (HALF_SQRT_3 * (EQUAL_EARTH_A1 + 3 * EQUAL_EARTH_A2 * theta2 + theta6 * (7 * EQUAL_EARTH_A3 + 9 * EQUAL_EARTH_A4 * theta2))),
    -(theta * (EQUAL_EARTH_A1 + EQUAL_EARTH_A2 * theta2 + theta6 * (EQUAL_EARTH_A3 + EQUAL_EARTH_A4 * theta2))),
  ];
}

const EUROPE_CENTER_LONGITUDE = 10, EUROPE_CENTER_LATITUDE = 52;
const FAR_SIDE_LIMIT = 0.35;

function europeEqualAreaProjection(longitude, latitude) {
  const lambda0 = toRadians(EUROPE_CENTER_LONGITUDE), phi0 = toRadians(EUROPE_CENTER_LATITUDE);
  const lambda = toRadians(longitude), phi = toRadians(latitude);
  const cosineDistance = 1 + Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);
  if (cosineDistance < FAR_SIDE_LIMIT) return null;
  const scaleFactor = Math.sqrt(2 / cosineDistance);
  return [
    scaleFactor * Math.cos(phi) * Math.sin(lambda - lambda0),
    -scaleFactor * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0)),
  ];
}

function boundsOfExtent(project, [[west, south], [east, north]]) {
  const middle = (west + east) / 2;
  const corners = [[west, south], [east, north], [west, north], [east, south], [middle, south], [middle, north]].map(([longitude, latitude]) => project(longitude, latitude));
  const xs = corners.map(([x]) => x), ys = corners.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

const MAP_VIEWS = {
  world: {
    project: equalEarthProjection,
    bounds: () => boundsOfExtent(equalEarthProjection, [[-170, -57], [180, 80]]),
    maxHeight: 480, borderWidth: 0.5, luxembourgDotRadius: 3, luxembourgLabelSize: 13,
  },
  europe: {
    project: europeEqualAreaProjection,
    bounds: () => ({
      left: europeEqualAreaProjection(-12, 48)[0], right: europeEqualAreaProjection(40, 48)[0],
      top: europeEqualAreaProjection(10, 71)[1], bottom: europeEqualAreaProjection(15, 34)[1],
    }),
    maxHeight: 560, borderWidth: 0.8, luxembourgDotRadius: 5, luxembourgLabelSize: 16,
  },
};

const MAP_WIDTH = 1000;
const LUXEMBOURG_LABEL_BASELINE_SHIFT = 4;
const LUXEMBOURG_CITY = [6.13, 49.61];
const projectedMaps = new Map();

function projectedMap(world, view) {
  if (projectedMaps.has(view)) return projectedMaps.get(view);
  const { project, bounds } = MAP_VIEWS[view];
  const { left, right, top, bottom } = bounds();
  const scale = MAP_WIDTH / (right - left);
  const toMap = ([x, y]) => [(x - left) * scale, (y - top) * scale];
  const ringPath = (ring) => {
    const points = ring.map(([longitude, latitude]) => project(longitude, latitude));
    if (!points.length || points.some((point) => !point)) return "";
    return points.map(toMap).map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("") + "Z";
  };
  const countries = world.features
    .map((feature) => ({ id: feature.id, d: feature.polygons.flat().map(ringPath).join("") }))
    .filter((country) => country.d);
  const luxembourgPoint = project(...LUXEMBOURG_CITY);
  const map = {
    width: MAP_WIDTH,
    height: Math.round((MAP_WIDTH * (bottom - top)) / (right - left)),
    countries,
    luxembourg: luxembourgPoint ? toMap(luxembourgPoint) : null,
  };
  projectedMaps.set(view, map);
  return map;
}

const SHARE_CLASS_LIMITS = [0.01, 0.05, 0.1, 0.2];

export function shareClass(share) {
  if (!isPresent(share)) return 0;
  return 1 + SHARE_CLASS_LIMITS.filter((limit) => share >= limit).length;
}

export function mapLegend(flow, { excluded = false } = {}) {
  const labels = ["< 1 %", "1–5 %", "5–10 %", "10–20 %", "≥ 20 %"].map((label) => (lang() === "en" ? label.replace(" %", "%") : label));
  return `<div class="legend">${labels.map((label, index) => `<span><i class="swatch" style="background:var(--${flow}-${index + 1})"></i>${escapeHtml(label)}</span>`).join("")}${noDataKey()}${excluded ? excludedKey() : ""}</div>`;
}

const EVEN_BALANCE_SHARE = 0.05;

function balanceEntry(row, breaks) {
  const { imp, exp } = row, balance = difference(exp, imp);
  const roughlyEven = Math.abs(balance) < EVEN_BALANCE_SHARE * (imp + exp);
  const magnitudeClass = 1 + breaks.filter((limit) => Math.abs(balance) >= limit).length;
  return { imp, exp, balance, balanceClass: roughlyEven ? 0 : Math.sign(balance) * magnitudeClass };
}

export function balanceScale(rows) {
  const traded = rows.filter((row) => difference(row.exp, row.imp) !== null && row.imp + row.exp > 0);
  const largestGap = Math.max(0, ...traded.map((row) => Math.abs(difference(row.exp, row.imp))));
  const breaks = largestGap > 0 ? [niceStep(largestGap / 100), niceStep(largestGap / 10)] : [1, 10];
  const values = new Map(traded.map((row) => [row.code, balanceEntry(row, breaks)]));
  return { values, breaks };
}

export function balanceFill(balanceClass) {
  if (!balanceClass) return "var(--even)";
  return `var(--${balanceClass < 0 ? "imp" : "exp"}-${Math.abs(balanceClass) + 1})`;
}

function unitSuffix(amount) { return amount.replace(/^[^\d]*[\d.,\s  ]*\d/, ""); }

function rangeLabel(low, high) {
  const unit = unitSuffix(low);
  if (!unit || unit !== unitSuffix(high)) return `${low} – ${high}`;
  return `${low.slice(0, low.length - unit.length)}–${high}`;
}

export function balanceLegend(breaks, format, { excluded = false } = {}) {
  const [low, high] = breaks.map(format);
  const ranges = { 1: `< ${low}`, 2: rangeLabel(low, high), 3: `≥ ${high}` };
  const label = (balanceClass) => escapeHtml(balanceClass ? ranges[Math.abs(balanceClass)] : t("balance.even"));
  const step = (balanceClass) => `<li><i style="background:${balanceFill(balanceClass)}"></i><span>${label(balanceClass)}</span></li>`;
  const chip = (balanceClass) => `<span><i class="swatch" style="background:${balanceFill(balanceClass)}"></i>${label(balanceClass)}</span>`;
  return `<div class="balance-key">
    <div class="balance-key__ramp">
      <div class="balance-key__ends"><span><i class="dot dot--imp"></i>${escapeHtml(t("balance.buysMore"))}</span><span>${escapeHtml(t("balance.sellsMore"))}<i class="dot dot--exp"></i></span></div>
      <ol class="balance-key__steps">${[-3, -2, -1, 0, 1, 2, 3].map(step).join("")}</ol>
    </div>
    <div class="balance-key__stack">
      <div class="legend"><strong><i class="dot dot--imp"></i>${escapeHtml(t("balance.buysMore"))}</strong>${[-3, -2, -1].map(chip).join("")}</div>
      <div class="legend"><strong><i class="dot dot--exp"></i>${escapeHtml(t("balance.sellsMore"))}</strong>${[3, 2, 1].map(chip).join("")}</div>
    </div>
    <div class="legend" style="margin:8px 0 0"><span class="balance-key__even"><i class="swatch" style="background:${balanceFill(0)}"></i>${escapeHtml(t("balance.even"))}</span>${noDataKey()}${excluded ? excludedKey() : ""}</div>
  </div>`;
}

function excludedKey() {
  return `<span><i class="swatch" style="background:var(--context)"></i>${escapeHtml(t("map.excluded"))}</span>`;
}

function noDataKey() {
  return `<span><svg class="hatch-key" viewBox="0 0 14 10" aria-hidden="true"><rect x="0.5" y="0.5" width="13" height="9" rx="2" style="fill:var(--bg);stroke:var(--rule-strong)"/><path d="M1 9L8 1M6 9L13 1" style="stroke:var(--hatch)" stroke-width="1.5"/></svg>${escapeHtml(t("map.noData"))}</span>`;
}

function shareFill(flow) {
  return (entry) => {
    const shareClassIndex = shareClass(entry.share);
    return shareClassIndex ? `var(--${flow}-${shareClassIndex})` : null;
  };
}

function shareTooltipRows(format) {
  return (entry) => [{ label: t("map.share"), value: percent(entry.share, entry.share < 0.01 ? 1 : 0) }, { label: "", value: format(entry.value) }];
}

function mapSvg(map, view, { values, fill, excluded }) {
  const style = MAP_VIEWS[view];
  let svg = `<svg class="map" viewBox="0 0 ${map.width} ${map.height}" xmlns="${SVG_NAMESPACE}" aria-hidden="true" preserveAspectRatio="xMidYMid meet" style="max-height:${style.maxHeight}px;margin:0 auto">`;
  svg += `<defs><pattern id="hatch-${view}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--bg)"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--hatch)" stroke-width="2"/></pattern></defs>`;
  for (const country of map.countries) {
    if (country.id === "LU") continue;
    const entry = values.get(country.id);
    const color = excluded?.has(country.id) ? "var(--context)" : (entry && fill(entry)) || `url(#hatch-${view})`;
    svg += `<path data-id="${country.id}" d="${country.d}" style="fill:${color};stroke:var(--bg)" stroke-width="${style.borderWidth}" vector-effect="non-scaling-stroke"${entry ? ' class="has-data"' : ""}/>`;
  }
  const luxembourgShape = map.countries.find((country) => country.id === "LU");
  if (luxembourgShape) svg += `<path d="${luxembourgShape.d}" style="fill:var(--ink);stroke:var(--bg)" stroke-width="0.8" vector-effect="non-scaling-stroke"/>`;
  if (map.luxembourg) {
    const [x, y] = map.luxembourg;
    svg += `<circle cx="${x}" cy="${y}" r="${style.luxembourgDotRadius}" style="fill:var(--ink);stroke:var(--bg)" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    svg += `<text x="${x + 9}" y="${y}" dy="${LUXEMBOURG_LABEL_BASELINE_SHIFT / style.luxembourgLabelSize}em" style="fill:var(--ink);font-size:${style.luxembourgLabelSize / DEFAULT_ROOT_FONT_SIZE}rem;font-weight:700;paint-order:stroke;stroke:var(--bg);stroke-width:3px">LU</text>`;
  }
  return svg + "</svg>";
}

function bindMapCountries(container, tooltip, { values, names, onSelect, excluded, tooltipRows }) {
  container.querySelectorAll("svg path[data-id]").forEach((path) => {
    const code = path.dataset.id;
    const entry = values.get(code);
    const rows = () => {
      if (excluded?.has(code)) return [{ label: t("map.excluded"), value: "" }];
      return entry ? tooltipRows(entry) : [{ label: t("map.noData"), value: "" }];
    };
    const show = (event) => {
      const bounds = container.getBoundingClientRect();
      showTooltip(tooltip, code, tooltipContent(names(code), rows()), event.clientX - bounds.left, event.clientY - bounds.top);
    };
    path.addEventListener("pointermove", (event) => {
      followPointer(tooltip, event, code, () => show(event));
      path.style.opacity = "0.82";
    });
    path.addEventListener("pointerleave", (event) => {
      leaveTrigger(tooltip, event);
      path.style.opacity = "";
    });
    if (!entry || !onSelect) return;
    path.style.cursor = "pointer";
    path.addEventListener("click", () => onSelect(code));
  });
}

export function mapChart(container, { world, values, flow, view, names, format, onSelect, ariaLabel = "", fill = shareFill(flow), rows = shareTooltipRows(format), excluded = null }) {
  const tooltip = prepareChart(container, ariaLabel);
  container.innerHTML = mapSvg(projectedMap(world, view), view, { values, fill, excluded });
  mountTooltip(tooltip);
  bindMapCountries(container, tooltip, { values, names, onSelect, excluded, tooltipRows: rows });
}

export function balanceMapChart(container, { balanceLabel, ...options }) {
  mapChart(container, {
    ...options,
    fill: (entry) => balanceFill(entry.balanceClass),
    rows: (entry) => [
      { label: t("flow.imp"), value: money(entry.imp), color: "var(--imp)" },
      { label: t("flow.exp"), value: money(entry.exp), color: "var(--exp)" },
      { label: balanceLabel, value: signedMoney(entry.balance) },
    ],
  });
}
