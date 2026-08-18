// ============================================================
// Analyse du plan de compléments : interactions d'absorption, doses
// rapportées au poids, répartition dans la journée, observance par
// complément et suivi des cures.
//
// Le catalogue mentionne déjà les incompatibilités en prose (« à distance
// du fer »), mais rien ne les rapprochait : quelqu'un ayant fer et calcium
// à son plan n'était averti nulle part. Ce module fait ce rapprochement.
//
// Il s'agit de repères d'absorption d'usage courant, pas d'un avis
// médical. Le fer en particulier ne se prend jamais à l'aveugle, ce que
// le catalogue rappelle déjà.
// ============================================================

// ─── Interactions ────────────────────────────────────────────
// Uniquement des mécanismes bien établis. Les effets débattus sont
// signalés comme tels plutôt que présentés comme acquis.
export const INTERACTIONS = [
  {
    a: 'fer', b: 'calcium', kind: 'conflict', severity: 'high',
    text: 'Le calcium réduit nettement l’absorption du fer. Espace les deux prises d’au moins deux heures — fer le matin à jeun, calcium sur un repas plus tard.',
  },
  {
    a: 'fer', b: 'zinc', kind: 'conflict', severity: 'moderate',
    text: 'Fer et zinc empruntent les mêmes transporteurs et se gênent mutuellement. Sépare-les d’au moins deux heures.',
  },
  {
    a: 'zinc', b: 'calcium', kind: 'conflict', severity: 'moderate',
    text: 'Le calcium diminue l’absorption du zinc. Évite de les prendre sur le même repas.',
  },
  {
    a: 'fer', b: 'vitc', kind: 'synergy', severity: 'info',
    text: 'La vitamine C améliore fortement l’absorption du fer non héminique : les prendre ensemble est un avantage, pas un problème.',
  },
  {
    a: 'vitd', b: 'omega3', kind: 'synergy', severity: 'info',
    text: 'Toutes deux liposolubles : les prendre sur un repas contenant des lipides améliore leur absorption.',
  },
  {
    a: 'magnesium', b: 'calcium', kind: 'conflict', severity: 'low',
    text: 'À doses élevées, magnésium et calcium se concurrencent à l’absorption. Répartis-les sur deux moments de la journée.',
  },
  {
    a: 'cafeine', b: 'creatine', kind: 'debated', severity: 'low',
    text: 'Un effet de la caféine sur le bénéfice de la créatine est parfois avancé, mais les données restent contradictoires. Rien n’impose de les séparer.',
  },
  {
    a: 'multivit', b: 'fer', kind: 'conflict', severity: 'moderate',
    text: 'La multivitamine contient souvent déjà du fer : cumuler les deux expose à un excès, et une surcharge en fer n’est pas anodine. Vérifie l’étiquette.',
  },
  {
    a: 'multivit', b: 'zinc', kind: 'conflict', severity: 'low',
    text: 'La multivitamine apporte déjà du zinc : additionner les deux peut dépasser la dose utile, ce qui gêne l’absorption du cuivre.',
  },
]

// Interactions concernant le plan courant. On ne remonte que les paires
// réellement présentes, pour éviter d'inonder l'écran d'avertissements
// théoriques.
export function detectInteractions(plan) {
  const set = new Set(plan || [])
  const rank = { high: 0, moderate: 1, low: 2, info: 3 }
  return INTERACTIONS
    .filter((i) => set.has(i.a) && set.has(i.b))
    .sort((x, y) => (rank[x.severity] ?? 9) - (rank[y.severity] ?? 9))
}

// ─── Doses rapportées au poids ───────────────────────────────
// Plusieurs compléments se dosent au kilo. L'application connaît le poids :
// afficher « 3–6 mg/kg » quand on peut afficher « 210–420 mg » évite un
// calcul mental à chaque prise, et donc une erreur de dosage.
export const WEIGHT_DOSED = {
  cafeine: { minPerKg: 3, maxPerKg: 6, unit: 'mg', round: 10, note: 'à prendre ~60 min avant l’effort' },
  bicarbonate: { minPerKg: 0.2, maxPerKg: 0.3, unit: 'g', round: 0.5, note: 'à tester à l’entraînement avant toute compétition' },
  proteine: { minPerKg: 0.25, maxPerKg: 0.4, unit: 'g', round: 1, note: 'par prise, en complément de l’alimentation' },
}

export function personalDose(id, weightKg) {
  const d = WEIGHT_DOSED[id]
  const w = Number(weightKg)
  if (!d || !(w > 0)) return null
  const r = (v) => Math.round(v / d.round) * d.round
  const lo = r(d.minPerKg * w)
  const hi = r(d.maxPerKg * w)
  const fmt = (v) => (d.round < 1 ? v.toFixed(1) : String(v))
  return { lo, hi, unit: d.unit, note: d.note, text: `${fmt(lo)}–${fmt(hi)} ${d.unit}` }
}

// ─── Répartition dans la journée ─────────────────────────────
// Le champ « moment » du catalogue est du texte libre, inexploitable pour
// regrouper. On rattache donc chaque complément à un créneau explicite.
export const SLOTS = [
  { id: 'matin', label: 'Matin', icon: 'sun' },
  { id: 'avant', label: 'Avant la séance', icon: 'bolt' },
  { id: 'pendant', label: 'Pendant l’effort', icon: 'drop' },
  { id: 'apres', label: 'Après la séance', icon: 'check' },
  { id: 'soir', label: 'Soir', icon: 'moon' },
  { id: 'libre', label: 'Peu importe l’heure', icon: 'clock' },
]

const SLOT_BY_ID = {
  creatine: 'libre', betaalanine: 'libre', collagene: 'avant',
  cafeine: 'avant', nitrates: 'avant', bicarbonate: 'avant', citrulline: 'avant',
  glucides: 'pendant', electrolytes: 'pendant',
  proteine: 'apres',
  glutamine: 'apres',
  cerise: 'soir', magnesium: 'soir', ashwagandha: 'soir',
  vitd: 'matin', vitc: 'matin', fer: 'matin', calcium: 'matin',
  omega3: 'matin', zinc: 'matin', multivit: 'matin',
}

export function slotOf(id) {
  return SLOT_BY_ID[id] || 'libre'
}

// Regroupe les compléments du plan par créneau, dans l'ordre de la
// journée. Les créneaux vides ne sont pas renvoyés.
export function groupBySlot(items) {
  const by = {}
  for (const it of items || []) {
    const s = slotOf(it.id)
    if (!by[s]) by[s] = []
    by[s].push(it)
  }
  return SLOTS.filter((s) => by[s.id] && by[s.id].length).map((s) => ({ ...s, items: by[s.id] }))
}

// Compléments incompatibles rangés dans le même créneau : c'est le cas
// concrètement problématique, plus parlant qu'un avertissement général.
export function slotConflicts(plan) {
  const conflicts = detectInteractions(plan).filter((i) => i.kind === 'conflict')
  return conflicts.filter((i) => slotOf(i.a) === slotOf(i.b))
}

// ─── Observance ──────────────────────────────────────────────
// Jour courant en heure LOCALE. `new Date().toISOString()` renvoie le jour
// UTC : dans un fuseau en avance sur UTC, entre minuit et deux heures du
// matin, il désigne la veille — la prise du jour n'était alors pas comptée
// et la série paraissait rompue.
const todayISO = () => {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const shiftISO = (iso, delta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

// Observance par complément sur une fenêtre glissante. Le taux global
// masque le détail : on peut être à 80 % tout en oubliant toujours le
// même produit, ce qui est précisément l'information utile.
export function adherenceBySupp(plan, suppTaken, { days = 14, today } = {}) {
  const ref = today || todayISO()
  const log = suppTaken || {}
  return (plan || []).map((id) => {
    let taken = 0
    for (let i = 0; i < days; i++) {
      const iso = shiftISO(ref, -i)
      if ((log[iso] || []).includes(id)) taken++
    }
    return { id, taken, days, pct: Math.round(taken / days * 100) }
  }).sort((a, b) => a.pct - b.pct)
}

// Jours consécutifs de prise en remontant depuis la date de référence.
export function currentStreak(id, suppTaken, today) {
  const ref = today || todayISO()
  const log = suppTaken || {}
  let n = 0
  for (let i = 0; i < 400; i++) {
    const iso = shiftISO(ref, -i)
    if ((log[iso] || []).includes(id)) n++
    else break
  }
  return n
}

// ─── Cures ───────────────────────────────────────────────────
// Certains compléments s'inscrivent dans la durée (effet cumulatif), et
// d'autres ne devraient pas être pris en continu. Suivre la date de
// première prise permet de dire où l'on en est, ce que le texte « 4–8
// semaines » du catalogue ne peut pas faire seul.
export const CURES = {
  betaalanine: { minWeeks: 4, maxWeeks: 12, kind: 'cumulative', text: 'Effet cumulatif : compte 4 à 8 semaines de prise régulière avant d’en juger.' },
  creatine: { kind: 'continuous', text: 'Se prend en continu, sans pause nécessaire.' },
  vitc: { maxWeeks: 6, kind: 'limited', text: 'À forte dose et en continu, la vitamine C peut émousser certaines adaptations à l’entraînement. Réserve-la aux périodes de besoin.' },
  zinc: { maxWeeks: 6, kind: 'limited', text: 'Le zinc se prend en cures courtes : au-delà, il gêne l’absorption du cuivre.' },
  cafeine: { kind: 'occasional', text: 'Garde-la pour les séances clés : une prise quotidienne installe l’accoutumance et dilue le bénéfice.' },
  ashwagandha: { maxWeeks: 8, kind: 'limited', text: 'Se prend en cure de 6 à 8 semaines, suivie d’une pause.' },
  fer: { kind: 'supervised', text: 'Cure à encadrer médicalement, avec re-dosage — une surcharge en fer est dangereuse.' },
}

// Première et dernière prise enregistrées, et durée écoulée.
export function cureStatus(id, suppTaken, today) {
  const ref = today || todayISO()
  const log = suppTaken || {}
  const dates = Object.keys(log).filter((d) => (log[d] || []).includes(id)).sort()
  if (!dates.length) return null
  const first = dates[0]
  const last = dates[dates.length - 1]
  const [fy, fm, fd] = first.split('-').map(Number)
  const [ry, rm, rd] = ref.split('-').map(Number)
  const elapsed = Math.round((Date.UTC(ry, rm - 1, rd) - Date.UTC(fy, fm - 1, fd)) / 86400000)
  const weeks = Math.floor(elapsed / 7)
  const rule = CURES[id] || null
  let flag = null
  if (rule) {
    if (rule.maxWeeks && weeks >= rule.maxWeeks) {
      flag = { level: 'warn', text: `Cure entamée depuis ${weeks} semaines : ${rule.kind === 'limited' ? 'prévois une pause' : 'fais le point'}.` }
    } else if (rule.minWeeks && weeks < rule.minWeeks) {
      flag = { level: 'info', text: `${weeks} semaine${weeks > 1 ? 's' : ''} de prise : l’effet complet demande au moins ${rule.minWeeks} semaines.` }
    }
  }
  return { first, last, days: dates.length, elapsed, weeks, rule, flag }
}
