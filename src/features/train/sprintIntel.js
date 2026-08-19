// ============================================================
// Sprint : performances, vitesse, endurance de vitesse et charge de
// haute intensité.
//
// Le sprint partageait l'écran de la course à pied : distance, temps au
// format minutes-secondes, allure au kilomètre. Rien de tout cela ne
// convient. Un 100 m se mesure au centième, une allure au kilomètre n'a
// aucun sens sur 60 m, et surtout un chrono sans vent ne veut rien dire —
// une performance avec 3 m/s dans le dos n'est pas comparable à la même
// dans le vent debout, et n'est homologable nulle part.
//
// Ce module traite le sprint pour ce qu'il est : des performances au
// centième, une vitesse en mètres par seconde, un rapport entre phase
// d'accélération et vitesse maximale, et une charge de haute intensité
// dont dépend le risque ischio-jambier — la blessure emblématique de la
// discipline.
//
// Repères d'usage courant en athlétisme, pas des prescriptions.
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

const shiftISO = (iso, delta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// Un chrono de sprint s'écrit « 10.85 », « 10,85 » ou « 1:52.30 » sur
// 400 m. Le centième est significatif : l'arrondir à la seconde effacerait
// l'écart entre deux performances.
export function parseSprintTime(t) {
  if (t == null || t === '') return null
  const raw = String(t).trim().replace(',', '.')
  if (!/^(\d+:)?\d+(\.\d+)?$/.test(raw)) return null
  const parts = raw.split(':')
  const sec = parts.length === 2 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0])
  return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 100) / 100 : null
}

export function fmtSprintTime(sec) {
  const s = num(sec)
  if (s == null || s <= 0) return null
  if (s < 60) return s.toFixed(2).replace('.', ',')
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}'${r < 10 ? '0' : ''}${r.toFixed(2).replace('.', ',')}`
}

// ─── Épreuves ────────────────────────────────────────────────
export const EVENTS = [
  { id: '60', label: '60 m', meters: 60, indoor: true },
  { id: '100', label: '100 m', meters: 100 },
  { id: '200', label: '200 m', meters: 200 },
  { id: '400', label: '400 m', meters: 400 },
  { id: '60h', label: '60 m haies', meters: 60, hurdles: true, indoor: true },
  { id: '110h', label: '110 m haies', meters: 110, hurdles: true },
  { id: '100h', label: '100 m haies', meters: 100, hurdles: true },
  { id: '400h', label: '400 m haies', meters: 400, hurdles: true },
]

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]))

export const STARTS = [
  { id: 'blocs', label: 'Départ blocs' },
  { id: 'debout', label: 'Départ debout' },
  { id: 'lance', label: 'Départ lancé' },
]

// ─── Vent ────────────────────────────────────────────────────
// Au-delà de deux mètres par seconde dans le dos, une performance n'est
// pas homologable. Le dire n'est pas un détail administratif : comparer
// un chrono venté à un chrono régulier fait croire à une progression qui
// n'a pas eu lieu.
export const WIND_LEGAL_MAX = 2

// Le vent ne joue que sur les épreuves en ligne droite ; sur 200 m il
// compte pour la partie en ligne droite, sur 400 m il n'est pas mesuré.
export const WIND_RELEVANT = ['60', '100', '200', '60h', '110h', '100h']

export function windLegal(event, wind) {
  if (!WIND_RELEVANT.includes(event)) return true
  const w = num(wind)
  if (w == null) return true // vent non mesuré : on ne disqualifie pas
  return w <= WIND_LEGAL_MAX
}

export function windLabel(wind) {
  const w = num(wind)
  if (w == null) return null
  const sign = w > 0 ? '+' : ''
  return `${sign}${w.toFixed(1).replace('.', ',')} m/s`
}

// ─── Lecture des performances ────────────────────────────────
export const SPRINT_SPORTS = ['sprint']

export function sprintPerfs(db, { days = 730, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const out = []
  for (const s of (db && db.planningSessions) || []) {
    if (!s || !SPRINT_SPORTS.includes(s.sport) || s.statut !== 'realise') continue
    if (!s.date || s.date < from || s.date > ref) continue
    const d = s.data || {}
    const perfs = Array.isArray(d.perfs) ? d.perfs : []
    for (const p of perfs) {
      const event = EVENT_BY_ID[p && p.epreuve] ? p.epreuve : null
      const sec = parseSprintTime(p && p.temps)
      if (!event || !sec) continue
      const def = EVENT_BY_ID[event]
      out.push({
        date: s.date, event, label: def.label, meters: def.meters, hurdles: !!def.hurdles,
        sec, wind: num(p.vent), legal: windLegal(event, p.vent),
        start: p.depart || null,
        reaction: num(p.reaction),
        chrono: p.chrono || null,
        speed: Math.round(def.meters / sec * 100) / 100,
        kmh: Math.round(def.meters / sec * 3.6 * 10) / 10,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Records ─────────────────────────────────────────────────
// Deux records par épreuve : celui qui compte, avec vent régulier, et le
// meilleur temps toutes conditions. Les confondre serait exactement
// l'erreur que le vent introduit.
export function records(perfs) {
  const by = {}
  for (const p of perfs) {
    if (!by[p.event]) by[p.event] = { event: p.event, label: p.label, meters: p.meters, all: [], legal: [] }
    by[p.event].all.push(p)
    if (p.legal) by[p.event].legal.push(p)
  }
  return EVENTS.filter((e) => by[e.id]).map((e) => {
    const g = by[e.id]
    const best = (arr) => (arr.length ? arr.reduce((m, p) => (p.sec < m.sec ? p : m), arr[0]) : null)
    const legal = best(g.legal)
    const any = best(g.all)
    return {
      event: e.id, label: e.label, meters: e.meters,
      legal, any,
      windAssisted: any && legal && any.sec < legal.sec ? any : null,
      count: g.all.length,
    }
  })
}

// ─── Vitesse ─────────────────────────────────────────────────
// La vitesse moyenne d'un 100 m sous-estime toujours la vitesse
// maximale : le départ arrêté coûte du temps. Un départ lancé, lui, la
// mesure directement — d'où l'intérêt de distinguer les deux.
export function maxVelocity(perfs) {
  const flying = perfs.filter((p) => p.start === 'lance')
  if (flying.length) {
    const best = flying.reduce((m, p) => (p.speed > m.speed ? p : m), flying[0])
    return { speed: best.speed, kmh: best.kmh, from: best, method: 'lancé', text: `Vitesse maximale mesurée à ${best.speed} m/s (${best.kmh} km/h) sur ${best.meters} m lancés.` }
  }
  const blocks = perfs.filter((p) => p.start !== 'lance' && p.meters >= 60 && p.meters <= 200)
  if (!blocks.length) return null
  const best = blocks.reduce((m, p) => (p.speed > m.speed ? p : m), blocks[0])
  return {
    speed: best.speed, kmh: best.kmh, from: best, method: 'moyenne',
    text: `Vitesse moyenne de ${best.speed} m/s (${best.kmh} km/h) sur ton ${best.label}. La vitesse maximale réelle est plus élevée : le départ arrêté pèse sur la moyenne. Un départ lancé la mesurerait directement.`,
  }
}

// ─── Endurance de vitesse ────────────────────────────────────
// Le différentiel entre deux fois le 100 m et le 200 m réel dit combien
// on perd quand l'effort dure. Un différentiel large signale une vitesse
// pure correcte mais une résistance en retard ; un différentiel étroit,
// l'inverse. C'est la lecture que fait tout entraîneur de sprint, et elle
// demande juste les deux chronos.
export const DIFF_PAIRS = [
  { long: '200', short: '100', factor: 2, wide: 0.7, narrow: 0.1, label: '200 m' },
  { long: '400', short: '200', factor: 2, wide: 1.8, narrow: 0.5, label: '400 m' },
]

export function speedEndurance(recs) {
  const out = []
  for (const pair of DIFF_PAIRS) {
    const l = recs.find((r) => r.event === pair.long)
    const sh = recs.find((r) => r.event === pair.short)
    if (!l || !sh || !l.legal || !sh.legal) continue
    const expected = sh.legal.sec * pair.factor
    const diff = Math.round((l.legal.sec - expected) * 100) / 100
    let level, text
    if (diff >= pair.wide) {
      level = 'warn'
      text = `Ton ${pair.label} (${fmtSprintTime(l.legal.sec)}) est ${fmtSprintTime(diff)} s au-dessus du double de ton ${sh.label} (${fmtSprintTime(sh.legal.sec)}). Ta vitesse pure tient, c'est la résistance à la fatigue qui manque — le travail se fait sur des distances longues à intensité proche du maximum.`
    } else if (diff <= pair.narrow) {
      level = 'info'
      text = `Ton ${pair.label} est très proche du double de ton ${sh.label} (${fmtSprintTime(diff)} s d'écart). Ton endurance de vitesse est solide ; c'est la vitesse pure qui limite désormais.`
    } else {
      level = 'ok'
      text = `Différentiel habituel entre ton ${sh.label} et ton ${pair.label} (${fmtSprintTime(diff)} s).`
    }
    out.push({ pair: pair.long, expected: Math.round(expected * 100) / 100, actual: l.legal.sec, diff, level, text })
  }
  return out
}


// ─── Temps de réaction ───────────────────────────────────────
// En dessous de cent millisecondes, le règlement considère qu'il est
// impossible de réagir au signal : c'est un faux départ. Au-delà de deux
// dixièmes, il y a du temps à gagner sans toucher à la condition
// physique.
export const REACTION_FALSE_START = 0.1
export const REACTION_SLOW = 0.2

export function reactionAnalysis(perfs) {
  const withR = perfs.filter((p) => p.reaction && p.reaction > 0)
  if (withR.length < 3) return null
  const mean = Math.round(withR.reduce((a, p) => a + p.reaction, 0) / withR.length * 1000) / 1000
  const best = withR.reduce((m, p) => (p.reaction < m.reaction ? p : m), withR[0])
  const invalid = withR.filter((p) => p.reaction < REACTION_FALSE_START)
  let level, text
  if (mean > REACTION_SLOW) {
    level = 'info'
    text = `Temps de réaction moyen de ${mean.toFixed(3).replace('.', ',')} s, au-delà du repère de ${String(REACTION_SLOW).replace('.', ',')} s. C'est du temps à gagner sans rien changer à la condition physique : le travail se fait au signal, pas à la jambe.`
  } else {
    level = 'ok'
    text = `Temps de réaction moyen de ${mean.toFixed(3).replace('.', ',')} s, dans la fourchette habituelle (meilleur : ${best.reaction.toFixed(3).replace('.', ',')} s).`
  }
  return { mean, best: best.reaction, count: withR.length, invalid: invalid.length, level, text }
}

// ─── Volume de haute intensité ───────────────────────────────
// Le mètre de sprint est la vraie unité de charge de la discipline. Les
// ischio-jambiers se lèsent presque toujours à vitesse maximale, et le
// facteur de risque le mieux établi est l'augmentation brutale du volume
// couru à haute vitesse — pas le volume lui-même.
export const SPRINT_VOLUME_JUMP_PCT = 50

export function sessionVolume(session) {
  const d = (session && session.data) || {}
  const series = num(d.series) || 1
  const reps = num(d.reps) || 0
  const repDist = num(d.repDistance) || 0
  const fromReps = series * reps * repDist
  const perfs = Array.isArray(d.perfs) ? d.perfs : []
  const fromPerfs = perfs.reduce((a, p) => {
    const e = EVENT_BY_ID[p && p.epreuve]
    return a + (e ? e.meters : 0)
  }, 0)
  return Math.round(fromReps + fromPerfs)
}

export function volumeByWeek(db, { weeks = 8, today } = {}) {
  const ref = today || todayISO()
  const sessions = ((db && db.planningSessions) || [])
    .filter((s) => s && SPRINT_SPORTS.includes(s.sport) && s.statut === 'realise' && s.date)
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const end = shiftISO(ref, -7 * w)
    const start = shiftISO(end, -6)
    const items = sessions.filter((s) => s.date >= start && s.date <= end)
    out.push({ start, end, meters: items.reduce((a, s) => a + sessionVolume(s), 0), sessions: items.length })
  }
  let jump = null
  if (out.length >= 2) {
    const last = out[out.length - 1]
    const prev = out[out.length - 2]
    if (prev.meters > 0) {
      const pct = Math.round((last.meters - prev.meters) / prev.meters * 100)
      if (pct > SPRINT_VOLUME_JUMP_PCT) {
        jump = {
          pct, from: prev.meters, to: last.meters, level: 'warn',
          text: `Ton volume de sprint est passé de ${prev.meters} à ${last.meters} m d'une semaine à l'autre, soit +${pct} %. Les ischio-jambiers se lèsent presque toujours à vitesse maximale, et c'est la hausse brutale du volume à haute vitesse — pas le volume lui-même — qui est le facteur de risque le mieux établi.`,
        }
      }
    }
  }
  const active = out.filter((w) => w.meters > 0)
  return { weeks: out, jump, mean: active.length ? Math.round(active.reduce((a, w) => a + w.meters, 0) / active.length) : 0 }
}

// ─── Récupération entre répétitions ──────────────────────────
// Pour travailler la vitesse pure, la récupération doit être complète :
// le repère d'usage est d'environ une minute par dizaine de mètres. Une
// récupération plus courte transforme la séance en travail de résistance
// — ce qui est un choix légitime, mais alors ce n'est plus de la vitesse.
export const RECOVERY_SEC_PER_10M = 60

export function recoveryCheck(session) {
  const d = (session && session.data) || {}
  const repDist = num(d.repDistance)
  if (!repDist || repDist <= 0) return null
  const rec = (() => {
    const raw = d.recup
    if (!raw) return null
    const parts = String(raw).trim().split(':')
    if (parts.length === 2) return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n * 60 : null
  })()
  if (rec == null) return null
  const needed = Math.round(repDist / 10 * RECOVERY_SEC_PER_10M)
  const ratio = Math.round(rec / needed * 100) / 100
  return {
    rec, needed, ratio, repDist,
    full: ratio >= 0.8,
    text: ratio >= 0.8
      ? `Récupération de ${Math.round(rec / 60)} min pour ${repDist} m : suffisante pour un vrai travail de vitesse.`
      : `Récupération de ${Math.round(rec / 60)} min pour ${repDist} m, contre environ ${Math.round(needed / 60)} min pour être complet. La séance travaille la résistance plutôt que la vitesse pure — un choix légitime, mais ce n'est alors plus de la vitesse.`,
  }
}

// ─── Progression saisonnière ─────────────────────────────────
export function seasonBests(perfs, event) {
  const items = perfs.filter((p) => p.event === event && p.legal)
  if (!items.length) return []
  const by = {}
  for (const p of items) {
    const y = p.date.slice(0, 4)
    if (!by[y] || p.sec < by[y].sec) by[y] = p
  }
  return Object.keys(by).sort().map((y) => ({ year: y, sec: by[y].sec, time: fmtSprintTime(by[y].sec), date: by[y].date, wind: by[y].wind }))
}

// ─── Synthèse ────────────────────────────────────────────────
export function sprintAnalysis(db, { days = 730, today } = {}) {
  const ref = today || todayISO()
  const perfs = sprintPerfs(db, { days, today: ref })
  const recs = records(perfs)
  const velocity = maxVelocity(perfs)
  const endurance = speedEndurance(recs)
  const reaction = reactionAnalysis(perfs)
  const volume = volumeByWeek(db, { today: ref })
  const sessions = ((db && db.planningSessions) || []).filter((s) => s && SPRINT_SPORTS.includes(s.sport) && s.statut === 'realise')
  const recoveries = sessions.map((s) => ({ date: s.date, ...(recoveryCheck(s) || {}) })).filter((r) => r.ratio != null)
  const shortRec = recoveries.filter((r) => !r.full)

  const tips = []
  if (!perfs.length && !sessions.length) {
    tips.push('Aucune séance de sprint enregistrée. Noter le chrono au centième, le vent et le type de départ permet de suivre une vraie progression — un chrono sans vent ne se compare à rien.')
  } else {
    if (volume.jump) tips.push(volume.jump.text)
    // Un chrono venté pris pour un record fait croire à une progression
    // qui n'a pas eu lieu : ça passe avant le reste.
    const assisted = recs.filter((r) => r.windAssisted)
    if (assisted.length) {
      const r = assisted[0]
      tips.push(`Ton meilleur ${r.label} est ${fmtSprintTime(r.any.sec)} avec ${windLabel(r.any.wind)} de vent, au-delà de la limite de ${String(WIND_LEGAL_MAX).replace('.', ',')} m/s. Ta référence reste ${fmtSprintTime(r.legal.sec)} : c'est elle qu'il faut battre.`)
    }
    for (const e of endurance) if (e.level !== 'ok') tips.push(e.text)
    if (shortRec.length >= 2) tips.push(shortRec[0].text)
    if (reaction && reaction.level !== 'ok') tips.push(reaction.text)
    if (velocity && velocity.method === 'moyenne' && !perfs.some((p) => p.start === 'lance')) tips.push(velocity.text)
  }
  if (!tips.length) tips.push('Sprint cohérent : volume progressif, récupérations adaptées et références fiables.')

  return { perfs, records: recs, velocity, endurance, reaction, volume, recoveries, shortRec, tips }
}
