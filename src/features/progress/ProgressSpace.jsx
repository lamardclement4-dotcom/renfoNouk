import React from 'react'
import { C, Icon, Ring, FlowSpace } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// ============================================================
// "Progrès" — porté depuis l'ancien écran Progress (screens.jsx) :
// série en cours, répartition hebdo, totaux cumulés. Réutilise les
// champs db.week/streak/record/sessionsTotal/minutesTotal déjà
// alimentés par store.completeSession() (module Entraîner).
// ============================================================
export default function ProgressSpace({ userId, onClose }) {
  const { db, loading } = useNutritionStore(userId)

  if (loading) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  const streak = db.streak
  const totalMins = db.week.reduce((a, b) => a + b, 0)
  const maxM = Math.max(...db.week, 1)
  const doneCount = db.week.filter((m) => m > 0).length
  const weeklyGoal = db.goals.weeklySessions
  const goalPct = Math.min(100, Math.round((doneCount / weeklyGoal) * 100))
  const h = Math.floor(db.minutesTotal / 60)
  const m = db.minutesTotal % 60
  const hoursLabel = m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`

  return React.createElement(FlowSpace, { title: 'Tes progrès', onClose },
    React.createElement('div', { style: { position: 'relative', minHeight: 150, padding: 22, borderRadius: C.radius, background: C.primary, marginBottom: 18, boxShadow: `0 18px 40px -22px ${C.primary}` } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        React.createElement(Ring, { size: 92, stroke: 9, progress: Math.min(1, streak / 14), color: '#fff', track: 'rgba(255,255,255,.25)' },
          React.createElement(Icon, { name: 'flame', size: 30, color: '#fff' })),
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: C.font, fontSize: 40, fontWeight: 700, color: '#fff', lineHeight: 1 } }, streak),
          React.createElement('div', { style: { color: 'rgba(255,255,255,.88)', fontSize: 15, fontWeight: 600 } }, 'jours de suite 🔥'),
          React.createElement('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 2 } }, 'Record : ', db.record, ' jours')))),

    React.createElement('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: 20, marginBottom: 14 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 17 } }, 'Cette semaine'),
        React.createElement('div', { style: { fontSize: 13.5, color: C.ink3, fontWeight: 600 } }, doneCount, '/', weeklyGoal, ' séances · ', totalMins, ' min')),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 96 } },
        db.week.map((mins, k) => {
          const done = mins > 0
          return React.createElement('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 } },
            React.createElement('div', { style: { width: '100%', height: 70, display: 'flex', alignItems: 'flex-end' } },
              React.createElement('div', { style: { width: '100%', height: `${Math.max(mins / maxM * 100, 6)}%`, borderRadius: 7, background: done ? C.primary : C.surface2 } })),
            React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: done ? C.ink : C.ink3 } }, WEEK_DAYS[k]))
        }))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } },
      [
        { big: db.sessionsTotal, lab: 'séances au total' },
        { big: hoursLabel, lab: 'temps cumulé' },
        { big: goalPct + '%', lab: 'objectif hebdo' },
      ].map((s, i) => React.createElement('div', { key: i, style: { background: C.surface, borderRadius: C.radiusSm, padding: '16px 12px', border: `1px solid ${C.line}`, textAlign: 'center' } },
        React.createElement('div', { style: { fontFamily: C.font, fontSize: 24, fontWeight: 700, lineHeight: 1 } }, s.big),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5, fontWeight: 600 } }, s.lab)))))
}
