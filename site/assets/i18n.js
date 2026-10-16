export const LANGS = ["fr", "en", "de"];
const LOCALES = { fr: "fr-FR", en: "en-GB", de: "de-DE" };
const NNBSP = " ";
const NBSP = " ";

const STRINGS = {
  fr: {
    "site.title": "Le Luxembourg et le monde",
    "site.subtitle": "Le commerce de marchandises en chiffres",
    "skip": "Aller au contenu",
    "nav.home": "Accueil", "nav.products": "Produits", "nav.countries": "Pays",
    "nav.changes": "Ce qui change", "nav.quiz": "Quiz", "nav.learn": "Comprendre", "nav.about": "À propos",
    "lang.label": "Langue",
    "search.label": "Rechercher un produit, un pays ou poser une question",
    "search.placeholder": `Café, Japon, d’où vient le vin${NNBSP}?`,
    "search.products": "Produits", "search.countries": "Pays", "search.detail": "Produits détaillés",
    "search.none": "Aucun résultat. Essayez un mot plus simple (« voiture », « vin ») ou un code à 2, 4, 6 ou 8 chiffres.",
    "search.try": "Essayez",
    "search.open": "Voir le détail",
    "search.loadingDetail": "Recherche dans les 9 000 codes détaillés…",
    "flow.imp": "Achats", "flow.exp": "Ventes",
    "flow.imp.long": "importations", "flow.exp.long": "exportations",
    "flow.imp.verb": "acheté", "flow.exp.verb": "vendu",
    "flow.switch": "Afficher les achats ou les ventes",
    "source": `Source${NBSP}: Eurostat, Comext ({dataset}), données publiées le {date}. Montants en euros courants.`,
    "action.download": "Données (CSV)", "action.share": "Partager", "action.embed": "Intégrer",
    "action.milestones": "Repères", "milestones.details": "Les repères en détail", "milestones.sources": `Sources${NBSP}:`, "milestones.seeChart": "Voir la courbe",
    "milestones.caution": "Ces courbes ne mesurent pas l’effet de chaque événement sur les échanges.",
    "milestones.chronologyLede": "Six événements depuis 1999, avec les chiffres du commerce de marchandises du Luxembourg.",
    "learn.milestones": "Les crises vues dans les chiffres",
    "change.rest": "Tout le reste", "change.title": "Ce qui a changé entre {previous} et {year}",
    "change.sub": `Écart par produit. Variation totale${NBSP}: {total}. «${NNBSP}Tout le reste${NNBSP}» regroupe les autres produits et ce qui n’est pas détaillé.`,
    "home.i6.title": `En {year}, le plus gros écart dans les achats vient du groupe «${NNBSP}{top}${NNBSP}» ({change})`,
    "home.i6.text": "De {previous} à {year}, les achats varient de {imp} et les ventes de {exp}. Les barres montrent les groupes de produits qui pèsent le plus dans ces écarts.",
    "home.i6.chart": "Variation entre {previous} et {year}, par groupe de produits",
    "action.copied": "Lien copié", "action.codeCopied": "Code d’intégration copié",
    "action.copyFailed": "La copie a échoué. Sélectionnez et copiez le texte manuellement.",
    "breadcrumb": "Fil d’Ariane",
    "country.missing": "Certaines données d’achats ou de ventes manquent ; le solde ne peut pas être calculé.",
    "country.chart.availableTitle": "Achats et ventes de marchandises avec {name}, par an",
    "changes.unavailable": "La comparaison nécessite 24 mois complets de données. Elle sera disponible quand cette série sera complète.",
    "action.explain": "Expliquer ce graphique", "action.hideExplain": "Masquer l’explication",
    "tab.map": "Carte", "tab.ranking": "Classement", "tab.evolution": "Évolution", "tab.table": "Tableau",
    "tab.products": "Produits", "tab.months": "Derniers mois",
    "map.europe": "Europe", "map.world": "Monde", "map.noData": "Pas d’échange observé",
    "map.share": "Part du total", "map.luxembourg": "Luxembourg",
    "tab.balance": "Solde", "year.label": "Année",
    "chart.display": "Affichage", "map.zone": "Zone de la carte",
    "footer.a11y": "Accessibilité : évaluation et limites",
    "neighbours.toggle": "Sans les pays voisins", "neighbours.title": "Masquer la Belgique, l’Allemagne et la France pour mieux voir les autres pays",
    "neighbours.suffix": "hors pays voisins", "map.excluded": "Pays voisin masqué",
    "neighbours.note": "Sans la Belgique, l’Allemagne et la France : les parts portent sur les autres pays.",
    "neighbours.noteBalance": "Sans la Belgique, l’Allemagne et la France : les teintes portent sur les autres pays.",
    "neighbours.only": "En {year}, ce produit ne s’échange qu’avec les pays voisins.",
    "year.loading": "Lecture des chiffres de {year} chez Eurostat…",
    "year.error": "Le site n’a pas pu lire les chiffres de {year} chez Eurostat. Réessayez dans un moment ou choisissez une autre année.",
    "tab.seasonality": "Saisonnalité",
    "seasonality.title.imp": "{name}{nb}: les achats culminent en général en {month}",
    "seasonality.title.exp": "{name}{nb}: les ventes culminent en général en {month}",
    "seasonality.titlePlain": "{name}{nb}: les échanges mois par mois",
    "seasonality.sub": "Une case par mois, de {from} à {until}. Plus elle est foncée, plus le montant est élevé.",
    "seasonality.subSeason": "Une case par mois, de {from} à {until}. Plus elle est foncée, plus le mois dépasse la moyenne de son année.",
    "seasonality.mode": "Couleur des cases", "seasonality.mode.values": "Montants", "seasonality.mode.season": "Écart à la moyenne de l’année",
    "seasonality.versusAverage": "{change} par rapport à la moyenne mensuelle de l’année",
    "seasonality.explain": "Chaque ligne est une année et chaque colonne un mois. Le mode « Écart à la moyenne de l’année » compare chaque mois à la moyenne mensuelle de son année, ce qui fait ressortir les saisons même quand les montants changent d’une année à l’autre. Le mois le plus fort du titre se calcule sur les années complètes de la période.",
    "seasonality.loading": "Lecture des chiffres mensuels chez Eurostat…",
    "seasonality.error": "Le site n’a pas pu lire les chiffres mensuels chez Eurostat. Réessayez dans un moment.",
    "period.label": "Période", "period.from": "De", "period.to": "à",
    "period.single": "Le détail par produit des échanges avec chaque pays n’existe que pour {latest}.",
    "balance.buysMore": "Le Luxembourg achète plus", "balance.sellsMore": "Le Luxembourg vend plus",
    "balance.even": "Équilibre", "balance.label": "Solde", "balance.none": "Aucun pays",
    "balance.gap.imp": "le plus gros écart est avec {def}, {amount} d’achats de plus que de ventes",
    "balance.gap.exp": "le plus gros écart est avec {def}, {amount} de ventes de plus que d’achats",
    "balance.listImp": "Le Luxembourg achète plus qu’il ne vend", "balance.listExp": "Le Luxembourg vend plus qu’il n’achète",
    "balance.explain": `Pour chaque pays, on retire ce que le Luxembourg lui achète de ce qu’il lui vend en {year}. En brun, le Luxembourg achète plus qu’il ne vend${NNBSP}; en vert, il vend plus qu’il n’achète. Les trois teintes classent l’écart par ordre de grandeur${NNBSP}: moins de {low}, de {low} à {high}, {high} et plus. En gris, l’écart reste sous 5${NNBSP}% des échanges avec le pays${NNBSP}: les achats et les ventes restent proches. Ici, {sells} pays penchent vers les ventes, {buys} vers les achats et {even} sont à l’équilibre.`,
    "product.balance.title": "{name}{nb}: {gap}",
    "product.balance.sub": "Ventes moins achats avec chaque pays en {year}. Plus la teinte est foncée, plus l’écart est grand.",
    "country.index.balanceSub": "Ventes moins achats avec chaque pays en {year}, toutes marchandises. Plus la teinte est foncée, plus l’écart est grand.",
    "compare.link": "Comparer avec les autres pays de l’UE",
    "nav.compare": "Comparer",
    "compare.title": "Où se situe le Luxembourg dans l’UE{q}",
    "compare.allGoods": "Toutes les marchandises", "compare.ofAll": "de marchandises", "compare.nameAll": "marchandises",
    "compare.product": "Produit", "compare.productPlaceholder": "Chercher un produit (vin, voiture…)",
    "compare.loading": "Lecture des chiffres des 27 pays chez Eurostat…",
    "compare.error": "Le site n’a pas pu lire les chiffres chez Eurostat. Réessayez dans un moment.", "compare.retry": "Réessayer",
    "compare.flowNoun.imp": "achats", "compare.flowNoun.exp": "ventes", "compare.flowNom.imp": "Achats", "compare.flowNom.exp": "Ventes",
    "compare.measure": "Mesure", "compare.measure.habitant": "Par habitant", "compare.measure.part": "Part du total", "compare.measure.euros": "En euros",
    "compare.measureLong.habitant": "Par habitant", "compare.measureLong.part": "En part des {flowNoun}", "compare.measureLong.euros": "En montant",
    "compare.euAverage": "Moyenne de l’UE", "compare.peers": "Comparé à", "compare.add": "Ajouter un pays", "compare.remove": "Retirer {name}",
    "compare.col.value": "{FlowNoun} {year}", "compare.col.rank": "Rang",
    "compare.when.year": "en {year}", "compare.when.range": "de {first} à {last}",
    "compare.lede.habitant.imp": "En {year}, le Luxembourg a acheté {value} {of} par habitant, au {ord} rang des {count} pays de l’UE, contre {eu} en moyenne dans l’Union.",
    "compare.lede.habitant.exp": "En {year}, le Luxembourg a vendu {value} {of} par habitant, au {ord} rang des {count} pays de l’UE, contre {eu} en moyenne dans l’Union.",
    "compare.lede.part.imp": `En {year}, la part {of} dans les achats de marchandises du Luxembourg atteint {value}, contre {eu} en moyenne dans l’UE${NBSP}: {ord} rang sur {count}.`,
    "compare.lede.part.exp": `En {year}, la part {of} dans les ventes de marchandises du Luxembourg atteint {value}, contre {eu} en moyenne dans l’UE${NBSP}: {ord} rang sur {count}.`,
    "compare.lede.euros.imp": "En {year}, le Luxembourg a acheté pour {value} {of}, au {ord} rang des {count} pays de l’UE. Rapporté au nombre d’habitants, il passe au {ordHead} rang.",
    "compare.lede.euros.exp": "En {year}, le Luxembourg a vendu pour {value} {of}, au {ord} rang des {count} pays de l’UE. Rapporté au nombre d’habitants, il passe au {ordHead} rang.",
    "compare.lede.none": "Eurostat ne publie pas ce chiffre pour le Luxembourg en {year}.",
    "compare.title.habitant": "Par habitant, le Luxembourg arrive {ord} des {count} pays de l’UE pour les {flowNoun} {of}",
    "compare.title.part": "Le Luxembourg arrive {ord} des {count} pays de l’UE pour la part {of} dans ses {flowNoun}",
    "compare.title.euros": "En montant, le Luxembourg arrive {ord} des {count} pays de l’UE pour les {flowNoun} {of}",
    "compare.title.evolution": "{Measure}, le Luxembourg est à {x} fois la moyenne de l’UE en {year}",
    "compare.sub.habitant": "{FlowNoun} {of} avec le monde entier, divisés par le nombre d’habitants au 1er janvier, {when}",
    "compare.sub.part": "Part {of} dans l’ensemble des {flowNoun} de marchandises de chaque pays, {when}",
    "compare.sub.euros": "{FlowNoun} {of} de chaque pays avec le monde entier, en euros courants, {when}",
    "compare.explain": `Les montants viennent d’Eurostat (Comext) pour chaque pays de l’UE, avec le monde entier. Par habitant, le site les divise par la population au 1er janvier (Eurostat, demo_pjan). En part du total, il les divise par l’ensemble des {flowNoun} de marchandises du même pays. La moyenne de l’UE divise la somme des montants par la somme des habitants ou des totaux${NNBSP}; en euros, c’est la moyenne des pays.`,
    "compare.note.workers": "Près de la moitié des salariés du Luxembourg vivent en France, en Belgique ou en Allemagne. Ils ne comptent pas parmi les habitants, ce qui gonfle les montants par habitant du Luxembourg.",
    "compare.note.ports": "Les grands ports de Belgique et des Pays-Bas reçoivent des marchandises destinées à toute l’Europe, ce qui gonfle leurs achats et leurs ventes.",
    "compare.note.years": "La comparaison couvre les 27 pays actuels de l’UE sur toute la période, y compris avant leur adhésion. Une année sans chiffre publié reste vide.",
    "compare.note.live": "Le site lit ces chiffres chez Eurostat à l’ouverture de la page, puis les garde quelques heures en cache.",
    "others": "Autres pays", "unspecified": "Pays non précisés",
    "table.country": "Pays", "table.value": "Montant {year}", "table.share": "Part",
    "table.change": "Sur un an", "table.year": "Année",
    "na": "n.d.",
    "loading": "Chargement des données…",
    "error.load": "Le site n’a pas pu charger les données. Vérifiez la connexion puis rechargez la page.",
    "error.notFound": "Cette page n’existe pas.",
    "error.product": "Ce code produit est inconnu ou n’a pas d’échanges avec le Luxembourg.",
    "error.country": "Ce pays n’a pas d’échanges observés avec le Luxembourg.",
    "back.home": "Revenir à l’accueil",

    "home.title": "Ce que le Luxembourg achète et vend au monde",
    "home.lede": "En {year}, le Luxembourg a acheté pour <strong>{imp}</strong> de marchandises à l’étranger et en a vendu pour <strong>{exp}</strong>.",
    "home.meta": "Données Eurostat publiées le {date} · biens uniquement, hors services",
    "home.method": "Comment lire ces chiffres",
    "home.insights": "Le commerce en six graphiques",
    "home.i1.title": "Chaque jour, {perDay} de marchandises arrivent au Luxembourg",
    "home.i1.text": "Sur l’année {year}, cela fait {imp} d’achats contre {exp} de ventes. Pour 100{nb}€ de biens achetés à l’étranger, le Luxembourg en vend {coverage}.",
    "home.i1.chart": "Achats et ventes de marchandises du Luxembourg, par an",
    "home.i2.title": "Le Luxembourg achète plus de biens qu’il n’en vend",
    "home.i2.text": "Ce déficit revient chaque année depuis 1999. Ces chiffres laissent de côté les échanges de services (finance, assurance, logistique, informatique).",
    "home.i2.chart": "Différence entre ventes et achats de marchandises, par an",
    "home.i3.title": "Trois voisins fournissent {share3} des achats",
    "home.i3.titleTopThree": "Les trois premiers fournisseurs assurent {share3} des achats",
    "home.i3.text": "{first}, {second} et {third} sont les premiers fournisseurs. Le graphique indique le pays d’expédition, qui peut différer du pays de fabrication.",
    "home.i3.chart": "Principaux fournisseurs et clients du Luxembourg en {year}",
    "home.i4.title": "Les trois premiers groupes de produits représentent {share} des achats",
    "home.i4.text": "En tête des achats{nb}: {imp}. Côté ventes{nb}: {exp}.",
    "home.i4.chart": "Grands groupes de produits en {year}",
    "home.i5.title": "Depuis 2015, les ventes du Luxembourg ont moins progressé que celles de huit pays comparables",
    "home.i5.text": "En euros courants, les exportations de biens du Luxembourg ont augmenté de {lu} entre 2015 et {year}, la plus faible hausse parmi ses voisins et les petites économies ouvertes de l’Union.",
    "home.i5.chart": "Exportations de marchandises, indice 100 en 2015",
    "home.daily": "D’où viennent les produits du quotidien{q}",
    "home.daily.lede": "Le premier pays fournisseur de chaque produit en {year}, et sa part dans les achats du Luxembourg.",
    "home.daily.from": "surtout {from}",
    "home.changes": "Changements récents",
    "home.changes.lede": "Les plus fortes variations des 12 derniers mois, comparés aux 12 précédents.",
    "home.changes.all": "Voir tous les changements",
    "home.quiz": "Quiz",
    "home.quiz.text": "Douze questions sur le commerce du Luxembourg, dont une où vous dessinez une courbe. Le site calcule les réponses sur les dernières données.",
    "home.quiz.start": "Commencer le quiz",
    "home.learn": "Avant de lire les chiffres",
    "home.more": "Lire la suite",

    "product.titleImp": "{name}{nb}: d’où viennent les achats du Luxembourg{q}",
    "product.titleExp": "{name}{nb}: où vont les ventes du Luxembourg{q}",
    "product.ledeImp": "En {year}, le Luxembourg a acheté pour <strong>{value}</strong> {of} à l’étranger.",
    "product.ledeExp": "En {year}, le Luxembourg a vendu pour <strong>{value}</strong> {of} à l’étranger.",
    "product.topImp": " {Top} en a fourni <strong>{share}</strong>",
    "product.topExp": " {Top} en a acheté <strong>{share}</strong>",
    "product.ahead": ", devant {second} ({s2})",
    "product.ahead2": " et {third} ({s3})",
    "product.none": "Eurostat n’a enregistré aucun échange de ce produit en {year}.",
    "product.mass.tonnes": "{n} tonnes", "product.mass.kg": "{n} kg", "product.mass.litres": "≈{nb}{n} litres",
    "product.price.kg": "{n} le kilo", "product.price.litre": "{n} le litre", "product.price.tonne": "{n} la tonne",
    "product.chart.map": "{name}{nb}: {share} des achats viennent {from}",
    "product.chart.mapExp": "{name}{nb}: {share} des ventes partent {vers}",
    "product.chart.sub": "Part de chaque pays dans les {flow} du Luxembourg en {year}",
    "product.chart.evoTitle": "{name}{nb}: évolution des {flow} depuis {first}",
    "product.chart.evoSub": "Montant annuel en euros courants, total et cinq premiers pays",
    "product.chart.monthsTitle": "{name}{nb}: les {n} derniers mois",
    "product.chart.monthsSub": "Montant mensuel, de {from} à {to}",
    "product.inside": "Ce qu’il y a dedans",
    "product.insideLede": "Les catégories plus détaillées qui composent ce produit, en {year}.",
    "product.related": "Produits voisins",
    "product.code": "Code et libellé officiels",
    "product.codeText": "Code {level} {code} de la nomenclature combinée de l’Union européenne.",
    "product.level.2": "chapitre (2 chiffres)", "product.level.4": "position SH (4 chiffres)",
    "product.level.6": "sous-position SH (6 chiffres)", "product.level.8": "code NC (8 chiffres)",
    "product.levels": "Plus le code est long, plus le produit est précis.",
    "product.goodToKnow": "Bon à savoir",
    "product.note.dispatch": "Pour les achats venant d’un pays de l’Union, le site indique le pays d’expédition : {Top} a expédié la marchandise, mais un autre pays a pu la produire.",
    "product.moreMass": "Cela représente {mass}, soit {price} en moyenne.",
    "product.moreTrend": "C’est {change} sur un an et {ten} en dix ans.",
    "product.moreTrend1": "C’est {change} sur un an.",
    "country.title.since.pos": "Depuis {since}, le Luxembourg vend plus {to} qu’il ne lui achète",
    "country.title.since.neg": "Depuis {since}, le Luxembourg achète plus {to} qu’il ne lui vend",
    "country.title.year.pos": "En {year}, le Luxembourg a vendu plus {to} qu’il ne lui a acheté",
    "country.title.year.neg": "En {year}, le Luxembourg a acheté plus {to} qu’il ne lui a vendu",
    "country.chart.monthsImp": "Ce que le Luxembourg achète {to}, mois par mois",
    "country.chart.monthsExp": "Ce que le Luxembourg vend {to}, mois par mois",
    "country.products.imp": "Principaux achats du Luxembourg{nb}: {list}.",
    "country.products.exp": "Principales ventes{nb}: {list}.",
    "product.note.gaps": "Certaines années n’ont pas de valeur : le code a pu changer lors d’une révision de la nomenclature.",
    "product.note.money": "Les montants sont en euros de chaque année, sans correction de l’inflation : une hausse peut venir des prix comme des quantités.",
    "product.note.small": "Montants faibles : une seule livraison peut fortement modifier les chiffres d’une année.",
    "product.live": "Données en direct de l’API d’Eurostat",
    "product.liveLoading": "Lecture en direct des données Eurostat…",
    "product.liveError": "Eurostat n’a pas répondu. Ce produit détaillé nécessite une connexion Internet.",
    "product.explain.map": "Cette carte colore chaque pays selon sa part dans les {flow} {of} du Luxembourg en {year}. Plus la couleur est foncée, plus la part est grande. {Top} arrive en tête avec {share}{ahead}. Les {n} premiers pays représentent {cum} du total. Les pays hachurés n’ont aucun échange observé.",
    "product.explain.ranking": "Ce classement range les pays du plus grand au plus petit montant en {year}. {Top} représente {share} des {flow}, soit {value}. Au total, {count} pays ont des échanges observés pour ce produit.",
    "product.explain.evolution": "Cette courbe montre le montant total des {flow} chaque année depuis {first}. Il est passé de {start} en {first} à {end} en {year}, soit {change}. Il a culminé en {peakYear} ({peak}).",
    "product.explain.table": "Ce tableau donne le montant exact, la part et la variation sur un an pour chaque pays. Vous pouvez le trier et le télécharger.",
    "product.explain.months": "Ces barres montrent le montant de chaque mois. Les variations d’un mois à l’autre sont fréquentes ; comparez plutôt un mois au même mois de l’année précédente.",
    "product.explain.caveat": "Ces chiffres décrivent les échanges et ne disent rien de leurs causes.",

    "country.title": "Le Luxembourg et {name}",
    "country.lede.both": "{Name} est le {rankExp} client du Luxembourg (<strong>{shareExp}</strong> des ventes, {exp}) et son {rankImp} fournisseur (<strong>{shareImp}</strong> des achats, {imp}) en {year}.",
    "country.lede.balancePos": "Le Luxembourg lui vend plus qu’il ne lui achète : {balance} d’excédent.",
    "country.lede.balanceNeg": "Le Luxembourg lui achète plus qu’il ne lui vend : {balance} de déficit.",
    "country.fact.balance": "Solde",
    "country.chart.evoSub": "Montant annuel en euros courants depuis 1999",
    "country.chart.productsImp": "Ce que le Luxembourg achète {to} en {year}",
    "country.chart.productsExp": "Ce que le Luxembourg vend {to} en {year}",
    "country.chart.productsSub": "Principaux produits, en part du total échangé avec ce pays",
    "country.index.title": "Avec quels pays le Luxembourg échange-t-il{q}",
    "country.index.lede": "{count} pays et territoires ont acheté ou vendu des marchandises au Luxembourg en {year}. Les trois premiers sont des voisins.",
    "country.index.map": "Part de chaque pays dans les {flow} du Luxembourg en {year}",
    "country.index.all": "Tous les pays",
    "country.index.filter": "Filtrer les pays",

    "products.title": "Que vend et qu’achète le Luxembourg{q}",
    "products.lede": "La nomenclature classe les marchandises en 97 chapitres, puis en catégories de plus en plus précises. Choisissez un chapitre pour voir son détail, ou cherchez un produit avec vos propres mots.",
    "products.chart": "Les chapitres de produits, du plus important au plus petit, en {year}",
    "products.filter": "Filtrer les chapitres",

    "changes.title": "Ce qui change dans le commerce du Luxembourg",
    "changes.lede": "Comparaison des 12 derniers mois connus ({now}) avec les 12 mois précédents ({before}). Les achats ont évolué de <strong>{imp}</strong> et les ventes de <strong>{exp}</strong>.",
    "changes.products": "Plus fortes variations par produit",
    "changes.partners": "Plus fortes variations par pays",
    "changes.up": "en hausse", "changes.down": "en baisse",
    "changes.item": "{Flow} {of} {sense} de {delta}",
    "changes.itemDetail": "{before} → {now} sur 12 mois ({pct}).",
    "changes.drivers": "Surtout {via}.",
    "changes.caution": "Une livraison importante, comme un avion ou un lot de téléphones, peut provoquer une forte variation. Ces données ne permettent pas d’en déterminer la cause.",
    "changes.feed": "S’abonner au flux RSS",
    "changes.partnerItem": "{Flow} {with} {sense} de {delta}",
    "changes.with.imp": "venant {from}", "changes.with.exp": "{to}",

    "quiz.title": "Quiz sur le commerce du Luxembourg",
    "quiz.lede": "Douze questions. Le site calcule les bonnes réponses sur les données Eurostat les plus récentes ({year}).",
    "quiz.progress": "Question {n} sur {total}",
    "quiz.next": "Question suivante", "quiz.finish": "Voir mon score", "quiz.restart": "Recommencer",
    "quiz.right": "Bonne réponse.", "quiz.wrong": "Pas tout à fait.",
    "quiz.score": "{score} bonnes réponses sur {total}",
    "quiz.share": "Partager mon score",
    "quiz.shareText": "J’ai obtenu {score}/{total} au quiz « Le Luxembourg et le monde ».",
    "quiz.learnMore": "En savoir plus",
    "quiz.per_day.q": "Combien d’euros de marchandises le Luxembourg achète-t-il à l’étranger chaque jour, en moyenne{q}",
    "quiz.per_day.a": "Environ {answer} par jour, soit {total} sur l’année {year}.",
    "quiz.coverage.q": "Quand le Luxembourg achète pour 100{nb}€ de marchandises à l’étranger, combien en vend-il{q}",
    "quiz.coverage.a": "{answer}{nb}€. Le Luxembourg achète plus de biens qu’il n’en vend ; ses principales exportations sont des services, absents de ces chiffres.",
    "quiz.top_supplier.q": "Quel est le premier fournisseur de marchandises du Luxembourg{q}",
    "quiz.top_supplier.a": "{Answer}, avec {share} des achats en {year}.",
    "quiz.top_client.q": "Quel est le premier client du Luxembourg{q}",
    "quiz.top_client.a": "{Answer}, avec {share} des ventes en {year}.",
    "quiz.wine.q": "D’où vient la plus grande partie du vin que le Luxembourg achète{q}",
    "quiz.wine.a": "{Answer} : {share} du vin que le Luxembourg a acheté en {year}.",
    "quiz.coffee.q": "D’après les statistiques, de quel pays le Luxembourg reçoit-il le plus de café{q}",
    "quiz.coffee.a": "{Answer} ({share}). Le café pousse au Brésil, en Colombie ou au Viêt Nam, et une bonne part arrive au Luxembourg après torréfaction dans un pays voisin. Pour les échanges dans l’Union, la statistique retient le pays d’expédition.",
    "quiz.cars.q": "De quel pays arrive la majorité des voitures que le Luxembourg achète{q}",
    "quiz.cars.a": "{Answer} : {share} des voitures en {year}. Les constructeurs en fabriquent beaucoup ailleurs, puis elles transitent par des ports ou des importateurs belges.",
    "quiz.tyres.q": "Le Luxembourg fabrique des pneus. Quel est leur premier pays acheteur{q}",
    "quiz.tyres.a": "{Answer} achète {share} des pneus neufs que le Luxembourg a vendus en {year}.",
    "quiz.top_export_chapter.q": "Quel groupe de produits le Luxembourg vend-il le plus{q}",
    "quiz.top_export_chapter.a": "{Answer} : {share} des ventes en {year}. L’acier reste important, mais il n’est plus en tête.",
    "quiz.draw_exports.q": "Dessinez l’évolution des ventes du Luxembourg depuis 2015",
    "quiz.draw_exports.keys": "Au clavier : flèches haut et bas pour monter ou descendre la courbe, flèche droite pour l’année suivante, Maj pour aller plus vite.",
    "quiz.draw_exports.help": "Vous partez du point de 2015. Glissez le doigt ou la souris de gauche à droite pour tracer votre estimation, année par année.",
    "quiz.draw_exports.reveal": "Afficher les données Eurostat",
    "quiz.draw_exports.a": "Les ventes sont passées de {start} en 2015 à {end} en {year}, avec un creux en 2020. Votre tracé s’écartait en moyenne de {gap}.",
    "quiz.growth_rank.q": "Depuis 2015, comment les ventes du Luxembourg ont-elles progressé par rapport à huit pays comparables (voisins et petites économies de l’Union){q}",
    "quiz.growth_rank.highest": "Le plus fortement", "quiz.growth_rank.middle": "Dans la moyenne", "quiz.growth_rank.lowest": "Le moins fortement",
    "quiz.growth_rank.a": "Le moins fortement : +{lu} en dix ans, contre +{best} pour {bestName}.",
    "quiz.balance.q": "Le Luxembourg vend-il plus de marchandises qu’il n’en achète{q}",
    "quiz.balance.yes": "Oui", "quiz.balance.no": "Non",
    "quiz.balance.a": "Non : en {year}, il a acheté pour {imp} et vendu pour {exp}.",

    "learn.title": "Comprendre les chiffres du commerce",
    "learn.lede": "Pays d’expédition, euros courants, codes produits et révisions : les règles de lecture des données Eurostat.",

    "about.title": "À propos de ce site",

    "footer.about": "Projet du hackathon du STATEC, à partir des données publiques d’Eurostat sur le commerce de marchandises du Luxembourg.",
    "footer.explore": "Pages", "footer.data": "Données",
    "footer.source": "Source Eurostat Comext",
    "footer.rss": "Flux « Ce qui change »",
    "footer.method": "Méthode et limites",
    "footer.api": "API et MCP pour développeurs",
  },

  en: {
    "site.title": "Luxembourg and the world",
    "site.subtitle": "Trade in goods, in figures",
    "skip": "Skip to content",
    "nav.home": "Home", "nav.products": "Products", "nav.countries": "Countries",
    "nav.changes": "What’s changing", "nav.quiz": "Quiz", "nav.learn": "Understand", "nav.about": "About",
    "lang.label": "Language",
    "search.label": "Search a product, a country or ask a question",
    "search.placeholder": "Coffee, Japan, where does wine come from?",
    "search.products": "Products", "search.countries": "Countries", "search.detail": "Detailed products",
    "search.none": "No result. Try a simpler word (“car”, “wine”) or a 2, 4, 6 or 8-digit code.",
    "search.try": "Try",
    "search.open": "See details",
    "search.loadingDetail": "Searching the 9,000 detailed codes…",
    "flow.imp": "Purchases", "flow.exp": "Sales",
    "flow.imp.long": "imports", "flow.exp.long": "exports",
    "flow.imp.verb": "bought", "flow.exp.verb": "sold",
    "flow.switch": "Show purchases or sales",
    "source": "Source: Eurostat, Comext ({dataset}), data published on {date}. Amounts in current euros.",
    "action.download": "Data (CSV)", "action.share": "Share", "action.embed": "Embed",
    "action.milestones": "Key events", "milestones.details": "Key events in detail", "milestones.sources": "Sources:", "milestones.seeChart": "See the chart",
    "milestones.caution": "The charts do not measure how much each event affected trade.",
    "milestones.chronologyLede": "Six events since 1999 and Luxembourg’s trade in goods over those periods.",
    "learn.milestones": "Crises seen in the figures",
    "change.rest": "Everything else", "change.title": "What changed between {previous} and {year}",
    "change.sub": "Change by product. Total change: {total}. “Everything else” groups the other products and what is not broken down.",
    "home.i6.title": "In {year}, the largest change in purchases comes from “{top}” ({change})",
    "home.i6.text": "From {previous} to {year}, purchases change by {imp} and sales by {exp}. The bars show the product groups that weigh most in these changes.",
    "home.i6.chart": "Change between {previous} and {year}, by product group",
    "action.copied": "Link copied", "action.codeCopied": "Embed code copied",
    "action.copyFailed": "Copy failed. Select and copy the text manually.",
    "breadcrumb": "Breadcrumb",
    "country.missing": "Some purchase or sales figures are missing, so the balance cannot be calculated.",
    "country.chart.availableTitle": "Annual purchases and sales of goods with {name}",
    "changes.unavailable": "The comparison needs 24 complete months of data. It will be available once that series is complete.",
    "action.explain": "Explain this chart", "action.hideExplain": "Hide the explanation",
    "tab.map": "Map", "tab.ranking": "Ranking", "tab.evolution": "Over time", "tab.table": "Table",
    "tab.products": "Products", "tab.months": "Latest months",
    "map.europe": "Europe", "map.world": "World", "map.noData": "No trade recorded",
    "map.share": "Share of total", "map.luxembourg": "Luxembourg",
    "tab.balance": "Balance", "year.label": "Year",
    "chart.display": "Display", "map.zone": "Map area",
    "footer.a11y": "Accessibility: assessment and limits",
    "neighbours.toggle": "Without neighbours", "neighbours.title": "Hide Belgium, Germany and France to see the other countries better",
    "neighbours.suffix": "excluding neighbours", "map.excluded": "Neighbour, hidden",
    "neighbours.note": "Without Belgium, Germany and France: shares cover the other countries.",
    "neighbours.noteBalance": "Without Belgium, Germany and France: the shade scale covers the other countries.",
    "neighbours.only": "In {year}, Luxembourg traded this product with neighbouring countries and nowhere else.",
    "year.loading": "Reading {year} figures from Eurostat…",
    "year.error": "The site could not read the {year} figures from Eurostat. Try again in a moment or pick another year.",
    "tab.seasonality": "Seasonality",
    "seasonality.title.imp": "{name}: purchases usually peak in {month}",
    "seasonality.title.exp": "{name}: sales usually peak in {month}",
    "seasonality.titlePlain": "{name}: trade month by month",
    "seasonality.sub": "One square per month, from {from} to {until}. The darker the square, the larger the amount.",
    "seasonality.subSeason": "One square per month, from {from} to {until}. The darker the square, the further the month rises above its year’s average.",
    "seasonality.mode": "Square colour", "seasonality.mode.values": "Amounts", "seasonality.mode.season": "Gap to the year’s average",
    "seasonality.versusAverage": "{change} against the year’s monthly average",
    "seasonality.explain": "Each row is a year and each column a month. The “Gap to the year’s average” mode compares each month with its year’s monthly average, so seasons stand out even when amounts change from one year to the next. The peak month in the title is computed from the complete years in the period.",
    "seasonality.loading": "Reading monthly figures from Eurostat…",
    "seasonality.error": "The site could not read the monthly figures from Eurostat. Try again in a moment.",
    "period.label": "Period", "period.from": "From", "period.to": "to",
    "period.single": "The product breakdown of trade with each country only exists for {latest}.",
    "balance.buysMore": "Luxembourg buys more", "balance.sellsMore": "Luxembourg sells more",
    "balance.even": "Balanced", "balance.label": "Balance", "balance.none": "No country",
    "balance.gap.imp": "the biggest gap is with {def}, {amount} more bought than sold",
    "balance.gap.exp": "the biggest gap is with {def}, {amount} more sold than bought",
    "balance.listImp": "Luxembourg buys more than it sells", "balance.listExp": "Luxembourg sells more than it buys",
    "balance.explain": "For each country, take what Luxembourg sells to it in {year} and subtract what it buys from it. Brown means Luxembourg buys more than it sells; green means it sells more than it buys. The three shades sort the gap by order of magnitude: under {low}, {low} to {high}, {high} and more. Grey means the gap stays under 5% of trade with that country, so purchases and sales stay close. Here, {sells} countries lean towards sales, {buys} towards purchases and {even} are balanced.",
    "product.balance.title": "{name}: {gap}",
    "product.balance.sub": "Sales minus purchases with each country in {year}. The darker the shade, the bigger the gap.",
    "country.index.balanceSub": "Sales minus purchases with each country in {year}, all goods. The darker the shade, the bigger the gap.",
    "compare.link": "Compare with other EU countries",
    "nav.compare": "Compare",
    "compare.title": "Where does Luxembourg stand in the EU?",
    "compare.allGoods": "All goods", "compare.ofAll": "of goods", "compare.nameAll": "goods",
    "compare.product": "Product", "compare.productPlaceholder": "Find a product (wine, car…)",
    "compare.loading": "Reading the figures for the 27 countries from Eurostat…",
    "compare.error": "The site could not read the figures from Eurostat. Try again in a moment.", "compare.retry": "Try again",
    "compare.flowNoun.imp": "purchases", "compare.flowNoun.exp": "sales", "compare.flowNom.imp": "Purchases", "compare.flowNom.exp": "Sales",
    "compare.measure": "Measure", "compare.measure.habitant": "Per inhabitant", "compare.measure.part": "Share of total", "compare.measure.euros": "In euros",
    "compare.measureLong.habitant": "Per inhabitant", "compare.measureLong.part": "As a share of {flowNoun}", "compare.measureLong.euros": "In value",
    "compare.euAverage": "EU average", "compare.peers": "Compared with", "compare.add": "Add a country", "compare.remove": "Remove {name}",
    "compare.col.value": "{FlowNoun} {year}", "compare.col.rank": "Rank",
    "compare.when.year": "{year}", "compare.when.range": "{first}–{last}",
    "compare.lede.habitant.imp": "In {year}, Luxembourg bought {value} {of} per inhabitant, ranking {ord} of the {count} EU countries, against an EU average of {eu}.",
    "compare.lede.habitant.exp": "In {year}, Luxembourg sold {value} {of} per inhabitant, ranking {ord} of the {count} EU countries, against an EU average of {eu}.",
    "compare.lede.part.imp": "In {year}, {name} made up {value} of Luxembourg’s purchases of goods, against an EU average of {eu}: {ord} of {count}.",
    "compare.lede.part.exp": "In {year}, {name} made up {value} of Luxembourg’s sales of goods, against an EU average of {eu}: {ord} of {count}.",
    "compare.lede.euros.imp": "In {year}, Luxembourg bought {value} {of}, ranking {ord} of the {count} EU countries. Per inhabitant, it ranks {ordHead}.",
    "compare.lede.euros.exp": "In {year}, Luxembourg sold {value} {of}, ranking {ord} of the {count} EU countries. Per inhabitant, it ranks {ordHead}.",
    "compare.lede.none": "Eurostat does not publish this figure for Luxembourg in {year}.",
    "compare.title.habitant": "Per inhabitant, Luxembourg ranks {ord} of the {count} EU countries for {flowNoun} {of}",
    "compare.title.part": "Luxembourg ranks {ord} of the {count} EU countries for the share of {name} in its {flowNoun}",
    "compare.title.euros": "In value, Luxembourg ranks {ord} of the {count} EU countries for {flowNoun} {of}",
    "compare.title.evolution": "{Measure}, Luxembourg stands at {x} times the EU average in {year}",
    "compare.sub.habitant": "{FlowNoun} {of} with the whole world, divided by the population on 1 January, {when}",
    "compare.sub.part": "Share of {name} in each country’s total {flowNoun} of goods, {when}",
    "compare.sub.euros": "Each country’s {flowNoun} {of} with the whole world, in current euros, {when}",
    "compare.explain": "Amounts come from Eurostat (Comext) for each EU country, with the whole world. Per inhabitant, the site divides them by the population on 1 January (Eurostat, demo_pjan). As a share of the total, it divides them by all {flowNoun} of goods of the same country. The EU average divides the sum of amounts by the sum of inhabitants or totals; in euros, it is the average of the countries.",
    "compare.note.workers": "Nearly half of the people employed in Luxembourg live in France, Belgium or Germany. They do not count as inhabitants, which inflates Luxembourg’s amounts per inhabitant.",
    "compare.note.ports": "The large ports of Belgium and the Netherlands receive goods bound for the whole of Europe, which inflates their purchases and sales.",
    "compare.note.years": "The comparison covers the 27 current EU countries over the whole period, including the years before they joined. A year with no published figure stays empty.",
    "compare.note.live": "The site reads these figures from Eurostat when you open the page, then keeps them for a few hours.",
    "others": "Other countries", "unspecified": "Unspecified countries",
    "table.country": "Country", "table.value": "Amount {year}", "table.share": "Share",
    "table.change": "One-year change", "table.year": "Year",
    "na": "n/a",
    "loading": "Loading data…",
    "error.load": "The site could not load the data. Check your connection and reload the page.",
    "error.notFound": "This page does not exist.",
    "error.product": "This product code is unknown or has no trade with Luxembourg.",
    "error.country": "This country has no recorded trade with Luxembourg.",
    "back.home": "Back to the home page",

    "home.title": "What Luxembourg buys from and sells to the world",
    "home.lede": "In {year}, Luxembourg bought <strong>{imp}</strong> of goods from abroad and sold <strong>{exp}</strong>.",
    "home.meta": "Eurostat data published on {date} · goods only, services excluded",
    "home.method": "How to read these figures",
    "home.insights": "Trade in six charts",
    "home.i1.title": "Every day, {perDay} of goods arrive in Luxembourg",
    "home.i1.text": "Over {year}, that adds up to {imp} of purchases against {exp} of sales. For every €100 of goods bought abroad, Luxembourg sells €{coverage}.",
    "home.i1.chart": "Luxembourg’s purchases and sales of goods, per year",
    "home.i2.title": "Luxembourg buys more goods than it sells",
    "home.i2.text": "Luxembourg has run this deficit each year since 1999. These figures leave out trade in services (finance, insurance, logistics, IT).",
    "home.i2.chart": "Sales minus purchases of goods, per year",
    "home.i3.title": "Three neighbours supply {share3} of purchases",
    "home.i3.titleTopThree": "The three largest suppliers provide {share3} of purchases",
    "home.i3.text": "{first}, {second} and {third} are the leading suppliers. The chart shows the country of dispatch, which may differ from the country of manufacture.",
    "home.i3.chart": "Luxembourg’s main suppliers and customers in {year}",
    "home.i4.title": "The top three product groups account for {share} of purchases",
    "home.i4.text": "Leading purchases: {imp}. On the sales side: {exp}.",
    "home.i4.chart": "Main product groups in {year}",
    "home.i5.title": "Since 2015, Luxembourg’s sales have grown less than those of eight comparable countries",
    "home.i5.text": "In current euros, Luxembourg’s exports of goods rose by {lu} between 2015 and {year}, the smallest increase among its neighbours and the EU’s small open economies.",
    "home.i5.chart": "Exports of goods, index 100 in 2015",
    "home.daily": "Where do everyday products come from?",
    "home.daily.lede": "The leading supplier of each product in {year}, and its share of Luxembourg’s purchases.",
    "home.daily.from": "mostly {from}",
    "home.changes": "Recent changes",
    "home.changes.lede": "The largest changes over the last 12 months, compared with the 12 before.",
    "home.changes.all": "See all changes",
    "home.quiz": "Quiz",
    "home.quiz.text": "Twelve questions about Luxembourg’s trade, including one where you draw a line. The site computes the answers from the latest data.",
    "home.quiz.start": "Start the quiz",
    "home.learn": "Before reading the figures",
    "home.more": "Read more",

    "product.titleImp": "{name}: where do Luxembourg’s purchases come from?",
    "product.titleExp": "{name}: where do Luxembourg’s sales go?",
    "product.ledeImp": "In {year}, Luxembourg bought <strong>{value}</strong> {of} from abroad.",
    "product.ledeExp": "In {year}, Luxembourg sold <strong>{value}</strong> {of} abroad.",
    "product.topImp": " {Top} supplied <strong>{share}</strong>",
    "product.topExp": " {Top} bought <strong>{share}</strong>",
    "product.ahead": ", ahead of {second} ({s2})",
    "product.ahead2": " and {third} ({s3})",
    "product.none": "Eurostat recorded no trade in this product in {year}.",
    "product.mass.tonnes": "{n} tonnes", "product.mass.kg": "{n} kg", "product.mass.litres": "≈ {n} litres",
    "product.price.kg": "{n} per kilo", "product.price.litre": "{n} per litre", "product.price.tonne": "{n} per tonne",
    "product.chart.map": "{name}: {share} of purchases come {from}",
    "product.chart.mapExp": "{name}: {share} of sales go {to}",
    "product.chart.sub": "Each country’s share of Luxembourg’s {flow} in {year}",
    "product.chart.evoTitle": "{name}: {flow} since {first}",
    "product.chart.evoSub": "Annual amount in current euros, total and top five countries",
    "product.chart.monthsTitle": "{name}: the last {n} months",
    "product.chart.monthsSub": "Monthly amount, from {from} to {to}",
    "product.inside": "What it contains",
    "product.insideLede": "The more detailed categories that make up this product, in {year}.",
    "product.related": "Related products",
    "product.code": "Official code and label",
    "product.codeText": "Code {level} {code} of the European Union’s Combined Nomenclature.",
    "product.level.2": "chapter (2 digits)", "product.level.4": "HS heading (4 digits)",
    "product.level.6": "HS subheading (6 digits)", "product.level.8": "CN code (8 digits)",
    "product.levels": "The longer the code, the more precise the product.",
    "product.goodToKnow": "Good to know",
    "product.note.dispatch": "For purchases from an EU country, the site shows the country of dispatch: {Top} shipped the goods, but another country may have made them.",
    "product.moreMass": "That is {mass}, or {price} on average.",
    "product.moreTrend": "That is {change} on the previous year and {ten} over ten years.",
    "product.moreTrend1": "That is {change} on the previous year.",
    "country.title.since.pos": "Since {since}, Luxembourg has sold more {to} than it has bought {from}",
    "country.title.since.neg": "Since {since}, Luxembourg has bought more {from} than it has sold {to}",
    "country.title.year.pos": "In {year}, Luxembourg sold more {to} than it bought {from}",
    "country.title.year.neg": "In {year}, Luxembourg bought more {from} than it sold {to}",
    "country.chart.monthsImp": "What Luxembourg buys {from}, month by month",
    "country.chart.monthsExp": "What Luxembourg sells {to}, month by month",
    "country.products.imp": "Luxembourg’s main purchases: {list}.",
    "country.products.exp": "Its main sales: {list}.",
    "product.note.gaps": "Some years have no value: the code may have changed in a revision of the nomenclature.",
    "product.note.money": "Amounts are in each year’s euros, with no inflation adjustment: an increase can come from prices as well as quantities.",
    "product.note.small": "Small amounts: a single delivery can change a year’s figures a lot.",
    "product.live": "Live data from the Eurostat API",
    "product.liveLoading": "Reading Eurostat data live…",
    "product.liveError": "Eurostat did not respond. This detailed product needs an internet connection.",
    "product.explain.map": "This map shades each country by its share of Luxembourg’s {flow} {of} in {year}. The darker the colour, the larger the share. {Top} leads with {share}{ahead}. The top {n} countries account for {cum} of the total. Hatched countries have no recorded trade.",
    "product.explain.ranking": "This ranking orders countries from the largest to the smallest amount in {year}. {Top} accounts for {share} of {flow}, that is {value}. In total, {count} countries have recorded trade in this product.",
    "product.explain.evolution": "This line shows total {flow} each year since {first}. It went from {start} in {first} to {end} in {year}, a change of {change}. It peaked in {peakYear} ({peak}).",
    "product.explain.table": "This table gives the exact amount, the share and the one-year change for each country. You can sort and download it.",
    "product.explain.months": "These bars show each month’s amount. Month-to-month swings are common; compare a month with the same month a year earlier instead.",
    "product.explain.caveat": "These figures describe trade flows and say nothing about their causes.",

    "country.title": "Luxembourg and {name}",
    "country.lede.both": "{Name} is Luxembourg’s {rankExp} customer (<strong>{shareExp}</strong> of sales, {exp}) and its {rankImp} supplier (<strong>{shareImp}</strong> of purchases, {imp}) in {year}.",
    "country.lede.balancePos": "Luxembourg sells it more than it buys from it: a surplus of {balance}.",
    "country.lede.balanceNeg": "Luxembourg buys more from it than it sells: a deficit of {balance}.",
    "country.fact.balance": "Balance",
    "country.chart.evoSub": "Annual amount in current euros since 1999",
    "country.chart.productsImp": "What Luxembourg buys {from} in {year}",
    "country.chart.productsExp": "What Luxembourg sells {to} in {year}",
    "country.chart.productsSub": "Main products, as a share of total trade with this country",
    "country.index.title": "Which countries does Luxembourg trade with?",
    "country.index.lede": "{count} countries and territories bought goods from or sold goods to Luxembourg in {year}. The top three are neighbours.",
    "country.index.map": "Each country’s share of Luxembourg’s {flow} in {year}",
    "country.index.all": "All countries",
    "country.index.filter": "Filter countries",

    "products.title": "What does Luxembourg sell and buy?",
    "products.lede": "The nomenclature groups goods into 97 chapters, then into ever more precise categories. Pick a chapter to see its detail, or search a product in your own words.",
    "products.chart": "Product chapters, from largest to smallest, in {year}",
    "products.filter": "Filter chapters",

    "changes.title": "What is changing in Luxembourg’s trade",
    "changes.lede": "The last 12 known months ({now}) compared with the 12 months before ({before}). Purchases changed by <strong>{imp}</strong> and sales by <strong>{exp}</strong>.",
    "changes.products": "Largest changes by product",
    "changes.partners": "Largest changes by country",
    "changes.up": "up", "changes.down": "down",
    "changes.item": "{Flow} {of} {sense} by {delta}",
    "changes.itemDetail": "{before} → {now} over 12 months ({pct}).",
    "changes.drivers": "Driven by trade {via}.",
    "changes.caution": "A large delivery, such as an aircraft or a batch of phones, can cause a large change. These data do not establish its cause.",
    "changes.feed": "Subscribe to the RSS feed",
    "changes.partnerItem": "{Flow} {with} {sense} by {delta}",
    "changes.with.imp": "{from}", "changes.with.exp": "{to}",

    "quiz.title": "Quiz on Luxembourg’s trade",
    "quiz.lede": "Twelve questions. The site computes the right answers from the latest Eurostat data ({year}).",
    "quiz.progress": "Question {n} of {total}",
    "quiz.next": "Next question", "quiz.finish": "See my score", "quiz.restart": "Start again",
    "quiz.right": "Correct.", "quiz.wrong": "Not quite.",
    "quiz.score": "{score} right answers out of {total}",
    "quiz.share": "Share my score",
    "quiz.shareText": "I scored {score}/{total} on the “Luxembourg and the world” quiz.",
    "quiz.learnMore": "Learn more",
    "quiz.per_day.q": "On average, how many euros of goods does Luxembourg buy from abroad every day?",
    "quiz.per_day.a": "About {answer} per day, or {total} over {year}.",
    "quiz.coverage.q": "When Luxembourg buys €100 of goods abroad, how much does it sell?",
    "quiz.coverage.a": "€{answer}. Luxembourg buys more goods than it sells; its main exports are services, which these figures leave out.",
    "quiz.top_supplier.q": "Which country is Luxembourg’s leading supplier of goods?",
    "quiz.top_supplier.a": "{Answer}, with {share} of purchases in {year}.",
    "quiz.top_client.q": "Which country is Luxembourg’s leading customer?",
    "quiz.top_client.a": "{Answer}, with {share} of sales in {year}.",
    "quiz.wine.q": "Where does most of the wine Luxembourg buys come from?",
    "quiz.wine.a": "{Answer}: {share} of the wine Luxembourg bought in {year}.",
    "quiz.coffee.q": "According to the statistics, which country does Luxembourg receive the most coffee from?",
    "quiz.coffee.a": "{Answer} ({share}). Coffee grows in Brazil, Colombia or Vietnam, and much of it reaches Luxembourg after roasting in a neighbouring country. For trade within the EU, statistics record the country of dispatch.",
    "quiz.cars.q": "Which country do most of the cars Luxembourg buys arrive from?",
    "quiz.cars.a": "{Answer}: {share} of cars in {year}. Carmakers build many of them elsewhere, and they reach Luxembourg through Belgian ports or importers.",
    "quiz.tyres.q": "Luxembourg makes tyres. Which country buys the most of them?",
    "quiz.tyres.a": "{Answer} buys {share} of the new tyres Luxembourg sold in {year}.",
    "quiz.top_export_chapter.q": "Which group of products does Luxembourg sell the most?",
    "quiz.top_export_chapter.a": "{Answer}: {share} of sales in {year}. Steel remains important, but it is no longer first.",
    "quiz.draw_exports.q": "Draw how Luxembourg’s sales have changed since 2015",
    "quiz.draw_exports.keys": "With the keyboard: up and down arrows move the line, the right arrow goes to the next year, Shift moves faster.",
    "quiz.draw_exports.help": "You start from the 2015 point. Drag your finger or mouse from left to right to draw your guess, year by year.",
    "quiz.draw_exports.reveal": "Show Eurostat data",
    "quiz.draw_exports.a": "Sales went from {start} in 2015 to {end} in {year}, with a dip in 2020. Your line was off by {gap} on average.",
    "quiz.growth_rank.q": "Since 2015, how have Luxembourg’s sales grown compared with eight comparable countries (neighbours and small EU economies)?",
    "quiz.growth_rank.highest": "The most", "quiz.growth_rank.middle": "About average", "quiz.growth_rank.lowest": "The least",
    "quiz.growth_rank.a": "The least: +{lu} in ten years, against +{best} for {bestName}.",
    "quiz.balance.q": "Does Luxembourg sell more goods than it buys?",
    "quiz.balance.yes": "Yes", "quiz.balance.no": "No",
    "quiz.balance.a": "No: in {year}, it bought {imp} and sold {exp}.",

    "learn.title": "Understanding trade figures",
    "learn.lede": "Country of dispatch, current euros, product codes and revisions: how to read Eurostat data.",

    "about.title": "About this site",

    "footer.about": "A STATEC hackathon project that uses Eurostat’s public data on Luxembourg’s trade in goods.",
    "footer.explore": "Pages", "footer.data": "Data",
    "footer.source": "Eurostat Comext source",
    "footer.rss": "“What’s changing” feed",
    "footer.method": "Method and limits",
    "footer.api": "API and MCP for developers",
  },

  de: {
    "site.title": "Luxemburg und die Welt",
    "site.subtitle": "Der Warenhandel in Zahlen",
    "skip": "Zum Inhalt springen",
    "nav.home": "Startseite", "nav.products": "Waren", "nav.countries": "Länder",
    "nav.changes": "Was sich ändert", "nav.quiz": "Quiz", "nav.learn": "Verstehen", "nav.about": "Über",
    "lang.label": "Sprache",
    "search.label": "Eine Ware, ein Land suchen oder eine Frage stellen",
    "search.placeholder": "Kaffee, Japan, woher kommt der Wein?",
    "search.products": "Waren", "search.countries": "Länder", "search.detail": "Detaillierte Waren",
    "search.none": "Kein Ergebnis. Versuchen Sie ein einfacheres Wort („Auto“, „Wein“) oder einen 2-, 4-, 6- oder 8-stelligen Code.",
    "search.try": "Probieren Sie",
    "search.open": "Details ansehen",
    "search.loadingDetail": "Suche in den 9.000 detaillierten Codes…",
    "flow.imp": "Einkäufe", "flow.exp": "Verkäufe",
    "flow.imp.long": "Einfuhren", "flow.exp.long": "Ausfuhren",
    "flow.imp.verb": "gekauft", "flow.exp.verb": "verkauft",
    "flow.switch": "Einkäufe oder Verkäufe anzeigen",
    "source": "Quelle: Eurostat, Comext ({dataset}), Daten veröffentlicht am {date}. Beträge in jeweiligen Euro.",
    "action.download": "Daten (CSV)", "action.share": "Teilen", "action.embed": "Einbetten",
    "action.milestones": "Ereignisse", "milestones.details": "Die Ereignisse im Detail", "milestones.sources": "Quellen:", "milestones.seeChart": "Zur Grafik",
    "milestones.caution": "Die Diagramme messen nicht, wie stark die einzelnen Ereignisse den Handel beeinflusst haben.",
    "milestones.chronologyLede": "Sechs Ereignisse seit 1999 und Luxemburgs Warenhandel in diesen Zeiträumen.",
    "learn.milestones": "Krisen in den Zahlen",
    "change.rest": "Alles andere", "change.title": "Was sich zwischen {previous} und {year} verändert hat",
    "change.sub": "Veränderung nach Ware. Gesamtveränderung: {total}. „Alles andere“ fasst die übrigen Waren und nicht Aufgeschlüsseltes zusammen.",
    "home.i6.title": "{year} kommt die größte Veränderung bei den Einkäufen aus der Gruppe „{top}“ ({change})",
    "home.i6.text": "Von {previous} bis {year} verändern sich die Einkäufe um {imp} und die Verkäufe um {exp}. Die Balken zeigen die Warengruppen, die dabei am meisten ins Gewicht fallen.",
    "home.i6.chart": "Veränderung zwischen {previous} und {year}, nach Warengruppe",
    "action.copied": "Link kopiert", "action.codeCopied": "Einbettungscode kopiert",
    "action.copyFailed": "Kopieren fehlgeschlagen. Wählen Sie den Text aus und kopieren Sie ihn manuell.",
    "breadcrumb": "Brotkrümelnavigation",
    "country.missing": "Einige Einkaufs- oder Verkaufszahlen fehlen; der Saldo kann daher nicht berechnet werden.",
    "country.chart.availableTitle": "Jährliche Wareneinkäufe und -verkäufe mit {name}",
    "changes.unavailable": "Der Vergleich benötigt 24 vollständige Datenmonate. Er ist verfügbar, sobald diese Reihe vollständig ist.",
    "action.explain": "Diese Grafik erklären", "action.hideExplain": "Erklärung ausblenden",
    "tab.map": "Karte", "tab.ranking": "Rangliste", "tab.evolution": "Entwicklung", "tab.table": "Tabelle",
    "tab.products": "Waren", "tab.months": "Letzte Monate",
    "map.europe": "Europa", "map.world": "Welt", "map.noData": "Kein Handel erfasst",
    "map.share": "Anteil am Gesamtwert", "map.luxembourg": "Luxemburg",
    "tab.balance": "Saldo", "year.label": "Jahr",
    "chart.display": "Anzeige", "map.zone": "Kartenausschnitt",
    "footer.a11y": "Barrierefreiheit: Prüfung und Grenzen",
    "neighbours.toggle": "Ohne Nachbarländer", "neighbours.title": "Belgien, Deutschland und Frankreich ausblenden, um die übrigen Länder besser zu sehen",
    "neighbours.suffix": "ohne Nachbarländer", "map.excluded": "Nachbarland, ausgeblendet",
    "neighbours.note": "Ohne Belgien, Deutschland und Frankreich: Die Anteile beziehen sich auf die übrigen Länder.",
    "neighbours.noteBalance": "Ohne Belgien, Deutschland und Frankreich: Die Farbtöne beziehen sich auf die übrigen Länder.",
    "neighbours.only": "{year} handelte Luxemburg diese Ware nur mit Nachbarländern.",
    "year.loading": "Die Zahlen für {year} werden bei Eurostat gelesen …",
    "year.error": "Die Website konnte die Zahlen für {year} nicht bei Eurostat abrufen. Versuchen Sie es gleich noch einmal oder wählen Sie ein anderes Jahr.",
    "tab.seasonality": "Saisonalität",
    "seasonality.title.imp": "{name}: Die Einkäufe sind meist im {month} am höchsten",
    "seasonality.title.exp": "{name}: Die Verkäufe sind meist im {month} am höchsten",
    "seasonality.titlePlain": "{name}: der Handel Monat für Monat",
    "seasonality.sub": "Ein Feld pro Monat, von {from} bis {until}. Je dunkler das Feld, desto höher der Betrag.",
    "seasonality.subSeason": "Ein Feld pro Monat, von {from} bis {until}. Je dunkler das Feld, desto stärker liegt der Monat über dem Durchschnitt seines Jahres.",
    "seasonality.mode": "Farbe der Felder", "seasonality.mode.values": "Beträge", "seasonality.mode.season": "Abstand zum Jahresdurchschnitt",
    "seasonality.versusAverage": "{change} gegenüber dem Monatsdurchschnitt des Jahres",
    "seasonality.explain": "Jede Zeile ist ein Jahr, jede Spalte ein Monat. Der Modus „Abstand zum Jahresdurchschnitt“ vergleicht jeden Monat mit dem Monatsdurchschnitt seines Jahres, sodass Saisons auch dann sichtbar werden, wenn sich die Beträge von Jahr zu Jahr ändern. Der stärkste Monat im Titel wird aus den vollständigen Jahren des Zeitraums berechnet.",
    "seasonality.loading": "Die Monatszahlen werden bei Eurostat gelesen …",
    "seasonality.error": "Die Website konnte die Monatszahlen nicht bei Eurostat abrufen. Versuchen Sie es gleich noch einmal.",
    "period.label": "Zeitraum", "period.from": "Von", "period.to": "bis",
    "period.single": "Die Aufschlüsselung nach Waren für jedes Partnerland gibt es nur für {latest}.",
    "balance.buysMore": "Luxemburg kauft mehr", "balance.sellsMore": "Luxemburg verkauft mehr",
    "balance.even": "Ausgeglichen", "balance.label": "Saldo", "balance.none": "Kein Land",
    "balance.gap.imp": "die größte Lücke besteht mit {dative} ({amount} mehr gekauft als verkauft)",
    "balance.gap.exp": "die größte Lücke besteht mit {dative} ({amount} mehr verkauft als gekauft)",
    "balance.listImp": "Luxemburg kauft mehr, als es verkauft", "balance.listExp": "Luxemburg verkauft mehr, als es kauft",
    "balance.explain": "Für jedes Land zeigt die Karte den Verkauf dorthin abzüglich dessen, was Luxemburg dort {year} einkauft. Braun heißt: Luxemburg kauft mehr, als es verkauft; grün heißt: Es verkauft mehr, als es kauft. Die drei Farbtöne ordnen die Lücke nach Größenordnung: unter {low}, {low} bis {high}, {high} und mehr. Grau heißt: Die Lücke bleibt unter 5 % des Handels mit dem Land, Einkäufe und Verkäufe liegen nah beieinander. Hier neigen {sells} Länder zu den Verkäufen, {buys} zu den Einkäufen, {even} sind ausgeglichen.",
    "product.balance.title": "{name}: {gap}",
    "product.balance.sub": "Verkäufe minus Einkäufe mit jedem Land {year}. Je dunkler der Farbton, desto größer die Lücke.",
    "country.index.balanceSub": "Verkäufe minus Einkäufe mit jedem Land {year}, alle Waren. Je dunkler der Farbton, desto größer die Lücke.",
    "compare.link": "Mit anderen EU-Ländern vergleichen",
    "nav.compare": "Vergleichen",
    "compare.title": "Wo steht Luxemburg in der EU?",
    "compare.allGoods": "Alle Waren", "compare.ofAll": "Waren", "compare.nameAll": "Waren",
    "compare.product": "Ware", "compare.productPlaceholder": "Ware suchen (Wein, Auto …)",
    "compare.loading": "Die Zahlen der 27 Länder werden bei Eurostat gelesen …",
    "compare.error": "Die Website konnte die Zahlen nicht bei Eurostat abrufen. Versuchen Sie es gleich noch einmal.", "compare.retry": "Erneut versuchen",
    "compare.flowNoun.imp": "Einkäufen", "compare.flowNoun.exp": "Verkäufen", "compare.flowNom.imp": "Einkäufe", "compare.flowNom.exp": "Verkäufe",
    "compare.measure": "Maß", "compare.measure.habitant": "Pro Einwohner", "compare.measure.part": "Anteil am Gesamtwert", "compare.measure.euros": "In Euro",
    "compare.measureLong.habitant": "Pro Einwohner", "compare.measureLong.part": "Als Anteil an den {flowNoun}", "compare.measureLong.euros": "Im Wert",
    "compare.euAverage": "EU-Durchschnitt", "compare.peers": "Verglichen mit", "compare.add": "Land hinzufügen", "compare.remove": "{name} entfernen",
    "compare.col.value": "{FlowNoun} {year}", "compare.col.rank": "Rang",
    "compare.when.year": "{year}", "compare.when.range": "{first}–{last}",
    "compare.lede.habitant.imp": "{year} kaufte Luxemburg pro Einwohner {of} für {value}, Rang {n} von {count} EU-Ländern, bei einem EU-Durchschnitt von {eu}.",
    "compare.lede.habitant.exp": "{year} verkaufte Luxemburg pro Einwohner {of} für {value}, Rang {n} von {count} EU-Ländern, bei einem EU-Durchschnitt von {eu}.",
    "compare.lede.part.imp": "{year} machte {name} {value} der Wareneinkäufe Luxemburgs aus, gegenüber {eu} im EU-Durchschnitt: Rang {n} von {count}.",
    "compare.lede.part.exp": "{year} machte {name} {value} der Warenverkäufe Luxemburgs aus, gegenüber {eu} im EU-Durchschnitt: Rang {n} von {count}.",
    "compare.lede.euros.imp": "{year} kaufte Luxemburg {of} für {value}, Rang {n} von {count} EU-Ländern. Pro Einwohner gerechnet steht es auf Rang {nHead}.",
    "compare.lede.euros.exp": "{year} verkaufte Luxemburg {of} für {value}, Rang {n} von {count} EU-Ländern. Pro Einwohner gerechnet steht es auf Rang {nHead}.",
    "compare.lede.none": "Eurostat veröffentlicht diese Zahl für Luxemburg {year} nicht.",
    "compare.title.habitant": "Pro Einwohner liegt Luxemburg bei den {flowNoun} von {name} auf Rang {n} der {count} EU-Länder",
    "compare.title.part": "Beim Anteil von {name} an den {flowNoun} liegt Luxemburg auf Rang {n} der {count} EU-Länder",
    "compare.title.euros": "Im Wert liegt Luxemburg bei den {flowNoun} von {name} auf Rang {n} der {count} EU-Länder",
    "compare.title.evolution": "{Measure} liegt Luxemburg {year} beim {x}-Fachen des EU-Durchschnitts",
    "compare.sub.habitant": "{FlowNoun} von {name} mit der ganzen Welt, geteilt durch die Einwohnerzahl am 1. Januar, {when}",
    "compare.sub.part": "Anteil von {name} an den gesamten {flowNoun} jedes Landes, {when}",
    "compare.sub.euros": "{FlowNoun} von {name} jedes Landes mit der ganzen Welt, in jeweiligen Euro, {when}",
    "compare.explain": "Die Beträge stammen von Eurostat (Comext) für jedes EU-Land, mit der ganzen Welt. Pro Einwohner teilt die Website sie durch die Bevölkerung am 1. Januar (Eurostat, demo_pjan). Als Anteil am Gesamtwert teilt sie die Beträge durch alle Waren-{flowNoun} desselben Landes. Der EU-Durchschnitt teilt die Summe der Beträge durch die Summe der Einwohner oder der Gesamtwerte; in Euro ist es der Durchschnitt der Länder.",
    "compare.note.workers": "Fast die Hälfte der in Luxemburg Beschäftigten wohnt in Frankreich, Belgien oder Deutschland. Sie zählen nicht zu den Einwohnern, was Luxemburgs Beträge pro Einwohner erhöht.",
    "compare.note.ports": "Die großen Häfen Belgiens und der Niederlande nehmen Waren für ganz Europa auf, was ihre Einkäufe und Verkäufe erhöht.",
    "compare.note.years": "Der Vergleich umfasst die 27 heutigen EU-Länder über den ganzen Zeitraum, auch vor ihrem Beitritt. Ein Jahr ohne veröffentlichte Zahl bleibt leer.",
    "compare.note.live": "Die Website ruft diese Zahlen beim Öffnen der Seite bei Eurostat ab und speichert sie dann einige Stunden zwischen.",
    "others": "Andere Länder", "unspecified": "Nicht ermittelte Länder",
    "table.country": "Land", "table.value": "Betrag {year}", "table.share": "Anteil",
    "table.change": "Zum Vorjahr", "table.year": "Jahr",
    "na": "k. A.",
    "loading": "Daten werden geladen…",
    "error.load": "Die Website konnte die Daten nicht laden. Prüfen Sie die Verbindung und laden Sie die Seite neu.",
    "error.notFound": "Diese Seite gibt es nicht.",
    "error.product": "Dieser Warencode ist unbekannt oder hat keinen Handel mit Luxemburg.",
    "error.country": "Mit diesem Land ist kein Handel mit Luxemburg erfasst.",
    "back.home": "Zur Startseite",

    "home.title": "Was Luxemburg in der Welt kauft und verkauft",
    "home.lede": "{year} hat Luxemburg Waren im Wert von <strong>{imp}</strong> im Ausland gekauft und für <strong>{exp}</strong> verkauft.",
    "home.meta": "Eurostat-Daten vom {date} · nur Waren, ohne Dienstleistungen",
    "home.method": "So liest man diese Zahlen",
    "home.insights": "Der Handel in sechs Grafiken",
    "home.i1.title": "Jeden Tag kommen Waren im Wert von {perDay} nach Luxemburg",
    "home.i1.text": "Im Jahr {year} sind das {imp} an Einkäufen gegenüber {exp} an Verkäufen. Für je 100 € im Ausland gekaufter Waren verkauft Luxemburg Waren für {coverage} €.",
    "home.i1.chart": "Einkäufe und Verkäufe von Waren Luxemburgs, pro Jahr",
    "home.i2.title": "Luxemburg kauft mehr Waren, als es verkauft",
    "home.i2.text": "Dieses Defizit gibt es seit 1999 in jedem Jahr. Den Handel mit Dienstleistungen (Finanzen, Versicherungen, Logistik, IT) enthalten diese Zahlen nicht.",
    "home.i2.chart": "Verkäufe minus Einkäufe von Waren, pro Jahr",
    "home.i3.title": "Drei Nachbarn liefern {share3} der Einkäufe",
    "home.i3.titleTopThree": "Die drei größten Lieferländer stellen {share3} der Einkäufe",
    "home.i3.text": "{first}, {second} und {third} sind die wichtigsten Lieferanten. Die Grafik zeigt das Versendungsland, das vom Herstellungsland abweichen kann.",
    "home.i3.chart": "Wichtigste Lieferanten und Abnehmer Luxemburgs {year}",
    "home.i4.title": "Die drei wichtigsten Warengruppen machen {share} der Einkäufe aus",
    "home.i4.text": "Vorn bei den Einkäufen: {imp}. Bei den Verkäufen: {exp}.",
    "home.i4.chart": "Wichtigste Warengruppen {year}",
    "home.i5.title": "Seit 2015 sind Luxemburgs Verkäufe weniger gewachsen als die von acht vergleichbaren Ländern",
    "home.i5.text": "In jeweiligen Euro stiegen Luxemburgs Warenausfuhren zwischen 2015 und {year} um {lu}, der geringste Anstieg unter den Nachbarn und den kleinen offenen Volkswirtschaften der EU.",
    "home.i5.chart": "Warenausfuhren, Index 100 im Jahr 2015",
    "home.daily": "Woher kommen Alltagsprodukte?",
    "home.daily.lede": "Der wichtigste Lieferant jeder Ware {year} und sein Anteil an Luxemburgs Einkäufen.",
    "home.daily.from": "vor allem {from}",
    "home.changes": "Aktuelle Veränderungen",
    "home.changes.lede": "Die größten Veränderungen der letzten 12 Monate im Vergleich zu den 12 Monaten davor.",
    "home.changes.all": "Alle Veränderungen ansehen",
    "home.quiz": "Quiz",
    "home.quiz.text": "Zwölf Fragen zum Handel Luxemburgs, darunter eine, bei der Sie eine Kurve zeichnen. Die Website berechnet die Antworten aus den neuesten Daten.",
    "home.quiz.start": "Quiz starten",
    "home.learn": "Bevor Sie die Zahlen lesen",
    "home.more": "Weiterlesen",

    "product.titleImp": "{name}: Woher kommen Luxemburgs Einkäufe?",
    "product.titleExp": "{name}: Wohin gehen Luxemburgs Verkäufe?",
    "product.ledeImp": "{year} kaufte Luxemburg {of} im Wert von <strong>{value}</strong> im Ausland.",
    "product.ledeExp": "{year} verkaufte Luxemburg {of} im Wert von <strong>{value}</strong> ins Ausland.",
    "product.topImp": " Größter Lieferant war {top} mit <strong>{share}</strong>",
    "product.topExp": " Größter Abnehmer war {top} mit <strong>{share}</strong>",
    "product.ahead": ", vor {second} ({s2})",
    "product.ahead2": " und {third} ({s3})",
    "product.none": "Eurostat hat {year} für diese Ware keinen Handel erfasst.",
    "product.mass.tonnes": "{n} Tonnen", "product.mass.kg": "{n} kg", "product.mass.litres": "≈ {n} Liter",
    "product.price.kg": "{n} pro Kilo", "product.price.litre": "{n} pro Liter", "product.price.tonne": "{n} pro Tonne",
    "product.chart.map": "{name}: {share} der Einkäufe kommen {from}",
    "product.chart.mapExp": "{name}: {share} der Verkäufe gehen {to}",
    "product.chart.sub": "Anteil jedes Landes an Luxemburgs {flow} {year}",
    "product.chart.evoTitle": "{name}: {flow} seit {first}",
    "product.chart.evoSub": "Jahresbetrag in jeweiligen Euro, insgesamt und die fünf wichtigsten Länder",
    "product.chart.monthsTitle": "{name}: die letzten {n} Monate",
    "product.chart.monthsSub": "Monatsbetrag von {from} bis {to}",
    "product.inside": "Was dazugehört",
    "product.insideLede": "Die genaueren Kategorien, aus denen sich diese Ware {year} zusammensetzt.",
    "product.related": "Verwandte Waren",
    "product.code": "Offizieller Code und Bezeichnung",
    "product.codeText": "Code {level} {code} der Kombinierten Nomenklatur der Europäischen Union.",
    "product.level.2": "Kapitel (2 Stellen)", "product.level.4": "HS-Position (4 Stellen)",
    "product.level.6": "HS-Unterposition (6 Stellen)", "product.level.8": "KN-Code (8 Stellen)",
    "product.levels": "Je länger der Code, desto genauer die Ware.",
    "product.goodToKnow": "Gut zu wissen",
    "product.note.dispatch": "Bei Einkäufen aus einem EU-Land zeigt die Website das Versendungsland: {Top} hat die Ware versandt, hergestellt hat sie womöglich ein anderes Land.",
    "product.moreMass": "Das sind {mass}, also {price} im Durchschnitt.",
    "product.moreTrend": "Das sind {change} zum Vorjahr und {ten} in zehn Jahren.",
    "product.moreTrend1": "Das sind {change} zum Vorjahr.",
    "country.title.since.pos": "Seit {since} verkauft Luxemburg mehr {to}, als es {from} kauft",
    "country.title.since.neg": "Seit {since} kauft Luxemburg mehr {from}, als es {to} verkauft",
    "country.title.year.pos": "{year} verkaufte Luxemburg mehr {to}, als es {from} kaufte",
    "country.title.year.neg": "{year} kaufte Luxemburg mehr {from}, als es {to} verkaufte",
    "country.chart.monthsImp": "Was Luxemburg {from} kauft, Monat für Monat",
    "country.chart.monthsExp": "Was Luxemburg {to} verkauft, Monat für Monat",
    "country.products.imp": "Luxemburgs wichtigste Einkäufe dort: {list}.",
    "country.products.exp": "Wichtigste Verkäufe dorthin: {list}.",
    "product.note.gaps": "Für manche Jahre fehlt ein Wert: Der Code kann sich bei einer Revision der Nomenklatur geändert haben.",
    "product.note.money": "Die Beträge sind in Euro des jeweiligen Jahres, ohne Inflationsbereinigung: Ein Anstieg kann von Preisen wie von Mengen kommen.",
    "product.note.small": "Kleine Beträge: Eine einzige Lieferung kann die Zahlen eines Jahres stark verändern.",
    "product.live": "Live-Daten aus der Eurostat-API",
    "product.liveLoading": "Eurostat-Daten werden live gelesen…",
    "product.liveError": "Eurostat hat nicht geantwortet. Diese detaillierte Ware braucht eine Internetverbindung.",
    "product.explain.map": "Diese Karte färbt jedes Land nach seinem Anteil an Luxemburgs {flow} {of} {year}. Je dunkler die Farbe, desto größer der Anteil. {Top} liegt mit {share} vorn{ahead}. Die {n} wichtigsten Länder machen {cum} des Gesamtwerts aus. Schraffierte Länder haben keinen erfassten Handel.",
    "product.explain.ranking": "Diese Rangliste ordnet die Länder vom größten zum kleinsten Betrag {year}. {Top} steht für {share} der {flow}, also {value}. Insgesamt haben {count} Länder erfassten Handel mit dieser Ware.",
    "product.explain.evolution": "Diese Kurve zeigt die gesamten {flow} pro Jahr seit {first}. Sie stiegen bzw. sanken von {start} ({first}) auf {end} ({year}), eine Veränderung von {change}. Den Höchststand erreichten sie {peakYear} ({peak}).",
    "product.explain.table": "Diese Tabelle zeigt für jedes Land den genauen Betrag, den Anteil und die Veränderung zum Vorjahr. Sie können sie sortieren und herunterladen.",
    "product.explain.months": "Diese Balken zeigen den Betrag jedes Monats. Schwankungen von Monat zu Monat sind häufig; vergleichen Sie lieber einen Monat mit demselben Monat des Vorjahres.",
    "product.explain.caveat": "Diese Zahlen beschreiben den Handel und sagen nichts über seine Ursachen.",

    "country.title": "Luxemburg und {name}",
    "country.lede.both": "{Name} steht {year} bei Luxemburgs Abnehmern auf Platz {rankExpN} (<strong>{shareExp}</strong> der Verkäufe, {exp}) und bei den Lieferanten auf Platz {rankImpN} (<strong>{shareImp}</strong> der Einkäufe, {imp}).",
    "country.lede.balancePos": "Luxemburg verkauft mehr dorthin, als es von dort kauft: ein Überschuss von {balance}.",
    "country.lede.balanceNeg": "Luxemburg kauft dort mehr, als es dorthin verkauft: ein Defizit von {balance}.",
    "country.fact.balance": "Saldo",
    "country.chart.evoSub": "Jahresbetrag in jeweiligen Euro seit 1999",
    "country.chart.productsImp": "Was Luxemburg {year} {from} kauft",
    "country.chart.productsExp": "Was Luxemburg {year} {to} verkauft",
    "country.chart.productsSub": "Wichtigste Waren, als Anteil am gesamten Handel mit diesem Land",
    "country.index.title": "Mit welchen Ländern handelt Luxemburg?",
    "country.index.lede": "{count} Länder und Gebiete haben {year} Waren von Luxemburg gekauft oder an Luxemburg verkauft. Die ersten drei sind Nachbarn.",
    "country.index.map": "Anteil jedes Landes an Luxemburgs {flow} {year}",
    "country.index.all": "Alle Länder",
    "country.index.filter": "Länder filtern",

    "products.title": "Was verkauft und kauft Luxemburg?",
    "products.lede": "Die Nomenklatur teilt Waren in 97 Kapitel und dann in immer genauere Kategorien ein. Wählen Sie ein Kapitel für die Details oder suchen Sie eine Ware mit Ihren eigenen Worten.",
    "products.chart": "Warenkapitel, vom größten zum kleinsten, {year}",
    "products.filter": "Kapitel filtern",

    "changes.title": "Was sich im Handel Luxemburgs ändert",
    "changes.lede": "Die letzten 12 bekannten Monate ({now}) im Vergleich zu den 12 Monaten davor ({before}). Die Einkäufe veränderten sich um <strong>{imp}</strong>, die Verkäufe um <strong>{exp}</strong>.",
    "changes.products": "Größte Veränderungen nach Ware",
    "changes.partners": "Größte Veränderungen nach Land",
    "changes.up": "gestiegen", "changes.down": "gesunken",
    "changes.item": "{name}: {Flow} um {delta} {sense}",
    "changes.itemDetail": "{before} → {now} über 12 Monate ({pct}).",
    "changes.drivers": "Vor allem {via}.",
    "changes.caution": "Eine große Lieferung, etwa ein Flugzeug oder eine Partie Telefone, kann eine starke Veränderung auslösen. Diese Daten geben keinen Aufschluss über deren Ursache.",
    "changes.feed": "RSS-Feed abonnieren",
    "changes.partnerItem": "{Flow} {with} um {delta} {sense}",
    "changes.with.imp": "{from}", "changes.with.exp": "{to}",

    "quiz.title": "Quiz zum Handel Luxemburgs",
    "quiz.lede": "Zwölf Fragen. Die Website berechnet die richtigen Antworten aus den neuesten Eurostat-Daten ({year}).",
    "quiz.progress": "Frage {n} von {total}",
    "quiz.next": "Nächste Frage", "quiz.finish": "Mein Ergebnis", "quiz.restart": "Noch einmal",
    "quiz.right": "Richtig.", "quiz.wrong": "Nicht ganz.",
    "quiz.score": "{score} richtige Antworten von {total}",
    "quiz.share": "Ergebnis teilen",
    "quiz.shareText": "Ich habe {score}/{total} im Quiz „Luxemburg und die Welt“ erreicht.",
    "quiz.learnMore": "Mehr erfahren",
    "quiz.per_day.q": "Für wie viel Euro kauft Luxemburg im Durchschnitt jeden Tag Waren im Ausland?",
    "quiz.per_day.a": "Etwa {answer} pro Tag, also {total} im Jahr {year}.",
    "quiz.coverage.q": "Wenn Luxemburg für 100 € Waren im Ausland kauft, für wie viel verkauft es?",
    "quiz.coverage.a": "{answer} €. Luxemburg kauft mehr Waren, als es verkauft; seine wichtigsten Exporte sind Dienstleistungen, die diese Zahlen nicht enthalten.",
    "quiz.top_supplier.q": "Welches Land ist Luxemburgs wichtigster Warenlieferant?",
    "quiz.top_supplier.a": "{Answer}, mit {share} der Einkäufe {year}.",
    "quiz.top_client.q": "Welches Land ist Luxemburgs wichtigster Abnehmer?",
    "quiz.top_client.a": "{Answer}, mit {share} der Verkäufe {year}.",
    "quiz.wine.q": "Woher kommt der größte Teil des Weins, den Luxemburg kauft?",
    "quiz.wine.a": "{Answer}: {share} des Weins, den Luxemburg {year} gekauft hat.",
    "quiz.coffee.q": "Aus welchem Land erhält Luxemburg laut Statistik den meisten Kaffee?",
    "quiz.coffee.a": "{Answer} ({share}). Kaffee wächst in Brasilien, Kolumbien oder Vietnam, und ein großer Teil erreicht Luxemburg erst nach dem Rösten in einem Nachbarland. Im EU-Handel erfasst die Statistik das Versendungsland.",
    "quiz.cars.q": "Aus welchem Land kommt die Mehrheit der Autos, die Luxemburg kauft?",
    "quiz.cars.a": "{Answer}: {share} der Autos {year}. Viele davon bauen die Hersteller anderswo, dann laufen sie über belgische Häfen oder Importeure.",
    "quiz.tyres.q": "Luxemburg stellt Reifen her. Welches Land kauft die meisten davon?",
    "quiz.tyres.a": "{Answer} kauft {share} der neuen Reifen, die Luxemburg {year} verkauft hat.",
    "quiz.top_export_chapter.q": "Welche Warengruppe verkauft Luxemburg am meisten?",
    "quiz.top_export_chapter.a": "{Answer}: {share} der Verkäufe {year}. Stahl bleibt wichtig, liegt aber nicht mehr vorn.",
    "quiz.draw_exports.q": "Zeichnen Sie, wie sich Luxemburgs Verkäufe seit 2015 entwickelt haben",
    "quiz.draw_exports.keys": "Mit der Tastatur: Pfeil nach oben und unten bewegt die Kurve, Pfeil nach rechts geht zum nächsten Jahr, Umschalt geht schneller.",
    "quiz.draw_exports.help": "Sie starten beim Punkt für 2015. Ziehen Sie Finger oder Maus von links nach rechts, um Ihre Schätzung Jahr für Jahr zu zeichnen.",
    "quiz.draw_exports.reveal": "Eurostat-Daten anzeigen",
    "quiz.draw_exports.a": "Die Verkäufe gingen von {start} (2015) auf {end} ({year}), mit einem Einbruch 2020. Ihre Kurve lag im Schnitt um {gap} daneben.",
    "quiz.growth_rank.q": "Wie stark sind Luxemburgs Verkäufe seit 2015 im Vergleich zu acht vergleichbaren Ländern (Nachbarn und kleine EU-Volkswirtschaften) gewachsen?",
    "quiz.growth_rank.highest": "Am stärksten", "quiz.growth_rank.middle": "Im Durchschnitt", "quiz.growth_rank.lowest": "Am schwächsten",
    "quiz.growth_rank.a": "Am schwächsten: +{lu} in zehn Jahren, gegenüber +{best} für {bestName}.",
    "quiz.balance.q": "Verkauft Luxemburg mehr Waren, als es kauft?",
    "quiz.balance.yes": "Ja", "quiz.balance.no": "Nein",
    "quiz.balance.a": "Nein: {year} kaufte es für {imp} und verkaufte für {exp}.",

    "learn.title": "Handelszahlen verstehen",
    "learn.lede": "Versendungsland, jeweilige Euro, Warencodes und Revisionen: So lesen Sie Eurostat-Daten.",

    "about.title": "Über diese Website",

    "footer.about": "Ein Projekt des STATEC-Hackathons mit öffentlichen Eurostat-Daten zum Warenhandel Luxemburgs.",
    "footer.explore": "Seiten", "footer.data": "Daten",
    "footer.source": "Quelle Eurostat Comext",
    "footer.rss": "Feed „Was sich ändert“",
    "footer.method": "Methode und Grenzen",
    "footer.api": "API und MCP für Entwickler",
  },
};

let currentLang = "fr";

export function setLang(requested) {
  currentLang = LANGS.includes(requested) ? requested : "fr";
  document.documentElement.lang = currentLang;
}

export function lang() { return currentLang; }

const TYPOGRAPHY_DEFAULTS = {
  fr: { q: `${NNBSP}?`, nb: NBSP },
  en: { q: "?", nb: "" },
  de: { q: "?", nb: NBSP },
};

export function t(key, vars = {}) {
  const template = STRINGS[currentLang][key] ?? STRINGS.fr[key] ?? key;
  const defaults = TYPOGRAPHY_DEFAULTS[currentLang];
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = name in vars ? vars[name] : defaults[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function capitalize(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : text; }

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

const numberFormats = new Map();

function numberFormat(options) {
  const key = currentLang + JSON.stringify(options);
  if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(LOCALES[currentLang], options));
  return numberFormats.get(key);
}

function isMissing(value) { return value === null || value === undefined || Number.isNaN(value); }

export function number(value, digits = 0) {
  if (isMissing(value)) return t("na");
  return numberFormat({ maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function numberWithoutTrailingZeros(value, maximumDigits) {
  return numberFormat({ maximumFractionDigits: maximumDigits, minimumFractionDigits: 0 }).format(value);
}

function splitMagnitude(value) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return [value / 1e9, "bn"];
  if (abs >= 1e6) return [value / 1e6, "m"];
  if (abs >= 1e3) return [value / 1e3, "k"];
  return [value, ""];
}

function fractionDigitsFor(value) {
  const abs = Math.abs(value);
  if (abs >= 100) return 0;
  return abs >= 1 ? 1 : 2;
}

const SHORT_MONEY_SUFFIXES = {
  fr: { bn: "Md€", m: "M€", k: "k€", "": "€" },
  de: { bn: "Mrd. €", m: "Mio. €", k: "Tsd. €", "": "€" },
  en: { bn: "bn", m: "m", k: "k", "": "" },
};

export function money(value) {
  if (isMissing(value)) return t("na");
  const [scaled, magnitude] = splitMagnitude(value);
  const amount = numberWithoutTrailingZeros(scaled, magnitude ? fractionDigitsFor(scaled) : 0);
  const suffix = SHORT_MONEY_SUFFIXES[currentLang][magnitude];
  return currentLang === "en" ? `€${amount}${suffix}` : `${amount}${NBSP}${suffix}`;
}

const LONG_MONEY_WORDS = {
  fr: { bn: ["milliard d’euros", "milliards d’euros"], m: ["million d’euros", "millions d’euros"] },
  en: { bn: ["billion", "billion"], m: ["million", "million"] },
  de: { bn: ["Milliarde Euro", "Milliarden Euro"], m: ["Million Euro", "Millionen Euro"] },
};

export function moneyLong(value) {
  if (isMissing(value)) return t("na");
  if (Math.abs(value) >= 1e6) {
    const [scaled, magnitude] = splitMagnitude(value);
    const amount = numberWithoutTrailingZeros(scaled, fractionDigitsFor(scaled));
    const [singular, plural] = LONG_MONEY_WORDS[currentLang][magnitude];
    const words = `${amount}${NBSP}${Math.abs(scaled) < 2 ? singular : plural}`;
    return currentLang === "en" ? `€${words}` : words;
  }
  const rounded = Math.abs(value) >= 1000 ? Math.round(value / 1000) * 1000 : Math.round(value);
  if (currentLang === "en") return `€${number(rounded)}`;
  return `${number(rounded)}${NBSP}${currentLang === "fr" ? "euros" : "Euro"}`;
}

export function euroAmount(value) {
  if (value === null || value === undefined) return t("na");
  const amount = number(value, Math.abs(value) < 10 ? 2 : 0);
  return currentLang === "en" ? `€${amount}` : `${amount}${NBSP}€`;
}

export function percent(ratio, digits) {
  if (!Number.isFinite(ratio)) return t("na");
  const fractionDigits = digits ?? (Math.abs(ratio) < 0.01 ? 1 : 0);
  return numberFormat({ style: "percent", maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }).format(ratio);
}

export function percentAxis(ratio) {
  if (!Number.isFinite(ratio)) return t("na");
  return numberFormat({ style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(ratio);
}

function signOf(value) {
  if (value > 0) return "+";
  return value < 0 ? "−" : "";
}

export function signedPercent(ratio) {
  if (!Number.isFinite(ratio)) return t("na");
  return signOf(ratio) + percent(Math.abs(ratio), Math.abs(ratio) < 0.1 ? 1 : 0);
}

export function signedMoney(value) {
  if (value === null || value === undefined) return t("na");
  return signOf(value) + money(Math.abs(value));
}

const ENGLISH_ORDINAL_SUFFIXES = ["th", "st", "nd", "rd"];

export function ordinal(rank) {
  if (currentLang === "fr") return rank === 1 ? "1er" : `${rank}e`;
  if (currentLang === "de") return `${rank}.`;
  const lastTwoDigits = rank % 100;
  const suffix = ENGLISH_ORDINAL_SUFFIXES[(lastTwoDigits - 20) % 10] || ENGLISH_ORDINAL_SUFFIXES[lastTwoDigits] || ENGLISH_ORDINAL_SUFFIXES[0];
  return rank + suffix;
}

const FRENCH_RANK_WORDS = { 1: "premier", 2: "deuxième", 3: "troisième" };
const GERMAN_ORDINAL_STEMS = ["", "", "zweit", "dritt", "viert", "fünft", "sechst", "siebt", "acht", "neunt", "zehnt"];

export function rankWord(rank) {
  if (currentLang === "fr") return FRENCH_RANK_WORDS[rank] ?? `${rank}e`;
  if (currentLang === "de") {
    if (rank === 1) return "wichtigster";
    return rank <= 10 ? `${GERMAN_ORDINAL_STEMS[rank]}wichtigster` : `${rank}.-wichtigster`;
  }
  return rank === 1 ? "largest" : `${ordinal(rank)} largest`;
}

function utcDate(isoDate) {
  const [year, month, day = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(isoDate, options) {
  return new Intl.DateTimeFormat(LOCALES[currentLang], { ...options, timeZone: "UTC" }).format(utcDate(isoDate));
}

export function monthName(period) { return formatDate(period, { month: "long", year: "numeric" }); }

function monthShort(period) { return formatDate(period, { month: "short" }); }

export function monthOfYear(month, style = "long") { return formatDate(`2000-${month}`, { month: style }); }

export function monthAxisLabel(period) {
  const january = period.endsWith("-01");
  return monthShort(period) + (january ? ` ${period.slice(2, 4)}` : "");
}

export function dateLong(isoDate) { return formatDate(isoDate, { day: "numeric", month: "long", year: "numeric" }); }

const MAGNITUDE_WORDS = {
  fr: [[1e9, "milliards"], [1e6, "millions"]],
  en: [[1e9, "billion"], [1e6, "million"]],
  de: [[1e9, "Milliarden"], [1e6, "Millionen"]],
};

function numberInWords(value) {
  const magnitude = MAGNITUDE_WORDS[currentLang].find(([size]) => Math.abs(value) >= size);
  if (magnitude) {
    const [size, word] = magnitude;
    return `${number(value / size, fractionDigitsFor(value / size))}${NBSP}${word}`;
  }
  return number(Math.abs(value) >= 1000 ? Math.round(value / 100) * 100 : value);
}

function quantityBeforeUnit(value) {
  const text = numberInWords(value);
  const endsWithFrenchMagnitudeWord = currentLang === "fr" && /[a-z]$/.test(text);
  return endsWithFrenchMagnitudeWord ? `${text} de` : text;
}

export function mass(kilograms, inLitres = false) {
  if (!kilograms) return null;
  if (inLitres) return t("product.mass.litres", { n: quantityBeforeUnit(kilograms) });
  if (kilograms >= 10000) return t("product.mass.tonnes", { n: quantityBeforeUnit(kilograms / 1000) });
  return t("product.mass.kg", { n: number(kilograms) });
}

const FRENCH_PLURAL_NAMES = new Set(["NL", "US", "AE", "PH", "BS", "KM", "MV", "SC", "FJ", "SB", "MH", "VI", "VG", "KY", "TC", "FK", "FO", "AN", "UM", "BQ", "CC", "CX", "HM", "MP"]);
const FRENCH_NAMES_WITHOUT_ARTICLE = new Set(["SG", "HK", "MC", "MT", "CY", "IL", "CU", "TW", "MG", "BH", "OM", "AD", "SM", "MO", "HT", "JE", "GG", "MU", "LC", "GI", "KN", "VC", "AG", "ST", "TT", "DM", "NR", "TV", "KI", "PW", "WS", "TO", "VU", "BB", "GD", "CW", "SX", "AW", "BM", "MS", "AI", "SH", "PN", "NU", "TK", "CK", "NF", "GU", "AS", "PF", "NC", "WF", "PM", "BL", "YT", "IO", "TF", "GS", "BV", "AQ", "IM", "XC", "XL", "DJ", "XK", "BN"]);
const FRENCH_MASCULINE_NAMES = new Set(["JP", "CA", "BR", "MX", "PT", "DK", "VN", "MA", "PE", "CL", "KZ", "PK", "BD", "LB", "LU", "SN", "KE", "CM", "GH", "NG", "ZA", "ZW", "MZ", "KH", "LA", "MM", "NP", "BT", "TD", "NE", "ML", "BF", "TG", "BJ", "GA", "CG", "BI", "RW", "MW", "SV", "GT", "HN", "NI", "PA", "PY", "UY", "VE", "EC", "SR", "GY", "BZ", "YE", "KW", "QA", "SD", "SS", "TM", "TJ", "KG", "UZ", "AZ", "IQ", "IR", "GB", "LS", "BW", "SZ", "ER", "ME", "XM", "VA", "LI", "TL", "CV"]);
const FRENCH_FEMININE_NAMES = new Set(["KR", "KP", "CD", "GW", "MK"]);
const FRENCH_ELIDED_NAMES = new Set(["IQ", "IR", "EC", "UZ", "AZ"]);
const ENGLISH_NAMES_WITH_THE = new Set(["NL", "US", "GB", "AE", "PH", "CD", "CG", "BS", "MV", "KM", "SC", "SB", "MH", "VA", "CF", "DO", "FO", "KY", "VI", "VG", "FK", "BQ", "TC", "GM"]);
const GERMAN_FEMININE_NAMES = new Set(["CH", "TR", "SK", "UA", "MN", "DO", "CF"]);
const GERMAN_MASCULINE_NAMES = new Set(["IR", "IQ", "LB", "SD", "SS", "TD", "NE", "YE", "VA", "KG"]);
const GERMAN_PLURAL_NAMES = new Set(["NL", "US", "AE", "PH", "BS", "MV", "KM", "SC", "SB", "MH", "FK", "FO", "VI", "VG", "KY", "TC"]);
const GERMAN_NEUTER_NAMES = new Set(["GB"]);

function startsWithVowel(name) { return /^[aeiouyhâàéèêëîïôöûüœæ]/i.test(name.normalize("NFC")); }

function frenchArticle(code, name) {
  if (FRENCH_PLURAL_NAMES.has(code)) return "les ";
  if (FRENCH_NAMES_WITHOUT_ARTICLE.has(code)) return "";
  if (FRENCH_ELIDED_NAMES.has(code) || startsWithVowel(name)) return "l’";
  if (FRENCH_FEMININE_NAMES.has(code)) return "la ";
  if (FRENCH_MASCULINE_NAMES.has(code)) return "le ";
  return /e$/i.test(name) ? "la " : "le ";
}

function frenchFrom(article, name) {
  if (article === "le ") return `du ${name}`;
  if (article === "les ") return `des ${name}`;
  if (article === "") return startsWithVowel(name) ? `d’${name}` : `de ${name}`;
  return `de ${article}${name}`;
}

function frenchTo(article, name) {
  if (article === "le ") return `au ${name}`;
  if (article === "les ") return `aux ${name}`;
  return `à ${article}${name}`;
}

function frenchCountryForms(code, name) {
  const article = frenchArticle(code, name);
  const definite = article + name;
  return {
    name, definite, dative: definite, from: frenchFrom(article, name), to: frenchTo(article, name),
    comingFrom: `depuis ${definite}`, goingTo: `vers ${definite}`,
  };
}

function englishCountryForms(code, name) {
  const definite = ENGLISH_NAMES_WITH_THE.has(code) ? `the ${name}` : name;
  return { name, definite, dative: definite, from: `from ${definite}`, to: `to ${definite}`, comingFrom: `from ${definite}`, goingTo: `to ${definite}` };
}

const GERMAN_ARTICLES = {
  feminine: { nominative: "die", dative: "der", accusative: "die" },
  masculine: { nominative: "der", dative: "dem", accusative: "den" },
  plural: { nominative: "die", dative: "den", accusative: "die" },
  neuter: { nominative: "das", dative: "dem", accusative: "das" },
};

function germanGender(code) {
  if (GERMAN_FEMININE_NAMES.has(code)) return "feminine";
  if (GERMAN_MASCULINE_NAMES.has(code)) return "masculine";
  if (GERMAN_PLURAL_NAMES.has(code)) return "plural";
  return GERMAN_NEUTER_NAMES.has(code) ? "neuter" : null;
}

function germanCountryForms(code, name) {
  const gender = germanGender(code);
  if (!gender) return { name, definite: name, dative: name, from: `aus ${name}`, to: `nach ${name}`, comingFrom: `aus ${name}`, goingTo: `nach ${name}` };
  const articles = GERMAN_ARTICLES[gender];
  const dativeName = gender === "plural" && !name.endsWith("n") ? `${name}n` : name;
  const dative = `${articles.dative} ${dativeName}`;
  const to = `in ${articles.accusative} ${name}`;
  return { name, definite: `${articles.nominative} ${name}`, dative, from: `aus ${dative}`, to, comingFrom: `aus ${dative}`, goingTo: to };
}

const COUNTRY_FORMS = { fr: frenchCountryForms, en: englishCountryForms, de: germanCountryForms };

export function countryForms(code, name) { return COUNTRY_FORMS[currentLang](code, name); }

export function lowerFirst(name) {
  if (!name) return name;
  if (/^[A-Z0-9]{2,}/.test(name)) return name;
  return currentLang === "de" ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

export function productOf(name) {
  if (currentLang === "fr") {
    const lowered = lowerFirst(name);
    return (startsWithVowel(lowered) ? "d’" : "de ") + lowered;
  }
  if (currentLang === "en") return `of ${lowerFirst(name)}`;
  return name;
}
