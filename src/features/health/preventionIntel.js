// ============================================================
// Suivi de la prévention dans le temps.
//
// Le bilan écrasait le précédent : impossible de savoir si le risque
// avait baissé après avoir corrigé quelque chose, ni quels points
// faibles traînaient depuis des mois. Une douleur, elle, était marquée
// « active » sans que sa durée ne soit jamais relue — alors que c'est
// précisément ce qui distingue une gêne passagère d'un problème à faire
// voir, et que le questionnaire pose lui-même la question.
//
// Ce module ajoute la dimension manquante : la durée. Depuis quand cette
// douleur, depuis quand ce point faible, depuis quand ce bilan.
//
// Repères d'orientation, pas un diagnostic.
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

// Cinquante-huit fonctions d'analyse reçoivent leur date de référence dans un
// objet d'options, seize la reçoivent en second argument. Passer `{ today }`
// à l'une de ces seize ne levait pas à l'appel : la date devenait un objet, et
// la panne surgissait plus loin, dans une comparaison de chaînes. Les deux
// formes sont donc acceptées plutôt que de laisser le piège ouvert.
function refDay(today) {
  if (typeof today === 'string' && today) return today
  if (today && typeof today === 'object' && typeof today.today === 'string') return today.today
  return todayISO()
}

// `x || []` ne protège que de `null` et `undefined`. Une liste stockée en
// base peut revenir sous une autre forme — écriture partielle, donnée écrite
// par une version antérieure — et l'objet passe alors la garde pour faire
// échouer le `.filter` juste après. L'écran entier meurt, loin de sa cause.
function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// Conseils rattachés aux points faibles du questionnaire. Ils vivaient
// dans l'écran, donc restaient inaccessibles au moteur de
// recommandations, qui ne pouvait que dire « tu as un point faible »
// sans dire lequel ni quoi en faire.
export const RECO = {
  charge: 'Charge en hausse → progression plus graduelle (~10 %/sem max) + jours de repos.',
  recup: 'Récup/sommeil à soigner → vise 7–9 h, ajoute mobilité et une vraie journée off.',
  energie: 'Énergie → vérifie tes apports (onglet Nutrition). En cas de doute, parles-en à un professionnel.',
  prop: 'Équilibre faible → travaille la proprioception (équilibre unipodal, surfaces instables).',
  hanche: 'Hanche/valgus → renforce abducteurs et fessiers (coquille, abductions, pont).',
  echauffement: 'Échauffement → 5–10 min progressif + quelques gammes avant les séances intenses.',
  terrain: 'Terrain → varie les surfaces et introduis tout changement progressivement.',
  materiel: 'Chaussures → change de modèle en douceur (alterne ancien/nouveau sur 2–3 semaines).',
  cheville: 'Cheville raide → mobilité de cheville (genou au mur, fentes mobiles, mollets).',
  mobilite: 'Souplesse limitée → mobilité ciblée ischios/mollets/hanches au quotidien.',
  core: 'Gainage faible → renforce le tronc (planches, dead bug, anti-rotation).',
  technique: 'Foulée → vise une cadence un peu plus élevée et un appui sous le centre de gravité.',
  antecedent: 'Zone sensible récurrente → renfo ciblé + surveille la charge ; si ça revient, bilan pro.',
}

// ─── Historique des bilans ───────────────────────────────────
export function bilanHistory(db) {
  const log = asList(db && db.preventionLog)
  return log
    .filter((b) => b && /^\d{4}-\d{2}-\d{2}$/.test(b.date) && num(b.score) != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Un bilan ancien décrit une situation qui n'existe peut-être plus. Le
// score de prévention s'appuyait dessus sans jamais dire son âge.
export const STALE_DAYS = 45
export const VERY_STALE_DAYS = 90

export function bilanFreshness(db, today) {
  const ref = refDay(today)
  const hist = bilanHistory(db)
  const last = hist.length ? hist[hist.length - 1].date : ((db && db.prevention && db.prevention.date) || null)
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return { date: null, days: null, level: 'absent', text: 'Aucun bilan de prévention enregistré.' }
  const days = Math.max(0, daysBetween(last, ref))
  if (days >= VERY_STALE_DAYS) return { date: last, days, level: 'stale', text: `Ton dernier bilan date de ${days} jours : il ne dit plus grand-chose de ta situation actuelle.` }
  if (days >= STALE_DAYS) return { date: last, days, level: 'aging', text: `Ton dernier bilan a ${days} jours — le refaire prend quelques minutes et remet le score à jour.` }
  return { date: last, days, level: 'fresh', text: days === 0 ? 'Bilan fait aujourd’hui.' : `Bilan à jour (il y a ${days} jour${days > 1 ? 's' : ''}).` }
}

// Évolution du risque d'un bilan à l'autre. Sans cette comparaison, rien
// ne disait si les corrections entreprises avaient servi à quelque chose.
export function riskTrend(db) {
  const hist = bilanHistory(db)
  if (hist.length < 2) return null
  const last = hist[hist.length - 1]
  const prev = hist[hist.length - 2]
  const diff = num(last.score) - num(prev.score)
  const span = daysBetween(prev.date, last.date)
  let level, text
  if (diff <= -8) { level = 'ok'; text = `Ton risque a baissé de ${Math.abs(diff)} points depuis le bilan précédent (${span} jours plus tôt).` }
  else if (diff >= 8) { level = 'warn'; text = `Ton risque a monté de ${diff} points depuis le bilan précédent (${span} jours plus tôt).` }
  else { level = 'flat'; text = `Risque stable depuis le bilan précédent (${diff >= 0 ? '+' : ''}${diff} points sur ${span} jours).` }
  return { last, prev, diff, span, level, text, count: hist.length }
}

// Points faibles présents au dernier bilan et déjà présents avant : ce
// sont ceux sur lesquels rien n'a bougé, donc ceux à traiter en priorité.
export function tagPersistence(db) {
  const hist = bilanHistory(db)
  if (!hist.length) return { persistent: [], resolved: [], appeared: [], count: hist.length }
  const last = new Set(hist[hist.length - 1].tags || [])
  if (hist.length < 2) return { persistent: [], resolved: [], appeared: [], count: hist.length }
  const prev = new Set(hist[hist.length - 2].tags || [])
  // Nombre de bilans consécutifs, en remontant, où le point est présent.
  const streak = (tag) => {
    let n = 0
    for (let i = hist.length - 1; i >= 0; i--) {
      if ((hist[i].tags || []).includes(tag)) n++
      else break
    }
    return n
  }
  return {
    persistent: [...last].filter((t) => prev.has(t)).map((t) => ({ tag: t, bilans: streak(t) })).sort((a, b) => b.bilans - a.bilans),
    resolved: [...prev].filter((t) => !last.has(t)),
    appeared: [...last].filter((t) => !prev.has(t)),
    count: hist.length,
  }
}

// ─── Épisodes de douleur ─────────────────────────────────────
// Seuils repris du questionnaire lui-même, qui distingue déjà « quelques
// jours », « 1 à 3 semaines » et « plus de 3 semaines ».
export const PAIN_SUBACUTE_DAYS = 7
export const PAIN_CHRONIC_DAYS = 21

export const REGION_LABELS = {
  pied: 'pied / orteils', talon: 'talon / dessous du pied', cheville: 'cheville',
  jambe: 'tibia / mollet', genou: 'genou', quadri: 'cuisse avant',
  ischio: 'cuisse arrière', hanche: 'hanche / bassin', dos: 'bas du dos',
}

export function regionLabel(r) {
  return REGION_LABELS[r] || r || 'zone non précisée'
}

export function painEpisodes(db) {
  const list = asList(db && db.painEpisodes)
  return list
    .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.start))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function openEpisode(db) {
  const eps = painEpisodes(db)
  for (let i = eps.length - 1; i >= 0; i--) if (!eps[i].end) return eps[i]
  return null
}

// Durée de la douleur en cours, et ce qu'elle implique. Une gêne de trois
// jours et une gêne de six semaines appelaient jusqu'ici exactement le
// même message.
export function painDuration(db, today) {
  const ref = refDay(today)
  const ep = openEpisode(db)
  if (!ep) return null
  const days = Math.max(0, daysBetween(ep.start, ref))
  const region = regionLabel(ep.region)
  let level, text
  if (days >= PAIN_CHRONIC_DAYS) {
    level = 'alert'
    text = `Douleur au ${region} depuis ${days} jours. Au-delà de trois semaines, ça ne relève plus du repos et de la patience : fais-la voir par un professionnel de santé.`
  } else if (days >= PAIN_SUBACUTE_DAYS) {
    level = 'warn'
    text = `Douleur au ${region} depuis ${days} jours. Si elle n’a pas nettement diminué d’ici la fin de la troisième semaine, prends un avis professionnel.`
  } else {
    level = 'info'
    text = `Douleur au ${region} depuis ${days} jour${days > 1 ? 's' : ''}. Allège les impacts et observe l’évolution.`
  }
  if (ep.urgent) {
    level = 'alert'
    text = `Douleur au ${region} depuis ${days} jour${days > 1 ? 's' : ''}, avec des signes qui appellent un avis professionnel sans attendre.`
  }
  return { episode: ep, days, region, level, text, urgent: !!ep.urgent }
}

// Zones qui reviennent. Le questionnaire demande « une zone qui se
// rappelle souvent à toi ? » — l'application peut désormais répondre à
// partir des faits plutôt que de la mémoire de la personne.
export function recurrentRegions(db, { minEpisodes = 2 } = {}) {
  const by = {}
  for (const e of painEpisodes(db)) {
    const r = e.region || 'inconnue'
    if (!by[r]) by[r] = { region: r, label: regionLabel(r), episodes: 0, totalDays: 0, last: null }
    by[r].episodes++
    by[r].last = e.start
    if (e.end) by[r].totalDays += Math.max(0, daysBetween(e.start, e.end))
  }
  return Object.values(by).filter((r) => r.episodes >= minEpisodes).sort((a, b) => b.episodes - a.episodes)
}

// ─── Charge auto-déclarée vs charge mesurée ──────────────────
// Le questionnaire demande si le volume a augmenté de plus de 10 % —
// l'application le sait par les séances enregistrées. Quand les deux se
// contredisent, c'est la mesure qui tranche, et le dire vaut mieux que
// laisser le score reposer sur une estimation de mémoire.
export function loadCrossCheck(db, acwr) {
  const p = (db && db.prevention) || null
  if (!p || !acwr || acwr.ratio == null) return null
  const declared = (p.tags || []).includes('charge')
  const measured = acwr.ratio > 1.3
  if (declared === measured) return null
  if (measured && !declared) {
    return {
      level: 'warn', declared, measured, ratio: acwr.ratio,
      text: `Tu n’as pas signalé de hausse de charge, mais tes séances enregistrées donnent un rapport charge aiguë / chronique de ${acwr.ratio} — au-dessus de 1,3, la zone où le risque de blessure augmente.`,
    }
  }
  return {
    level: 'info', declared, measured, ratio: acwr.ratio,
    text: `Tu as signalé une hausse de charge, mais tes séances enregistrées donnent un rapport de ${acwr.ratio}, qui reste dans la zone habituelle.`,
  }
}

// ─── Synthèse ────────────────────────────────────────────────
export function preventionAnalysis(db, { today, acwr } = {}) {
  const ref = refDay(today)
  const freshness = bilanFreshness(db, ref)
  const trend = riskTrend(db)
  const tags = tagPersistence(db)
  const pain = painDuration(db, ref)
  const recurrent = recurrentRegions(db)
  const loadCheck = loadCrossCheck(db, acwr)
  const history = bilanHistory(db)

  const tips = []
  if (pain) tips.push(pain.text)
  if (recurrent.length) {
    const r = recurrent[0]
    tips.push(`Le ${r.label} t’a déjà gêné ${r.episodes} fois : une zone qui revient demande un renforcement ciblé et un avis professionnel, pas seulement du repos entre deux épisodes.`)
  }
  if (loadCheck && loadCheck.level === 'warn') tips.push(loadCheck.text)
  if (tags.persistent.length) {
    const worst = tags.persistent[0]
    if (worst.bilans >= 2) tips.push(`Ce point faible ressort sur tes ${worst.bilans} derniers bilans : rien n’a bougé de ce côté, c’est là que l’effort paiera le plus.`)
  }
  if (tags.resolved.length) tips.push(`${tags.resolved.length} point${tags.resolved.length > 1 ? 's' : ''} faible${tags.resolved.length > 1 ? 's' : ''} ${tags.resolved.length > 1 ? 'ont' : 'a'} disparu depuis le bilan précédent.`)
  if (trend && trend.level === 'warn') tips.push(trend.text)
  if (freshness.level === 'stale' || freshness.level === 'aging') tips.push(freshness.text)
  if (!tips.length) {
    tips.push(freshness.level === 'absent'
      ? 'Fais le bilan de prévention : c’est ce qui permet de suivre l’évolution de ton risque au fil des mois.'
      : 'Rien à signaler côté prévention. Refais le bilan après un changement de charge ou de matériel.')
  }

  return { freshness, trend, tags, pain, recurrent, loadCheck, history, tips }
}
