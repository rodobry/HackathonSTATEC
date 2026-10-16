import { icon } from "./icons.js";
import { escapeHtml, t } from "./i18n.js";
import { countryName, href, productName } from "./data.js";
import { representativeProductIcon } from "./catalog.js";
import { answer, looksLikeQuestion, search, searchDetailed } from "./search.js";
import { bindCombobox, isSearchable } from "./combobox.js";

const ALIGNMENT_PLACEHOLDER_ICON = '<span class="icon" aria-hidden="true"></span>';
const SEARCH_DELAY_MS = 140;

export function searchBox({ id = "search", value = "", chips = [] } = {}) {
  const chipRow = chips.length ? `<ul class="chips" role="list" aria-label="${escapeHtml(t("search.try"))}">${chips.map((code) =>
    `<li><a class="chip" href="${href(`produit/${code}`)}">${representativeProductIcon(code)}${escapeHtml(productName(code))}</a></li>`).join("")}</ul>` : "";
  return `<form class="search" data-search role="search" action="#" autocomplete="off">
    <div class="search__box">
      <label class="sr-only" for="${id}">${escapeHtml(t("search.label"))}</label>
      <div class="search__field">${icon("search")}<input id="${id}" name="q" type="search" value="${escapeHtml(value)}"
        placeholder="${escapeHtml(t("search.placeholder"))}" role="combobox" aria-expanded="false" aria-controls="${id}-results" aria-autocomplete="list" enterkeyhint="search"></div>
      <div class="search__results" id="${id}-results" role="listbox" hidden></div>
    </div>
    ${chipRow}
  </form>`;
}

export function productOption({ id, code, label, link }) {
  return `<a class="result" role="option" id="${id}" aria-selected="false" href="${link}">${representativeProductIcon(code) || ALIGNMENT_PLACEHOLDER_ICON}
    <span class="result__text"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(t(`product.level.${code.length}`))} ${code}</span></span></a>`;
}

function countryOption(code) {
  return `<a class="result" role="option" id="opt-country-${code}" aria-selected="false" href="${href(`pays/${code}`)}">${icon("globe")}
    <span class="result__text"><strong>${escapeHtml(countryName(code))}</strong><span>${escapeHtml(t("nav.countries"))}</span></span></a>`;
}

function resultGroup(label) { return `<div class="result__group">${escapeHtml(label)}</div>`; }

function suggestions(results, isQuestion) {
  let html = "";
  if (isQuestion) html += `<div class="answer" data-role="answer">${escapeHtml(t("loading"))}</div>`;
  const countries = results.countries.length ? resultGroup(t("search.countries")) + results.countries.map(countryOption).join("") : "";
  const products = results.products.length ? resultGroup(t("search.products")) + results.products.map((code) =>
    productOption({ id: `opt-product-${code}`, code, label: productName(code), link: href(`produit/${code}`) })).join("") : "";
  html += results.productsFirst ? products + countries : countries + products;
  return html || `<div class="result__group" data-role="detail">${escapeHtml(t("search.loadingDetail"))}</div>`;
}

async function fillAnswer(list, query, isLatestQuery) {
  try {
    const reply = await answer(query);
    if (!isLatestQuery()) return false;
    const box = list.querySelector("[data-role=answer]");
    if (box) box.innerHTML = reply ? `<p>${reply.html}</p><a href="${reply.href}">${escapeHtml(t("search.open"))} ${icon("arrow-right")}</a>` : escapeHtml(t("search.none"));
  } catch (error) {
    if (!isLatestQuery()) return false;
    console.error(error);
    list.querySelector("[data-role=answer]")?.remove();
  }
  return true;
}

async function fillDetailedResults(list, query, isLatestQuery) {
  const detailed = await searchDetailed(query).catch(() => []);
  if (!isLatestQuery()) return;
  const slot = list.querySelector("[data-role=detail]");
  if (!slot) return;
  slot.outerHTML = detailed.length
    ? resultGroup(t("search.detail")) + detailed.map(({ code, label }) => productOption({ id: `opt-d-${code}`, code, label, link: href(`produit/${code}`) })).join("")
    : `<p class="empty" style="padding:8px 12px">${escapeHtml(t("search.none"))}</p>`;
}

function trackLatestQuery(form) {
  let latestQueryId = 0;
  return {
    invalidate: () => { latestQueryId++; },
    begin: () => {
      const queryId = ++latestQueryId;
      return () => queryId === latestQueryId && form.isConnected;
    },
  };
}

async function updateSuggestions({ input, list, combobox, queries }) {
  const query = input.value.trim();
  const isLatestQuery = queries.begin();
  if (!isSearchable(query)) {
    combobox.close();
    return false;
  }
  const results = search(query);
  const isQuestion = looksLikeQuestion(query);
  combobox.showOptions(suggestions(results, isQuestion));
  if (isQuestion && !(await fillAnswer(list, query, isLatestQuery))) return false;
  if (!results.countries.length && !results.products.length) await fillDetailedResults(list, query, isLatestQuery);
  return isLatestQuery();
}

async function submitSearch({ input, combobox, update }) {
  combobox.cancelScheduledSuggestions();
  const chosen = combobox.activeOption();
  if (chosen) {
    combobox.followOption(chosen);
    return;
  }
  const query = input.value.trim();
  if (!query) return;
  if (!(await update()) || looksLikeQuestion(query)) return;
  const first = combobox.firstOption();
  if (first) combobox.followOption(first);
  else location.hash = href("recherche", { q: query });
}

function enhanceSearchForm(form) {
  form.dataset.ready = "1";
  const input = form.querySelector("input");
  const list = form.querySelector(".search__results");
  const queries = trackLatestQuery(form);
  const update = () => updateSuggestions({ input, list, combobox, queries });
  const combobox = bindCombobox({ form, input, list, showSuggestions: update, onClose: queries.invalidate });
  input.addEventListener("input", () => {
    combobox.close();
    list.innerHTML = "";
    combobox.scheduleSuggestions(SEARCH_DELAY_MS);
  });
  input.addEventListener("focus", () => { if (isSearchable(input.value) && list.innerHTML) combobox.open(); });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSearch({ input, combobox, update });
  });
}

export function mountSearch(root) {
  root.querySelectorAll("form[data-search]:not([data-ready])").forEach(enhanceSearchForm);
}
