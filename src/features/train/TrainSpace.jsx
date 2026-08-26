import React, { useState } from 'react'
import { C, Icon, MODULE_TINTS, GRADIENTS } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { getSession, sessionDuration } from './trainData'
import Detail from './Detail'
import Player from './Player'
import MobilityTest from './MobilityTest'
import ProgramView from './ProgramView'
import RenfoCatalog from './RenfoCatalog'
import MobilityCatalog from './MobilityCatalog'
import RecoverySpace from './RecoverySpace'
import PliometrieSpace from './PliometrieSpace'
import CoachSpace from './CoachSpace'
import PeakSpace from './PeakSpace'
import PlannerSpace from './PlannerSpace'
import WeatherSpace from './WeatherSpace'
import RoutinesSpace from './RoutinesSpace'
import { allTemplateRoutines } from './routineTemplates'
import { sessionExercises as routineBlocks } from './trainData'
import { routineMins as routineMinsOf } from './routines'
import { isoToday } from '../health/kit'
import PhysicalTestsSpace from '../physical-tests/PhysicalTests'
import HealthHome from '../health/HealthHome'

// ============================================================
// "S'entraîner" — hub central du module Entraîner, porté depuis
// l'ancienne app. Gère lui-même la navigation vers ses 9 sous-espaces
// et l'ouverture/lecture d'une séance (Detail/Player), pour rester
// un module autonome comme HealthHome.
// ============================================================
export default function TrainSpace({ userId, onClose, initialTile, initialOpenId, embedded }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tile, setTile] = useState(initialTile || null)
  const [openId, setOpenId] = useState(initialOpenId || null)
  const [playId, setPlayId] = useState(null)
  const [healthTile, setHealthTile] = useState(null)

  if (loading) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  // Destinations Entraîner (tile interne) vs Santé (module cross-onglet,
  // ouvert en overlay plein écran via HealthHome embedded) — utilisé par
  // les cartes du Coach et son chat pour ouvrir directement le bon module.
  // 'session:<id>' ouvre l'écran Detail d'une séance précise (le check
  // openId passe avant les tiles, donc ça marche depuis le Coach aussi).
  // Les modèles sont jouables au même titre que les routines composées :
  // le lecteur les cherche au même endroit.
  const playableRoutines = (d) => [...(Array.isArray(d.routines) ? d.routines : []), ...allTemplateRoutines()]
  // Une routine ajustée à une durée n'existe dans aucun catalogue : elle est
  // jouée telle quelle, par ses blocs, plutôt que retrouvée par identifiant.
  const [playRoutine, setPlayRoutine] = useState(null)

  const ENTRAINER_ACTIONS = new Set(['mobility', 'program', 'planner', 'recovery', 'peak', 'tests', 'weather', 'routines'])
  function handleCoachAction(action) {
    if (!action) return
    if (action.startsWith('session:')) { setOpenId(action.slice(8)); return }
    if (ENTRAINER_ACTIONS.has(action)) { setTile(action); return }
    setHealthTile(action)
  }
  if (healthTile) {
    return React.createElement(HealthHome, { userId, initialSpace: healthTile, embedded: true, onClose: () => setHealthTile(null) })
  }

  function finishSession() {
    const s = getSession(playId, db.program, playableRoutines(db))
    const isRecovery = playId && String(playId).startsWith('rec-')
    store.completeSession(s ? (s.mins || sessionDuration(s)) : 8, { title: s ? s.title : null, cat: isRecovery ? 'recup' : (s ? s.cat : null) })
    if (playId && db.program && db.program.sessions && db.program.sessions.some((x) => x.id === playId)) {
      store.markProgramDone(playId)
    }
    if (playId && String(playId).startsWith('rec-')) store.logRecovery(playId)
    setPlayId(null)
    setOpenId(null)
    setTile(null)
  }

  if (playRoutine) {
    return React.createElement(Player, {
      blocks: routineBlocks(playRoutine),
      title: playRoutine.name,
      onClose: () => setPlayRoutine(null),
      onFinish: () => {
        // Une routine faite se note dans son journal : c'est ce qui fait
        // monter les niveaux et alimente l'observance.
        store.set((prev) => {
          const log = { ...((prev && prev.routineLog) || {}) }
          const day = Array.isArray(log[isoToday()]) ? log[isoToday()] : []
          if (!day.includes(playRoutine.id)) log[isoToday()] = [...day, playRoutine.id]
          return { routineLog: log }
        })
        store.completeSession(routineMinsOf(playRoutine), { title: playRoutine.name, cat: playRoutine.cat })
        setPlayRoutine(null)
      },
    })
  }
  if (playId) {
    return React.createElement(Player, { id: playId, program: db.program, routines: playableRoutines(db), onClose: () => setPlayId(null), onFinish: finishSession })
  }
  if (openId) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 58, overflowY: 'auto' } },
      React.createElement(Detail, { id: openId, program: db.program, routines: playableRoutines(db), sensitiveZones: db.sensitiveZones, onBack: () => setOpenId(null), onStart: () => setPlayId(openId) }))
  }
  // Ouvert en deep-link (embedded, depuis Accueil/Progrès/Profil) : fermer un
  // sous-espace doit revenir directement à l'appelant, pas exposer le hub
  // "S'entraîner" complet (9 tuiles) qui n'a rien à voir avec ce que l'appelant
  // cherchait à ouvrir. Depuis l'onglet Entraîner lui-même (non embedded),
  // fermer un sous-espace revient normalement au hub.
  const backToHub = embedded ? onClose : () => setTile(null)
  if (tile === 'mobility') return React.createElement(MobilityTest, { db, store, onClose: backToHub, onProgram: () => setTile('program') })
  if (tile === 'program') return React.createElement(ProgramView, { db, store, onClose: backToHub, onOpenSession: setOpenId, onMobility: () => setTile('mobility') })
  if (tile === 'renfocatalog') return React.createElement(RenfoCatalog, { onClose: backToHub, onOpenSession: setOpenId })
  if (tile === 'mobcatalog') return React.createElement(MobilityCatalog, { onClose: backToHub, onOpenSession: setOpenId })
  if (tile === 'recovery') return React.createElement(RecoverySpace, { onClose: backToHub, onOpenSession: setOpenId })
  if (tile === 'plyo') return React.createElement(PliometrieSpace, { onClose: backToHub, onOpenSession: setOpenId })
  if (tile === 'coach') return React.createElement(CoachSpace, { db, onClose: backToHub, onAction: handleCoachAction })
  if (tile === 'peak') return React.createElement(PeakSpace, { db, store, onClose: backToHub, onMobility: () => setTile('mobility'), onProgram: () => setTile('program'), onRecovery: () => setTile('recovery'), onTests: () => setTile('tests'), onNutrition: () => setHealthTile('nutrition'), onCycle: () => setHealthTile('cycle') })
  if (tile === 'tests') return React.createElement(PhysicalTestsSpace, { userId, onClose: backToHub })
  if (tile === 'planner') return React.createElement(PlannerSpace, { db, store, onClose: backToHub })
  if (tile === 'weather') return React.createElement(WeatherSpace, { db, store, onClose: backToHub })
  // Une routine est jouable comme une séance : le lecteur la reçoit par le
  // même chemin, il n'a rien à savoir de plus.
  if (tile === 'routines') {
    return React.createElement(RoutinesSpace, {
      db, store, onClose: backToHub,
      onPlay: (r) => { setTile(null); setPlayRoutine(r) },
    })
  }

  const tiles = [
    { ic: 'target', tint: MODULE_TINTS.mobilite, lab: 'Test de mobilité', sub: db.mobility ? `Score : ${db.mobility.score}/100` : '9 questions', on: 'mobility' },
    { ic: 'route', tint: MODULE_TINTS.renfo, lab: 'Mon programme', sub: db.program ? `${db.program.sessions.filter((s) => db.program.done && db.program.done[s.id]).length}/${db.program.sessions.length}` : 'Perso', on: 'program' },
    { ic: 'bolt', tint: MODULE_TINTS.plyo, lab: 'Pliométrie', sub: 'Sauts', on: 'plyo' },
    { ic: 'leaf', tint: MODULE_TINTS.recup, lab: 'Récup', sub: 'Après sport', on: 'recovery' },
    { ic: 'wave', tint: MODULE_TINTS.mobilite, lab: 'Mobilité & étirements', sub: '16 routines', on: 'mobcatalog' },
    { ic: 'dumbbell', tint: MODULE_TINTS.renfo, lab: 'Renforcement', sub: '16 séances', on: 'renfocatalog' },
  ]
  const rows = [
    { ic: 'calendar', tint: '#7d9471', lab: 'Calendrier', sub: "Organise ta semaine d'entraînement", on: 'planner' },
    { ic: 'target', tint: '#5b6fa5', lab: 'Tests physiques', sub: null, on: 'tests' },
    { ic: 'spark', tint: '#534ab7', lab: 'Coach', sub: 'Recommandations', on: 'coach' },
    { ic: 'wave', tint: MODULE_TINTS.hydratation, lab: 'Conditions', sub: 'Météo · adaptation de la charge', on: 'weather' },
    { ic: 'target', tint: '#7d9471', lab: 'Mes routines', sub: 'Mobilité et pliométrie, à ta main', on: 'routines' },
    { ic: 'target', tint: '#a3526b', lab: 'Pic de forme', sub: db.peakGoals && db.peakGoals.length ? `${db.peakGoals.length} objectif${db.peakGoals.length > 1 ? 's' : ''} programmé${db.peakGoals.length > 1 ? 's' : ''}` : 'Programme tes échéances', on: 'peak' },
  ]

  const el = React.createElement
  // Hub "S'entraîner" : grand titre et cartes surélevées, comme les autres
  // onglets. Les six modules principaux sont en grille, les parcours plus
  // longs (calendrier, coach, pic de forme) en lignes pleine largeur.
  return el('div', { style: {
    ...(embedded
      ? { position: 'fixed', inset: 0, zIndex: 55, animation: 'spaceIn .22s ease' }
      : { flex: 1, minHeight: 0, width: '100%' }),
    backgroundColor: C.bg, backgroundImage: GRADIENTS.entrainer, backgroundAttachment: 'local', backgroundRepeat: 'no-repeat',
    display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font,
  } },
    el('div', { style: { flex: 1, overflowY: 'auto', padding: '14px 18px 32px' } },
      el('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 38, height: 38, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadowSm, marginBottom: 12 } },
        el(Icon, { name: 'back', size: 19 })),
      el('h1', { style: { fontFamily: C.font, fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1, margin: 0 } }, "S'entraîner"),
      el('p', { style: { fontSize: 13.5, color: C.ink2, margin: '6px 0 18px' } }, 'Séances, planning et suivi de charge'),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
        tiles.map((t, i) => el('button', { key: i, onClick: () => setTile(t.on),
          style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: 16, borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}`, boxShadow: C.shadowSm, cursor: 'pointer' } },
          el('div', { style: { width: 42, height: 42, borderRadius: 13, background: `color-mix(in srgb, ${t.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 } },
            el(Icon, { name: t.ic, size: 21, color: t.tint })),
          el('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14.5 } }, t.lab),
          el('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2 } }, t.sub)))),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        rows.map((r, i) => el('button', { key: i, onClick: () => setTile(r.on),
          style: { display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}`, boxShadow: C.shadowSm, cursor: 'pointer' } },
          el('div', { style: { width: 42, height: 42, borderRadius: 13, background: `color-mix(in srgb, ${r.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' } },
            el(Icon, { name: r.ic, size: 20, color: r.tint })),
          el('div', { style: { flex: 1, minWidth: 0 } },
            el('div', { style: { fontWeight: 700, fontSize: 15 } }, r.lab),
            r.sub && el('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 2 } }, r.sub)),
          el(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } }))))))
}
