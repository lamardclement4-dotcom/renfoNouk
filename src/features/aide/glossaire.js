// ============================================================
// Glossaire : chaque terme technique de l'app, dit simplement.
//
// Une explication par terme, au même endroit, pour que le même mot veuille
// dire la même chose partout. Ouvert par le bouton « ? » (Aide, kit.jsx)
// posé à côté du terme. Chaque entrée : un titre, une phrase qui dit ce
// que c'est, et si utile ce qu'il faut en faire.
// ============================================================
export const GLOSSAIRE = {
  charge: {
    titre: 'Charge d’entraînement',
    texte: 'Ce que tes séances demandent à ton corps. Chaque séance compte sa durée multipliée par l’effort ressenti : une heure à effort moyen vaut 60 points, une heure très dure en vaut une centaine. La chaleur ajoute un peu.',
    conseil: 'La courbe montre les 7 derniers jours glissants : chaque point additionne la semaine qui se termine ce jour-là.',
  },
  points: {
    titre: 'Points de charge',
    texte: 'L’unité de la charge : 1 point ≈ 1 minute d’effort moyen (effort 5 sur 10). Une minute à 8 sur 10 compte 1,6 point, une minute à 3 sur 10 en compte 0,6.',
  },
  rapport: {
    titre: 'Rapport aigu / chronique',
    texte: 'Ta charge des 7 derniers jours divisée par ta moyenne des 4 dernières semaines. Autour de 1, tu restes dans ton rythme. Nettement au-dessus, tu augmentes vite : c’est là que le risque de blessure monte. En dessous de 0,8, ta semaine est plus calme que d’habitude.',
    conseil: 'Le seuil d’alerte dépend de ton niveau : un débutant est alerté plus tôt qu’un sportif confirmé.',
  },
  zone: {
    titre: 'Zone habituelle',
    texte: 'La bande sur la courbe : là où ta charge de la semaine reste proche de ton habitude (de 0,8 à 1,3 fois ta moyenne des 4 dernières semaines). Elle apparaît après 14 jours d’historique.',
  },
  rpe: {
    titre: 'Effort ressenti (RPE)',
    texte: 'Une note de 1 à 10 de la difficulté de ta séance, telle que tu l’as vécue. 1 : très facile. 5 : moyen, tu peux parler. 8 : dur, quelques mots seulement. 10 : à fond.',
    conseil: 'C’est elle qui transforme tes minutes en points de charge : note-la après chaque séance.',
  },
  cadrans: {
    titre: 'Relevés du jour',
    texte: 'Chaque arc se remplit vers ta cible du jour : sommeil de la nuit, eau bue, protéines mangées. Arc plein : cible atteinte.',
    conseil: 'Touche un cadran pour saisir ou corriger.',
  },
  scoreSante: {
    titre: 'Score santé sportive',
    texte: 'Une note sur 100 qui résume six piliers : eau, nutrition, sommeil, charge, mobilité et prévention des blessures. Chaque pilier a sa propre note sur 100 ; le score est leur moyenne.',
    conseil: 'Un pilier sans donnée (« — ») ne compte pas : renseigne-le pour qu’il entre dans le score.',
  },
  tdee: {
    titre: 'Dépense quotidienne (TDEE)',
    texte: 'Ce que ton corps brûle en une journée, activité comprise. Manger autant garde le poids stable ; moins le fait baisser, plus le fait monter.',
  },
  imc: {
    titre: 'Indice de masse corporelle (IMC)',
    texte: 'Le poids divisé par la taille au carré. Un repère grossier : il ne distingue pas le muscle de la graisse, un sportif musclé peut sortir « en surpoids ».',
  },
  affutage: {
    titre: 'Affûtage',
    texte: 'Les jours qui précèdent une compétition : on réduit nettement le volume d’entraînement, en gardant un peu d’intensité, pour arriver reposé et en forme le jour J.',
  },
  pliometrie: {
    titre: 'Pliométrie',
    texte: 'Des sauts et des rebonds enchaînés, pour gagner en explosivité et en réactivité. Intense pour les tendons : à faire reposé, sur un sol souple, sans enchaîner trop de séances.',
  },
  macros: {
    titre: 'Macros',
    texte: 'Les trois grandes familles de nutriments qui apportent l’énergie : protéines (muscles, récupération), glucides (carburant de l’effort) et lipides (hormones, réserves).',
  },
  forme: {
    titre: 'Forme du jour',
    texte: 'Une note sur 100 tirée de ta nuit : durée par rapport à ton besoin (40 points), dette de sommeil des deux dernières semaines (20), énergie au réveil (25) et qualité (15). Elle est ensuite corrigée par les sensations au réveil, la séance d’hier comparée à ta séance habituelle, les jours d’entraînement enchaînés et une douleur en cours. « Détail du calcul » montre chaque ligne.',
    conseil: '75 et plus : séance intense possible. 55 à 74 : séance normale. 35 à 54 : séance légère. En dessous, en cas de fièvre ou de douleur à faire voir : repos.',
  },
  pouls: {
    titre: 'Pouls au réveil',
    texte: 'Tes battements par minute, pris au réveil, encore allongé, avant de te lever ou de regarder ton téléphone : une minute au poignet ou au cou, ou la mesure de ta montre. Seul il ne dit pas grand-chose ; comparé à ta normale, il parle : 7 battements de plus qu’à l’habitude signalent souvent une récupération incomplète, un manque de sommeil ou un début de maladie.',
    conseil: 'Ta normale se calcule après 5 mesures, sur les 4 dernières semaines. Mesure-le toujours de la même façon.',
  },
  vfc: {
    titre: 'Variabilité cardiaque (VFC)',
    texte: 'Les petites variations d’écart entre deux battements, mesurées par une montre et importées d’Apple Santé. Plus elle est haute par rapport à ta normale, plus ton corps est reposé ; une chute de 15 % ou plus sous ta normale signale une fatigue ou un stress que les sensations ne montrent pas toujours.',
    conseil: 'Elle varie beaucoup d’une personne à l’autre : seule la comparaison avec ta propre normale compte.',
  },
  efficacite: {
    titre: 'Efficacité du sommeil',
    texte: 'La part du temps passé au lit à dormir vraiment. 85 % et plus : bon. En dessous, trop de temps éveillé au lit (endormissement long, réveils) : se coucher un peu plus tard, quand le sommeil vient, aide souvent plus que se coucher tôt.',
    conseil: 'Calculée exactement quand tu saisis coucher et lever ; sinon estimée d’après le nombre de réveils.',
  },
  decalage: {
    titre: 'Décalage du week-end',
    texte: 'De combien le milieu de ta nuit glisse entre la semaine et le week-end. Une heure ou plus, et ton corps vit chaque lundi un petit décalage horaire : endormissement difficile le dimanche soir, réveil lourd le lundi.',
    conseil: 'Le levier le plus simple : un lever du week-end à moins d’une heure de celui de la semaine.',
  },
  dette: {
    titre: 'Dette de sommeil',
    texte: 'Le sommeil manquant cumulé sur deux semaines, par rapport à ton besoin. Une longue nuit n’en rattrape qu’une partie (une heure au plus) : la dette se résorbe en dormant un peu plus chaque nuit.',
  },
  horsLigne: {
    titre: 'Hors ligne',
    texte: 'Sans réseau, l’app s’ouvre sur la dernière copie de tes données gardée sur ce téléphone. Tes saisies sont notées et partent d’elles-mêmes au retour du réseau.',
  },
}

export function definition(terme) {
  return GLOSSAIRE[terme] || null
}
