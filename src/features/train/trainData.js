import { MODULE_TINTS } from '../health/kit'

export { MODULE_TINTS }

export const CATS = {
  mobilite: { id: "mobilite", label: "Mobilité", tint: "var(--ch2)" },
  renfo: { id: "renfo", label: "Renforcement", tint: "var(--ch1)" },
  fullbody: { id: "fullbody", label: "Full body", tint: "var(--ch1)" },
  plyo: { id: "plyo", label: "Pliométrie", tint: "var(--ch1)" }
}

export const SUBCATS = {"mobilite": ["Cou & haut du corps", "Épaules & bras (élastique)", "Colonne & tronc", "Hanches & bassin", "Jambes & chevilles", "Mur, appuis & intégration", "Mobilité mixte / Flow", "Récupération & relâchement"], "etir": ["Cou & épaules", "Colonne & tronc", "Hanches & bassin", "Jambes, genoux & chevilles", "Bras, poignets & mains", "Étirements globaux & flows"], "renfo": ["Jambes & fessiers", "Dos & tronc", "Pectoraux & épaules", "Dos, tirage & bras", "Mollets, avant-bras & stabilité"], "plyo": ["Appuis & initiation", "Puissance jambes", "Réactivité & latéral", "Avancé / contrebas", "Haut du corps & tronc"], "fullbody": ["Circuits corps entier"]}

const DEFAULT_SUB = { mobilite: SUBCATS.mobilite[0], renfo: SUBCATS.renfo[0], plyo: SUBCATS.plyo[0], fullbody: SUBCATS.fullbody[0] }

export const EX = {
  rest: { name: "R\u00e9cup\u00e9ration", cue: "Respire calmement, secoue les jambes si besoin. Reste debout ou marche doucement \u2014 ne t\u2019assieds pas pour garder les muscles activ\u00e9s.", side: false, type: "hold", secs: 18, isRest: true },
  // mobilité / étirements
  chatVache: { name: "Chat-vache", cue: "\xC0 quatre pattes, mains sous les \xE9paules. Inspire en creusant le dos et en levant la t\xEAte, puis expire en arrondissant le dos et en rentrant le menton.", side: false, type: "hold", secs: 45, muscles: "Colonne vert\xE9brale", benefit: "Mobilise toute la colonne en flexion-extension.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  fente: { name: "Fente basse", cue: "Grand pas en avant, genou arri\xE8re au sol. Pousse doucement le bassin vers l\u2019avant, buste droit, pour \xE9tirer l\u2019avant de la cuisse et le psoas.", muscles: "Flechisseurs de hanche, quadriceps", side: true, type: "hold", secs: 40, cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  ischio: { name: "\xC9tirement ischios", cue: "Debout, jambes tendues. Penche-toi depuis les hanches en gardant le dos long, descends les mains vers les tibias sans forcer ni arrondir le dos.", muscles: "Ischios", side: false, type: "hold", secs: 45, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  pigeon: { name: "Pigeon", cue: "Jambe avant pli\xE9e au sol, jambe arri\xE8re tendue derri\xE8re toi. Rel\xE2che le poids de la hanche vers le sol, puis penche lentement le buste vers l\u2019avant.", side: true, type: "hold", secs: 50, muscles: "Fessiers, rotateurs de hanche", benefit: "Rel\xE2che la fesse et l\u2019ext\xE9rieur de la hanche.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  rotThorax: { name: "Rotation thoracique", cue: "\xC0 quatre pattes, une main derri\xE8re la t\xEAte. Ouvre le coude vers le plafond en suivant ta main du regard, puis reviens vers le sol en contr\xF4lant.", side: true, type: "hold", secs: 35, muscles: "Colonne thoracique", benefit: "Am\xE9liore la rotation du tronc (course, raquettes).", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  coup: { name: "\xC9tirement nuque", cue: "Assis ou debout, \xE9paules basses et rel\xE2ch\xE9es. Incline lentement la t\xEAte sur le c\xF4t\xE9, oreille vers l\u2019\xE9paule, jusqu\u2019\xE0 sentir l\u2019\xE9tirement le long du cou.", muscles: "Trapeze, nuque", side: true, type: "hold", secs: 30, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  cheville: { name: "Mobilit\xE9 cheville", cue: "En position de fente, avance le genou par-dessus les orteils sans d\xE9coller le talon. Reviens, puis r\xE9p\xE8te avec un mouvement souple et r\xE9gulier.", side: true, type: "hold", secs: 35, muscles: "Mollets, cheville", benefit: "Am\xE9liore la flexion de cheville, cl\xE9 pour la course et le squat.", cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  // renforcement
  gainage: { name: "Gainage", cue: "Sur les avant-bras, coudes sous les \xE9paules. Garde le corps en ligne droite des talons \xE0 la t\xEAte, abdos et fessiers serr\xE9s, sans creuser le bas du dos.", muscles: "Abdominaux, lombaires", side: false, type: "hold", secs: 40, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  pompes: { name: "Pompes", cue: "Mains un peu plus larges que les \xE9paules. Descends la poitrine en gardant les coudes \xE0 45\xB0, puis pousse pour remonter en gardant le corps gain\xE9.", muscles: "Pectoraux, triceps, epaules", side: false, type: "reps", reps: 12, cat: "renfo" , sub: "Pectoraux & épaules", niveau: "Intermédiaire" },
  squat: { name: "Squats", cue: "Pieds largeur d\u2019\xE9paules. Descends en poussant les fessiers vers l\u2019arri\xE8re, genoux dans l\u2019axe des pieds, poids dans les talons et dos droit.", muscles: "Quadriceps, fessiers", side: false, type: "reps", reps: 15, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  fentesA: { name: "Fentes altern\xE9es", cue: "Grand pas en avant, descends jusqu\u2019\xE0 ce que le genou arri\xE8re fr\xF4le le sol. Pousse sur la jambe avant pour revenir, puis alterne les c\xF4t\xE9s.", muscles: "Quadriceps, fessiers", side: false, type: "reps", reps: 16, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  pont: { name: "Pont fessier", cue: "Allong\xE9 sur le dos, genoux pli\xE9s, pieds \xE0 plat. Pousse dans les talons pour lever le bassin, serre les fessiers en haut, puis redescends lentement.", muscles: "Fessiers, ischios", side: false, type: "reps", reps: 15, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  superman: { name: "Superman", cue: "Allong\xE9 sur le ventre, bras tendus devant. D\xE9colle en m\xEAme temps les bras, la poitrine et les jambes, regard vers le sol, puis rel\xE2che en douceur.", muscles: "Lombaires, fessiers", side: false, type: "hold", secs: 35, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  mountain: { name: "Mountain climbers", cue: "En position de gainage, ram\xE8ne un genou vers la poitrine puis alterne rapidement. Garde le bassin stable et les \xE9paules au-dessus des mains.", muscles: "Abdominaux, epaules", side: false, type: "hold", secs: 30, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  dips: { name: "Dips sur chaise", cue: "Mains pos\xE9es derri\xE8re toi sur la chaise. Fl\xE9chis les coudes vers l\u2019arri\xE8re pour descendre le bassin, \xE9paules basses, puis pousse pour remonter.", muscles: "Triceps, pectoraux", side: false, type: "reps", reps: 12, cat: "renfo" , sub: "Pectoraux & épaules", niveau: "Intermédiaire" },
  // --- Pliométrie (doc) ---
  corde: { name: "Corde \xE0 sauter", cue: "Rebonds bas et rapides sur l\u2019avant des pieds, genoux peu fl\xE9chis, les poignets tournent la corde.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 40, cat: "plyo" , sub: "Appuis & initiation", niveau: "Intermédiaire" },
  pogo: { name: "Pogo jumps", cue: "Petits sauts verticaux sur place, jambes quasi tendues : tout le rebond vient de la cheville, contact au sol minimal.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 25, cat: "plyo" , sub: "Appuis & initiation", niveau: "Intermédiaire" },
  ankleHops: { name: "Ankle hops", cue: "Petits bonds verticaux, pousse uniquement avec les chevilles et atterris en silence.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Appuis & initiation", niveau: "Intermédiaire" },
  askip: { name: "A-skips", cue: "Skipping o\xF9 tu montes un genou haut \xE0 chaque rebond, bras synchronis\xE9s, appui dynamique sur l\u2019avant du pied.", muscles: "Quadriceps, mollets", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  lineHops: { name: "Line hops avant/arri\xE8re", cue: "Saute par-dessus une ligne au sol, d\u2019avant en arri\xE8re, le plus vite possible, pieds joints.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Appuis & initiation", niveau: "Intermédiaire" },
  latLineHops: { name: "Lateral line hops", cue: "M\xEAmes sauts de gauche \xE0 droite par-dessus la ligne, pieds joints.", muscles: "Mollets, adducteurs", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  highKnees: { name: "High knees", cue: "Monte les genoux haut \xE0 cadence rapide, appuis sur l\u2019avant des pieds, sans claquer les talons.", muscles: "Flechisseurs de hanche, mollets", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Appuis & initiation", niveau: "Intermédiaire" },
  squatJump: { name: "Squat jump", cue: "Descends en demi-squat puis saute verticalement, bras qui accompagnent, r\xE9ception souple genoux dans l\u2019axe.", muscles: "Quadriceps, fessiers", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  cmJump: { name: "Counter-movement jump", cue: "Flexion rapide puis saut maximal imm\xE9diat, sans temps d\u2019arr\xEAt en bas, pour exploiter l\u2019\xE9lasticit\xE9.", muscles: "Quadriceps, fessiers", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  broadJump: { name: "Broad jump (saut en longueur)", cue: "Saut vers l\u2019avant \xE0 deux pieds, bras qui balancent, r\xE9ception amortie et stable sans repartir aussit\xF4t.", muscles: "Quadriceps, fessiers", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  boxJumpLow: { name: "Box jump bas", cue: "Saut sur un step bas, r\xE9ception genoux fl\xE9chis amortie, et redescends en marchant (jamais en sautant).", muscles: "Quadriceps, fessiers", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  stepUpExpl: { name: "Step-up explosif", cue: "Un pied sur le step, monte de fa\xE7on explosive en projetant le genou oppos\xE9, puis redescends contr\xF4l\xE9.", muscles: "Quadriceps, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  jumpLunge: { name: "Jumping lunge (fentes saut\xE9es)", cue: "Depuis une fente, saute et change de jambe en l\u2019air, r\xE9ception amortie genou arri\xE8re vers le bas.", muscles: "Quadriceps, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  skater: { name: "Skater jumps", cue: "Bond lat\xE9ral d\u2019un pied sur l\u2019autre, l\u2019autre jambe passe derri\xE8re, r\xE9ception stable sur une jambe.", muscles: "Adducteurs, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  latBound: { name: "Lateral bound", cue: "Pousse fort sur une jambe pour bondir loin sur le c\xF4t\xE9, puis tiens 1\u20132 s la r\xE9ception sur l\u2019autre jambe.", muscles: "Adducteurs, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  bounding: { name: "Bounding (foul\xE9es bondissantes)", cue: "Grandes foul\xE9es rebondissantes en avan\xE7ant, pouss\xE9e compl\xE8te, suspension marqu\xE9e, bras amples.", muscles: "Ischios, fessiers", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  slHop: { name: "Single-leg hop", cue: "Petits sauts verticaux sur une jambe, r\xE9ception silencieuse et align\xE9e, genou dans l\u2019axe.", muscles: "Mollets, quadriceps", side: true, type: "hold", secs: 25, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  quadrantHops: { name: "Quadrant hops (croix)", cue: "Imagine une croix au sol et saute en rythme dans les 4 cases selon un sch\xE9ma, pieds joints.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 20, cat: "plyo" , sub: "Réactivité & latéral", niveau: "Intermédiaire" },
  boxJumpMid: { name: "Box jump moyen", cue: "Box plus haut, focus sur une r\xE9ception \xAB coll\xE9e \xBB et silencieuse en haut.", muscles: "Quadriceps, fessiers", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Puissance jambes", niveau: "Intermédiaire" },
  depthJump: { name: "Depth jump (contrebas)", cue: "Descends d\u2019un step sans sauter et, d\xE8s le contact au sol, rebondis verticalement le plus vite possible.", muscles: "Quadriceps, mollets", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  dropJump: { name: "Drop jump + rebonds", cue: "Comme le depth jump mais encha\xEEne 2\u20133 rebonds r\xE9actifs \xE0 la suite.", muscles: "Quadriceps, mollets", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  slBoxJump: { name: "Single-leg box jump", cue: "Saut sur un box bas en poussant sur une seule jambe, r\xE9ception contr\xF4l\xE9e, redescente en marchant.", muscles: "Quadriceps, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  slLatBound: { name: "Single-leg lateral bound", cue: "Bond lat\xE9ral maximal sur une jambe, puis fige la r\xE9ception 2 s avant de repartir.", muscles: "Adducteurs, fessiers", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  hurdleHops: { name: "Hurdle hops", cue: "Encha\xEEne des sauts par-dessus de petits obstacles, contact au sol minimal entre chaque.", muscles: "Flechisseurs de hanche, mollets", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  slBounding: { name: "Single-leg bounding", cue: "Bonds successifs sur la m\xEAme jambe en avan\xE7ant, pouss\xE9e compl\xE8te (saut-cloche).", muscles: "Ischios, fessiers", side: true, type: "hold", secs: 25, cat: "plyo" , sub: "Avancé / contrebas", niveau: "Intermédiaire" },
  clapPush: { name: "Pompes claqu\xE9es", cue: "Pompe explosive o\xF9 les mains d\xE9collent (claque optionnelle), r\xE9ception coudes souples.", muscles: "Pectoraux, triceps", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Haut du corps & tronc", niveau: "Intermédiaire" },
  plyoPush: { name: "Plyo push-up sur step", cue: "Pompe explosive o\xF9 les mains montent sur un step puis redescendent au sol, en alternance.", muscles: "Pectoraux, triceps", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Haut du corps & tronc", niveau: "Intermédiaire" },
  mbSlam: { name: "Med ball slam", cue: "Ballon lev\xE9 au-dessus de la t\xEAte, projette-le au sol en gainant le tronc, ramasse et recommence.", muscles: "Abdominaux, epaules", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Haut du corps & tronc", niveau: "Intermédiaire" },
  mbChestPass: { name: "Med ball chest pass", cue: "Face au mur, pousse le ballon depuis la poitrine le plus vite possible, rattrape au rebond et recommence.", muscles: "Pectoraux, triceps", side: false, type: "hold", secs: 30, cat: "plyo" , sub: "Haut du corps & tronc", niveau: "Intermédiaire" },
  mbRotThrow: { name: "Med ball rotational throw", cue: "De profil au mur, lance le ballon en pivotant le tronc et les hanches, rattrape et recommence.", muscles: "Obliques, epaules", side: true, type: "hold", secs: 30, cat: "plyo" , sub: "Haut du corps & tronc", niveau: "Intermédiaire" },
  // --- Mobilité détaillée (doc) ---
  ankleCircles: { name: "Cercles de cheville", cue: "Pied d\xE9coll\xE9, grands cercles lents avec la pointe, amplitude maximale, genou immobile.", side: true, type: "hold", secs: 20, muscles: "Chevilles", benefit: "\xC9chauffe et lubrifie l\u2019articulation de la cheville.", cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  heelToe: { name: "Pointe-talon", cue: "Debout, bascule sur la pointe 2 s puis sur les talons pointes relev\xE9es 2 s.", muscles: "Mollets, cheville", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  ankleInv: { name: "Inversion / \xE9version", cue: "Roule l\u2019appui de l\u2019int\xE9rieur vers l\u2019ext\xE9rieur du pied et inversement, sans tordre l\u2019articulation.", muscles: "Cheville", side: true, type: "hold", secs: 25, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  deepSquatShift: { name: "Squat profond, report de poids", cue: "En squat complet, transf\xE8re le poids d\u2019un pied \xE0 l\u2019autre, avance/recule les genoux pour mobiliser la cheville en charge.", side: false, type: "hold", secs: 30, muscles: "Hanches, chevilles, adducteurs", benefit: "Pr\xE9pare la profondeur de squat et la mobilit\xE9 du bas du corps.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  alphabet: { name: "\xC9criture de l\u2019alphabet", cue: "Jambe tendue, \xAB \xE9cris \xBB l\u2019alphabet avec le gros orteil, la cheville seule bouge.", muscles: "Cheville", side: true, type: "hold", secs: 40, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  kneeFlexExt: { name: "Flexion-extension du genou", cue: "Assis, tends puis fl\xE9chis lentement le genou, maintien 2 s en extension.", muscles: "Quadriceps, genou", side: true, type: "hold", secs: 30, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  kneeCircles: { name: "Cercles de genou", cue: "Pieds joints, mains sur les genoux fl\xE9chis, cercles lents et contr\xF4l\xE9s.", muscles: "Quadriceps, mollets", side: false, type: "hold", secs: 20, cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  lungeOsc: { name: "Fente avec oscillation", cue: "En fente, oscille d\u2019avant en arri\xE8re pour fl\xE9chir progressivement le genou avant.", side: true, type: "hold", secs: 30, muscles: "Fl\xE9chisseurs de hanche, adducteurs", benefit: "Ouvre l\u2019avant de la hanche par oscillations contr\xF4l\xE9es.", cat: "mobilite" , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  nineNinety: { name: "90/90 hip switch", cue: "Assis jambes \xE0 90\xB0, bascule les genoux de l\u2019autre c\xF4t\xE9 sans les mains, dos droit.", side: true, type: "hold", secs: 40, muscles: "Rotateurs de hanche", benefit: "Gagne en rotation interne et externe de hanche.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  legSwingF: { name: "Leg swings avant/arri\xE8re", cue: "Appui au mur, balance la jambe tendue d\u2019avant en arri\xE8re, amplitude croissante, bassin stable.", side: true, type: "hold", secs: 20, muscles: "Ischios, fl\xE9chisseurs de hanche", benefit: "Mobilise la hanche en dynamique avant l\u2019effort.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  legSwingL: { name: "Leg swings lat\xE9raux", cue: "Face au mur, balance la jambe de gauche \xE0 droite devant le corps sans tourner le bassin.", muscles: "Adducteurs, fessiers", side: true, type: "hold", secs: 20, cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  hipCars: { name: "Hip CARs", cue: "L\xE8ve un genou \xE0 hauteur de hanche, ouvre vers l\u2019ext\xE9rieur, descends derri\xE8re, ram\xE8ne \u2014 un grand cercle lent sous tension.", side: true, type: "hold", secs: 40, muscles: "Hanche (globale)", benefit: "Entretient l\u2019amplitude active de la hanche.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  fireHydrant: { name: "Cercles de hanche (fire hydrant)", cue: "\xC0 quatre pattes, l\xE8ve un genou sur le c\xF4t\xE9 et dessine un grand cercle, bassin stable.", muscles: "Fessiers, hanche", side: true, type: "hold", secs: 30, cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  frog: { name: "Frog stretch (grenouille)", cue: "\xC0 quatre pattes, genoux \xE9cart\xE9s au maximum confortable, recule le bassin vers les talons, tibias parall\xE8les.", side: false, type: "hold", secs: 30, muscles: "Adducteurs, hanches", benefit: "Ouvre les hanches et \xE9tire l\u2019int\xE9rieur des cuisses.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  cossack: { name: "Cosaque squat", cue: "Pieds tr\xE8s \xE9cart\xE9s, transf\xE8re le poids sur une jambe fl\xE9chie, l\u2019autre tendue talon au sol, puis change.", side: true, type: "hold", secs: 40, muscles: "Adducteurs, quadriceps, chevilles", benefit: "Mobilit\xE9 lat\xE9rale des hanches et renfort des jambes.", cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  pelvicTilt: { name: "Bascules de bassin", cue: "Sur le dos genoux fl\xE9chis, alterne r\xE9troversion (dos plaqu\xE9) et ant\xE9version (petit creux), lent et conscient.", side: false, type: "hold", secs: 30, muscles: "Abdominaux, bas du dos", benefit: "Mobilise le bassin et soulage les lombaires.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  supineTwist: { name: "D\xE9rotation lombaire au sol", cue: "Sur le dos bras en croix, laisse tomber les genoux d\u2019un c\xF4t\xE9, regard \xE0 l\u2019oppos\xE9, \xE9paules au sol.", side: true, type: "hold", secs: 30, muscles: "Bas du dos, fessiers", benefit: "D\xE9tend les lombaires et rel\xE2che le dos.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  deadBug: { name: "Dead bug", cue: "Sur le dos bras et genoux au plafond, allonge bras + jambe oppos\xE9s en gardant le bas du dos coll\xE9 au sol.", muscles: "Abdominaux, transverse", side: true, type: "hold", secs: 40, cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" , same: "deadbug" },
  openBook: { name: "Open book (livre ouvert)", cue: "Sur le c\xF4t\xE9 genoux fl\xE9chis, ouvre le bras du dessus vers l\u2019arri\xE8re, regard qui suit, genoux coll\xE9s.", side: true, type: "hold", secs: 30, muscles: "Colonne thoracique, pectoraux", benefit: "Am\xE9liore la rotation du buste et ouvre la poitrine.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  threadNeedle: { name: "Thread the needle", cue: "\xC0 quatre pattes, passe un bras sous le corps puis ouvre-le vers le plafond, le regard qui suit.", side: true, type: "hold", secs: 30, muscles: "Colonne thoracique, \xE9paules", benefit: "Mobilise le haut du dos en rotation.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  tSpineRoll: { name: "Extension thoracique sur rouleau", cue: "Rouleau en travers sous le haut du dos, mains derri\xE8re la nuque, laisse le buste s\u2019\xE9tendre puis remonte.", side: false, type: "hold", secs: 30, muscles: "Colonne thoracique", benefit: "Redonne de l\u2019extension au haut du dos (posture).", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  sphinx: { name: "Sphinx / extension active", cue: "Sur le ventre appui sur les avant-bras, ouvre la poitrine vers l\u2019avant sans crisper le bas du dos.", side: false, type: "hold", secs: 30, muscles: "Colonne (extension), abdominaux", benefit: "R\xE9active l\u2019extension du dos, contre la position pench\xE9e.", cat: "mobilite" , sub: "Colonne & tronc", niveau: "Tous niveaux" },
  shoulderCircles: { name: "Cercles d\u2019\xE9paules", cue: "Bras le long du corps, grands cercles d\u2019\xE9paules, vers l\u2019avant puis vers l\u2019arri\xE8re.", side: false, type: "hold", secs: 20, muscles: "\u00c9paules", benefit: "\xC9chauffe et mobilise l\u2019articulation de l\u2019\xE9paule.", cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  passThrough: { name: "Dislocations \xE0 l\u2019\xE9lastique", cue: "\xC9lastique tenu large devant, monte au-dessus de la t\xEAte et passe derri\xE8re le dos bras tendus, puis reviens.", side: false, type: "hold", secs: 30, muscles: "\u00c9paules, pectoraux", benefit: "Gagne en amplitude d\u2019\xE9paule de fa\xE7on contr\xF4l\xE9e.", cat: "mobilite" , sub: "Épaules & bras (élastique)", niveau: "Tous niveaux" },
  shoulderCars: { name: "Shoulder CARs", cue: "Bras tendu, le plus grand cercle possible, lent et sous tension, tronc immobile.", muscles: "Epaules", side: true, type: "hold", secs: 40, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  wallSlides: { name: "Wall slides (gliss\xE9s au mur)", cue: "Dos au mur bras en \xAB poteau de but \xBB, glisse les avant-bras vers le haut en gardant poignets, coudes et dos au contact.", side: false, type: "hold", secs: 30, muscles: "\u00c9paules, haut du dos", benefit: "Am\xE9liore la mobilit\xE9 au-dessus de la t\xEAte (overhead).", cat: "mobilite" , sub: "Mur, appuis & intégration", niveau: "Tous niveaux" },
  ytw: { name: "YTW", cue: "Sur le ventre, dessine Y, T puis W avec les bras en les d\xE9collant l\xE9g\xE8rement, omoplates serr\xE9es.", side: false, type: "hold", secs: 40, muscles: "Trapeze, epaules", benefit: "Renforce et mobilise le haut du dos et les \xE9paules.", cat: "mobilite" , sub: "Épaules & bras (élastique)", niveau: "Tous niveaux" },
  pecStretch: { name: "\xC9tirement pectoral au coin", cue: "Avant-bras contre un montant, coude \xE0 hauteur d\u2019\xE9paule, avance le buste pour ouvrir la poitrine.", side: true, type: "hold", secs: 30, muscles: "Pectoraux", benefit: "Ouvre la poitrine et corrige les \xE9paules enroul\xE9es.", cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  extRotBand: { name: "Rotation externe \xE0 l\u2019\xE9lastique", cue: "Coude coll\xE9 au corps \xE0 90\xB0, \xE9lastique fix\xE9 devant, tourne l\u2019avant-bras vers l\u2019ext\xE9rieur, coude au flanc.", side: true, type: "hold", secs: 30, muscles: "Rotateurs externes (coiffe)", benefit: "Renforce la coiffe et stabilise l\u2019\xE9paule.", cat: "mobilite" , sub: "Épaules & bras (élastique)", niveau: "Tous niveaux" },
  crossBody: { name: "\xC9tirement delto\xEFde post\xE9rieur", cue: "Ram\xE8ne un bras tendu en travers de la poitrine, l\u2019autre main accompagne au coude.", side: true, type: "hold", secs: 30, muscles: "Epaules", benefit: "\xC9tire l\u2019arri\xE8re de l\u2019\xE9paule.", cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  wristCircles: { name: "Cercles et flexions de poignet", cue: "Cercles puis flexion/extension douce des poignets.", muscles: "Avant-bras, poignet", side: false, type: "hold", secs: 20, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  forearmStretch: { name: "\xC9tirement des avant-bras", cue: "Bras tendu devant, tire les doigts vers le bas puis vers le haut avec l\u2019autre main.", muscles: "Avant-bras", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  pronSup: { name: "Pronation / supination", cue: "Coude \xE0 90\xB0 coll\xE9 au flanc, tourne la paume vers le haut puis vers le bas.", muscles: "Avant-bras, poignet", side: true, type: "hold", secs: 20, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  chinTuck: { name: "R\xE9tractions cervicales", cue: "Rentre le menton vers l\u2019arri\xE8re (double menton) sans baisser la t\xEAte, tiens 3 s.", muscles: "Nuque, cervicales", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  upperTrap: { name: "\xC9tirement trap\xE8ze sup\xE9rieur", cue: "Assis, incline la t\xEAte \xE0 l\u2019oppos\xE9, l\u2019autre main accompagne l\xE9g\xE8rement le mouvement.", side: true, type: "hold", secs: 30, muscles: "Trap\xE8ze sup\xE9rieur, nuque", benefit: "Rel\xE2che les tensions de la nuque et des \xE9paules.", cat: "mobilite" , sub: "Cou & haut du corps", niveau: "Tous niveaux" },
  worldGreatest: { name: "World\u2019s greatest stretch", cue: "Depuis une fente profonde, main int\xE9rieure au sol, plonge le coude vers le sol, l\xE8ve le bras vers le plafond, puis tends la jambe avant.", side: true, type: "hold", secs: 40, muscles: "Hanches, ischios, thorax", benefit: "\xC9tirement global : hanche, ischios et rotation du dos.", cat: "mobilite" , sub: "Mobilité mixte / Flow", niveau: "Tous niveaux" },
  inchworm: { name: "Inchworm (chenille)", cue: "Debout mains au sol, marche en avant jusqu\u2019\xE0 la planche, pompe optionnelle, puis ram\xE8ne les pieds.", muscles: "Ischios, epaules", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Mobilité mixte / Flow", niveau: "Tous niveaux" },
  deepSquatHold: { name: "Squat profond tenu", cue: "Squat complet talons au sol, coudes qui poussent les genoux vers l\u2019ext\xE9rieur, dos long, tiens et respire.", muscles: "Quadriceps, cheville", side: false, type: "hold", secs: 45, cat: "mobilite" , sub: "Hanches & bassin", niveau: "Tous niveaux" },
  sunSal: { name: "Salutation au soleil", cue: "Flexion avant \u2192 planche \u2192 cobra \u2192 chien t\xEAte en bas \u2192 retour debout, synchronis\xE9 \xE0 la respiration.", muscles: "Dos, ischios", side: false, type: "hold", secs: 60, cat: "mobilite" , sub: "Mobilité mixte / Flow", niveau: "Tous niveaux" },
  scorpion: { name: "Scorpion", cue: "Sur le ventre bras en croix, am\xE8ne un pied vers la main oppos\xE9e en pivotant le bassin, \xE9paules au sol.", muscles: "Colonne, hanche", side: true, type: "hold", secs: 30, cat: "mobilite" , sub: "Mobilité mixte / Flow", niveau: "Tous niveaux" },
  bearCrawl: { name: "Bear crawl mobility", cue: "\xC0 quatre pattes genoux d\xE9coll\xE9s de quelques cm, avance bras et jambe oppos\xE9s, dos plat et stable.", muscles: "Abdominaux, epaules", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Mobilité mixte / Flow", niveau: "Tous niveaux" },
  // --- Récupération / auto-massage ---
  rollMollet: { name: "Rouleau \u2014 mollets", cue: "Mollet sur le rouleau, l\u2019autre jambe crois\xE9e par-dessus pour appuyer ; roule lentement du tendon au genou, pause sur les points sensibles.", side: true, type: "hold", secs: 45, muscles: "Mollets", benefit: "Rel\xE2che les mollets apr\xE8s l\u2019effort.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  rollQuad: { name: "Rouleau \u2014 quadriceps", cue: "Appuy\xE9 sur les avant-bras, rouleau sous l\u2019avant de la cuisse, roule de la hanche au genou sans \xE0-coups.", side: true, type: "hold", secs: 45, muscles: "Quadriceps", benefit: "D\xE9tend l\u2019avant de la cuisse.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  rollFess: { name: "Rouleau \u2014 fessiers & hanche", cue: "Assis sur le rouleau, une cheville sur le genou oppos\xE9, roule la fesse et le c\xF4t\xE9 de la hanche.", side: true, type: "hold", secs: 45, muscles: "Fessiers, hanche", benefit: "Rel\xE2che la fesse et l\u2019ext\xE9rieur de hanche.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  rollDos: { name: "Rouleau \u2014 haut du dos", cue: "Rouleau en travers sous le haut du dos, mains derri\xE8re la nuque ; roule doucement le haut du dos (jamais le bas).", side: false, type: "hold", secs: 45, muscles: "Haut du dos", benefit: "D\xE9tend le haut du dos et am\xE9liore l\u2019extension.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  rollPlante: { name: "Massage de la vo\xFBte plantaire", cue: "Sous le pied, une balle dure : roule de l\u2019avant au talon, pression douce et progressive.", side: true, type: "hold", secs: 40, muscles: "Vo\xFBte plantaire, fascia", benefit: "D\xE9tend la plante du pied (utile contre la fasciite).", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  legsUp: { name: "Jambes contre le mur", cue: "Allong\xE9, fesses pr\xE8s du mur, jambes tendues \xE0 la verticale : favorise le retour veineux et soulage les jambes lourdes.", side: false, type: "hold", secs: 90, muscles: "Mollets", benefit: "Soulage les jambes lourdes et favorise la r\xE9cup\xE9ration.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  respiration: { name: "Respiration / coh\xE9rence", cue: "Inspire 4 s, expire 6 s, lentement : l\u2019expiration longue active la r\xE9cup\xE9ration et fait baisser le rythme cardiaque.", side: false, type: "hold", secs: 60, muscles: "Abdominaux", benefit: "Active la r\xE9cup\xE9ration nerveuse et r\xE9duit le stress.", cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  secousse: { name: "Rel\xE2chement (secouer)", cue: "Debout ou allong\xE9, secoue doucement jambes et bras quelques instants pour rel\xE2cher les tensions.", muscles: "Mollets", side: false, type: "hold", secs: 30, cat: "mobilite" , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  // --- renforcement (poids du corps · élastique · médecine ball) ---
  pontUni: { name: "Pont fessier unilat\xE9ral", cue: "Allong\xE9 sur le dos, une jambe fl\xE9chie au sol, l\u2019autre tendue : monte le bassin en poussant sur le talon, serre le fessier en haut sans cambrer.", muscles: "Fessiers, ischios", side: true, type: "reps", reps: 12, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  marche: { name: "Marche fessi\xE8re (\xE9lastique)", cue: "\xC9lastique au-dessus des genoux, demi-squat : avance en petits pas en gardant la tension et les genoux \xE9cart\xE9s.", muscles: "Fessiers", side: false, type: "reps", reps: 16, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  abducElast: { name: "Abduction de hanche (\xE9lastique)", cue: "\xC9lastique aux chevilles, debout, appui l\xE9ger au mur : \xE9carte la jambe tendue sur le c\xF4t\xE9, contr\xF4le le retour.", muscles: "Fessiers, hanche", side: true, type: "reps", reps: 15, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  coquille: { name: "Coquille (\xE9lastique)", cue: "Sur le c\xF4t\xE9, genoux fl\xE9chis, \xE9lastique au-dessus des genoux : ouvre le genou du dessus sans bouger le bassin.", muscles: "Fessiers, hanche", side: true, type: "reps", reps: 15, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  goodMorning: { name: "Good morning (\xE9lastique)", cue: "\xC9lastique sous les pieds et autour des \xE9paules : penche le buste dos plat, hanches vers l\u2019arri\xE8re, reviens en serrant les fessiers.", muscles: "Ischios, lombaires", side: false, type: "reps", reps: 14, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  curlIschio: { name: "Curl ischios (\xE9lastique)", cue: "\xC9lastique fix\xE9 bas devant, accroch\xE9 \xE0 la cheville : \xE0 plat ventre, fl\xE9chis le genou contre la r\xE9sistance, descente lente.", muscles: "Ischios", side: true, type: "reps", reps: 12, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  mollets: { name: "Mollets debout", cue: "Debout, appui l\xE9ger au mur : monte sur la pointe des pieds le plus haut possible, descente lente et contr\xF4l\xE9e.", muscles: "Mollets", side: false, type: "reps", reps: 20, cat: "renfo" , sub: "Mollets, avant-bras & stabilité", niveau: "Intermédiaire" },
  molletAssis: { name: "Mollet sol\xE9aire (genoux fl\xE9chis)", cue: "Genoux l\xE9g\xE8rement fl\xE9chis, monte sur les pointes : cible le sol\xE9aire, sous le mollet \u2014 cl\xE9 pour la course.", muscles: "Mollets", side: false, type: "reps", reps: 20, cat: "renfo" , sub: "Mollets, avant-bras & stabilité", niveau: "Intermédiaire" },
  wallSit: { name: "Chaise au mur", cue: "Dos plaqu\xE9 au mur, cuisses \xE0 l\u2019horizontale, genoux \xE0 90\xB0 : tiens la position, gain\xE9, sans glisser.", muscles: "Quadriceps", side: false, type: "hold", secs: 45, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  fentePoids: { name: "Fente avant lente", cue: "Grand pas en avant, descends le genou arri\xE8re vers le sol, buste droit ; remonte en poussant sur le talon avant.", muscles: "Quadriceps, fessiers", side: true, type: "reps", reps: 12, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  tirElast: { name: "Tirage dos (\xE9lastique)", cue: "\xC9lastique fix\xE9 devant \xE0 hauteur de poitrine (ou sous les pieds) : tire les coudes vers l\u2019arri\xE8re en serrant les omoplates.", muscles: "Dos, biceps", side: false, type: "reps", reps: 14, cat: "renfo" , sub: "Dos, tirage & bras", niveau: "Intermédiaire" },
  presseElast: { name: "D\xE9velopp\xE9 \xE9paules (\xE9lastique)", cue: "\xC9lastique sous les pieds, mains aux \xE9paules : pousse au-dessus de la t\xEAte sans cambrer, descente contr\xF4l\xE9e.", muscles: "Epaules, triceps", side: false, type: "reps", reps: 14, cat: "renfo" , sub: "Pectoraux & épaules", niveau: "Intermédiaire" },
  pullApart: { name: "\xC9cart\xE9s \xE9paules (\xE9lastique)", cue: "\xC9lastique tendu devant \xE0 hauteur d\u2019\xE9paules : \xE9carte les mains en serrant les omoplates, pour le haut du dos.", muscles: "Epaules, trapeze", side: false, type: "reps", reps: 16, cat: "renfo" , sub: "Dos, tirage & bras", niveau: "Intermédiaire" },
  pallof: { name: "Anti-rotation Pallof (\xE9lastique)", cue: "\xC9lastique fix\xE9 sur le c\xF4t\xE9 \xE0 hauteur du torse : bras tendus devant, r\xE9siste \xE0 la rotation sans tourner le buste.", muscles: "Abdominaux, obliques", side: true, type: "hold", secs: 30, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  deadbug: { name: "Dead bug", cue: "Dos au sol, bras et genoux lev\xE9s : descends bras et jambe oppos\xE9s sans cambrer le bas du dos, alterne.", muscles: "Abdominaux, transverse", side: false, type: "reps", reps: 12, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" , same: "deadBug" },
  birddog: { name: "Bird-dog", cue: "\xC0 quatre pattes : tends bras et jambe oppos\xE9s \xE0 l\u2019horizontale, gain\xE9, sans tourner le bassin ; alterne.", muscles: "Abdominaux, lombaires", side: true, type: "reps", reps: 12, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  gainageLat: { name: "Gainage lat\xE9ral", cue: "Sur l\u2019avant-bras et le c\xF4t\xE9 du pied, corps align\xE9, hanches hautes : tiens en respirant.", muscles: "Obliques, abdominaux", side: true, type: "hold", secs: 30, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  mbTwist: { name: "Rotation m\xE9decine ball", cue: "Assis, buste inclin\xE9, pieds d\xE9coll\xE9s : passe la m\xE9decine ball d\u2019un c\xF4t\xE9 \xE0 l\u2019autre en gainant le tronc.", muscles: "Obliques, abdominaux", side: false, type: "reps", reps: 20, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  mbChop: { name: "Woodchop m\xE9decine ball", cue: "M\xE9decine ball : am\xE8ne-la en diagonale du bas d\u2019un c\xF4t\xE9 vers le haut de l\u2019autre, pivote les pieds, gaine le tronc.", muscles: "Obliques, epaules", side: true, type: "reps", reps: 12, cat: "renfo" , sub: "Dos & tronc", niveau: "Intermédiaire" },
  mbSquat: { name: "Squat m\xE9decine ball", cue: "M\xE9decine ball contre la poitrine : descends en squat profond, dos droit, talons au sol, remonte.", muscles: "Quadriceps, fessiers", side: false, type: "reps", reps: 15, cat: "renfo" , sub: "Jambes & fessiers", niveau: "Intermédiaire" },
  // --- full body (poids du corps · élastique · médecine ball) ---
  burpee: { name: "Burpee", cue: "Squat, mains au sol, jambes en arri\xE8re en planche, ram\xE8ne les pieds et saute ; pompe optionnelle en bas.", muscles: "Pectoraux, quadriceps, abdominaux", side: false, type: "reps", reps: 10, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  squatThrust: { name: "Squat thrust", cue: "Comme un burpee sans le saut : mains au sol, jambes en arri\xE8re puis ram\xE8ne, rel\xE8ve-toi, encha\xEEne.", muscles: "Quadriceps, abdominaux", side: false, type: "reps", reps: 14, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  squatPress: { name: "Squat + d\xE9velopp\xE9 (\xE9lastique)", cue: "\xC9lastique sous les pieds, mains aux \xE9paules : descends en squat puis pousse au-dessus de la t\xEAte en remontant.", muscles: "Quadriceps, epaules", side: false, type: "reps", reps: 14, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  gainageDyn: { name: "Planche dynamique \xE9paules", cue: "En planche sur les mains : touche l\u2019\xE9paule oppos\xE9e en alternance sans bouger le bassin.", muscles: "Epaules, abdominaux", side: false, type: "reps", reps: 16, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  ours: { name: "D\xE9placement de l\u2019ours", cue: "\xC0 quatre pattes, genoux d\xE9coll\xE9s du sol : avance main et pied oppos\xE9s, dos plat, tronc gain\xE9.", muscles: "Abdominaux, epaules", side: false, type: "reps", reps: 12, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  chenille: { name: "Chenille (inchworm)", cue: "Debout, descends les mains au sol, marche-les jusqu\u2019en planche, reviens vers les pieds et rel\xE8ve-toi.", muscles: "Ischios, epaules", side: false, type: "reps", reps: 10, cat: "fullbody" , sub: "Circuits corps entier", niveau: "Intermédiaire" },
  // --- mobilité : mur · élastique · rouleau · balle ---
  wallStraddle: { name: "Jambes \xE9cart\xE9es au mur", cue: "Sur le dos, fesses contre le mur, jambes tendues \xE9cart\xE9es en V : laisse la gravit\xE9 ouvrir les hanches, respire et rel\xE2che progressivement.", side: false, type: "hold", secs: 60, cat: "mobilite", muscles: "Adducteurs, ischios", benefit: "Ouvre les hanches et \xE9tire l\u2019int\xE9rieur des cuisses sans forcer." , sub: "Mur, appuis & intégration", niveau: "Tous niveaux" },
  wallHamstring: { name: "Jambe tendue au mur", cue: "Allong\xE9 pr\xE8s d\u2019un mur, une jambe tendue verticale contre le mur, l\u2019autre au sol : bassin neutre, pousse le talon vers le plafond.", side: true, type: "hold", secs: 45, cat: "mobilite", muscles: "Ischio-jambiers", benefit: "\xC9tire les ischios sans charger le bas du dos." , sub: "Mur, appuis & intégration", niveau: "Tous niveaux" },
  figure4Wall: { name: "Figure 4 au mur", cue: "Sur le dos face au mur, pieds appuy\xE9s, croise une cheville sur le genou oppos\xE9 et rapproche le bassin du mur.", side: true, type: "hold", secs: 40, cat: "mobilite", muscles: "Fessiers, piriforme", benefit: "Rel\xE2che la fesse profonde et la hanche." , sub: "Mur, appuis & intégration", niveau: "Tous niveaux" },
  bandHamstring: { name: "Ischios \xE0 l\u2019\xE9lastique", cue: "Allong\xE9, \xE9lastique autour de l\u2019avant-pied, jambe tendue : tire doucement la jambe vers toi jusqu\u2019\xE0 l\u2019\xE9tirement, genou tendu.", side: true, type: "hold", secs: 40, cat: "mobilite", muscles: "Ischio-jambiers, mollets", benefit: "\xC9tirement assist\xE9 progressif et contr\xF4l\xE9." , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  bandCalf: { name: "Mollet \xE0 l\u2019\xE9lastique", cue: "Assis jambe tendue, \xE9lastique sous la plante du pied : tire la pointe vers toi, sens l\u2019\xE9tirement du mollet.", side: true, type: "hold", secs: 40, cat: "mobilite", muscles: "Mollets (gastrocn\xE9mien, sol\xE9aire)", benefit: "Gagne en flexion de cheville, cl\xE9 pour la course." , sub: "Jambes & chevilles", niveau: "Tous niveaux" },
  ballGlute: { name: "Balle fessiers / piriforme", cue: "Assis sur une balle dure plac\xE9e sous une fesse, roule lentement et pause sur les points sensibles, jambe crois\xE9e pour cibler.", side: true, type: "hold", secs: 40, cat: "mobilite", muscles: "Fessiers, piriforme", benefit: "D\xE9tend la hanche profonde et soulage le bas du dos." , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  ballPec: { name: "Balle pectoral au mur", cue: "Balle entre le mur et le haut de la poitrine (sous la clavicule) : appuie et roule doucement, bras d\xE9tendu.", side: true, type: "hold", secs: 30, cat: "mobilite", muscles: "Pectoraux", benefit: "Ouvre la poitrine et am\xE9liore la posture d\u2019\xE9paule." , sub: "Récupération & relâchement", niveau: "Tous niveaux" },
  hipOpenerAssisted: { name: "Ouverture de hanche assist\xE9e", cue: "\xC0 quatre pattes, un genou ouvert sur le c\xF4t\xE9 en 90/90 : descends les avant-bras au sol et avance/recule le bassin pour ouvrir la hanche.", side: true, type: "hold", secs: 45, cat: "mobilite", muscles: "Fessiers, rotateurs de hanche, adducteurs", benefit: "Ouvre activement la hanche en profondeur." , sub: "Hanches & bassin", niveau: "Tous niveaux" }
,
  // --- Bibliothèque étirements (100) ---
  etNeckFlex: { name: "Flexion du cou", cue: "Menton vers la poitrine, descends doucement, épaules basses.", side: false, type: "hold", secs: 30, muscles: "Trapeze, nuque", articulation: "Cervicales", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etNeckExt: { name: "Extension du cou", cue: "Regarde lentement le plafond, bouche fermée, sans forcer.", side: false, type: "hold", secs: 15, muscles: "Fléchisseurs du cou", articulation: "Cervicales", materiel: "Aucun", stretchType: "Statique", temps: "15s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etNeckRot: { name: "Rotation du cou", cue: "Tourne lentement la tête côté puis l'autre, épaules immobiles.", side: true, type: "hold", secs: 30, muscles: "Trapeze, nuque", articulation: "Cervicales", materiel: "Aucun", stretchType: "Dynamique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etLevScap: { name: "Étirement élévateur de la scapula", cue: "Menton vers l'aisselle, main tire doucement la tête en diagonale.", side: true, type: "hold", secs: 30, muscles: "Trapeze, epaules", articulation: "Cervicales", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etArmsCross: { name: "Bras en croix", cue: "Bras tendus en croix, ouvre la poitrine vers l'arrière, omoplates serrées.", side: false, type: "hold", secs: 30, muscles: "Pectoraux, épaules", articulation: "Épaule", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etPecDoor: { name: "Pectoral encadrement de porte", cue: "Avant-bras contre le montant, avance le buste pour ouvrir la poitrine.", side: true, type: "hold", secs: 30, muscles: "Pectoraux", articulation: "Épaule", materiel: "Encadrement de porte", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etTricepsOH: { name: "Triceps au-dessus de la tête", cue: "Coude plié derrière la tête, l'autre main pousse le coude vers le bas.", side: true, type: "hold", secs: 30, muscles: "Triceps", articulation: "Épaule", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etLatWall: { name: "Grand dorsal au mur", cue: "Mains au mur en hauteur, recule le bassin, dos long, flancs étirés.", side: false, type: "hold", secs: 30, muscles: "Grand dorsal", articulation: "Épaule, colonne", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etShoulderBack: { name: "Épaules bras derrière", cue: "Mains jointes derrière le dos, monte les bras tendus, poitrine ouverte.", side: false, type: "hold", secs: 30, muscles: "Épaules, pectoraux", articulation: "Épaule", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etBicepsWall: { name: "Biceps au mur", cue: "Bras tendu en arrière paume au mur, tourne le corps à l'opposé.", side: true, type: "hold", secs: 30, muscles: "Biceps, avant d'épaule", articulation: "Épaule", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etUpperBackSit: { name: "Haut du dos assis", cue: "Assis, bras tendus devant joints, arrondis le haut du dos, menton rentré.", side: false, type: "hold", secs: 30, muscles: "Rhomboïdes, trapèzes", articulation: "Colonne thoracique", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etNeckBand: { name: "Cou avec élastique", cue: "Élastique léger en main, résiste doucement à l'inclinaison de la tête.", side: true, type: "hold", secs: 30, muscles: "Trapeze, nuque", articulation: "Cervicales", materiel: "Élastique", stretchType: "PNF", temps: "30s", niveau: "Intermédiaire", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etPecBand: { name: "Pectoraux avec élastique", cue: "Élastique derrière le dos, écarte les bras pour ouvrir la poitrine.", side: false, type: "hold", secs: 30, muscles: "Pectoraux", articulation: "Épaule", materiel: "Élastique", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etTricepsBand: { name: "Triceps avec élastique", cue: "Élastique tenu dans le dos, étire le triceps du bras haut vers le bas.", side: true, type: "hold", secs: 30, muscles: "Triceps", articulation: "Épaule", materiel: "Élastique", stretchType: "PNF", temps: "30s", niveau: "Intermédiaire", sub: "Cou & épaules", etir: true, cat: "mobilite" },
  etChildPose: { name: "Child Pose", cue: "À genoux, assieds-toi sur les talons, bras tendus devant, front au sol.", side: false, type: "hold", secs: 45, muscles: "Grand dorsal, bas du dos", articulation: "Colonne", materiel: "Aucun", stretchType: "Statique", temps: "45s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etChildSide: { name: "Child Pose latéral", cue: "En child pose, déplace les mains d'un côté pour étirer le flanc.", side: true, type: "hold", secs: 30, muscles: "Grand dorsal, flancs", articulation: "Colonne", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etTSpineWall: { name: "Rotation thoracique mur", cue: "De profil au mur mains jointes, tourne le buste pour suivre les mains.", side: true, type: "hold", secs: 30, muscles: "Colonne thoracique", articulation: "Colonne", materiel: "Mur", stretchType: "Dynamique", temps: "30s", niveau: "Intermédiaire", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etFlankStand: { name: "Étirement du flanc debout", cue: "Debout bras tendu en hauteur, incline le buste du côté opposé.", side: true, type: "hold", secs: 30, muscles: "Flancs, grand dorsal", articulation: "Colonne", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etFlankWall: { name: "Étirement du flanc mur", cue: "Bras au mur en hauteur, pousse la hanche opposée pour étirer le flanc.", side: true, type: "hold", secs: 30, muscles: "Abdominaux, obliques", articulation: "Colonne", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etSeatedTwist: { name: "Torsion assise", cue: "Assis, une jambe croisée, tourne le buste vers le genou levé, dos droit.", side: true, type: "hold", secs: 30, muscles: "Obliques, colonne", articulation: "Colonne", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etObliques: { name: "Étirement obliques", cue: "Debout, une main en l'air, incline et tourne légèrement le buste.", side: true, type: "hold", secs: 30, muscles: "Obliques", articulation: "Colonne", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etLatSit: { name: "Grand dorsal assis", cue: "Assis, attrape un poignet en l'air, tire et incline le buste sur le côté.", side: true, type: "hold", secs: 30, muscles: "Grand dorsal", articulation: "Colonne, épaule", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etBackWall: { name: "Dos contre le mur", cue: "Dos plaqué au mur, plaque les lombaires en rentrant le nombril.", side: false, type: "hold", secs: 30, muscles: "Bas du dos, abdominaux", articulation: "Colonne", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etKneesChest: { name: "Genoux poitrine", cue: "Sur le dos, ramène les deux genoux vers la poitrine, dos arrondi.", side: false, type: "hold", secs: 45, muscles: "Bas du dos, fessiers", articulation: "Colonne, hanche", materiel: "Aucun", stretchType: "Statique", temps: "45s", niveau: "Débutant", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etLowBackLunge: { name: "Bas du dos en fente", cue: "En fente basse, arrondis légèrement le bas du dos puis relâche.", side: true, type: "hold", secs: 30, muscles: "Bas du dos, psoas", articulation: "Colonne, hanche", materiel: "Aucun", stretchType: "Dynamique", temps: "30s", niveau: "Intermédiaire", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etSidePrayer: { name: "Prière latérale", cue: "À genoux mains jointes au sol, étire les bras loin sur un côté.", side: true, type: "hold", secs: 30, muscles: "Grand dorsal, flancs", articulation: "Colonne, épaule", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etIntercostal: { name: "Étirement intercostaux", cue: "Bras levé, inspire en ouvrant les côtes, incline doucement le buste.", side: true, type: "hold", secs: 30, muscles: "Abdominaux, pectoraux", articulation: "Cage thoracique", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Colonne & tronc", etir: true, cat: "mobilite" },
  etLowLungeWall: { name: "Fente basse mur", cue: "Fente basse, mains au mur, pousse le bassin vers l'avant.", side: true, type: "hold", secs: 45, muscles: "Fléchisseurs de hanche, psoas", articulation: "Hanche", materiel: "Mur", stretchType: "Statique", temps: "45s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etCouch: { name: "Couch Stretch", cue: "Genou arrière contre le mur tibia vers le haut, pousse le bassin en avant.", side: true, type: "hold", secs: 45, muscles: "Quadriceps, psoas", articulation: "Hanche, genou", materiel: "Mur", stretchType: "Statique", temps: "45s", niveau: "Intermédiaire", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etQuadStand: { name: "Quadriceps debout", cue: "Debout, attrape la cheville derrière, talon vers la fesse, genoux serrés.", side: true, type: "hold", secs: 30, muscles: "Quadriceps", articulation: "Genou, hanche", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etQuadWall: { name: "Quadriceps mur", cue: "Genou au sol contre le mur, tibia vertical, buste droit.", side: true, type: "hold", secs: 45, muscles: "Quadriceps", articulation: "Genou, hanche", materiel: "Mur", stretchType: "Statique", temps: "45s", niveau: "Intermédiaire", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  et9090Lean: { name: "90/90 inclinaison", cue: "En 90/90, penche le buste vers le genou avant, dos long.", side: true, type: "hold", secs: 40, muscles: "Rotateurs de hanche, fessiers", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "40s", niveau: "Intermédiaire", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etButterfly: { name: "Papillon", cue: "Assis plantes jointes, laisse les genoux descendre, dos droit.", side: false, type: "hold", secs: 45, muscles: "Adducteurs", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "45s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etGroinStand: { name: "Étirement aine debout", cue: "Pieds très écartés, transfère le poids sur une jambe fléchie, l'autre tendue.", side: true, type: "hold", secs: 30, muscles: "Adducteurs", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etGluteMed: { name: "Moyen fessier", cue: "Sur le dos, ramène un genou vers l'épaule opposée en diagonale.", side: true, type: "hold", secs: 30, muscles: "Moyen fessier", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etHipFlexArms: { name: "Hip Flexor bras levés", cue: "En fente basse, lève les bras au-dessus de la tête, bassin en avant.", side: true, type: "hold", secs: 30, muscles: "Psoas, fléchisseurs", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etHipBand: { name: "Hanches avec élastique", cue: "Élastique fixé bas sur la cuisse, en fente, recule pour étirer le psoas.", side: true, type: "hold", secs: 40, muscles: "Psoas, fléchisseurs", articulation: "Hanche", materiel: "Élastique", stretchType: "PNF", temps: "40s", niveau: "Intermédiaire", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etHipOpenWall: { name: "Ouverture hanche mur", cue: "Sur le dos jambes au mur, écarte les jambes en V, gravité ouvre les hanches.", side: false, type: "hold", secs: 60, muscles: "Adducteurs", articulation: "Hanche", materiel: "Mur", stretchType: "Statique", temps: "60s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etCrossPelvis: { name: "Étirement croisé bassin", cue: "Sur le dos, croise une cheville sur le genou opposé, rapproche les cuisses.", side: true, type: "hold", secs: 40, muscles: "Fessiers, piriforme", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "40s", niveau: "Débutant", sub: "Hanches & bassin", etir: true, cat: "mobilite" },
  etHamSit: { name: "Ischios assis", cue: "Assis jambe tendue, penche le buste vers le pied, dos long.", side: true, type: "hold", secs: 30, muscles: "Ischio-jambiers", articulation: "Hanche, genou", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etCalfWallStraight: { name: "Mollet mur jambe tendue", cue: "Mains au mur, jambe arrière tendue talon au sol, avance le bassin.", side: true, type: "hold", secs: 30, muscles: "Gastrocnémien", articulation: "Cheville", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etCalfWallBent: { name: "Mollet mur genou fléchi", cue: "Comme le mollet au mur mais genou arrière légèrement fléchi (soléaire).", side: true, type: "hold", secs: 30, muscles: "Soléaire", articulation: "Cheville", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etTibAnt: { name: "Tibial antérieur mur", cue: "Pointe de pied au sol derrière, pousse le dessus du pied vers le sol.", side: true, type: "hold", secs: 30, muscles: "Mollets, cheville", articulation: "Cheville", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etKneeWall: { name: "Cheville genou mur", cue: "Pied face au mur, avance le genou vers le mur sans décoller le talon.", side: true, type: "hold", secs: 30, muscles: "Cheville (flexion dorsale)", articulation: "Cheville", materiel: "Mur", stretchType: "Dynamique", temps: "30s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etPlantarFlex: { name: "Flexion plantaire", cue: "Assis, pointe le pied loin de toi, tiens l'étirement du dessus du pied.", side: true, type: "hold", secs: 15, muscles: "Mollets, cheville", articulation: "Cheville", materiel: "Aucun", stretchType: "Statique", temps: "15s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etDorsiflex: { name: "Dorsiflexion", cue: "Assis jambe tendue, ramène la pointe vers toi, mollet étiré.", side: true, type: "hold", secs: 15, muscles: "Mollet", articulation: "Cheville", materiel: "Aucun", stretchType: "Statique", temps: "15s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etCalfStep: { name: "Mollet sur marche", cue: "Avant-pied sur une marche, laisse le talon descendre sous le niveau.", side: true, type: "hold", secs: 30, muscles: "Mollets", articulation: "Cheville", materiel: "Marche", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etTowelFoot: { name: "Pied avec serviette", cue: "Assis jambe tendue, serviette autour du pied, tire la pointe vers toi.", side: true, type: "hold", secs: 30, muscles: "Mollets, plante", articulation: "Cheville", materiel: "Serviette", stretchType: "PNF", temps: "30s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etToes: { name: "Étirement orteils", cue: "À genoux orteils repliés sous le pied, assieds-toi doucement en arrière.", side: false, type: "hold", secs: 30, muscles: "Orteils, plante du pied", articulation: "Pied", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etHamFloss: { name: "Hamstring Flossing", cue: "Sur le dos jambe levée, alterne flexion/extension du genou et de la cheville.", side: true, type: "hold", secs: 30, muscles: "Ischio-jambiers, nerf sciatique", articulation: "Hanche, genou", materiel: "Aucun", stretchType: "Dynamique", temps: "30s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etRunnerLunge: { name: "Fente du coureur", cue: "Grande fente, mains au sol de part et d'autre du pied avant, bassin bas.", side: true, type: "hold", secs: 40, muscles: "Fléchisseurs, adducteurs", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "40s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etDeepLunge: { name: "Fente profonde", cue: "Fente très basse, coude vers le sol côté intérieur du pied avant.", side: true, type: "hold", secs: 40, muscles: "Hanche, adducteurs", articulation: "Hanche", materiel: "Aucun", stretchType: "Statique", temps: "40s", niveau: "Intermédiaire", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etSquatAssist: { name: "Squat profond assisté", cue: "En squat profond, tiens un appui devant pour t'aider à rester bas et détendu.", side: false, type: "hold", secs: 45, muscles: "Hanches, chevilles, adducteurs", articulation: "Hanche, cheville", materiel: "Appui/poteau", stretchType: "Statique", temps: "45s", niveau: "Débutant", sub: "Jambes, genoux & chevilles", etir: true, cat: "mobilite" },
  etWristFlex: { name: "Poignet flexion", cue: "Bras tendu paume vers le bas, l'autre main tire les doigts vers le sol.", side: true, type: "hold", secs: 30, muscles: "Extenseurs avant-bras", articulation: "Poignet", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etWristExt: { name: "Poignet extension", cue: "Bras tendu paume vers le haut, tire les doigts vers le bas doucement.", side: true, type: "hold", secs: 30, muscles: "Fléchisseurs avant-bras", articulation: "Poignet", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etForearmExt: { name: "Extenseurs avant-bras", cue: "Bras tendu poing fermé fléchi vers le bas, étire le dessus de l'avant-bras.", side: true, type: "hold", secs: 30, muscles: "Extenseurs avant-bras", articulation: "Poignet, coude", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etFingersOpen: { name: "Ouverture doigts", cue: "Écarte les doigts au maximum, tiens, puis serre le poing, alterne.", side: false, type: "hold", secs: 15, muscles: "Avant-bras", articulation: "Doigts", materiel: "Aucun", stretchType: "Dynamique", temps: "15s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etFingersWall: { name: "Extension doigts mur", cue: "Doigts vers le bas paume au mur, recule pour étirer doigts et paume.", side: true, type: "hold", secs: 30, muscles: "Fléchisseurs des doigts", articulation: "Poignet, doigts", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etBicepsWall2: { name: "Biceps mur", cue: "Bras tendu en arrière paume au mur, pivote le corps pour étirer le biceps.", side: true, type: "hold", secs: 30, muscles: "Biceps", articulation: "Épaule, coude", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etTricepsWall: { name: "Triceps mur", cue: "Coude plié derrière la tête, pousse le coude contre le mur.", side: true, type: "hold", secs: 30, muscles: "Triceps", articulation: "Épaule", materiel: "Mur", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etForearmBand: { name: "Avant-bras élastique", cue: "Élastique en main, fléchis/étends le poignet contre une résistance légère.", side: true, type: "hold", secs: 30, muscles: "Avant-bras", articulation: "Poignet", materiel: "Élastique", stretchType: "PNF", temps: "30s", niveau: "Intermédiaire", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etPecBand2: { name: "Pectoraux élastique", cue: "Élastique derrière le dos, écarte les bras tendus pour ouvrir la poitrine.", side: false, type: "hold", secs: 30, muscles: "Pectoraux", articulation: "Épaule", materiel: "Élastique", stretchType: "Statique", temps: "30s", niveau: "Débutant", sub: "Bras, poignets & mains", etir: true, cat: "mobilite" },
  etFullWall: { name: "Étirement complet mur", cue: "Enchaîne dos, flancs et ischios au mur en transitions lentes et contrôlées.", side: false, type: "hold", secs: 60, muscles: "Dos, ischios, epaules", articulation: "Globale", materiel: "Mur", stretchType: "Dynamique", temps: "60s", niveau: "Intermédiaire", sub: "Étirements globaux & flows", etir: true, cat: "mobilite" },
  etLatComplete: { name: "Étirement latéral complet", cue: "Debout, étire un côté complet de la cheville au bout des doigts levés.", side: true, type: "hold", secs: 30, muscles: "Obliques, adducteurs", articulation: "Globale", materiel: "Aucun", stretchType: "Statique", temps: "30s", niveau: "Intermédiaire", sub: "Étirements globaux & flows", etir: true, cat: "mobilite" }
,
  // --- Bibliothèque renforcement (100) ---
  rfSumo: { name: "Squat sumo", cue: "Pieds très écartés pointes ouvertes, descends bassin entre les talons, dos droit, remonte en serrant les fessiers.", type: "reps", reps: 15, muscles: "Adducteurs, fessiers, quadriceps", materiel: "Aucun", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfLungeBack: { name: "Fentes arrière", cue: "Recule une jambe et descends le genou vers le sol, buste droit, puis reviens. Plus stable que la fente avant.", type: "reps", reps: 12, side: true, muscles: "Quadriceps, fessiers", materiel: "Aucun", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfWalkLunge: { name: "Fentes marchées", cue: "Enchaîne les fentes en avançant, genou arrière proche du sol, buste gainé et regard devant.", type: "reps", reps: 16, muscles: "Quadriceps, fessiers", materiel: "Aucun", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfLatLunge: { name: "Fentes latérales", cue: "Grand pas sur le côté, fléchis la jambe d'appui, l'autre tendue, pousse pour revenir au centre.", type: "reps", reps: 12, side: true, muscles: "Adducteurs, fessiers", materiel: "Aucun", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfBulgarian: { name: "Bulgarian split squat", cue: "Pied arrière surélevé, descends sur la jambe avant jusqu'à cuisse parallèle, buste droit, remonte.", type: "reps", reps: 10, side: true, muscles: "Quadriceps, fessiers", materiel: "Banc/chaise", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfStepUp: { name: "Montée sur banc", cue: "Monte sur une marche en poussant dans le talon, jambe complète, redescends lentement et contrôlé.", type: "reps", reps: 12, side: true, muscles: "Quadriceps, fessiers", materiel: "Banc/marche", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfStepUpKnee: { name: "Step-up genou haut", cue: "Monte sur le banc puis lève le genou opposé haut, équilibre une seconde, redescends contrôlé.", type: "reps", reps: 10, side: true, muscles: "Quadriceps, fessiers, fléchisseurs", materiel: "Banc/marche", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfHipThrust: { name: "Hip thrust", cue: "Épaules sur un appui, monte le bassin en contractant les fessiers, pause en haut, descends contrôlé.", type: "reps", reps: 15, muscles: "Grand fessier, ischios", materiel: "Banc/canapé", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfKickback: { name: "Kickback au sol", cue: "À quatre pattes, pousse un talon vers l'arrière jambe tendue, contracte le fessier, reviens sans creuser le dos.", type: "reps", reps: 15, side: true, muscles: "Grand fessier", materiel: "Aucun", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfDonkey: { name: "Donkey kicks", cue: "À quatre pattes, pousse le talon vers le plafond genou fléchi à 90°, contracte le fessier en haut.", type: "reps", reps: 15, side: true, muscles: "Grand fessier", materiel: "Aucun", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfFireHydrant: { name: "Fire hydrants", cue: "À quatre pattes, ouvre un genou plié sur le côté sans bouger le bassin, reviens lentement.", type: "reps", reps: 15, side: true, muscles: "Moyen fessier", materiel: "Aucun", niveau: "Débutant", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfRDL: { name: "Soulevé de terre jambes tendues", cue: "Charnière de hanches, descends le buste jambes quasi tendues dos neutre, remonte en serrant fessiers et ischios.", type: "reps", reps: 12, muscles: "Ischio-jambiers, fessiers", materiel: "Haltères/élastique", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfBulgarianExpl: { name: "Fente bulgare avec impulsion", cue: "Bulgarian split squat avec remontée explosive, sans décoller le pied, atterris souple et enchaîne.", type: "reps", reps: 8, side: true, muscles: "Quadriceps, fessiers", materiel: "Banc/chaise", niveau: "Avancé", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfSquatPulse: { name: "Squat pulsé", cue: "En bas du squat, fais de petites remontées partielles pour garder une tension continue sur les cuisses.", type: "reps", reps: 20, muscles: "Quadriceps, fessiers", materiel: "Aucun", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfWallSitCalf: { name: "Wall squat avec relevés de talons", cue: "En chaise au mur, monte et descends les talons pour travailler cuisses et mollets ensemble.", type: "hold", secs: 40, muscles: "Quadriceps, mollets", materiel: "Mur", niveau: "Intermédiaire", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfPistolAssist: { name: "Pistol squat assisté", cue: "Sur une jambe, descends en tenant un appui léger, l'autre jambe tendue devant, remonte contrôlé.", type: "reps", reps: 6, side: true, muscles: "Quadriceps, fessiers", materiel: "Appui/poteau", niveau: "Avancé", sub: "Jambes & fessiers", renf: true, cat: "renfo" },
  rfPlankHigh: { name: "Planche mains tendues", cue: "Corps aligné en appui sur les mains, gaine le ventre et les fessiers, ne creuse pas le bas du dos.", type: "hold", secs: 40, muscles: "Abdominaux, épaules", materiel: "Aucun", niveau: "Débutant", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfReverseBridge: { name: "Gainage dorsal", cue: "Assis jambes tendues, monte le bassin en appui sur les talons et les mains, corps aligné, tiens.", type: "hold", secs: 30, muscles: "Chaîne postérieure, fessiers", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfCrunch: { name: "Crunch", cue: "Sur le dos genoux fléchis, enroule le buste pour décoller les omoplates, expire, descends lentement.", type: "reps", reps: 15, muscles: "Grand droit de l'abdomen", materiel: "Aucun", niveau: "Débutant", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfCrunchObl: { name: "Crunch oblique", cue: "Crunch en amenant le coude vers le genou opposé, contracte les obliques, alterne les côtés.", type: "reps", reps: 16, muscles: "Obliques", materiel: "Aucun", niveau: "Débutant", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfLegRaise: { name: "Relevés de jambes", cue: "Sur le dos, lève les jambes tendues vers le plafond puis descends sans toucher le sol, bas du dos plaqué.", type: "reps", reps: 12, muscles: "Bas des abdominaux", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfHollow: { name: "Hollow hold", cue: "Sur le dos, décolle épaules et jambes, bas du dos plaqué au sol, corps en banane, tiens gainé.", type: "hold", secs: 25, muscles: "Sangle abdominale", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfLumbarExt: { name: "Extension lombaire au sol", cue: "Sur le ventre mains aux tempes, décolle légèrement le buste, contracte les lombaires, redescends lentement.", type: "reps", reps: 15, muscles: "Lombaires", materiel: "Aucun", niveau: "Débutant", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfShoulderTap: { name: "Planche avec touches d'épaule", cue: "En planche mains tendues, touche une épaule avec la main opposée en limitant le balancement du bassin.", type: "reps", reps: 16, muscles: "Abdominaux, épaules", materiel: "Aucun", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPlankWalk: { name: "Plank walk", cue: "Passe de la planche avant-bras à la planche mains tendues et inverse, bassin stable, gainage constant.", type: "reps", reps: 12, muscles: "Abdominaux, épaules, triceps", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfRussianTwist: { name: "Russian twist", cue: "Assis buste incliné pieds décollés, tourne le buste d'un côté à l'autre en contrôlant.", type: "reps", reps: 20, muscles: "Obliques", materiel: "Aucun (ou lest)", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfPlankLegLift: { name: "Gainage avec lever de jambe", cue: "En planche, décolle une jambe tendue sans bouger le bassin, alterne lentement.", type: "reps", reps: 16, muscles: "Abdominaux, fessiers", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfSidePlankDip: { name: "Side plank dip", cue: "En gainage latéral, descends puis remonte le bassin sans le poser, contrôle le mouvement.", type: "reps", reps: 12, side: true, muscles: "Obliques", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos & tronc", renf: true, cat: "renfo" },
  rfPushKnee: { name: "Pompes sur les genoux", cue: "Pompes en appui sur les genoux, corps aligné des genoux à la tête, descends la poitrine puis pousse.", type: "reps", reps: 12, muscles: "Pectoraux, triceps", materiel: "Aucun", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPushIncline: { name: "Pompes inclinées", cue: "Mains sur un banc ou une table, descends la poitrine vers l'appui, version allégée des pompes.", type: "reps", reps: 15, muscles: "Pectoraux, triceps", materiel: "Banc/table", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPushDecline: { name: "Pompes déclinées", cue: "Pieds surélevés, descends la poitrine vers le sol, sollicite davantage le haut des pectoraux.", type: "reps", reps: 12, muscles: "Haut des pectoraux, épaules", materiel: "Banc/marche", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPushClose: { name: "Pompes serrées", cue: "Pompes mains rapprochées sous la poitrine, coudes près du corps pour cibler les triceps.", type: "reps", reps: 12, muscles: "Triceps, pectoraux", materiel: "Aucun", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPushWide: { name: "Pompes larges", cue: "Pompes mains plus écartées que les épaules pour accentuer le travail des pectoraux.", type: "reps", reps: 12, muscles: "Pectoraux", materiel: "Aucun", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPushDiamond: { name: "Pompes diamant", cue: "Pompes mains en triangle index et pouces joints, coudes serrés, très ciblé triceps.", type: "reps", reps: 10, muscles: "Triceps", materiel: "Aucun", niveau: "Avancé", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfDipsBench: { name: "Dips entre deux bancs", cue: "Mains sur un banc pieds sur un autre, descends en pliant les coudes puis repousse.", type: "reps", reps: 12, muscles: "Triceps, pectoraux", materiel: "2 bancs", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfLatRaise: { name: "Élévations latérales", cue: "Bras le long du corps, monte-les sur les côtés jusqu'à l'horizontale, descends lentement.", type: "reps", reps: 15, muscles: "Deltoïde moyen", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfFrontRaise: { name: "Élévations frontales", cue: "Monte les bras tendus devant toi jusqu'à hauteur d'épaule, descends contrôlé.", type: "reps", reps: 12, muscles: "Deltoïde antérieur", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfRearDelt: { name: "Oiseau buste penché", cue: "Buste penché en avant, ouvre les bras tendus sur les côtés, serre les omoplates, descends lentement.", type: "reps", reps: 15, muscles: "Deltoïde postérieur", materiel: "Haltères/élastique", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPikePush: { name: "Pike push-up", cue: "En V fessiers hauts, fléchis les coudes pour descendre la tête vers le sol, puis repousse.", type: "reps", reps: 10, muscles: "Épaules, triceps", materiel: "Aucun", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfHinduPush: { name: "Hindu push-up", cue: "Du chien tête en bas, plonge le buste vers l'avant en arc puis remonte en cobra, mouvement fluide.", type: "reps", reps: 10, muscles: "Épaules, pectoraux, dos", materiel: "Aucun", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfWallPush: { name: "Wall push-up", cue: "Debout face au mur, mains à hauteur d'épaules, fléchis les coudes vers le mur puis repousse.", type: "reps", reps: 15, muscles: "Pectoraux, triceps", materiel: "Mur", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfBenchFloor: { name: "Développé couché au sol", cue: "Allongé dos au sol, pousse des haltères ou un élastique vers le haut, coudes au sol entre les reps.", type: "reps", reps: 12, muscles: "Pectoraux, triceps", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPullover: { name: "Pull-over léger", cue: "Allongé, bras tendus, descends une charge légère derrière la tête en arc puis ramène au-dessus.", type: "reps", reps: 12, muscles: "Pectoraux, grand dorsal", materiel: "Haltère/élastique", niveau: "Intermédiaire", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfHandstandWall: { name: "Handstand hold au mur", cue: "Pieds contre le mur en appui sur les mains tête en bas, gaine tout le corps, tiens.", type: "hold", secs: 20, muscles: "Épaules, gainage", materiel: "Mur", niveau: "Avancé", sub: "Pectoraux & épaules", renf: true, cat: "renfo" },
  rfPullup: { name: "Tractions", cue: "Suspendu à une barre paumes vers l'avant, tire le menton au-dessus, descends contrôlé bras tendus.", type: "reps", reps: 6, muscles: "Grand dorsal, biceps", materiel: "Barre", niveau: "Avancé", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfPullupAssist: { name: "Tractions assistées", cue: "Tractions avec un élastique sous les pieds ou un appui pour alléger la charge et progresser.", type: "reps", reps: 8, muscles: "Grand dorsal, biceps", materiel: "Barre + élastique", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfPullupNeg: { name: "Tractions négatives", cue: "Pars menton au-dessus de la barre, descends le plus lentement possible jusqu'à bras tendus.", type: "reps", reps: 5, muscles: "Grand dorsal, biceps", materiel: "Barre", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfInvRow: { name: "Rowing inversé", cue: "Sous une barre basse ou une table, corps gainé, tire la poitrine vers la barre puis descends.", type: "reps", reps: 12, muscles: "Dos, biceps", materiel: "Barre/table", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfRowOneArm: { name: "Rowing un bras", cue: "Buste penché en appui, tire un haltère ou un élastique vers la hanche, coude le long du corps.", type: "reps", reps: 12, side: true, muscles: "Grand dorsal, biceps", materiel: "Haltère/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfCurl: { name: "Curl biceps", cue: "Coudes au corps, fléchis les avant-bras pour monter la charge, contracte, descends lentement.", type: "reps", reps: 12, muscles: "Biceps", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfHammer: { name: "Curl marteau", cue: "Curl en prise neutre pouces vers le haut, monte la charge, descends contrôlé, cible biceps et avant-bras.", type: "reps", reps: 12, muscles: "Biceps, avant-bras", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfCurlConc: { name: "Curl concentré", cue: "Assis coude appuyé sur la cuisse, fléchis lentement l'avant-bras pour isoler le biceps.", type: "reps", reps: 12, side: true, muscles: "Biceps", materiel: "Haltère", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfCurlBand: { name: "Curl élastique", cue: "Debout sur l'élastique, fléchis les avant-bras contre la résistance, contrôle la descente.", type: "reps", reps: 15, muscles: "Biceps", materiel: "Élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfTricepsOH: { name: "Extension triceps au-dessus de la tête", cue: "Bras levé, fléchis le coude pour descendre la charge derrière la tête, puis tends le bras.", type: "reps", reps: 12, muscles: "Triceps", materiel: "Haltère/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfTricepsKick: { name: "Kickback triceps", cue: "Buste penché coude haut, tends l'avant-bras vers l'arrière, contracte le triceps, reviens lentement.", type: "reps", reps: 12, side: true, muscles: "Triceps", materiel: "Haltère/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfDipsTriceps: { name: "Dips triceps", cue: "Mains sur un appui derrière toi, descends en pliant les coudes vers l'arrière puis repousse.", type: "reps", reps: 12, muscles: "Triceps", materiel: "Chaise/banc", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfPushTriceps: { name: "Pompes serrées triceps", cue: "Pompes mains rapprochées coudes le long du corps, accent fort sur les triceps.", type: "reps", reps: 10, muscles: "Triceps", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfFacePull: { name: "Face pull avec élastique", cue: "Élastique à hauteur du visage, tire vers les tempes coudes hauts, serre les omoplates.", type: "reps", reps: 15, muscles: "Arrière d'épaule, haut du dos", materiel: "Élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfShrug: { name: "Shrug", cue: "Charge dans les mains bras tendus, hausse les épaules vers les oreilles, tiens, redescends lentement.", type: "reps", reps: 15, muscles: "Trapèzes", materiel: "Haltères/élastique", niveau: "Débutant", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfUprightRow: { name: "Tirage menton", cue: "Élastique ou haltères, tire les mains vers le menton coudes hauts, contrôlé, sans douleur d'épaule.", type: "reps", reps: 12, muscles: "Trapèzes, épaules", materiel: "Haltères/élastique", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfPulloverFloor: { name: "Pullover au sol", cue: "Allongé bras tendus, amène une charge légère derrière la tête puis ramène au-dessus de la poitrine.", type: "reps", reps: 12, muscles: "Grand dorsal, pectoraux", materiel: "Haltère/élastique", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfSupermanPull: { name: "Superman tirage", cue: "Sur le ventre bras devant, décolle buste et bras puis ramène les coudes vers les hanches, omoplates serrées.", type: "reps", reps: 12, muscles: "Bas du dos, haut du dos", materiel: "Aucun", niveau: "Intermédiaire", sub: "Dos, tirage & bras", renf: true, cat: "renfo" },
  rfCalfUni: { name: "Montées sur pointe une jambe", cue: "Sur une jambe appui léger, monte sur la pointe le plus haut possible, descends lentement.", type: "reps", reps: 15, side: true, muscles: "Mollets", materiel: "Aucun", niveau: "Intermédiaire", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfCalfStep: { name: "Mollets sur marche", cue: "Avant-pieds sur une marche, descends les talons sous le niveau puis monte sur la pointe, grande amplitude.", type: "reps", reps: 18, muscles: "Mollets (gastrocnémien)", materiel: "Marche", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfToeWalk: { name: "Marche sur la pointe des pieds", cue: "Marche sur la pointe des pieds sur quelques mètres, mollets contractés, posture droite.", type: "hold", secs: 30, muscles: "Mollets", materiel: "Aucun", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfHeelWalk: { name: "Marche sur les talons", cue: "Marche sur les talons pointes relevées, renforce les tibias et la stabilité de cheville.", type: "hold", secs: 30, muscles: "Mollets, cheville", materiel: "Aucun", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfFarmerHold: { name: "Farmer hold", cue: "Tiens une charge lourde dans chaque main, debout gainé, épaules basses, maintiens la position.", type: "hold", secs: 30, muscles: "Avant-bras, trapèzes, tronc", materiel: "Charges", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfFarmerWalk: { name: "Farmer walk", cue: "Marche en tenant une charge dans chaque main, buste droit, pas réguliers, gainage constant.", type: "hold", secs: 30, muscles: "Avant-bras, tronc, jambes", materiel: "Charges", niveau: "Intermédiaire", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfWristCurl: { name: "Wrist curl", cue: "Avant-bras posés, paumes vers le haut, fléchis les poignets pour monter la charge puis descends lentement.", type: "reps", reps: 15, muscles: "Fléchisseurs avant-bras", materiel: "Haltères légers", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfRevWristCurl: { name: "Reverse wrist curl", cue: "Avant-bras posés paumes vers le bas, relève les poignets contre une charge légère, contrôle la descente.", type: "reps", reps: 15, muscles: "Extenseurs avant-bras", materiel: "Haltères légers", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfSqueeze: { name: "Squeeze ball", cue: "Serre une balle ou une poignée le plus fort possible quelques secondes, relâche, répète.", type: "reps", reps: 12, muscles: "Préhension, avant-bras", materiel: "Balle/poignée", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfHandPlank: { name: "Planche sur mains", cue: "Maintien gainé en appui sur les mains, poignets sous les épaules, corps aligné et stable.", type: "hold", secs: 40, muscles: "Épaules, poignets, tronc", materiel: "Aucun", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfPlankMove: { name: "Planche avec déplacement", cue: "En planche, fais de petits pas latéraux mains et pieds, garde le bassin stable et gainé.", type: "hold", secs: 30, muscles: "Épaules, tronc", materiel: "Aucun", niveau: "Intermédiaire", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfSuitcase: { name: "Suitcase carry", cue: "Marche en tenant une charge d'un seul côté, résiste à l'inclinaison, tronc bien gainé.", type: "reps", reps: 30, side: true, muscles: "Obliques, tronc", materiel: "Charge", niveau: "Intermédiaire", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" },
  rfCoreBrace: { name: "Core bracing debout", cue: "Debout, contracte profondément le tronc comme avant un coup au ventre, respire en gardant la tension.", type: "hold", secs: 20, muscles: "Sangle abdominale profonde", materiel: "Aucun", niveau: "Débutant", sub: "Mollets, avant-bras & stabilité", renf: true, cat: "renfo" }
};

// --- Garde-fous structurels (données uniquement, sans impact UI) ---

function normalizeEx(db) {
  for (const k in db) {
    const e = db[k];
    if (!e || typeof e !== "object") { continue; }
    if (k === "rest") { if (!e.key) { e.key = k; } continue; }
    if (!e.key) { e.key = k; }
    if (!e.cat) { e.cat = "mobilite"; }
    if (!e.name) { e.name = k; }
    if (!e.cue) { e.cue = ""; }
    if (e.type == null) { e.type = (e.reps != null ? "reps" : "hold"); }
    if (e.type === "hold" && e.secs == null) { e.secs = 30; }
    if (e.type === "reps" && e.reps == null) { e.reps = 10; }
    if (e.side == null) { e.side = false; }
    if (e.sub == null) { e.sub = DEFAULT_SUB[e.cat] || ""; }
    if (e.niveau == null) { e.niveau = "Tous niveaux"; }
  }
  return db;
}
normalizeEx(EX);
function validateSessions(list, db) {
  if (!Array.isArray(list)) { return []; }
  return list.filter(function (sess) {
    if (!sess || !Array.isArray(sess.keys)) { return false; }
    const before = sess.keys.length;
    sess.keys = sess.keys.filter(function (k) { return Object.prototype.hasOwnProperty.call(db, k); });
    if (sess.keys.length === 0) {
      try { console.warn("[data] session ignorée (aucune clé valide):", sess.id); } catch (e) {}
      return false;
    }
    if (sess.keys.length !== before) {
      try { console.warn("[data] clés manquantes retirées de", sess.id); } catch (e) {}
    }
    return true;
  });
}

function buildBlocks(keys, opts) {
  opts = opts || {};
  const sets = opts.sets || 1;
  const restSecs = opts.restSecs || 0;
  const seshCat = opts.cat || null;
  // Le programme est relu depuis la base : une séance enregistrée par une
  // version antérieure peut n'avoir aucune liste de mouvements, ou nommer un
  // mouvement qui n'existe plus. L'écran d'accueil appelle ceci au rendu —
  // sans garde, une donnée périmée le rendait entièrement inaccessible.
  const oneRound = (Array.isArray(keys) ? keys : []).filter((k) => EX[k]).map((k) => {
    const e = EX[k];
    if (e.side) {
      return [
        { ...e, key: k, label: e.name + " \xB7 droite" },
        { ...e, key: k, label: e.name + " \xB7 gauche" }
      ];
    }
    return [{ ...e, key: k, label: e.name }];
  }).flat();

  // Bloc de récup propre : reprend la catégorie de la séance en cours (jamais figée
  // sur EX.rest), pour garder la bonne couleur/icône peu importe le contexte.
  function makeRestBlock(secs, label) {
    return { ...EX.rest, key: "rest", label: label || EX.rest.name, secs: secs, cat: seshCat };
  }

  // Insère un bloc de récup entre chaque exercice dès que restSecs > 0,
  // indépendamment du nombre de séries (utile en mobilité comme en pliométrie).
  function withRests(round) {
    if (restSecs <= 0) return round;
    const out = [];
    round.forEach((block, idx) => {
      out.push(block);
      if (idx < round.length - 1) {
        out.push(makeRestBlock(restSecs));
      }
    });
    return out;
  }

  if (sets <= 1) return withRests(oneRound);

  // Plusieurs séries : récup entre exercices + récup plus longue entre séries.
  const roundWithRests = withRests(oneRound);
  const allRounds = [];
  for (let s = 0; s < sets; s++) {
    allRounds.push(...roundWithRests);
    if (s < sets - 1) {
      allRounds.push(makeRestBlock((restSecs || 18) + 12, "R\u00e9cup\u00e9ration entre s\u00e9ries"));
    }
  }
  return allRounds;
}

export const SESSIONS = [
  {
    id: "mobilite-hanches",
    cat: "mobilite",
    title: "Hanches & bassin",
    subtitle: "Ouvre les hanches et rel\xE2che le bas du dos",
    level: "Interm\xE9diaire",
    mins: 12,
    focus: "Hanches \xB7 ischios \xB7 fessiers",
    restSecs: 10, keys: ["fente", "pigeon", "ischio", "pont", "chatVache"]
  },
  {
    id: "renfo-full",
    cat: "fullbody",
    title: "Full body express",
    subtitle: "Tout le corps, sans mat\xE9riel",
    level: "Interm\xE9diaire",
    mins: 15,
    focus: "Haut \xB7 bas \xB7 gainage",
    keys: ["squat", "pompes", "fentesA", "gainage", "pont", "mountain"]
  },
  {
    id: "renfo-core",
    cat: "renfo",
    title: "Gainage & core",
    subtitle: "Ceinture abdominale et bas du dos",
    level: "Confirm\xE9",
    mins: 10,
    focus: "Abdos \xB7 lombaires",
    keys: ["gainage", "superman", "mountain", "pont", "gainage"]
  },
  {
    id: "renfo-bas",
    cat: "renfo",
    title: "Bas du corps",
    subtitle: "Cuisses et fessiers, renfo cibl\xE9",
    level: "Interm\xE9diaire",
    mins: 14,
    focus: "Quadris \xB7 fessiers",
    keys: ["squat", "fentesA", "pont", "superman", "cheville"]
  },
  {
    id: "detente-soir",
    cat: "mobilite",
    title: "D\xE9tente du soir",
    subtitle: "Rel\xE2che les tensions avant de dormir",
    level: "Tous niveaux",
    mins: 9,
    focus: "Dos \xB7 nuque \xB7 jambes",
    restSecs: 10, keys: ["ischio", "pigeon", "rotThorax", "coup", "chatVache"]
  },
  // --- Pliométrie (doc) ---
  { id: "plyo-appuis", cat: "plyo", title: "Initiation appuis", subtitle: "Pr\xE9-pliom\xE9trie faible impact", level: "D\xE9butant", mins: 20, focus: "Chevilles \xB7 appuis", sets: 3, restSecs: 15, keys: ["corde", "pogo", "lineHops", "highKnees"] },
  { id: "plyo-jambes", cat: "plyo", title: "Puissance jambes", subtitle: "Sauts bilat\xE9raux", level: "D\xE9butant", mins: 24, focus: "Quadris \xB7 fessiers", sets: 3, restSecs: 20, keys: ["squatJump", "broadJump", "boxJumpLow", "stepUpExpl"] },
  { id: "plyo-reactif", cat: "plyo", title: "R\xE9activit\xE9 coureur", subtitle: "Unilat\xE9ral & lat\xE9ral", level: "Interm\xE9diaire", mins: 24, focus: "Foul\xE9e \xB7 plan frontal", sets: 3, restSecs: 20, keys: ["askip", "bounding", "skater", "latBound"] },
  { id: "plyo-avance", cat: "plyo", title: "Avanc\xE9 r\xE9actif", subtitle: "R\xE9actif / contrebas (base solide)", level: "Confirm\xE9", mins: 26, focus: "R\xE9activit\xE9 \xB7 contrebas", sets: 3, restSecs: 20, keys: ["depthJump", "hurdleHops", "slLatBound", "slBounding"] },
  { id: "plyo-haut", cat: "plyo", title: "Haut du corps & tronc", subtitle: "Pliom\xE9trie du haut du corps", level: "Interm\xE9diaire", mins: 20, focus: "Pecs \xB7 tronc", sets: 3, restSecs: 18, keys: ["mbChestPass", "mbSlam", "plyoPush", "mbRotThrow"] },
  // --- Mobilité par zone (doc) ---
  { id: "mob-chevilles", cat: "mobilite", title: "Mobilit\xE9 chevilles", subtitle: "Flexion dorsale & stabilit\xE9", level: "Tous niveaux", mins: 11, focus: "Chevilles \xB7 mollets", restSecs: 10, keys: ["cheville", "ankleCircles", "heelToe", "ankleInv", "deepSquatShift", "alphabet"] },
  { id: "mob-genoux", cat: "mobilite", title: "Mobilit\xE9 genoux", subtitle: "R\xE9veil articulaire du genou", level: "Tous niveaux", mins: 8, focus: "Genoux", restSecs: 10, keys: ["kneeFlexExt", "kneeCircles", "lungeOsc"] },
  { id: "mob-hanches-plus", cat: "mobilite", title: "Hanches (mobilit\xE9 +)", subtitle: "Rotateurs, adducteurs, fessiers", level: "Interm\xE9diaire", mins: 13, focus: "Hanches", restSecs: 10, keys: ["nineNinety", "hipCars", "fente", "frog", "pigeon", "cossack"] },
  { id: "mob-bassin", cat: "mobilite", title: "Bassin & lombaires", subtitle: "Contr\xF4le lombo-pelvien", level: "Tous niveaux", mins: 10, focus: "Bassin \xB7 lombaires", restSecs: 10, keys: ["pelvicTilt", "chatVache", "supineTwist", "deadBug"] },
  { id: "mob-thoracique", cat: "mobilite", title: "Colonne thoracique", subtitle: "Rotation & extension du haut du dos", level: "Tous niveaux", mins: 11, focus: "Thoracique", restSecs: 10, keys: ["openBook", "threadNeedle", "tSpineRoll", "rotThorax", "sphinx"] },
  { id: "mob-epaules", cat: "mobilite", title: "\u00c9paules", subtitle: "Amplitude & posture des \xE9paules", level: "Tous niveaux", mins: 12, focus: "\u00c9paules", restSecs: 10, keys: ["shoulderCircles", "passThrough", "wallSlides", "ytw", "pecStretch", "extRotBand"] },
  { id: "mob-poignets-cou", cat: "mobilite", title: "Poignets, coudes & cou", subtitle: "Articulations souvent oubli\xE9es", level: "Tous niveaux", mins: 10, focus: "Poignets \xB7 cou", restSecs: 10, keys: ["wristCircles", "forearmStretch", "pronSup", "coup", "chinTuck", "upperTrap"] },
  { id: "mob-flows", cat: "mobilite", title: "Flows globaux", subtitle: "Encha\xEEnements corps entier", level: "Tous niveaux", mins: 14, focus: "Corps entier", restSecs: 10, keys: ["worldGreatest", "inchworm", "deepSquatHold", "sunSal", "scorpion", "bearCrawl"] },
  {
    id: "renfo-post",
    cat: "renfo",
    title: "Cha\xEEne post\xE9rieure",
    subtitle: "Fessiers, ischios et mollets pour la course",
    level: "Interm\xE9diaire",
    mins: 14,
    focus: "Fessiers \xB7 ischios \xB7 mollets",
    keys: ["pontUni", "goodMorning", "curlIschio", "mollets", "molletAssis"]
  },
  {
    id: "renfo-hanches",
    cat: "renfo",
    title: "Hanches & fessiers (\xE9lastique)",
    subtitle: "Stabilit\xE9 du bassin avec \xE9lastique",
    level: "Tous niveaux",
    mins: 12,
    focus: "Abducteurs \xB7 fessiers \xB7 hanches",
    keys: ["marche", "abducElast", "coquille", "pontUni", "wallSit"]
  },
  {
    id: "renfo-core2",
    cat: "renfo",
    title: "Core & anti-rotation",
    subtitle: "Gainage profond et contr\xF4le du tronc",
    level: "Interm\xE9diaire",
    mins: 12,
    focus: "Tronc \xB7 obliques \xB7 stabilit\xE9",
    keys: ["pallof", "deadbug", "birddog", "gainageLat", "mbTwist"]
  },
  {
    id: "renfo-haut",
    cat: "renfo",
    title: "Haut du corps (\xE9lastique + sol)",
    subtitle: "Dos, \xE9paules et bras sans charge",
    level: "Tous niveaux",
    mins: 12,
    focus: "Dos \xB7 \xE9paules \xB7 poitrine",
    keys: ["tirElast", "presseElast", "pullApart", "pompes", "gainageLat"]
  },
  {
    id: "renfo-mb",
    cat: "renfo",
    title: "Renfo m\xE9decine ball",
    subtitle: "Force et gainage avec la m\xE9decine ball",
    level: "Interm\xE9diaire",
    mins: 13,
    focus: "Jambes \xB7 tronc \xB7 rotation",
    keys: ["mbSquat", "mbTwist", "mbChop", "goodMorning", "gainageLat"]
  },
  {
    id: "full-circuit",
    cat: "fullbody",
    title: "Circuit poids du corps",
    subtitle: "Tout le corps, sans mat\xE9riel",
    level: "Interm\xE9diaire",
    mins: 14,
    focus: "Cardio \xB7 jambes \xB7 tronc",
    keys: ["burpee", "squatThrust", "gainageDyn", "mountain", "gainageLat"]
  },
  {
    id: "full-elast",
    cat: "fullbody",
    title: "Full body \xE9lastique",
    subtitle: "Corps entier avec l\u2019\xE9lastique",
    level: "Tous niveaux",
    mins: 13,
    focus: "Jambes \xB7 dos \xB7 \xE9paules",
    keys: ["squatPress", "tirElast", "presseElast", "marche", "pullApart"]
  },
  {
    id: "full-mb",
    cat: "fullbody",
    title: "Full body m\xE9decine ball",
    subtitle: "Puissance et gainage m\xE9decine ball",
    level: "Interm\xE9diaire",
    mins: 13,
    focus: "Explosivit\xE9 \xB7 tronc \xB7 jambes",
    keys: ["mbSlam", "mbSquat", "mbChop", "mbTwist", "ours"]
  },
  {
    id: "mob-reveil",
    cat: "mobilite",
    title: "R\xE9veil articulaire",
    subtitle: "Mobiliser tout le corps en douceur le matin",
    level: "Tous niveaux",
    mins: 10,
    focus: "Chevilles \xB7 hanches \xB7 dos \xB7 \xE9paules",
    restSecs: 10, keys: ["ankleCircles", "hipCars", "chatVache", "openBook", "shoulderCircles", "deepSquatShift"]
  },
  {
    id: "mob-prerun",
    cat: "mobilite",
    title: "Avant de courir",
    subtitle: "Pr\xE9parer chevilles et hanches \xE0 l\u2019effort",
    level: "Tous niveaux",
    mins: 10,
    focus: "Chevilles \xB7 hanches \xB7 ischios",
    restSecs: 10, keys: ["ankleCircles", "cheville", "legSwingF", "lungeOsc", "nineNinety", "deepSquatShift"]
  },
  {
    id: "mob-dos10",
    cat: "mobilite",
    title: "Dos & \xE9paules express",
    subtitle: "Rel\xE2cher dos et \xE9paules (posture, bureau)",
    level: "Tous niveaux",
    mins: 10,
    focus: "Dos \xB7 thorax \xB7 \xE9paules",
    restSecs: 10, keys: ["chatVache", "openBook", "threadNeedle", "wallSlides", "pecStretch", "upperTrap"]
  },
  {
    id: "mob-hanches15",
    cat: "mobilite",
    title: "Hanches & ischios",
    subtitle: "Gagner en souplesse du bas du corps",
    level: "Tous niveaux",
    mins: 15,
    focus: "Hanches \xB7 ischios \xB7 adducteurs",
    restSecs: 10, keys: ["legSwingF", "lungeOsc", "wallHamstring", "bandHamstring", "frog", "nineNinety", "pigeon", "hipOpenerAssisted"]
  },
  {
    id: "mob-dos15",
    cat: "mobilite",
    title: "Dos & thorax",
    subtitle: "Mobiliser la colonne et ouvrir le thorax",
    level: "Tous niveaux",
    mins: 15,
    focus: "Dos \xB7 thorax \xB7 lombaires",
    restSecs: 10, keys: ["chatVache", "pelvicTilt", "openBook", "threadNeedle", "tSpineRoll", "sphinx", "rotThorax", "supineTwist"]
  },
  {
    id: "mob-epaules15",
    cat: "mobilite",
    title: "\u00c9paules & posture",
    subtitle: "Mobilit\xE9 d\u2019\xE9paule et ouverture de poitrine",
    level: "Tous niveaux",
    mins: 15,
    focus: "\u00c9paules \xB7 pectoraux \xB7 haut du dos",
    restSecs: 10, keys: ["shoulderCircles", "wallSlides", "passThrough", "ytw", "pecStretch", "ballPec", "extRotBand", "crossBody"]
  },
  {
    id: "mob-complete20",
    cat: "mobilite",
    title: "Mobilit\xE9 compl\xE8te",
    subtitle: "Routine corps entier, des pieds aux \xE9paules",
    level: "Tous niveaux",
    mins: 20,
    focus: "Corps entier",
    restSecs: 10, keys: ["ankleCircles", "cheville", "legSwingF", "hipCars", "lungeOsc", "nineNinety", "frog", "chatVache", "openBook", "tSpineRoll", "wallSlides", "pecStretch", "worldGreatest"]
  },
  {
    id: "mob-bas20",
    cat: "mobilite",
    title: "Bas du corps (coureur)",
    subtitle: "Chevilles, hanches, ischios et adducteurs en profondeur",
    level: "Interm\xE9diaire",
    mins: 20,
    focus: "Chevilles \xB7 hanches \xB7 ischios \xB7 adducteurs",
    restSecs: 10, keys: ["cheville", "bandCalf", "legSwingF", "lungeOsc", "wallHamstring", "bandHamstring", "frog", "cossack", "pigeon", "figure4Wall", "ballGlute", "wallStraddle"]
  },
  {
    id: "mob-recup20",
    cat: "mobilite",
    title: "R\xE9cup au rouleau",
    subtitle: "Rel\xE2cher au rouleau et \xE9tirer en douceur le soir",
    level: "Tous niveaux",
    mins: 20,
    focus: "Rouleau \xB7 \xE9tirements \xB7 respiration",
    restSecs: 10, keys: ["rollMollet", "rollQuad", "rollFess", "rollDos", "rollPlante", "legsUp", "wallStraddle", "supineTwist", "threadNeedle", "respiration"]
  },
  // --- Bibliothèque étirements par zone ---
  { id: "etir-cou", cat: "mobilite", title: "Cou & épaules", subtitle: "Étirements du cou, des épaules et de la poitrine", level: "Tous niveaux", focus: "Cou & épaules", etir: true, restSecs: 10, keys: ["etNeckFlex", "etNeckExt", "coup", "etNeckRot", "upperTrap", "etLevScap", "shoulderCircles", "etArmsCross", "pecStretch", "etPecDoor", "crossBody", "etTricepsOH", "etLatWall", "etShoulderBack", "etBicepsWall", "etUpperBackSit", "etNeckBand", "passThrough", "etPecBand", "etTricepsBand"] },
  { id: "etir-tronc", cat: "mobilite", title: "Colonne & tronc", subtitle: "Étirements de la colonne, du dos et des flancs", level: "Tous niveaux", focus: "Colonne & tronc", etir: true, restSecs: 10, keys: ["chatVache", "etChildPose", "etChildSide", "openBook", "rotThorax", "etTSpineWall", "etFlankStand", "etFlankWall", "pont", "respiration", "supineTwist", "etSeatedTwist", "etObliques", "etLatSit", "etBackWall", "pelvicTilt", "etKneesChest", "etLowBackLunge", "etSidePrayer", "etIntercostal"] },
  { id: "etir-hanches", cat: "mobilite", title: "Hanches & bassin", subtitle: "Étirements des hanches, fessiers et adducteurs", level: "Tous niveaux", focus: "Hanches & bassin", etir: true, restSecs: 10, keys: ["fente", "etLowLungeWall", "etCouch", "etQuadStand", "etQuadWall", "pigeon", "figure4Wall", "nineNinety", "et9090Lean", "frog", "etButterfly", "etGroinStand", "ballGlute", "etGluteMed", "etHipFlexArms", "etHipBand", "etHipOpenWall", "etCrossPelvis", "wallStraddle"] },
  { id: "etir-jambes", cat: "mobilite", title: "Jambes, genoux & chevilles", subtitle: "Étirements ischios, quadriceps, mollets et chevilles", level: "Tous niveaux", focus: "Jambes, genoux & chevilles", etir: true, restSecs: 10, keys: ["ischio", "etHamSit", "wallHamstring", "etCalfWallStraight", "etCalfWallBent", "etTibAnt", "etKneeWall", "ankleCircles", "etPlantarFlex", "etDorsiflex", "etCalfStep", "etTowelFoot", "etToes", "bandHamstring", "etHamFloss", "bandCalf", "etRunnerLunge", "etDeepLunge", "deepSquatHold", "etSquatAssist"] },
  { id: "etir-bras", cat: "mobilite", title: "Bras, poignets & mains", subtitle: "Étirements des bras, avant-bras et poignets", level: "Tous niveaux", focus: "Bras, poignets & mains", etir: true, restSecs: 10, keys: ["etWristFlex", "etWristExt", "wristCircles", "forearmStretch", "etForearmExt", "etFingersOpen", "etFingersWall", "etBicepsWall2", "etTricepsWall", "crossBody", "etForearmBand", "passThrough", "etPecBand2", "extRotBand", "wallSlides"] },
  { id: "etir-flow", cat: "mobilite", title: "Étirements globaux & flows", subtitle: "Enchaînements d'étirements corps entier", level: "Tous niveaux", focus: "Étirements globaux & flows", etir: true, restSecs: 10, keys: ["sunSal", "etFullWall", "worldGreatest", "etLatComplete", "secousse"] },
  // --- Bibliothèque renforcement par zone ---
  { id: "renf-jambes", cat: "renfo", title: "Jambes & fessiers", subtitle: "Squats, fentes, fessiers et chaîne inférieure", level: "Tous niveaux", focus: "Jambes & fessiers", renf: true, keys: ["squat", "rfSumo", "squatJump", "wallSit", "fentePoids", "rfLungeBack", "rfWalkLunge", "rfLatLunge", "rfBulgarian", "rfStepUp", "rfStepUpKnee", "rfHipThrust", "pont", "pontUni", "rfKickback", "rfDonkey", "rfFireHydrant", "coquille", "rfRDL", "goodMorning", "rfBulgarianExpl", "rfSquatPulse", "rfWallSitCalf", "rfPistolAssist", "cossack"] },
  { id: "renf-tronc", cat: "renfo", title: "Dos & tronc", subtitle: "Gainage, abdominaux et lombaires", level: "Tous niveaux", focus: "Dos & tronc", renf: true, keys: ["gainage", "rfPlankHigh", "gainageLat", "rfReverseBridge", "deadbug", "birddog", "mountain", "rfCrunch", "rfCrunchObl", "rfLegRaise", "rfHollow", "superman", "rfLumbarExt", "rfShoulderTap", "rfPlankWalk", "rfRussianTwist", "mbChop", "rfPlankLegLift", "gainageDyn", "rfSidePlankDip"] },
  { id: "renf-pecs", cat: "renfo", title: "Pectoraux & épaules", subtitle: "Pompes, dips et épaules", level: "Tous niveaux", focus: "Pectoraux & épaules", renf: true, keys: ["pompes", "rfPushKnee", "rfPushIncline", "rfPushDecline", "rfPushClose", "rfPushWide", "rfPushDiamond", "rfDipsBench", "dips", "presseElast", "rfLatRaise", "rfFrontRaise", "rfRearDelt", "rfPikePush", "rfHinduPush", "rfWallPush", "rfShoulderTap", "rfBenchFloor", "rfPullover", "rfHandstandWall"] },
  { id: "renf-dos", cat: "renfo", title: "Dos, tirage & bras", subtitle: "Tractions, rowing, biceps et triceps", level: "Tous niveaux", focus: "Dos, tirage & bras", renf: true, keys: ["rfPullup", "rfPullupAssist", "rfPullupNeg", "rfInvRow", "tirElast", "rfRowOneArm", "rfCurl", "rfHammer", "rfCurlConc", "rfCurlBand", "rfTricepsOH", "rfTricepsKick", "rfDipsTriceps", "rfPushTriceps", "rfFacePull", "rfShrug", "rfUprightRow", "pullApart", "rfPulloverFloor", "rfSupermanPull"] },
  { id: "renf-stab", cat: "renfo", title: "Mollets, avant-bras & stabilité", subtitle: "Mollets, grip, port de charge et gainage debout", level: "Tous niveaux", focus: "Mollets, avant-bras & stabilité", renf: true, keys: ["mollets", "rfCalfUni", "rfCalfStep", "molletAssis", "rfToeWalk", "rfHeelWalk", "rfFarmerHold", "rfFarmerWalk", "rfWristCurl", "rfRevWristCurl", "rfSqueeze", "rfHandPlank", "rfPlankMove", "rfSuitcase", "rfCoreBrace"] }
];

(function () {
  try {
    const valid = validateSessions(SESSIONS.slice(), EX);
    const okIds = new Set(valid.map(function (x) { return x.id; }));
    for (let i = SESSIONS.length - 1; i >= 0; i--) {
      if (!okIds.has(SESSIONS[i].id)) { SESSIONS.splice(i, 1); }
    }
  } catch (e) { try { console.warn("[data] validation sessions échouée", e); } catch (_) {} }
})();


export const RECOVERY = [
  { id: "rec-course", cat: "mobilite", title: "Apr\xE8s la course", subtitle: "Rel\xE2che jambes et hanches apr\xE8s un run", level: "Tous niveaux", focus: "Mollets \xB7 ischios \xB7 fessiers \xB7 hanches", keys: ["cheville", "ischio", "pigeon", "fente", "chatVache"], ctx: "course", note: "Apr\xE8s un run, cible les mollets, ischios et fl\xE9chisseurs : moins de courbatures, meilleure r\xE9cup." },
  { id: "rec-renfo", cat: "mobilite", title: "Apr\xE8s la muscu", subtitle: "\xC9tirements complets post-renforcement", level: "Tous niveaux", focus: "Dos \xB7 \xE9paules \xB7 jambes", keys: ["rotThorax", "pigeon", "ischio", "chatVache", "coup"], ctx: "renfo", note: "Apr\xE8s une s\xE9ance de force, d\xE9tends tout le corps pour relancer la circulation et rel\xE2cher les tensions." },
  { id: "rec-express", cat: "mobilite", title: "R\xE9cup express", subtitle: "5 minutes pour d\xE9compresser", level: "Tous niveaux", focus: "Nuque \xB7 dos \xB7 ischios", keys: ["coup", "chatVache", "ischio"], ctx: "express", note: "Court mais efficace, \xE0 faire \xE0 chaud juste apr\xE8s l\u2019effort." },
  { id: "rec-rouleau", cat: "mobilite", title: "Rouleau \xB7 auto-massage", subtitle: "Foam rolling des muscles sollicit\xE9s", level: "Tous niveaux", focus: "Mollets \xB7 quadris \xB7 fessiers \xB7 dos \xB7 pieds", keys: ["rollMollet", "rollQuad", "rollFess", "rollDos", "rollPlante"], ctx: "rouleau", note: "Au rouleau (ou une balle) : rel\xE2che les principaux muscles apr\xE8s l\u2019effort, sans appuyer sur les articulations ni le bas du dos." },
  { id: "rec-jambes", cat: "mobilite", title: "Jambes lourdes", subtitle: "Drainage et d\xE9tente des jambes", level: "Tous niveaux", focus: "Mollets \xB7 retour veineux", keys: ["legsUp", "secousse", "cheville", "ischio"], ctx: "jambes", note: "Le soir ou apr\xE8s une sortie longue : jambes en l\u2019air et rel\xE2chement pour des jambes plus l\xE9g\xE8res." },
  { id: "rec-detente", cat: "mobilite", title: "D\xE9tente avant le sommeil", subtitle: "Respiration + \xE9tirements doux", level: "Tous niveaux", focus: "Respiration \xB7 dos \xB7 hanches", keys: ["respiration", "chatVache", "pigeon", "coup"], ctx: "sommeil", note: "Une routine calme pour faire redescendre le syst\xE8me nerveux et mieux dormir \u2014 le sommeil est la meilleure r\xE9cup." },
  { id: "rec-velo", cat: "mobilite", title: "Apr\xE8s le v\xE9lo", subtitle: "Hanches, dos et quadriceps apr\xE8s la selle", level: "Tous niveaux", focus: "Psoas \xB7 ischios \xB7 dos \xB7 quadriceps", keys: ["etHipFlexArms", "etCouch", "rotThorax", "etQuadStand", "chatVache"], ctx: "velo", note: "La position pli\xE9e prolong\xE9e raccourcit le psoas et tasse le dos : \xE9tire les fl\xE9chisseurs de hanche et ouvre la cage thoracique." },
  { id: "rec-natation", cat: "mobilite", title: "Apr\xE8s la natation", subtitle: "\u00c9paules et dos apr\xE8s les longueurs", level: "Tous niveaux", focus: "\u00c9paules \xB7 pectoraux \xB7 dos", keys: ["etPecDoor", "etLatWall", "etShoulderBack", "shoulderCircles", "etNeckRot"], ctx: "natation", note: "La rotation interne r\xE9p\xE9t\xE9e de l\u2019\xE9paule sollicite fort les rotateurs : \xE9tire pectoraux et dorsaux pour limiter le risque de conflit sous-acromial." },
  { id: "rec-escalade", cat: "mobilite", title: "Apr\xE8s l\u2019escalade", subtitle: "Avant-bras et doigts apr\xE8s la grimpe", level: "Tous niveaux", focus: "Avant-bras \xB7 doigts \xB7 \xE9paules", keys: ["etForearmExt", "etForearmBand", "etFingersOpen", "etFingersWall", "etLatWall"], ctx: "escalade", note: "Les prises en tension statique fatiguent fl\xE9chisseurs et extenseurs des avant-bras : \xE9tire-les pour limiter le risque d\u2019\xE9picondylite." },
  { id: "rec-foot", cat: "mobilite", title: "Apr\xE8s le foot / sports co", subtitle: "Adducteurs et ischios apr\xE8s le match", level: "Tous niveaux", focus: "Adducteurs \xB7 ischios \xB7 mollets", keys: ["etGroinStand", "ischio", "etCalfStep", "pigeon", "etHipOpenWall"], ctx: "foot", note: "Sprints, changements de direction et frappes sollicitent fort adducteurs et ischios : les \xE9tirer r\xE9duit le risque de claquage." },
  { id: "rec-raquette", cat: "mobilite", title: "Apr\xE8s tennis / padel / badminton", subtitle: "\xC9paule dominante et tronc", level: "Tous niveaux", focus: "\xC9paule \xB7 avant-bras \xB7 tronc", keys: ["etTricepsWall", "etForearmExt", "rotThorax", "etLatWall", "crossBody"], ctx: "raquette", note: "Le geste asym\xE9trique r\xE9p\xE9t\xE9 surcharge l\u2019\xE9paule dominante et le poignet : \xE9tire-les et r\xE9\xE9quilibre le tronc en rotation." },
  { id: "rec-souplesse", cat: "mobilite", title: "Apr\xE8s yoga / danse", subtitle: "R\xE9cup\xE9ration myofasciale douce", level: "Tous niveaux", focus: "Corps entier \xB7 d\xE9tente", keys: ["sphinx", "supineTwist", "threadNeedle", "respiration", "etChildPose"], ctx: "souplesse", note: "M\xEAme apr\xE8s une pratique souple, le corps a travaill\xE9 en amplitude : une d\xE9tente douce favorise la r\xE9cup\xE9ration myofasciale." },
  { id: "rec-trail", cat: "mobilite", title: "Apr\xE8s trail / rando", subtitle: "Quadriceps et chevilles apr\xE8s la descente", level: "Tous niveaux", focus: "Quadriceps \xB7 chevilles \xB7 mollets", keys: ["etQuadStand", "ankleCircles", "etCalfWallBent", "rollQuad", "figure4Wall"], ctx: "trail", note: "Les descentes prolong\xE9es sollicitent les quadriceps en excentrique et fatiguent les chevilles : \xE9tire et masse pour acc\xE9l\xE9rer la r\xE9cup\xE9ration." },
  { id: "rec-combat", cat: "mobilite", title: "Apr\xE8s sports de combat", subtitle: "Hanches, cou et \xE9paules apr\xE8s les frappes", level: "Tous niveaux", focus: "Hanches \xB7 cou \xB7 \xE9paules", keys: ["etHipOpenWall", "etNeckRot", "etShoulderBack", "pigeon", "rotThorax"], ctx: "combat", note: "Rotations de hanche et frappes r\xE9p\xE9t\xE9es tendent hanches et cou : une routine cibl\xE9e limite raideurs et compensations." }
];


export const ZONES = {
  post: { label: "Chaîne postérieure", short: "Ischios & dos", q: "Debout, jambes tendues, penche-toi vers le sol. Tes mains arrivent :", opts: ["À mi-tibias", "Aux chevilles", "Paumes au sol"], corr: ["ischio", "chatVache", "pont"], cat: "mobilite", fix: "Chaîne postérieure" },
  hanches: { label: "Hanches", short: "Profondeur de squat", q: "En squat profond, talons au sol, tu te sens :", opts: ["Talons décollent / je bascule", "Correct mais tendu", "Profond et stable"], corr: ["fente", "pigeon", "cheville", "squat"], cat: "mobilite", fix: "Ouverture des hanches" },
  epaules: { label: "Épaules", short: "Mobilité bras", q: "Mains jointes dans le dos (une par le haut, une par le bas) :", opts: ["Loin l’une de l’autre", "Les doigts se frôlent", "Les mains s’attrapent"], corr: ["rotThorax", "dips", "pompes"], cat: "mobilite", fix: "Mobilité des épaules" },
  flechisseurs: { label: "Fléchisseurs de hanche", short: "Avant de cuisse", q: "En fente basse, l’avant de la hanche arrière :", opts: ["Tire fort, inconfortable", "Étirement modéré", "Souple, peu de tension"], corr: ["fente", "pont", "pigeon"], cat: "mobilite", fix: "Fléchisseurs de hanche" },
  thoracique: { label: "Colonne thoracique", short: "Rotation du buste", q: "Assis, bras croisés, tu tournes le buste. La rotation est :", opts: ["Faible et raide", "Moyenne", "Ample et fluide"], corr: ["rotThorax", "chatVache", "superman"], cat: "mobilite", fix: "Colonne thoracique" },
  nuque: { label: "Nuque & cervicales", short: "Cou", q: "Tu tournes la tête et inclines l’oreille vers l’épaule :", opts: ["Limitée, ça tire", "Correcte", "Ample, sans gêne"], corr: ["coup", "rotThorax"], cat: "mobilite", fix: "Nuque & cervicales" },
  chevilles: { label: "Chevilles", short: "Flexion cheville", q: "Genou vers l’avant au-dessus des orteils, talon au sol :", opts: ["Talon décolle vite", "Amplitude moyenne", "Genou loin devant, stable"], corr: ["cheville", "squat"], cat: "mobilite", fix: "Chevilles" },
  core: { label: "Gainage & tronc", short: "Stabilité", q: "En planche sur les avant-bras, tu tiens :", opts: ["Moins de 20 s", "20 à 45 s", "Plus de 45 s, gainé"], corr: ["gainage", "superman", "mountain", "pont"], cat: "renfo", fix: "Gainage & stabilité" },
  equilibre: { label: "Équilibre", short: "Contrôle sur 1 jambe", q: "En équilibre sur une jambe, yeux ouverts, tu tiens :", opts: ["Quelques secondes", "~20 s avec oscillations", "Stable, plus de 30 s"], corr: ["fentesA", "squat", "cheville"], cat: "renfo", fix: "Équilibre & contrôle" }
}
export const ZONE_ORDER = ["post", "hanches", "flechisseurs", "thoracique", "epaules", "nuque", "chevilles", "core", "equilibre"]

export function sessionExercises(s) {
  if (!s) return []
  return buildBlocks(s.keys, { sets: s.sets || 1, restSecs: s.restSecs || 0, cat: s.cat })
}
export function sessionDuration(s) {
  const blocks = sessionExercises(s)
  const secs = blocks.reduce((a, b) => a + (b.type === "hold" ? b.secs : b.reps * 3) + 6, 0)
  return Math.round(secs / 60)
}
// Les routines composées par l'utilisateur ont la forme d'une séance : le
// lecteur les joue sans rien savoir de plus. Elles sont donc cherchées ici
// comme les autres, sinon une routine ne serait qu'une liste inerte.
export function getSession(id, program, routines) {
  let s = SESSIONS.find((x) => x.id === id)
  if (s) return s
  s = RECOVERY.find((x) => x.id === id)
  if (s) return s
  if (program && program.sessions) {
    s = program.sessions.find((x) => x.id === id)
    if (s) return s
  }
  if (Array.isArray(routines)) {
    s = routines.find((x) => x && x.id === id)
    if (s) return s
  }
  return null
}

export const SPORTS = [
  { id: "course", label: "Course \xE0 pied", ic: "route", focus: "Cha\xEEne post\xE9rieure \xB7 mollets \xB7 genoux", sessions: ["renfo-post", "renfo-bas", "renfo-hanches", "renfo-core"], recovery: ["rec-course", "rec-jambes", "rec-rouleau"], plyo: ["plyo-appuis", "plyo-jambes"], tip: "Renforce mollets et fessiers et progresse la charge en douceur (p\xE9riostite, tendinopathies)." },
  { id: "demi", label: "Demi-fond / piste", ic: "route", focus: "Foul\xE9e \xB7 explosivit\xE9 \xB7 gainage", sessions: ["renfo-post", "renfo-core2", "full-circuit"], recovery: ["rec-course", "rec-jambes"], plyo: ["plyo-reactif", "plyo-jambes", "plyo-avance"], tip: "Pliom\xE9trie r\xE9active et gainage pour une foul\xE9e plus efficace." },
  { id: "fond", label: "Fond / marathon", ic: "route", focus: "Endurance de force \xB7 \xE9conomie de course", sessions: ["renfo-post", "renfo-hanches", "renfo-core"], recovery: ["rec-course", "rec-jambes", "rec-rouleau"], plyo: ["plyo-appuis"], tip: "Endurance de force des mollets/fessiers et grosse r\xE9cup sur les semaines charg\xE9es." },
  { id: "trail", label: "Trail", ic: "mountain", focus: "Descentes \xB7 chevilles \xB7 endurance de force", sessions: ["renfo-bas", "renfo-hanches", "renfo-post"], recovery: ["rec-trail", "rec-jambes"], plyo: ["plyo-jambes", "plyo-appuis"], tip: "Quadriceps en excentrique et stabilit\xE9 de cheville pour encaisser les descentes." },
  { id: "marche", label: "Marche / randonn\xE9e", ic: "mountain", focus: "Jambes \xB7 dos \xB7 chevilles", sessions: ["renfo-bas", "renfo-hanches", "renfo-core"], recovery: ["rec-jambes", "rec-rouleau"], plyo: [], tip: "Renforce jambes et dos ; soigne les chevilles pour les terrains accident\xE9s." },
  { id: "perche", label: "Saut \xE0 la perche", ic: "bolt", focus: "\u00c9paules \xB7 gainage \xB7 sprint", sessions: ["renfo-core2", "renfo-haut", "full-circuit"], recovery: ["rec-renfo", "rec-detente"], plyo: ["plyo-avance", "plyo-reactif", "plyo-haut"], tip: "Gainage anti-extension, \xE9paules (overhead) et sprint explosif." },
  { id: "sprint", label: "Sprint / vitesse", ic: "bolt", focus: "Explosivit\xE9 \xB7 ischios \xB7 foul\xE9e", sessions: ["renfo-post", "renfo-bas", "renfo-core2"], recovery: ["rec-jambes", "rec-renfo"], plyo: ["plyo-reactif", "plyo-avance", "plyo-jambes"], tip: "Ischios costauds et pliom\xE9trie r\xE9active pour la vitesse pure." },
  { id: "saut", label: "Sauts (longueur / hauteur)", ic: "bolt", focus: "D\xE9tente \xB7 gainage \xB7 appuis", sessions: ["renfo-bas", "renfo-core2", "full-circuit"], recovery: ["rec-jambes", "rec-renfo"], plyo: ["plyo-jambes", "plyo-avance", "plyo-reactif"], tip: "D\xE9tente verticale/horizontale via pliom\xE9trie, gainage et appuis." },
  { id: "lancers", label: "Lancers", ic: "ball", focus: "Puissance tronc \xB7 \xE9paules \xB7 rotation", sessions: ["renfo-haut", "renfo-core2", "renfo-mb"], recovery: ["rec-renfo", "rec-rouleau"], plyo: ["plyo-haut"], tip: "Puissance de rotation du tronc et \xE9paules ; m\xE9decine ball++." },
  { id: "escalade", label: "Escalade", ic: "dumbbell", focus: "Avant-bras \xB7 dos \xB7 antagonistes", sessions: ["renfo-haut", "renfo-core2", "renfo-core"], recovery: ["rec-escalade", "rec-rouleau"], plyo: ["plyo-haut"], tip: "Travaille les antagonistes (pecs, triceps, rotateurs) et le gainage pour \xE9quilibrer le grimpeur." },
  { id: "muscu", label: "Musculation", ic: "dumbbell", focus: "Force globale \xB7 gainage", sessions: ["renfo-haut", "renfo-bas", "renfo-core", "full-circuit"], recovery: ["rec-renfo", "rec-rouleau"], plyo: [], tip: "Alterne les groupes et soigne la r\xE9cup (rouleau, sommeil) entre les s\xE9ances." },
  { id: "crossfit", label: "Cross-training", ic: "dumbbell", focus: "Conditionnement \xB7 full body \xB7 explosivit\xE9", sessions: ["full-circuit", "renfo-haut", "renfo-bas", "renfo-core2"], recovery: ["rec-renfo", "rec-jambes", "rec-rouleau"], plyo: ["plyo-jambes", "plyo-haut", "plyo-reactif"], tip: "M\xE9lange full body, gainage et pliom\xE9trie ; g\xE8re bien le volume." },
  { id: "gym", label: "Gymnastique", ic: "bolt", focus: "Gainage \xB7 \xE9paules \xB7 explosivit\xE9", sessions: ["renfo-core2", "renfo-haut", "full-circuit"], recovery: ["rec-detente", "rec-renfo"], plyo: ["plyo-haut", "plyo-reactif"], tip: "Gainage maximal, \xE9paules solides et explosivit\xE9 contr\xF4l\xE9e." },
  { id: "velo", label: "V\xE9lo / cyclisme", ic: "route", focus: "Quadriceps \xB7 fessiers \xB7 dos", sessions: ["renfo-bas", "renfo-hanches", "renfo-core"], recovery: ["rec-velo", "rec-jambes"], plyo: [], tip: "Renforce fessiers et bas du dos pour compenser la position pench\xE9e." },
  { id: "vtt", label: "VTT", ic: "mountain", focus: "Jambes \xB7 gainage \xB7 haut du corps", sessions: ["renfo-bas", "renfo-core2", "renfo-haut"], recovery: ["rec-jambes", "rec-rouleau"], plyo: ["plyo-appuis"], tip: "Jambes + gainage + haut du corps pour absorber le terrain." },
  { id: "ski", label: "Ski / snowboard", ic: "mountain", focus: "Quadriceps \xB7 gainage \xB7 genoux", sessions: ["renfo-bas", "renfo-hanches", "renfo-core2"], recovery: ["rec-jambes", "rec-rouleau"], plyo: ["plyo-jambes", "plyo-appuis"], tip: "Quadriceps et gainage ; pr\xE9pare les genoux avant la saison." },
  { id: "skate", label: "Skate / roller", ic: "route", focus: "\xC9quilibre \xB7 jambes \xB7 chevilles", sessions: ["renfo-bas", "renfo-hanches", "renfo-core"], recovery: ["rec-jambes"], plyo: ["plyo-appuis", "plyo-reactif"], tip: "\xC9quilibre, jambes et chevilles solides pour les r\xE9ceptions." },
  { id: "natation", label: "Natation", ic: "wave", focus: "\u00c9paules \xB7 dos \xB7 gainage", sessions: ["renfo-haut", "renfo-core2", "renfo-core"], recovery: ["rec-natation", "rec-detente"], plyo: [], tip: "Mobilit\xE9 d\u2019\xE9paule et rotateurs pour prot\xE9ger l\u2019articulation." },
  { id: "aviron", label: "Aviron / kayak", ic: "wave", focus: "Dos \xB7 tirage \xB7 jambes", sessions: ["renfo-haut", "renfo-core", "renfo-bas"], recovery: ["rec-renfo", "rec-rouleau"], plyo: [], tip: "Dos et tirage puissants, jambes et gainage pour la propulsion." },
  { id: "surf", label: "Surf / paddle", ic: "wave", focus: "Gainage \xB7 \xE9paules \xB7 \xE9quilibre", sessions: ["renfo-core2", "renfo-haut", "renfo-hanches"], recovery: ["rec-detente", "rec-rouleau"], plyo: ["plyo-haut"], tip: "Gainage, \xE9paules et \xE9quilibre pour le pop-up et la rame." },
  { id: "raquette", label: "Tennis / padel / badminton", ic: "ball", focus: "Appuis \xB7 \xE9paule \xB7 rotation", sessions: ["renfo-hanches", "renfo-core2", "renfo-haut"], recovery: ["rec-raquette", "rec-jambes"], plyo: ["plyo-appuis", "plyo-reactif", "plyo-haut"], tip: "Appuis vifs, \xE9paule prot\xE9g\xE9e et rotation du tronc ; attention au coude." },
  { id: "combat", label: "Sports de combat", ic: "bolt", focus: "Explosivit\xE9 \xB7 gainage \xB7 hanches", sessions: ["renfo-core2", "full-circuit", "renfo-haut"], recovery: ["rec-combat", "rec-renfo"], plyo: ["plyo-reactif", "plyo-haut"], tip: "Explosivit\xE9, gainage et hanches ; r\xE9cup nerveuse importante." },
  { id: "football", label: "Football", ic: "ball", focus: "Appuis \xB7 ischios \xB7 genoux", sessions: ["renfo-hanches", "renfo-post", "full-circuit"], recovery: ["rec-foot", "rec-jambes"], plyo: ["plyo-appuis", "plyo-jambes", "plyo-reactif"], tip: "Renforce hanches/ischios et travaille les appuis pour prot\xE9ger genoux et chevilles." },
  { id: "basket", label: "Basket / hand / volley", ic: "ball", focus: "D\xE9tente \xB7 appuis \xB7 chevilles", sessions: ["renfo-bas", "renfo-core2", "full-circuit"], recovery: ["rec-jambes", "rec-renfo"], plyo: ["plyo-jambes", "plyo-avance", "plyo-reactif"], tip: "D\xE9tente et r\xE9ceptions ; renforce chevilles et quadriceps (sauts r\xE9p\xE9t\xE9s)." },
  { id: "rugby", label: "Rugby", ic: "ball", focus: "Puissance \xB7 gainage \xB7 explosivit\xE9", sessions: ["renfo-bas", "renfo-haut", "full-circuit"], recovery: ["rec-renfo", "rec-jambes"], plyo: ["plyo-jambes", "plyo-reactif"], tip: "Puissance globale, gainage et explosivit\xE9 ; grosse r\xE9cup apr\xE8s contacts." },
  { id: "danse", label: "Danse", ic: "heart", focus: "Gainage \xB7 jambes \xB7 mobilit\xE9", sessions: ["renfo-core2", "renfo-bas", "renfo-hanches"], recovery: ["rec-detente", "rec-jambes"], plyo: ["plyo-appuis", "plyo-reactif"], tip: "Gainage, jambes et mobilit\xE9 ; explosivit\xE9 l\xE9g\xE8re pour les sauts." },
  { id: "yoga", label: "Yoga / Pilates", ic: "heart", focus: "Gainage \xB7 mobilit\xE9 \xB7 contr\xF4le", sessions: ["renfo-core", "renfo-core2", "renfo-hanches"], recovery: ["rec-souplesse", "rec-detente"], plyo: [], tip: "Renforce le tronc en compl\xE9ment du travail de mobilit\xE9 et de contr\xF4le." },
  { id: "equitation", label: "\xC9quitation", ic: "route", focus: "Gainage \xB7 posture \xB7 jambes", sessions: ["renfo-core", "renfo-hanches", "renfo-core2"], recovery: ["rec-detente", "rec-jambes"], plyo: [], tip: "Gainage et posture pour l\u2019assiette, jambes et adducteurs." },
  { id: "fitness", label: "Renfo g\xE9n\xE9ral", ic: "dumbbell", focus: "Full body \xE9quilibr\xE9", sessions: ["full-circuit", "renfo-haut", "renfo-bas", "renfo-core"], recovery: ["rec-renfo", "rec-rouleau"], plyo: [], tip: "Alterne haut, bas et gainage pour progresser de fa\xE7on \xE9quilibr\xE9e." },
  { id: "triathlon", label: "Triathlon", ic: "wave", focus: "Endurance \xB7 jambes \xB7 \xE9paules", sessions: ["renfo-post", "renfo-bas", "renfo-haut", "renfo-core"], recovery: ["rec-jambes", "rec-rouleau", "rec-detente"], plyo: ["plyo-appuis"], tip: "Endurance globale : jambes, \xE9paules (natation) et grosse r\xE9cup entre les disciplines." },
  { id: "patinage", label: "Patinage / hockey", ic: "route", focus: "Jambes \xB7 hanches \xB7 \xE9quilibre", sessions: ["renfo-bas", "renfo-hanches", "renfo-core2"], recovery: ["rec-jambes", "rec-rouleau"], plyo: ["plyo-jambes", "plyo-appuis"], tip: "Puissance des jambes et hanches, \xE9quilibre et appuis lat\xE9raux." },
  { id: "escrime", label: "Escrime", ic: "bolt", focus: "Fentes \xB7 explosivit\xE9 \xB7 gainage", sessions: ["renfo-bas", "renfo-core2", "renfo-hanches"], recovery: ["rec-jambes", "rec-renfo"], plyo: ["plyo-reactif", "plyo-appuis"], tip: "Fentes explosives, gainage et r\xE9activit\xE9 des appuis." },
  { id: "golf", label: "Golf", ic: "ball", focus: "Rotation \xB7 gainage \xB7 \xE9paules", sessions: ["renfo-core2", "renfo-haut", "renfo-mb"], recovery: ["rec-detente", "rec-rouleau"], plyo: ["plyo-haut"], tip: "Puissance et contr\xF4le de la rotation du tronc ; \xE9paules et gainage." },
  { id: "tir", label: "Tir \xE0 l\u2019arc / tir", ic: "target", focus: "\u00c9paules \xB7 dos \xB7 gainage", sessions: ["renfo-haut", "renfo-core", "renfo-core2"], recovery: ["rec-detente"], plyo: [], tip: "Endurance des \xE9paules et du dos, gainage et stabilit\xE9." },
  { id: "pingpong", label: "Tennis de table", ic: "ball", focus: "Appuis \xB7 r\xE9activit\xE9 \xB7 gainage", sessions: ["renfo-hanches", "renfo-core2", "renfo-bas"], recovery: ["rec-jambes"], plyo: ["plyo-appuis", "plyo-reactif"], tip: "Appuis vifs, r\xE9activit\xE9 et gainage du tronc." },
  { id: "voile", label: "Voile / planche", ic: "wave", focus: "Gainage \xB7 dos \xB7 jambes", sessions: ["renfo-core", "renfo-haut", "renfo-bas"], recovery: ["rec-rouleau", "rec-detente"], plyo: [], tip: "Gainage isom\xE9trique, dos et jambes pour tenir la position." },
  { id: "callisthenie", label: "Callisth\xE9nie / street workout", ic: "dumbbell", focus: "Tractions \xB7 gainage \xB7 haut du corps", sessions: ["renfo-haut", "renfo-core2", "full-circuit"], recovery: ["rec-rouleau", "rec-renfo"], plyo: ["plyo-haut"], tip: "Force au poids du corps : haut du corps, gainage et contr\xF4le." },
  { id: "halterophilie", label: "Halt\xE9rophilie", ic: "dumbbell", focus: "Explosivit\xE9 \xB7 jambes \xB7 gainage", sessions: ["renfo-bas", "renfo-core2", "renfo-post"], recovery: ["rec-renfo", "rec-rouleau"], plyo: ["plyo-jambes", "plyo-avance"], tip: "Explosivit\xE9 des jambes, gainage solide et technique progressive." },
  { id: "trampoline", label: "Trampoline / acrobatie", ic: "bolt", focus: "Gainage \xB7 r\xE9ception \xB7 explosivit\xE9", sessions: ["renfo-core2", "renfo-bas", "full-circuit"], recovery: ["rec-jambes", "rec-detente"], plyo: ["plyo-jambes", "plyo-avance", "plyo-reactif"], tip: "Gainage, r\xE9ceptions contr\xF4l\xE9es et explosivit\xE9." },
  { id: "frisbee", label: "Ultimate / frisbee", ic: "ball", focus: "Course \xB7 appuis \xB7 gainage", sessions: ["renfo-hanches", "renfo-post", "full-circuit"], recovery: ["rec-jambes", "rec-course"], plyo: ["plyo-appuis", "plyo-reactif"], tip: "Course, changements d\u2019appui et gainage ; prot\xE8ge genoux/chevilles." },
  { id: "orientation", label: "Course d\u2019orientation", ic: "mountain", focus: "Endurance \xB7 chevilles \xB7 jambes", sessions: ["renfo-post", "renfo-bas", "renfo-hanches"], recovery: ["rec-course", "rec-jambes"], plyo: ["plyo-appuis"], tip: "Endurance et chevilles solides pour les terrains vari\xE9s." },
  { id: "plongee", label: "Plong\xE9e / apn\xE9e", ic: "wave", focus: "Respiration \xB7 gainage \xB7 mobilit\xE9", sessions: ["renfo-core", "renfo-core2", "renfo-hanches"], recovery: ["rec-detente", "rec-rouleau"], plyo: [], tip: "Gainage, mobilit\xE9 et travail respiratoire (coh\xE9rence) pour le calme." },
  { id: "petanque", label: "P\xE9tanque / bowling", ic: "ball", focus: "Dos \xB7 gainage \xB7 souplesse", sessions: ["renfo-core", "renfo-hanches"], recovery: ["rec-detente"], plyo: [], tip: "Soigne le dos et le gainage ; mobilit\xE9 pour les flexions r\xE9p\xE9t\xE9es." }
];

