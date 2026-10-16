import { lang, numberWithoutTrailingZeros, t } from "../i18n.js";

const FIRST_SELF_ASSESSMENT = { conform: 64, nonConform: 3, notApplicable: 39 };
const RGAA_AUDIT = { conform: 67, nonConform: 0, notApplicable: 39 };
const AUTOMATED_CHECK_VIEWS = 8;

function conformityRate(audit = RGAA_AUDIT) {
  return numberWithoutTrailingZeros((audit.conform / (audit.conform + audit.nonConform)) * 100, 1);
}

const TEXT = {
  fr: () => ({
    title: "Déclaration d’accessibilité",
    body: `<p>Le site « Le Luxembourg et le monde », réalisé pendant le hackathon du STATEC, s’engage à rendre son contenu accessible. Il n’est pas publié par un organisme du secteur public : il suit volontairement la loi du 28 mai 2019 relative à l’accessibilité des sites internet et des applications mobiles des organismes du secteur public. Cette déclaration s’applique à ${location.origin}.</p>
      <h2>État de conformité</h2>
      <p>L’équipe a mené une auto-évaluation RGAA 4.1.2. La conformité complète reste à confirmer par des tests avec un lecteur d’écran et une nouvelle évaluation complète.</p>
      <h2>Résultats des tests</h2>
      <p>L’auto-évaluation du 15 octobre 2026 relevait ${FIRST_SELF_ASSESSMENT.conform} critères conformes, ${FIRST_SELF_ASSESSMENT.nonConform} non conformes et ${FIRST_SELF_ASSESSMENT.notApplicable} sans objet (${conformityRate(FIRST_SELF_ASSESSMENT)} %). Après la correction des critères 3.3, 10.4 et 10.13 le 16 octobre, l’équipe compte <strong>${conformityRate()} %</strong> des critères applicables respectés : ${RGAA_AUDIT.conform} conformes, ${RGAA_AUDIT.nonConform} non conforme et ${RGAA_AUDIT.notApplicable} sans objet, sur les 106 critères du RGAA. Ce décompte ne remplace pas une nouvelle évaluation complète.</p>
      <p>Le 16 octobre 2026, un contrôle automatique axe-core 4.10.2 n’a relevé aucune erreur sur ${AUTOMATED_CHECK_VIEWS} vues, dont les fonctions ajoutées ce jour-là : choix de l’année et de la période, onglet Saisonnalité. Ces fonctions, comme les repères et les barres de contribution, n’ont pas encore eu de contrôle manuel critère par critère.</p>
      <h2>Contenus non accessibles</h2>
      <h3>Non-conformités</h3>
      <p>Aucune.</p>
      <h3>Dérogations pour charge disproportionnée</h3>
      <p>Aucune.</p>
      <h3>Contenus non soumis à l’obligation d’accessibilité</h3>
      <p>Les données d’Eurostat, lues en direct ou téléchargées, sont publiées par Eurostat.</p>
      <h2>Établissement de cette déclaration</h2>
      <p>Cette déclaration a été établie le 15 octobre 2026 et mise à jour le 16 octobre 2026. Elle repose sur une auto-évaluation de l’équipe du site, et non sur un audit réalisé par un tiers.</p>
      <h3>Technologies utilisées</h3>
      <ul><li>HTML</li><li>CSS</li><li>JavaScript</li><li>SVG</li><li>WAI-ARIA</li></ul>
      <h3>Environnement de test</h3>
      <p>Navigateur Chromium sur ordinateur et en affichage mobile (320 et 375 pixels de large), clavier seul, texte agrandi à 200 %, espacement du texte augmenté, thèmes clair et sombre. Aucun test n’a encore été mené avec un lecteur d’écran.</p>
      <h3>Outils d’évaluation</h3>
      <ul><li>axe-core 4.10.2, pour les contrôles automatiques WCAG 2.0, 2.1 et 2.2 de niveaux A et AA</li><li>Calcul des contrastes de toutes les couleurs de texte et de graphique</li><li>Contrôles manuels, critère par critère</li></ul>
      <h3>Pages évaluées</h3>
      <ul><li>Accueil</li><li>Produits</li><li>Une page produit (le vin), avec ses vues carte, solde et tableau</li><li>Pays et une page pays (la France)</li><li>Comparer</li><li>Ce qui change</li><li>Quiz</li><li>Comprendre et À propos</li><li>Recherche</li><li>API et MCP</li></ul>
      <h2>Retour d’information et contact</h2>
      <p>Aucune adresse n’est encore ouverte pour signaler un défaut d’accessibilité. Elle sera ajoutée à cette page dès qu’elle existera.</p>
      <h2>Voies de recours</h2>
      <p>La procédure prévue par la loi du 28 mai 2019, une réclamation auprès du Service information et presse puis de l’Ombudsman, concerne les sites des organismes du secteur public. Ce site n’en fait pas partie.</p>
      <p class="note">Cette déclaration suit le modèle de la décision d’exécution (UE) 2018/1523.</p>`,
  }),
  en: () => ({
    title: "Accessibility statement",
    body: `<p>The website “Luxembourg and the world”, built during the STATEC hackathon, is committed to making its content accessible. It is not published by a public sector body: it voluntarily follows the Luxembourg law of 28 May 2019 on the accessibility of the websites and mobile applications of public sector bodies. This statement applies to ${location.origin}.</p>
      <h2>Compliance status</h2>
      <p>The team has carried out an internal RGAA 4.1.2 assessment. Full compliance still needs screen reader testing and a new full assessment.</p>
      <h2>Test results</h2>
      <p>The self-assessment of 15 October 2026 found ${FIRST_SELF_ASSESSMENT.conform} compliant criteria, ${FIRST_SELF_ASSESSMENT.nonConform} non-compliant and ${FIRST_SELF_ASSESSMENT.notApplicable} not applicable (${conformityRate(FIRST_SELF_ASSESSMENT)}%). After criteria 3.3, 10.4 and 10.13 were fixed on 16 October, the team counts <strong>${conformityRate()}%</strong> of applicable criteria met: ${RGAA_AUDIT.conform} compliant, ${RGAA_AUDIT.nonConform} non-compliant and ${RGAA_AUDIT.notApplicable} not applicable, out of 106 RGAA criteria. This count does not replace a new full assessment.</p>
      <p>On 16 October 2026, an automated axe-core 4.10.2 check found no errors on ${AUTOMATED_CHECK_VIEWS} views, including the features added that day: year and period choice, Seasonality tab. These features, like key events and contribution bars, have not yet had a manual criterion-by-criterion check.</p>
      <h2>Non-accessible content</h2>
      <h3>Non-compliances</h3>
      <p>None.</p>
      <h3>Disproportionate burden</h3>
      <p>None.</p>
      <h3>Content outside the scope of the law</h3>
      <p>Eurostat data, read live or downloaded, is published by Eurostat.</p>
      <h2>Preparation of this statement</h2>
      <p>This statement was prepared on 15 October 2026 and updated on 16 October 2026. It is based on a self-assessment by the site team, not on an audit by a third party.</p>
      <h3>Technologies used</h3>
      <ul><li>HTML</li><li>CSS</li><li>JavaScript</li><li>SVG</li><li>WAI-ARIA</li></ul>
      <h3>Test environment</h3>
      <p>Chromium browser on desktop and in mobile view (320 and 375 pixels wide), keyboard only, text enlarged to 200%, increased text spacing, light and dark themes. No test has yet been carried out with a screen reader.</p>
      <h3>Evaluation tools</h3>
      <ul><li>axe-core 4.10.2, for automated WCAG 2.0, 2.1 and 2.2 level A and AA checks</li><li>Contrast calculation for every text and chart colour</li><li>Manual checks, criterion by criterion</li></ul>
      <h3>Pages evaluated</h3>
      <ul><li>Home</li><li>Products</li><li>A product page (wine), with its map, balance and table views</li><li>Countries and a country page (France)</li><li>Compare</li><li>What’s changing</li><li>Quiz</li><li>Understand and About</li><li>Search</li><li>API and MCP</li></ul>
      <h2>Feedback and contact</h2>
      <p>No address is open yet for reporting an accessibility problem. It will be added to this page as soon as it exists.</p>
      <h2>Enforcement procedure</h2>
      <p>The procedure set out in the law of 28 May 2019, a complaint to the Service information et presse and then to the Ombudsman, applies to the websites of public sector bodies. This website is not one of them.</p>
      <p class="note">This statement follows the model of Commission Implementing Decision (EU) 2018/1523.</p>`,
  }),
  de: () => ({
    title: "Erklärung zur Barrierefreiheit",
    body: `<p>Die Website „Luxemburg und die Welt“, entstanden beim STATEC-Hackathon, verpflichtet sich, ihre Inhalte barrierefrei zu machen. Sie wird nicht von einer öffentlichen Stelle veröffentlicht: Sie folgt freiwillig dem luxemburgischen Gesetz vom 28. Mai 2019 über die Barrierefreiheit der Websites und mobilen Anwendungen öffentlicher Stellen. Diese Erklärung gilt für ${location.origin}.</p>
      <h2>Stand der Vereinbarkeit</h2>
      <p>Das Team hat eine interne RGAA-4.1.2-Prüfung durchgeführt. Die vollständige Vereinbarkeit muss noch durch Screenreader-Tests und eine neue vollständige Prüfung bestätigt werden.</p>
      <h2>Testergebnisse</h2>
      <p>Die Selbstbewertung vom 15. Oktober 2026 ergab ${FIRST_SELF_ASSESSMENT.conform} erfüllte, ${FIRST_SELF_ASSESSMENT.nonConform} nicht erfüllte und ${FIRST_SELF_ASSESSMENT.notApplicable} nicht anwendbare Kriterien (${conformityRate(FIRST_SELF_ASSESSMENT)} %). Nach der Korrektur der Kriterien 3.3, 10.4 und 10.13 am 16. Oktober zählt das Team <strong>${conformityRate()} %</strong> erfüllte anwendbare Kriterien: ${RGAA_AUDIT.conform} erfüllt, ${RGAA_AUDIT.nonConform} nicht erfüllt und ${RGAA_AUDIT.notApplicable} nicht anwendbar, von 106 RGAA-Kriterien. Diese Zählung ersetzt keine neue vollständige Prüfung.</p>
      <p>Am 16. Oktober 2026 fand eine automatische Prüfung mit axe-core 4.10.2 auf ${AUTOMATED_CHECK_VIEWS} Ansichten keine Fehler, auch nicht bei den an diesem Tag ergänzten Funktionen: Wahl von Jahr und Zeitraum, Reiter Saisonalität. Diese Funktionen wurden, wie die Ereignismarken und die Beitragsbalken, noch nicht manuell Kriterium für Kriterium geprüft.</p>
      <h2>Nicht barrierefreie Inhalte</h2>
      <h3>Unvereinbarkeiten</h3>
      <p>Keine.</p>
      <h3>Unverhältnismäßige Belastung</h3>
      <p>Keine.</p>
      <h3>Inhalte außerhalb des Anwendungsbereichs</h3>
      <p>Die Daten von Eurostat, live gelesen oder heruntergeladen, werden von Eurostat veröffentlicht.</p>
      <h2>Erstellung dieser Erklärung</h2>
      <p>Diese Erklärung wurde am 15. Oktober 2026 erstellt und am 16. Oktober 2026 aktualisiert. Sie beruht auf einer Selbstbewertung durch das Team der Website, nicht auf einer Prüfung durch Dritte.</p>
      <h3>Verwendete Technologien</h3>
      <ul><li>HTML</li><li>CSS</li><li>JavaScript</li><li>SVG</li><li>WAI-ARIA</li></ul>
      <h3>Testumgebung</h3>
      <p>Chromium-Browser auf dem Computer und in der mobilen Ansicht (320 und 375 Pixel breit), nur Tastatur, Text auf 200 % vergrößert, erhöhte Textabstände, helles und dunkles Design. Ein Test mit einem Screenreader wurde noch nicht durchgeführt.</p>
      <h3>Prüfwerkzeuge</h3>
      <ul><li>axe-core 4.10.2, für automatische WCAG-2.0-, 2.1- und 2.2-Prüfungen der Stufen A und AA</li><li>Berechnung der Kontraste aller Text- und Grafikfarben</li><li>Manuelle Prüfungen, Kriterium für Kriterium</li></ul>
      <h3>Geprüfte Seiten</h3>
      <ul><li>Startseite</li><li>Waren</li><li>Eine Warenseite (Wein), mit Karte, Saldo und Tabelle</li><li>Länder und eine Länderseite (Frankreich)</li><li>Vergleichen</li><li>Was sich ändert</li><li>Quiz</li><li>Verstehen und Über</li><li>Suche</li><li>API und MCP</li></ul>
      <h2>Feedback und Kontakt</h2>
      <p>Es gibt noch keine Adresse, um einen Mangel an Barrierefreiheit zu melden. Sie wird auf dieser Seite ergänzt, sobald es sie gibt.</p>
      <h2>Durchsetzungsverfahren</h2>
      <p>Das im Gesetz vom 28. Mai 2019 vorgesehene Verfahren, eine Beschwerde beim Service information et presse und dann beim Ombudsman, gilt für die Websites öffentlicher Stellen. Diese Website gehört nicht dazu.</p>
      <p class="note">Diese Erklärung folgt dem Muster des Durchführungsbeschlusses (EU) 2018/1523.</p>`,
  }),
};

export function render(main) {
  const { title, body } = TEXT[lang()]();
  document.title = `${title} · ${t("site.title")}`;
  main.innerHTML = `<div class="page"><section class="intro"><h1>${title}</h1></section><div class="prose">${body}</div></div>`;
}
