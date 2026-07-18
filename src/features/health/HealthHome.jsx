import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon } from './kit'
import NutritionSpace from '../nutrition/Nutrition'
import HydrationSpace from '../hydration/Hydration'
import SleepSpace from './Sleep'
import PreventionSpace from './Prevention'
import CycleSpace from './Cycle'
import BreathingSpace from './Breathing'
import ComplementsSpace from './Complements'
import { PHASES } from './cycleData'

// ============================================================
// Écran "Santé & bien-être" — porte de sortie de l'ancienne app
// vers ses 7 sous-espaces. Nutrition et Hydratation existaient déjà
// comme modules séparés ; les 5 autres sont ajoutés ici.
// ============================================================
export default function HealthHome({ userId, onClose, initialSpace, embedded }) {
  const { db, loading } = useNutritionStore(userId)
  const [space, setSpace] = useState(initialSpace || null)

  if (space === 'nutrition') return React.createElement(NutritionSpace, { userId, onClose: () => setSpace(null) })
  if (space === 'hydratation') return React.createElement(HydrationSpace, { userId, onClose: () => setSpace(null) })
  if (space === 'sommeil') return React.createElement(SleepSpace, { userId, onClose: () => setSpace(null) })
  if (space === 'prevention') return React.createElement(PreventionSpace, { userId, onClose: () => setSpace(null) })
  if (space === 'cycle') return React.createElement(CycleSpace, { userId, onClose: () => setSpace(null) })
  if (space === 'esprit') return React.createElement(BreathingSpace, { onClose: () => setSpace(null) })
  if (space === 'complements') return React.createElement(ComplementsSpace, { userId, onClose: () => setSpace(null) })

  if (loading) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const sleepToday = (db.sleepLog || {})[todayKey]
  const cyclePhaseLabel = db.cycle && db.cycle.enabled && db.cycle.startDate
    ? (() => {
        try {
          const len = db.cycle.cycleLen || 28, pl = db.cycle.periodLen || 5
          const start = new Date(db.cycle.startDate + 'T00:00:00')
          const t = new Date(); t.setHours(0, 0, 0, 0)
          const diff = Math.floor((t - start) / 864e5)
          const day = ((diff % len) + len) % len + 1
          const phase = day <= pl ? 'menstruation' : day <= Math.round(len * 0.46) ? 'folliculaire' : day <= Math.round(len * 0.57) ? 'ovulation' : 'luteale'
          return PHASES[phase].label
        } catch { return 'Femmes' }
      })()
    : 'Femmes'

  const tiles = [
    { ic: 'apple', tint: MODULE_TINTS.nutrition, lab: 'Nutrition', sub: 'Cal · macros', on: 'nutrition' },
    { ic: 'drop', tint: MODULE_TINTS.hydratation, lab: 'Hydratation', sub: 'Eau · compl.', on: 'hydratation' },
    { ic: 'moon', tint: MODULE_TINTS.sommeil, lab: 'Sommeil', sub: sleepToday ? `${sleepToday.hours} h cette nuit` : 'Log du jour', on: 'sommeil' },
    { ic: 'shield', tint: MODULE_TINTS.prevention, lab: 'Prévention', sub: 'Bilan de risque', on: 'prevention' },
    { ic: 'moon', tint: MODULE_TINTS.cycle, lab: 'Cycle', sub: cyclePhaseLabel, on: 'cycle' },
    { ic: 'wave', tint: MODULE_TINTS.esprit, lab: 'Esprit', sub: 'Respiration · mental', on: 'esprit' },
    { ic: 'spark', tint: MODULE_TINTS.complements, lab: 'Compléments', sub: 'Plan · rappels', on: 'complements' },
  ]

  return React.createElement('div', { style: embedded
    ? { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font }
    : { flex: 1, minHeight: 0, background: C.bg, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', width: '100%', fontFamily: C.font } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 8px', flexShrink: 0 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'back', size: 20 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 20 } }, 'Santé & bien-être')),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '10px 18px 32px' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        tiles.map((t, i) => React.createElement('button', { key: i, onClick: () => setSpace(t.on),
          style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
          React.createElement('div', { style: { width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${t.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 } },
            React.createElement(Icon, { name: t.ic, size: 20, color: t.tint })),
          React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 14.5 } }, t.lab),
          React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, t.sub))))))
}
