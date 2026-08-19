// ============================================================
// Données de planification — champs spécifiques par sport et
// bibliothèque d'exercices de musculation, portées telles quelles
// depuis l'ancienne app (schéma déclaratif, rendu générique dans
// PlannerSpace.jsx).
// ============================================================

// Bibliothèque d'exercices de musculation.
//
// La liste portée depuis l'ancienne app comptait 48 entrées et ignorait
// entièrement le matériel de salle : ni leg extension, ni leg curl, ni
// presse, ni poulie, ni pec deck. Quelqu'un s'entraînant en salle ne
// pouvait consigner qu'une fraction de sa séance, et devait renoncer au
// suivi de charge pour tout le reste.
//
// Le format reste « groupe → liste de noms » : `db.exerciseHistory` est
// indexé par le nom exact de l'exercice, donc changer la forme ou
// renommer une entrée existante orphelinerait l'historique de charge déjà
// enregistré. On ajoute, on ne renomme pas.
export const EXERCISES_DB = {
  'Pectoraux': [
    'Développé couché', 'Développé couché haltères', 'Développé incliné', 'Développé incliné haltères',
    'Développé décliné', 'Développé couché machine', 'Développé couché prise serrée',
    'Pec deck', 'Écartés haltères', 'Écartés poulie vis-à-vis', 'Écartés inclinés haltères',
    'Dips', 'Dips lestés', 'Pompes', 'Pompes lestées', 'Pull-over haltère',
  ],
  'Dos': [
    'Tractions', 'Tractions lestées', 'Tractions supination', 'Tractions prise serrée', 'Tractions assistées',
    'Tirage vertical', 'Tirage vertical prise serrée', 'Tirage vertical supination', 'Tirage nuque',
    'Tirage horizontal', 'Tirage horizontal un bras', 'Rowing barre', 'Rowing barre supination',
    'Rowing haltère', 'Rowing T-bar', 'Rowing machine', 'Rowing Yates',
    'Soulevé de terre', 'Soulevé de terre sumo', 'Pull-over', 'Pull-over poulie', 'Pullover machine',
  ],
  'Épaules': [
    'Développé militaire', 'Développé militaire haltères', 'Développé épaules machine', 'Développé nuque',
    'Arnold Press', 'Élévations latérales', 'Élévations latérales poulie', 'Élévations latérales machine',
    'Élévations frontales', 'Oiseau', 'Oiseau machine', 'Face pull', 'Tirage menton',
  ],
  'Trapèzes': [
    'Shrug barre', 'Shrug haltères', 'Shrug poulie', 'Shrug machine',
  ],
  'Biceps': [
    'Curl barre', 'Curl barre EZ', 'Curl haltères', 'Curl marteau', 'Curl incliné',
    'Curl pupitre', 'Curl poulie basse', 'Curl machine', 'Curl concentré', 'Curl araignée',
  ],
  'Triceps': [
    'Barre front', 'Extensions poulie', 'Extensions poulie corde', 'Extensions poulie inversées',
    'Extension nuque haltère', 'Extension nuque poulie', 'Kickback triceps', 'Kickback triceps poulie',
    'Dips triceps', 'Dips machine', 'Pompes serrées',
  ],
  'Avant-bras': [
    'Wrist curl', 'Reverse wrist curl', 'Farmer walk', 'Suspension à la barre', 'Rouleau de poignet',
  ],
  'Abdominaux': [
    'Crunch', 'Crunch poulie', 'Crunch machine', 'Crunch oblique', 'Gainage', 'Gainage latéral',
    'Hollow Hold', 'Relevés de jambes', 'Relevés de jambes suspendu', 'Roue abdominale',
    'Russian twist', 'Pallof press', 'Mountain climbers', 'Dead bug', 'Woodchop poulie',
  ],
  'Lombaires': [
    'Extensions lombaires', 'Banc à lombaires', 'Hyperextension machine', 'Good Morning', 'Superman', 'Bird-dog',
  ],
  'Quadriceps': [
    'Squat', 'Front Squat', 'Squat gobelet', 'Hack squat', 'Squat machine Smith',
    'Presse', 'Presse une jambe', 'Leg Extension', 'Leg Extension une jambe',
    'Fentes', 'Fentes marchées', 'Fentes barre', 'Fentes haltères', 'Sissy squat', 'Step-up',
  ],
  'Ischio-jamb.': [
    'Soulevé de terre jambes tendues', 'Soulevé de terre roumain', 'Soulevé de terre roumain haltères',
    'Leg Curl', 'Leg Curl allongé', 'Leg Curl assis', 'Leg Curl debout', 'Nordic Curl',
    'Soulevé de terre une jambe', 'Good Morning barre',
  ],
  'Fessiers': [
    'Hip Thrust', 'Hip Thrust machine', 'Glute Bridge', 'Fentes bulgares',
    'Abduction machine', 'Abduction poulie', 'Kickback fessier poulie', 'Kickback fessier machine', 'Montée sur banc',
  ],
  'Adducteurs': [
    'Adduction machine', 'Squat sumo', 'Fentes latérales', 'Adduction poulie',
  ],
  'Mollets': [
    'Mollets debout', 'Mollets debout machine', 'Mollets assis', 'Mollets à la presse',
    'Mollets une jambe', 'Sauts à la corde',
  ],
  'Haltérophilie': [
    'Arraché', 'Épaulé-jeté', 'Épaulé', 'Jeté', 'Arraché debout', 'Tirage arraché',
    'Squat clavicule', 'Thruster', 'Kettlebell swing',
  ],
  'Callisthénie': [
    'Muscle-up', 'Pistol squat', 'L-sit', 'Front lever', 'Back lever', 'Planche',
    'Handstand push-up', 'Handstand hold', 'Dragon flag',
  ],
};

// Matériel requis, par exercice. L'information manquait entièrement au
// planificateur : rien ne distinguait un exercice faisable chez soi d'un
// autre qui suppose une salle équipée, alors que c'est le premier critère
// de choix quand on prépare une séance.
export const EQUIP = {
  MACHINE: 'Machine', POULIE: 'Poulie', BARRE: 'Barre', HALTERES: 'Haltères',
  KETTLEBELL: 'Kettlebell', CORPS: 'Poids du corps', BANC: 'Banc / marche',
}

export const EXERCISE_EQUIP = {
  // Pectoraux
  'Développé couché': EQUIP.BARRE, 'Développé couché haltères': EQUIP.HALTERES,
  'Développé incliné': EQUIP.BARRE, 'Développé incliné haltères': EQUIP.HALTERES,
  'Développé décliné': EQUIP.BARRE, 'Développé couché machine': EQUIP.MACHINE,
  'Développé couché prise serrée': EQUIP.BARRE, 'Pec deck': EQUIP.MACHINE,
  'Écartés haltères': EQUIP.HALTERES, 'Écartés poulie vis-à-vis': EQUIP.POULIE,
  'Écartés inclinés haltères': EQUIP.HALTERES, 'Dips': EQUIP.CORPS, 'Dips lestés': EQUIP.CORPS,
  'Pompes': EQUIP.CORPS, 'Pompes lestées': EQUIP.CORPS, 'Pull-over haltère': EQUIP.HALTERES,
  // Dos
  'Tractions': EQUIP.CORPS, 'Tractions lestées': EQUIP.CORPS, 'Tractions supination': EQUIP.CORPS,
  'Tractions prise serrée': EQUIP.CORPS, 'Tractions assistées': EQUIP.MACHINE,
  'Tirage vertical': EQUIP.POULIE, 'Tirage vertical prise serrée': EQUIP.POULIE,
  'Tirage vertical supination': EQUIP.POULIE, 'Tirage nuque': EQUIP.POULIE,
  'Tirage horizontal': EQUIP.POULIE, 'Tirage horizontal un bras': EQUIP.POULIE,
  'Rowing barre': EQUIP.BARRE, 'Rowing barre supination': EQUIP.BARRE, 'Rowing haltère': EQUIP.HALTERES,
  'Rowing T-bar': EQUIP.MACHINE, 'Rowing machine': EQUIP.MACHINE, 'Rowing Yates': EQUIP.BARRE,
  'Soulevé de terre': EQUIP.BARRE, 'Soulevé de terre sumo': EQUIP.BARRE,
  'Pull-over': EQUIP.HALTERES, 'Pull-over poulie': EQUIP.POULIE, 'Pullover machine': EQUIP.MACHINE,
  // Épaules
  'Développé militaire': EQUIP.BARRE, 'Développé militaire haltères': EQUIP.HALTERES,
  'Développé épaules machine': EQUIP.MACHINE, 'Développé nuque': EQUIP.BARRE,
  'Arnold Press': EQUIP.HALTERES, 'Élévations latérales': EQUIP.HALTERES,
  'Élévations latérales poulie': EQUIP.POULIE, 'Élévations latérales machine': EQUIP.MACHINE,
  'Élévations frontales': EQUIP.HALTERES, 'Oiseau': EQUIP.HALTERES, 'Oiseau machine': EQUIP.MACHINE,
  'Face pull': EQUIP.POULIE, 'Tirage menton': EQUIP.BARRE,
  // Trapèzes
  'Shrug barre': EQUIP.BARRE, 'Shrug haltères': EQUIP.HALTERES, 'Shrug poulie': EQUIP.POULIE,
  'Shrug machine': EQUIP.MACHINE,
  // Biceps
  'Curl barre': EQUIP.BARRE, 'Curl barre EZ': EQUIP.BARRE, 'Curl haltères': EQUIP.HALTERES,
  'Curl marteau': EQUIP.HALTERES, 'Curl incliné': EQUIP.HALTERES, 'Curl pupitre': EQUIP.MACHINE,
  'Curl poulie basse': EQUIP.POULIE, 'Curl machine': EQUIP.MACHINE, 'Curl concentré': EQUIP.HALTERES,
  'Curl araignée': EQUIP.HALTERES,
  // Triceps
  'Barre front': EQUIP.BARRE, 'Extensions poulie': EQUIP.POULIE, 'Extensions poulie corde': EQUIP.POULIE,
  'Extensions poulie inversées': EQUIP.POULIE, 'Extension nuque haltère': EQUIP.HALTERES,
  'Extension nuque poulie': EQUIP.POULIE, 'Kickback triceps': EQUIP.HALTERES, 'Kickback triceps poulie': EQUIP.POULIE,
  'Dips triceps': EQUIP.CORPS, 'Dips machine': EQUIP.MACHINE, 'Pompes serrées': EQUIP.CORPS,
  // Avant-bras
  'Wrist curl': EQUIP.HALTERES, 'Reverse wrist curl': EQUIP.HALTERES, 'Farmer walk': EQUIP.HALTERES,
  'Suspension à la barre': EQUIP.CORPS, 'Rouleau de poignet': EQUIP.HALTERES,
  // Abdominaux
  'Crunch': EQUIP.CORPS, 'Crunch poulie': EQUIP.POULIE, 'Crunch machine': EQUIP.MACHINE,
  'Crunch oblique': EQUIP.CORPS, 'Gainage': EQUIP.CORPS, 'Gainage latéral': EQUIP.CORPS,
  'Hollow Hold': EQUIP.CORPS, 'Relevés de jambes': EQUIP.CORPS, 'Relevés de jambes suspendu': EQUIP.CORPS,
  'Roue abdominale': EQUIP.CORPS, 'Russian twist': EQUIP.CORPS, 'Pallof press': EQUIP.POULIE,
  'Mountain climbers': EQUIP.CORPS, 'Dead bug': EQUIP.CORPS, 'Woodchop poulie': EQUIP.POULIE,
  // Lombaires
  'Extensions lombaires': EQUIP.CORPS, 'Banc à lombaires': EQUIP.MACHINE,
  'Hyperextension machine': EQUIP.MACHINE, 'Good Morning': EQUIP.BARRE, 'Superman': EQUIP.CORPS,
  'Bird-dog': EQUIP.CORPS,
  // Quadriceps
  'Squat': EQUIP.BARRE, 'Front Squat': EQUIP.BARRE, 'Squat gobelet': EQUIP.HALTERES,
  'Hack squat': EQUIP.MACHINE, 'Squat machine Smith': EQUIP.MACHINE, 'Presse': EQUIP.MACHINE,
  'Presse une jambe': EQUIP.MACHINE, 'Leg Extension': EQUIP.MACHINE, 'Leg Extension une jambe': EQUIP.MACHINE,
  'Fentes': EQUIP.CORPS, 'Fentes marchées': EQUIP.HALTERES, 'Fentes barre': EQUIP.BARRE,
  'Fentes haltères': EQUIP.HALTERES, 'Sissy squat': EQUIP.CORPS, 'Step-up': EQUIP.BANC,
  // Ischio-jambiers
  'Soulevé de terre jambes tendues': EQUIP.BARRE, 'Soulevé de terre roumain': EQUIP.BARRE,
  'Soulevé de terre roumain haltères': EQUIP.HALTERES, 'Leg Curl': EQUIP.MACHINE,
  'Leg Curl allongé': EQUIP.MACHINE, 'Leg Curl assis': EQUIP.MACHINE, 'Leg Curl debout': EQUIP.MACHINE,
  'Nordic Curl': EQUIP.CORPS, 'Soulevé de terre une jambe': EQUIP.HALTERES, 'Good Morning barre': EQUIP.BARRE,
  // Fessiers
  'Hip Thrust': EQUIP.BARRE, 'Hip Thrust machine': EQUIP.MACHINE, 'Glute Bridge': EQUIP.CORPS,
  'Fentes bulgares': EQUIP.HALTERES, 'Abduction machine': EQUIP.MACHINE, 'Abduction poulie': EQUIP.POULIE,
  'Kickback fessier poulie': EQUIP.POULIE, 'Kickback fessier machine': EQUIP.MACHINE, 'Montée sur banc': EQUIP.BANC,
  // Adducteurs
  'Adduction machine': EQUIP.MACHINE, 'Squat sumo': EQUIP.BARRE, 'Fentes latérales': EQUIP.CORPS,
  'Adduction poulie': EQUIP.POULIE,
  // Mollets
  'Mollets debout': EQUIP.CORPS, 'Mollets debout machine': EQUIP.MACHINE, 'Mollets assis': EQUIP.MACHINE,
  'Mollets à la presse': EQUIP.MACHINE, 'Mollets une jambe': EQUIP.CORPS, 'Sauts à la corde': EQUIP.CORPS,
  // Haltérophilie
  'Arraché': EQUIP.BARRE, 'Épaulé-jeté': EQUIP.BARRE, 'Épaulé': EQUIP.BARRE, 'Jeté': EQUIP.BARRE,
  'Arraché debout': EQUIP.BARRE, 'Tirage arraché': EQUIP.BARRE, 'Squat clavicule': EQUIP.BARRE,
  'Thruster': EQUIP.BARRE, 'Kettlebell swing': EQUIP.KETTLEBELL,
  // Callisthénie
  'Muscle-up': EQUIP.CORPS, 'Pistol squat': EQUIP.CORPS, 'L-sit': EQUIP.CORPS,
  'Front lever': EQUIP.CORPS, 'Back lever': EQUIP.CORPS, 'Planche': EQUIP.CORPS,
  'Handstand push-up': EQUIP.CORPS, 'Handstand hold': EQUIP.CORPS, 'Dragon flag': EQUIP.CORPS,
}

export function equipOf(name) {
  return EXERCISE_EQUIP[name] || null
}

// Recherche insensible aux accents et à la casse, classée par pertinence.
// L'ancienne recherche faisait un `includes` brut sur la casse d'origine :
// « developpe » ne trouvait pas « Développé couché », et les résultats
// sortaient dans l'ordre de déclaration, tronqués aux huit premiers.
const normalize = (s) => (s || '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function rank(name, q) {
  const i = name.indexOf(q)
  if (i < 0) return -1
  if (name === q) return 0
  if (i === 0) return 1
  return name[i - 1] === ' ' || name[i - 1] === "'" || name[i - 1] === '-' ? 2 : 3
}

export function searchExercises(query, { equip = null, limit = 24 } = {}) {
  const q = normalize(query).trim()
  if (!q) return []
  const out = []
  for (const [group, list] of Object.entries(EXERCISES_DB)) {
    for (const n of list) {
      if (equip && equipOf(n) !== equip) continue
      const r = rank(normalize(n), q)
      if (r < 0) continue
      out.push({ n, g: group, equip: equipOf(n), rank: r })
    }
  }
  return out
    .sort((a, b) => a.rank - b.rank || a.n.length - b.n.length || a.n.localeCompare(b.n, 'fr'))
    .slice(0, limit)
}

// Exercices d'un groupe, filtrés par matériel — pour parcourir sans
// deviner un nom qu'on ne connaît pas encore.
export function exercisesOfGroup(group, equip) {
  return (EXERCISES_DB[group] || [])
    .filter((n) => !equip || equipOf(n) === equip)
    .map((n) => ({ n, g: group, equip: equipOf(n) }))
}
export const TECH_PERCHE = ["Course d'élan","Marque","Impulsion","Planté","Balancé","Retournement","Franchissement","Perche courte","Perche longue"];

// Champs de saisie par sport.
//
// Dix-sept sports n'avaient que deux champs — durée et type — ce qui
// revenait à noter « j'ai fait du foot » sans rien de ce qui distingue une
// séance d'une autre. Impossible d'en tirer une progression, et surtout
// impossible d'en tirer une charge : sans intensité, une heure de
// récupération et une heure de match pèsent pareil.
//
// D'où l'ajout systématique du RPE (intensité ressentie de 1 à 10) : c'est
// la seule mesure qui existe pour tous les sports, et multipliée par la
// durée elle donne la charge de séance, base de tout le suivi de charge.
// Le reste des ajouts est spécifique à chaque discipline.
//
// Les clés existantes sont conservées à l'identique : les séances déjà
// enregistrées les utilisent, les renommer perdrait leur contenu.
export const SPORT_FIELDS = {
  demi:    { icon:'🏃', label:'Demi-fond', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'5',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'18:30'},
    {k:'allure',t:'auto-allure',lab:'Allure (auto)'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'165'},
    {k:'fc_max',t:'num',lab:'FC max (bpm)',ph:'182'},
    {k:'seance_type',t:'select1',lab:'Type de séance',opts:['Endurance','Seuil','VMA','Côtes','Récupération','Compétition']},
    {k:'fractionne',t:'bool',lab:'Séance fractionnée ?'},
    {k:'repetitions',t:'text',lab:'Détail des répétitions',ph:'8 × 400 m / r=1min30'},
    {k:'terrain',t:'select1',lab:'Terrain',opts:['Piste','Route','Chemin','Tapis']},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'40'},
    {k:'cadence',t:'num',lab:'Cadence (pas/min)',ph:'176'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  fond:    { icon:'🏃', label:'Fond / marathon', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'21',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'95:00'},
    {k:'allure',t:'auto-allure',lab:'Allure (auto)'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'},
    {k:'seance_type',t:'select1',lab:'Type de séance',opts:['Sortie longue','Endurance','Allure spécifique','Seuil','Récupération','Compétition']},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'250'},
    {k:'terrain',t:'select1',lab:'Terrain',opts:['Route','Chemin','Piste','Tapis']},
    {k:'cadence',t:'num',lab:'Cadence (pas/min)',ph:'172'},
    {k:'ravitaillement',t:'text',lab:'Ravitaillement',ph:'2 gels, 750 ml'},
    {k:'chaussures',t:'text',lab:'Chaussures utilisées',ph:'Modèle'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  marche:  { icon:'🥾', label:'Marche / randonnée', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'12',step:0.1},
    {k:'duree',t:'text',lab:'Durée',ph:'3h20'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'450'},
    {k:'denivele_neg',t:'num',lab:'Dénivelé− (m)',ph:'450'},
    {k:'terrain',t:'select1',lab:'Terrain',opts:['Plat','Vallonné','Montagne']},
    {k:'sac',t:'num',lab:'Poids du sac (kg)',ph:'8',step:0.5},
    {k:'altitude_max',t:'num',lab:'Altitude max (m)',ph:'1850'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'5'}
  ]},
  velo:    { icon:'🚴', label:'Vélo / cyclisme', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'45',step:0.1},
    {k:'temps',t:'time',lab:'Temps (hh:mm)',ph:'1:35'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'600'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'140'},
    {k:'type',t:'select1',lab:'Type',opts:['Route','VTT','Home-trainer']},
    {k:'puissance',t:'num',lab:'Puissance moy. (W)',ph:'190'},
    {k:'puissance_norm',t:'num',lab:'Puissance normalisée (W)',ph:'205'},
    {k:'cadence',t:'num',lab:'Cadence moy. (tr/min)',ph:'88'},
    {k:'vitesse_max',t:'num',lab:'Vitesse max (km/h)',ph:'58',step:0.1},
    {k:'seance_type',t:'select1',lab:'Type de séance',opts:['Endurance','Seuil','PMA','Force','Récupération','Compétition']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  vtt:     { icon:'🚵', label:'VTT', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'30',step:0.1},
    {k:'temps',t:'time',lab:'Temps (hh:mm)',ph:'2:00'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'800'},
    {k:'difficulte',t:'select1',lab:'Difficulté',opts:['Facile','Technique','Très technique']},
    {k:'discipline',t:'select1',lab:'Discipline',opts:['Cross-country','Enduro','Descente','Randonnée']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'},
    {k:'chute',t:'bool',lab:'Chute(s) ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  aviron:  { icon:'🚣', label:'Aviron / kayak', fields:[
    {k:'distance',t:'num',lab:'Distance (m)',ph:'5000'},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'25:00'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'155'},
    {k:'type',t:'select1',lab:'Lieu',opts:['Mer','Rivière','Bassin','Ergomètre']},
    {k:'cadence',t:'num',lab:'Cadence (coups/min)',ph:'24'},
    {k:'split',t:'time',lab:'Split moyen /500 m (mm:ss)',ph:'2:05'},
    {k:'embarcation',t:'select1',lab:'Embarcation',opts:['Skiff','Deux','Quatre','Huit','Kayak','Canoë']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  patinage:{ icon:'⛸️', label:'Patinage / hockey', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'distance',t:'num',lab:'Distance (km, si vitesse)',ph:''},
    {k:'type',t:'select1',lab:'Type',opts:['Patinage','Hockey','Vitesse','Artistique']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'},
    {k:'buts',t:'num',lab:'Buts / passes (hockey)',ph:''},
    {k:'chute',t:'bool',lab:'Chute(s) ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  orientation:{ icon:'🧭', label:"Course d'orientation", fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'8',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'55:00'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'200'},
    {k:'difficulte',t:'select1',lab:'Difficulté carte',opts:['Facile','Moyen','Difficile']},
    {k:'postes',t:'num',lab:'Nb de postes',ph:'14'},
    {k:'erreurs',t:'num',lab:'Erreurs de navigation',ph:'2'},
    {k:'terrain',t:'select1',lab:'Terrain',opts:['Forêt','Urbain','Montagne','Dune']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  triathlon:{ icon:'🏆', label:'Triathlon', fields:[
    {k:'nage',t:'num',lab:'Natation (m)',ph:'1500'},
    {k:'velo',t:'num',lab:'Vélo (km)',ph:'40',step:0.1},
    {k:'course',t:'num',lab:'Course (km)',ph:'10',step:0.1},
    {k:'temps_total',t:'time',lab:'Temps total (hh:mm)',ph:'2:30'},
    {k:'format',t:'select1',lab:'Format',opts:['Découverte','Sprint','Olympique','Half','Ironman']},
    {k:'temps_nage',t:'time',lab:'Temps natation (mm:ss)',ph:'28:00'},
    {k:'temps_velo',t:'time',lab:'Temps vélo (hh:mm)',ph:'1:12'},
    {k:'temps_course',t:'time',lab:'Temps course (mm:ss)',ph:'44:00'},
    {k:'t1',t:'time',lab:'Transition T1 (mm:ss)',ph:'2:10'},
    {k:'t2',t:'time',lab:'Transition T2 (mm:ss)',ph:'1:30'},
    {k:'combinaison',t:'bool',lab:'Combinaison néoprène ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'8'}
  ]},
  natation:{ icon:'🏊', label:'Natation', fields:[
    {k:'distance',t:'num',lab:'Distance totale (m)',ph:'2000'},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'38:00'},
    {k:'longueurs',t:'num',lab:'Nb longueurs',ph:'40'},
    {k:'bassin',t:'select1',lab:'Bassin (m)',opts:['25','50','Eau libre']},
    {k:'nages',t:'pills',lab:'Nages travaillées',opts:['Crawl','Brasse','Dos','Papillon']},
    {k:'serie',t:'text',lab:'Série principale',ph:'10 × 100 m / départ 1:45'},
    {k:'temps_100',t:'time',lab:'Meilleur 100 m (mm:ss)',ph:'1:32'},
    {k:'materiel',t:'pills',lab:'Matériel',opts:['Plaquettes','Pull-buoy','Palmes','Planche','Tuba']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  surf:    { icon:'🏄', label:'Surf / paddle', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'vagues',t:'num',lab:'Nb vagues prises',ph:'12'},
    {k:'conditions',t:'select1',lab:'Conditions',opts:['Petites','Moyennes','Grosses']},
    {k:'spot',t:'text',lab:'Spot',ph:'Nom du spot'},
    {k:'planche',t:'select1',lab:'Planche',opts:['Shortboard','Fish','Longboard','Paddle','Bodyboard']},
    {k:'temp_eau',t:'num',lab:'Température eau (°C)',ph:'17'},
    {k:'combinaison',t:'bool',lab:'Combinaison ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  voile:   { icon:'⛵', label:'Voile / planche', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'2h00'},
    {k:'vent',t:'select1',lab:'Vent',opts:['Léger','Modéré','Fort']},
    {k:'force',t:'num',lab:'Force du vent (Beaufort)',ph:'4'},
    {k:'support',t:'select1',lab:'Support',opts:['Dériveur','Quillard','Catamaran','Planche','Wing','Kite']},
    {k:'distance',t:'num',lab:'Distance parcourue (milles)',ph:'12',step:0.1},
    {k:'chavirage',t:'bool',lab:'Chavirage / chute ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  plongee: { icon:'🤿', label:'Plongée / apnée', fields:[
    {k:'profondeur',t:'num',lab:'Profondeur max (m)',ph:'18'},
    {k:'duree',t:'text',lab:'Durée immersion',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Apnée','Bouteille']},
    {k:'temp_eau',t:'num',lab:'Température eau (°C)',ph:'16'},
    {k:'visibilite',t:'select1',lab:'Visibilité',opts:['Faible','Moyenne','Bonne']},
    {k:'palier',t:'bool',lab:'Palier de décompression ?'},
    {k:'lest',t:'num',lab:'Lestage (kg)',ph:'6',step:0.5},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'4'}
  ]},
  football:{ icon:'⚽', label:'Football', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'155'},
    {k:'poste',t:'select1',lab:'Poste',opts:['Gardien','Défenseur','Milieu','Attaquant']},
    {k:'buts',t:'num',lab:'Buts marqués',ph:'0'},
    {k:'passes_d',t:'num',lab:'Passes décisives',ph:'0'},
    {k:'distance',t:'num',lab:'Distance parcourue (km)',ph:'9',step:0.1},
    {k:'sprints',t:'num',lab:'Nb de sprints',ph:'18'},
    {k:'surface',t:'select1',lab:'Surface',opts:['Herbe','Synthétique','Salle','Stabilisé']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  basket:  { icon:'🏀', label:'Basket / hand / volley', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'40'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'},
    {k:'discipline',t:'select1',lab:'Discipline',opts:['Basket','Handball','Volley']},
    {k:'poste',t:'text',lab:'Poste',ph:'Meneur, ailier…'},
    {k:'points',t:'num',lab:'Points marqués',ph:'12'},
    {k:'passes_d',t:'num',lab:'Passes décisives',ph:'4'},
    {k:'rebonds',t:'num',lab:'Rebonds / blocs',ph:'6'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  rugby:   { icon:'🏉', label:'Rugby', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'80'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'160'},
    {k:'poste',t:'select1',lab:'Poste',opts:['Première ligne','Deuxième ligne','Troisième ligne','Demi','Centre','Aile','Arrière']},
    {k:'essais',t:'num',lab:'Essais marqués',ph:'0'},
    {k:'plaquages',t:'num',lab:'Plaquages',ph:'12'},
    {k:'contacts',t:'select1',lab:'Contacts',opts:['Sans contact','Touché','Contact complet']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'8'}
  ]},
  raquette:{ icon:'🎾', label:'Tennis / padel / badminton', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'60'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'sets',t:'num',lab:'Nb sets',ph:'3'},
    {k:'discipline',t:'select1',lab:'Discipline',opts:['Tennis','Padel','Badminton','Squash']},
    {k:'resultat',t:'select1',lab:'Résultat',opts:['Victoire','Défaite','Non joué']},
    {k:'score',t:'text',lab:'Score',ph:'6-4 3-6 7-5'},
    {k:'surface',t:'select1',lab:'Surface',opts:['Dur','Terre battue','Gazon','Salle','Moquette']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  pingpong:{ icon:'🏓', label:'Tennis de table', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'45'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'sets',t:'num',lab:'Nb sets',ph:'5'},
    {k:'resultat',t:'select1',lab:'Résultat',opts:['Victoire','Défaite','Non joué']},
    {k:'score',t:'text',lab:'Score',ph:'11-7 9-11 11-5'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'5'}
  ]},
  frisbee: { icon:'🥏', label:'Ultimate / frisbee', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'60'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'points',t:'num',lab:'Points marqués',ph:'3'},
    {k:'distance',t:'num',lab:'Distance parcourue (km)',ph:'6',step:0.1},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  combat:  { icon:'🥋', label:'Sports de combat', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Technique','Sparring','Compétition']},
    {k:'intensite',t:'select1',lab:'Intensité',opts:['Légère','Modérée','Intense']},
    {k:'discipline',t:'select1',lab:'Discipline',opts:['Judo','Boxe','MMA','Lutte','Karaté','Jiu-jitsu','Muay-thaï','Autre']},
    {k:'rounds',t:'num',lab:'Nb de rounds / combats',ph:'5'},
    {k:'partenaires',t:'num',lab:'Nb de partenaires',ph:'3'},
    {k:'coups_tete',t:'bool',lab:'Chocs à la tête ?'},
    {k:'poids',t:'num',lab:'Poids de pesée (kg)',ph:'',step:0.1},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'8'}
  ]},
  escrime: { icon:'🤺', label:'Escrime', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Technique','Assaut','Compétition']},
    {k:'touches',t:'num',lab:'Touches (optionnel)',ph:''},
    {k:'arme',t:'select1',lab:'Arme',opts:['Fleuret','Épée','Sabre']},
    {k:'assauts',t:'num',lab:'Nb d’assauts',ph:'8'},
    {k:'victoires',t:'num',lab:'Assauts gagnés',ph:'5'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  lancers: { icon:'🥏', label:'Lancers', fields:[
    {k:'nb_lancers',t:'num',lab:'Nb lancers',ph:'20'},
    {k:'meilleure_perf',t:'num',lab:'Meilleure perf. (m)',ph:'',step:0.01},
    {k:'engin',t:'select1',lab:'Engin',opts:['Poids','Disque','Javelot','Marteau']},
    {k:'poids_engin',t:'num',lab:'Poids de l’engin (kg)',ph:'7.26',step:0.01},
    {k:'moyenne_perf',t:'num',lab:'Moyenne des essais (m)',ph:'',step:0.01},
    {k:'essais_valides',t:'num',lab:'Essais valides',ph:'16'},
    {k:'vent',t:'text',lab:'Vent',ph:'+1,2 m/s'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  saut:    { icon:'🦘', label:'Sauts (longueur / hauteur)', fields:[
    {k:'nb_sauts',t:'num',lab:'Nb sauts',ph:'12'},
    {k:'meilleure_perf',t:'num',lab:'Meilleure perf. (m)',ph:'',step:0.01},
    {k:'type',t:'select1',lab:'Type',opts:['Longueur','Hauteur','Triple saut']},
    {k:'elan',t:'num',lab:'Longueur d’élan (foulées)',ph:'16'},
    {k:'essais_valides',t:'num',lab:'Essais valides',ph:'9'},
    {k:'vent',t:'text',lab:'Vent',ph:'+0,8 m/s'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  ski:     { icon:'⛷️', label:'Ski / snowboard', fields:[
    {k:'duree',t:'text',lab:'Durée sur les pistes',ph:'3h30'},
    {k:'descentes',t:'num',lab:'Nb descentes',ph:'8'},
    {k:'denivele',t:'num',lab:'Dénivelé cumulé (m)',ph:'2400'},
    {k:'niveau',t:'select1',lab:'Niveau pistes',opts:['Vert/bleu','Rouge','Noire','Hors-piste']},
    {k:'chute',t:'bool',lab:'Chute(s) ?'},
    {k:'discipline',t:'select1',lab:'Discipline',opts:['Ski alpin','Snowboard','Ski de fond','Ski de rando','Freestyle']},
    {k:'neige',t:'select1',lab:'État de la neige',opts:['Poudreuse','Damée','Dure','Soupe','Verglacée']},
    {k:'vitesse_max',t:'num',lab:'Vitesse max (km/h)',ph:'72',step:0.1},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  skate:   { icon:'🛼', label:'Skate / roller', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Street','Park','Roller','Cruising']},
    {k:'chute',t:'bool',lab:'Chute(s) ?'},
    {k:'tricks',t:'text',lab:'Figures travaillées',ph:'Ollie, kickflip…'},
    {k:'protections',t:'bool',lab:'Protections portées ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'5'}
  ]},
  trampoline:{ icon:'🤸', label:'Trampoline / acrobatie', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Loisir','Figures','Acrobatie']},
    {k:'figures',t:'text',lab:'Figures travaillées',ph:'Salto avant, vrille…'},
    {k:'series',t:'num',lab:'Nb de séries',ph:'10'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  golf:    { icon:'⛳', label:'Golf', fields:[
    {k:'trous',t:'num',lab:'Nb trous',ph:'18'},
    {k:'type',t:'select1',lab:'Type',opts:['Practice','Parcours']},
    {k:'score',t:'num',lab:'Score total',ph:'92'},
    {k:'putts',t:'num',lab:'Nb de putts',ph:'34'},
    {k:'fairways',t:'num',lab:'Fairways touchés',ph:'8'},
    {k:'marche',t:'bool',lab:'Parcours à pied ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'4'}
  ]},
  tir:     { icon:'🎯', label:"Tir à l'arc / tir", fields:[
    {k:'nb_tirs',t:'num',lab:'Nb tirs',ph:'30'},
    {k:'type',t:'select1',lab:'Type',opts:['Arc','Tir sportif']},
    {k:'distance',t:'num',lab:'Distance (m)',ph:'18'},
    {k:'score',t:'num',lab:'Score total',ph:'268'},
    {k:'volees',t:'num',lab:'Nb de volées',ph:'10'},
    {k:'lieu',t:'select1',lab:'Lieu',opts:['Intérieur','Extérieur']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'3'}
  ]},
  petanque:{ icon:'🎯', label:'Pétanque / bowling', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'parties',t:'num',lab:'Nb parties',ph:'3'},
    {k:'type',t:'select1',lab:'Type',opts:['Pétanque','Bowling']},
    {k:'gagnees',t:'num',lab:'Parties gagnées',ph:'2'},
    {k:'score',t:'num',lab:'Meilleur score',ph:'13'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'2'}
  ]},
  danse:   { icon:'💃', label:'Danse', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'style',t:'text',lab:'Style',ph:'Salsa, hip-hop…'},
    {k:'intensite',t:'select1',lab:'Intensité',opts:['Légère','Modérée','Intense']},
    {k:'type',t:'select1',lab:'Type',opts:['Cours','Répétition','Représentation','Libre']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'135'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]},
  yoga:    { icon:'🧘', label:'Yoga / Pilates', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'style',t:'select1',lab:'Style',opts:['Hatha','Vinyasa','Yin','Ashtanga','Pilates','Autre']},
    {k:'niveau',t:'select1',lab:'Niveau',opts:['Débutant','Intermédiaire','Avancé']},
    {k:'focus',t:'pills',lab:'Zones travaillées',opts:['Hanches','Dos','Épaules','Ischios','Équilibre','Respiration']},
    {k:'guide',t:'bool',lab:'Séance guidée ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'3'}
  ]},
  equitation:{ icon:'🐴', label:'Équitation', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Dressage','Obstacle','Extérieur','Balade','Cross']},
    {k:'allures',t:'pills',lab:'Allures travaillées',opts:['Pas','Trot','Galop','Saut']},
    {k:'obstacles',t:'num',lab:'Hauteur des obstacles (cm)',ph:'90'},
    {k:'cheval',t:'text',lab:'Cheval monté',ph:'Nom'},
    {k:'chute',t:'bool',lab:'Chute ?'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'5'}
  ]},
  crossfit:{ icon:'🏋️', label:'Cross-training', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['WOD','Force','Endurance','Gymnastique']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'},
    {k:'wod',t:'text',lab:'Nom du WOD',ph:'Fran, Murph…'},
    {k:'format',t:'select1',lab:'Format',opts:['For time','AMRAP','EMOM','Tabata','Chipper']},
    {k:'resultat',t:'text',lab:'Résultat',ph:'8:42 ou 5 tours + 12'},
    {k:'rx',t:'bool',lab:'Fait en Rx ?'}
  ]},
  gym:     { icon:'🤸', label:'Gymnastique', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'type',t:'select1',lab:'Type',opts:['Sol','Agrès','Souplesse']},
    {k:'agres',t:'pills',lab:'Agrès travaillés',opts:['Sol','Barres','Poutre','Saut','Anneaux','Arçons','Barre fixe']},
    {k:'figures',t:'text',lab:'Éléments travaillés',ph:'ATR, salto arrière…'},
    {k:'series',t:'num',lab:'Nb de passages',ph:'8'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  callisthenie:{ icon:'🤸', label:'Callisthénie / street workout', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Statique','Dynamique','Force']},
    {k:'figures',t:'text',lab:'Figures travaillées',ph:'Muscle-up, front lever…'},
    {k:'lest',t:'num',lab:'Lest utilisé (kg)',ph:'10',step:0.5},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'8'}
  ]},
  halterophilie:{ icon:'🏋️', label:'Haltérophilie', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h15'},
    {k:'mouvement',t:'select1',lab:'Mouvement principal',opts:['Arraché','Épaulé-jeté','Squat','Autre']},
    {k:'charge_max',t:'num',lab:'Charge max (kg)',ph:'80'},
    {k:'total',t:'num',lab:'Total arraché + épaulé-jeté (kg)',ph:'180'},
    {k:'reussite',t:'text',lab:'Réussite',ph:'8/12 barres'},
    {k:'technique',t:'select1',lab:'Sensation technique',opts:['Approximative','Correcte','Propre']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'8'}
  ]},
  fitness: { icon:'💪', label:'Renfo général', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Cardio','Renfo','Mixte','Circuit']},
    {k:'zones',t:'pills',lab:'Zones travaillées',opts:['Haut du corps','Bas du corps','Tronc','Corps entier']},
    {k:'circuits',t:'num',lab:'Nb de circuits / tours',ph:'4'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'140'},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'6'}
  ]}
};
