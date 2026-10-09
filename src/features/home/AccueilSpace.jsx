import React, { useState, lazy } from 'react'
import { C, Icon, Ring, MODULE_TINTS, isoToday, Aide } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { routinesToday, kindOf } from '../train/routines'
import { pillars as intelPillars, acwrRisk, dureeToMins, trainingTotals, mondayRetro, hydroDay, hydricTargetMl, nutritionDay } from '../train/renfoIntel'
import { formeDb, coucherDuSoir, reglagesSeance } from '../health/formeContexte'
import { libelleDuree } from '../health/sommeilForme'
import { SESSIONS, SPORTS, sessionExercises } from '../train/trainData'
import { neededHours } from '../health/sleepIntel'
import { HealthScoreCard, PeakHomeCard } from '../progress/cards'
import { weekTrace, traceGeometry } from './weekTrace'

// Ouverts uniquement sur une action (une tuile, une recommandation) : rien
// de tout cela n'est nécessaire au premier affichage de l'accueil. La
// frontière Suspense qui les attend est dans App.jsx.
const TrainSpace = lazy(() => import('../train/TrainSpace'))
const HealthHome = lazy(() => import('../health/HealthHome'))

const h = React.createElement

// Les nombres s'écrivent avec une virgule, et les milliers avec une espace
// fine insécable, comme sur un afficheur.
const fr = (v) => String(v).replace('.', ',')
const milliers = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function heures(x) {
  const hh = Math.floor(x)
  const mm = Math.round((x - hh) * 60)
  if (mm === 60) return (hh + 1) + ' h'
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : hh + ' h'
}

// La charge dite en clair : de combien la semaine s'écarte de l'habitude,
// et quoi en faire. Le rapport chiffré reste à un « ? » pour les curieux.
export function ecartHabitude(ratio) {
  if (!Number.isFinite(ratio)) return null
  if (ratio >= 1.95) return `${fr(Math.round(ratio * 10) / 10)} fois plus`
  const pct = Math.round((ratio - 1) * 100)
  if (Math.abs(pct) < 8) return 'autant'
  return pct > 0 ? `${pct} % de plus` : `${-pct} % de moins`
}
const COULEUR_FORME = { haute: C.success, bonne: C.primary, moyenne: C.warn, basse: C.danger }

export const CONSEIL_CHARGE = {
  'Sous-charge': 'Semaine calme : tu peux reprendre progressivement.',
  'Zone optimale': 'Bon rythme : continue comme ça.',
  'Vigilance': 'Hausse rapide : surveille la fatigue et les douleurs.',
  'Vigilance renforcée': 'Hausse trop rapide : prévois une séance légère ou du repos.',
}

function nextPlannedSession(db) {
  const sessions = db.planningSessions || []
  const todayStr = isoToday()
  const upcoming = sessions
    .filter((s) => s && s.statut === 'planifie' && s.date && s.date >= todayStr)
    .sort((a, b) => (a.date + (a.heure || '')).localeCompare(b.date + (b.heure || '')))
  return upcoming[0] || null
}

function getSportInfo(id) {
  if (!id) return { label: 'Séance', ic: 'calendar' }
  const sp = SPORTS.find((s) => s.id === id)
  return sp ? { label: sp.label, ic: sp.ic } : { label: 'Séance', ic: 'calendar' }
}

// Choisit ce que montre le bloc « À faire » : séance de programme correctif
// non faite, séance planifiée aujourd'hui (Calendrier), les deux à la fois,
// ou une suggestion générique si rien n'est en cours.
function pickHeroContent(db) {
  const todayStr = isoToday()
  const next = nextPlannedSession(db)
  const plannedToday = next && next.date === todayStr ? next : null
  const plannedSportInfo = plannedToday ? getSportInfo(plannedToday.sport) : null
  if (db.program && db.program.sessions && db.program.sessions.length) {
    const undone = db.program.sessions.find((s) => !(db.program.done && db.program.done[s.id]))
    if (undone) {
      return plannedToday
        ? { kind: 'both', session: undone, planned: plannedToday, sportInfo: plannedSportInfo }
        : { kind: 'program', session: undone }
    }
  }
  if (plannedToday) return { kind: 'planned', planned: plannedToday, sportInfo: plannedSportInfo }
  const fallback = SESSIONS.find((s) => s.id === 'renfo-full') || SESSIONS[0]
  return { kind: 'suggestion', session: fallback }
}

function describeSession(sportLabel, exercises) {
  if (!exercises || !exercises.length) return sportLabel
  const names = exercises.map((e) => e.name).filter(Boolean)
  if (!names.length) return sportLabel
  if (names.length <= 2) return names.join(' · ')
  return names.slice(0, 2).join(' · ') + ` + ${names.length - 2} autre${names.length - 2 > 1 ? 's' : ''}`
}

// Intitulé de section : capitales étroites et filet fin, comme les
// rubriques d'une fiche de mesure. Un repère à chasse fixe peut s'y ajouter.
function Titre(label, repere, aide) {
  return h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, fontFamily: C.display, fontSize: 15, fontWeight: 800, color: C.ink2, textTransform: 'uppercase', letterSpacing: '.07em', margin: '28px 0 12px', paddingBottom: 5, borderBottom: `1px solid ${C.line}` } },
    h('span', null, label, aide ? h(Aide, { terme: aide }) : null),
    repere ? h('span', { style: { fontFamily: C.mono, fontSize: 10, fontWeight: 400, letterSpacing: 0, color: C.ink3 } }, repere) : null)
}

// ------------------------------------------------------------
// La courbe de la semaine, imprimée sans cadre sur le papier : la zone
// habituelle en bande, la charge en tracé qui s'écrit, un repère carré par
// jour (plein les jours de séance), et le réticule sur aujourd'hui.
// ------------------------------------------------------------
function TraceChart({ trace }) {
  const W = 340, H = 158
  const g = traceGeometry(trace, { width: W, height: H, left: 8, right: 8, top: 28, bottom: 24 })
  const pts = g.points
  const n = pts.length
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ')
  const last = pts[n - 1]
  const auj = trace.days[n - 1]
  const mono = { fontFamily: C.mono }
  // L'étiquette de la zone se pose au-dessus de la bande, ou dessous si la
  // courbe passe par là au début : elle ne doit jamais masquer un repère.
  let etiquetteZone = 0
  if (g.band) {
    const dessus = g.band.y1 - 4, dessous = g.band.y2 + 11
    const genant = (y) => pts.slice(0, 3).some((p) => Math.abs(p[1] - (y - 3)) < 9)
    etiquetteZone = !genant(dessus) || genant(dessous) || dessous > g.baseline - 3 ? dessus : dessous
  }
  return h('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Charge des 7 derniers jours, en points de charge : ' + trace.days.map((x) => x.value).join(', '), style: { display: 'block', overflow: 'visible' } },
    g.band && h('g', null,
      h('rect', { x: g.left, y: g.band.y1, width: g.right - g.left, height: Math.max(1, g.band.y2 - g.band.y1), style: { fill: `color-mix(in srgb, ${C.trace} 12%, transparent)` } }),
      h('line', { x1: g.left, x2: g.right, y1: g.band.y1, y2: g.band.y1, strokeWidth: 1, strokeDasharray: '3 3', style: { stroke: C.trace, opacity: .6 } }),
      h('line', { x1: g.left, x2: g.right, y1: g.band.y2, y2: g.band.y2, strokeWidth: 1, strokeDasharray: '3 3', style: { stroke: C.trace, opacity: .6 } }),
      h('text', { x: g.left + 3, y: etiquetteZone, style: { ...mono, fontSize: 8.5, fill: C.ink3, letterSpacing: '.02em' } }, 'ZONE HABITUELLE')),
    h('line', { x1: g.left, x2: g.right, y1: g.baseline, y2: g.baseline, strokeWidth: 1.2, style: { stroke: C.ink } }),
    pts.map((p, i) => h('line', { key: 't' + i, x1: p[0], x2: p[0], y1: g.baseline, y2: g.baseline + 4, strokeWidth: 1, style: { stroke: C.ink2 } })),
    trace.days.map((dd, i) => h('text', { key: 'l' + i, x: pts[i][0], y: g.baseline + 16, textAnchor: 'middle', style: { ...mono, fontSize: 9.5, fontWeight: dd.isToday ? 600 : 400, fill: dd.isToday ? C.ink : C.ink3 } }, dd.letter)),
    h('line', { x1: last[0], x2: last[0], y1: g.top - 12, y2: g.baseline, strokeWidth: 1, strokeDasharray: '2 3', style: { stroke: C.ink2 } }),
    h('text', { x: last[0], y: g.top - 16, textAnchor: 'end', style: { ...mono, fontSize: 9.5, fill: C.ink2 } }, 'AUJ. ' + milliers(auj.value)),
    trace.empty
      ? h('text', { x: W / 2, y: g.baseline - 30, textAnchor: 'middle', style: { fontFamily: C.font, fontSize: 12, fill: C.ink3 } }, 'La courbe s’écrit à ta première séance réalisée.')
      : null,
    // Le tracé s'écrit de gauche à droite, comme sous la plume d'un
    // enregistreur ; les repères apparaissent au passage de la plume.
    h('path', { d, fill: 'none', strokeWidth: 2.2, strokeLinejoin: 'round', pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1, style: { stroke: C.trace, animation: 'traceDraw 1.3s cubic-bezier(.3,.6,.3,1) .1s forwards' } }),
    pts.map((p, i) => {
      const seance = trace.days[i].sessions > 0
      return h('rect', { key: 'm' + i, x: p[0] - 3.5, y: p[1] - 3.5, width: 7, height: 7, strokeWidth: 1.5, style: { fill: seance ? C.trace : C.bg, stroke: C.trace, animation: `fadeIn .25s ease ${(0.1 + 1.3 * i / Math.max(1, n - 1)).toFixed(2)}s backwards` } })
    }))
}

// Cadran d'un relevé du jour : l'aiguille monte jusqu'à la valeur.
function Cadran({ label, value, unit, progress, sub, color, onClick }) {
  return h('button', { onClick, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', color: C.ink } },
    h(Ring, { size: 98, stroke: 6, progress, color, track: C.surface2 },
      h('div', { style: { fontFamily: C.mono, fontSize: 15, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, marginTop: 8, whiteSpace: 'nowrap' } }, value),
      unit ? h('div', { style: { fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 4 } }, unit) : null),
    h('div', { style: { fontFamily: C.display, fontSize: 14.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: -6 } }, label),
    h('div', { style: { fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 3, textAlign: 'center' } }, sub))
}

// Une séance à faire, sur une étiquette posée sur le papier.
function LigneSeance({ eyebrow, title, meta, tint = C.trace, onClick }) {
  return h('button', { onClick, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', background: C.surface, border: `1px solid ${C.line}`, borderTop: `2px solid ${C.ink}`, cursor: 'pointer', color: C.ink, marginBottom: 10 } },
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontFamily: C.mono, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: tint } }, eyebrow),
      h('div', { style: { fontFamily: C.display, fontSize: 23, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } }, title),
      meta ? h('div', { style: { fontFamily: C.mono, fontSize: 10.5, color: C.ink2, marginTop: 6 } }, meta) : null),
    h('span', { style: { flex: '0 0 auto', fontFamily: C.display, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: tint, whiteSpace: 'nowrap' } }, 'Ouvrir →'))
}

function seancesAFaire(heroInfo, onOpen, onPlanner) {
  const rows = []
  if (heroInfo.session) {
    const s = heroInfo.session
    rows.push(h(LigneSeance, { key: 'seance', eyebrow: heroInfo.kind === 'suggestion' ? 'Suggestion du jour' : 'Ta prochaine séance', title: s.title, meta: `${s.mins} min · ${sessionExercises(s).length} mouvements`, onClick: () => onOpen(s.id) }))
  }
  if (heroInfo.planned) {
    const p = heroInfo.planned, sp = heroInfo.sportInfo
    const mins = dureeToMins(p.duree)
    rows.push(h(LigneSeance, { key: 'prevue', eyebrow: "Prévu aujourd'hui · à suivre", title: describeSession(sp.label, p.exercises), meta: [sp.label, p.heure, mins ? mins + ' min' : null].filter(Boolean).join(' · '), tint: MODULE_TINTS.hydratation, onClick: onPlanner }))
  }
  return rows
}

// Rétrospective affichée chaque lundi : analyse précise (pas juste des
// chiffres) de la semaine qui vient de se terminer — entraînement,
// nutrition, hydratation, compléments. Fermeture locale seulement (pas
// persistée) : elle revient à la prochaine ouverture, et de toute façon
// naturellement chaque lundi suivant.
function MondayRetroCard({ db, onOpen }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || new Date().getDay() !== 1) return null
  const r = mondayRetro(db)
  if (!r.training.count && !r.nutrition && !r.hydration) return null
  return h('div', { onClick: onOpen, style: { padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}`, borderLeft: '3px solid var(--ch4)', marginTop: 22, cursor: onOpen ? 'pointer' : 'default' } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 } },
      h('div', { style: { fontFamily: C.display, fontSize: 19, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1 } }, 'Rétrospective de la semaine'),
      h('button', { onClick: (e) => { e.stopPropagation(); setDismissed(true) }, 'aria-label': 'Fermer', style: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 } },
        h(Icon, { name: 'close', size: 16, color: C.ink3 }))),
    r.lines.map((line, i) => h('p', { key: i, style: { fontSize: 13, lineHeight: 1.55, color: C.ink2, marginTop: i ? 8 : 0 } }, line)))
}

// Alerte visible seulement en cas de charge ACWR "Vigilance renforcée" —
// mêmes seuils que le pilier Charge et le Profil (inferUserLevel).
function OverloadAlert({ db, onPrevention }) {
  const r = acwrRisk(db)
  if (!r.available || r.level !== 'Vigilance renforcée') return null
  return h('button', {
    onClick: onPrevention,
    style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', marginTop: 18, cursor: 'pointer', color: C.ink, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${r.color}` },
  },
    h(Icon, { name: 'shield', size: 20, color: r.color, style: { flex: '0 0 auto' } }),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontFamily: C.display, fontWeight: 800, fontSize: 17, textTransform: 'uppercase', letterSpacing: '.03em', color: r.color, marginBottom: 3 } }, "Charge d'entraînement élevée"),
      h('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.35 } }, (ecartHabitude(r.ratio) || '').replace(/^./, (c) => c.toUpperCase()) + ' que ton habitude : prévois une séance légère ou du repos.')),
    h('span', { style: { fontFamily: C.mono, color: C.ink3 } }, '→'))
}

// Ligne de liste réglée : pictogramme dans un carré au trait. Les filets
// entre lignes viennent de la classe .liste (index.css).
function Ligne(ic, color, title, detail, onClick, key) {
  return h(onClick ? 'button' : 'div', {
    key,
    onClick, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 0', background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default', color: C.ink },
  },
    h('div', { style: { width: 32, height: 32, flex: '0 0 auto', border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: ic, size: 16, color })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontWeight: 600, fontSize: 14.5 } }, title),
      h('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 1 } }, detail)),
    onClick ? h('span', { style: { fontFamily: C.mono, color: C.ink3, fontSize: 13 } }, '→') : null)
}
const listeStyle = { background: C.surface, border: `1px solid ${C.line}`, padding: '0 12px' }

// Rappels : prochaine séance planifiée, résumé nutrition/hydratation du
// jour, routines, charge ACWR (si assez d'historique et pas déjà signalée
// par OverloadAlert).
function TodayInsights({ db, onPlanner, onNutrition, onRoutines, onSommeil }) {
  const iso = isoToday()
  const pillarList = intelPillars(db, iso)
  const nutPillar = pillarList.find((p) => p.id === 'nutrition')
  const hydPillar = pillarList.find((p) => p.id === 'hydration')
  const acwr = acwrRisk(db)
  const next = nextPlannedSession(db)
  const nextSport = next ? getSportInfo(next.sport) : null
  const nextMins = next ? dureeToMins(next.duree) : 0

  // Les routines du jour se rappellent au même endroit que les séances
  // planifiées : c'est le seul moyen qu'elles ne soient pas oubliées, et
  // une routine oubliée ne sert à rien.
  const routines = routinesToday(db, { today: iso })
  const routinesLeft = routines.filter((r) => !r.done)
  const nextDetail = next ? `${next.date === iso ? "Aujourd'hui" : next.date}${next.heure ? ' · ' + next.heure : ''}${nextMins ? ' · ' + nextMins + ' min' : ''}` : 'Aucune séance planifiée'
  const nextTitle = next ? (nextSport ? nextSport.label : 'Séance planifiée') : 'Planifier une séance'

  const nuitSaisie = Number(((db.sleepLog || {})[iso] || {}).hours) > 0
  // Le soir, l'heure du coucher qui donne la nuit dont tu as besoin.
  const soir = new Date().getHours() >= 18 && onSommeil ? coucherDuSoir(db, iso) : null
  const rappels = [
    soir && Ligne('moon', MODULE_TINTS.sommeil, 'Ce soir : au lit vers ' + soir.coucher, `Pour dormir ${libelleDuree(soir.besoin)} avant ton lever de ${soir.lever}${soir.bonus ? `, dont ${soir.bonus} min pour la dette` : ''}`, onSommeil, 'soir'),
    // La nuit se saisit le matin ou elle s'oublie : tant qu'elle manque, on
    // la rappelle — elle fait la forme du jour.
    !nuitSaisie && onSommeil && Ligne('moon', MODULE_TINTS.sommeil, 'Comment as-tu dormi ?', 'Saisis ta nuit pour connaître ta forme du jour', onSommeil, 'nuit'),
    !(next && next.date === iso) && Ligne('calendar', C.primary, nextTitle, nextDetail, onPlanner, 'next'),
    (nutPillar || hydPillar) && Ligne('apple', C.carb, 'Nutrition & hydratation', [nutPillar && nutPillar.status === 'ok' ? nutPillar.detail : null, hydPillar && hydPillar.status === 'ok' ? hydPillar.detail : null].filter(Boolean).join(' · ') || "Rien enregistré aujourd'hui", onNutrition, 'nut'),
    acwr.available && acwr.level !== 'Vigilance renforcée' && Ligne('chart', acwr.color, 'Charge : ' + (CONSEIL_CHARGE[acwr.level] || acwr.level).split(' :')[0].toLowerCase(), `${milliers(acwr.acuteMin)} points sur 7 jours, ${ecartHabitude(acwr.ratio) === 'autant' ? 'comme d’habitude' : ecartHabitude(acwr.ratio) + ' que d’habitude'}`, onPlanner, 'acwr'),
  ].filter(Boolean)

  return h('div', null,
    rappels.length ? h('div', null, Titre('Rappels'), h('div', { className: 'liste', style: listeStyle }, rappels)) : null,
    // Les routines ne sont pas des séances planifiées : elles se répètent,
    // se cochent, et ne coûtent que quelques minutes. Les mêler aux rappels
    // du jour les faisait passer pour des séances, et une routine annoncée
    // comme une séance décourage autant qu'elle rappelle. Elles ont donc leur
    // propre bloc, sous leur propre titre.
    routines.length ? h('div', { key: 'routines' },
      Titre('Tes routines du jour', routinesLeft.length ? `${routinesLeft.length} à faire` : 'terminées'),
      h('div', { className: 'liste', style: listeStyle },
        routines.map((r) => Ligne(
          r.done ? 'check' : kindOf(r.kind).icon,
          C.success,
          r.name,
          `${kindOf(r.kind).label} · ${r.keys.length} mouvement${r.keys.length > 1 ? 's' : ''} · ~${r.mins} min${r.done ? ' · faite' : ''}`,
          onRoutines, r.id,
        )))) : null)
}

// ============================================================
// Accueil — l'enregistreur. En premier, la courbe de charge de la semaine
// imprimée sur le papier ; dessous, les cadrans des relevés du jour
// (sommeil, eau, protéines), la séance à faire, puis les rappels, le score
// santé et le prochain objectif.
// ============================================================
export default function AccueilSpace({ userId, profile, onProfil }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tile, setTile] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [healthTile, setHealthTile] = useState(null)

  if (loading) {
    return h('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.mono, fontSize: 12, textTransform: 'uppercase' } }, 'Chargement...')
  }

  if (tile) return h(TrainSpace, { userId, initialTile: tile, embedded: true, onClose: () => setTile(null) })
  if (openId) return h(TrainSpace, { userId, initialOpenId: openId, embedded: true, onClose: () => setOpenId(null) })
  if (healthTile) return h(HealthHome, { userId, initialSpace: healthTile, embedded: true, onClose: () => setHealthTile(null) })

  // Dispatch générique pour tout ce qui est cliquable sur Accueil (tuiles
  // du score santé, recommandations, "Charge" du jour…) — même logique que
  // TrainSpace/CoachSpace : préfixe session:<id>, sinon un tile Entraîner,
  // sinon un module Santé. Traduit aussi les ids de pilier bruts
  // (hydration/sleep/load) vers leur vraie destination.
  const ENTRAINER_ACTIONS = new Set(['mobility', 'program', 'planner', 'recovery', 'peak', 'tests', 'load'])
  const PILLAR_DEST = { hydration: 'hydratation', sleep: 'sommeil', load: 'planner' }
  function handleAction(action) {
    if (!action) return
    const dest = PILLAR_DEST[action] || action
    if (dest.startsWith('session:')) { setOpenId(dest.slice(8)); return }
    if (ENTRAINER_ACTIONS.has(dest)) { setTile(dest); return }
    setHealthTile(dest)
  }

  const iso = isoToday()
  const heroInfo = pickHeroContent(db)
  const totals = trainingTotals(db)
  const streak = totals.streak
  const totalMins = totals.week.reduce((a, b) => a + b, 0)
  const doneCount = totals.week.filter((m) => m > 0).length
  const firstName = profile?.first_name || ''
  const initial = (firstName || '?').trim().charAt(0).toUpperCase()

  const now = new Date()
  const J = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
  const p2 = (x) => String(x).padStart(2, '0')
  const repereDate = `${J[now.getDay()]} ${p2(now.getDate())}.${p2(now.getMonth() + 1)}`
  const hr = now.getHours()
  const greeting = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir'

  // ─── en-tête : marque et date en repère, salutation en étiquette ───
  const header = h('div', null,
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 7, borderBottom: `2px solid ${C.ink}` } },
      h('span', { style: { fontFamily: C.display, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.trace } }, 'Renfo'),
      h('span', { style: { fontFamily: C.mono, fontSize: 10.5, color: C.ink2, textTransform: 'uppercase' } }, repereDate)),
    h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14 } },
      h('h1', { style: { fontFamily: C.display, fontSize: 34, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.01em', lineHeight: .92, margin: 0, color: C.ink } }, greeting, firstName ? ', ' + firstName : ''),
      h('button', { onClick: onProfil, 'aria-label': 'Profil', style: { width: 40, height: 40, flex: '0 0 auto', background: 'transparent', border: `1.5px solid ${C.ink}`, color: C.ink, fontFamily: C.display, fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, initial)))

  // ─── la courbe de la semaine ───
  const trace = weekTrace(db, { today: iso })
  const acwr = acwrRisk(db)
  const ecart = acwr.available ? ecartHabitude(acwr.ratio) : null
  const lecture = acwr.available && ecart
    ? h('span', null,
      h('span', { style: { color: C.ink } }, ecart === 'autant' ? 'Autant' : ecart.charAt(0).toUpperCase() + ecart.slice(1), ' que ton habitude des 4 dernières semaines'),
      h(Aide, { terme: 'rapport' }),
      h('span', { style: { display: 'block', color: acwr.color, fontWeight: 600, marginTop: 3 } }, CONSEIL_CHARGE[acwr.level] || acwr.level))
    : acwr.reason === 'not_enough_history'
      ? `Ta zone habituelle s’affichera après 14 jours d’historique (${acwr.daysOfHistory} pour l’instant).`
      : acwr.reason === 'no_data' ? 'Enregistre une séance réalisée : la courbe démarre avec elle.' : 'Pas encore de charge habituelle.'

  const statCards = [
    { big: streak, lab: 'jours de suite' },
    { big: totalMins, lab: 'min cette semaine' },
    { big: doneCount, lab: 'séances faites' },
  ].map((s, i) => h('button', { key: i, onClick: () => setTile('planner'), style: { textAlign: 'left', background: 'none', border: 'none', borderLeft: i ? `1px solid ${C.line}` : 'none', padding: '11px 10px 10px', cursor: 'pointer', color: C.ink } },
    h('div', { style: { fontFamily: C.mono, fontSize: 20, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 } }, s.big),
    h('div', { style: { fontFamily: C.mono, fontSize: 9.5, color: C.ink3, textTransform: 'uppercase', marginTop: 6, lineHeight: 1.3 } }, s.lab)))

  const charge = h('section', { 'aria-label': 'Charge des 7 derniers jours' },
    Titre('Charge des 7 derniers jours', null, 'charge'),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
      h('span', { style: { fontFamily: C.mono, fontSize: 40, fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1 } }, milliers(trace.acute)),
      h('span', { style: { fontFamily: C.mono, fontSize: 12, color: C.ink3 } }, 'points de charge')),
    h('div', { style: { fontSize: 13, color: C.ink2, marginTop: 7, lineHeight: 1.4 } }, lecture),
    h('div', { style: { marginTop: 12 } }, h(TraceChart, { trace })),
    h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 8, lineHeight: 1.45 } }, 'Chaque point de la courbe additionne la semaine qui se termine ce jour-là. La bande : ta zone habituelle (0,8 à 1,3 fois ta moyenne).'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: `1px solid ${C.ink}`, borderBottom: `1px solid ${C.line}`, marginTop: 14 } }, statCards))

  // ─── relevés du jour, en cadrans ───
  const nuit = db.sleepLog && typeof db.sleepLog === 'object' && !Array.isArray(db.sleepLog) ? db.sleepLog[iso] : null
  const dormi = nuit ? num(nuit.hours) : 0
  let cibleSommeil = neededHours(totalMins)
  const rt = db.sleepRoutine
  if (rt && rt.enabled && rt.bedtime && rt.wake) {
    const toMin = (t) => { const a = ('' + t).split(':'); return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0) }
    let diff = toMin(rt.wake) - toMin(rt.bedtime); if (diff <= 0) diff += 1440
    if (diff > 0 && diff < 1440) cibleSommeil = diff / 60
  }
  const eau = hydroDay(db, iso).ml
  const cibleEau = hydricTargetMl(db) || 2000
  const prot = nutritionDay(db, iso).p
  const t = db.foodTargets
  const cibleProt = t ? (num(t.prot) || num(t.p)) : 0
  const litres = (ml) => fr((Math.max(0, ml) / 1000).toFixed(1))

  const cadrans = h('section', { 'aria-label': 'Relevés du jour' },
    Titre('Relevés du jour', null, 'cadrans'),
    h('div', { style: { display: 'flex', gap: 6 } },
      h(Cadran, { label: 'Sommeil', value: dormi ? heures(dormi) : '—', progress: cibleSommeil ? dormi / cibleSommeil : 0, color: MODULE_TINTS.sommeil, sub: !dormi ? 'à saisir' : dormi >= cibleSommeil ? 'cible atteinte' : 'cible ' + heures(cibleSommeil), onClick: () => setHealthTile('sommeil') }),
      h(Cadran, { label: 'Eau', value: litres(eau), unit: 'L', progress: eau / cibleEau, color: MODULE_TINTS.hydratation, sub: eau >= cibleEau ? 'cible atteinte' : 'reste ' + litres(cibleEau - eau) + ' L', onClick: () => setHealthTile('hydratation') }),
      h(Cadran, { label: 'Protéines', value: String(Math.round(prot)), unit: 'g', progress: cibleProt ? prot / cibleProt : 0, color: C.protein, sub: !cibleProt ? 'fixer un objectif' : prot >= cibleProt ? 'cible atteinte' : 'reste ' + Math.round(cibleProt - prot) + ' g', onClick: () => setHealthTile('nutrition') })))

  // ─── séance à faire, avec la forme du jour au-dessus ───
  const forme = formeDb(db, iso)
  // La forme règle la séance prévue aujourd'hui : l'alléger ou la décaler
  // d'un geste, annulable, avec la trace de ce qui a été changé et pourquoi.
  const seanceDuJour = heroInfo.planned || null
  const reglages = reglagesSeance(forme, seanceDuJour)
  function reglerSeance(r) {
    const id = seanceDuJour.id
    const avant = { duree: seanceDuJour.duree, date: seanceDuJour.date, forme: forme.score }
    store.annulable(r.id === 'alleger' ? `Séance allégée : ${r.duree}` : 'Séance décalée à demain', () => store.set((sx) => ({
      planningSessions: ((sx && sx.planningSessions) || []).map((x) => (x && x.id === id
        ? (r.id === 'alleger' ? { ...x, duree: r.duree, reglage: { ...avant, type: 'alleger' } } : { ...x, date: r.date, reglage: { ...avant, type: 'decaler' } })
        : x)),
    })))
  }
  const aFaire = h('section', { 'aria-label': 'Séance à faire' },
    Titre('À faire'),
    forme ? h('button', { onClick: () => setHealthTile('sommeil'), style: { display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left', padding: '0 0 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.ink } },
      h('span', { style: { fontFamily: C.mono, fontSize: 18, fontWeight: 600, letterSpacing: '-.03em', color: COULEUR_FORME[forme.niveau] } }, forme.score),
      h('span', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.4 } }, h('strong', { style: { color: C.ink } }, 'Forme du jour'), h(Aide, { terme: 'forme' }), ' — ', forme.verdict,
        h('span', { style: { display: 'block', fontSize: 12, color: C.ink3, marginTop: 2 } }, forme.consigne))) : null,
    seanceDuJour && seanceDuJour.reglage && seanceDuJour.reglage.type === 'alleger' ? h('div', { style: { fontSize: 12, color: C.ink3, margin: '-4px 0 10px', paddingLeft: 10, borderLeft: `3px solid ${C.line}` } },
      `Séance allégée : ${seanceDuJour.reglage.duree} prévu, ${seanceDuJour.duree} maintenant.`) : null,
    reglages.length ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '-4px 0 12px' } },
      reglages.map((r) => h('button', { key: r.id, type: 'button', onClick: () => reglerSeance(r), style: { padding: '7px 10px', border: `1.5px solid ${COULEUR_FORME[forme.niveau]}`, background: C.surface, color: C.ink, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, r.lab))) : null,
    seancesAFaire(heroInfo, setOpenId, () => setTile('planner')))

  const mobilityCta = !db.mobility && h('div', { className: 'liste', style: { ...listeStyle, marginTop: 22 } },
    Ligne('target', C.primary, 'Test de mobilité', '9 questions · identifie tes zones raides et génère ton programme', () => setTile('mobility'), 'mob'))

  const content = h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '16px 18px 36px' } },
    header,
    charge,
    cadrans,
    aFaire,
    h(MondayRetroCard, { db, onOpen: () => setTile('planner') }),
    h(OverloadAlert, { db, onPrevention: () => setHealthTile('prevention') }),
    h('div', { style: { marginTop: 22 } }, h(HealthScoreCard, { db, onAction: handleAction })),
    h(TodayInsights, { db, onPlanner: () => setTile('planner'), onNutrition: () => setHealthTile('nutrition'), onRoutines: () => setTile('routines'), onSommeil: () => setHealthTile('sommeil') }),
    h('div', { style: { marginTop: 22 } }, h(PeakHomeCard, { db, onPeak: () => setTile('peak') })),
    mobilityCta)

  // Le papier défile avec le contenu, comme une bande d'enregistreur.
  return h('div', { style: { flex: 1, overflowY: 'auto', backgroundColor: C.bg, backgroundImage: 'var(--g-paper)', backgroundSize: 'var(--g-paper-size)', backgroundPosition: '-1px -1px', backgroundAttachment: 'local', fontFamily: C.font, color: C.ink } }, content)
}
