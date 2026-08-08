import React, { useState } from 'react'
import { C, Icon, FlowSpace, Card, BigStat, Bar, SegPills, isoToday } from '../health/kit'

const h = React.createElement

// ============================================================
// Suivi du poids : historique des pesées, objectif, et courbe du réel
// comparée à la trajectoire idéale (droite entre la première pesée et
// l'objectif). Les pesées vivent dans db.weightLog — une entrée par jour,
// la plus récente écrase celle du même jour.
// ============================================================

const RANGES = [
  { id: 30, label: '1 mois' },
  { id: 90, label: '3 mois' },
  { id: 365, label: '1 an' },
  { id: 0, label: 'Tout' },
]

function fmtShort(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Entrées triées par date croissante, dédoublonnées par jour (la dernière
// pesée d'un jour fait foi) et bornées à la fenêtre demandée.
export function weightSeries(log, days) {
  const byDay = {}
  for (const e of log || []) {
    if (!e || !e.date || !(Number(e.kg) > 0)) continue
    byDay[e.date] = Number(e.kg)
  }
  let out = Object.keys(byDay).sort().map((date) => ({ date, kg: byDay[date] }))
  if (days > 0 && out.length) {
    const limit = new Date(); limit.setDate(limit.getDate() - days)
    const iso = limit.getFullYear() + '-' + String(limit.getMonth() + 1).padStart(2, '0') + '-' + String(limit.getDate()).padStart(2, '0')
    out = out.filter((e) => e.date >= iso)
  }
  return out
}

// Part du chemin parcourue entre le point de départ et l'objectif. Renvoie
// null quand il n'y a pas d'objectif ou que départ et objectif se
// confondent (sinon la division donnerait l'infini).
export function goalProgress(series, goal) {
  if (!series.length || !(goal > 0)) return null
  const start = series[0].kg
  const now = series[series.length - 1].kg
  if (Math.abs(goal - start) < 0.05) return now === goal ? 100 : null
  const pct = (start - now) / (start - goal) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function Chart({ series, goal }) {
  const W = 300, H = 150, padL = 30, padB = 22, padT = 10, padR = 8
  if (series.length < 2) {
    return h('div', { style: { padding: '28px 0', textAlign: 'center', color: C.ink3, fontSize: 13 } },
      series.length === 1 ? 'Ajoute une deuxième pesée pour voir la courbe.' : 'Aucune pesée sur cette période.')
  }
  const kgs = series.map((e) => e.kg)
  if (goal > 0) kgs.push(goal)
  let lo = Math.min(...kgs), hi = Math.max(...kgs)
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5 }
  const pad = (hi - lo) * 0.12
  lo -= pad; hi += pad
  const x = (i) => padL + (i / (series.length - 1)) * (W - padL - padR)
  const y = (kg) => padT + (1 - (kg - lo) / (hi - lo)) * (H - padT - padB)

  const pts = series.map((e, i) => [x(i), y(e.kg)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${(H - padB).toFixed(1)} L${pts[0][0].toFixed(1)} ${(H - padB).toFixed(1)} Z`
  const gid = 'wg' + Math.round(lo * 100)

  // Trajectoire idéale : droite du premier point vers l'objectif, tracée
  // en pointillés pour se distinguer du réel.
  const ideal = goal > 0
    ? `M${x(0).toFixed(1)} ${y(series[0].kg).toFixed(1)} L${x(series.length - 1).toFixed(1)} ${y(goal).toFixed(1)}`
    : null

  const ticks = [hi - pad / 2, (hi + lo) / 2, lo + pad / 2]
  return h('svg', { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', height: 'auto', display: 'block', overflow: 'visible' } },
    h('defs', null,
      h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: '0', stopColor: C.primary, stopOpacity: 0.28 }),
        h('stop', { offset: '1', stopColor: C.primary, stopOpacity: 0 }))),
    ticks.map((t, i) => h('g', { key: i },
      h('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), strokeWidth: 1, strokeDasharray: '2 4', style: { stroke: C.line } }),
      h('text', { x: padL - 5, y: y(t) + 3, textAnchor: 'end', fontSize: 8, style: { fill: C.ink3 } }, t.toFixed(1)))),
    goal > 0 && goal >= lo && goal <= hi && h('line', { x1: padL, x2: W - padR, y1: y(goal), y2: y(goal), strokeWidth: 1.5, style: { stroke: C.success } }),
    ideal && h('path', { d: ideal, fill: 'none', strokeWidth: 1.5, strokeDasharray: '5 4', style: { stroke: C.ink3, opacity: 0.55 } }),
    h('path', { d: area, style: { fill: `url(#${gid})` } }),
    h('path', { d: line, fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { stroke: C.primary } }),
    pts.map((p, i) => h('circle', { key: i, cx: p[0], cy: p[1], r: i === pts.length - 1 ? 4 : 2.5, strokeWidth: 2, style: { fill: C.surface, stroke: C.primary } })),
    h('text', { x: padL, y: H - 6, fontSize: 8, style: { fill: C.ink3 } }, fmtShort(series[0].date)),
    h('text', { x: W - padR, y: H - 6, textAnchor: 'end', fontSize: 8, style: { fill: C.ink3 } }, fmtShort(series[series.length - 1].date)))
}

export default function WeightSpace({ db, store, onClose }) {
  const [range, setRange] = useState(90)
  const [sheet, setSheet] = useState(null)
  const log = db.weightLog || []
  const goal = Number(db.weightGoal) || 0
  const series = weightSeries(log, range)
  const all = weightSeries(log, 0)
  const last = all.length ? all[all.length - 1] : null
  const prev = all.length > 1 ? all[all.length - 2] : null
  const delta = last && prev ? Math.round((last.kg - prev.kg) * 10) / 10 : null
  const pct = goalProgress(all, goal)

  function saveWeight(kg) {
    const v = Math.round(Number(kg) * 10) / 10
    if (!(v > 0)) return
    const today = isoToday()
    const next = (db.weightLog || []).filter((e) => e && e.date !== today)
    next.push({ date: today, kg: v })
    next.sort((a, b) => a.date.localeCompare(b.date))
    store.set({ weightLog: next.slice(-500) })
  }

  return h(FlowSpace, { title: 'Suivi du poids', onClose, bg: 'profil' },
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
      h(Card, null,
        h(BigStat, { label: 'Mon poids', value: last ? last.kg.toFixed(1) : '—', unit: last ? 'kg' : '', size: 34 }),
        pct != null
          ? h(React.Fragment, null,
            h(Bar, { pct, color: C.success, style: { marginTop: 12 } }),
            h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6, fontWeight: 600 } }, pct, ' % · objectif ', goal.toFixed(1), ' kg'))
          : h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 12 } }, goal > 0 ? 'Ajoute une pesée' : 'Aucun objectif défini')),
      h(Card, { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
        h('div', { style: { fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 6 } }, 'Depuis la dernière'),
        delta == null
          ? h('div', { style: { fontSize: 13, color: C.ink3 } }, 'Pas encore de comparaison')
          : h('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
            h(Icon, { name: 'chart', size: 17, color: delta > 0 ? C.danger : delta < 0 ? C.success : C.ink3, style: delta > 0 ? { transform: 'scaleY(-1)' } : undefined }),
            h('span', { style: { fontFamily: C.font, fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: delta > 0 ? C.danger : delta < 0 ? C.success : C.ink } },
              (delta > 0 ? '+' : delta < 0 ? '−' : '') + Math.abs(delta).toFixed(1)),
            h('span', { style: { fontSize: 13, color: C.ink3, fontWeight: 700 } }, 'kg')),
        h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 8 } }, all.length, ' pesée', all.length > 1 ? 's' : '', ' enregistrée', all.length > 1 ? 's' : ''))),

    h(Card, { style: { marginBottom: 14 } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
        h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, 'Progression'),
        pct != null && h('span', { style: { fontSize: 12, fontWeight: 700, color: C.success, background: `color-mix(in srgb, ${C.success} 12%, ${C.surface})`, borderRadius: 999, padding: '4px 9px' } }, pct, ' % de l’objectif')),
      h(SegPills, { options: RANGES, value: range, onChange: setRange, style: { marginBottom: 14 } }),
      h(Chart, { series, goal }),
      goal > 0 && series.length >= 2 && h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, fontSize: 11.5, color: C.ink3 } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { width: 14, height: 2.5, borderRadius: 2, background: C.primary } }), 'Réel'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { width: 14, height: 0, borderTop: `2px dashed ${C.ink3}` } }), 'Trajectoire idéale'))),

    h('div', { style: { display: 'flex', gap: 10, marginBottom: 18 } },
      h('button', { onClick: () => setSheet('weigh'), style: { flex: 1, padding: 14, borderRadius: 999, background: C.primary, color: '#fff', fontWeight: 800, fontSize: 14.5, border: 'none', cursor: 'pointer', boxShadow: `0 12px 24px -14px ${C.primary}` } }, 'Me peser'),
      h('button', { onClick: () => setSheet('goal'), style: { flex: 1, padding: 14, borderRadius: 999, background: C.surface, color: C.ink2, fontWeight: 700, fontSize: 14.5, border: `1.5px solid ${C.line}`, cursor: 'pointer' } }, goal > 0 ? 'Objectif' : 'Définir un objectif')),

    all.length > 0 && h(Card, null,
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 10 } }, 'Historique'),
      all.slice().reverse().slice(0, 20).map((e, i, arr) => {
        const before = arr[i + 1]
        const d = before ? Math.round((e.kg - before.kg) * 10) / 10 : null
        return h('div', { key: e.date, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
          h('span', { style: { flex: 1, fontSize: 13.5, color: C.ink2 } }, fmtShort(e.date)),
          d != null && h('span', { style: { fontSize: 12, fontWeight: 700, color: d > 0 ? C.danger : d < 0 ? C.success : C.ink3 } },
            (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d).toFixed(1)),
          h('span', { style: { fontFamily: C.font, fontSize: 15, fontWeight: 800, minWidth: 58, textAlign: 'right' } }, e.kg.toFixed(1), h('span', { style: { fontSize: 11, color: C.ink3, fontWeight: 600, marginLeft: 2 } }, 'kg')))
      })),

    sheet && h(NumberSheet, {
      title: sheet === 'weigh' ? 'Ma pesée du jour' : 'Poids objectif',
      value: sheet === 'weigh' ? (last ? last.kg : 70) : (goal || (last ? last.kg : 70)),
      onSave: (v) => { if (sheet === 'weigh') saveWeight(v); else store.set({ weightGoal: Math.round(Number(v) * 10) / 10 }) },
      onClose: () => setSheet(null),
    }))
}

// Saisie d'un poids au dixième, en pas de 0,1 kg.
function NumberSheet({ title, value, onSave, onClose }) {
  const [v, setV] = useState(Number(value) || 70)
  const step = (n) => setV((x) => Math.max(20, Math.min(300, Math.round((x + n) * 10) / 10)))
  return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end' } },
    h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', background: C.surface, borderRadius: '24px 24px 0 0', padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box' } },
      h('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 18px' } }),
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center' } }, title),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, margin: '22px 0 24px' } },
        h('button', { onClick: () => step(-0.1), 'aria-label': 'Diminuer', style: { width: 46, height: 46, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 22, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '–'),
        h('div', { style: { textAlign: 'center', minWidth: 120 } },
          h('input', {
            type: 'number', inputMode: 'decimal', step: '0.1', value: v,
            onChange: (e) => setV(e.target.value === '' ? '' : Number(e.target.value)),
            style: { width: 118, textAlign: 'center', fontFamily: C.font, fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', color: C.primary, border: 'none', outline: 'none', background: 'transparent', padding: 0 },
          }),
          h('div', { style: { fontSize: 13, color: C.ink3, fontWeight: 600 } }, 'kg')),
        h('button', { onClick: () => step(0.1), 'aria-label': 'Augmenter', style: { width: 46, height: 46, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 22, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '+')),
      h('button', {
        disabled: !(Number(v) > 0),
        onClick: () => { onSave(v); onClose() },
        style: { width: '100%', padding: 15, borderRadius: 999, background: Number(v) > 0 ? C.primary : C.surface2, color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: Number(v) > 0 ? 'pointer' : 'default' },
      }, 'Enregistrer')))
}
