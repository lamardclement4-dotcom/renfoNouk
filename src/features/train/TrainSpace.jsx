import React, { useState } from 'react'
import { C, Icon, MODULE_TINTS } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { getSession } from './trainData'
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
  const ENTRAINER_ACTIONS = new Set(['mobility', 'program', 'planner', 'recovery', 'peak', 'tests'])
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
    const s = getSession(playId, db.program)
    store.completeSession(s ? s.mins : 8)
    if (playId && db.program && db.program.sessions && db.program.sessions.some((x) => x.id === playId)) {
      store.markProgramDone(playId)
    }
    if (playId && String(playId).startsWith('rec-')) store.logRecovery(playId)
    setPlayId(null)
    setOpenId(null)
    setTile(null)
  }

  if (playId) {
    return React.createElement(Player, { id: playId, program: db.program, onClose: () => setPlayId(null), onFinish: finishSession })
  }
  if (openId) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 58, overflowY: 'auto' } },
      React.createElement(Detail, { id: openId, program: db.program, sensitiveZones: db.sensitiveZones, onBack: () => setOpenId(null), onStart: () => setPlayId(openId) }))
  }
  if (tile === 'mobility') return React.createElement(MobilityTest, { db, store, onClose: () => setTile(null), onProgram: () => setTile('program') })
  if (tile === 'program') return React.createElement(ProgramView, { db, store, onClose: () => setTile(null), onOpenSession: setOpenId, onMobility: () => setTile('mobility') })
  if (tile === 'renfocatalog') return React.createElement(RenfoCatalog, { onClose: () => setTile(null), onOpenSession: setOpenId })
  if (tile === 'mobcatalog') return React.createElement(MobilityCatalog, { onClose: () => setTile(null), onOpenSession: setOpenId })
  if (tile === 'recovery') return React.createElement(RecoverySpace, { onClose: () => setTile(null), onOpenSession: setOpenId })
  if (tile === 'plyo') return React.createElement(PliometrieSpace, { onClose: () => setTile(null), onOpenSession: setOpenId })
  if (tile === 'coach') return React.createElement(CoachSpace, { db, onClose: () => setTile(null), onAction: handleCoachAction })
  if (tile === 'peak') return React.createElement(PeakSpace, { db, store, onClose: () => setTile(null), onMobility: () => setTile('mobility'), onProgram: () => setTile('program'), onRecovery: () => setTile('recovery'), onTests: () => setTile('tests'), onNutrition: () => setHealthTile('nutrition'), onCycle: () => setHealthTile('cycle') })
  if (tile === 'tests') return React.createElement(PhysicalTestsSpace, { userId, onClose: () => setTile(null) })
  if (tile === 'planner') return React.createElement(PlannerSpace, { db, store, onClose: () => setTile(null) })

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
    { ic: 'target', tint: '#a3526b', lab: 'Pic de forme', sub: db.peakGoals && db.peakGoals.length ? `${db.peakGoals.length} objectif${db.peakGoals.length > 1 ? 's' : ''} programmé${db.peakGoals.length > 1 ? 's' : ''}` : 'Programme tes échéances', on: 'peak' },
  ]

  return React.createElement('div', { style: embedded
    ? { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, animation: 'spaceIn .22s ease' }
    : { flex: 1, minHeight: 0, background: C.bg, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', width: '100%', fontFamily: C.font } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 8px', flexShrink: 0 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'back', size: 20 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 20 } }, "S'entraîner")),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '10px 18px 32px' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
        tiles.map((t, i) => React.createElement('button', { key: i, onClick: () => setTile(t.on),
          style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
          React.createElement('div', { style: { width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${t.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 } },
            React.createElement(Icon, { name: t.ic, size: 20, color: t.tint })),
          React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 14.5 } }, t.lab),
          React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 1 } }, t.sub)))),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        rows.map((r, i) => React.createElement('button', { key: i, onClick: () => setTile(r.on),
          style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
          React.createElement('div', { style: { width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${r.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' } },
            React.createElement(Icon, { name: r.ic, size: 19, color: r.tint })),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 15 } }, r.lab),
            r.sub && React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 1 } }, r.sub)),
          React.createElement(Icon, { name: 'arrow', size: 18, color: C.ink3 }))))))
}
