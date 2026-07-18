import React from 'react'
import { C, Icon, FlowSpace } from '../health/kit'
import { recommendations } from './renfoIntel'

const GROUPS = [
  { level: 'alert', label: 'À traiter en priorité', color: '#c46a3a' },
  { level: 'warn', label: 'À surveiller', color: '#c4a03a' },
  { level: 'info', label: 'Conseils', color: C.primary },
]

export default function CoachSpace({ db, onClose }) {
  const recos = recommendations(db)

  return React.createElement(FlowSpace, { title: 'Coach', onClose },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: '#534ab7', color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
        React.createElement(Icon, { name: 'target', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 19, fontWeight: 700, lineHeight: 1.15 } }, 'Tes recommandations'),
      React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, 'Générées à partir de tes données réelles (charge, sommeil, nutrition, mobilité, tests). Pas une IA conversationnelle : des règles transparentes, basées sur des seuils documentés.')),

    recos.length === 0
      ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px', gap: 12 } },
        React.createElement('div', { style: { width: 56, height: 56, borderRadius: 999, background: 'color-mix(in srgb, #4a8a6a 16%, ' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement(Icon, { name: 'check', size: 26, color: '#4a8a6a' })),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, 'Rien à signaler'),
        React.createElement('p', { style: { fontSize: 13, color: C.ink3, maxWidth: 280, lineHeight: 1.4 } }, 'Aucune recommandation active selon tes données actuelles. Reviens après avoir renseigné plus d\'informations (sommeil, séances, tests) pour des conseils plus précis.'))
      : GROUPS.map((g) => {
        const items = recos.filter((r) => r.level === g.level)
        if (!items.length) return null
        return React.createElement('div', { key: g.level, style: { marginBottom: 18 } },
          React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, g.label),
          items.map((r, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: C.radiusSm, marginBottom: 8, background: `color-mix(in srgb, ${g.color} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${g.color} 25%, ${C.line})` } },
            React.createElement(Icon, { name: r.icon || 'target', size: 16, color: g.color, style: { flex: '0 0 auto', marginTop: 1 } }),
            React.createElement('span', { style: { fontSize: 13.5, color: C.ink, lineHeight: 1.45 } }, r.text))))
      }),

    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, marginTop: 8, background: 'color-mix(in srgb, #534ab7 9%, ' + C.surface + ')', border: '1px solid color-mix(in srgb, #534ab7 22%, ' + C.line + ')' } },
      React.createElement(Icon, { name: 'search', size: 16, color: '#534ab7', style: { flex: '0 0 auto', marginTop: 2 } }),
      React.createElement('p', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'Système de règles déterministe (pas un modèle de langage) : transparent et basé sur des seuils documentés.')))
}
