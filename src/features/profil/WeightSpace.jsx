import React, { useState } from 'react'
import { C, Icon, FlowSpace, Card, BigStat, Bar, SegPills, isoToday } from '../health/kit'
import { weightAnalysis, weightSeries, trendLine, dayDiff } from './weightIntel'

const h = React.createElement

// ============================================================
// Suivi du poids. Les pesées vivent dans db.weightLog ({date, kg}, une
// par jour). Enregistrer une pesée met aussi à jour profilePhys.poids :
// c'est cette valeur qui pilote le métabolisme de base, les cibles
// caloriques et protéiques et l'objectif d'hydratation (35 ml/kg), qui
// resteraient sinon calés sur un poids saisi une fois à l'inscription.
// ============================================================

const RANGES = [
  { id: 30, label: '1 mois' },
  { id: 90, label: '3 mois' },
  { id: 365, label: '1 an' },
  { id: 0, label: 'Tout' },
]

const VERDICT_COLOR = { ok: C.success, stable: C.ink2, warn: C.warn, alert: C.danger }

function fmtShort(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function fmtLong(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
const signed = (v, digits = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(digits)

// Courbe : pesées brutes en points discrets, tendance lissée en trait
// plein. C'est la tendance qui porte la lecture, le brut n'est là que
// pour montrer la dispersion réelle.
function Chart({ series, trend, goal }) {
  const W = 300, H = 160, padL = 32, padB = 22, padT = 12, padR = 10
  if (series.length < 2) {
    return h('div', { style: { padding: '30px 0', textAlign: 'center', color: C.ink3, fontSize: 13 } },
      series.length === 1 ? 'Ajoute une deuxième pesée pour voir la tendance.' : 'Aucune pesée sur cette période.')
  }
  const span = Math.max(1, dayDiff(series[0].date, series[series.length - 1].date))
  const kgs = series.map((e) => e.kg).concat(trend.map((e) => e.kg))
  if (goal > 0) kgs.push(goal)
  let lo = Math.min(...kgs), hi = Math.max(...kgs)
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5 }
  const pad = (hi - lo) * 0.14
  lo -= pad; hi += pad
  const x = (d) => padL + (dayDiff(series[0].date, d) / span) * (W - padL - padR)
  const y = (kg) => padT + (1 - (kg - lo) / (hi - lo)) * (H - padT - padB)

  const tPts = trend.map((e) => [x(e.date), y(e.kg)])
  const line = tPts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ` L${tPts[tPts.length - 1][0].toFixed(1)} ${(H - padB).toFixed(1)} L${tPts[0][0].toFixed(1)} ${(H - padB).toFixed(1)} Z`
  const gid = 'wgrad'
  const ticks = [hi - pad / 2, (hi + lo) / 2, lo + pad / 2]

  return h('svg', { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', height: 'auto', display: 'block', overflow: 'visible' } },
    h('defs', null,
      h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: '0', stopColor: C.primary, stopOpacity: 0.26 }),
        h('stop', { offset: '1', stopColor: C.primary, stopOpacity: 0 }))),
    ticks.map((t, i) => h('g', { key: i },
      h('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), strokeWidth: 1, strokeDasharray: '2 4', style: { stroke: C.line } }),
      h('text', { x: padL - 5, y: y(t) + 3, textAnchor: 'end', fontSize: 8, style: { fill: C.ink3 } }, t.toFixed(1)))),
    goal > 0 && goal >= lo && goal <= hi && h('g', null,
      h('line', { x1: padL, x2: W - padR, y1: y(goal), y2: y(goal), strokeWidth: 1.5, strokeDasharray: '6 3', style: { stroke: C.success } }),
      h('text', { x: W - padR, y: y(goal) - 4, textAnchor: 'end', fontSize: 8, fontWeight: 700, style: { fill: C.success } }, 'objectif')),
    h('path', { d: area, style: { fill: `url(#${gid})` } }),
    series.map((e, i) => h('circle', { key: i, cx: x(e.date), cy: y(e.kg), r: 2, style: { fill: C.ink3, opacity: 0.5 } })),
    h('path', { d: line, fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { stroke: C.primary } }),
    h('circle', { cx: tPts[tPts.length - 1][0], cy: tPts[tPts.length - 1][1], r: 4, strokeWidth: 2, style: { fill: C.surface, stroke: C.primary } }),
    h('text', { x: padL, y: H - 5, fontSize: 8, style: { fill: C.ink3 } }, fmtShort(series[0].date)),
    h('text', { x: W - padR, y: H - 5, textAnchor: 'end', fontSize: 8, style: { fill: C.ink3 } }, fmtShort(series[series.length - 1].date)))
}

export default function WeightSpace({ db, store, onClose }) {
  const [range, setRange] = useState(90)
  const [sheet, setSheet] = useState(null)
  const log = db.weightLog || []
  const goal = Number(db.weightGoal) || 0
  const heightCm = Number((db.profilePhys || {}).taille) || 0
  const a = weightAnalysis(log, { goal, heightCm })
  const windowed = weightSeries(log, range)
  const windowedTrend = trendLine(windowed)

  // La pesée fait autorité sur le poids du profil : sans cette
  // synchronisation, les cibles nutrition et hydratation resteraient
  // figées sur la valeur d'inscription.
  function saveWeight(kg, dateISO) {
    const v = Math.round(Number(kg) * 10) / 10
    if (!(v > 0)) return
    const date = dateISO || isoToday()
    const next = (db.weightLog || []).filter((e) => e && e.date !== date)
    next.push({ date, kg: v })
    next.sort((a, b) => a.date.localeCompare(b.date))
    const patch = { weightLog: next.slice(-1000) }
    if (date === next[next.length - 1].date) {
      patch.profilePhys = { ...(db.profilePhys || {}), poids: v }
    }
    store.set(patch)
  }

  function removeWeight(date) {
    const next = (db.weightLog || []).filter((e) => e && e.date !== date)
    const patch = { weightLog: next }
    const latest = next[next.length - 1]
    if (latest) patch.profilePhys = { ...(db.profilePhys || {}), poids: latest.kg }
    store.set(patch)
  }

  const hasData = a.count > 0
  const verdictCol = a.verdict ? (VERDICT_COLOR[a.verdict.level] || C.ink2) : C.ink2

  return h(FlowSpace, {
    title: 'Suivi du poids',
    subtitle: hasData ? null : 'Enregistre une première pesée pour lancer le suivi.',
    onClose,
    bg: 'profil',
  },
    // ─── Chiffres de tête ───────────────────────────────────────
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } },
      h(Card, null,
        h(BigStat, { label: 'Tendance', value: hasData ? a.smoothed.toFixed(1) : '—', unit: hasData ? 'kg' : '', size: 34 }),
        hasData && h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6 } }, 'Pesée : ', a.current.toFixed(1), ' kg'),
        a.progress != null && h(React.Fragment, null,
          h(Bar, { pct: a.progress, color: C.success, style: { marginTop: 10 } }),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6, fontWeight: 600 } }, a.progress, ' % · cible ', goal.toFixed(1), ' kg'))),
      h(Card, { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
        h('div', { style: { fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 6 } }, 'Rythme'),
        a.rate == null
          ? h('div', { style: { fontSize: 12.5, color: C.ink3, lineHeight: 1.4 } }, 'Deux pesées à des jours différents suffisent pour l’estimer.')
          : h(React.Fragment, null,
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
              h('span', { style: { fontFamily: C.font, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: verdictCol } }, signed(a.rate, 2)),
              h('span', { style: { fontSize: 12, color: C.ink3, fontWeight: 700 } }, 'kg/sem.')),
            a.verdict && h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.35 } }, a.verdict.text)))),

    // ─── Projection ─────────────────────────────────────────────
    hasData && goal > 0 && h(Card, { style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 } },
      h('div', { style: { width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h(Icon, { name: 'target', size: 20, color: C.primary })),
      h('div', { style: { flex: 1, minWidth: 0 } },
        a.projection
          ? h(React.Fragment, null,
            h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, a.projection.days === 0 ? 'Objectif atteint' : 'Objectif vers le ' + fmtLong(a.projection.date)),
            h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } }, a.projection.days === 0 ? 'Tu y es.' : `Dans environ ${a.projection.days} jours au rythme actuel.`))
          : h(React.Fragment, null,
            h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, 'Pas d’échéance estimable'),
            h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2, lineHeight: 1.35 } },
              a.rate == null ? 'Il faut plus de pesées.' : Math.abs(a.rate) < 0.05 ? 'Le poids est stable : à ce rythme l’objectif n’est pas atteint.' : 'Le rythme actuel éloigne de l’objectif.')))),

    // ─── Courbe ─────────────────────────────────────────────────
    h(Card, { style: { marginBottom: 12 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 12 } }, 'Évolution'),
      h(SegPills, { options: RANGES, value: range, onChange: setRange, style: { marginBottom: 14 } }),
      h(Chart, { series: windowed, trend: windowedTrend, goal }),
      windowed.length >= 2 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 11.5, color: C.ink3 } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { width: 14, height: 2.5, borderRadius: 2, background: C.primary } }), 'Tendance lissée'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { width: 6, height: 6, borderRadius: 999, background: C.ink3, opacity: 0.5 } }), 'Pesées'))),

    // ─── Repères ────────────────────────────────────────────────
    hasData && h(Card, { style: { marginBottom: 12 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 12 } }, 'Repères'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        [
          { lab: 'Depuis le début', val: signed(a.totalDelta) + ' kg', col: a.totalDelta < 0 ? C.success : a.totalDelta > 0 ? C.danger : C.ink },
          { lab: 'Pesées', val: String(a.count), col: C.ink },
          { lab: 'Minimum', val: a.min.toFixed(1) + ' kg', col: C.ink },
          { lab: 'Maximum', val: a.max.toFixed(1) + ' kg', col: C.ink },
        ].map((s, i) => h('div', { key: i, style: { padding: '11px 12px', borderRadius: C.radiusSm, background: C.surface2 } },
          h('div', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 600 } }, s.lab),
          h('div', { style: { fontFamily: C.font, fontSize: 18, fontWeight: 800, marginTop: 3, color: s.col } }, s.val)))),
      a.bmi
        ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '11px 12px', borderRadius: C.radiusSm, background: C.surface2 } },
          h('div', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 600, flex: 1 } }, 'IMC'),
          h('span', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800 } }, a.bmi.value),
          h('span', { style: { fontSize: 12, color: C.ink2, fontWeight: 600 } }, a.bmi.label))
        : h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 10 } }, 'Renseigne ta taille dans le profil pour afficher l’IMC.')),

    // ─── Actions ────────────────────────────────────────────────
    h('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } },
      h('button', { onClick: () => setSheet({ kind: 'weigh' }), style: { flex: 1, padding: 14, borderRadius: 999, background: C.primary, color: '#fff', fontWeight: 800, fontSize: 14.5, border: 'none', cursor: 'pointer', boxShadow: `0 12px 24px -14px ${C.primary}` } }, 'Me peser'),
      h('button', { onClick: () => setSheet({ kind: 'goal' }), style: { flex: 1, padding: 14, borderRadius: 999, background: C.surface, color: C.ink2, fontWeight: 700, fontSize: 14.5, border: `1.5px solid ${C.line}`, cursor: 'pointer' } }, goal > 0 ? 'Modifier l’objectif' : 'Définir un objectif')),

    // ─── Historique ─────────────────────────────────────────────
    hasData && h(Card, null,
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 4 } }, 'Historique'),
      h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 8 } }, 'Touche une ligne pour corriger ou supprimer.'),
      a.series.slice().reverse().slice(0, 40).map((e, i, arr) => {
        const before = arr[i + 1]
        const d = before ? Math.round((e.kg - before.kg) * 10) / 10 : null
        return h('button', {
          key: e.date,
          onClick: () => setSheet({ kind: 'edit', date: e.date, kg: e.kg }),
          style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', width: '100%', background: 'none', border: 'none', borderTop: i ? `1px solid ${C.line}` : 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' },
        },
          h('span', { style: { flex: 1, fontSize: 13.5, color: C.ink2 } }, fmtShort(e.date)),
          d != null && h('span', { style: { fontSize: 12, fontWeight: 700, color: d < 0 ? C.success : d > 0 ? C.danger : C.ink3 } }, signed(d)),
          h('span', { style: { fontFamily: C.font, fontSize: 15, fontWeight: 800, minWidth: 58, textAlign: 'right' } }, e.kg.toFixed(1),
            h('span', { style: { fontSize: 11, color: C.ink3, fontWeight: 600, marginLeft: 2 } }, 'kg')))
      })),

    sheet && h(WeightSheet, {
      sheet,
      fallback: a.count ? a.current : 70,
      goal,
      onSave: (v) => { if (sheet.kind === 'goal') store.set({ weightGoal: Math.round(Number(v) * 10) / 10 }); else saveWeight(v, sheet.date) },
      onDelete: sheet.kind === 'edit' ? () => removeWeight(sheet.date) : null,
      onClose: () => setSheet(null),
    }))
}

function WeightSheet({ sheet, fallback, goal, onSave, onDelete, onClose }) {
  const initial = sheet.kind === 'goal' ? (goal || fallback) : (sheet.kg != null ? sheet.kg : fallback)
  const [v, setV] = useState(Number(initial) || 70)
  const step = (n) => setV((x) => Math.max(20, Math.min(300, Math.round(((Number(x) || 0) + n) * 10) / 10)))
  const title = sheet.kind === 'goal' ? 'Poids objectif' : sheet.kind === 'edit' ? 'Pesée du ' + fmtShort(sheet.date) : 'Ma pesée du jour'
  const ok = Number(v) > 0
  return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end' } },
    h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', background: C.surface, borderRadius: '24px 24px 0 0', padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box' } },
      h('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 18px' } }),
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center' } }, title),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '22px 0 24px' } },
        h('button', { onClick: () => step(-0.1), 'aria-label': 'Diminuer', style: { width: 46, height: 46, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 22, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '–'),
        h('div', { style: { textAlign: 'center' } },
          h('input', {
            type: 'number', inputMode: 'decimal', step: '0.1', value: v,
            onChange: (e) => setV(e.target.value === '' ? '' : Number(e.target.value)),
            style: { width: 130, textAlign: 'center', fontFamily: C.font, fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', color: C.primary, border: 'none', outline: 'none', background: 'transparent', padding: 0 },
          }),
          h('div', { style: { fontSize: 13, color: C.ink3, fontWeight: 600 } }, 'kg')),
        h('button', { onClick: () => step(0.1), 'aria-label': 'Augmenter', style: { width: 46, height: 46, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 22, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '+')),
      h('button', {
        disabled: !ok,
        onClick: () => { onSave(v); onClose() },
        style: { width: '100%', padding: 15, borderRadius: 999, background: ok ? C.primary : C.surface2, color: ok ? '#fff' : C.ink3, fontWeight: 800, fontSize: 15, border: 'none', cursor: ok ? 'pointer' : 'default' },
      }, 'Enregistrer'),
      onDelete && h('button', {
        onClick: () => { onDelete(); onClose() },
        style: { width: '100%', marginTop: 10, padding: 13, borderRadius: 999, background: 'transparent', border: `1.5px solid ${C.line}`, color: C.danger, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
      }, 'Supprimer cette pesée')))
}
