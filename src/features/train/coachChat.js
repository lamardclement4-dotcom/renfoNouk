// ============================================================
// coachChat — moteur de conversation du Coach. Déterministe (pas un
// LLM : l'app est un site statique, aucune clé d'API ne peut vivre côté
// client) : détection d'intention par mots-clés (accents ignorés) puis
// réponse construite à partir des VRAIES données de l'utilisateur via
// RenfoIntel. Chaque réponse peut proposer une action (ouvrir un
// module, lancer une séance) et des suggestions de relance.
// ============================================================
import { pillarSleep, pillarLoad, acwrRisk, trainingStats, hydroDay, hydricTargetMl, nutritionDay, globalScore, dureeToMins } from './renfoIntel'
import { SESSIONS, SPORTS } from './trainData'
import { computePeakPlan } from './PeakSpace'
import { cycleInfo } from '../health/Cycle'
import { PHASES } from '../health/cycleData'

function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function todayISO() {
  const d = new Date()
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

// --- Réponses par sujet (chacune lit db en direct) ---

function sessionTodayReply(db) {
  const iso = todayISO()
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

function sleepReply(db) {
  const slp = pillarSleep(db)
  if (slp.status !== 'ok') {
    return { text: "Tu n'as pas encore enregistré ta nuit. Note ta durée de sommeil, ta qualité et tes réveils — ça alimente ton score santé et mes conseils.", action: 'sommeil', actionLabel: 'Enregistrer mon sommeil', chips: ['Je me sens fatigué', 'Résumé de mes stats'] }
  }
  const h = slp.extra.hours
  const advice = h < 6 ? 'En dessous de 6 h, récupération et performances chutent nettement — vise 7–9 h.' : h < 7 ? 'Un peu court — vise 7–9 h pour une récupération optimale.' : h <= 9 ? 'Dans la zone optimale (7–9 h), continue comme ça.' : 'Plutôt long — si tu ressens le besoin de dormir autant, surveille ta charge.'
  return { text: `Cette nuit : ${h} h${slp.extra.quality ? `, qualité ${slp.extra.quality}/5` : ''}${slp.extra.awakenings ? `, ${slp.extra.awakenings} réveil(s)` : ''} (score sommeil ${slp.score}/100). ${advice}`, action: 'sommeil', actionLabel: 'Ouvrir Sommeil', chips: ['Je me sens fatigué', 'Ma charge'] }
}

function painReply(db) {
  const p = db.prevention
  if (p && p.pain && p.pain.active) {
    return { text: p.pain.urgent
      ? 'Tu as signalé une douleur préoccupante à ton dernier bilan. Stoppe les impacts et consulte un professionnel de santé — je ne peux pas évaluer une douleur à ta place.'
      : "Tu as une douleur active signalée à ton bilan de prévention. Adapte tes séances (pas d'impact sur la zone), et si ça empire, réveille la nuit ou reste localisé sur un point précis : consulte.", action: 'prevention', actionLabel: 'Ouvrir Prévention', chips: ['Ma charge', 'Une séance de récup'] }
  }
  return { text: "Aucune douleur active dans ton dernier bilan. Si tu as mal quelque part en ce moment, refais le bilan de prévention pour que je puisse en tenir compte — et en cas de douleur vive ou qui persiste, consulte un professionnel.", action: 'prevention', actionLabel: 'Faire le bilan', chips: ['Ma charge', 'Mon sommeil'] }
}

function hydraReply(db) {
  const iso = todayISO()
  const d = hydroDay(db, iso)
  const target = hydricTargetMl(db)
  if (d.entries === 0) {
    return { text: `Rien d'enregistré aujourd'hui. Ta cible du jour est d'environ ${target} ml (calculée sur ton poids et ton activité).`, action: 'hydratation', actionLabel: 'Ouvrir Hydratation', chips: ['Ma nutrition', 'Résumé de mes stats'] }
  }
  const pct = Math.round(d.ml / target * 100)
  const caf = d.caf ? ` Caféine : ${d.caf} mg${d.caf >= 400 ? ' — tu as atteint la limite recommandée (400 mg/j).' : d.caf >= 320 ? ' — tu approches de la limite (400 mg/j).' : '.'}` : ''
  return { text: `Aujourd'hui : ${d.ml} / ${target} ml (${pct} %).${caf} ${pct < 60 ? 'Tu es en retard — bois régulièrement plutôt que beaucoup d\'un coup.' : pct < 100 ? 'Bien parti, continue.' : 'Cible atteinte 👍'}`, action: 'hydratation', actionLabel: 'Ouvrir Hydratation', chips: ['Ma nutrition', 'Ma charge'] }
}

function nutriReply(db) {
  const iso = todayISO()
  const d = nutritionDay(db, iso)
  const t = db.foodTargets || {}
  const kcalT = t.kcal || t.k || 0
  const protT = t.prot || t.p || 0
  if (d.entries === 0) {
    return { text: "Aucun aliment enregistré aujourd'hui. Note tes repas dans le module Nutrition pour que je puisse suivre tes calories et protéines.", action: 'nutrition', actionLabel: 'Ouvrir Nutrition', chips: ['Mon hydratation', 'Résumé de mes stats'] }
  }
  const kcalPart = kcalT ? `${Math.round(d.k)} / ${Math.round(kcalT)} kcal` : `${Math.round(d.k)} kcal (pas d'objectif défini)`
  const protPart = protT ? `, protéines ${Math.round(d.p)} / ${Math.round(protT)} g` : ''
  const advice = protT && d.p < protT * 0.7 ? ' Tu es en retard sur les protéines — pense à en ajouter à ton prochain repas.' : ''
  return { text: `Aujourd'hui : ${kcalPart}${protPart}.${advice}`, action: 'nutrition', actionLabel: 'Ouvrir Nutrition', chips: ['Mon hydratation', 'Ma charge'] }
}

function loadReply(db) {
  const acwr = acwrRisk(db)
  if (acwr.available) {
    return { text: `Charge : « ${acwr.level} » (ratio ${acwr.ratio} — ${acwr.acuteMin} min sur 7 jours vs ${acwr.chronicAvgWeek} min/sem en moyenne sur 4 semaines, seuils adaptés à ton profil ${acwr.userLevel.label.toLowerCase()}). ${acwr.advice}`, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ['Je me sens fatigué', "Quelle séance aujourd'hui ?"] }
  }
  const load = pillarLoad(db)
  const base = load.status === 'ok' ? `Cette semaine : ${load.extra.weekMin} / ${load.extra.targetMin} min par rapport à ton objectif.` : 'Aucune séance enregistrée cette semaine.'
  const why = acwr.reason === 'not_enough_history' ? ` Il me faut au moins 14 jours d'historique de séances réalisées pour calculer ton ratio de charge complet (tu en as ${acwr.daysOfHistory || 0}).` : " Enregistre tes séances réalisées dans le Calendrier pour que je calcule ton ratio de charge complet."
  return { text: base + why, action: 'planner', actionLabel: 'Ouvrir le Calendrier', chips: ["Quelle séance aujourd'hui ?", 'Résumé de mes stats'] }
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

function recordsReply(db) {
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
  const weekMins = (db.week || []).reduce((a, b) => a + b, 0)
  const parts = [`Série en cours : ${db.streak || 0} jour(s) (record ${db.record || 0}).`, `${db.sessionsTotal || 0} séances au total, ${fmtMins(db.minutesTotal || 0)} cumulées.`, `Cette semaine : ${weekMins} min.`]
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
  return { text: `Prochaine échéance : « ${g.label} » ${plan.daysRemaining === 0 ? "— c'est aujourd'hui !" : `dans ${plan.daysRemaining} jour(s)`}, phase actuelle : ${phases[plan.phase] || plan.phase}.${plan.phase === 'taper' ? ' Réduis le volume, garde l\'intensité.' : ''}`, action: 'peak', actionLabel: 'Ouvrir Pic de forme', chips: ['Ma charge', 'Mon sommeil'] }
}

function motivationReply(db) {
  const short = SESSIONS.slice().sort((a, b) => a.mins - b.mins)[0]
  const streak = db.streak || 0
  return { text: `${streak > 0 ? `Tu as une série de ${streak} jour(s) en cours — ce serait dommage de la casser !` : 'Le plus dur, c\'est de commencer.'} Deal : juste « ${short.title} » (${short.mins} min). Si après ça tu veux t'arrêter, c'est ok — mais en général, une fois lancé, on continue.`, action: 'session:' + short.id, actionLabel: `Lancer (${short.mins} min)`, chips: ['Mon programme', 'Je me sens fatigué'] }
}

function helpReply() {
  return { text: 'Je peux te parler de : ta séance du jour, ta charge d\'entraînement, ton sommeil, ta fatigue, une douleur, ton hydratation, ta nutrition, ta mobilité, tes tests physiques, tes records, ton cycle, tes compléments, tes échéances (pic de forme), ou te faire un résumé de tes stats.', chips: STARTER_CHIPS }
}

// --- Détection d'intention (ordre = priorité, premier match gagne) ---
const INTENTS = [
  { re: /^(salut|bonjour|bonsoir|hello|coucou|yo|hey)\b/, reply: () => ({ text: 'Salut ! Comment je peux t\'aider ? Forme du jour, séance, charge, sommeil… dis-moi.', chips: STARTER_CHIPS }) },
  { re: /merci/, reply: () => ({ text: 'Avec plaisir 💪 Autre chose ?', chips: DEFAULT_CHIPS }) },
  { re: /(aide|help|que sais|tu peux faire|capable|quoi te demander)/, reply: helpReply },
  { re: /(douleur|blessure|blesse|\bmal\b|bobo)/, reply: painReply },
  { re: /(fatigue|creve|epuise|claque|nase|vide|hs\b)/, reply: fatigueReply },
  { re: /(sommeil|dormi|dormir|nuit|insomnie|reveil)/, reply: sleepReply },
  { re: /(motivation|pas envie|flemme|demotive|lache)/, reply: motivationReply },
  { re: /(quelle|quoi|prochaine|je fais quoi).*(seance|entrain)|seance.*(jour|aujourd)|entrainement (du jour|aujourd)/, reply: sessionTodayReply },
  { re: /(charge|volume|surentrainement|acwr|trop d.entrainement|en fais trop)/, reply: loadReply },
  { re: /(hydrat|\beau\b|boire|\bbu\b|soif|cafeine|cafe)/, reply: hydraReply },
  { re: /(nutrition|calorie|proteine|glucide|lipide|manger|repas|faim)/, reply: nutriReply },
  { re: /(mobilite|souplesse|raide)/, reply: mobilityReply },
  { re: /(recup|etirement|massage|courbature)/, reply: () => ({ text: 'Bonne idée. Les routines guidées de récupération (étirements, auto-massage) réduisent la sensation de fatigue et les courbatures — 3 à 7 min suffisent après l\'effort.', action: 'recovery', actionLabel: 'Ouvrir Récupération', chips: ['Je me sens fatigué', 'Ma charge'] }) },
  { re: /(test|cooper|pompes|gainage|squat)/, reply: testsReply },
  { re: /(record|charge max|\bpr\b|\bperf)/, reply: recordsReply },
  { re: /(stats|resume|bilan|progres|ou j.en suis)/, reply: statsReply },
  { re: /(cycle|regles|menstru)/, reply: cycleReply },
  { re: /(complement|creatine|vitamine|omega|magnesium|proteine en poudre)/, reply: suppReply },
  { re: /(pic de forme|competition|echeance|objectif|affutage)/, reply: peakReply },
  { re: /(programme|planifier)/, reply: (db) => db.program
    ? { text: `Ton programme compte ${db.program.sessions.length} séances (${db.program.sessions.filter((s) => db.program.done && db.program.done[s.id]).length} faites). On continue ?`, action: 'program', actionLabel: 'Ouvrir mon programme', chips: ["Quelle séance aujourd'hui ?"] }
    : { text: "Tu n'as pas encore de programme personnalisé. Fais le test de mobilité (3 min) et je t'en génère un ciblé sur tes points faibles.", action: 'mobility', actionLabel: 'Faire le test', chips: ['Ma mobilité'] } },
]

export function coachReply(rawText, db) {
  const t = norm(rawText)
  for (const intent of INTENTS) {
    if (intent.re.test(t)) return { from: 'coach', ...intent.reply(db) }
  }
  return { from: 'coach', text: "Je n'ai pas compris — je suis un coach à règles (pas une IA générative), mon vocabulaire est limité à l'entraînement. " + helpReply().text, chips: STARTER_CHIPS }
}
