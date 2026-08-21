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
import { nutriAnalysis } from '../nutrition/nutriIntel'
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
      story.push(`À replacer dans son contexte : ${ctx.sleep.mean} h de sommeil par nuit en moyenne sur la semaine.`)
    }
    if (ctx.weight && Math.abs(ctx.weight.delta) >= 0.5) {
      story.push(`Poids : ${ctx.weight.delta > 0 ? '+' : '−'}${Math.abs(ctx.weight.delta)} kg sur la semaine.`)
    }
  }

  return { week, compare: cmp, sports, consistency: cons, planFit: fit, context: ctx, highlights: hi, toughest: top, story }
}
