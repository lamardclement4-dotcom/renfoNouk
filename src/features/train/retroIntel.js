// ============================================================
// Rétrospective d'une semaine.
//
// L'existante additionnait des minutes par jour, par sport, et affichait
// un total. Trois choses lui manquaient, et ce sont celles qui font
// qu'une rétrospective se lit.
//
// L'intensité d'abord : une heure de récupération et une heure de match
// pesaient exactement pareil, alors que le RPE est désormais saisi pour
// tous les sports. Ensuite l'écart au plan : une semaine à quatre séances
// n'a pas le même sens selon qu'on en avait prévu quatre ou huit. Enfin
// le contexte : une semaine chargée après trois nuits à cinq heures ne se
// commente pas comme la même semaine bien dormie.
//
// S'y ajoute ce qu'une rétrospective devrait dire en premier et ne disait
// pas du tout : ce qu'on a fait de mieux.
//
// Repères descriptifs : ce module raconte la semaine, il ne prescrit rien.
// ============================================================

import { sessionLoad, sessionRpe, isHard, dureeToMins, mondayISO, dowOf } from './plannerIntel'
import { sportAnalysis, practisedSports, fmtValue } from './genericIntel'
import { sleepAnalysis } from '../health/sleepIntel'
import { nutriAnalysis, dayEntries, dayTotals } from '../nutrition/nutriIntel'
import { monotony, ACWR_SWEET_LOW, ACWR_SWEET_HIGH, NEUTRAL_RPE, HARD_RPE } from './plannerIntel'
import { effectiveTemp, loadMultiplier } from './weatherIntel'
import { plausibleHours, neededHours, BASE_NEED } from '../health/sleepIntel'
import { targetForDate, forDay } from '../nutrition/macroTargets'
import { weightSeries } from '../profil/weightIntel'

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

// `x || []` ne protège que de `null` et `undefined`. Une liste stockée en
// base peut revenir sous une autre forme — écriture partielle, donnée écrite
// par une version antérieure — et l'objet passe alors la garde pour faire
// échouer le `.filter` juste après. L'écran entier meurt, loin de sa cause.
function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

export function weekBounds(weekOf) {
  const monday = mondayISO(weekOf || todayISO())
  return { monday, sunday: shiftISO(monday, 6) }
}

// ─── La semaine, jour par jour ───────────────────────────────
export function weekDays(db, { weekOf, today } = {}) {
  const { monday, sunday } = weekBounds(weekOf || today)
  const sessions = (asList(db && db.planningSessions))
    .filter((s) => s && s.date && s.date >= monday && s.date <= sunday)
  const player = (asList(db && db.sessionLog))
    .filter((e) => e && e.date && e.date >= monday && e.date <= sunday)

  const days = []
  for (let i = 0; i < 7; i++) {
    const date = shiftISO(monday, i)
    const done = sessions.filter((s) => s.date === date && s.statut === 'realise')
    const planned = sessions.filter((s) => s.date === date && s.statut === 'planifie')
    const played = player.filter((e) => e.date === date)
    // Le lecteur intégré ne porte pas d'intensité : ses minutes comptent à
    // charge neutre plutôt que d'être ignorées.
    const load = done.reduce((a, s) => a + sessionLoad(s), 0) + played.reduce((a, e) => a + (num(e.mins) || 0), 0)
    const mins = done.reduce((a, s) => a + dureeToMins(s.duree), 0) + played.reduce((a, e) => a + (num(e.mins) || 0), 0)
    days.push({
      date, dow: i, done, planned, played,
      load: Math.round(load), mins,
      hard: done.some(isHard),
      active: done.length + played.length > 0,
      missed: planned.length,
    })
  }
  return { monday, sunday, days, sessions, player }
}

// ─── Répartition par sport ───────────────────────────────────
export function bySport(week, sportMeta) {
  const by = {}
  for (const d of week.days) {
    for (const s of d.done) {
      const meta = sportMeta ? sportMeta(s.sport) : { label: s.sport || 'Séance', color: null }
      const k = meta.label
      if (!by[k]) by[k] = { label: k, color: meta.color, mins: 0, load: 0, sessions: 0 }
      by[k].mins += dureeToMins(s.duree)
      by[k].load += sessionLoad(s)
      by[k].sessions++
    }
  }
  const totalMins = Object.values(by).reduce((a, x) => a + x.mins, 0)
  return Object.values(by)
    .map((x) => ({ ...x, load: Math.round(x.load), pct: totalMins ? Math.round(x.mins / totalMins * 100) : 0 }))
    .sort((a, b) => b.mins - a.mins)
}

// ─── Comparaison ─────────────────────────────────────────────
// La semaine précédente seule est un mauvais point de repère : une
// semaine de coupure la fait paraître formidable. On la compare donc
// aussi à la moyenne des quatre précédentes, plus stable.
export const BASELINE_WEEKS = 4

export function compare(db, { weekOf, today } = {}) {
  const cur = weekDays(db, { weekOf, today })
  const curLoad = cur.days.reduce((a, d) => a + d.load, 0)
  const curMins = cur.days.reduce((a, d) => a + d.mins, 0)
  const prev = weekDays(db, { weekOf: shiftISO(cur.monday, -7) })
  const prevLoad = prev.days.reduce((a, d) => a + d.load, 0)

  const baseline = []
  for (let k = 1; k <= BASELINE_WEEKS; k++) {
    const w = weekDays(db, { weekOf: shiftISO(cur.monday, -7 * k) })
    const l = w.days.reduce((a, d) => a + d.load, 0)
    if (l > 0) baseline.push(l)
  }
  const meanBase = baseline.length ? Math.round(baseline.reduce((a, b) => a + b, 0) / baseline.length) : null

  const pct = (from, to) => (from > 0 ? Math.round((to - from) / from * 100) : null)
  return {
    load: curLoad, mins: curMins,
    prevLoad, prevPct: pct(prevLoad, curLoad),
    meanBase, basePct: meanBase ? pct(meanBase, curLoad) : null,
    baselineWeeks: baseline.length,
  }
}

// ─── Ce qu'on a fait de mieux ────────────────────────────────
// Une rétrospective devrait commencer par là et ne le disait pas du tout.
// Les records sont ceux que les modules savent déjà calculer : on ne
// retient que ceux tombés pendant la semaine regardée.
export function highlights(db, { weekOf, today } = {}) {
  const { monday, sunday } = weekBounds(weekOf || today)
  const out = []
  for (const sport of practisedSports(db, { days: 730, today: sunday })) {
    const sa = sportAnalysis(db, sport, { days: 730, today: sunday })
    if (!sa) continue
    for (const r of sa.records) {
      if (!r.best || r.best.date < monday || r.best.date > sunday) continue
      // Un record établi dès la première mesure n'en est pas un.
      if (r.count < 2) continue
      out.push({
        sport, sportLabel: sa.label, key: r.key, label: r.label,
        value: r.best.value, display: fmtValue(r, r.best.value),
        date: r.best.date, dir: r.dir, count: r.count,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// La séance la plus lourde de la semaine : celle dont on se souvient.
export function toughest(week, sportMeta) {
  let best = null
  for (const d of week.days) {
    for (const s of d.done) {
      const load = sessionLoad(s)
      if (!best || load > best.load) {
        const meta = sportMeta ? sportMeta(s.sport) : { label: s.sport || 'Séance' }
        best = { date: d.date, label: meta.label, load, mins: dureeToMins(s.duree), rpe: sessionRpe(s) }
      }
    }
  }
  return best
}

// ─── Régularité ──────────────────────────────────────────────
export function consistency(week) {
  const active = week.days.filter((d) => d.active).length
  const rest = 7 - active
  let longest = 0, run = 0
  for (const d of week.days) { run = d.active ? run + 1 : 0; if (run > longest) longest = run }
  const loads = week.days.map((d) => d.load)
  const total = loads.reduce((a, b) => a + b, 0)
  const mean = total / 7
  const sd = Math.sqrt(loads.reduce((a, l) => a + (l - mean) ** 2, 0) / 7)
  return {
    active, rest, longest,
    spread: mean > 0 ? Math.round(sd / mean * 100) / 100 : null,
    total: Math.round(total),
  }
}

// ─── Respect du plan sur la semaine ──────────────────────────
export function planFit(week, { today } = {}) {
  const ref = today || todayISO()
  const done = week.days.reduce((a, d) => a + d.done.length, 0)
  // On ne reproche pas une séance encore à venir : seuls les jours passés
  // permettent de dire qu'une séance n'a pas eu lieu.
  const missed = week.days.filter((d) => d.date < ref).reduce((a, d) => a + d.missed, 0)
  const upcoming = week.days.filter((d) => d.date >= ref).reduce((a, d) => a + d.missed, 0)
  const judged = done + missed
  return {
    done, missed, upcoming, judged,
    pct: judged ? Math.round(done / judged * 100) : null,
  }
}

// ─── Contexte de la semaine ──────────────────────────────────
// Une semaine chargée après trois nuits à cinq heures ne se commente pas
// comme la même semaine bien dormie.
export function context(db, { weekOf, today } = {}) {
  const { monday, sunday } = weekBounds(weekOf || today)
  const ref = sunday
  const sleep = sleepAnalysis(db, { days: 7, today: ref })
  const nutri = nutriAnalysis(db, { days: 7, today: ref })
  const series = weightSeries(db && db.weightLog, 0).filter((e) => e.date >= monday && e.date <= sunday)
  const weight = series.length >= 2
    ? { from: series[0].kg, to: series[series.length - 1].kg, delta: Math.round((series[series.length - 1].kg - series[0].kg) * 10) / 10 }
    : null
  return {
    sleep: sleep.nights ? { nights: sleep.nights, mean: sleep.debt ? sleep.debt.mean : null, debt: sleep.debt ? sleep.debt.net : null } : null,
    nutrition: nutri.averages ? { days: nutri.averages.days, kcal: nutri.averages.kcal, prot: nutri.averages.prot } : null,
    weight,
  }
}

// ─── Le détail, jour par jour ─────────────────────────────
//
// Une rétrospective qui ne donne que des totaux ne se relit pas : on veut
// retrouver la semaine telle qu'elle s'est passée. Chaque jour rassemble
// donc ce qui a été fait, ce qui a été dormi, ce qui a été mangé et dans
// quelles conditions — les quatre choses qui s'expliquent l'une l'autre.

const fr = (v) => String(v).replace('.', ',')

export function dayDetail(db, week, sportMeta) {
  const sleepLog = (db && db.sleepLog) || {}
  const weather = (db && db.weatherLog) || {}
  const vitals = (db && db.vitalsLog) || {}
  return week.days.map((d) => {
    const t = dayTotals(dayEntries(db, d.date))
    const wx = weather[d.date] || null
    const night = plausibleHours(sleepLog[d.date] && sleepLog[d.date].hours)
    return {
      ...d,
      sessions: d.done.map((sx) => {
        const meta = sportMeta ? sportMeta(sx.sport) : { label: sx.sport || 'Séance', color: null }
        return {
          id: sx.id, label: meta.label, color: meta.color,
          mins: dureeToMins(sx.duree), rpe: sessionRpe(sx),
          load: Math.round(sessionLoad(sx)), notes: sx.notes || null,
        }
      }),
      sleep: night,
      kcal: t.k || null, prot: t.p || null, alc: t.alc || null,
      steps: (vitals[d.date] && num(vitals[d.date].steps)) || null,
      feels: wx ? effectiveTemp(wx) : null,
      weather: wx,
    }
  })
}

// ─── Chaque dimension, comparée à l'habitude ──────────────
//
// La charge était la seule chose comparée à la référence. Or une semaine
// se juge aussi sur ce qui l'entoure : moins dormi, moins mangé, autant
// couru — ce n'est pas la même semaine que la précédente, et le total de
// charge ne le dit pas.

function weekAggregate(db, monday) {
  const sunday = shiftISO(monday, 6)
  const w = weekDays(db, { weekOf: monday })
  const load = w.days.reduce((a, d) => a + d.load, 0)
  const mins = w.days.reduce((a, d) => a + d.mins, 0)
  const sessions = w.days.reduce((a, d) => a + d.done.length, 0)
  let nights = 0
  let sleepSum = 0
  let fed = 0
  let kcalSum = 0
  let protSum = 0
  let alcSum = 0
  for (let i = 0; i < 7; i++) {
    const date = shiftISO(monday, i)
    const h = plausibleHours((db && db.sleepLog && db.sleepLog[date] || {}).hours)
    if (h != null) { nights++; sleepSum += h }
    const t = dayTotals(dayEntries(db, date))
    if (t.k > 0) { fed++; kcalSum += t.k; protSum += t.p; alcSum += t.alc }
  }
  return {
    monday, sunday, load, mins, sessions,
    sleep: nights ? Math.round(sleepSum / nights * 10) / 10 : null,
    kcal: fed ? Math.round(kcalSum / fed) : null,
    prot: fed ? Math.round(protSum / fed) : null,
    alc: fed ? Math.round(alcSum * 10) / 10 : null,
    nights, fed,
  }
}

export const DIMENSIONS = [
  { key: 'load', label: 'Charge', unit: '', dir: 'neutral' },
  { key: 'mins', label: 'Minutes', unit: 'min', dir: 'neutral' },
  { key: 'sessions', label: 'Séances', unit: '', dir: 'neutral' },
  { key: 'sleep', label: 'Sommeil', unit: 'h', dir: 'up' },
  { key: 'kcal', label: 'Apport', unit: 'kcal', dir: 'neutral' },
  { key: 'prot', label: 'Protéines', unit: 'g', dir: 'up' },
]

export const MEANINGFUL_PCT = 10

export function dimensions(db, { weekOf, today } = {}) {
  const { monday } = weekBounds(weekOf || today)
  const cur = weekAggregate(db, monday)
  const past = []
  for (let k = 1; k <= BASELINE_WEEKS; k++) past.push(weekAggregate(db, shiftISO(monday, -7 * k)))
  return DIMENSIONS.map((dim) => {
    const vals = past.map((w) => w[dim.key]).filter((v) => v != null && v > 0)
    const base = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
    const value = cur[dim.key]
    const pct = base && value != null && base > 0 ? Math.round((value - base) / base * 100) : null
    return {
      ...dim, value, base, pct, weeks: vals.length,
      level: pct == null || Math.abs(pct) < MEANINGFUL_PCT ? 'ok' : pct > 0 ? 'up' : 'down',
    }
  })
}

// ─── Régularité de la charge dans la semaine ──────────────
//
// Trois cents points de charge répartis sur cinq jours ne sollicitent pas
// comme les mêmes trois cents concentrés sur deux. La monotonie de Foster
// mesure cet aplatissement, et la contrainte le combine à la charge.

export function weekShape(week) {
  // `monotony` attend les journées, pas leurs charges : lui passer des
  // nombres donnait `undefined.load`, donc une moyenne NaN, qui traversait
  // tout le calcul sans lever et faisait annoncer « charge rigoureusement
  // identique » sur une semaine comptant trois jours de repos.
  const m = monotony(week.days)
  const peak = week.days.reduce((mx, d) => (d.load > mx.load ? d : mx), week.days[0])
  const rest = week.days.filter((d) => d.load === 0).length
  const high = !!m && (m.level === 'warn' || m.level === 'alert')
  return {
    value: m ? m.value : null,
    mean: m ? m.mean : null,
    sd: m ? m.sd : null,
    weekly: m ? m.weekly : null,
    strain: m ? m.strain : null,
    level: m ? m.level : null,
    high,
    restDays: rest,
    peakDate: peak.load > 0 ? peak.date : null,
    peakLoad: peak.load,
    text: high
      ? m.text
      : rest === 0
        ? 'Aucun jour de repos complet cette semaine.'
        : null,
  }
}

// ─── Les conditions traversées ────────────────────────────

export function conditions(db, week) {
  const weather = (db && db.weatherLog) || {}
  const items = []
  for (const d of week.days) {
    const wx = weather[d.date]
    if (!wx || !d.active) continue
    const feels = effectiveTemp(wx)
    if (feels == null) continue
    items.push({ date: d.date, feels, mult: loadMultiplier(wx, {}), env: wx.environment || null })
  }
  if (!items.length) return null
  const hottest = items.reduce((mx, x) => (x.feels > mx.feels ? x : mx), items[0])
  const heavy = items.filter((x) => x.mult > 1.1)
  return {
    days: items.length, items, hottest,
    text: heavy.length
      ? `${heavy.length} séance${heavy.length > 1 ? 's' : ''} dans des conditions qui alourdissent l'effort, jusqu'à ${Math.round(hottest.feels)} °C ressentis : à effort ressenti égal, le travail fourni est supérieur.`
      : null,
  }
}

// ─── Le carburant de la semaine ───────────────────────────
//
// Comparer l'apport des jours d'entraînement à celui des jours creux, sur
// la semaine seule. C'est ce qui distingue une semaine bien conduite d'une
// semaine où l'on a couru à vide.

export const WEEK_UNDERFUEL_PCT = -8

export function fueling(db, week, weightKg) {
  const on = []
  const off = []
  for (const d of week.days) {
    const t = dayTotals(dayEntries(db, d.date))
    if (t.k <= 0) continue
    ;(d.active ? on : off).push(t)
  }
  if (!on.length) return null
  const mean = (list, k) => (list.length ? Math.round(list.reduce((a, x) => a + x[k], 0) / list.length) : null)
  const onK = mean(on, 'k')
  const offK = mean(off, 'k')
  const prot = mean(on.concat(off), 'p')
  const w = num(weightKg)
  const perKg = w && w > 0 && prot != null ? Math.round(prot / w * 100) / 100 : null
  const pct = offK && offK > 0 ? Math.round((onK - offK) / offK * 100) : null
  const under = pct != null && pct <= WEEK_UNDERFUEL_PCT
  return {
    trainingDays: on.length, restDays: off.length,
    onKcal: onK, offKcal: offK, pct, prot, perKg, under,
    text: under
      ? `Tu as mangé ${Math.abs(onK - offK)} kcal de moins les jours de séance que les jours sans. Sur une semaine chargée, c'est ce qui explique une fatigue qu'on attribue d'ordinaire au sommeil.`
      : perKg != null && perKg < 1.4
        ? `${fr(perKg)} g/kg de protéines en moyenne : sous le repère utile pour qui s'entraîne.`
        : null,
  }
}

// ─── Ce qu'il faut retenir ────────────────────────────────
//
// Une rétrospective qui n'aboutit à rien se lit une fois. On termine donc
// par la chose la plus conséquente de la semaine, et une seule.

export function takeaway({ fuel, shape, ctx, cmp, fit, cond }) {
  if (fuel && fuel.under) return { level: 'warn', text: fuel.text }
  if (ctx && ctx.sleep && ctx.sleep.debt != null && ctx.sleep.debt >= 7) {
    return { level: 'warn', text: `${fr(ctx.sleep.debt)} h de dette de sommeil sur la semaine : c'est le poste à traiter avant d'ajouter de la charge.` }
  }
  if (cmp && cmp.basePct != null && cmp.basePct >= 40) {
    return { level: 'warn', text: `Charge en hausse de ${cmp.basePct} % sur tes semaines habituelles : la progression se paie plus tard si elle est trop rapide.` }
  }
  if (shape && shape.high) return { level: 'info', text: shape.text }
  if (fit && fit.missed >= 3) {
    return { level: 'info', text: `${fit.missed} séances prévues non faites : un planning qu'on ne tient pas cesse d'informer. Mieux vaut en prévoir moins et les faire.` }
  }
  if (cond && cond.text) return { level: 'info', text: cond.text }
  if (fuel && fuel.text) return { level: 'info', text: fuel.text }
  return { level: 'ok', text: 'Semaine cohérente : charge, sommeil et apports se tiennent.' }
}

// ─── La semaine qui vient ─────────────────────────────────
//
// Une rétrospective qui s'arrête au constat laisse le travail à faire. Ce
// qui suit en tire des consignes chiffrées : combien de charge, combien de
// séances, combien de grammes, combien d'heures. Chacune est bornée par ce
// que la semaine écoulée a montré, et dit d'où elle sort — un conseil dont
// on ne voit pas la provenance ne se suit pas.

export const REST_DAYS_MIN = 1
export const HARD_DAYS_MIN = 1
export const SLEEP_CATCHUP_MAX = 1

// La charge cible d'une semaine se déduit du rapport aiguë sur chronique :
// rester dans la zone habituelle, sans y entrer par le bas ni la dépasser.
// Deux garde-fous s'ajoutent : une semaine déjà très au-dessus se
// rattrape par le bas, et un déficit de sommeil ou de carburant interdit
// d'augmenter — la charge se supporte avec ce qu'on récupère, pas avec ce
// qu'on décide.
export function loadTarget({ meanBase, lastLoad, underfuelled, sleepDebt }) {
  const base = num(meanBase)
  if (!base || base <= 0) return null
  const ratio = lastLoad > 0 ? lastLoad / base : null
  let lo = Math.round(base * 0.95)
  let hi = Math.round(base * ACWR_SWEET_HIGH)
  let reason = `Ta charge habituelle est de ${base} points par semaine.`
  if (ratio != null && ratio > ACWR_SWEET_HIGH) {
    lo = Math.round(base * ACWR_SWEET_LOW)
    hi = base
    reason = `La semaine écoulée pesait ${Math.round(ratio * 100)} % de ton habitude : celle-ci se joue en dessous, le temps d'absorber.`
  } else if (ratio != null && ratio < ACWR_SWEET_LOW) {
    lo = Math.round(base * ACWR_SWEET_LOW)
    hi = Math.round(base * 1.1)
    reason = `La semaine écoulée était légère (${Math.round(ratio * 100)} % de ton habitude) : remonter progressivement plutôt que d'un coup.`
  }
  let capped = false
  if (underfuelled || (sleepDebt != null && sleepDebt >= 7)) {
    hi = Math.min(hi, base)
    capped = true
  }
  return {
    lo, hi, base, ratio: ratio != null ? Math.round(ratio * 100) / 100 : null, capped, reason,
    text: `Vise ${lo} à ${hi} points de charge. ${reason}${capped ? ' Plafonné à ton habitude tant que le sommeil ou l’apport ne suivent pas : la charge se supporte avec ce qu’on récupère.' : ''}`,
  }
}

// Ce que la charge cible représente en minutes, à l'intensité réellement
// pratiquée la semaine écoulée. Sans cette conversion, un nombre de points
// ne se planifie pas.
export function minutesFor(loadTargetRange, week) {
  if (!loadTargetRange) return null
  const mins = week.days.reduce((a, d) => a + d.mins, 0)
  const load = week.days.reduce((a, d) => a + d.load, 0)
  if (!mins || !load) return null
  const perMin = load / mins
  if (perMin <= 0) return null
  return {
    lo: Math.round(loadTargetRange.lo / perMin / 5) * 5,
    hi: Math.round(loadTargetRange.hi / perMin / 5) * 5,
    intensity: Math.round(perMin * 100) / 100,
  }
}

export function weekPrescription(db, ana, { today, weightKg } = {}) {
  const out = []
  const week = ana.week
  const ctx = ana.context
  const fuel = ana.fueling
  const shape = ana.shape
  const cmp = ana.compare
  const debt = ctx && ctx.sleep ? ctx.sleep.debt : null

  // ─── Charge ───
  const lt = loadTarget({
    meanBase: cmp.meanBase, lastLoad: cmp.load,
    underfuelled: !!(fuel && fuel.under), sleepDebt: debt,
  })
  if (lt) {
    const mn = minutesFor(lt, week)
    out.push({
      id: 'charge', label: 'Charge de la semaine',
      value: `${lt.lo} – ${lt.hi}`, unit: 'points',
      detail: mn ? `soit environ ${mn.lo} à ${mn.hi} min à l’intensité de la semaine écoulée` : null,
      why: lt.text, level: lt.capped ? 'warn' : 'info',
    })
  }

  // ─── Répartition dans la semaine ───
  if (shape) {
    const rest = shape.restDays
    if (rest < REST_DAYS_MIN || shape.high) {
      out.push({
        id: 'repartition', label: 'Jours de repos',
        value: String(Math.max(REST_DAYS_MIN, 2)), unit: 'jours complets',
        detail: rest === 0 ? 'aucun la semaine écoulée' : `${rest} la semaine écoulée`,
        why: shape.high
          ? 'Sans journée franchement plus légère, la récupération ne se place nulle part : c’est l’alternance qui produit l’adaptation, pas le cumul.'
          : 'Un jour sans charge n’est pas une semaine perdue : c’est là que le travail se transforme.',
        level: 'warn',
      })
    }
    const hardDays = week.days.filter((d) => d.hard).length
    if (hardDays < HARD_DAYS_MIN && cmp.load > 0) {
      out.push({
        id: 'intensite', label: 'Séance franchement dure',
        value: '1', unit: 'au moins',
        detail: 'aucune la semaine écoulée',
        why: 'Une semaine sans pic ne fait pas progresser : elle entretient. Un seul jour dur suffit à changer le signal.',
        level: 'info',
      })
    }
  }

  // ─── Sommeil ───
  if (debt != null && debt >= 3 && ctx.sleep.nights >= 3) {
    const perNight = Math.min(SLEEP_CATCHUP_MAX, Math.round(debt / 7 * 10) / 10)
    const need = neededHours(week.days.reduce((a, d) => a + d.mins, 0))
    out.push({
      id: 'sommeil', label: 'Sommeil',
      value: `+${fr(perNight)}`, unit: 'h par nuit',
      detail: `pour viser ${fr(need)} h, contre ${fr(ctx.sleep.mean)} h la semaine écoulée`,
      why: `${fr(debt)} h de dette accumulée. Elle se résorbe par un coucher avancé, pas par une grasse matinée : le crédit d’une nuit longue est plafonné.`,
      level: debt >= 7 ? 'warn' : 'info',
    })
  }

  // ─── Carburant ───
  if (fuel && fuel.under) {
    const gap = Math.abs(fuel.onKcal - fuel.offKcal)
    out.push({
      id: 'apport', label: 'Les jours de séance',
      value: `+${gap}`, unit: 'kcal',
      detail: `${fuel.onKcal} kcal les jours actifs contre ${fuel.offKcal} les jours creux`,
      why: 'L’apport doit monter avec la charge, pas descendre. C’est le même total sur la semaine, simplement déplacé vers les jours où il sert.',
      level: 'warn',
    })
  }
  // Glucides du jour chargé, en grammes, tirés de l'objectif enregistré.
  const tgt = targetForDate(db, week.sunday)
  if (tgt && tgt.days && tgt.days.gros && fuel) {
    const cible = tgt.days.gros.gluc
    const actuel = ana.detail
      ? (() => {
        const gros = ana.detail.filter((d) => d.active && d.sessions.some((sx) => sx.mins >= 90))
        if (!gros.length) return null
        const vals = gros.map((d) => d.kcal).filter(Boolean)
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
      })()
      : null
    if (cible && actuel == null) {
      out.push({
        id: 'glucides', label: 'Glucides les jours chargés',
        value: String(cible), unit: 'g',
        detail: 'objectif enregistré pour une grosse séance',
        why: 'Les glucides sont le seul macronutriment dont le besoin suit la charge : c’est celui qu’on déplace des jours creux vers les jours durs.',
        level: 'info',
      })
    }
  }

  // ─── Protéines ───
  if (fuel && fuel.perKg != null && weightKg) {
    const cible = 1.6
    if (fuel.perKg < cible) {
      const manque = Math.round((cible - fuel.perKg) * weightKg)
      out.push({
        id: 'proteines', label: 'Protéines',
        value: `+${manque}`, unit: 'g par jour',
        detail: `${fr(fuel.perKg)} g/kg la semaine écoulée, pour ${fr(cible)} visé`,
        why: `Répartis sur les prises plutôt qu’ajoutés au dîner : la synthèse répond à la dose par repas, pas au total.`,
        level: 'info',
      })
    }
  }

  // ─── Ce qui a marché ───
  if (ana.highlights && ana.highlights.length) {
    const h = ana.highlights[0]
    out.push({
      id: 'refaire', label: 'À refaire',
      value: h.sportLabel, unit: '',
      detail: `${h.label.toLowerCase()} à ${h.display}`,
      why: 'Un record tombé cette semaine dit quelles conditions te réussissent : les mêmes méritent d’être reproduites avant d’être changées.',
      level: 'ok',
    })
  }
  if (ana.planFit && ana.planFit.missed >= 3) {
    out.push({
      id: 'planning', label: 'Séances à prévoir',
      value: String(Math.max(1, ana.planFit.done)), unit: 'plutôt que ' + (ana.planFit.done + ana.planFit.missed),
      detail: `${ana.planFit.missed} prévues non faites la semaine écoulée`,
      why: 'Un planning qu’on ne tient pas cesse d’informer. Mieux vaut en prévoir moins et les faire toutes.',
      level: 'info',
    })
  }
  return out
}

// ─── La semaine proposée, jour par jour ───────────────────
//
// Une fourchette de charge ne se planifie pas. Ce qui suit propose la
// semaine elle-même : quel jour, quel sport, combien de minutes, à quelle
// intensité, et ce qu'il faut manger et dormir chaque jour.
//
// Rien n'est inventé. Les sports, les durées, les intensités et les jours
// viennent de ce qui a été fait ces dernières semaines : une proposition
// qui ne ressemble pas à ce qu'on fait déjà ne sera pas suivie. Seule la
// quantité totale change, pour atteindre la cible.

export const HABITS_WEEKS = 8
export const DOW_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const EASY_RPE = 4
export const MIN_SESSION_MINS = 20
export const MAX_SESSION_MINS = 240

// Ce que la personne fait d'ordinaire : ses sports, leurs durées, ses
// jours, son intensité.
export function habits(db, { weekOf, today, weeks = HABITS_WEEKS } = {}) {
  const { monday } = weekBounds(weekOf || today)
  const from = shiftISO(monday, -7 * weeks)
  const to = shiftISO(monday, -1)
  const done = asList(db && db.planningSessions)
    .filter((sx) => sx && sx.statut === 'realise' && sx.date && sx.date >= from && sx.date <= to)
  if (!done.length) return null
  const bySportMap = {}
  const dow = [0, 0, 0, 0, 0, 0, 0]
  let mins = 0
  let rpeSum = 0
  let rpeN = 0
  for (const sx of done) {
    const m = dureeToMins(sx.duree)
    if (!m) continue
    mins += m
    const k = sx.sport || 'seance'
    if (!bySportMap[k]) bySportMap[k] = { sport: k, sessions: 0, mins: 0, longest: 0 }
    bySportMap[k].sessions++
    bySportMap[k].mins += m
    bySportMap[k].longest = Math.max(bySportMap[k].longest, m)
    dow[dowOf(sx.date)]++
    const r = sessionRpe(sx)
    if (r) { rpeSum += r; rpeN++ }
  }
  const sports = Object.values(bySportMap)
    .map((x) => ({ ...x, meanMins: Math.round(x.mins / x.sessions), share: mins ? x.mins / mins : 0 }))
    .sort((a, b) => b.mins - a.mins)
  if (!sports.length) return null
  const activeWeeks = Math.max(1, weeks)
  return {
    weeks: activeWeeks,
    sessionsPerWeek: Math.round(done.length / activeWeeks * 10) / 10,
    minsPerWeek: Math.round(mins / activeWeeks),
    meanRpe: rpeN ? Math.round(rpeSum / rpeN * 10) / 10 : null,
    sports,
    // Les jours où l'on s'entraîne le plus souvent, du plus fréquent au moins.
    dowRank: dow.map((n, i) => ({ dow: i, n })).sort((a, b) => b.n - a.n || a.dow - b.dow),
    dow,
  }
}

// Répartit une charge cible sur des séances plausibles.
//
// On part des durées habituelles de chaque sport plutôt que d'un nombre
// arbitraire : une proposition qui ne ressemble pas à ce qu'on fait déjà ne
// sera pas suivie. Puis on ajuste par un facteur commun jusqu'à atteindre la
// cible, en respectant un plafond par séance — personne ne double la durée
// de sa plus longue sortie parce qu'un calcul le demande. Ce que le plafond
// empêche est redistribué sur les séances qui peuvent encore s'allonger.
// On s'autorise à dépasser de dix pour cent la plus longue séance déjà
// faite dans ce sport, pas davantage : c'est ainsi qu'une durée progresse,
// et personne ne double sa sortie la plus longue parce qu'un calcul le
// demande.
export const PROGRESSION_MAX = 1.1

export function allocate(target, sportsForSlots) {
  const n = sportsForSlots.length
  if (!n || !(target > 0)) return []
  const slots = sportsForSlots.map((sp, i) => {
    const typical = Math.max(MIN_SESSION_MINS, Math.round(sp.meanMins || MIN_SESSION_MINS))
    const cap = Math.min(MAX_SESSION_MINS, Math.max(typical, Math.round((sp.longest || typical) * PROGRESSION_MAX)))
    return { sport: sp.sport, rpe: i === 0 ? HARD_RPE : EASY_RPE, mins: typical, cap, typical }
  })
  const loadOf = (list) => list.reduce((a, x) => a + x.mins * (x.rpe / NEUTRAL_RPE), 0)
  for (let pass = 0; pass < 6; pass++) {
    const cur = loadOf(slots)
    if (cur <= 0) break
    const gap = target - cur
    if (Math.abs(gap) < 1) break
    const open = slots.filter((x) => (gap > 0 ? x.mins < x.cap : x.mins > MIN_SESSION_MINS))
    if (!open.length) break
    const weight = open.reduce((a, x) => a + x.rpe / NEUTRAL_RPE, 0)
    if (weight <= 0) break
    const addMins = gap / weight
    for (const x of open) {
      x.mins = Math.max(MIN_SESSION_MINS, Math.min(x.cap, x.mins + addMins))
    }
  }
  for (const x of slots) x.mins = Math.max(MIN_SESSION_MINS, Math.round(x.mins / 5) * 5)
  return slots
}

export function proposeWeek(db, ana, { today, weekOf } = {}) {
  const h = habits(db, { weekOf: weekOf || today, today })
  const presc = (ana.prescription || []).find((x) => x.id === 'charge')
  if (!h || !presc) return null
  const lt = loadTarget({
    meanBase: ana.compare.meanBase, lastLoad: ana.compare.load,
    underfuelled: !!(ana.fueling && ana.fueling.under),
    sleepDebt: ana.context && ana.context.sleep ? ana.context.sleep.debt : null,
  })
  if (!lt) return null
  const target = Math.round((lt.lo + lt.hi) / 2)
  const count = Math.max(1, Math.min(7, Math.round(h.sessionsPerWeek)))
  // La séance dure prend le sport le plus pratiqué ; les suivantes suivent
  // la répartition observée.
  const sportsForSlots = []
  for (let i = 0; i < count; i++) sportsForSlots.push(h.sports[i % h.sports.length])
  const slots = allocate(target, sportsForSlots)

  // Les jours : les plus fréquents d'abord, mais jamais deux durs collés.
  const chosen = []
  for (const d of h.dowRank) {
    if (chosen.length >= count) break
    if (d.n === 0 && chosen.length) continue
    chosen.push(d.dow)
  }
  while (chosen.length < count) {
    const free = [0, 1, 2, 3, 4, 5, 6].find((d) => !chosen.includes(d))
    if (free === undefined) break
    chosen.push(free)
  }
  chosen.sort((a, b) => a - b)

  // La séance dure va sur le jour le plus fréquent, et les sports suivent
  // la répartition observée.
  const hardDow = h.dowRank[0] ? h.dowRank[0].dow : chosen[0]
  const ordered = [hardDow, ...chosen.filter((d) => d !== hardDow)]

  const nextMonday = shiftISO(weekBounds(weekOf || today).monday, 7)
  const tgt = (db && db.foodTargets) || null
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = shiftISO(nextMonday, i)
    const idx = ordered.indexOf(i)
    const slot = idx >= 0 && idx < slots.length ? slots[idx] : null
    const session = slot
      ? { sport: slot.sport, mins: slot.mins, rpe: slot.rpe, hard: slot.rpe >= HARD_RPE }
      : null
    const load = session ? Math.round(session.mins * (session.rpe / NEUTRAL_RPE)) : 0
    const dayType = !session ? 'repos' : session.mins >= 90 || session.hard ? 'gros' : 'normal'
    const fuel = tgt ? forDay(tgt, dayType) : null
    days.push({
      date, dow: i, label: DOW_LABELS[i],
      session, load, dayType,
      kcal: fuel ? fuel.kcal : null,
      gluc: fuel ? fuel.gluc : null,
      prot: fuel ? fuel.prot : null,
    })
  }
  const total = days.reduce((a, d) => a + d.load, 0)
  const restDays = days.filter((d) => !d.session).length
  // Quand les durées habituelles ne suffisent pas à atteindre la cible, on
  // le dit plutôt que d'inventer une sortie deux fois plus longue que tout
  // ce qui a été fait : c'est une séance de plus qu'il faut, pas une séance
  // démesurée.
  const short = total < lt.lo
  const sleep = ana.context && ana.context.sleep && ana.context.sleep.mean != null
    ? {
      mean: ana.context.sleep.mean,
      target: neededHours(days.reduce((a, d) => a + (d.session ? d.session.mins : 0), 0)),
    }
    : null
  return {
    monday: nextMonday, days, total, target, range: { lo: lt.lo, hi: lt.hi },
    sessions: count, restDays, hardDow, sleep, short,
    inRange: total >= lt.lo && total <= lt.hi,
    shortText: short
      ? `Cette semaine atteint ${total} points, sous la cible de ${lt.lo}. Tes durées habituelles ne permettent pas d'aller plus loin sans allonger démesurément une séance : c'est une séance de plus qu'il faudrait, pas une séance plus longue.`
      : null,
    basedOn: `${h.sports.length} sport${h.sports.length > 1 ? 's' : ''} pratiqué${h.sports.length > 1 ? 's' : ''} sur ${h.weeks} semaines, ${fr(h.sessionsPerWeek)} séance${h.sessionsPerWeek > 1 ? 's' : ''} par semaine en moyenne`,
  }
}

// ─── De la proposition au planning ────────────────────────
//
// Une semaine proposée qu'il faut retaper ne sert pas à grand-chose. Ces
// deux fonctions la transforment en séances planifiées, sans écraser ce
// qui existe : si la semaine porte déjà des séances, on ne touche à rien
// et on le dit.

const DUREE_LABELS = { 15: '15 min', 30: '30 min', 45: '45 min', 60: '1 h', 90: '1 h 30', 120: '2 h', 150: '2 h 30', 180: '3 h' }

export function dureeLabel(mins) {
  const m = Math.max(1, Math.round(num(mins) || 0))
  return DUREE_LABELS[m] || `${m} min`
}

export function proposalToSessions(proposal, { stamp } = {}) {
  if (!proposal || !proposal.days) return []
  const t = stamp || Date.now()
  const out = []
  proposal.days.forEach((d, i) => {
    if (!d.session) return
    out.push({
      id: `prop_${t}_${i}`,
      date: d.date,
      heure: '',
      sport: d.session.sport,
      duree: dureeLabel(d.session.mins),
      statut: 'planifie',
      ressenti: null,
      notes: null,
      // Le RPE visé est enregistré comme la donnée de la séance : c'est lui
      // qui portera la charge projetée, et il se corrige après coup par le
      // ressenti réel.
      data: { rpe: d.session.rpe },
      exercises: [],
      source: 'proposition',
    })
  })
  return out
}

// Ce que l'écran doit savoir avant de proposer le bouton.
export function proposalStatus(db, proposal) {
  if (!proposal) return { can: false, reason: 'aucune proposition' }
  const dates = new Set(proposal.days.filter((d) => d.session).map((d) => d.date))
  if (!dates.size) return { can: false, reason: 'aucune séance à inscrire' }
  const existing = asList(db && db.planningSessions)
    .filter((sx) => sx && sx.date && dates.has(sx.date))
  if (existing.length) {
    return {
      can: false, existing: existing.length,
      reason: `${existing.length} séance${existing.length > 1 ? 's' : ''} déjà inscrite${existing.length > 1 ? 's' : ''} sur ces jours — rien n'est écrasé.`,
    }
  }
  return { can: true, count: dates.size, reason: null }
}

// ─── Synthèse narrative ──────────────────────────────────────
export function retroAnalysis(db, { weekOf, today, sportMeta } = {}) {
  const ref = today || todayISO()
  const week = weekDays(db, { weekOf: weekOf || ref, today: ref })
  const cmp = compare(db, { weekOf: weekOf || ref, today: ref })
  const sports = bySport(week, sportMeta)
  const cons = consistency(week)
  const fit = planFit(week, { today: ref })
  const ctx = context(db, { weekOf: weekOf || ref, today: ref })
  const hi = highlights(db, { weekOf: weekOf || ref, today: ref })
  const top = toughest(week, sportMeta)
  const detail = dayDetail(db, week, sportMeta)
  const dims = dimensions(db, { weekOf: weekOf || ref, today: ref })
  const shape = weekShape(week)
  const cond = conditions(db, week)
  const fuel = fueling(db, week, (db && db.profilePhys && db.profilePhys.poids) || null)

  const story = []
  if (!fit.done && !fit.missed) {
    story.push('Aucune séance cette semaine — ni faite, ni prévue.')
  } else if (!fit.done) {
    story.push(`Aucune séance réalisée cette semaine sur les ${fit.missed} prévues.`)
  } else {
    // Ce qu'on a fait de mieux passe en premier : c'est ce qu'on vient
    // chercher en ouvrant une rétrospective.
    if (hi.length) {
      const h = hi[0]
      story.push(`${h.sportLabel} : ${h.label.toLowerCase()} à ${h.display} — ton meilleur résultat sur cette donnée${hi.length > 1 ? `, et ${hi.length - 1} autre${hi.length > 2 ? 's' : ''} record${hi.length > 2 ? 's' : ''} cette semaine` : ''}.`)
    }
    const dur = `${fit.done} séance${fit.done > 1 ? 's' : ''} sur ${cons.active} jour${cons.active > 1 ? 's' : ''}`
    if (cmp.basePct != null && Math.abs(cmp.basePct) >= 20) {
      story.push(`${dur}, pour une charge ${cmp.basePct > 0 ? 'supérieure' : 'inférieure'} de ${Math.abs(cmp.basePct)} % à ta moyenne des ${cmp.baselineWeeks} dernières semaines.`)
    } else if (cmp.meanBase) {
      story.push(`${dur}, pour une charge conforme à tes semaines habituelles.`)
    } else {
      story.push(`${dur}, ${cons.total} points de charge.`)
    }
    if (sports.length > 1) {
      story.push(`Réparti sur ${sports.length} sports, dont ${sports[0].pct} % de ${sports[0].label.toLowerCase()}.`)
    }
    if (top && top.rpe) {
      story.push(`La plus dure : ${top.label.toLowerCase()} du ${top.date.split('-').reverse().join('/')}, ${top.mins} min à RPE ${top.rpe}.`)
    }
    if (fit.missed) {
      story.push(`${fit.missed} séance${fit.missed > 1 ? 's' : ''} prévue${fit.missed > 1 ? 's' : ''} n'${fit.missed > 1 ? 'ont' : 'a'} pas eu lieu.`)
    }
    if (ctx.sleep && ctx.sleep.mean != null && ctx.sleep.mean < 7) {
      story.push(`À replacer dans son contexte : ${fr(ctx.sleep.mean)} h de sommeil par nuit en moyenne sur la semaine.`)
    }
    if (ctx.weight && Math.abs(ctx.weight.delta) >= 0.5) {
      story.push(`Poids : ${ctx.weight.delta > 0 ? '+' : '−'}${fr(Math.abs(ctx.weight.delta))} kg sur la semaine.`)
    }
    // La forme de la semaine, les conditions traversées et le carburant :
    // trois choses qui expliquent la charge autant qu'elles la subissent.
    if (shape && shape.text) story.push(shape.text)
    if (cond && cond.text) story.push(cond.text)
    if (fuel && fuel.text) story.push(fuel.text)
    // Les dimensions qui ont franchement bougé, sommeil et apports compris.
    const moved = dims.filter((d) => d.level !== 'ok' && d.key !== 'load' && d.key !== 'mins' && d.base != null)
    if (moved.length) {
      story.push(moved.map((d) => `${d.label.toLowerCase()} ${d.pct > 0 ? '+' : ''}${d.pct} %`).join(', ')
        + ` par rapport à tes ${BASELINE_WEEKS} dernières semaines.`)
    }
  }

  const keep = takeaway({ fuel, shape, ctx, cmp, fit, cond })

  const result = {
    week, compare: cmp, sports, consistency: cons, planFit: fit, context: ctx,
    highlights: hi, toughest: top, story,
    detail, dimensions: dims, shape, conditions: cond, fueling: fuel, takeaway: keep,
  }
  result.prescription = weekPrescription(db, result, { today: ref, weightKg: (db && db.profilePhys && db.profilePhys.poids) || null })
  result.proposal = proposeWeek(db, result, { today: ref, weekOf: weekOf || ref })
  return result
}
