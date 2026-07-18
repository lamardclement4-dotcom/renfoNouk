// ============================================================
// Données de planification — champs spécifiques par sport et
// bibliothèque d'exercices de musculation, portées telles quelles
// depuis l'ancienne app (schéma déclaratif, rendu générique dans
// PlannerSpace.jsx).
// ============================================================

export const EXERCISES_DB = {
  'Pectoraux':   ['Développé couché','Développé incliné','Développé décliné','Dips','Écartés haltères','Pompes'],
  'Dos':         ['Tractions','Tirage vertical','Rowing barre','Rowing haltère','Tirage horizontal','Pull-over'],
  'Épaules':     ['Développé militaire','Arnold Press','Élévations latérales','Oiseau'],
  'Biceps':      ['Curl barre','Curl marteau','Curl incliné'],
  'Triceps':     ['Barre front','Extensions poulie','Dips triceps'],
  'Abdominaux':  ['Crunch','Gainage','Hollow Hold','Relevés de jambes'],
  'Lombaires':   ['Extensions lombaires','Good Morning','Superman'],
  'Quadriceps':  ['Squat','Front Squat','Presse','Fentes'],
  'Ischio-jamb.':['Soulevé de terre jambes tendues','Leg Curl','Nordic Curl'],
  'Fessiers':    ['Hip Thrust','Glute Bridge','Fentes bulgares'],
  'Mollets':     ['Mollets debout','Mollets assis','Sauts à la corde'],
};
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
