import { href } from "../data.js";
import { escapeHtml, t } from "../i18n.js";

const EMBEDDABLE_PAGES = new Map([
  ["produit", () => import("./product.js")],
  ["essentiel", () => import("./home.js")],
  ["pays", () => import("./country.js")],
  ["comparer", () => import("./compare.js")],
]);

function fullPagePath(kind, rest) {
  if (kind === "produit") return `produit/${rest[0]}`;
  if (kind === "essentiel") return "";
  if (kind === "comparer") return "comparer";
  return rest[0] ? `pays/${rest[0]}` : "pays";
}

export async function render(main, [kind, ...rest], params) {
  const loadPage = EMBEDDABLE_PAGES.get(kind);
  if (!loadPage) {
    main.innerHTML = `<p class="empty">${escapeHtml(t("error.notFound"))}</p>`;
    return;
  }
  const page = await loadPage();
  if (!main.isConnected) return;
  if (kind === "essentiel") page.renderInsightEmbed(main, rest[0], params);
  else await page.render(main, rest, params, { embed: true });
  const siteLink = document.createElement("p");
  siteLink.className = "note";
  siteLink.style.padding = "8px 20px 16px";
  siteLink.innerHTML = `<a href="${location.href.split("#")[0]}${href(fullPagePath(kind, rest), params)}" target="_blank" rel="noopener">${escapeHtml(t("site.title"))} <span aria-hidden="true">↗</span></a>`;
  main.querySelector(".page")?.appendChild(siteLink);
}
