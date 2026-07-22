import React, { useState } from 'react'
import { C, Icon, Pill, MODULE_TINTS, isoToday } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { pillars as intelPillars, acwrRisk, dureeToMins, trainingTotals, mondayRetro } from '../train/renfoIntel'
import { SESSIONS, SPORTS, sessionExercises } from '../train/trainData'
import TrainSpace from '../train/TrainSpace'
import HealthHome from '../health/HealthHome'
import { HealthScoreCard, PeakHomeCard } from '../progress/cards'

const h = React.createElement

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

// Choisit ce que montre la carte "hero" : séance de programme correctif
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

function renderTwinCard({ tint, icon, eyebrow, title, meta, onClick }) {
  return h('button', {
    onClick,
    style: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, border: `1.5px solid color-mix(in srgb, ${tint} 28%, ${C.line})`, background: `color-mix(in srgb, ${tint} 10%, ${C.surface})`, cursor: 'pointer' },
  },
    h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${tint} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: icon, size: 21, color: tint })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontSize: 12, color: tint, fontWeight: 700 } }, eyebrow),
      h('div', { style: { fontFamily: C.font, fontSize: 16.5, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, title),
      h('div', { style: { fontSize: 13, color: C.ink3, marginTop: 2 } }, meta)),
    h(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } }))
}

function renderHeroCard(heroInfo, onOpen, onPlanner) {
  if (heroInfo.kind === 'planned') {
    const p = heroInfo.planned, sp = heroInfo.sportInfo
    const mins = dureeToMins(p.duree)
    const metaParts = [p.heure, mins ? mins + ' min' : null].filter(Boolean).join(' · ')
    const tint = MODULE_TINTS.hydratation
    return h('button', {
      onClick: onPlanner,
      style: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, border: `1.5px solid color-mix(in srgb, ${tint} 28%, ${C.line})`, background: `color-mix(in srgb, ${tint} 10%, ${C.surface})`, marginBottom: 18, cursor: 'pointer' },
    },
      h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${tint} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h(Icon, { name: sp.ic, size: 21, color: tint })),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: 12, color: tint, fontWeight: 700 } }, "Prévu aujourd'hui · à suivre"),
        h('div', { style: { fontFamily: C.font, fontSize: 16.5, fontWeight: 700, marginTop: 2 } }, describeSession(sp.label, p.exercises)),
        metaParts && h('div', { style: { fontSize: 13, color: C.ink3, marginTop: 2 } }, sp.label + (metaParts ? ' · ' + metaParts : ''))),
      h(Icon, { name: 'arrow', size: 20, color: C.ink3, style: { flex: '0 0 auto' } }))
  }
  const hero = heroInfo.session
  const pillLabel = (heroInfo.kind === 'program' || heroInfo.kind === 'both') ? 'Ta prochaine séance' : 'Suggestion du jour'
  const heroStyle = heroInfo.kind === 'both'
    ? { position: 'relative', minHeight: 180, padding: 22, borderRadius: `${C.radius}px ${C.radius}px 0 0`, background: C.primary, marginBottom: 0, boxShadow: `0 18px 40px -22px ${C.primary}`, textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }
    : { position: 'relative', minHeight: 210, padding: 22, borderRadius: C.radius, background: C.primary, marginBottom: 18, boxShadow: `0 18px 40px -22px ${C.primary}`, textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }
  return h('button', { onClick: () => onOpen(hero.id), style: heroStyle },
    h('div', { style: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 } },
      h(Pill, { style: { background: 'rgba(255,255,255,.18)', color: '#fff' } }, h(Icon, { name: 'spark', size: 13 }), ' ' + pillLabel),
      h('div', { style: { textAlign: 'left' } },
        h('div', { style: { fontFamily: C.font, fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.04, letterSpacing: '-.02em' } }, hero.title),
        h('div', { style: { color: 'rgba(255,255,255,.85)', fontSize: 14.5, marginTop: 6, display: 'flex', gap: 14, alignItems: 'center' } },
          h('span', { style: { display: 'inline-flex', gap: 5, alignItems: 'center' } }, h(Icon, { name: 'clock', size: 15 }), ' ', hero.mins, ' min'),
          h('span', { style: { display: 'inline-flex', gap: 5, alignItems: 'center' } }, h(Icon, { name: 'layers', size: 15 }), ' ', sessionExercises(hero).length, ' mvts'))),
      h('span', { style: { position: 'absolute', right: 0, bottom: 0, width: 54, height: 54, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -8px rgba(0,0,0,.4)' } },
        h(Icon, { name: 'play', size: 22, color: C.primary }))))
}

function renderBothEqual(heroInfo, onOpen, onPlanner) {
  const hero = heroInfo.session, planned = heroInfo.planned, sp = heroInfo.sportInfo
  const mins = dureeToMins(planned.duree)
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 } },
    renderTwinCard({ tint: MODULE_TINTS.renfo, icon: 'spark', eyebrow: 'Ta prochaine séance', title: hero.title, meta: hero.mins + ' min · ' + sessionExercises(hero).length + ' mvts', onClick: () => onOpen(hero.id) }),
    renderTwinCard({ tint: MODULE_TINTS.hydratation, icon: sp.ic, eyebrow: "Prévu aujourd'hui · à suivre", title: describeSession(sp.label, planned.exercises), meta: sp.label + ((planned.heure || mins) ? ' · ' + [planned.heure, mins ? mins + ' min' : null].filter(Boolean).join(' · ') : ''), onClick: onPlanner }))
}

// Alerte visible seulement en cas de charge ACWR "Vigilance renforcée" —
// mêmes seuils que le pilier Charge et le Profil (inferUserLevel).
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
  return h('div', { onClick: onOpen, style: { padding: 20, borderRadius: C.radius, background: '#3f3a5c', color: '#fff', marginBottom: 16, boxShadow: '0 10px 24px -12px #3f3a5c', cursor: onOpen ? 'pointer' : 'default' } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('div', { style: { width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(Icon, { name: 'chart', size: 18, color: '#fff' })),
        h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15.5 } }, 'Rétrospective de la semaine')),
      h('button', { onClick: (e) => { e.stopPropagation(); setDismissed(true) }, 'aria-label': 'Fermer', style: { background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: 4 } },
        h(Icon, { name: 'close', size: 16, color: 'rgba(255,255,255,.7)' }))),
    r.lines.map((line, i) => h('p', { key: i, style: { fontSize: 13, lineHeight: 1.55, opacity: 0.95, marginTop: i ? 8 : 0 } }, line)))
}

function OverloadAlert({ db, onPrevention }) {
  const r = acwrRisk(db)
  if (!r.available || r.level !== 'Vigilance renforcée') return null
  return h('button', {
    onClick: onPrevention,
    style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: C.radiusSm, marginBottom: 16, cursor: 'pointer', background: `color-mix(in srgb, ${r.color} 12%, ${C.surface})`, border: `1.5px solid color-mix(in srgb, ${r.color} 32%, ${C.line})` },
  },
    h('div', { style: { width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', background: `color-mix(in srgb, ${r.color} 18%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: 'shield', size: 20, color: r.color })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14.5, color: r.color, marginBottom: 2 } }, "Charge d'entraînement élevée"),
      h('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.35 } }, 'Ratio ' + r.ratio + ' · surveille fatigue et douleurs')),
    h(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } }))
}

// 3 rappels : prochaine séance planifiée, résumé nutrition/hydratation du
// jour, charge ACWR (si assez d'historique et pas déjà signalée par OverloadAlert).
function TodayInsights({ db, onPlanner, onNutrition }) {
  const iso = isoToday()
  const pillarList = intelPillars(db, iso)
  const nutPillar = pillarList.find((p) => p.id === 'nutrition')
  const hydPillar = pillarList.find((p) => p.id === 'hydration')
  const acwr = acwrRisk(db)
  const next = nextPlannedSession(db)
  const nextSport = next ? getSportInfo(next.sport) : null
  const nextMins = next ? dureeToMins(next.duree) : 0

  const Row = (ic, color, title, detail, onClick) => h(onClick ? 'button' : 'div', {
    onClick, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 14, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, marginBottom: 10, cursor: onClick ? 'pointer' : 'default' },
  },
    h('div', { style: { width: 38, height: 38, borderRadius: 11, flex: '0 0 auto', background: `color-mix(in srgb, ${color} 14%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: ic, size: 18, color })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontWeight: 600, fontSize: 14.5 } }, title),
      h('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 1 } }, detail)),
    onClick && h(Icon, { name: 'arrow', size: 17, color: C.ink3, style: { flex: '0 0 auto' } }))

  const nextDetail = next ? `${next.date === iso ? "Aujourd'hui" : next.date}${next.heure ? ' · ' + next.heure : ''}${nextMins ? ' · ' + nextMins + ' min' : ''}` : 'Aucune séance planifiée'
  const nextTitle = next ? (nextSport ? nextSport.label : 'Séance planifiée') : 'Planifier une séance'

  return h('div', { style: { marginTop: 22 } },
    h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '0 2px 10px' } }, "Aujourd'hui"),
    !(next && next.date === iso) && Row('calendar', C.primary, nextTitle, nextDetail, onPlanner),
    (nutPillar || hydPillar) && Row('apple', '#6f8a3a', 'Nutrition & hydratation', [nutPillar && nutPillar.status === 'ok' ? nutPillar.detail : null, hydPillar && hydPillar.status === 'ok' ? hydPillar.detail : null].filter(Boolean).join(' · ') || "Rien enregistré aujourd'hui", onNutrition),
    acwr.available && acwr.level !== 'Vigilance renforcée' && Row('chart', acwr.color, 'Charge : ' + acwr.level, `Ratio ${acwr.ratio} · ${acwr.acuteMin} min (7j) vs ${acwr.chronicAvgWeek} min/sem moy.`, onPlanner))
}

// ============================================================
// "Accueil" — porté depuis l'écran Home de l'ancienne app : salutation,
// carte hero (séance du jour), stats de la semaine, alerte de charge,
// score santé, rappels du jour, prochain objectif pic de forme, CTA
// test de mobilité. Remplace le placeholder brut de App.jsx.
// ============================================================
export default function AccueilSpace({ userId, profile, onProfil }) {
  const { db, loading } = useNutritionStore(userId)
  const [tile, setTile] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [healthTile, setHealthTile] = useState(null)

  if (loading) {
    return h('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
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

  const heroInfo = pickHeroContent(db)
  const totals = trainingTotals(db)
  const streak = totals.streak
  const totalMins = totals.week.reduce((a, b) => a + b, 0)
  const doneCount = totals.week.filter((m) => m > 0).length
  const firstName = profile?.first_name || ''
  const initial = (firstName || '?').trim().charAt(0).toUpperCase()

  const now = new Date()
  const J = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const dateLabel = (() => { const x = `${J[now.getDay()]} ${now.getDate()} ${M[now.getMonth()]}`; return x.charAt(0).toUpperCase() + x.slice(1) })()
  const hr = now.getHours()
  const greeting = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir'

  const statCards = [
    { ic: 'flame', big: streak, lab: 'jours de suite' },
    { ic: 'clock', big: totalMins, lab: 'min cette semaine' },
    { ic: 'check', big: doneCount, lab: 'séances faites' },
  ].map((s, i) => h('button', { key: i, onClick: () => setTile('planner'), style: { textAlign: 'center', width: '100%', background: 'none', border: 'none', borderLeft: i > 0 ? `1px solid ${C.line}` : 'none', cursor: 'pointer', padding: '0 4px' } },
    h(Icon, { name: s.ic, size: 18, color: C.primary }),
    h('div', { style: { fontSize: 24, fontWeight: 700, lineHeight: 1, marginTop: 8 } }, s.big),
    h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4, fontWeight: 600 } }, s.lab)))

  const mobilityCta = !db.mobility && h('button', {
    onClick: () => setTile('mobility'),
    style: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, marginTop: 22, cursor: 'pointer' },
  },
    h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: 'target', size: 23, color: C.primary })),
    h('div', { style: { flex: 1 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 16 } }, 'Test de mobilité'),
      h('div', { style: { fontSize: 13, color: C.ink3, marginTop: 2 } }, '9 questions · identifie tes zones raides et génère ton programme')),
    h(Icon, { name: 'arrow', size: 20, color: C.ink3, style: { flex: '0 0 auto' } }))

  const header = h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 } },
    h('div', null,
      h('div', { style: { color: C.ink3, fontSize: 14, fontWeight: 600 } }, dateLabel),
      h('h1', { style: { fontFamily: C.font, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em', marginTop: 2 } }, greeting, ', ', firstName)),
    h('button', { onClick: onProfil, 'aria-label': 'Profil', style: { width: 44, height: 44, borderRadius: 999, background: C.ink, color: C.surface, fontFamily: C.font, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flex: '0 0 auto' } }, initial))

  const hero = heroInfo.kind === 'both'
    ? renderBothEqual(heroInfo, setOpenId, () => setTile('planner'))
    : renderHeroCard(heroInfo, setOpenId, () => setTile('planner'))

  const statRow = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 22, background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: '16px 0' } }, statCards)

  const content = h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '20px 18px 32px' } },
    h('div', { style: { fontSize: 15, color: C.primary, fontWeight: 700, marginBottom: 14 } }, 'Renfo'),
    header,
    hero,
    statRow,
    h(MondayRetroCard, { db, onOpen: () => setTile('planner') }),
    h(OverloadAlert, { db, onPrevention: () => setHealthTile('prevention') }),
    h(HealthScoreCard, { db, onAction: handleAction }),
    h(TodayInsights, { db, onPlanner: () => setTile('planner'), onNutrition: () => setHealthTile('nutrition') }),
    h(PeakHomeCard, { db, onPeak: () => setTile('peak') }),
    mobilityCta)

  return h('div', { style: { flex: 1, overflowY: 'auto', background: C.bg, fontFamily: C.font } }, content)
}
