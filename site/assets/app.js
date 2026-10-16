import { href, loadCoreData, store } from "./data.js";
import { escapeHtml, lang, LANGS, setLang, t } from "./i18n.js";
import { icon } from "./icons.js";
import { errorPage, loadingPage, notFoundPage } from "./ui.js";
import { mountSearch } from "./searchbox.js";
import { disposeCharts } from "./charts.js";
import { parseHash } from "./routes.js";

const lazyRender = (load, exportName = "render") => () => load().then((page) => page[exportName]);

const ROUTES = new Map([
  ["", lazyRender(() => import("./pages/home.js"))],
  ["produits", lazyRender(() => import("./pages/lists.js"), "renderProducts")],
  ["produit", lazyRender(() => import("./pages/product.js"))],
  ["pays", lazyRender(() => import("./pages/country.js"))],
  ["comparer", lazyRender(() => import("./pages/compare.js"))],
  ["changements", lazyRender(() => import("./pages/changes.js"))],
  ["quiz", lazyRender(() => import("./pages/quiz.js"))],
  ["comprendre", lazyRender(() => import("./pages/learn.js"), "renderLearn")],
  ["a-propos", lazyRender(() => import("./pages/learn.js"), "renderAbout")],
  ["recherche", lazyRender(() => import("./pages/lists.js"), "renderSearch")],
  ["integrer", lazyRender(() => import("./pages/embed.js"))],
  ["api", lazyRender(() => import("./pages/developers.js"))],
  ["accessibilite", lazyRender(() => import("./pages/accessibility.js"))],
]);

const NAV = [["", "nav.home"], ["produits", "nav.products"], ["pays", "nav.countries"], ["comparer", "nav.compare"], ["changements", "nav.changes"], ["quiz", "nav.quiz"], ["comprendre", "nav.learn"]];

const LANG_STORAGE_KEY = "lang";

export function updateParams(changes) {
  const { parts, params } = parseHash();
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  history.replaceState(null, "", href(parts, params));
}

function savedLang() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLangIfStorageAllowed(chosen) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, chosen);
  } catch {
    return;
  }
}

function preferredLang(params) {
  const candidates = [params.get("lang"), savedLang(), (navigator.language || "fr").slice(0, 2)];
  return candidates.find((candidate) => LANGS.includes(candidate)) ?? "fr";
}

const LOGO_COLUMN_HEIGHTS = [12, 15, 18, 21, 24];
const LOGO_BASELINE = 27;
const FLAG_RED = "#ED2939";
const FLAG_LIGHT_BLUE = "#00A1DE";

function luxembourgFlagLogo() {
  const columns = LOGO_COLUMN_HEIGHTS.map((height, index) => {
    const x = 1 + index * 6, y = LOGO_BASELINE - height, third = height / 3;
    return `<rect class="logo__white" x="${x + 0.5}" y="${y + 0.5}" width="3" height="${height - 1}"/>`
      + `<rect x="${x}" y="${y}" width="4" height="${third}" fill="${FLAG_RED}"/>`
      + `<rect x="${x}" y="${LOGO_BASELINE - third}" width="4" height="${third}" fill="${FLAG_LIGHT_BLUE}"/>`;
  }).join("");
  return `<svg viewBox="0 0 30 30" aria-hidden="true" shape-rendering="crispEdges">${columns}</svg>`;
}

function centerCurrentNavLink(nav) {
  const current = nav.querySelector('a[aria-current="page"]');
  if (current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
}

function renderMasthead(activePath) {
  const header = document.getElementById("masthead");
  header.innerHTML = `<div class="masthead__row">
    <a class="brand" href="${href("")}">
      <span class="brand__logo">${luxembourgFlagLogo()}</span>
      <span class="brand__text"><strong>${escapeHtml(t("site.title"))}</strong><small>${escapeHtml(t("site.subtitle"))}</small></span>
    </a>
    <nav class="nav" aria-label="Navigation"><ul class="nav__list">${NAV.map(([path, key]) =>
      `<li><a href="${href(path)}"${activePath === path ? ' aria-current="page"' : ""}>${escapeHtml(t(key))}</a></li>`).join("")}</ul></nav>
    <div class="tools">
      <a class="icon-button" href="${href("recherche")}" aria-label="${escapeHtml(t("search.label"))}">${icon("search")}</a>
      <div class="lang" role="group" aria-label="${escapeHtml(t("lang.label"))}">${LANGS.map((code) =>
        `<button type="button" data-lang="${code}" aria-pressed="${code === lang()}" lang="${code}">${code.toUpperCase()}</button>`).join("")}</div>
    </div>
  </div>`;
  centerCurrentNavLink(header.querySelector(".nav"));
  header.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => {
    setLang(button.dataset.lang);
    saveLangIfStorageAllowed(button.dataset.lang);
    updateParams({});
    render();
  }));
}

function renderFooter() {
  const feed = lang() === "fr" ? "feed.xml" : `feed-${lang()}.xml`;
  document.getElementById("footer").innerHTML = `<div class="footer__row">
    <div><h2>${escapeHtml(t("site.title"))}</h2><p>${escapeHtml(t("footer.about"))}</p></div>
    <div><h2>${escapeHtml(t("footer.explore"))}</h2><ul>
      ${NAV.slice(1).map(([path, key]) => `<li><a href="${href(path)}">${escapeHtml(t(key))}</a></li>`).join("")}
      <li><a href="${href("a-propos")}">${escapeHtml(t("nav.about"))}</a></li></ul></div>
    <div><h2>${escapeHtml(t("footer.data"))}</h2><ul>
      <li><a href="${escapeHtml(store.meta?.source_url || "#")}" rel="noopener">${escapeHtml(t("footer.source"))}</a></li>
      <li><a href="${feed}">${escapeHtml(t("footer.rss"))}</a></li>
      <li><a href="${href("comprendre")}">${escapeHtml(t("footer.method"))}</a></li>
      <li><a href="${href("api")}">${escapeHtml(t("footer.api"))}</a></li>
      <li><a href="${href("accessibilite")}">${escapeHtml(t("footer.a11y"))}</a></li></ul></div>
  </div>`;
}

let latestRenderId = 0;

async function render() {
  const renderId = ++latestRenderId;
  const isCurrent = () => renderId === latestRenderId;
  const { parts, params } = parseHash();
  const page = parts[0] || "";
  setLang(preferredLang(params));
  const canonical = href(parts, params);
  if (location.hash !== canonical) history.replaceState(null, "", canonical);
  document.body.classList.toggle("is-embed", page === "integrer");
  renderMasthead(page === "produit" ? "produits" : page);
  renderFooter();
  const skipLink = document.querySelector(".skip");
  if (skipLink) skipLink.textContent = t("skip");
  const previousMain = document.getElementById("main");
  disposeCharts(previousMain);
  // Each navigation owns its target, so late requests only update detached DOM.
  const main = previousMain.cloneNode(false);
  previousMain.replaceWith(main);
  main.innerHTML = loadingPage();
  const loadRender = ROUTES.get(page);
  if (!loadRender) {
    document.title = `${t("error.notFound")} · ${t("site.title")}`;
    main.innerHTML = notFoundPage(t("error.notFound"), href(""), t("back.home"));
    return;
  }
  try {
    const renderPage = await loadRender();
    if (!isCurrent()) return;
    await renderPage(main, parts.slice(1), params);
  } catch (error) {
    console.error(error);
    if (isCurrent()) main.innerHTML = errorPage(t("error.load"));
  }
  if (isCurrent() && !params.get("keepScroll")) window.scrollTo({ top: 0 });
  if (isCurrent()) mountSearch(main);
}

async function start() {
  setLang(preferredLang(parseHash().params));
  const main = document.getElementById("main");
  main.innerHTML = loadingPage();
  try {
    await loadCoreData();
  } catch (error) {
    console.error(error);
    main.innerHTML = errorPage(t("error.load"));
    return;
  }
  window.addEventListener("hashchange", render);
  document.querySelector(".skip")?.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("main").focus();
  });
  await render();
}

if (typeof window !== "undefined") start();
