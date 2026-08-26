import { openEpisode, regionLabel } from '../health/preventionIntel'
// ============================================================
// Routines toutes faites, et leur progression.
//
// Composer sa routine suppose de savoir quoi mettre dedans. Ces familles
// donnent un point de départ, et surtout une suite : chaque famille est
// une échelle de niveaux, du plus accessible au plus exigeant.
//
// La progression n'est pas automatique. Un niveau se propose quand le
// précédent a été fait assez souvent pour être maîtrisé, et pas avant :
// passer au niveau supérieur parce qu'une semaine s'est écoulée n'a aucun
// sens, alors que le faire après quatre séances en a un.
//
// L'ordre des niveaux n'est pas arbitraire, en pliométrie surtout. On
// commence par des appuis courts, qui construisent la raideur de cheville,
// puis les sauts à deux jambes, puis à une jambe, et les contrebas en
// dernier : ce sont eux qui produisent les forces les plus élevées, et les
// aborder trop tôt est la façon la plus courante de se blesser.
// ============================================================

const asList = (v) => (Array.isArray(v) ? v.filter((x) => x != null) : [])

// Nombre de fois qu'un niveau doit avoir été fait avant que le suivant se
// propose. Quatre, c'est assez pour que le geste soit installé sans que
// l'échelle devienne interminable.
export const SESSIONS_TO_UNLOCK = 4

export const TEMPLATE_FAMILIES = [
  {
    id: 'plyo-appuis',
    kind: 'pliometrie',
    label: 'Appuis et ressort',
    zones: ['chevilles', 'equilibre'],
    pain: [],
    prep: ['course', 'demi', 'fond', 'trail', 'sprint', 'basket'],
    intro: 'La pliométrie se construit du sol vers le haut : la raideur de cheville d’abord, les grandes amplitudes ensuite.',
    levels: [
      {
        label: 'Appuis courts',
        why: 'Contacts brefs, faible amplitude : on apprend à rebondir sans écraser la cheville. C’est la base de tout le reste.',
        sets: 2, restSecs: 45,
        keys: ['ankleHops', 'pogo', 'lineHops', 'latLineHops'],
      },
      {
        label: 'Sauts à deux jambes',
        why: 'On ajoute de l’amplitude, toujours sur deux appuis : le corps encaisse le double de la charge d’un appui simple, mais réparti.',
        sets: 3, restSecs: 60,
        keys: ['ankleHops', 'pogo', 'squatJump', 'cmJump', 'skater'],
      },
      {
        label: 'Projection et coordination',
        why: 'Fentes sautées et sauts en longueur : l’effort devient directionnel, et la réception demande du contrôle.',
        sets: 3, restSecs: 75,
        keys: ['pogo', 'squatJump', 'jumpLunge', 'broadJump', 'boxJumpLow'],
      },
      {
        label: 'Un seul appui',
        why: 'Toute la charge sur une jambe. C’est ce qui ressemble le plus à la course et au changement de direction — et ce qui exige les trois niveaux précédents.',
        sets: 3, restSecs: 90,
        keys: ['slHop', 'latBound', 'slLatBound', 'bounding', 'boxJumpMid'],
      },
      {
        label: 'Contrebas',
        why: 'Depth jump et drop jump produisent les forces les plus élevées de toute la pliométrie. Ils viennent en dernier, jamais fatigué, et en petites doses.',
        sets: 3, restSecs: 120,
        keys: ['depthJump', 'dropJump', 'slBounding', 'slBoxJump', 'hurdleHops'],
      },
    ],
  },
  {
    id: 'mob-hanches',
    kind: 'mobilite',
    label: 'Hanches',
    zones: ['hanches', 'flechisseurs'],
    pain: ['hanche', 'genou'],
    prep: ['course', 'velo', 'muscu', 'fond', 'trail'],
    intro: 'La hanche est l’articulation qui limite le plus souvent la course, le squat et la position assise prolongée.',
    levels: [
      {
        label: 'Déverrouillage',
        why: 'Amplitudes libres, sans contrainte : on réveille l’articulation avant de lui demander quoi que ce soit.',
        sets: 1, restSecs: 10,
        keys: ['fireHydrant', 'pelvicTilt', 'chatVache', 'fente'],
      },
      {
        label: 'Ouverture',
        why: 'On tient les positions plus longtemps et on entre dans l’amplitude : c’est là que le gain d’amplitude se produit.',
        sets: 1, restSecs: 15,
        keys: ['nineNinety', 'pigeon', 'etRunnerLunge', 'etGluteMed', 'ischio'],
      },
      {
        label: 'Amplitude contrôlée',
        why: 'Rotations actives et fentes profondes : on ne cherche plus seulement l’amplitude, mais la capacité à s’y tenir par ses propres muscles.',
        sets: 2, restSecs: 15,
        keys: ['hipCars', 'et9090Lean', 'etDeepLunge', 'cossack', 'etCouch'],
      },
      {
        label: 'Charge et fin d’amplitude',
        why: 'Élastique et positions extrêmes maintenues. Une amplitude qu’on ne peut pas contrôler sous charge ne sert pas en mouvement.',
        sets: 2, restSecs: 20,
        keys: ['etHipBand', 'hipOpenerAssisted', 'etHipOpenWall', 'cossack', 'etCrossPelvis'],
      },
    ],
  },
  {
    id: 'mob-haut',
    kind: 'mobilite',
    label: 'Épaules et thoracique',
    zones: ['epaules', 'thoracique', 'nuque'],
    pain: ['dos'],
    prep: ['natation', 'escalade', 'muscu', 'raquette', 'callisthenie'],
    intro: 'Le haut du dos et l’épaule se raidissent avec la position assise, et le manque se paie sur tout ce qui passe au-dessus de la tête.',
    levels: [
      {
        label: 'Déverrouillage',
        why: 'Cercles et bascules : de l’amplitude libre pour commencer, sans rien forcer.',
        sets: 1, restSecs: 10,
        keys: ['shoulderCircles', 'chatVache', 'etNeckRot', 'etShoulderBack'],
      },
      {
        label: 'Rotation thoracique',
        why: 'La rotation vient du haut du dos, pas du bas. La chercher là où elle doit se produire évite de la prendre sur les lombaires.',
        sets: 1, restSecs: 15,
        keys: ['rotThorax', 'etTSpineWall', 'supineTwist', 'etUpperBackSit', 'etLevScap'],
      },
      {
        label: 'Extension et passage au-dessus',
        why: 'Rouleau et dislocations : on ouvre l’extension thoracique, sans laquelle le bras ne monte pas droit.',
        sets: 2, restSecs: 15,
        keys: ['tSpineRoll', 'passThrough', 'etBackWall', 'rollDos', 'extRotBand'],
      },
      {
        label: 'Contrôle en fin d’amplitude',
        why: 'Élastique et positions tenues : la même amplitude, mais maintenue par les muscles plutôt que par la structure.',
        sets: 2, restSecs: 20,
        keys: ['extRotBand', 'passThrough', 'etForearmBand', 'etBicepsWall', 'tSpineRoll'],
      },
    ],
  },
  {
    id: 'mob-chevilles',
    kind: 'mobilite',
    label: 'Chevilles et pieds',
    zones: ['chevilles'],
    pain: ['cheville', 'pied', 'talon'],
    prep: ['course', 'trail', 'sprint', 'basket', 'raquette'],
    intro: 'La cheville commande la réception et la propulsion. Raide, elle reporte la contrainte sur le genou et le tendon d’Achille.',
    levels: [
      {
        label: 'Déverrouillage',
        why: 'Cercles et inversions : l’articulation retrouve ses amplitudes libres avant qu’on lui demande de porter.',
        sets: 1, restSecs: 10,
        keys: ['ankleCircles', 'ankleInv', 'cheville', 'alphabet'],
      },
      {
        label: 'Dorsiflexion',
        why: 'Genou au-dessus des orteils, talon au sol : c’est l’amplitude qui manque le plus souvent, et celle qui décide de la descente et du squat.',
        sets: 1, restSecs: 15,
        keys: ['etKneeWall', 'etDorsiflex', 'cheville', 'ankleInv', 'ankleCircles'],
      },
      {
        label: 'Amplitude sous charge',
        why: 'On entre dans l’amplitude en portant son poids. Une cheville souple sans charge ne l’est plus sous appui.',
        sets: 2, restSecs: 15,
        keys: ['etKneeWall', 'cossack', 'etDorsiflex', 'fente', 'cheville'],
      },
      {
        label: 'Contrôle et appui simple',
        why: 'La cheville travaille sur un pied, comme à la course. C’est le dernier barreau, et il suppose les trois autres.',
        sets: 2, restSecs: 20,
        keys: ['etKneeWall', 'cossack', 'ankleInv', 'etDorsiflex', 'alphabet'],
      },
    ],
  },
  {
    id: 'mob-posterieure',
    kind: 'mobilite',
    label: 'Chaîne postérieure',
    zones: ['post'],
    pain: ['ischio', 'jambe', 'dos'],
    prep: ['course', 'fond', 'demi', 'velo', 'aviron'],
    intro: 'Ischios, fessiers et bas du dos travaillent ensemble. Le manque d’un se paie sur les deux autres.',
    levels: [
      {
        label: 'Réveil',
        why: 'Bascules et chat-vache : on mobilise le bassin avant d’étirer quoi que ce soit — un ischio tiré sur un bassin bloqué ne s’allonge pas.',
        sets: 1, restSecs: 10,
        keys: ['pelvicTilt', 'chatVache', 'fireHydrant', 'supineTwist'],
      },
      {
        label: 'Ischios',
        why: 'Positions tenues, jambe tendue. C’est là que l’amplitude se gagne, à condition de ne pas arrondir le dos pour tricher.',
        sets: 1, restSecs: 15,
        keys: ['ischio', 'wallHamstring', 'etHamSit', 'etGluteMed', 'pelvicTilt'],
      },
      {
        label: 'Fessiers et bas du dos',
        why: 'On remonte la chaîne : le fessier et le piriforme referment souvent l’amplitude qu’on attribue aux ischios.',
        sets: 2, restSecs: 15,
        keys: ['pigeon', 'ballGlute', 'rollFess', 'etLowBackLunge', 'ischio'],
      },
      {
        label: 'Amplitude active',
        why: 'Élastique et flossing : la même amplitude, tenue par les muscles. C’est celle qui sert en course.',
        sets: 2, restSecs: 20,
        keys: ['bandHamstring', 'etHamFloss', 'wallHamstring', 'rollFess', 'pigeon'],
      },
    ],
  },
  {
    id: 'plyo-lateral',
    kind: 'pliometrie',
    label: 'Changements de direction',
    zones: ['equilibre', 'chevilles'],
    pain: [],
    prep: ['football', 'basket', 'raquette', 'rugby', 'frisbee', 'combat'],
    intro: 'Les sports de terrain ne se jouent pas en ligne droite. Freiner et repartir de côté est ce qui blesse, et ce qui s’entraîne.',
    levels: [
      {
        label: 'Appuis latéraux',
        why: 'Sauts courts de côté, faible amplitude : le pied apprend à encaisser une force qui ne vient pas de l’avant.',
        sets: 2, restSecs: 45,
        keys: ['latLineHops', 'lineHops', 'ankleHops', 'quadrantHops'],
      },
      {
        label: 'Bonds latéraux',
        why: 'On allonge le bond. La réception se fait sur un pied, genou aligné sur la pointe — c’est le geste à protéger.',
        sets: 3, restSecs: 60,
        keys: ['skater', 'latBound', 'quadrantHops', 'latLineHops', 'squatJump'],
      },
      {
        label: 'Un appui, latéral',
        why: 'Toute la charge sur une jambe, de côté. C’est la situation exacte du changement d’appui en match.',
        sets: 3, restSecs: 75,
        keys: ['slLatBound', 'slHop', 'skater', 'latBound', 'hurdleHops'],
      },
      {
        label: 'Réactivité',
        why: 'Contact au sol le plus court possible, dans toutes les directions. À faire frais, jamais en fin de séance.',
        sets: 3, restSecs: 90,
        keys: ['quadrantHops', 'slLatBound', 'hurdleHops', 'dropJump', 'slBounding'],
      },
    ],
  },
  {
    id: 'mob-buste',
    kind: 'mobilite',
    label: 'Poignets, coudes et cou',
    zones: ['nuque', 'epaules'],
    pain: [],
    prep: ['muscu', 'escalade', 'callisthenie', 'gym', 'crossfit', 'halterophilie'],
    intro: 'Les articulations qu’on ne prépare jamais, et qui lâchent en premier quand on se met à porter son poids sur les mains.',
    levels: [
      {
        label: 'Réveil',
        why: 'Cercles de poignet et rotations du cou : quelques amplitudes libres coûtent moins qu’une tendinite.',
        sets: 1, restSecs: 10,
        keys: ['wristCircles', 'etNeckRot', 'shoulderCircles', 'etLevScap'],
      },
      {
        label: 'Mise en charge des poignets',
        why: 'On commence à porter du poids sur les mains, progressivement. Le poignet s’adapte, mais lentement.',
        sets: 2, restSecs: 15,
        keys: ['wristCircles', 'etForearmBand', 'bearCrawl', 'etBicepsWall', 'etNeckBand'],
      },
      {
        label: 'Coudes et avant-bras',
        why: 'Élastique et positions tenues : l’avant-bras encaisse tout ce que la main tient, en escalade comme en musculation.',
        sets: 2, restSecs: 20,
        keys: ['etForearmBand', 'etBicepsWall2', 'extRotBand', 'wristCircles', 'etNeckBand'],
      },
      {
        label: 'Cou et posture haute',
        why: 'Le cou paie la position penchée et le port de charge au-dessus de la tête. On le renforce en amplitude, pas en l’étirant seulement.',
        sets: 2, restSecs: 20,
        keys: ['etNeckBand', 'etNeckRot', 'etLevScap', 'etUpperBackSit', 'etBackWall'],
      },
    ],
  },
]

export function familyById(id) {
  return TEMPLATE_FAMILIES.find((f) => f.id === id) || null
}

export function familiesFor(kind) {
  return TEMPLATE_FAMILIES.filter((f) => f.kind === kind)
}

// Identifiant d'une routine issue d'un modèle : il porte sa famille et son
// niveau, ce qui permet de compter les séances faites à ce niveau sans
// tenir un registre séparé.
export function templateId(familyId, levelIndex) {
  return `tpl_${familyId}_${levelIndex}`
}

export function parseTemplateId(id) {
  const m = /^tpl_(.+)_(\d+)$/.exec(String(id || ''))
  if (!m) return null
  const family = familyById(m[1])
  if (!family) return null
  const level = Number(m[2])
  if (!Number.isFinite(level) || level < 0 || level >= family.levels.length) return null
  return { family, level }
}

// Un modèle devient une routine ordinaire : même forme, donc jouable par le
// lecteur et affichable à l'accueil sans traitement particulier.
export function templateRoutine(familyId, levelIndex, { dows } = {}) {
  const family = familyById(familyId)
  if (!family) return null
  const lvl = family.levels[levelIndex]
  if (!lvl) return null
  return {
    id: templateId(familyId, levelIndex),
    custom: false,
    template: true,
    family: familyId,
    level: levelIndex,
    kind: family.kind,
    cat: family.kind === 'pliometrie' ? 'plyo' : 'mobilite',
    name: `${family.label} — ${lvl.label}`,
    why: lvl.why,
    keys: lvl.keys.slice(),
    sets: lvl.sets,
    restSecs: lvl.restSecs,
    dows: asList(dows),
  }
}

function countDone(db, id) {
  const log = (db && db.routineLog) || {}
  let n = 0
  for (const d of Object.keys(log)) if (asList(log[d]).includes(id)) n++
  return n
}

// Où en est-on dans une famille : le niveau en cours, ce qu'il reste à faire
// avant le suivant, et si le suivant est atteint.
export function familyProgress(db, familyId) {
  const family = familyById(familyId)
  if (!family) return null
  const levels = family.levels.map((lvl, i) => ({
    index: i, label: lvl.label, why: lvl.why,
    done: countDone(db, templateId(familyId, i)),
  }))
  // Le niveau courant est le premier qui n'a pas été fait assez de fois.
  let current = levels.findIndex((l) => l.done < SESSIONS_TO_UNLOCK)
  if (current === -1) current = levels.length - 1
  const next = current + 1 < levels.length ? current + 1 : null
  const cur = levels[current]
  const remaining = Math.max(0, SESSIONS_TO_UNLOCK - cur.done)
  const complete = levels.every((l) => l.done >= SESSIONS_TO_UNLOCK)
  return {
    family, levels, current, next, remaining, complete,
    totalDone: levels.reduce((a, l) => a + l.done, 0),
    text: complete
      ? `Tous les niveaux de « ${family.label} » ont été travaillés. Reprendre le dernier reste utile : la pliométrie et la mobilité s'entretiennent, elles ne s'acquièrent pas une fois pour toutes.`
      : remaining > 0
        ? `Encore ${remaining} séance${remaining > 1 ? 's' : ''} à ce niveau avant de proposer « ${family.levels[current].label === cur.label && next != null ? family.levels[next].label : cur.label} ».`
        : null,
  }
}

// Ce qu'on propose maintenant : pour chaque famille, le niveau en cours,
// avec la mention du niveau débloqué le cas échéant.
export function suggestions(db, { kind } = {}) {
  const fams = kind ? familiesFor(kind) : TEMPLATE_FAMILIES
  return fams.map((f) => {
    const p = familyProgress(db, f.id)
    const routine = templateRoutine(f.id, p.current)
    const justUnlocked = p.current > 0 && p.levels[p.current].done === 0
    return {
      family: f, progress: p, routine,
      levelLabel: f.levels[p.current].label,
      levelNumber: p.current + 1,
      levelCount: f.levels.length,
      justUnlocked,
      note: justUnlocked
        ? `Niveau débloqué : tu as fait ${SESSIONS_TO_UNLOCK} fois « ${f.levels[p.current - 1].label} ».`
        : p.text,
    }
  })
}

// Toutes les routines modèles, pour que le lecteur les retrouve comme les
// routines composées à la main : sans cela, un modèle ne serait pas jouable.
export function allTemplateRoutines() {
  const out = []
  for (const f of TEMPLATE_FAMILIES) {
    f.levels.forEach((lvl, i) => { out.push(templateRoutine(f.id, i)) })
  }
  return out
}

// ─── Ce qu'il te faut aujourd'hui ───────────────────────────
//
// Choisir sa routine suppose de savoir ce qui coince. L'application le
// sait déjà : le dernier test de mobilité dit quelles zones sont raides,
// le profil dit lesquelles sont sensibles, la prévention dit s'il y a une
// douleur en cours, et le planning dit ce qui est prévu aujourd'hui.
//
// Ces quatre sources sont croisées pour ranger les familles par utilité,
// avec la raison de chaque rang. Une recommandation dont on ne voit pas
// la provenance ne se suit pas.

// Le profil déclare ses zones sensibles avec son propre vocabulaire ; le
// test de mobilité a le sien. Sans cette table, les deux ne se parlent pas.
export const SENSITIVE_TO_ZONE = {
  genoux: ['hanches', 'chevilles'],
  dos: ['post', 'core', 'thoracique'],
  epaules: ['epaules', 'thoracique'],
  chevilles: ['chevilles'],
  hanches: ['hanches', 'flechisseurs'],
  poignets: ['epaules'],
  cou: ['nuque', 'epaules'],
}

// Régions dont une douleur interdit de sauter.
export const LOWER_LIMB_PAIN = ['pied', 'talon', 'cheville', 'jambe', 'genou', 'quadri', 'ischio', 'hanche']

export const STIFF_MAX = 2
export const SCORE = { pain: 5, stiff: 3, sensitive: 2, prep: 2 }

function stiffZones(db) {
  const m = db && db.mobility
  const zones = m && Array.isArray(m.zones) ? m.zones : []
  // Une valeur à zéro signifie « question sautée », pas « raide » : la
  // compter ferait apparaître un faux point faible.
  return zones.filter((z) => z && Number(z.val) > 0 && Number(z.val) <= STIFF_MAX).map((z) => z.id)
}

function sensitiveZoneIds(db) {
  const out = new Set()
  for (const s of asList(db && db.sensitiveZones)) {
    for (const z of SENSITIVE_TO_ZONE[s] || []) out.add(z)
  }
  return [...out]
}

function todaySports(db, iso) {
  return asList(db && db.planningSessions)
    .filter((sx) => sx && sx.date === iso && (sx.statut === 'planifie' || sx.statut === 'realise'))
    .map((sx) => sx.sport)
    .filter(Boolean)
}

function todayISO2() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export function recommendedRoutines(db, { today, kind, limit = 3 } = {}) {
  const ref = today || todayISO2()
  const stiff = stiffZones(db)
  const sensitive = sensitiveZoneIds(db)
  const pain = openEpisode(db)
  const painRegion = pain ? pain.region : null
  const sports = todaySports(db, ref)

  const fams = kind ? familiesFor(kind) : TEMPLATE_FAMILIES
  const scored = fams.map((f) => {
    const reasons = []
    let score = 0
    // Une douleur au membre inférieur exclut la pliométrie, elle ne la
    // classe pas plus bas : sauter sur une cheville douloureuse est
    // exactement ce qu'il ne faut pas faire, et une recommandation
    // seulement mal classée finit par être suivie.
    if (painRegion && f.kind === 'pliometrie' && LOWER_LIMB_PAIN.includes(painRegion)) {
      return { family: f, score: 0, blocked: true, reasons: [], progress: familyProgress(db, f.id), routine: null,
        why: `Écartée tant que cette douleur dure (${regionLabel(painRegion).toLowerCase()}) : la pliométrie produit les forces les plus élevées de tout l'entraînement.` }
    }
    if (painRegion && asList(f.pain).includes(painRegion)) {
      score += SCORE.pain
      reasons.push(`douleur en cours : ${regionLabel(painRegion).toLowerCase()}`)
    }
    const stiffHit = asList(f.zones).filter((z) => stiff.includes(z))
    if (stiffHit.length) {
      score += SCORE.stiff * stiffHit.length
      reasons.push(`${stiffHit.length > 1 ? 'zones raides' : 'zone raide'} au dernier test`)
    }
    const sensHit = asList(f.zones).filter((z) => sensitive.includes(z))
    if (sensHit.length) {
      score += SCORE.sensitive
      reasons.push('zone déclarée sensible')
    }
    const prepHit = sports.filter((sp) => asList(f.prep).includes(sp))
    if (prepHit.length) {
      score += SCORE.prep
      reasons.push('prépare ta séance du jour')
    }
    const p = familyProgress(db, f.id)
    return {
      family: f, score, reasons,
      progress: p,
      routine: templateRoutine(f.id, p.current),
      levelNumber: p.current + 1,
      levelCount: f.levels.length,
      why: reasons.length
        ? `Proposée parce que : ${reasons.join(', ')}.`
        : null,
    }
  })
  const kept = scored
    .filter((x) => x.score > 0 && !x.blocked)
    .sort((a, b) => b.score - a.score || a.family.label.localeCompare(b.family.label, 'fr'))
    .slice(0, limit)
  kept.blocked = scored.filter((x) => x.blocked)
  return kept
}
