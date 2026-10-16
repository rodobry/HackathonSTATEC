import { href, store } from "../data.js";
import { dateLong, escapeHtml, lang, t } from "../i18n.js";
import { milestoneChronology } from "../milestones.js";

const TERMS = {
  fr: [
    ["services", "Les marchandises, sans les services", `<p>Ce site compte les <strong>marchandises</strong> : ce qui passe une frontière dans un camion, un train, un avion ou un bateau. Il ne compte pas les <strong>services</strong> : banque, fonds d’investissement, assurance, conseil, logiciels, transport.</p><p>Or le Luxembourg tire l’essentiel de ses revenus des services. Il achète plus de biens qu’il n’en vend, mais il vend beaucoup plus de services qu’il n’en achète. Le STATEC publie les échanges de services dans la balance des paiements.</p>`],
    ["flux", "Achats et ventes, importations et exportations", `<p>Les <strong>achats</strong> du Luxembourg à l’étranger sont ses <strong>importations</strong> ; ses <strong>ventes</strong> à l’étranger sont ses <strong>exportations</strong>. Sur tout le site, les achats sont en brun et les ventes en vert.</p><p>Le <strong>solde</strong> est la différence entre ventes et achats. Le <strong>taux de couverture</strong> dit combien d’euros le Luxembourg vend pour 100 € qu’il achète.</p>`],
    ["expedition", "Pays d’expédition et pays d’origine", `<p>Pour les échanges entre pays de l’Union européenne, la statistique retient le pays <strong>qui expédie la marchandise</strong>. Un café cultivé au Brésil, torréfié en Allemagne puis livré au Luxembourg apparaît comme un achat à l’Allemagne.</p><p>La Belgique, l’Allemagne et les Pays-Bas, avec leurs grands ports et leurs centrales d’achat, pèsent donc lourd dans les achats du Luxembourg.</p>`],
    ["euros", "Des euros de chaque année", `<p>Les montants sont en <strong>euros courants</strong> : ceux de l’année concernée, sans correction de l’inflation. Un montant en hausse peut venir de plus de marchandises, de prix plus élevés, ou des deux.</p><p>Pour certains produits, le site indique aussi le poids (en tonnes, ou en litres pour les boissons) et le prix moyen au kilo, qui aident à faire la différence.</p>`],
    ["codes", "Des codes à 2, 4, 6 ou 8 chiffres", `<p>Chaque marchandise a un code. Plus le code est long, plus il est précis. Exemple avec le vin mousseux&nbsp;:</p><div class="digits" aria-hidden="true"><span>22</span><span>04</span><span>10</span><span>11</span><i></i><small>chapitre</small><small>position</small><small>sous-position</small><small>code NC</small></div><p>22 = boissons · 2204 = vins · 220410 = vins mousseux · 22041011 = champagne. Les 6 premiers chiffres (le « SH », système harmonisé) sont les mêmes dans le monde entier ; les 2 derniers (la « nomenclature combinée ») sont propres à l’Union européenne. Les codes changent tous les cinq ans environ, ce qui peut créer des trous dans les séries.</p>`],
    ["secret", "Pays non précisés et secret statistique", `<p>Si une seule entreprise échange un produit, publier le pays exact révélerait ses affaires. Une partie des montants passe alors dans des « pays non précisés ». Le site compte cette partie dans les totaux et la laisse hors des cartes.</p>`],
    ["provisoire", "Des chiffres provisoires, puis révisés", `<p>Les mois récents sont <strong>provisoires</strong> : des déclarations arrivent en retard, et les corrections se poursuivent pendant plusieurs mois. Les comparaisons de ce site portent sur des mois complets, mais un chiffre récent peut encore bouger.</p>`],
    ["saisons", "Choisir une année, une période, voir les saisons", `<p>Au-dessus des graphiques, vous pouvez choisir l’<strong>année</strong> affichée, ou une <strong>période</strong> «&nbsp;de … à …&nbsp;» pour les courbes. Les classements et les cartes montrent la dernière année de la période ; les courbes, toute la période. Ce qu’il n’a pas calculé d’avance, le site le lit chez Eurostat.</p><p>L’onglet <strong>Saisonnalité</strong> montre une case par mois et par année. Par défaut, chaque mois est comparé à la moyenne mensuelle de son année : la hausse des prix et la croissance d’une année à l’autre s’effacent, et seules les saisons restent visibles. Le mode «&nbsp;Montants&nbsp;» montre les euros bruts. Les chiffres ne sont pas corrigés des jours ouvrés.</p>`],
    ["avant1999", "Avant 1999 : la Belgique et le Luxembourg ensemble", `<p>Jusqu’en 1998, le Luxembourg et la Belgique déclaraient leur commerce ensemble, au sein de l’union économique belgo-luxembourgeoise. Les séries de ce site commencent en <strong>1999</strong>, première année où le Luxembourg déclare seul son commerce.</p>`],
    ["sources", "D’où viennent ces chiffres ?", `<p>Toutes les données viennent d’<strong>Eurostat</strong>, l’office statistique de l’Union européenne, dans la base <strong>Comext</strong> (jeu DS-045409). Le STATEC les collecte au Luxembourg à partir des déclarations des entreprises et des douanes.</p><p>Les populations des comparaisons par habitant viennent aussi d’Eurostat (jeu demo_pjan).</p>`],
  ],
  en: [
    ["services", "Goods only", `<p>This site counts <strong>goods</strong>: things that cross a border by lorry, train, plane or ship. It does not count <strong>services</strong>: banking, investment funds, insurance, consulting, software, transport.</p><p>Yet Luxembourg earns most of its income from services. It buys more goods than it sells, but it sells far more services than it buys. STATEC publishes trade in services in the balance of payments.</p>`],
    ["flux", "Purchases and sales, imports and exports", `<p>Luxembourg’s <strong>purchases</strong> from abroad are its <strong>imports</strong>; its <strong>sales</strong> abroad are its <strong>exports</strong>. Throughout the site, purchases are brown and sales green.</p><p>The <strong>balance</strong> is sales minus purchases. The <strong>coverage ratio</strong> says how many euros Luxembourg sells for every €100 it buys.</p>`],
    ["expedition", "Country of dispatch versus country of origin", `<p>For trade between EU countries, statistics record the country <strong>that ships the goods</strong>. Coffee grown in Brazil, roasted in Germany and delivered to Luxembourg shows up as a purchase from Germany.</p><p>Belgium, Germany and the Netherlands, with their large ports and wholesale hubs, account for a large share of Luxembourg’s purchases as a result.</p>`],
    ["euros", "Each year’s euros", `<p>Amounts are in <strong>current euros</strong>: those of the year concerned, with no inflation adjustment. A rising amount can mean more goods, higher prices, or both.</p><p>For some products, the site also shows the weight (in tonnes, or litres for drinks) and the average price per kilo, which help tell the two apart.</p>`],
    ["codes", "Codes with 2, 4, 6 or 8 digits", `<p>Every good has a code. The longer the code, the more precise it is. Example with sparkling wine:</p><div class="digits" aria-hidden="true"><span>22</span><span>04</span><span>10</span><span>11</span><i></i><small>chapter</small><small>heading</small><small>subheading</small><small>CN code</small></div><p>22 = beverages · 2204 = wine · 220410 = sparkling wine · 22041011 = champagne. The first 6 digits (the “HS”, Harmonized System) are the same worldwide; the last 2 (the “Combined Nomenclature”) are specific to the EU. The codes change about every five years, which can leave gaps in the series.</p>`],
    ["secret", "Unspecified countries and statistical confidentiality", `<p>If a single company trades a product, publishing the exact country would reveal its business. Part of the amounts then goes under “unspecified countries”. The site counts that part in totals and leaves it off the maps.</p>`],
    ["provisoire", "Provisional figures, then revised", `<p>Recent months are <strong>provisional</strong>: some declarations arrive late, and corrections continue for several months. This site compares complete months, but a recent figure may still move.</p>`],
    ["saisons", "Choosing a year or a period, and seeing seasons", `<p>Above the charts, you can choose the <strong>year</strong> shown, or a <strong>period</strong> “from … to …” for the lines. Rankings and maps show the last year of the period; lines show the whole period. Whatever it has not computed in advance, the site reads from Eurostat.</p><p>The <strong>Seasonality</strong> tab shows one square per month and year. By default, each month is compared with its year’s monthly average: price rises and growth from one year to the next fade out, and only the seasons remain. The “Amounts” mode shows the raw euros. The figures are not adjusted for working days.</p>`],
    ["avant1999", "Before 1999: Belgium and Luxembourg together", `<p>Until 1998, Luxembourg and Belgium reported their trade together, within the Belgium-Luxembourg Economic Union. The series on this site start in <strong>1999</strong>, the first year Luxembourg reported on its own.</p>`],
    ["sources", "Where do these figures come from?", `<p>All data come from <strong>Eurostat</strong>, the statistical office of the European Union, in the <strong>Comext</strong> database (dataset DS-045409). STATEC collects them in Luxembourg from company and customs declarations.</p><p>The populations used for per-inhabitant comparisons also come from Eurostat (dataset demo_pjan).</p>`],
  ],
  de: [
    ["services", "Nur Waren", `<p>Diese Website zählt <strong>Waren</strong>: Dinge, die per Lkw, Zug, Flugzeug oder Schiff eine Grenze überqueren. Sie zählt keine <strong>Dienstleistungen</strong>: Banken, Investmentfonds, Versicherungen, Beratung, Software, Transport.</p><p>Luxemburg erzielt aber den Großteil seiner Einnahmen mit Dienstleistungen. Es kauft mehr Waren, als es verkauft, verkauft aber weit mehr Dienstleistungen, als es kauft. STATEC veröffentlicht den Dienstleistungshandel in der Zahlungsbilanz.</p>`],
    ["flux", "Einkäufe und Verkäufe, Einfuhren und Ausfuhren", `<p>Luxemburgs <strong>Einkäufe</strong> im Ausland sind seine <strong>Einfuhren</strong>; seine <strong>Verkäufe</strong> ins Ausland sind seine <strong>Ausfuhren</strong>. Auf der ganzen Website sind Einkäufe braun und Verkäufe grün.</p><p>Der <strong>Saldo</strong> ist Verkäufe minus Einkäufe. Die <strong>Deckungsquote</strong> sagt, für wie viel Euro Luxemburg verkauft, wenn es für 100 € kauft.</p>`],
    ["expedition", "Versendungsland und Ursprungsland", `<p>Im Handel zwischen EU-Ländern erfasst die Statistik das Land, <strong>das die Ware versendet</strong>. Kaffee, der in Brasilien angebaut, in Deutschland geröstet und nach Luxemburg geliefert wird, erscheint als Einkauf aus Deutschland.</p><p>Belgien, Deutschland und die Niederlande haben mit ihren großen Häfen und Großhändlern daher viel Gewicht bei Luxemburgs Einkäufen.</p>`],
    ["euros", "Euro des jeweiligen Jahres", `<p>Die Beträge sind in <strong>jeweiligen Euro</strong> angegeben, also ohne Inflationsbereinigung. Ein steigender Betrag kann mehr Waren, höhere Preise oder beides bedeuten.</p><p>Für manche Waren zeigt die Website auch das Gewicht (in Tonnen oder in Litern für Getränke) und den Durchschnittspreis pro Kilo.</p>`],
    ["codes", "Codes mit 2, 4, 6 oder 8 Stellen", `<p>Jede Ware hat einen Code. Je länger der Code, desto genauer. Beispiel Schaumwein:</p><div class="digits" aria-hidden="true"><span>22</span><span>04</span><span>10</span><span>11</span><i></i><small>Kapitel</small><small>Position</small><small>Unterposition</small><small>KN-Code</small></div><p>22 = Getränke · 2204 = Wein · 220410 = Schaumwein · 22041011 = Champagner. Die ersten 6 Stellen (das „HS“, Harmonisiertes System) sind weltweit gleich; die letzten 2 (die „Kombinierte Nomenklatur“) gelten nur in der EU. Die Codes ändern sich etwa alle fünf Jahre, wodurch Lücken in den Reihen entstehen können.</p>`],
    ["secret", "Nicht ermittelte Länder und Statistikgeheimnis", `<p>Wenn nur ein Unternehmen eine Ware handelt, würde das genaue Land seine Geschäfte verraten. Ein Teil der Beträge landet dann bei „nicht ermittelten Ländern“. Die Website zählt ihn in den Summen und lässt ihn auf den Karten weg.</p>`],
    ["provisoire", "Vorläufige, später revidierte Zahlen", `<p>Die letzten Monate sind <strong>vorläufig</strong>: Meldungen kommen verspätet, Korrekturen erfolgen über mehrere Monate. Die Website vergleicht vollständige Monate, aber eine neue Zahl kann sich noch ändern.</p>`],
    ["saisons", "Ein Jahr oder einen Zeitraum wählen, Saisons sehen", `<p>Über den Grafiken können Sie das angezeigte <strong>Jahr</strong> wählen, bei Kurven auch einen <strong>Zeitraum</strong> „von … bis …“. Ranglisten und Karten zeigen das letzte Jahr des Zeitraums, Kurven den ganzen Zeitraum. Was die Website nicht im Voraus berechnet hat, liest sie bei Eurostat.</p><p>Der Reiter <strong>Saisonalität</strong> zeigt ein Feld pro Monat und Jahr. Standardmäßig wird jeder Monat mit dem Monatsdurchschnitt seines Jahres verglichen: Preissteigerungen und Wachstum von Jahr zu Jahr verschwinden, nur die Saisons bleiben sichtbar. Der Modus „Beträge“ zeigt die reinen Euro-Beträge. Die Zahlen sind nicht um Arbeitstage bereinigt.</p>`],
    ["avant1999", "Vor 1999: Belgien und Luxemburg gemeinsam", `<p>Bis 1998 meldeten Luxemburg und Belgien ihren Handel gemeinsam, im Rahmen der Belgisch-Luxemburgischen Wirtschaftsunion. Die Reihen dieser Website beginnen <strong>1999</strong>, dem ersten Jahr, in dem Luxemburg allein meldete.</p>`],
    ["sources", "Woher stammen diese Zahlen?", `<p>Alle Daten stammen von <strong>Eurostat</strong>, dem Statistikamt der Europäischen Union, aus der Datenbank <strong>Comext</strong> (Datensatz DS-045409). STATEC erhebt sie in Luxemburg aus Meldungen von Unternehmen und Zoll.</p><p>Die Bevölkerungszahlen für die Vergleiche pro Kopf stammen ebenfalls von Eurostat (Datensatz demo_pjan).</p>`],
  ],
};

const TEASER_TERMS = ["services", "expedition", "euros", "provisoire"];

function firstParagraphText(html) {
  return html.match(/<p>(.*?)<\/p>/)[1].replace(/<[^>]+>/g, "");
}

function termTeaser(id) {
  const [, title, body] = TERMS[lang()].find(([key]) => key === id);
  return `<div style="padding:18px 0;border-top:1px solid var(--rule)"><dt style="font-weight:700">${escapeHtml(title)}</dt>
      <dd style="margin:6px 0 0;color:var(--ink-2);font-size:var(--fs-small)">${escapeHtml(firstParagraphText(body))} <a href="${href("comprendre", { terme: id })}">${escapeHtml(t("home.more"))}</a></dd></div>`;
}

export function learnTeaser() {
  return `<dl style="margin:12px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:0 32px">${TEASER_TERMS.map(termTeaser).join("")}</dl>`;
}

function termSection(main, id) { return main.querySelector(`#terme-${id}`); }

const CHRONOLOGY_AFTER_TERM = "euros";

function termsWithChronology() {
  const terms = [...TERMS[lang()]];
  const position = terms.findIndex(([id]) => id === CHRONOLOGY_AFTER_TERM) + 1;
  terms.splice(position, 0, ["reperes", t("learn.milestones"), milestoneChronology()]);
  return terms;
}

export function renderLearn(main, _parts, params) {
  const terms = termsWithChronology();
  document.title = `${t("learn.title")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(t("learn.title"))}</h1>
    <p class="lede">${escapeHtml(t("learn.lede"))}</p>
    <nav aria-label="${escapeHtml(t("learn.title"))}"><ul class="toc" role="list">${terms.map(([id, title]) => `<li><a href="${href("comprendre", { terme: id })}" data-term="${id}">${escapeHtml(title)}</a></li>`).join("")}</ul></nav></section>
    <div class="prose">${terms.map(([id, title, body]) => `<section class="term" id="terme-${id}"><h2>${escapeHtml(title)}</h2>${body}</section>`).join("")}</div></div>`;
  main.querySelectorAll("[data-term]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    history.replaceState(null, "", link.getAttribute("href"));
    termSection(main, link.dataset.term)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const requestedTerm = params.get("terme");
  if (requestedTerm) requestAnimationFrame(() => termSection(main, requestedTerm)?.scrollIntoView({ block: "start" }));
}

const ABOUT = {
  fr: (meta) => `
    <p>Ce site vient du hackathon du STATEC. Chaque page répond d’abord en une phrase, puis donne le détail.</p>
    <h2>Les données</h2>
    <p>Les chiffres viennent de la base Comext d’Eurostat (jeu ${meta.dataset}), publiée le ${dateLong(meta.source_updated)}. Le serveur du site les lit sur l’API publique d’Eurostat, de 1999 à ${meta.latest_year}, et les recalcule à chaque nouvelle publication. Les totaux par pays sont ceux publiés par Eurostat.</p>
    <p>Ce que le serveur ne calcule pas d’avance, le site le lit <strong>en direct</strong> sur l’API, sans compte ni clé : les produits les plus détaillés (codes à 8 chiffres), le détail par pays d’une autre année, les séries mensuelles depuis 1999 et les autres pays de l’Union.</p>
    <h2>Limites</h2>
    <ul><li>Les services (finance, assurance…) : absents de ces données.</li><li>Les causes : le site décrit une hausse ou une baisse sans avancer d’hypothèse.</li><li>Les prévisions : le site ne calcule aucun chiffre futur.</li><li>Les volumes exacts : le site indique le poids quand Eurostat le publie, mais les montants restent en euros de chaque année.</li></ul>
    <h2 id="expert">Pour aller plus loin</h2>
    <ul><li><strong>Développeurs</strong> : l’API REST est décrite sur la page <a href="${href("api")}">API et MCP</a>.</li>
    <li><strong>Assistants d’IA</strong> : le serveur MCP du site (<code>/mcp</code>) donne ces chiffres et leur source à tout assistant compatible.</li>
    <li><strong>Réutiliser</strong> : vous pouvez télécharger chaque graphique en CSV, le partager par un lien ou l’intégrer dans un article avec le bouton « Intégrer ».</li>
    <li><strong>Suivre</strong> : le <a href="feed.xml">flux RSS</a> annonce les plus fortes variations.</li></ul>
    <h2>Vie privée</h2>
    <p>Le site ne dépose ni cookie ni traceur et ne tient aucune statistique de visite. Votre navigateur garde votre choix de langue, rien d’autre.</p>
    <h2>Crédits</h2>
    <p>Données : Eurostat (réutilisation autorisée avec mention de la source). Fonds de carte : Natural Earth (domaine public). Icônes : Lucide (licence ISC). Code : EUPL-1.2.</p>`,
  en: (meta) => `
    <p>This site comes from the STATEC hackathon. Each page answers in one sentence first, then gives the detail.</p>
    <h2>The data</h2>
    <p>The figures come from Eurostat’s Comext database (dataset ${meta.dataset}), published on ${dateLong(meta.source_updated)}. The site’s server reads them from Eurostat’s public API, from 1999 to ${meta.latest_year}, and recomputes them after each new release. Country totals are the ones Eurostat publishes.</p>
    <p>What the server does not compute in advance, the site reads <strong>live</strong> from the API, with no account or key: the most detailed products (8-digit codes), the country detail of another year, monthly series since 1999 and the other EU countries.</p>
    <h2>Limits</h2>
    <ul><li>Services (finance, insurance…): absent from these data.</li><li>Causes: the site describes a rise or fall and never guesses at its cause.</li><li>Forecasts: the site computes no future figures.</li><li>Exact volumes: the site shows weight when Eurostat has it, but amounts stay in each year’s euros.</li></ul>
    <h2 id="expert">Going further</h2>
    <ul><li><strong>Developers</strong>: the REST API is described on the <a href="${href("api")}">API and MCP</a> page.</li>
    <li><strong>AI assistants</strong>: the site’s MCP server (<code>/mcp</code>) gives these figures and their source to any compatible assistant.</li>
    <li><strong>Reuse</strong>: you can download any chart as CSV, share it by link or embed it in an article with the “Embed” button.</li>
    <li><strong>Follow</strong>: the <a href="feed-en.xml">RSS feed</a> announces the largest changes.</li></ul>
    <h2>Privacy</h2>
    <p>The site sets no cookies or trackers and keeps no visitor statistics. Your browser stores your language choice and nothing else.</p>
    <h2>Credits</h2>
    <p>Data: Eurostat (reuse authorised with source acknowledgement). Base map: Natural Earth (public domain). Icons: Lucide (ISC licence). Code: EUPL-1.2.</p>`,
  de: (meta) => `
    <p>Diese Website entstand beim STATEC-Hackathon. Jede Seite antwortet zuerst in einem Satz und zeigt dann die Details.</p>
    <h2>Die Daten</h2>
    <p>Die Zahlen stammen aus der Comext-Datenbank von Eurostat (Datensatz ${meta.dataset}), veröffentlicht am ${dateLong(meta.source_updated)}. Der Server der Website liest sie von 1999 bis ${meta.latest_year} aus der öffentlichen Eurostat-API und berechnet sie nach jeder neuen Veröffentlichung neu. Die Summen pro Land sind die von Eurostat veröffentlichten.</p>
    <p>Was der Server nicht im Voraus berechnet, liest die Website <strong>live</strong> aus der API, ohne Konto und ohne Schlüssel: die genauesten Waren (8-stellige Codes), die Länderdetails eines anderen Jahres, die Monatsreihen seit 1999 und die anderen EU-Länder.</p>
    <h2>Grenzen</h2>
    <ul><li>Dienstleistungen (Finanzen, Versicherungen…): fehlen in diesen Daten.</li><li>Ursachen: Die Website beschreibt einen Anstieg oder Rückgang, ohne Vermutungen über den Grund.</li><li>Prognosen: Die Website berechnet keine künftigen Zahlen.</li><li>Genaue Mengen: Die Website zeigt das Gewicht, wenn Eurostat es veröffentlicht, die Beträge bleiben aber in Euro des jeweiligen Jahres.</li></ul>
    <h2 id="expert">Mehr erfahren</h2>
    <ul><li><strong>Entwickler</strong>: Die REST-API ist auf der Seite <a href="${href("api")}">API und MCP</a> beschrieben.</li>
    <li><strong>KI-Assistenten</strong>: Der MCP-Server der Website (<code>/mcp</code>) liefert diese Zahlen mit ihrer Quelle an jeden kompatiblen Assistenten.</li>
    <li><strong>Weiterverwenden</strong>: Sie können jede Grafik als CSV herunterladen, per Link teilen oder mit „Einbetten“ in einen Artikel einbinden.</li>
    <li><strong>Verfolgen</strong>: Der <a href="feed-de.xml">RSS-Feed</a> meldet die größten Veränderungen.</li></ul>
    <h2>Datenschutz</h2>
    <p>Die Website setzt weder Cookies noch Tracker und führt keine Besucherstatistik. Ihr Browser speichert Ihre Sprachwahl und sonst nichts.</p>
    <h2>Danksagung</h2>
    <p>Daten: Eurostat (Weiterverwendung mit Quellenangabe erlaubt). Kartengrundlage: Natural Earth (gemeinfrei). Symbole: Lucide (ISC-Lizenz). Code: EUPL-1.2.</p>`,
};

export function renderAbout(main, _parts, params) {
  document.title = `${t("about.title")} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${escapeHtml(t("about.title"))}</h1></section>
    <div class="prose">${ABOUT[lang()](store.meta)}</div></div>`;
  const section = params.get("section");
  if (section) requestAnimationFrame(() => main.querySelector(`#${section}`)?.scrollIntoView({ block: "start" }));
}
