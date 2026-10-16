import { escapeHtml, lang, t } from "../i18n.js";
import { icon } from "../icons.js";
import { copyText, showToast } from "../ui.js";


const TEXT = {
  fr: {
    title: "API et MCP : réutiliser les chiffres",
    lede: "Les mêmes chiffres que le site, en JSON, sans clé ni inscription. Le serveur les calcule à partir d’Eurostat Comext (DS-045409), et chaque réponse cite sa source.",
    rest: "API REST", restLede: "Toutes les adresses répondent en JSON, en lecture seule. Ajoutez lang=fr, en ou de pour les libellés.",
    mcp: "Brancher un assistant d’IA (MCP)", mcpLede: "Le serveur MCP donne à Claude, ChatGPT ou tout assistant compatible six outils : chercher un produit, ses fournisseurs ou clients, un pays, la vue d’ensemble, ce qui change et le glossaire. Les réponses du serveur incluent leur source.",
    claudeCode: "Claude Code", claudeApp: "Claude (application ou claude.ai) : ajouter un connecteur personnalisé avec cette adresse",
    relay: "Relais Eurostat", relayLede: "Pour les codes à 8 chiffres, les autres années et les comparaisons, le site interroge Eurostat à travers un relais avec cache : Luxembourg comme déclarant par défaut, autres pays de l’UE seulement avec un partenaire précisé, paramètres filtrés, réponses gardées jusqu’à la publication suivante d’Eurostat, avec ETag.",
    limits: "Usage", limitsText: "Gratuit et ouvert. Limite indicative : 240 requêtes par minute et par adresse (30 pour le relais). Eurostat publie les données sous licence de réutilisation avec mention de la source.",
    copy: "Copier", copied: "Copié", content: "Contenu",
    endpoints: [
      ["/api/v1/overview", "Totaux, taux de couverture, premiers partenaires et groupes de produits"],
      ["/api/v1/search?q=café", "Trouver un code produit à partir d’un mot courant"],
      ["/api/v1/products/2204?flow=imports", "D’où viennent les achats d’un produit (ou flow=exports)"],
      ["/api/v1/countries/FR", "Achats et ventes avec un pays, rangs et produits"],
      ["/api/v1/changes?flow=exports", "Plus fortes variations des 12 derniers mois"],
      ["/api/v1/terms/expedition", "L’explication d’une règle de lecture"],
      ["/api/v1/eurostat?product=22041011&flow=1&time=2025", "Relais JSON-stat vers Eurostat (cache)"],
      ["/api/v1/eurostat?product=TOTAL&partner=WORLD&reporter=LU&reporter=BE&time=2025", "Le même relais pour comparer des pays de l’UE"],
    ],
  },
  en: {
    title: "API and MCP: reuse the figures",
    lede: "The same figures as the site, in JSON, with no key or sign-up. The server computes them from Eurostat Comext (DS-045409), and each response cites its source.",
    rest: "REST API", restLede: "Every address answers in JSON, read-only. Add lang=fr, en or de for labels.",
    mcp: "Connect an AI assistant (MCP)", mcpLede: "The MCP server gives Claude, ChatGPT or any compatible assistant six tools: search a product, its suppliers or customers, a country, the overview, what is changing and the glossary. The server’s responses include their source.",
    claudeCode: "Claude Code", claudeApp: "Claude (app or claude.ai): add a custom connector with this address",
    relay: "Eurostat relay", relayLede: "For 8-digit codes, other years and comparisons, the site queries Eurostat through a caching relay: Luxembourg as the default reporter, other EU countries only with a given partner, filtered parameters, answers kept until Eurostat’s next release, with ETags.",
    limits: "Usage", limitsText: "Free and open. Indicative limit: 240 requests per minute per address (30 for the relay). Eurostat publishes the data under a reuse licence with source acknowledgement.",
    copy: "Copy", copied: "Copied", content: "Content",
    endpoints: [
      ["/api/v1/overview", "Totals, coverage ratio, main partners and product groups"],
      ["/api/v1/search?q=coffee&lang=en", "Find a product code from an everyday word"],
      ["/api/v1/products/2204?flow=imports&lang=en", "Where a product's purchases come from (or flow=exports)"],
      ["/api/v1/countries/FR?lang=en", "Purchases and sales with a country, ranks and products"],
      ["/api/v1/changes?flow=exports&lang=en", "Largest changes over the last 12 months"],
      ["/api/v1/terms/expedition?lang=en", "Explanation of a reading rule"],
      ["/api/v1/eurostat?product=22041011&flow=1&time=2025", "JSON-stat relay to Eurostat (cached)"],
      ["/api/v1/eurostat?product=TOTAL&partner=WORLD&reporter=LU&reporter=BE&time=2025", "The same relay to compare EU countries"],
    ],
  },
  de: {
    title: "API und MCP: die Zahlen weiterverwenden",
    lede: "Dieselben Zahlen wie auf der Website, als JSON, ohne Schlüssel und ohne Anmeldung. Der Server berechnet sie aus Eurostat Comext (DS-045409), und jede Antwort nennt ihre Quelle.",
    rest: "REST-API", restLede: "Alle Adressen antworten mit JSON, nur lesend. Fügen Sie lang=fr, en oder de für die Bezeichnungen hinzu.",
    mcp: "Einen KI-Assistenten anbinden (MCP)", mcpLede: "Der MCP-Server gibt Claude, ChatGPT oder jedem kompatiblen Assistenten sechs Werkzeuge: eine Ware suchen, ihre Lieferanten oder Abnehmer, ein Land, den Überblick, was sich ändert und das Glossar. Die Antworten des Servers enthalten die Quelle.",
    claudeCode: "Claude Code", claudeApp: "Claude (App oder claude.ai): einen benutzerdefinierten Connector mit dieser Adresse hinzufügen",
    relay: "Eurostat-Relais", relayLede: "Für 8-stellige Codes, andere Jahre und Vergleiche fragt die Website Eurostat über ein Relais mit Cache ab: Luxemburg als Standard-Meldeland, andere EU-Länder nur mit angegebenem Partner, gefilterte Parameter, Antworten bis zur nächsten Eurostat-Veröffentlichung gespeichert, mit ETag.",
    limits: "Nutzung", limitsText: "Kostenlos und offen. Richtwert: 240 Anfragen pro Minute und Adresse (30 für das Relais). Eurostat veröffentlicht die Daten mit Weiterverwendungslizenz und Quellenangabe.",
    copy: "Kopieren", copied: "Kopiert", content: "Inhalt",
    endpoints: [
      ["/api/v1/overview?lang=de", "Summen, Deckungsquote, wichtigste Partner und Warengruppen"],
      ["/api/v1/search?q=Kaffee&lang=de", "Einen Warencode aus einem Alltagswort finden"],
      ["/api/v1/products/2204?flow=imports&lang=de", "Woher die Einkäufe einer Ware kommen (oder flow=exports)"],
      ["/api/v1/countries/FR?lang=de", "Einkäufe und Verkäufe mit einem Land, Rang und Waren"],
      ["/api/v1/changes?flow=exports&lang=de", "Größte Veränderungen der letzten 12 Monate"],
      ["/api/v1/terms/expedition?lang=de", "Erklärung einer Leseregel"],
      ["/api/v1/eurostat?product=22041011&flow=1&time=2025", "JSON-stat-Relais zu Eurostat (mit Cache)"],
      ["/api/v1/eurostat?product=TOTAL&partner=WORLD&reporter=LU&reporter=BE&time=2025", "Dasselbe Relais, um EU-Länder zu vergleichen"],
    ],
  },
};

function copyableLine(command, id, copyLabel) {
  return `<div class="codeline"><code id="${id}">${escapeHtml(command)}</code><button type="button" class="icon-button" data-copy="${id}">${icon("copy")}<span>${escapeHtml(copyLabel)}</span></button></div>`;
}

function endpointRows(origin, endpoints) {
  return endpoints.map(([path, description]) =>
    `<tr><td><a href="${escapeHtml(origin + path)}" target="_blank" rel="noopener"><code>${escapeHtml(path)}</code></a></td><td>${escapeHtml(description)}</td></tr>`).join("");
}

export function render(main) {
  const text = TEXT[lang()];
  const origin = location.origin;
  document.title = `${text.title} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(text.title)}</h1><p class="lede">${escapeHtml(text.lede)}</p></section>
    <div class="prose">
      <h2>${escapeHtml(text.rest)}</h2><p>${escapeHtml(text.restLede)}</p>
      <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>URL</th><th>${escapeHtml(text.content)}</th></tr></thead>
        <tbody>${endpointRows(origin, text.endpoints)}</tbody></table></div>
      <h2>${escapeHtml(text.mcp)}</h2><p>${escapeHtml(text.mcpLede)}</p>
      <h3>${escapeHtml(text.claudeCode)}</h3>${copyableLine(`claude mcp add --transport http luxembourg-trade ${origin}/mcp`, "cmd-claude-code", text.copy)}
      <h3>${escapeHtml(text.claudeApp)}</h3>${copyableLine(`${origin}/mcp`, "cmd-mcp-url", text.copy)}
      <h2>${escapeHtml(text.relay)}</h2><p>${escapeHtml(text.relayLede)}</p>
      <h2>${escapeHtml(text.limits)}</h2><p>${escapeHtml(text.limitsText)}</p>
    </div></div>`;
  main.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    await copyText(main.querySelector(`#${button.dataset.copy}`).textContent);
    showToast(text.copied);
  }));
}
