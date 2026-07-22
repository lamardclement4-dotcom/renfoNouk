// ============================================================
// coachChat — moteur de conversation du Coach. Déterministe (pas un
// LLM : l'app est un site statique, aucune clé d'API ne peut vivre côté
// client). Deux couches :
//  1) Analyse du message : extraction d'entités (zone du corps, nom
//     d'exercice suivi, sport du profil, date relative "hier"/"demain")
//     + garde-fous de négation/idiome (ex. "pas mal" ou "j'ai du mal à
//     dormir" ne doivent pas déclencher une alerte douleur).
//  2) Détection d'intention(s) : plusieurs sujets peuvent matcher dans
//     un même message ("je suis fatigué et j'ai mal au dos") — chacun
//     est résolu séparément puis combiné en une seule réponse, au lieu
//     de ne retenir que le premier mot-clé trouvé. Une passe de secours
//     tolérante aux fautes de frappe (distance de Levenshtein) prend le
//     relais si aucune règle exacte ne matche.
// Chaque réponse est construite à partir des VRAIES données de
// l'utilisateur via RenfoIntel, peut proposer une action (ouvrir un
// module, lancer une séance) et des suggestions de relance.
// ============================================================
import { pillarSleep, pillarLoad, acwrRisk, trainingStats, trainingTotals, peakReadiness, projectedAcwr, consecutiveDaysBefore, mondayRetro, hydroDay, hydricTargetMl, nutritionDay, globalScore, dureeToMins } from './renfoIntel'
import { SESSIONS, SPORTS } from './trainData'
import { computePeakPlan } from './PeakSpace'
import { cycleInfo } from '../health/Cycle'
import { PHASES } from '../health/cycleData'

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').split('').filter((ch) => {
    const c = ch.charCodeAt(0)
    return !(c >= 0x0300 && c <= 0x036f)
  }).join('')
}
function todayISO() {
  const d = new Date()
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function isoOffset(days) {
  const d = new Date(); d.setDate(d.getDate() + days)
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function fmtMins(m) { const h = Math.floor(m / 60); return h ? `${h} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}` : `${m} min` }

export const STARTER_CHIPS = ["Quelle séance aujourd'hui ?", 'Comment est ma charge ?', 'Je me sens fatigué', 'Résumé de mes stats']
const DEFAULT_CHIPS = ["Quelle séance aujourd'hui ?", 'Mon sommeil', 'Ma charge', 'Mes records']

export function coachGreeting() {
  return {
    from: 'coach',
    text: "Salut ! Je suis ton coach. Pose-moi une question sur ton entraînement, ta forme du jour, ton sommeil, ta charge, tes records… Je te réponds avec tes vraies données.",
    chips: STARTER_CHIPS,
  }
}

// ============================================================
// Analyse du message : négation/idiomes + extraction d'entités
// ============================================================

// "pas mal" est une expression figée ("pas mal du tout" = plutôt bien),
// et "j'ai du mal à/de dormir/m'endormir/..." exprime une difficulté, pas
// une douleur — sans ce garde-fou "j'ai du mal à dormir" déclenchait par
// erreur l'alerte douleur (mot "mal" détecté hors contexte de blessure).
function isMalAsPain(t) {
  if (/\bpas mal\b/.test(t)) return false
  if (/\bdu mal (a|à|de|pour)\b/.test(t)) return false
  return /\bmal\b/.test(t)
}
function testPain(t) {
  return /(douleur|blessure|blesse|bobo)/.test(t) || isMalAsPain(t)
}

// Mots du corps → zones de mobilité (trainData.ZONES). Le genou n'est pas
// une zone testée directement : les deux zones qui influencent le plus le
// genou (hanches, chevilles) sont proposées comme piste.
const ZONE_KEYWORDS = {
  dos: ['post'], lombaire: ['post'], lombaires: ['post'], ischio: ['post'], ischios: ['post'],
  hanche: ['hanches'], hanches: ['hanches'], aine: ['flechisseurs'], psoas: ['flechisseurs'],
  epaule: ['epaules'], epaules: ['epaules'],
  thorax: ['thoracique'], buste: ['thoracique'],
  nuque: ['nuque'], cou: ['nuque'], cervical: ['nuque'], cervicales: ['nuque'],
  cheville: ['chevilles'], chevilles: ['chevilles'],
  genou: ['hanches', 'chevilles'], genoux: ['hanches', 'chevilles'],
  ventre: ['core'], abdos: ['core'], gainage: ['core'], tronc: ['core'],
  equilibre: ['equilibre'],
}
function extractZoneIds(t) {
  const ids = new Set()
  for (const kw of Object.keys(ZONE_KEYWORDS)) {
    if (new RegExp('\\b' + kw + '\\b').test(t)) ZONE_KEYWORDS[kw].forEach((id) => ids.add(id))
  }
  return Array.from(ids)
}

// Nom d'exercice suivi dans db.exerciseHistory mentionné dans le message
// (ex. "mon record au développé couché") — préfère le nom le plus long
///spécifique en cas de matches multiples.
function extractExerciseName(t, db) {
  const hist = db.exerciseHistory || {}
  let best = null
  for (const name of Object.keys(hist)) {
    const normName = norm(name)
    if (normName.length > 2 && t.includes(normName) && (!best || normName.length > norm(best).length)) best = name
  }
  return best
}

// Sport du profil mentionné dans le message (ex. "je fais quoi en course
// aujourd'hui ?") — permet une réponse ciblée plutôt que générique.
// Compare mot par mot plutôt que sur le libellé entier : "en course" doit
// matcher "Course à pied" même sans "à pied" ; on garde le mot le plus
// long trouvé (plus spécifique, moins de faux positifs sur des mots courts).
function extractSportId(t) {
  let best = null, bestLen = 0
  for (const sp of SPORTS) {
    const words = norm(sp.label).split(/[^a-z]+/).filter((w) => w.length >= 4)
    for (const w of words) {
      if (w.length > bestLen && new RegExp('\\b' + w + '\\b').test(t)) { best = sp.id; bestLen = w.length }
    }
  }
  return best
}

// Date relative simple : hier / avant-hier / demain (par défaut : aujourd'hui).
function extractDayOffset(t) {
  if (/avant.?hier/.test(t)) return -2
  if (/\bhier\b/.test(t)) return -1
  if (/\bdemain\b/.test(t)) return 1
  return 0
}

// Durée mentionnée dans le message ("1h30", "2 h", "90 min", "45 minutes")
// — pour répondre à une hypothèse concrète ("je peux faire 1h30
// aujourd'hui ?") avec un vrai calcul plutôt qu'une réponse générique.
function extractMins(t) {
  // "(il y) a 14h30" ("à 14h30") est une heure d'horloge ou un "il y a X"
  // passé, pas une durée — on retire la sous-chaîne entière avant de
  // chercher une durée, pour ne pas confondre "à 14h30" avec "1h30".
  const stripped = t.replace(/\ba\s*\d{1,2}\s*h\s*\d{0,2}\b/g, '')
  let m = stripped.match(/(\d+)\s*h(?:eures?)?\s*(\d{1,2})?/)
  if (m) return (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0)
  m = stripped.match(/(\d+)\s*min(?:utes?)?/)
  if (m) return parseInt(m[1], 10) || 0
  return null
}

function buildContext(t, db) {
  return {
    zoneIds: extractZoneIds(t),
    exerciseName: extractExerciseName(t, db),
    sportId: extractSportId(t),
    dayOffset: extractDayOffset(t),
    mins: extractMins(t),
  }
}

function dayLabel(offset) {
  if (offset === 0) return "aujourd'hui"
  if (offset === -1) return 'hier'
  if (offset === -2) return 'avant-hier'
  if (offset === 1) return 'demain'
  return ''
}

// --- Distance de Levenshtein (tolérance aux fautes de frappe, secours
// uniquement si aucune règle exacte n'a matché) ---
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = []
  for (let i = 0; i <= m; i++) { dp.push([i]); }
  for (let j = 1; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}
const FUZZY_DICT = [
  { w: 'fatigue', id: 'fatigue' }, { w: 'sommeil', id: 'sommeil' }, { w: 'dormir', id: 'sommeil' },
  { w: 'douleur', id: 'pain' }, { w: 'blessure', id: 'pain' }, { w: 'charge', id: 'load' },
  { w: 'hydratation', id: 'hydra' }, { w: 'nutrition', id: 'nutri' }, { w: 'mobilite', id: 'mobility' },
  { w: 'record', id: 'records' }, { w: 'stats', id: 'stats' }, { w: 'cycle', id: 'cycle' },
  { w: 'seance', id: 'session' }, { w: 'programme', id: 'program' }, { w: 'complement', id: 'supp' },
]
function fuzzyIntentId(t) {
  const words = t.split(/[^a-z]+/).filter((w) => w.length >= 4)
  for (const w of words) {
    for (const entry of FUZZY_DICT) {
      if (w === entry.w) continue // déjà couvert par les règles exactes
      const maxDist = entry.w.length <= 6 ? 1 : 2
      if (levenshtein(w, entry.w) <= maxDist) return entry.id
    }
  }
  return null
}

// --- Réponses par sujet (chacune lit db en direct, ctx = entités extraites) ---

function sessionTodayReply(db, ctx) {
  const iso = todayISO()
  if (ctx && ctx.sportId) {
    const sp = SPORTS.find((s) => s.id === ctx.sportId)
    const label = sp ? sp.label : ctx.sportId
    const planned = (db.planningSessions || []).find((s) => s && s.date === iso && s.sport === ctx.sportId)
    if (planned) {
      const mins = dureeToMins(planned.duree)
      return { text: `Oui, ${label} est prévu aujourd'hui${planned.heure ? ' à ' + planned.heure : ''}${mins ? ` (${mins} min)` : ''} — statut : ${planned.statut === 'realise' ? 'déjà réalisée' : 'à faire'}.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Ma charge', 'Mon sommeil'] }
    }
    return { text: `Pas de séance de ${label} prévue aujourd'hui dans ton Calendrier.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ["Quelle séance aujourd'hui ?", 'Planifier une séance'] }
  }
  const planned = (db.planningSessions || []).filter((s) => s && s.date === iso && s.statut === 'planifie')
  if (db.program && db.program.sessions && db.program.sessions.length) {
    const undone = db.program.sessions.find((s) => !(db.program.done && db.program.done[s.id]))
    if (undone) {
      const extra = planned.length ? ` Tu as aussi ${planned.length} séance(s) planifiée(s) au Calendrier aujourd'hui.` : ''
      return { text: `Ta prochaine séance de programme : « ${undone.title} » (${undone.mins} min).${extra} Je te l'ouvre ?`, action: 'session:' + undone.id, actionLabel: 'Ouvrir la séance', chips: ['Ma charge', 'Je me sens fatigué'] }
    }
  }
  if (planned.length) {
    const p = planned[0]
    const sp = SPORTS.find((s) => s.id === p.sport)
    const mins = dureeToMins(p.duree)
    return { text: `Tu as prévu ${sp ? sp.label : 'une séance'} aujourd'hui${p.heure ? ' à ' + p.heure : ''}${mins ? ` (${mins} min)` : ''}. Tu peux la retrouver dans le Calendrier.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Ma charge', 'Mon sommeil'] }
  }
  const fallback = SESSIONS.find((s) => s.id === 'renfo-full') || SESSIONS[0]
  return { text: `Rien de planifié aujourd'hui. Suggestion : « ${fallback.title} » (${fallback.mins} min), un bon full body. Sinon, fais le test de mobilité pour générer un programme personnalisé.`, action: 'session:' + fallback.id, actionLabel: 'Ouvrir la séance', chips: ['Faire le test de mobilité', 'Planifier une séance'] }
}

function fatigueReply(db) {
  const slp = pillarSleep(db)
  const acwr = acwrRisk(db)
  const parts = []
  if (slp.status === 'ok') {
    parts.push(slp.extra.hours < 7 ? `Tu n'as dormi que ${slp.extra.hours} h cette nuit — c'est sûrement une grosse partie de l'explication.` : `Ton sommeil est correct (${slp.extra.hours} h cette nuit), la fatigue vient probablement d'ailleurs.`)
  } else {
    parts.push("Tu n'as pas enregistré ton sommeil — commence par là, c'est le premier suspect.")
  }
  if (acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')) {
    parts.push(`Ta charge d'entraînement est en zone « ${acwr.level.toLowerCase()} » (ratio ${acwr.ratio}) — c'est cohérent avec de la fatigue accumulée.`)
  }
  const done = (db.planningSessions || []).filter((s) => s && s.statut === 'realise' && typeof s.ressenti === 'number').slice(-3)
  if (done.length >= 2 && done.every((s) => s.ressenti <= 2)) {
    parts.push('Tes derniers ressentis de séance sont bas aussi.')
  }
  parts.push("Conseil : aujourd'hui, une séance légère de récupération (étirements, auto-massage) ou un vrai repos vaut mieux qu'une séance forcée.")
  return { text: parts.join(' '), action: 'recovery', actionLabel: 'Ouvrir Récupération', chips: ['Mon sommeil', 'Ma charge'] }
}

function sleepReply(db, ctx) {
  const offset = (ctx && ctx.dayOffset) || 0
  if (offset === 0) {
    const slp = pillarSleep(db)
    if (slp.status !== 'ok') {
      return { text: "Tu n'as pas encore enregistré ta nuit. Note ta durée de sommeil, ta qualité et tes réveils — ça alimente ton score santé et mes conseils.", action: 'sommeil', actionLabel: 'Enregistrer mon sommeil', chips: ['Je me sens fatigué', 'Résumé de mes stats'] }
    }
    const h = slp.extra.hours
    const advice = h < 6 ? 'En dessous de 6 h, récupération et performances chutent nettement — vise 7–9 h.' : h < 7 ? 'Un peu court — vise 7–9 h pour une récupération optimale.' : h <= 9 ? 'Dans la zone optimale (7–9 h), continue comme ça.' : 'Plutôt long — si tu ressens le besoin de dormir autant, surveille ta charge.'
    return { text: `Cette nuit : ${h} h${slp.extra.quality ? `, qualité ${slp.extra.quality}/5` : ''}${slp.extra.awakenings ? `, ${slp.extra.awakenings} réveil(s)` : ''} (score sommeil ${slp.score}/100). ${advice}`, action: 'sommeil', actionLabel: 'Ouvrir Sommeil', chips: ['Je me sens fatigué', 'Ma charge'] }
  }
  const iso = isoOffset(offset)
  const s = (db.sleepLog || {})[iso]
  const lbl = dayLabel(offset)
  if (!s || !s.hours) {
    return { text: `Rien d'enregistré pour ${lbl === "aujourd'hui" ? "aujourd'hui" : lbl}.`, action: 'sommeil', actionLabel: 'Ouvrir Sommeil', chips: ['Mon sommeil', 'Résumé de mes stats'] }
  }
  const h = s.hours
  return { text: `${lbl.charAt(0).toUpperCase() + lbl.slice(1)} : ${h} h${s.quality ? `, qualité ${s.quality}/5` : ''}${s.awakenings ? `, ${s.awakenings} réveil(s)` : ''}.`, action: 'sommeil', actionLabel: 'Ouvrir Sommeil', chips: ['Je me sens fatigué', 'Ma charge'] }
}

function painReply(db, ctx) {
  const zoneNote = (() => {
    if (!ctx || !ctx.zoneIds || !ctx.zoneIds.length || !db.mobility || !db.mobility.zones) return ''
    const match = db.mobility.zones.find((z) => ctx.zoneIds.includes(z.id) && z.val > 0 && z.val < 2)
    return match ? ` Ta mobilité de « ${match.label.toLowerCase()} » était d'ailleurs notée raide à ton dernier test — ça peut faire partie de la cause.` : ''
  })()
  const p = db.prevention
  if (p && p.pain && p.pain.active) {
    return { text: (p.pain.urgent
      ? 'Tu as signalé une douleur préoccupante à ton dernier bilan. Stoppe les impacts et consulte un professionnel de santé — je ne peux pas évaluer une douleur à ta place.'
      : "Tu as une douleur active signalée à ton bilan de prévention. Adapte tes séances (pas d'impact sur la zone), et si ça empire ou persiste, consulte.") + zoneNote, action: 'prevention', actionLabel: 'Ouvrir Prévention', chips: ['Ma charge', 'Une séance de récup'] }
  }
  return { text: "Aucune douleur active dans ton dernier bilan. Si tu as mal quelque part en ce moment, refais le bilan de prévention pour que je puisse en tenir compte — et en cas de douleur vive ou qui persiste, consulte un professionnel." + zoneNote, action: 'prevention', actionLabel: 'Faire le bilan', chips: ['Ma charge', 'Mon sommeil'] }
}

function hydraReply(db, ctx) {
  const offset = (ctx && ctx.dayOffset) || 0
  const iso = isoOffset(offset)
  const d = hydroDay(db, iso)
  const target = hydricTargetMl(db)
  const lbl = dayLabel(offset)
  if (d.entries === 0) {
    return { text: `Rien d'enregistré ${offset === 0 ? "aujourd'hui" : lbl}. Ta cible du jour est d'environ ${target} ml (calculée sur ton poids et ton activité).`, action: 'hydratation', actionLabel: 'Ouvrir Hydratation', chips: ['Ma nutrition', 'Résumé de mes stats'] }
  }
  const pct = Math.round(d.ml / target * 100)
  const caf = d.caf ? ` Caféine : ${d.caf} mg${d.caf >= 400 ? ' — tu as atteint la limite recommandée (400 mg/j).' : d.caf >= 320 ? ' — tu approches de la limite (400 mg/j).' : '.'}` : ''
  const advice = offset === 0 ? (pct < 60 ? 'Tu es en retard — bois régulièrement plutôt que beaucoup d\'un coup.' : pct < 100 ? 'Bien parti, continue.' : 'Cible atteinte 👍') : ''
  return { text: `${offset === 0 ? "Aujourd'hui" : lbl.charAt(0).toUpperCase() + lbl.slice(1)} : ${d.ml} / ${target} ml (${pct} %).${caf} ${advice}`, action: 'hydratation', actionLabel: 'Ouvrir Hydratation', chips: ['Ma nutrition', 'Ma charge'] }
}

function nutriReply(db, ctx) {
  const offset = (ctx && ctx.dayOffset) || 0
  const iso = isoOffset(offset)
  const d = nutritionDay(db, iso)
  const t = db.foodTargets || {}
  const kcalT = t.kcal || t.k || 0
  const protT = t.prot || t.p || 0
  const lbl = dayLabel(offset)
  if (d.entries === 0) {
    return { text: `Aucun aliment enregistré ${offset === 0 ? "aujourd'hui" : lbl}. Note tes repas dans le module Nutrition pour que je puisse suivre tes calories et protéines.`, action: 'nutrition', actionLabel: 'Ouvrir Nutrition', chips: ['Mon hydratation', 'Résumé de mes stats'] }
  }
  const kcalPart = kcalT ? `${Math.round(d.k)} / ${Math.round(kcalT)} kcal` : `${Math.round(d.k)} kcal (pas d'objectif défini)`
  const protPart = protT ? `, protéines ${Math.round(d.p)} / ${Math.round(protT)} g` : ''
  const advice = offset === 0 && protT && d.p < protT * 0.7 ? ' Tu es en retard sur les protéines — pense à en ajouter à ton prochain repas.' : ''
  return { text: `${offset === 0 ? "Aujourd'hui" : lbl.charAt(0).toUpperCase() + lbl.slice(1)} : ${kcalPart}${protPart}.${advice}`, action: 'nutrition', actionLabel: 'Ouvrir Nutrition', chips: ['Mon hydratation', 'Ma charge'] }
}

function loadReply(db) {
  const acwr = acwrRisk(db)
  const consec = consecutiveDaysBefore(db, todayISO())
  const streakNote = consec >= 5 ? ` Tu en es à ${consec} jours d'entraînement consécutifs sans repos — surveille ça.` : ''
  if (acwr.available) {
    return { text: `Charge : « ${acwr.level} » (ratio ${acwr.ratio} — ${acwr.acuteMin} min sur 7 jours vs ${acwr.chronicAvgWeek} min/sem en moyenne sur 4 semaines, seuils adaptés à ton profil ${acwr.userLevel.label.toLowerCase()}). ${acwr.advice}${streakNote}`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Je me sens fatigué', "Quelle séance aujourd'hui ?"] }
  }
  const load = pillarLoad(db)
  const base = load.status === 'ok' ? `Cette semaine : ${load.extra.weekMin} / ${load.extra.targetMin} min par rapport à ton objectif.` : 'Aucune séance enregistrée cette semaine.'
  const why = acwr.reason === 'not_enough_history' ? ` Il me faut au moins 14 jours d'historique de séances réalisées pour calculer ton ratio de charge complet (tu en as ${acwr.daysOfHistory || 0}).` : " Enregistre tes séances réalisées dans le Calendrier pour que je calcule ton ratio de charge complet."
  return { text: base + why + streakNote, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ["Quelle séance aujourd'hui ?", 'Résumé de mes stats'] }
}

// Question hypothétique ("je peux faire 1h30 aujourd'hui ?") : calcule le
// VRAI impact sur la charge (projectedAcwr) plutôt qu'une réponse
// générique — c'est le genre de question qu'un coach humain regarderait
// dans tes vraies données avant de répondre.
function whatIfReply(db, ctx) {
  const mins = ctx && ctx.mins
  if (!mins) return { text: "Précise une durée (ex. « je peux faire 1h30 aujourd'hui ? ») pour que je calcule l'impact réel sur ta charge.", chips: STARTER_CHIPS }
  const proj = projectedAcwr(db, mins)
  if (!proj) return { text: `Pas encore assez d'historique de séances réalisées pour chiffrer précisément l'impact d'une séance de ${fmtMins(mins)} — vas-y si tu te sens bien, mais reste à l'écoute de tes sensations.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: STARTER_CHIPS }
  const consec = consecutiveDaysBefore(db, todayISO())
  let verdict
  if (proj.worsened) verdict = `⚠️ Je serais prudent : ça ferait passer ta charge de « ${proj.currentLevel.toLowerCase()} » à « ${proj.level.toLowerCase()} » (ratio ${proj.currentRatio} → ${proj.ratio}).`
  else if (proj.level === 'Vigilance renforcée') verdict = `⚠️ Ta charge est déjà en zone « vigilance renforcée » (ratio ${proj.currentRatio}) — cette séance la maintiendrait à ${proj.ratio}, pas idéal.`
  else verdict = `✅ Feu vert : ta charge resterait en zone « ${proj.level.toLowerCase()} » (ratio ${proj.currentRatio} → ${proj.ratio}).`
  const streakNote = consec >= 5 ? ` Attention, ce serait ton ${consec}e jour consécutif sans repos.` : ''
  return { text: `Une séance de ${fmtMins(mins)} aujourd'hui : ${verdict}${streakNote}`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Ma charge', 'Résumé de mes stats'] }
}

// Bilan de semaine à la demande — reprend le même moteur que la
// rétrospective du lundi sur Accueil (mondayRetro), mais accessible
// n'importe quel jour de la semaine, pas juste le lundi.
function weekBilanReply(db) {
  const r = mondayRetro(db)
  return { text: r.lines.join(' '), chips: ['Ma charge', 'Mes records', "Quelle séance aujourd'hui ?"] }
}

function mobilityReply(db) {
  const m = db.mobility
  if (!m || m.score == null) {
    return { text: "Tu n'as pas encore fait le test de mobilité (9 questions, 3 min). Il identifie tes zones raides et génère un programme correctif personnalisé.", action: 'mobility', actionLabel: 'Faire le test', chips: ['Mes tests physiques', "Quelle séance aujourd'hui ?"] }
  }
  const weak = (m.zones || []).filter((z) => z.val > 0 && z.val < 2).map((z) => z.label)
  const weakTxt = weak.length ? ` Zones à travailler : ${weak.join(', ')}.` : ' Aucune zone critique détectée.'
  return { text: `Ton score de mobilité : ${m.score}/100 (${m.level || 'test fait'} le ${m.date}).${weakTxt}`, action: 'mobility', actionLabel: 'Refaire le test', chips: ['Mon programme', 'Mes tests physiques'] }
}

function testsReply(db) {
  const tests = db.physTests || []
  if (!tests.length) {
    return { text: 'Aucun test physique enregistré (Cooper, gainage, squats, souplesse, pompes). Ils me servent à repérer tes vrais points faibles pour cibler tes séances.', action: 'tests', actionLabel: 'Passer un test', chips: ['Ma mobilité', 'Mes records'] }
  }
  const byId = {}
  tests.forEach((t) => { if (!byId[t.testId] || t.date > byId[t.testId].date) byId[t.testId] = t })
  const LABELS = { cooper: 'Cooper', gai_max: 'Gainage', squat30: 'Squats 30s', souplesse: 'Sit & Reach', push30: 'Pompes 30s' }
  const UNITS = { cooper: 'm', gai_max: 's', squat30: 'rép.', souplesse: 'cm', push30: 'rép.' }
  const list = Object.keys(byId).map((tid) => `${LABELS[tid] || tid} : ${byId[tid].value} ${UNITS[tid] || ''}`).join(' · ')
  return { text: `Tes derniers résultats — ${list}. ${5 - Object.keys(byId).length > 0 ? `Il te reste ${5 - Object.keys(byId).length} test(s) à faire pour un bilan complet.` : 'Bilan complet 👍'}`, action: 'tests', actionLabel: 'Ouvrir Tests physiques', chips: ['Ma mobilité', 'Mes records'] }
}

function recordsReply(db, ctx) {
  if (ctx && ctx.exerciseName) {
    const h = (db.exerciseHistory || {})[ctx.exerciseName]
    if (h && h.record && h.record.charge) {
      const lastPart = h.last && h.last.charge ? `, dernière charge ${h.last.charge} kg${h.last.date ? ' (' + h.last.date + ')' : ''}` : ''
      return { text: `${ctx.exerciseName} : record ${h.record.charge} kg${h.record.date ? ' le ' + h.record.date : ''}${lastPart}.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Ma charge', 'Résumé de mes stats'] }
    }
  }
  const hist = db.exerciseHistory || {}
  const records = Object.keys(hist).filter((n) => hist[n].record && hist[n].record.charge)
    .map((n) => ({ n, c: hist[n].record.charge })).sort((a, b) => b.c - a.c).slice(0, 4)
  const ts = trainingStats(db)
  if (!records.length && !ts.perche) {
    return { text: "Pas encore de record enregistré. Ajoute tes exercices (avec charges) dans une séance de musculation du Calendrier : je suivrai automatiquement tes records et ta progression.", action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Mes tests physiques', "Quelle séance aujourd'hui ?"] }
  }
  const parts = records.map((r) => `${r.n} : ${r.c} kg`)
  if (ts.perche) parts.push(`Perche : ${ts.perche} m`)
  return { text: `Tes records : ${parts.join(' · ')}. Continue d'enregistrer tes séances pour les faire évoluer.`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Ma charge', 'Résumé de mes stats'] }
}

function statsReply(db) {
  const g = globalScore(db)
  const totals = trainingTotals(db)
  const weekMins = totals.week.reduce((a, b) => a + b, 0)
  const parts = [`Série en cours : ${totals.streak} jour(s) (record ${totals.record}).`, `${totals.sessionsTotal} séances au total, ${fmtMins(totals.minutesTotal)} cumulées.`, `Cette semaine : ${weekMins} min.`]
  if (g.score != null) parts.push(`Score santé sportive : ${g.score}/100 (${g.active} pilier(s) actif(s)).`)
  return { text: parts.join(' '), chips: ['Ma charge', 'Mes records', 'Mon sommeil'] }
}

function cycleReply(db) {
  if (db.cycle && db.cycle.enabled && db.cycle.startDate) {
    const info = cycleInfo(db.cycle)
    const ph = PHASES[info.phase]
    return { text: `Tu es au jour ${info.day}/${info.len} de ton cycle, en phase ${ph ? ph.label.toLowerCase() : info.phase}. ${info.phase === 'luteale' ? "La perception d'effort peut être un peu plus élevée en phase lutéale chez certaines personnes — écoute tes sensations." : 'Consulte le module Cycle pour les repères d\'entraînement de cette phase.'}`, action: 'cycle', actionLabel: 'Ouvrir Cycle', chips: ['Mon sommeil', "Quelle séance aujourd'hui ?"] }
  }
  return { text: "Le suivi de cycle n'est pas activé sur ton profil. Tu peux l'activer dans le module Cycle (onglet Santé).", action: 'cycle', actionLabel: 'Ouvrir Cycle', chips: ['Résumé de mes stats'] }
}

function suppReply(db) {
  const plan = db.suppPlan || []
  if (!plan.length) return { text: "Tu n'as pas de plan de compléments défini. Si tu en prends, configure-les dans le module Compléments pour suivre ton observance.", action: 'complements', actionLabel: 'Ouvrir Compléments', chips: ['Ma nutrition'] }
  const taken = ((db.suppTaken || {})[todayISO()] || []).filter((id) => plan.includes(id))
  return { text: `Ton plan compte ${plan.length} complément(s), ${taken.length} pris aujourd'hui.${plan.includes('creatine') ? ' Rappel créatine : c\'est la régularité quotidienne qui compte, pas le moment de la prise.' : ''}`, action: 'complements', actionLabel: 'Ouvrir Compléments', chips: ['Ma nutrition', 'Résumé de mes stats'] }
}

function peakReply(db) {
  const goals = db.peakGoals || []
  const iso = todayISO()
  const upcoming = goals.map((g) => ({ g, plan: computePeakPlan(g, iso) })).filter((x) => x.plan.phase !== 'past').sort((a, b) => a.g.eventDate.localeCompare(b.g.eventDate))
  if (!upcoming.length) {
    return { text: "Aucune échéance programmée. Si tu prépares une compétition ou un objectif daté, crée-le dans Pic de forme : je calculerai tes phases de préparation et d'affûtage.", action: 'peak', actionLabel: 'Ouvrir Pic de forme', chips: ['Ma charge', "Quelle séance aujourd'hui ?"] }
  }
  const { g, plan } = upcoming[0]
  const phases = { base: 'développement général', build: 'développement spécifique', taper: 'affûtage', today: 'jour J' }
  let text = `Prochaine échéance : « ${g.label} » ${plan.daysRemaining === 0 ? "— c'est aujourd'hui !" : `dans ${plan.daysRemaining} jour(s)`}, phase actuelle : ${phases[plan.phase] || plan.phase}.`
  if (plan.phase !== 'today') {
    const readiness = peakReadiness(db, plan)
    text += ` Préparation : ${readiness.score}/100.`
    if (readiness.flags.length) text += ' ' + readiness.flags[0].text
    else if (plan.phase === 'taper') text += ' Réduis le volume, garde l\'intensité.'
  }
  return { text, action: 'peak', actionLabel: 'Ouvrir Pic de forme', chips: ['Ma charge', 'Mon sommeil'] }
}

function motivationReply(db) {
  const short = SESSIONS.slice().sort((a, b) => a.mins - b.mins)[0]
  const streak = trainingTotals(db).streak
  return { text: `${streak > 0 ? `Tu as une série de ${streak} jour(s) en cours — ce serait dommage de la casser !` : 'Le plus dur, c\'est de commencer.'} Deal : juste « ${short.title} » (${short.mins} min). Si après ça tu veux t'arrêter, c'est ok — mais en général, une fois lancé, on continue.`, action: 'session:' + short.id, actionLabel: `Lancer (${short.mins} min)`, chips: ['Mon programme', 'Je me sens fatigué'] }
}

function programReply(db) {
  return db.program
    ? { text: `Ton programme compte ${db.program.sessions.length} séances (${db.program.sessions.filter((s) => db.program.done && db.program.done[s.id]).length} faites). On continue ?`, action: 'program', actionLabel: 'Ouvrir mon programme', chips: ["Quelle séance aujourd'hui ?"] }
    : { text: "Tu n'as pas encore de programme personnalisé. Fais le test de mobilité (3 min) et je t'en génère un ciblé sur tes points faibles.", action: 'mobility', actionLabel: 'Faire le test', chips: ['Ma mobilité'] }
}

function recoveryReply() {
  return { text: 'Bonne idée. Les routines guidées de récupération (étirements, auto-massage) réduisent la sensation de fatigue et les courbatures — 3 à 7 min suffisent après l\'effort.', action: 'recovery', actionLabel: 'Ouvrir Récupération', chips: ['Je me sens fatigué', 'Ma charge'] }
}

function helpReply() {
  return { text: 'Je peux te parler de : ta séance du jour, ta charge d\'entraînement, ton sommeil, ta fatigue, une douleur, ton hydratation, ta nutrition, ta mobilité, tes tests physiques, tes records, ton cycle, tes compléments, tes échéances (pic de forme), ou te faire un résumé de tes stats ou de ta semaine. Tu peux aussi me poser une hypothèse concrète — « je peux faire 1h30 aujourd\'hui ? » — je calcule le vrai impact sur ta charge avant de répondre.', chips: STARTER_CHIPS }
}

// ============================================================
// Détection d'intention(s) — méta (exclusives, court-circuitent) puis
// sujets (peuvent matcher plusieurs à la fois, ex. "fatigué et mal au dos").
// L'ordre de TOPIC_INTENTS fait aussi office de priorité pour la
// combinaison et pour le choix de l'action principale.
// ============================================================
const META_INTENTS = [
  { re: /^(salut|bonjour|bonsoir|hello|coucou|yo|hey)\b/, reply: () => ({ text: 'Salut ! Comment je peux t\'aider ? Forme du jour, séance, charge, sommeil… dis-moi.', chips: STARTER_CHIPS }) },
  { re: /merci/, reply: () => ({ text: 'Avec plaisir 💪 Autre chose ?', chips: DEFAULT_CHIPS }) },
  { re: /(aide|help|que sais|tu peux faire|capable|quoi te demander)/, reply: helpReply },
]

const TOPIC_INTENTS = [
  { id: 'pain', test: testPain, reply: painReply },
  { id: 'fatigue', test: (t) => /(fatigue|creve|epuise|claque|nase|vide|\bhs\b)/.test(t), reply: fatigueReply },
  { id: 'sommeil', test: (t) => /(sommeil|dormi|dormir|nuit|insomnie|reveil)/.test(t), reply: sleepReply },
  { id: 'motivation', test: (t) => /(motivation|pas envie|flemme|demotive|lache)/.test(t), reply: motivationReply },
  { id: 'session', test: (t, ctx) => /(quelle|quoi|prochaine|je fais quoi).*(seance|entrain)|seance.*(jour|aujourd)|entrainement (du jour|aujourd)/.test(t) || (!!(ctx && ctx.sportId) && /(quoi|qu.est-ce|prevu|programme|au programme)/.test(t)), reply: sessionTodayReply },
  { id: 'load', test: (t) => /(charge|volume|surentrainement|acwr|trop d.entrainement|en fais trop)/.test(t), reply: loadReply },
  { id: 'whatif', test: (t, ctx) => /(je (peux|dois|vais|pourrais) faire|je fais quoi si|si je fais|ca passe si)/.test(t) && !!(ctx && ctx.mins), reply: whatIfReply },
  { id: 'weekbilan', test: (t) => /semaine/.test(t) && /(bilan|resume|comment.*(passe|ete)|analyse)/.test(t), reply: weekBilanReply },
  { id: 'hydra', test: (t) => /(hydrat|\beau\b|boire|\bbu\b|soif|cafeine|cafe)/.test(t), reply: hydraReply },
  { id: 'nutri', test: (t) => /(nutrition|calorie|proteine|glucide|lipide|manger|repas|faim)/.test(t), reply: nutriReply },
  { id: 'mobility', test: (t) => /(mobilite|souplesse|raide)/.test(t), reply: mobilityReply },
  { id: 'recovery', test: (t) => /(recup|etirement|massage|courbature)/.test(t), reply: recoveryReply },
  { id: 'tests', test: (t) => /(test|cooper|pompes|gainage|squat)/.test(t), reply: testsReply },
  { id: 'records', test: (t) => /(record|charge max|\bpr\b|\bperf)/.test(t), reply: recordsReply },
  { id: 'stats', test: (t) => /(stats|resume|bilan|progres|ou j.en suis)/.test(t), reply: statsReply },
  { id: 'cycle', test: (t) => /(cycle|regles|menstru)/.test(t), reply: cycleReply },
  { id: 'supp', test: (t) => /(complement|creatine|vitamine|omega|magnesium|proteine en poudre)/.test(t), reply: suppReply },
  { id: 'peak', test: (t) => /(pic de forme|competition|echeance|objectif|affutage)/.test(t), reply: peakReply },
  { id: 'program', test: (t) => /(programme|planifier)/.test(t), reply: programReply },
]
const INTENTS_BY_ID = Object.fromEntries(TOPIC_INTENTS.map((i) => [i.id, i]))

// Fusionne plusieurs sujets détectés dans un même message en une seule
// réponse numérotée, plutôt que de n'en garder qu'un — c'est le cœur de
// la "compréhension" d'un message qui couvre plusieurs points à la fois.
function combineReplies(matched, db, ctx) {
  const replies = matched.map((i) => i.reply(db, ctx))
  const text = replies.map((r, idx) => `${idx + 1}. ${r.text}`).join('\n\n')
  const primary = replies[0]
  const chips = Array.from(new Set(replies.flatMap((r) => r.chips || []))).slice(0, 4)
  return { text, action: primary.action, actionLabel: primary.actionLabel, chips: chips.length ? chips : DEFAULT_CHIPS }
}

export function coachReply(rawText, db) {
  const t = norm(rawText)

  for (const intent of META_INTENTS) {
    if (intent.re.test(t)) return { from: 'coach', ...intent.reply(db) }
  }

  const ctx = buildContext(t, db)
  const matched = TOPIC_INTENTS.filter((i) => i.test(t, ctx))

  if (matched.length === 1) return { from: 'coach', ...matched[0].reply(db, ctx) }
  if (matched.length > 1) return { from: 'coach', ...combineReplies(matched, db, ctx) }

  // Aucune règle exacte : tolérance aux fautes de frappe avant d'abandonner.
  const fuzzyId = fuzzyIntentId(t)
  if (fuzzyId && INTENTS_BY_ID[fuzzyId]) return { from: 'coach', ...INTENTS_BY_ID[fuzzyId].reply(db, ctx) }

  return { from: 'coach', text: "Je n'ai pas compris — je suis un coach à règles (pas une IA générative), mon vocabulaire est limité à l'entraînement. " + helpReply().text, chips: STARTER_CHIPS }
}
