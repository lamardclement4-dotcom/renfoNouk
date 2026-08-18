// ============================================================
// Analyse de l'hydratation, de la caféine et des sucres.
//
// Chaque boisson enregistrée porte un horodatage — et rien ne le lisait.
// L'écran affichait trois graphes de totaux quotidiens, et une préférence
// « coupure caféine du soir » purement décorative : elle servait à
// composer une phrase de conseil, jamais à vérifier ce qui avait
// réellement été bu après cette heure-là.
//
// Le même écran énonce que la caféine a une demi-vie de cinq à sept
// heures sans jamais s'en servir. C'est pourtant cette donnée, croisée
// avec l'heure des prises, qui permet de dire ce qu'il en reste au
// coucher — et de rapprocher un café tardif d'une mauvaise nuit
// enregistrée le lendemain.
//
// Repères d'usage courant, pas des prescriptions.
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

// Mêmes conventions de lecture que l'écran : le facteur d'hydratation
// pondère le volume (un café hydrate moins qu'un verre d'eau), et
// l'ancien champ `mg` reste accepté à côté de `caf`.
export function entryWaterMl(e) {
  return (num(e && e.ml) || 0) * (e && e.factor != null ? (num(e.factor) || 0) : 1)
}
export function entryCaf(e) {
  return num(e && (e.caf != null ? e.caf : e.mg)) || 0
}
export function entrySugar(e) {
  return num(e && e.sugar) || 0
}

// Heure de la prise, en heures décimales. Les entrées anciennes peuvent
// ne pas avoir d'horodatage : on renvoie null plutôt que minuit, qui
// ferait passer toute la journée pour une consommation nocturne.
export function entryHour(e) {
  const ts = num(e && e.ts)
  if (!ts || ts <= 0) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() + d.getMinutes() / 60
}

// ─── Séries quotidiennes ─────────────────────────────────────
export function daySeries(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const log = (db && db.hydroLog) || {}
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const entries = log[date]
    if (!Array.isArray(entries) || !entries.length) continue
    let ml = 0, caf = 0, sugar = 0
    const hours = []
    for (const e of entries) {
      if (!e) continue
      ml += entryWaterMl(e)
      caf += entryCaf(e)
      sugar += entrySugar(e)
      const h = entryHour(e)
      if (h != null) hours.push({ h, caf: entryCaf(e), ml: entryWaterMl(e) })
    }
    out.push({ date, ml: Math.round(ml), caf: Math.round(caf), sugar: Math.round(sugar), entries: entries.length, hours })
  }
  return out
}

export function averages(series) {
  if (!series || !series.length) return null
  const m = (k) => Math.round(series.reduce((a, d) => a + d[k], 0) / series.length)
  return { days: series.length, ml: m('ml'), caf: m('caf'), sugar: m('sugar') }
}

// ─── Assiduité face à la cible ───────────────────────────────
// Une moyenne correcte peut recouvrir une majorité de journées sous la
// cible compensées par quelques journées très hautes : boire trois
// litres le dimanche ne rattrape pas une semaine à un litre.
export function adherence(series, targetMl) {
  const t = num(targetMl)
  if (!series || !series.length || !t || t <= 0) return null
  const hit = series.filter((d) => d.ml >= t * 0.9).length
  const low = series.filter((d) => d.ml < t * 0.7).length
  const pct = Math.round(hit / series.length * 100)
  let level, text
  if (pct >= 70) { level = 'ok'; text = `Cible atteinte ${hit} jours sur ${series.length}.` }
  else if (pct >= 40) { level = 'warn'; text = `Cible atteinte ${hit} jours sur ${series.length} — la moyenne masque ${low} journées nettement en dessous.` }
  else { level = 'alert'; text = `Cible atteinte seulement ${hit} jours sur ${series.length}, et ${low} journées sous 70 % de la cible.` }
  return { hit, low, days: series.length, pct, target: t, level, text }
}

// ─── Caféine ─────────────────────────────────────────────────
// Demi-vie retenue par l'écran lui-même. Elle sert ici à estimer ce qu'il
// reste en circulation à l'heure du coucher, ce qu'aucun total quotidien
// ne peut dire : 200 mg à 8 h et 200 mg à 18 h font le même total et pas
// du tout la même nuit.
export const CAF_HALF_LIFE_H = 6
export const CAF_DAILY_REF = 400
export const CAF_BEDTIME_CONCERN = 50

export function residualCaffeineAt(dayEntry, bedHour) {
  if (!dayEntry || !dayEntry.hours || !dayEntry.hours.length) return null
  const bed = num(bedHour)
  if (bed == null) return null
  let residual = 0
  let counted = 0
  for (const p of dayEntry.hours) {
    if (!p.caf) continue
    counted++
    const elapsed = bed - p.h
    // Une prise postérieure au coucher relève d'un décalage de saisie :
    // on ne la compte pas plutôt que de lui prêter un effet rétroactif.
    if (elapsed < 0) continue
    residual += p.caf * Math.pow(0.5, elapsed / CAF_HALF_LIFE_H)
  }
  if (!counted) return null
  return Math.round(residual)
}

// Prises de caféine après l'heure de coupure choisie. La préférence
// existait et n'était comparée à rien.
export function lateCaffeine(series, cutoffHour, { bedHour = 23 } = {}) {
  const cut = num(cutoffHour)
  if (!series || !series.length || cut == null) return null
  const withHours = series.filter((d) => d.hours.length)
  if (!withHours.length) return null
  const days = withHours.map((d) => {
    const late = d.hours.filter((p) => p.caf > 0 && p.h >= cut)
    return {
      date: d.date,
      lateMg: Math.round(late.reduce((a, p) => a + p.caf, 0)),
      lateCount: late.length,
      residual: residualCaffeineAt(d, bedHour),
    }
  })
  const offenders = days.filter((d) => d.lateMg > 0)
  const highResidual = days.filter((d) => d.residual != null && d.residual >= CAF_BEDTIME_CONCERN)
  const meanResidual = (() => {
    const v = days.filter((d) => d.residual != null).map((d) => d.residual)
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
  })()
  let level, text
  if (!offenders.length) { level = 'ok'; text = `Aucune prise de caféine après ${cut} h sur ${withHours.length} jours suivis.` }
  else if (highResidual.length >= 2) { level = 'warn'; text = `${offenders.length} journées avec de la caféine après ${cut} h, et ${highResidual.length} soirs où il en restait plus de ${CAF_BEDTIME_CONCERN} mg au coucher.` }
  else { level = 'info'; text = `${offenders.length} journée${offenders.length > 1 ? 's' : ''} avec de la caféine après ${cut} h.` }
  return { cutoff: cut, bedHour, days, offenders: offenders.length, highResidual: highResidual.length, meanResidual, trackedDays: withHours.length, level, text }
}

export function caffeineLoad(avg) {
  if (!avg) return null
  const v = avg.caf
  if (v <= 0) return { mg: 0, level: 'none', text: 'Aucune caféine enregistrée.' }
  if (v <= CAF_DAILY_REF) return { mg: v, level: 'ok', text: `${v} mg par jour en moyenne, sous le repère de ${CAF_DAILY_REF} mg.` }
  return { mg: v, level: 'warn', text: `${v} mg par jour en moyenne, au-dessus du repère de ${CAF_DAILY_REF} mg pour un adulte.` }
}

// ─── Croisement caféine du soir × sommeil ────────────────────
// Les deux journaux existaient côte à côte sans jamais se rencontrer. La
// nuit qui suit une journée est enregistrée le lendemain.
export function caffeineVsSleep(db, series, cutoffHour, { minEach = 3 } = {}) {
  const cut = num(cutoffHour)
  const sleepLog = (db && db.sleepLog) || {}
  if (!series || cut == null) return null
  const withLate = []
  const without = []
  for (const d of series) {
    if (!d.hours.length) continue
    const night = sleepLog[shiftISO(d.date, 1)]
    const q = night ? num(night.quality) : null
    const h = night ? num(night.hours) : null
    if (q == null && h == null) continue
    const late = d.hours.some((p) => p.caf > 0 && p.h >= cut)
    ;(late ? withLate : without).push({ date: d.date, quality: q, hours: h })
  }
  if (withLate.length < minEach || without.length < minEach) return null
  const mean = (arr, k) => {
    const v = arr.filter((x) => x[k] != null).map((x) => x[k])
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
  }
  const qLate = mean(withLate, 'quality')
  const qOther = mean(without, 'quality')
  const hLate = mean(withLate, 'hours')
  const hOther = mean(without, 'hours')
  const qDiff = qLate != null && qOther != null ? Math.round((qLate - qOther) * 10) / 10 : null
  const hDiff = hLate != null && hOther != null ? Math.round((hLate - hOther) * 10) / 10 : null
  const flagged = (qDiff != null && qDiff <= -0.5) || (hDiff != null && hDiff <= -0.5)
  return {
    nightsLate: withLate.length, nightsOther: without.length,
    qualityLate: qLate, qualityOther: qOther, qualityDiff: qDiff,
    hoursLate: hLate, hoursOther: hOther, hoursDiff: hDiff,
    flagged, cutoff: cut,
  }
}

// ─── Répartition dans la journée ─────────────────────────────
// Boire deux litres est une chose, les boire au bon moment en est une
// autre : tout rattraper le soir n'hydrate pas la journée et perturbe la
// nuit.
export const EVENING_HOUR = 18

export function distribution(series, { eveningHour = EVENING_HOUR } = {}) {
  const withHours = (series || []).filter((d) => d.hours.length)
  if (!withHours.length) return null
  let total = 0, evening = 0, morning = 0
  for (const d of withHours) {
    for (const p of d.hours) {
      total += p.ml
      if (p.h >= eveningHour) evening += p.ml
      if (p.h < 12) morning += p.ml
    }
  }
  if (total <= 0) return null
  const eveningPct = Math.round(evening / total * 100)
  const morningPct = Math.round(morning / total * 100)
  let level = 'ok', text = `Apports répartis sur la journée (${morningPct} % avant midi, ${eveningPct} % après ${eveningHour} h).`
  if (eveningPct >= 40) { level = 'warn'; text = `${eveningPct} % de tes apports arrivent après ${eveningHour} h : boire en soirée ne rattrape pas la journée, et coupe la nuit.` }
  else if (morningPct <= 15) { level = 'info'; text = `Seulement ${morningPct} % de tes apports avant midi — la matinée est le moment le plus souvent oublié.` }
  return { eveningPct, morningPct, totalMl: Math.round(total), days: withHours.length, eveningHour, level, text }
}

// ─── Sucres ──────────────────────────────────────────────────
// Repère de l'OMS sur les sucres libres : 10 % de l'apport énergétique,
// avec un bénéfice supplémentaire en dessous de 5 %. Ici seuls les sucres
// des boissons sont comptés, ce qui en fait un plancher, pas un total.
export const SUGAR_REF_G = 50
export const SUGAR_IDEAL_G = 25

export function sugarLoad(avg) {
  if (!avg) return null
  const v = avg.sugar
  if (v <= 0) return { g: 0, level: 'ok', text: 'Aucun sucre issu des boissons.' }
  if (v <= SUGAR_IDEAL_G) return { g: v, level: 'ok', text: `${v} g de sucres par jour via les boissons.` }
  if (v <= SUGAR_REF_G) return { g: v, level: 'info', text: `${v} g de sucres par jour via les seules boissons — déjà la moitié du repère de ${SUGAR_REF_G} g, avant même l'alimentation.` }
  return { g: v, level: 'warn', text: `${v} g de sucres par jour via les seules boissons, au-delà du repère de ${SUGAR_REF_G} g — et cela ne compte pas ce que tu manges.` }
}

// ─── Synthèse ────────────────────────────────────────────────
export function hydroAnalysis(db, { days = 28, today, targetMl, bedHour = 23 } = {}) {
  const series = daySeries(db, { days, today })
  const avg = averages(series)
  const prefs = (db && db.hydroPrefs) || {}
  const cutoff = num(prefs.eveningCutoff) != null ? num(prefs.eveningCutoff) : 16
  const adh = adherence(series, targetMl)
  const late = lateCaffeine(series, cutoff, { bedHour })
  const caf = caffeineLoad(avg)
  const sugar = sugarLoad(avg)
  const dist = distribution(series)
  const vsSleep = caffeineVsSleep(db, series, cutoff)

  const tips = []
  if (!series.length) {
    tips.push(`Aucune boisson enregistrée sur ${days} jours.`)
  } else {
    if (vsSleep && vsSleep.flagged) {
      const parts = []
      if (vsSleep.qualityDiff != null && vsSleep.qualityDiff <= -0.5) parts.push(`qualité ${vsSleep.qualityLate}/5 contre ${vsSleep.qualityOther}`)
      if (vsSleep.hoursDiff != null && vsSleep.hoursDiff <= -0.5) parts.push(`${vsSleep.hoursLate} h contre ${vsSleep.hoursOther} h`)
      tips.push(`Les nuits qui suivent une caféine après ${cutoff} h sont moins bonnes que les autres (${parts.join(', ')}, sur ${vsSleep.nightsLate} et ${vsSleep.nightsOther} nuits). C'est ton propre historique, pas une moyenne de population.`)
    } else if (late && late.level === 'warn') {
      tips.push(`${late.text} Avec une demi-vie de ${CAF_HALF_LIFE_H} heures, une tasse à ${cutoff} h agit encore au coucher.`)
    }
    if (adh && adh.level !== 'ok') tips.push(adh.text)
    if (dist && dist.level === 'warn') tips.push(dist.text)
    if (caf && caf.level === 'warn') tips.push(caf.text)
    if (sugar && sugar.level === 'warn') tips.push(sugar.text)
    const noTs = series.every((d) => !d.hours.length)
    if (noTs) tips.push('Les boissons enregistrées n’ont pas d’horaire : la répartition dans la journée et l’effet de la caféine du soir ne peuvent pas être analysés.')
  }
  if (!tips.length) tips.push('Hydratation régulière, caféine et sucres dans les repères. Rien à ajuster.')

  return { days, series, averages: avg, adherence: adh, lateCaffeine: late, caffeine: caf, sugar, distribution: dist, vsSleep, cutoff, tips }
}
