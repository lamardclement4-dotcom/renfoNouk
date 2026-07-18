import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SegTabs, isoToday } from './kit'

const SLEEP_COL = MODULE_TINTS.sommeil

function toMin(t) { const a = (t || '').split(':'); return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0) }
function fmtMin(m) { m = ((m % 1440) + 1440) % 1440; const p = (n) => (n < 10 ? '0' + n : '' + n); return p(Math.floor(m / 60)) + ':' + p(m % 60) }
function durFromTimes(bt, wk) { let diff = toMin(wk) - toMin(bt); if (diff <= 0) diff += 24 * 60; return diff / 60 }

// ── Onglet "Cette nuit" : assistant de saisie en 3 étapes ──
function NightTab({ db, store, onDone }) {
  const today = isoToday()
  const existing = (db.sleepLog || {})[today] || {}
  const [hours, setHours] = useState(existing.hours || 7.5)
  const [awakenings, setAwakenings] = useState(existing.awakenings || 0)
  const [quality, setQuality] = useState(existing.quality || 0)
  const [step, setStep] = useState(0)

  const hLabel = Math.floor(hours) + (hours % 1 ? ' h 30' : ' h')
  const STEPS = ['Durée', 'Réveils', 'Qualité']

  function saveNight() {
    const cur = db.sleepLog || {}
    const rt = db.sleepRoutine || null
    store.set({ sleepLog: { ...cur, [today]: { hours, quality: quality || null, awakenings: awakenings || 0, routineBed: rt && rt.enabled ? rt.bedtime : null, routineWake: rt && rt.enabled ? rt.wake : null, savedAt: Date.now() } } })
    onDone()
  }

  const progress = React.createElement('div', { style: { display: 'flex', gap: 6, marginBottom: 22 } },
    STEPS.map((lab, idx) => {
      const done = idx < step, cur = idx === step
      return React.createElement('div', { key: idx, style: { flex: 1, textAlign: 'center' } },
        React.createElement('div', { style: { height: 4, borderRadius: 999, background: (done || cur) ? SLEEP_COL : C.line, transition: 'all .2s ease' } }),
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, marginTop: 6, color: cur ? SLEEP_COL : C.ink3 } }, lab))
    }))

  const stepDuree = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 18 } }, 'Combien de temps as-tu dormi ?'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 8 } },
      React.createElement('button', { 'aria-label': 'Moins', onClick: () => setHours(Math.max(3, Math.round((hours - 0.5) * 2) / 2)), style: { width: 52, height: 52, borderRadius: 999, fontSize: 26, fontWeight: 800, border: `1.5px solid ${C.line}`, background: C.surface, color: SLEEP_COL, cursor: 'pointer', lineHeight: 1 } }, '−'),
      React.createElement('div', { style: { minWidth: 130 } }, React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 42, color: C.ink, lineHeight: 1 } }, hLabel)),
      React.createElement('button', { 'aria-label': 'Plus', onClick: () => setHours(Math.min(12, Math.round((hours + 0.5) * 2) / 2)), style: { width: 52, height: 52, borderRadius: 999, fontSize: 26, fontWeight: 800, border: `1.5px solid ${C.line}`, background: C.surface, color: SLEEP_COL, cursor: 'pointer', lineHeight: 1 } }, '+')))

  const stepReveils = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 18 } }, 'T’es-tu réveillé pendant la nuit ?'),
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      [[0, 'Aucun'], [1, '1 fois'], [2, '2 fois'], [3, '3 +']].map(([val, lab]) => {
        const active = awakenings === val
        return React.createElement('button', { key: val, onClick: () => setAwakenings(val), style: { flex: 1, padding: '14px 0', borderRadius: 14, fontWeight: 700, fontSize: 14, border: '1.5px solid ' + (active ? SLEEP_COL : C.line), background: active ? SLEEP_COL : C.surface, color: active ? '#fff' : C.ink2, cursor: 'pointer' } }, lab)
      })))

  const stepQualite = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 6 } }, 'Comment t’es-tu senti au réveil ?'),
    React.createElement('div', { style: { height: 18, marginBottom: 12 } }, quality > 0 && React.createElement('span', { style: { fontSize: 13, color: SLEEP_COL, fontWeight: 700 } }, ['', 'Mauvais', 'Passable', 'Correct', 'Bien', 'Excellent'][quality])),
    React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
      [1, 2, 3, 4, 5].map((n) => React.createElement('button', { key: n, onClick: () => setQuality(quality === n ? 0 : n), 'aria-label': 'Qualité ' + n, style: { width: 48, height: 48, borderRadius: 12, border: '2px solid ' + (quality >= n ? SLEEP_COL : C.line), background: quality >= n ? `color-mix(in srgb, ${SLEEP_COL} 20%, ${C.surface})` : C.surface, cursor: 'pointer', fontSize: 22 } }, quality >= n ? '★' : '☆'))),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 12 } }, 'Facultatif'))

  const panes = [stepDuree, stepReveils, stepQualite]
  const isLast = step === 2

  return React.createElement('div', null,
    progress,
    React.createElement('div', { style: { minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }, panes[step]),
    React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 26 } },
      step > 0 && React.createElement('button', { onClick: () => setStep(step - 1), style: { flex: '0 0 auto', padding: '14px 20px', borderRadius: 999, fontSize: 14, fontWeight: 700, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink2, cursor: 'pointer' } }, 'Retour'),
      React.createElement('button', { onClick: isLast ? saveNight : () => setStep(step + 1), style: { flex: 1, padding: 14, borderRadius: 999, fontSize: 15, fontWeight: 800, border: 'none', color: '#fff', background: SLEEP_COL, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${SLEEP_COL}` } }, isLast ? 'Enregistrer — ' + hLabel : 'Suivant')))
}

// ── Onglet "Routine" : coucher/réveil + calcul par cycles ──
function RoutineTab({ db, store }) {
  const routine0 = db.sleepRoutine || { bedtime: '23:00', wake: '07:00', enabled: false }
  const [bedtime, setBedtime] = useState(routine0.bedtime || '23:00')
  const [wake, setWake] = useState(routine0.wake || '07:00')
  const [enabled, setEnabled] = useState(!!routine0.enabled)

  const idealRounded = Math.round(durFromTimes(bedtime, wake) * 10) / 10
  const inIdealRange = idealRounded >= 7 && idealRounded <= 9
  const FALL = 15, CYCLE = 90
  const idealBeds = [6, 5].map((c) => fmtMin(toMin(wake) - (c * CYCLE + FALL)))
  const idealWakes = [5, 6].map((c) => fmtMin(toMin(bedtime) + FALL + c * CYCLE))
  const TARGETS = [7, 7.5, 8, 8.5, 9]

  function applyTarget(targetH) {
    const bm = toMin(bedtime)
    setWake(fmtMin((bm + Math.round(targetH * 60)) % 1440))
  }
  function saveRoutine() {
    store.set({ sleepRoutine: { bedtime, wake, enabled } })
  }

  const timeField = (label, value, setter) => React.createElement('div', { style: { flex: 1 } },
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, label),
    React.createElement('input', { type: 'time', value, onChange: (e) => setter(e.target.value), style: { width: '100%', padding: '11px 12px', borderRadius: 12, fontSize: 16, fontWeight: 700, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, boxSizing: 'border-box' } }))

  const idealCard = (title, sub, items, labels) => React.createElement('div', { style: { flex: 1, borderRadius: 14, padding: '13px 15px', background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, title),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 4 } }, sub),
    items.map((t, ix) => React.createElement('div', { key: ix, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: ix ? 6 : 2 } },
      React.createElement('span', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 18, color: SLEEP_COL } }, t),
      React.createElement('span', { style: { fontSize: 11, color: C.ink3 } }, labels[ix]))))

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 16 } }, timeField('Heure de coucher', bedtime, setBedtime), timeField('Heure de réveil', wake, setWake)),
    React.createElement('div', { style: { marginBottom: 18 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, 'Durée cible rapide'),
      React.createElement('div', { style: { display: 'flex', gap: 7 } },
        TARGETS.map((t) => {
          const lab = Number.isInteger(t) ? t + ' h' : Math.floor(t) + 'h30'
          const active = Math.abs(idealRounded - t) < 0.05
          return React.createElement('button', { key: t, onClick: () => applyTarget(t), style: { flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12.5, border: '1.5px solid ' + (active ? SLEEP_COL : C.line), background: active ? SLEEP_COL : C.surface, color: active ? '#fff' : C.ink2, cursor: 'pointer' } }, lab)
        }))),
    React.createElement('div', { style: { borderRadius: 14, padding: '16px 18px', marginBottom: 14, background: `color-mix(in srgb, ${SLEEP_COL} 12%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${SLEEP_COL} 30%, ${C.line})` } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 } }, 'Temps de sommeil idéal'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12 } },
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 30, color: SLEEP_COL, lineHeight: 1 } }, Math.floor(idealRounded) + ' h' + (Math.round((idealRounded % 1) * 60) ? ' ' + Math.round((idealRounded % 1) * 60) : '')),
        React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600 } }, '🌙 ' + bedtime + '  →  ☀️ ' + wake)),
      React.createElement('div', { style: { fontSize: 12.5, marginTop: 10, fontWeight: 600, color: inIdealRange ? '#2e7d52' : '#b3402e' } }, inIdealRange ? '✓ Dans la fenêtre recommandée (7–9 h, adulte).' : '⚠ Hors fenêtre recommandée pour un adulte (7–9 h).')),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 14 } },
      idealCard('🌙 Couchers idéaux', 'pour un réveil à ' + wake, idealBeds, ['9 h', '7 h 30']),
      idealCard('☀️ Réveils idéaux', 'pour un coucher à ' + bedtime, idealWakes, ['7 h 30', '9 h'])),
    React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 14, padding: '0 2px' } }, 'Basé sur des cycles de ~90 min (+15 min pour s’endormir) : se réveiller en fin de cycle est plus reposant.'),
    React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' } },
      React.createElement('input', { type: 'checkbox', checked: enabled, onChange: (e) => setEnabled(e.target.checked), style: { width: 18, height: 18, accentColor: SLEEP_COL, cursor: 'pointer' } }),
      React.createElement('span', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600 } }, 'Suivre cette routine')),
    React.createElement('button', { onClick: saveRoutine, style: { width: '100%', padding: 14, borderRadius: 999, fontSize: 15, fontWeight: 800, border: 'none', color: '#fff', background: SLEEP_COL, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${SLEEP_COL}` } }, 'Enregistrer la routine'))
}

// ── Onglet "Historique" : graphe 14 j + dette + efficacité ──
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
function fmtDay(iso) {
  const p = iso.split('-'); const dd = new Date(+p[0], +p[1] - 1, +p[2])
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  return days[dd.getDay()] + ' ' + (+p[2]) + ' ' + MONTHS[+p[1] - 1]
}
function HistoryTab({ db, store }) {
  const log = db.sleepLog || {}
  const dates = Object.keys(log).filter((d) => log[d] && log[d].hours).sort().reverse()
  const recent = dates.slice(0, 14)
  if (recent.length === 0) {
    return React.createElement('div', { style: { textAlign: 'center', padding: '40px 10px', color: C.ink3, fontSize: 14 } },
      React.createElement(Icon, { name: 'moon', size: 28, color: C.line, style: { marginBottom: 12 } }),
      React.createElement('div', null, 'Aucune nuit enregistrée pour le moment.'),
      React.createElement('div', { style: { fontSize: 12.5, marginTop: 6 } }, 'Tes nuits apparaîtront ici au fil des jours.'))
  }
  const avgH = recent.reduce((a, d) => a + (log[d].hours || 0), 0) / recent.length
  const qs = recent.filter((d) => log[d].quality)
  const avgQ = qs.length ? qs.reduce((a, d) => a + log[d].quality, 0) / qs.length : null
  const SLEEP_REF = 8
  const debtTotal = recent.reduce((a, d) => a + Math.max(0, SLEEP_REF - (log[d].hours || 0)), 0)
  const debtLabel = Math.floor(debtTotal) + ' h' + (Math.round((debtTotal % 1) * 60) ? ' ' + Math.round((debtTotal % 1) * 60) : '')
  const debtLevel = debtTotal < 3 ? 'faible' : debtTotal < 8 ? 'modérée' : 'élevée'
  const debtColor = debtTotal < 3 ? '#4a8a6a' : debtTotal < 8 ? '#c4a03a' : '#c4503a'
  const effList = recent.map((d) => Math.max(60, 100 - (log[d].awakenings || 0) * 12))
  const avgEff = Math.round(effList.reduce((a, b) => a + b, 0) / effList.length)

  const chartDates = recent.slice().reverse()
  const chartMax = Math.max(...chartDates.map((d) => log[d].hours || 0), 9)
  const barW = 16, barGap = 6, chartH = 70
  const chartW = chartDates.length * (barW + barGap) - barGap

  return React.createElement('div', null,
    React.createElement('div', { style: { borderRadius: 14, padding: '14px 16px', marginBottom: 14, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 } }, 'Durée par nuit (14 derniers jours)'),
      React.createElement('svg', { width: '100%', height: chartH + 18, viewBox: '0 0 ' + chartW + ' ' + (chartH + 18), preserveAspectRatio: 'xMidYMax meet' },
        chartDates.map((d, i) => {
          const hh = log[d].hours || 0
          const bh = Math.max(3, Math.round((hh / chartMax) * chartH))
          const inRange = hh >= 7 && hh <= 9
          return React.createElement('rect', { key: d, x: i * (barW + barGap), y: chartH - bh, width: barW, height: bh, rx: 3, fill: inRange ? SLEEP_COL : `color-mix(in srgb, ${SLEEP_COL} 40%, ${C.surface2})` })
        })),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6 } }, 'Zone foncée = dans la fenêtre recommandée (7–9 h)')),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 14 } },
      React.createElement('div', { style: { flex: 1, borderRadius: 14, padding: '14px 16px', background: `color-mix(in srgb, ${debtColor} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${debtColor} 28%, ${C.line})` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, 'Dette de sommeil'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 22, color: debtColor } }, debtLabel),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, 'Cumul · ' + debtLevel)),
      React.createElement('div', { style: { flex: 1, borderRadius: 14, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, 'Efficacité estimée'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 22, color: C.ink } }, avgEff + ' %'),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, 'Basée sur les réveils'))),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 18 } },
      React.createElement('div', { style: { flex: 1, borderRadius: 14, padding: '14px 16px', background: `color-mix(in srgb, ${SLEEP_COL} 12%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${SLEEP_COL} 30%, ${C.line})` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, 'Moyenne durée'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 24, color: SLEEP_COL } }, Math.floor(avgH) + ' h' + (Math.round((avgH % 1) * 60) ? ' ' + Math.round((avgH % 1) * 60) : ''))),
      React.createElement('div', { style: { flex: 1, borderRadius: 14, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, 'Qualité moy.'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 24, color: C.ink } }, avgQ != null ? Math.round(avgQ * 10) / 10 + ' / 5' : '—'))),
    React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, recent.length + ' dernière' + (recent.length > 1 ? 's' : '') + ' nuit' + (recent.length > 1 ? 's' : '')),
    React.createElement('div', { style: { maxHeight: 280, overflowY: 'auto' } },
      recent.map((d) => {
        const e = log[d]; const h = e.hours; const hLab = Math.floor(h) + (h % 1 ? 'h30' : 'h'); const aw = e.awakenings || 0
        return React.createElement('div', { key: d, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 2px', borderBottom: `1px solid ${C.line}` } },
          React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600, flex: 1 } }, fmtDay(d)),
          React.createElement('div', { style: { fontSize: 13, color: C.ink3, flex: '0 0 auto', marginRight: 14 } }, aw > 0 ? aw + '× réveil' + (aw > 1 ? 's' : '') : ''),
          e.quality ? React.createElement('div', { style: { fontSize: 12.5, color: SLEEP_COL, flex: '0 0 auto', marginRight: 14, fontWeight: 700 } }, '★' + e.quality) : React.createElement('div', { style: { flex: '0 0 auto', marginRight: 14 } }),
          React.createElement('div', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 16, color: C.ink, flex: '0 0 auto', minWidth: 48, textAlign: 'right' } }, hLab))
      })),
    React.createElement('button', { onClick: () => store.set({ sleepLog: {} }), style: { width: '100%', marginTop: 16, padding: 11, borderRadius: 999, fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.line}`, background: 'transparent', color: C.ink3, cursor: 'pointer' } }, 'Effacer l’historique'))
}

export default function SleepSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('night')
  if (loading) {
    return React.createElement(FlowSpace, { title: 'Sommeil', onClose, tint: SLEEP_COL }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }
  return React.createElement(FlowSpace, { title: 'Sommeil', onClose, tint: SLEEP_COL },
    React.createElement(SegTabs, { tint: SLEEP_COL, value: tab, onChange: setTab, tabs: [{ id: 'night', lab: 'Cette nuit' }, { id: 'routine', lab: 'Routine' }, { id: 'history', lab: 'Historique' }] }),
    tab === 'night' && React.createElement(NightTab, { db, store, onDone: () => setTab('history') }),
    tab === 'routine' && React.createElement(RoutineTab, { db, store }),
    tab === 'history' && React.createElement(HistoryTab, { db, store }))
}
