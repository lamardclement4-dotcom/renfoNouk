import React from 'react'
import { C, Icon, FlowSpace } from '../health/kit'
import { RECOVERY, sessionDuration } from './trainData'

const RECOV_TIPS = [
  { ic: 'clock', t: 'Étire à chaud', d: 'Dans les 30 min après l’effort, quand les muscles sont encore souples.' },
  { ic: 'spark', t: 'Auto-massage au rouleau', d: 'Passe le rouleau sur les muscles tendus 30–60 s, sans appuyer sur les os ni le bas du dos.' },
  { ic: 'heart', t: 'Respire lent', d: 'Des expirations longues activent la récupération et font baisser le rythme cardiaque.' },
  { ic: 'moon', t: 'Dors assez', d: 'Le sommeil est la récupération n°1 : vise 7–9 h, surtout après les grosses séances.' },
  { ic: 'apple', t: 'Recharge après l’effort', d: 'Glucides + protéines dans les heures qui suivent pour refaire les réserves.' },
  { ic: 'shield', t: 'Compression / surélévation', d: 'Jambes en l’air ou bas de contention aident le retour veineux quand les jambes sont lourdes.' },
  { ic: 'flame', t: 'Froid / chaud', d: 'Douche fraîche sur les jambes après l’effort ; chaleur sur les tensions chroniques — selon ce qui te soulage.' },
  { ic: 'route', t: 'Récup active', d: 'Marche ou vélo très léger 10–20 min pour relancer la circulation sans fatiguer.' },
  { ic: 'spark', t: 'Hydrate-toi', d: 'Bois pour reconstituer les pertes et limiter les courbatures.' },
]

const CTX_ICON = { course: 'route', express: 'clock', rouleau: 'spark', jambes: 'leaf', sommeil: 'moon' }

export default function RecoverySpace({ onClose, onOpenSession }) {
  return React.createElement(FlowSpace, { title: 'Récupération', onClose },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: '#5b8a72', color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
        React.createElement(Icon, { name: 'leaf', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 20, fontWeight: 700, lineHeight: 1.1 } }, 'Récupère plus vite'),
      React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, 'Des routines guidées à faire juste après ta séance ou ta course pour relâcher les tensions et limiter les courbatures.')),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Choisis ta récup'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 } },
      RECOVERY.map((s) => {
        const mins = sessionDuration(s)
        return React.createElement('button', { key: s.id, onClick: () => onOpenSession(s.id), style: { display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
          React.createElement('div', { style: { width: 52, height: 52, borderRadius: 14, flex: '0 0 auto', background: 'color-mix(in srgb, #5b8a72 16%, ' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement(Icon, { name: CTX_ICON[s.ctx] || 'heart', size: 22, color: '#5b8a72' })),
          React.createElement('div', { style: { flex: 1, textAlign: 'left', minWidth: 0 } },
            React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 16 } }, s.title),
            React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 3, lineHeight: 1.4 } }, s.note),
            React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 6 } }, mins, ' min · ', s.keys.length, ' mvts')))
      })),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Pour mieux récupérer'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 } },
      RECOV_TIPS.map((tp, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 14px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { width: 36, height: 36, borderRadius: 10, flex: '0 0 auto', background: 'color-mix(in srgb, #5b8a72 14%, ' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement(Icon, { name: tp.ic, size: 18, color: '#5b8a72' })),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15 } }, tp.t),
          React.createElement('div', { style: { fontSize: 13, color: C.ink3, marginTop: 1, lineHeight: 1.45 } }, tp.d))))))
}
