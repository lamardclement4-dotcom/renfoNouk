import React from 'react'
import { C, Icon } from '../health/kit'
import { globalScore, recommendations } from '../train/renfoIntel'
import { computePeakPlan } from '../train/PeakSpace'

const h = React.createElement

// ============================================================
// Cartes partagées Accueil + Progrès : score santé (5 piliers +
// recommandations) et raccourci vers le plus proche objectif Pic de
// forme. Extraites de ProgressSpace pour être réutilisées telles
// quelles sur l'écran d'accueil.
// ============================================================
const PILLAR_IC = { hydration: 'drop', nutrition: 'apple', sleep: 'moon', load: 'chart', mobility: 'target', prevention: 'shield' }
const RECO_COLOR = { alert: '#c46a3a', warn: '#c4a03a', info: C.primary }

// Chaque tuile pilier redirige vers son module — l'id du pilier (renvoyé
// tel quel par globalScore/pillars) est passé à onAction, à charge de
// l'appelant (Accueil, Progrès) de le router vers sa propre navigation.
const PILLAR_ACTION = { hydration: 'hydration', nutrition: 'nutrition', sleep: 'sleep', load: 'load', mobility: 'mobility', prevention: 'prevention' }

export function HealthScoreCard({ db, onAction }) {
  const result = globalScore(db)
  const recos = recommendations(db)
  if (result.active === 0) return null

  const score = result.score
  const scoreColor = score >= 75 ? '#4a8a6a' : score >= 50 ? C.primary : '#c46a3a'
  const ORDER = { alert: 0, warn: 1, info: 2 }
  const topRecos = recos.slice().sort((a, b) => (ORDER[a.level] || 2) - (ORDER[b.level] || 2)).slice(0, 2)

  return h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radius, padding: '16px 16px 14px', marginBottom: 14 } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
      h('div', null,
        h('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 } }, 'Score santé sportive'),
        h('div', { style: { fontSize: 32, fontWeight: 900, fontFamily: C.font, color: scoreColor, lineHeight: 1 } }, score, h('span', { style: { fontSize: 16, fontWeight: 600, marginLeft: 2 } }, '/100'))),
      h('svg', { width: 52, height: 52, viewBox: '0 0 52 52' },
        h('circle', { cx: 26, cy: 26, r: 22, fill: 'none', stroke: C.surface2, strokeWidth: 5 }),
        h('circle', { cx: 26, cy: 26, r: 22, fill: 'none', stroke: scoreColor, strokeWidth: 5, strokeDasharray: `${Math.round(2 * Math.PI * 22 * score / 100)} ${Math.round(2 * Math.PI * 22)}`, strokeLinecap: 'round', transform: 'rotate(-90 26 26)', style: { transition: 'stroke-dasharray .5s ease' } }),
        h('text', { x: 26, y: 30, textAnchor: 'middle', fontSize: 13, fontWeight: 800, fill: scoreColor }, score))),

    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginBottom: topRecos.length ? 14 : 0 } },
      result.pillars.map((p) => {
        const active = p.score != null
        const col = active ? scoreColor : C.ink3
        const pct = active ? p.score : 0
        const isSleep = p.id === 'sleep'
        return h('button', {
          key: p.id,
          onClick: onAction ? () => onAction(PILLAR_ACTION[p.id] || p.id) : undefined,
          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: onAction ? 'pointer' : 'default' },
        },
          h('div', { style: { width: '100%', height: 36, borderRadius: 6, background: isSleep && !active ? `color-mix(in srgb, #4a6fa5 12%, ${C.surface2})` : C.surface2, position: 'relative', overflow: 'hidden', border: isSleep ? `1px solid color-mix(in srgb, #4a6fa5 30%, ${C.line})` : 'none' } },
            h('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, height: pct + '%', background: active ? `color-mix(in srgb, ${col} 80%, transparent)` : C.surface2, borderRadius: 6, transition: 'height .4s ease' } }),
            isSleep && !active && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#4a6fa5', fontWeight: 700 } }, '+')),
          h(Icon, { name: PILLAR_IC[p.id] || 'target', size: 13, color: isSleep && !active ? '#4a6fa5' : (active ? col : C.ink3) }),
          h('div', { style: { fontSize: 10, fontWeight: 700, color: isSleep && !active ? '#4a6fa5' : (active ? col : C.ink3) } }, active ? p.score : (isSleep ? 'Log' : '—')))
      })),

    topRecos.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      topRecos.map((r, i) => {
        const col = RECO_COLOR[r.level] || C.ink3
        const clickable = !!(r.action && onAction)
        return h(clickable ? 'button' : 'div', {
          key: i,
          onClick: clickable ? () => onAction(r.action) : undefined,
          style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 11px', borderRadius: C.radiusXs, background: `color-mix(in srgb, ${col} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${col} 25%, ${C.line})`, width: '100%', textAlign: 'left', cursor: clickable ? 'pointer' : 'default' },
        },
          h(Icon, { name: r.icon || 'target', size: 14, color: col, style: { flexShrink: 0, marginTop: 1 } }),
          h('span', { style: { fontSize: 12.5, color: C.ink, lineHeight: 1.4, flex: 1 } }, r.text),
          clickable && h(Icon, { name: 'arrow', size: 13, color: col, style: { flexShrink: 0, marginTop: 1 } }))
      })))
}

export function PeakHomeCard({ db, onPeak }) {
  const goals = db.peakGoals || []
  if (!goals.length) return null
  const upcoming = goals.map((g) => ({ g, plan: computePeakPlan(g) })).filter((x) => x.plan.phase !== 'past').sort((a, b) => a.g.eventDate.localeCompare(b.g.eventDate))
  if (!upcoming.length) return null
  const top = upcoming[0]
  const colors = { base: '#5b6fa5', build: '#bf6a40', taper: '#4a8a6a', today: '#a3526b' }
  const labels = { base: 'Développement général', build: 'Développement spécifique', taper: 'Affûtage', today: 'Jour J' }
  const tint = colors[top.plan.phase] || '#a3526b'
  const countdown = top.plan.daysRemaining === 0 ? 'Jour J' : top.plan.daysRemaining === 1 ? 'J-1' : 'J-' + top.plan.daysRemaining

  return h('button', {
    onClick: onPeak,
    style: { display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: C.radiusSm, marginBottom: 16, cursor: 'pointer', background: `color-mix(in srgb, ${tint} 10%, ${C.surface})`, border: `1.5px solid color-mix(in srgb, ${tint} 28%, ${C.line})` },
  },
    h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${tint} 16%, ${C.surface})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: tint } }, countdown)),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, top.g.label),
      h('div', { style: { fontSize: 12.5, color: tint, marginTop: 2, fontWeight: 600 } }, top.plan.phase === 'today' ? 'Jour J' : labels[top.plan.phase])),
    h(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } }))
}
