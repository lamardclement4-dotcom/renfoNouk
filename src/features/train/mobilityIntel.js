// ============================================================
// Analyse de la mobilité.
//
// Trente bilans sont conservés, chacun avec le détail des neuf zones — et
// seul le score global était tracé. Or un score global peut rester plat
// pendant qu'une zone progresse et qu'une autre se dégrade : c'est
// précisément ce détail qui dit où porter le travail.
//
// Trois autres données dormaient à côté. Le programme généré à partir des
// zones les plus raides porte sa date et la liste des séances réalisées,
// sans que rien ne vérifie s'il a été suivi ni s'il cible encore la bonne
// zone. Les zones sensibles déclarées au profil ne croisaient rien. Et les
// épisodes de douleur enregistrés en prévention concernent souvent les
// mêmes régions.
//
// Trois sources indépendantes qui pointent la même zone valent bien mieux
// qu'une seule — c'est ce rapprochement que ce module produit.
//
// Repères de suivi, pas un diagnostic.
// ============================================================

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const todayISO = () => {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// Échelle des réponses : 0 = non répondu, 1 = raide, 2 = moyen, 3 = souple.
// Le zéro doit rester distinct de « raide », sinon une question sautée
// ferait passer la zone pour un point faible.
export const VAL_STIFF = 1
export const VAL_OK = 3

export function history(db) {
  return ((db && db.mobilityHistory) || [])
    .filter((h) => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && Array.isArray(h.zones))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Vétusté ─────────────────────────────────────────────────
// La mobilité bouge lentement : un bilan tous les deux mois suffit, mais
// au-delà de quatre le chiffre affiché ne décrit plus l'état actuel — et
// le programme qui en découle cible peut-être la mauvaise zone.
export const RETEST_DAYS = 60
export const STALE_DAYS = 120

export function freshness(db, today) {
  const ref = today || todayISO()
  const hist = history(db)
  const last = hist.length ? hist[hist.length - 1].date : ((db && db.mobility && db.mobility.date) || null)
  if (!last) return { level: 'absent', days: null, date: null, text: 'Aucun test de mobilité passé.' }
  const days = Math.max(0, daysBetween(last, ref))
  if (days >= STALE_DAYS) return { level: 'stale', days, date: last, text: `Ton test de mobilité date de ${days} jours : il ne décrit plus ton état actuel, et le programme qui en découle non plus.` }
  if (days >= RETEST_DAYS) return { level: 'due', days, date: last, text: `Ton test de mobilité a ${days} jours — le refaire prend quelques minutes.` }
  return { level: 'fresh', days, date: last, text: days === 0 ? 'Test passé aujourd’hui.' : `Test passé il y a ${days} jour${days > 1 ? 's' : ''}.` }
}

// ─── Progression par zone ────────────────────────────────────
// Le cœur du module : le score global masque des mouvements opposés.
export function zoneSeries(db, zoneId) {
  const out = []
  for (const h of history(db)) {
    const z = (h.zones || []).find((x) => x && x.id === zoneId)
    const v = z ? num(z.val) : null
    if (v == null || v <= 0) continue
    out.push({ date: h.date, val: v, label: z.label || zoneId })
  }
  return out
}

export function zoneIds(db) {
  const ids = []
  for (const h of history(db)) {
    for (const z of h.zones || []) {
      if (z && z.id && !ids.includes(z.id)) ids.push(z.id)
    }
  }
  return ids
}

export function zoneProgress(db, zoneId) {
  const s = zoneSeries(db, zoneId)
  if (!s.length) return null
  const first = s[0]
  const last = s[s.length - 1]
  const delta = last.val - first.val
  let dir = 'flat'
  if (s.length >= 2) dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  // Une zone raide qui n'a pas bougé sur trois bilans est le vrai signal :
  // ni une mauvaise journée, ni une progression en cours.
  const stuck = s.length >= 3 && last.val <= VAL_STIFF && s.slice(-3).every((x) => x.val <= VAL_STIFF)
  return {
    id: zoneId, label: last.label, series: s, count: s.length,
    first, last, delta, dir, stuck,
    weak: last.val <= VAL_STIFF, solid: last.val >= VAL_OK,
  }
}

export function allZones(db) {
  return zoneIds(db).map((id) => zoneProgress(db, id)).filter(Boolean)
    .sort((a, b) => a.last.val - b.last.val || a.label.localeCompare(b.label, 'fr'))
}

// Tendance du score global, pour la mettre en regard du détail.
export function globalTrend(db) {
  const hist = history(db)
  if (hist.length < 2) return null
  const last = hist[hist.length - 1]
  const prev = hist[hist.length - 2]
  const delta = (num(last.score) || 0) - (num(prev.score) || 0)
  return { last, prev, delta, span: daysBetween(prev.date, last.date), count: hist.length }
}

// Le cas que le score global cache : il bouge peu alors que des zones
// évoluent en sens contraire.
export function hiddenMoves(db, { minDelta = 1 } = {}) {
  const g = globalTrend(db)
  if (!g) return null
  const hist = history(db)
  const prevBy = {}
  for (const z of hist[hist.length - 2].zones || []) if (z && z.id) prevBy[z.id] = num(z.val)
  const moved = []
  for (const z of hist[hist.length - 1].zones || []) {
    if (!z || !z.id) continue
    const before = prevBy[z.id]
    const after = num(z.val)
    if (before == null || after == null || before <= 0 || after <= 0) continue
    const d = after - before
    if (Math.abs(d) >= minDelta) moved.push({ id: z.id, label: z.label || z.id, delta: d, before, after })
  }
  const up = moved.filter((m) => m.delta > 0)
  const down = moved.filter((m) => m.delta < 0)
  return {
    globalDelta: g.delta, up, down,
    // Deux mouvements opposés sous un score global quasi stable.
    masked: Math.abs(g.delta) <= 5 && up.length > 0 && down.length > 0,
  }
}

// ─── Programme généré ────────────────────────────────────────
// Il porte la date de sa création, les zones visées et les séances
// réalisées. Rien ne relisait ces trois informations.
export function programStatus(db, today) {
  const ref = today || todayISO()
  const p = db && db.program
  if (!p || !Array.isArray(p.sessions) || !p.sessions.length) return null
  const done = p.done || {}
  const doneCount = p.sessions.filter((s) => s && done[s.id]).length
  const createdISO = (() => {
    const t = num(p.createdAt)
    if (!t) return null
    const d = new Date(t)
    if (Number.isNaN(d.getTime())) return null
    const q = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate())
  })()
  const ageDays = createdISO ? Math.max(0, daysBetween(createdISO, ref)) : null
  // Le programme cible-t-il encore la bonne zone ? Le dernier test peut
  // avoir désigné d'autres zones depuis.
  const hist = history(db)
  const latestWeak = hist.length
    ? [...(hist[hist.length - 1].zones || [])].filter((z) => z && num(z.val) > 0)
      .sort((a, b) => num(a.val) - num(b.val)).slice(0, 3).map((z) => z.id)
    : []
  const targeted = p.weak || []
  const stillRelevant = latestWeak.length ? targeted.some((id) => latestWeak.includes(id)) : true
  return {
    sessions: p.sessions.length, done: doneCount,
    pct: p.sessions.length ? Math.round(doneCount / p.sessions.length * 100) : 0,
    createdISO, ageDays, targeted, latestWeak, stillRelevant,
    untouched: doneCount === 0,
  }
}

// ─── Corroboration entre sources ─────────────────────────────
// Une zone raide au test, déclarée sensible au profil, et siège d'un
// épisode de douleur : trois mesures indépendantes qui désignent le même
// endroit. Prises isolément, chacune peut être du bruit.
export const ZONE_TO_PAIN = {
  post: ['ischio', 'dos'], hanches: ['hanche'], flechisseurs: ['hanche', 'quadri'],
  thoracique: ['dos'], epaules: [], nuque: [], chevilles: ['cheville', 'pied', 'talon'],
  core: ['dos'], equilibre: ['cheville'],
}

export function corroboration(db) {
  const zones = allZones(db).filter((z) => z.weak)
  if (!zones.length) return []
  const sensitive = new Set((db && db.sensitiveZones) || [])
  const painRegions = new Set(((db && db.painEpisodes) || []).map((e) => e && e.region).filter(Boolean))
  const out = []
  for (const z of zones) {
    const sources = ['test de mobilité']
    if (sensitive.has(z.id)) sources.push('zone déclarée sensible dans ton profil')
    const mapped = ZONE_TO_PAIN[z.id] || []
    if (mapped.some((r) => painRegions.has(r))) sources.push('épisode de douleur enregistré')
    if (sources.length >= 2) out.push({ id: z.id, label: z.label, sources, count: sources.length })
  }
  return out.sort((a, b) => b.count - a.count)
}

// ─── Synthèse ────────────────────────────────────────────────
export function mobilityAnalysis(db, { today } = {}) {
  const ref = today || todayISO()
  const hist = history(db)
  const zones = allZones(db)
  const fresh = freshness(db, ref)
  const trend = globalTrend(db)
  const hidden = hiddenMoves(db)
  const prog = programStatus(db, ref)
  const corr = corroboration(db)
  const stuck = zones.filter((z) => z.stuck)
  const improved = zones.filter((z) => z.dir === 'up')
  const worsened = zones.filter((z) => z.dir === 'down')

  const tips = []
  if (!hist.length) {
    tips.push('Aucun test de mobilité enregistré. Un premier passage situe tes zones raides ; c’est en le refaisant que la progression devient lisible.')
  } else {
    if (corr.length) {
      const c = corr[0]
      tips.push(`${c.label} ressort dans ${c.count} sources indépendantes (${c.sources.join(', ')}) — un signal bien plus solide qu’une mesure isolée.`)
    }
    if (hidden && hidden.masked) {
      tips.push(`Ton score global n’a bougé que de ${hidden.globalDelta > 0 ? '+' : ''}${hidden.globalDelta} points, mais il recouvre des mouvements opposés : ${hidden.up.map((m) => m.label.toLowerCase()).join(', ')} en progrès, ${hidden.down.map((m) => m.label.toLowerCase()).join(', ')} en recul.`)
    } else if (worsened.length) {
      tips.push(`${worsened[0].label} est en recul depuis ton premier bilan.`)
    }
    if (stuck.length) {
      tips.push(`${stuck[0].label} reste raide sur tes ${stuck[0].series.length >= 3 ? 3 : stuck[0].series.length} derniers bilans : insister avec la même routine n’a rien changé, il faut varier l’approche ou faire évaluer la zone.`)
    }
    if (prog && prog.untouched && prog.ageDays != null && prog.ageDays >= 14) {
      tips.push(`Ton programme de mobilité a ${prog.ageDays} jours et aucune de ses ${prog.sessions} séances n’a été faite.`)
    } else if (prog && !prog.stillRelevant) {
      tips.push('Ton programme cible des zones qui ne sont plus tes plus raides d’après ton dernier test : le régénérer le remettra en phase.')
    } else if (prog && prog.done > 0 && prog.done < prog.sessions) {
      tips.push(`Programme de mobilité : ${prog.done} séance sur ${prog.sessions} réalisée.`)
    }
    if (improved.length && !stuck.length && !worsened.length) {
      tips.push(`${improved[0].label} progresse depuis ton premier bilan.`)
    }
    if (fresh.level !== 'fresh') tips.push(fresh.text)
  }
  if (!tips.length) tips.push('Mobilité stable et programme suivi. Rien à ajuster.')

  return { history: hist, zones, freshness: fresh, trend, hidden, program: prog, corroboration: corr, stuck, improved, worsened, tips }
}
