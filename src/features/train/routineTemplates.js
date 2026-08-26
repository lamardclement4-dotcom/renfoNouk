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
