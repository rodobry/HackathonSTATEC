import { countryFormsOf, countryName, href, latestYear, loadData, productName, store, yearIndex } from "../data.js";
import { capitalize, escapeHtml, lang, money, moneyLong, percent, t } from "../i18n.js";
import { icon } from "../icons.js";
import { axisWidth, fittingLabelStep, gridLines, niceTicks, textScale, tickTextWidth, xAxisLabel, yAxisLabels } from "../charts.js";
import { loadingPage, shareOrCopyLink } from "../ui.js";

export async function render(main) {
  main.innerHTML = loadingPage();
  const { questions } = await loadData("quiz.json");
  if (!main.isConnected) return;
  document.title = `${t("nav.quiz")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(t("quiz.title"))}</h1>
    <p class="lede">${escapeHtml(t("quiz.lede", { year: latestYear() }))}</p></section>
    <section class="quiz" data-role="quiz" aria-live="polite"></section></div>`;
  showQuestion(main.querySelector("[data-role=quiz]"), { index: 0, score: 0, answered: false, questions });
}

function optionLabel(question, option) {
  if (question.kind === "country") return countryName(option);
  if (question.kind === "chapter") return productName(option);
  if (question.id === "per_day") return moneyLong(option);
  if (question.id === "coverage") return lang() === "en" ? `€${option}` : `${option}\u00a0€`;
  if (question.kind === "rank") return t(`quiz.growth_rank.${option}`);
  if (question.kind === "yesno") return t(`quiz.balance.${option}`);
  return String(option);
}

function bestGrowthExceptLuxembourg(growth) {
  const [code, index] = Object.entries(growth).filter(([reporter]) => reporter !== "LU").sort((a, b) => b[1] - a[1])[0];
  return { code, index };
}

function explanation(question) {
  const index = yearIndex(latestYear());
  const imp = store.overview.totals.imp[index], exp = store.overview.totals.exp[index];
  const vars = { year: latestYear(), Answer: "", answer: "", share: question.share ? percent(question.share) : "" };
  if (question.kind === "country") vars.Answer = capitalize(countryFormsOf(question.answer).definite);
  if (question.kind === "chapter") vars.Answer = productName(question.answer);
  if (question.id === "per_day") Object.assign(vars, { answer: moneyLong(question.answer), total: moneyLong(imp) });
  if (question.id === "coverage") vars.answer = question.answer;
  if (question.id === "balance") Object.assign(vars, { imp: moneyLong(imp), exp: moneyLong(exp) });
  if (question.id === "growth_rank") {
    const best = bestGrowthExceptLuxembourg(question.growth);
    Object.assign(vars, { lu: percent(question.growth.LU / 100 - 1), best: percent(best.index / 100 - 1), bestName: countryName(best.code) });
  }
  return t(`quiz.${question.id}.a`, vars);
}

function learnMoreLink(question) {
  if (question.product) return href(`produit/${question.product}`, { flux: question.flow });
  if (question.kind === "country") return href(`pays/${question.answer}`);
  if (question.kind === "chapter") return href(`produit/${question.answer}`, { flux: "exp" });
  if (question.id === "coverage" || question.id === "balance") return href("comprendre", { terme: "services" });
  return href("");
}

function progressBar(state) {
  const total = state.questions.length;
  return `<div class="quiz__progress"><span>${escapeHtml(t("quiz.progress", { n: state.index + 1, total }))}</span>
    <span class="quiz__bar"><span style="transform:scaleX(${Math.max(0.001, state.index / total)})"></span></span><span>${state.score}/${total}</span></div>`;
}

function showQuestion(box, state) {
  const question = state.questions[state.index];
  state.answered = false;
  if (!question) return showScore(box, state);
  if (question.kind === "draw") return showDrawQuestion(box, state, question);
  box.innerHTML = `${progressBar(state)}<h2>${escapeHtml(t(`quiz.${question.id}.q`))}</h2>
    <div class="options">${question.options.map((option) => `<button type="button" class="option" data-value="${escapeHtml(option)}">${escapeHtml(optionLabel(question, option))}</button>`).join("")}</div>
    <div data-role="feedback"></div>`;
  const options = box.querySelectorAll(".option");
  const isRight = (button) => String(question.answer) === button.dataset.value;
  options.forEach((chosen) => chosen.addEventListener("click", () => {
    if (state.answered) return;
    state.answered = true;
    if (isRight(chosen)) state.score++;
    options.forEach((button) => {
      button.disabled = true;
      if (isRight(button)) {
        button.classList.add("is-right");
        button.insertAdjacentHTML("beforeend", icon("check"));
      } else if (button === chosen) {
        button.classList.add("is-wrong");
        button.insertAdjacentHTML("beforeend", icon("x"));
      }
    });
    showFeedback(box, state, isRight(chosen), explanation(question), learnMoreLink(question));
  }));
  options[0]?.focus({ preventScroll: true });
}

function showFeedback(box, state, right, text, learnMore) {
  const last = state.index === state.questions.length - 1;
  box.querySelector("[data-role=feedback]").innerHTML = `<div class="feedback reveal">
    <strong>${escapeHtml(t(right ? "quiz.right" : "quiz.wrong"))}</strong><p>${escapeHtml(text)}</p>
    <p style="margin-top:8px"><a href="${learnMore}">${escapeHtml(t("quiz.learnMore"))}</a></p></div>
    <div class="actions"><button type="button" class="button" data-role="next">${escapeHtml(t(last ? "quiz.finish" : "quiz.next"))} ${icon("arrow-right")}</button></div>`;
  const next = box.querySelector("[data-role=next]");
  next.addEventListener("click", () => {
    state.index++;
    showQuestion(box, state);
    box.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  });
  next.focus({ preventScroll: true });
}

function showScore(box, state) {
  const total = state.questions.length;
  box.innerHTML = `<div class="reveal"><p class="score">${state.score}<span style="color:var(--muted);font-size:0.5em">/${total}</span></p>
    <h2 style="margin-top:12px">${escapeHtml(t("quiz.score", { score: state.score, total }))}</h2>
    <div class="actions"><button type="button" class="button" data-role="share">${icon("share-2")} ${escapeHtml(t("quiz.share"))}</button>
      <button type="button" class="button button--ghost" data-role="restart">${icon("rotate-ccw")} ${escapeHtml(t("quiz.restart"))}</button>
      <a class="button button--ghost" href="${href("")}">${escapeHtml(t("nav.home"))}</a></div></div>`;
  box.querySelector("[data-role=restart]").addEventListener("click", () => {
    state.index = 0;
    state.score = 0;
    showQuestion(box, state);
  });
  box.querySelector("[data-role=share]").addEventListener("click", () => {
    const text = t("quiz.shareText", { score: state.score, total });
    const url = location.href.split("#")[0] + href("quiz");
    shareOrCopyLink({ text, url }, `${text} ${url}`);
  });
}

const DRAW_PLOT_HEIGHT = 254;
const DRAW_TOP_MARGIN = 16;
const DRAW_RIGHT_MARGIN = 18;
const DRAW_BOTTOM_MARGIN = 34;
const DRAW_YEAR_LABEL_OFFSET = 8;
const DRAW_YEAR_LABEL_STEP = 2;
const DRAW_YEAR_LABEL_EDGE_GAP = 4;
const CLOSE_ENOUGH_AVERAGE_GAP = 0.12;

function drawingMargin(ticks, lastYear, text) {
  const halfLastYearLabel = Math.ceil(tickTextWidth(lastYear, text) / 2 + DRAW_YEAR_LABEL_EDGE_GAP * text);
  return {
    top: DRAW_TOP_MARGIN,
    right: Math.max(DRAW_RIGHT_MARGIN, halfLastYearLabel),
    bottom: Math.ceil(DRAW_BOTTOM_MARGIN * text),
    left: axisWidth(ticks, money, text),
  };
}

function drawingScale(years, values, holderWidth) {
  const { max } = niceTicks(0, Math.max(...values) * 1.5, 4);
  const { ticks } = niceTicks(0, max, 4);
  const text = textScale();
  const margin = drawingMargin(ticks, years.at(-1), text);
  const width = Math.max(300, holderWidth || 600), height = margin.top + DRAW_PLOT_HEIGHT + margin.bottom;
  const plotWidth = width - margin.left - margin.right, plotHeight = DRAW_PLOT_HEIGHT;
  const yearSpacing = plotWidth / (years.length - 1);
  const yearLabelStep = fittingLabelStep(years.map(String), yearSpacing, text, { start: DRAW_YEAR_LABEL_STEP });
  return {
    max, ticks, width, height, margin, plotWidth, plotHeight, text, yearLabelStep,
    toX: (index) => margin.left + (index / (years.length - 1)) * plotWidth,
    toY: (value) => margin.top + plotHeight - (value / max) * plotHeight,
    valueAt: (y) => Math.max(0, Math.min(max, ((margin.top + plotHeight - y) / plotHeight) * max)),
  };
}

function drawingSvg({ years, values }, scale) {
  const { ticks, width, height, margin, plotWidth, plotHeight, toX, toY, text, yearLabelStep } = scale;
  const yearLabelY = height - Math.ceil(DRAW_YEAR_LABEL_OFFSET * text);
  const yearLabels = years.map((year, index) => (index % yearLabelStep === 0 ? xAxisLabel(toX(index), yearLabelY, year) : "")).join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="application" tabindex="0" aria-label="${escapeHtml(t("quiz.draw_exports.q"))}" aria-describedby="draw-help" class="chart">
    ${gridLines(ticks, margin, width, toY)}
    <g class="axis">${yAxisLabels(ticks, margin, toY, money)}
    ${yearLabels}</g>
    <rect class="zone" x="${toX(0)}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}"/>
    <path class="true-line" d="" style="display:none"/>
    <path class="user-line" d=""/>
    <circle cx="${toX(0)}" cy="${toY(values[0])}" r="6" style="fill:var(--exp);stroke:var(--bg);stroke-width:2"/>
    <text class="hint" x="${toX(0) + 12}" y="${toY(values[0]) - 10}">${years[0]} · ${escapeHtml(money(values[0]))}</text>
    <circle class="pen" r="5" style="fill:var(--accent);display:none"/>
  </svg>`;
}

function guessScore(guess, values) {
  const gaps = guess.map((value, index) => (index > 0 && value !== null ? Math.abs(value - values[index]) : null)).filter((gap) => gap !== null);
  const complete = gaps.length === guess.length - 1;
  const averageGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { averageGap, right: complete && averageGap !== null && averageGap / mean < CLOSE_ENOUGH_AVERAGE_GAP };
}

function animateLine(path) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  path.getBoundingClientRect();
  path.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
  path.style.strokeDashoffset = "0";
}

function showDrawQuestion(box, state, question) {
  box.innerHTML = `${progressBar(state)}<h2>${escapeHtml(t("quiz.draw_exports.q"))}</h2>
    <p class="note" style="margin-top:10px" id="draw-help">${escapeHtml(t("quiz.draw_exports.help"))}<span class="sr-only"> ${escapeHtml(t("quiz.draw_exports.keys"))}</span></p>
    <div class="draw" data-role="draw"></div>
    <p class="sr-only" role="status" data-role="draw-live"></p>
    <div class="actions"><button type="button" class="button" data-role="reveal">${icon("pencil")} ${escapeHtml(t("quiz.draw_exports.reveal"))}</button></div>
    <div data-role="feedback"></div>`;
  const { years, values } = question;
  const holder = box.querySelector("[data-role=draw]");
  const scale = drawingScale(years, values, holder.clientWidth);
  holder.innerHTML = drawingSvg(question, scale);
  const svg = holder.querySelector("svg");
  const userLine = svg.querySelector(".user-line");
  const pen = svg.querySelector(".pen");
  const liveRegion = box.querySelector("[data-role=draw-live]");
  const revealButton = box.querySelector("[data-role=reveal]");
  const guess = years.map((_, index) => (index === 0 ? values[0] : null));
  const lastYear = years.length - 1;
  let activePointer = null, furthestIndex = 0, revealed = false, currentIndex = 0;
  const pathOf = (points) => points.map((value, index) => (value === null ? null : `${scale.toX(index).toFixed(1)},${scale.toY(value).toFixed(1)}`))
    .filter(Boolean).map((point, index) => `${index ? "L" : "M"}${point}`).join("");
  const setPoint = (index, value) => {
    if (revealed || index < 1 || index >= years.length) return;
    for (let between = furthestIndex + 1; between <= index; between++) {
      if (guess[between] === null) guess[between] = guess[furthestIndex] + ((value - guess[furthestIndex]) * (between - furthestIndex)) / (index - furthestIndex || 1);
    }
    guess[index] = value;
    furthestIndex = Math.max(furthestIndex, index);
    currentIndex = index;
    userLine.setAttribute("d", pathOf(guess.slice(0, furthestIndex + 1)));
    pen.style.display = "";
    pen.setAttribute("cx", scale.toX(index));
    pen.setAttribute("cy", scale.toY(value));
  };
  const markPointer = (event) => {
    const bounds = svg.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (scale.width / bounds.width);
    const y = (event.clientY - bounds.top) * (scale.height / bounds.height);
    setPoint(Math.round(((x - scale.margin.left) / scale.plotWidth) * lastYear), scale.valueAt(y));
  };
  svg.addEventListener("keydown", (event) => {
    if (revealed) return;
    const step = (scale.max / 40) * (event.shiftKey ? 5 : 1);
    const editedIndex = Math.max(1, currentIndex);
    const value = guess[editedIndex] ?? guess[editedIndex - 1] ?? values[0];
    const next = Math.min(lastYear, currentIndex + 1), previous = Math.max(1, currentIndex - 1);
    if (event.key === "ArrowRight") setPoint(next, guess[next] ?? value);
    else if (event.key === "ArrowLeft") setPoint(previous, guess[previous] ?? value);
    else if (event.key === "ArrowUp") setPoint(editedIndex, Math.min(scale.max, value + step));
    else if (event.key === "ArrowDown") setPoint(editedIndex, Math.max(0, value - step));
    else return;
    event.preventDefault();
    liveRegion.textContent = `${years[currentIndex]} : ${money(guess[currentIndex])}`;
  });
  svg.addEventListener("pointerdown", (event) => {
    if (revealed || activePointer !== null || !event.isPrimary || event.button !== 0) return;
    activePointer = event.pointerId;
    svg.setPointerCapture(event.pointerId);
    window.addEventListener("blur", stopDrawing);
    markPointer(event);
  });
  const stopDrawing = () => {
    window.removeEventListener("blur", stopDrawing);
    const pointer = activePointer;
    activePointer = null;
    if (pointer !== null && svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
  };
  svg.addEventListener("pointermove", (event) => { if (event.pointerId === activePointer) markPointer(event); });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) svg.addEventListener(type, stopDrawing);
  revealButton.addEventListener("click", () => {
    if (revealed) return;
    revealed = true;
    stopDrawing();
    const trueLine = svg.querySelector(".true-line");
    trueLine.setAttribute("d", pathOf(values));
    trueLine.style.display = "";
    animateLine(trueLine);
    const { averageGap, right } = guessScore(guess, values);
    if (right) state.score++;
    state.answered = true;
    revealButton.disabled = true;
    const text = t("quiz.draw_exports.a", { start: moneyLong(values[0]), end: moneyLong(values.at(-1)), year: years.at(-1), gap: averageGap === null ? t("na") : moneyLong(averageGap) });
    showFeedback(box, state, right, text, href(""));
  });
}
