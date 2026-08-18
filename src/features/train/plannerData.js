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

export const SPORT_FIELDS = {
  demi:    { icon:'🏃', label:'Demi-fond', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'5',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'18:30'},
    {k:'allure',t:'auto-allure',lab:'Allure (auto)'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'165'}
  ]},
  fond:    { icon:'🏃', label:'Fond / marathon', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'21',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'95:00'},
    {k:'allure',t:'auto-allure',lab:'Allure (auto)'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'}
  ]},
  marche:  { icon:'🥾', label:'Marche / randonnée', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'12',step:0.1},
    {k:'duree',t:'text',lab:'Durée',ph:'3h20'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'450'},
    {k:'terrain',t:'select1',lab:'Terrain',opts:['Plat','Vallonné','Montagne']}
  ]},
  velo:    { icon:'🚴', label:'Vélo / cyclisme', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'45',step:0.1},
    {k:'temps',t:'time',lab:'Temps (hh:mm)',ph:'1:35'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'600'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'140'},
    {k:'type',t:'select1',lab:'Type',opts:['Route','VTT','Home-trainer']}
  ]},
  vtt:     { icon:'🚵', label:'VTT', fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'30',step:0.1},
    {k:'temps',t:'time',lab:'Temps (hh:mm)',ph:'2:00'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'800'},
    {k:'difficulte',t:'select1',lab:'Difficulté',opts:['Facile','Technique','Très technique']}
  ]},
  aviron:  { icon:'🚣', label:'Aviron / kayak', fields:[
    {k:'distance',t:'num',lab:'Distance (m)',ph:'5000'},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'25:00'},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'155'},
    {k:'type',t:'select1',lab:'Lieu',opts:['Mer','Rivière','Bassin']}
  ]},
  patinage:{ icon:'⛸️', label:'Patinage / hockey', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'distance',t:'num',lab:'Distance (km, si vitesse)',ph:''},
    {k:'type',t:'select1',lab:'Type',opts:['Patinage','Hockey']}
  ]},
  orientation:{ icon:'🧭', label:"Course d'orientation", fields:[
    {k:'distance',t:'num',lab:'Distance (km)',ph:'8',step:0.1},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'55:00'},
    {k:'denivele',t:'num',lab:'Dénivelé+ (m)',ph:'200'},
    {k:'difficulte',t:'select1',lab:'Difficulté carte',opts:['Facile','Moyen','Difficile']}
  ]},
  triathlon:{ icon:'🏆', label:'Triathlon', fields:[
    {k:'nage',t:'num',lab:'Natation (m)',ph:'1500'},
    {k:'velo',t:'num',lab:'Vélo (km)',ph:'40',step:0.1},
    {k:'course',t:'num',lab:'Course (km)',ph:'10',step:0.1},
    {k:'temps_total',t:'time',lab:'Temps total (hh:mm)',ph:'2:30'}
  ]},
  natation:{ icon:'🏊', label:'Natation', fields:[
    {k:'distance',t:'num',lab:'Distance totale (m)',ph:'2000'},
    {k:'temps',t:'time',lab:'Temps (mm:ss)',ph:'38:00'},
    {k:'longueurs',t:'num',lab:'Nb longueurs',ph:'40'},
    {k:'bassin',t:'select1',lab:'Bassin (m)',opts:['25','50']},
    {k:'nages',t:'pills',lab:'Nages travaillées',opts:['Crawl','Brasse','Dos','Papillon']}
  ]},
  surf:    { icon:'🏄', label:'Surf / paddle', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'vagues',t:'num',lab:'Nb vagues prises',ph:'12'},
    {k:'conditions',t:'select1',lab:'Conditions',opts:['Petites','Moyennes','Grosses']}
  ]},
  voile:   { icon:'⛵', label:'Voile / planche', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'2h00'},
    {k:'vent',t:'select1',lab:'Vent',opts:['Léger','Modéré','Fort']}
  ]},
  plongee: { icon:'🤿', label:'Plongée / apnée', fields:[
    {k:'profondeur',t:'num',lab:'Profondeur max (m)',ph:'18'},
    {k:'duree',t:'text',lab:'Durée immersion',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Apnée','Bouteille']}
  ]},
  football:{ icon:'⚽', label:'Football', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'155'}
  ]},
  basket:  { icon:'🏀', label:'Basket / hand / volley', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'40'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'150'}
  ]},
  rugby:   { icon:'🏉', label:'Rugby', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'80'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'fc',t:'num',lab:'FC moy. (bpm)',ph:'160'}
  ]},
  raquette:{ icon:'🎾', label:'Tennis / padel / badminton', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'60'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'sets',t:'num',lab:'Nb sets',ph:'3'}
  ]},
  pingpong:{ icon:'🏓', label:'Tennis de table', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'45'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']},
    {k:'sets',t:'num',lab:'Nb sets',ph:'5'}
  ]},
  frisbee: { icon:'🥏', label:'Ultimate / frisbee', fields:[
    {k:'duree',t:'num',lab:'Durée jouée (min)',ph:'60'},
    {k:'type',t:'select1',lab:'Type',opts:['Match','Entraînement']}
  ]},
  combat:  { icon:'🥋', label:'Sports de combat', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Technique','Sparring','Compétition']},
    {k:'intensite',t:'select1',lab:'Intensité',opts:['Légère','Modérée','Intense']}
  ]},
  escrime: { icon:'🤺', label:'Escrime', fields:[
    {k:'duree',t:'num',lab:'Durée (min)',ph:'90'},
    {k:'type',t:'select1',lab:'Type',opts:['Technique','Assaut','Compétition']},
    {k:'touches',t:'num',lab:'Touches (optionnel)',ph:''}
  ]},
  lancers: { icon:'🥏', label:'Lancers', fields:[
    {k:'nb_lancers',t:'num',lab:'Nb lancers',ph:'20'},
    {k:'meilleure_perf',t:'num',lab:'Meilleure perf. (m)',ph:'',step:0.01},
    {k:'engin',t:'select1',lab:'Engin',opts:['Poids','Disque','Javelot','Marteau']}
  ]},
  saut:    { icon:'🦘', label:'Sauts (longueur / hauteur)', fields:[
    {k:'nb_sauts',t:'num',lab:'Nb sauts',ph:'12'},
    {k:'meilleure_perf',t:'num',lab:'Meilleure perf. (m)',ph:'',step:0.01},
    {k:'type',t:'select1',lab:'Type',opts:['Longueur','Hauteur','Triple saut']}
  ]},
  ski:     { icon:'⛷️', label:'Ski / snowboard', fields:[
    {k:'duree',t:'text',lab:'Durée sur les pistes',ph:'3h30'},
    {k:'descentes',t:'num',lab:'Nb descentes',ph:'8'},
    {k:'denivele',t:'num',lab:'Dénivelé cumulé (m)',ph:'2400'},
    {k:'niveau',t:'select1',lab:'Niveau pistes',opts:['Vert/bleu','Rouge','Noire']},
    {k:'chute',t:'bool',lab:'Chute(s) ?'}
  ]},
  skate:   { icon:'🛼', label:'Skate / roller', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Street','Park','Roller']},
    {k:'chute',t:'bool',lab:'Chute(s) ?'}
  ]},
  trampoline:{ icon:'🤸', label:'Trampoline / acrobatie', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Loisir','Figures','Acrobatie']}
  ]},
  golf:    { icon:'⛳', label:'Golf', fields:[
    {k:'trous',t:'num',lab:'Nb trous',ph:'18'},
    {k:'type',t:'select1',lab:'Type',opts:['Practice','Parcours']}
  ]},
  tir:     { icon:'🎯', label:"Tir à l'arc / tir", fields:[
    {k:'nb_tirs',t:'num',lab:'Nb tirs',ph:'30'},
    {k:'type',t:'select1',lab:'Type',opts:['Arc','Tir sportif']},
    {k:'distance',t:'num',lab:'Distance (m)',ph:'18'}
  ]},
  petanque:{ icon:'🎯', label:'Pétanque / bowling', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'parties',t:'num',lab:'Nb parties',ph:'3'},
    {k:'type',t:'select1',lab:'Type',opts:['Pétanque','Bowling']}
  ]},
  danse:   { icon:'💃', label:'Danse', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'style',t:'text',lab:'Style',ph:'Salsa, hip-hop…'},
    {k:'intensite',t:'select1',lab:'Intensité',opts:['Légère','Modérée','Intense']}
  ]},
  yoga:    { icon:'🧘', label:'Yoga / Pilates', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'style',t:'select1',lab:'Style',opts:['Hatha','Vinyasa','Yin','Pilates','Autre']}
  ]},
  equitation:{ icon:'🐴', label:'Équitation', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Dressage','Obstacle','Extérieur','Balade']}
  ]},
  crossfit:{ icon:'🏋️', label:'Cross-training', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['WOD','Force','Endurance']},
    {k:'rpe',t:'num',lab:'Intensité ressentie (RPE 1-10)',ph:'7'}
  ]},
  gym:     { icon:'🤸', label:'Gymnastique', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h30'},
    {k:'type',t:'select1',lab:'Type',opts:['Sol','Agrès','Souplesse']}
  ]},
  callisthenie:{ icon:'🤸', label:'Callisthénie / street workout', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h00'},
    {k:'type',t:'select1',lab:'Type',opts:['Statique','Dynamique','Force']}
  ]},
  halterophilie:{ icon:'🏋️', label:'Haltérophilie', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'1h15'},
    {k:'mouvement',t:'select1',lab:'Mouvement principal',opts:['Arraché','Épaulé-jeté','Squat','Autre']},
    {k:'charge_max',t:'num',lab:'Charge max (kg)',ph:'80'}
  ]},
  fitness: { icon:'💪', label:'Renfo général', fields:[
    {k:'duree',t:'text',lab:'Durée',ph:'45min'},
    {k:'type',t:'select1',lab:'Type',opts:['Cardio','Renfo','Mixte']}
  ]}
};
