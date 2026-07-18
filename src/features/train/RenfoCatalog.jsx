import React, { useState } from 'react'
import { C, Icon, FlowSpace } from '../health/kit'
import { SESSIONS, sessionDuration } from './trainData'

const ZONES = [
  { key: 'bas', label: 'Bas du corps', ic: 'mountain', tint: '#bf6a40', match: ['jambes', 'fessiers', 'bas du corps', 'postérieure', 'hanches'] },
  { key: 'core', label: 'Core & tronc', ic: 'target', tint: '#7d9471', match: ['gainage', 'core', 'tronc', 'dos & tronc', 'anti-rotation', 'stabilité'] },
  { key: 'haut', label: 'Haut du corps', ic: 'dumbbell', tint: '#8a6a4a', match: ['haut du corps', 'pectoraux', 'tirage', 'bras', 'épaules'] },
  { key: 'full', label: 'Full body', ic: 'bolt', tint: '#bd923f', match: ['full body', 'circuit', 'médecine ball'] },
]

function zoneOf(s) {
  const hay = (s.title + ' ' + (s.focus || '')).toLowerCase()
  for (const z of ZONES) if (z.match.some((kw) => hay.indexOf(kw) >= 0)) return z
  return ZONES[ZONES.length - 1]
}

export default function RenfoCatalog({ onClose, onOpenSession }) {
  const [filter, setFilter] = useState('all')
  const all = SESSIONS.filter((s) => s.cat === 'renfo' || s.cat === 'fullbody')
  const filtered = all.filter((s) => filter === 'renfo' ? s.cat === 'renfo' : filter === 'full' ? s.cat === 'fullbody' : true)
  const byZone = {}
  filtered.forEach((s) => { const z = zoneOf(s).key; (byZone[z] = byZone[z] || []).push(s) })
  const nbRenfo = all.filter((s) => s.cat === 'renfo').length
  const nbFull = all.filter((s) => s.cat === 'fullbody').length

  function FilterTab(id, label, count) {
    const active = filter === id
    return React.createElement('button', { key: id, onClick: () => setFilter(id), style: { flex: 1, padding: '9px 4px', borderRadius: C.radiusXs, border: 'none', background: active ? C.surface : 'transparent', color: active ? C.ink : C.ink3, fontWeight: active ? 700 : 600, fontSize: 13.5, cursor: 'pointer', boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none' } }, `${label} (${count})`)
  }

  return React.createElement(FlowSpace, { title: 'Renforcement', onClose },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: 'linear-gradient(135deg, #bf6a40, #a85a36)', color: '#fff', marginBottom: 16 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
        React.createElement(Icon, { name: 'dumbbell', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 20, fontWeight: 700, lineHeight: 1.1 } }, 'Renforce-toi, sans matériel ou presque'),
      React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, all.length + ' séances groupées par zone du corps.')),

    React.createElement('div', { style: { display: 'flex', gap: 4, padding: 4, borderRadius: C.radiusSm, background: C.surface2, marginBottom: 20 } },
      FilterTab('all', 'Tout', all.length), FilterTab('renfo', 'Ciblé', nbRenfo), FilterTab('full', 'Full body', nbFull)),

    ZONES.map((z) => {
      const items = byZone[z.key]
      if (!items || !items.length) return null
      return React.createElement('div', { key: z.key, style: { marginBottom: 22 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
          React.createElement(Icon, { name: z.ic, size: 14, color: z.tint }),
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, z.label)),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          items.map((s) => {
            const mins = sessionDuration(s)
            const nbMvts = (s.keys || []).length
            return React.createElement('button', { key: s.id, onClick: () => onOpenSession(s.id), style: { display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
              React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${z.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                React.createElement(Icon, { name: z.ic, size: 20, color: z.tint })),
              React.createElement('div', { style: { flex: 1, textAlign: 'left', minWidth: 0 } },
                React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 15 } }, s.title),
                React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 4 } }, mins, ' min · ', nbMvts, ' mvts · ', s.level)),
              React.createElement(Icon, { name: 'arrow', size: 16, color: C.ink3, style: { flexShrink: 0, marginTop: 4 } }))
          })))
    }),

    filtered.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', color: C.ink3 } },
      React.createElement(Icon, { name: 'search', size: 32, color: C.ink3, style: { marginBottom: 10 } }),
      React.createElement('div', { style: { fontSize: 14 } }, 'Aucune séance dans cette catégorie.')))
}
