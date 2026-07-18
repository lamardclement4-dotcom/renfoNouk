import React, { useState } from 'react'
import { C, Icon, Ring } from '../health/kit'
import { ZONES, ZONE_ORDER } from './trainData'
import { generateProgram } from './generateProgram'

const MOB_Q = ZONE_ORDER.map((id) => {
  const z = ZONES[id] || { short: id, label: id, q: '', opts: [] }
  return { id, zone: z.short, label: z.label, q: z.q, opts: z.opts }
})

const optBtnStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 13, padding: 16, borderRadius: C.radiusSm,
  background: active ? `color-mix(in srgb, ${C.primary} 8%, ${C.surface})` : C.surface,
  border: '1.5px solid ' + (active ? C.primary : C.line), width: '100%', cursor: 'pointer',
})

function isoToday() {
  const d = new Date()
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export default function MobilityTest({ store, onClose, onProgram }) {
  const [step, setStep] = useState(-1)
  const [ans, setAns] = useState([])
  const n = MOB_Q.length

  function pick(score) {
    const a = [...ans]
    a[step] = score
    setAns(a)
    setTimeout(() => setStep(step + 1), 180)
  }

  const total = ans.reduce((x, y) => x + (y || 0), 0)
  const pct = Math.round(total / (n * 3) * 100)
  const level = pct < 55 ? 'Raideur marquée' : pct < 80 ? 'Mobilité correcte' : 'Très souple'
  const zones = MOB_Q.map((q, i) => ({ id: q.id, zone: q.zone, label: q.label, val: ans[i] || 0 }))
  const weak = [...zones].sort((a, b) => a.val - b.val).slice(0, 3)

  function finish() {
    store.saveMobility({ score: pct, level, zones, date: isoToday() })
    onClose()
  }
  function buildProgram() {
    store.saveMobility({ score: pct, level, zones, date: isoToday() })
    store.saveProgram(generateProgram(zones, pct))
    onProgram()
  }

  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 60, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, padding: '20px 22px calc(20px + env(safe-area-inset-bottom))' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'close', size: 20 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14 } }, 'Test de mobilité'),
      React.createElement('div', { style: { width: 40 } })),

    step === -1 && React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' } },
      React.createElement('div', { style: { width: 96, height: 96, borderRadius: 999, background: `color-mix(in srgb, ${C.primary} 14%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' } },
        React.createElement(Icon, { name: 'target', size: 44, color: C.primary })),
      React.createElement('h1', { style: { fontFamily: C.font, fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' } }, 'Évalue ta mobilité'),
      React.createElement('p', { style: { color: C.ink2, fontSize: 15, lineHeight: 1.55, marginTop: 12, maxWidth: 320, marginInline: 'auto' } },
        '9 mouvements à auto-évaluer, zone par zone. On en déduit ton profil complet et un ',
        React.createElement('strong', { style: { color: C.ink } }, 'programme personnalisé'), ' pour tes points faibles.'),
      React.createElement('button', { onClick: () => setStep(0), style: { marginTop: 30, maxWidth: 320, marginInline: 'auto', width: '100%', padding: 16, borderRadius: 999, background: C.primary, color: '#fff', fontSize: 15.5, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: `0 12px 26px -14px ${C.primary}` } }, 'Commencer le test')),

    step >= 0 && step < n && React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { display: 'flex', gap: 5, margin: '14px 0 30px' } },
        MOB_Q.map((_, k) => React.createElement('div', { key: k, style: { flex: 1, height: 4, borderRadius: 999, background: k <= step ? C.primary : C.surface2 } }))),
      React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, MOB_Q[step].zone, ' · ', step + 1, '/', n),
      React.createElement('h2', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 700, lineHeight: 1.2, marginBottom: 24 } }, MOB_Q[step].q),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 11 } },
        MOB_Q[step].opts.map((o, i) => React.createElement('button', { key: i, onClick: () => pick(i + 1), style: optBtnStyle(ans[step] === i + 1) },
          React.createElement('span', { style: { width: 26, height: 26, borderRadius: 999, border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.ink3, flex: '0 0 auto' } }, ['A', 'B', 'C'][i]),
          React.createElement('span', { style: { fontWeight: 600, fontSize: 15, textAlign: 'left' } }, o)))),
      step > 0 && React.createElement('button', { onClick: () => setStep(step - 1), style: { marginTop: 18, alignSelf: 'flex-start', color: C.ink3, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'back', size: 16 }), ' Précédent')),

    step >= n && React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' } },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8 } },
        React.createElement(Ring, { size: 150, stroke: 12, progress: pct / 100, color: C.primary },
          React.createElement('div', { style: { fontFamily: C.font, fontSize: 34, fontWeight: 700, lineHeight: 1, color: C.primary } }, pct),
          React.createElement('div', { style: { fontSize: 12, color: C.ink3, fontWeight: 600 } }, '/ 100')),
        React.createElement('h2', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 700, marginTop: 16 } }, level)),

      React.createElement('div', { style: { marginTop: 22, display: 'flex', flexDirection: 'column', gap: 11 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Détail par zone'),
        zones.map((z, i) => {
          const weakHit = weak.some((w) => w.id === z.id) && z.val < 3
          return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12 } },
            React.createElement('span', { style: { width: 116, fontSize: 13, fontWeight: 600, color: weakHit ? C.primary : C.ink2, flex: '0 0 auto' } }, z.label),
            React.createElement('div', { style: { flex: 1, display: 'flex', gap: 5 } },
              [1, 2, 3].map((sIdx) => React.createElement('div', { key: sIdx, style: { flex: 1, height: 8, borderRadius: 999, background: z.val >= sIdx ? (weakHit ? C.primary : C.ink) : C.surface2 } }))))
        })),

      React.createElement('div', { style: { marginTop: 24, padding: 18, borderRadius: C.radiusSm, background: C.primary, color: '#fff' } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Ton programme sur-mesure'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 18, lineHeight: 1.2 } }, '3 séances ciblées sur tes zones les plus raides'),
        React.createElement('div', { style: { fontSize: 13.5, opacity: 0.9, marginTop: 6 } }, weak.map((w) => w.label).join(' · ')),
        React.createElement('button', { onClick: buildProgram, style: { marginTop: 16, width: '100%', padding: 15, borderRadius: 999, background: '#fff', color: C.primary, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
          React.createElement(Icon, { name: 'route', size: 18, color: C.primary }), ' Créer mon programme')),

      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 18, paddingBottom: 10 } },
        React.createElement('button', { onClick: () => { setAns([]); setStep(-1) }, style: { flex: 1, padding: 16, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Refaire'),
        React.createElement('button', { onClick: finish, style: { flex: 1, padding: 16, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Enregistrer'))))
}
