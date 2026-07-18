import React, { useState } from 'react'
import { C, Icon, FlowSpace } from '../health/kit'
import { SESSIONS, sessionDuration } from './trainData'

const ZONES = [
  { key: 'chevilles', label: 'Chevilles & pieds', ic: 'mountain', tint: '#6f8fa6', match: ['chevill', 'pied'] },
  { key: 'genoux', label: 'Genoux', ic: 'target', tint: '#6f8fa6', match: ['genou'] },
  { key: 'hanches', label: 'Hanches & bassin', ic: 'route', tint: '#bf6a40', match: ['hanche', 'bassin'] },
  { key: 'dos', label: 'Dos & colonne', ic: 'layers', tint: '#7d9471', match: ['dos', 'thorac', 'colonne', 'lombair'] },
  { key: 'epaules', label: 'Épaules & bras', ic: 'dumbbell', tint: '#8a6a4a', match: ['épaule', 'bras', 'main', 'poignet'] },
  { key: 'cou', label: 'Cou & nuque', ic: 'user', tint: '#5b6fa5', match: ['cou', 'nuque'] },
  { key: 'jambes', label: 'Jambes complètes', ic: 'bolt', tint: '#bf6a40', match: ['jambe', 'ischio', 'course'] },
  { key: 'global', label: 'Routines globales', ic: 'heart', tint: '#5b8a72', match: ['complet', 'flow', 'réveil', 'avant de courir', 'récup', 'soir', 'détente', 'global'] },
]

function zoneOf(s) {
  const hay = (s.title + ' ' + (s.focus || '')).toLowerCase()
  for (const z of ZONES) if (z.match.some((kw) => hay.indexOf(kw) >= 0)) return z
  return ZONES[ZONES.length - 1]
}

export default function MobilityCatalog({ onClose, onOpenSession }) {
  const [filter, setFilter] = useState('all')
  const all = SESSIONS.filter((s) => s.cat === 'mobilite')
  const filtered = all.filter((s) => filter === 'mob' ? !s.etir : filter === 'etir' ? !!s.etir : true)
  const byZone = {}
  filtered.forEach((s) => { const z = zoneOf(s).key; (byZone[z] = byZone[z] || []).push(s) })
  const nbMob = all.filter((s) => !s.etir).length
  const nbEtir = all.filter((s) => !!s.etir).length

  function FilterTab(id, label, count) {
    const active = filter === id
    return React.createElement('button', { key: id, onClick: () => setFilter(id), style: { flex: 1, padding: '9px 4px', borderRadius: C.radiusXs, border: 'none', background: active ? C.surface : 'transparent', color: active ? C.ink : C.ink3, fontWeight: active ? 700 : 600, fontSize: 13.5, cursor: 'pointer', boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none' } }, `${label} (${count})`)
  }

  return React.createElement(FlowSpace, { title: 'Mobilité & étirements', onClose },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: 'linear-gradient(135deg, #6f8fa6, #5b8a72)', color: '#fff', marginBottom: 16 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
        React.createElement(Icon, { name: 'wave', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 20, fontWeight: 700, lineHeight: 1.1 } }, 'Bouge mieux, sans douleur'),
      React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, all.length + ' routines groupées par zone du corps.')),

    React.createElement('div', { style: { display: 'flex', gap: 4, padding: 4, borderRadius: C.radiusSm, background: C.surface2, marginBottom: 20 } },
      FilterTab('all', 'Tout', all.length), FilterTab('mob', 'Mobilité', nbMob), FilterTab('etir', 'Étirements', nbEtir)),

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
            const isEtir = !!s.etir
            return React.createElement('button', { key: s.id, onClick: () => onOpenSession(s.id), style: { display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
              React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${z.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                React.createElement(Icon, { name: z.ic, size: 20, color: z.tint })),
              React.createElement('div', { style: { flex: 1, textAlign: 'left', minWidth: 0 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 15 } }, s.title),
                  isEtir && React.createElement('span', { style: { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'color-mix(in srgb, #5b8a72 14%, ' + C.surface + ')', color: '#5b8a72', textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Étir.')),
                React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 4 } }, mins, ' min · ', nbMvts, ' mvts · ', s.level)),
              React.createElement(Icon, { name: 'arrow', size: 16, color: C.ink3, style: { flexShrink: 0, marginTop: 4 } }))
          })))
    }),

    filtered.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', color: C.ink3 } },
      React.createElement(Icon, { name: 'search', size: 32, color: C.ink3, style: { marginBottom: 10 } }),
      React.createElement('div', { style: { fontSize: 14 } }, 'Aucune routine dans cette catégorie.')))
}
