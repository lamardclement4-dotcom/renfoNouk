import React, { useState, useEffect, useRef } from 'react'
import { C, Icon, Ring } from '../health/kit'
import { CATS, getSession, sessionExercises } from './trainData'
import { MuscleMap, muscleGroups } from './MuscleMap'

const SPORT_EMOJI = { mobilite: '🤸', renfo: '🏋️', fullbody: '💪', plyo: '⚡' }

function ExerciseDetailSheet({ ex, onClose }) {
  const d = ex.detail
  const Section = (icon, tint, title, text) => text && React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
      React.createElement('div', { style: { width: 26, height: 26, borderRadius: C.radiusXs, background: `color-mix(in srgb, ${tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
        React.createElement(Icon, { name: icon, size: 13, color: tint })),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em' } }, title)),
    React.createElement('p', { style: { fontSize: 14.5, color: C.ink2, lineHeight: 1.55, marginLeft: 34 } }, text))
  return React.createElement('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 75, display: 'flex', alignItems: 'flex-end' } },
    React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '22px 22px 32px', maxHeight: '80vh', overflowY: 'auto' } },
      React.createElement('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 18px' } }),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 19, fontWeight: 700, marginBottom: 4, textAlign: 'center' } }, ex.label),
      ex.muscles && React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, textAlign: 'center', marginBottom: 18, fontWeight: 600 } }, ex.muscles),
      d && Section('target', '#6f8fa6', 'Position de départ', d.pos),
      d && Section('bolt', '#bf6a40', 'Mouvement', d.move),
      d && Section('shield', '#c4503a', 'À éviter', d.avoid),
      ex.benefit && React.createElement('div', { style: { marginTop: 4, padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface2, fontSize: 13, color: C.ink2, lineHeight: 1.5, fontStyle: 'italic' } }, ex.benefit)))
}

export default function Player({ id, blocks: customBlocks, title: customTitle, program, onClose, onFinish, pulse = true }) {
  const s = customBlocks ? null : getSession(id, program)
  const blocks = useRef(customBlocks || sessionExercises(s)).current
  const playerTitle = customTitle || (s && s.title) || 'Séance'
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const estSecs = (b) => b.type === 'hold' ? b.secs : (b.reps ? b.reps * 3 + 6 : 30)
  const [left, setLeft] = useState(estSecs(blocks[0]))
  const [showDetail, setShowDetail] = useState(false)
  const [prep, setPrep] = useState(5)
  const ex = blocks[i]
  const isHold = ex.type === 'hold'
  const total = estSecs(ex)

  useEffect(() => { setLeft(estSecs(blocks[i])); setPlaying(true) }, [i])
  useEffect(() => {
    if (prep <= 0) return
    const t = setTimeout(() => setPrep((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [prep])
  useEffect(() => {
    if (prep > 0 || !playing) return
    if (left <= 0) { if (isHold) next(); return }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, playing, i, prep, isHold])

  function next() { if (i < blocks.length - 1) setI(i + 1); else onFinish() }
  function prev() { if (i > 0) setI(i - 1) }

  const cat = CATS[ex.cat] || { tint: C.primary }
  const prog = 1 - left / total

  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.ink, zIndex: 80, display: 'flex', flexDirection: 'column', padding: '18px 20px calc(18px + env(safe-area-inset-bottom))', maxWidth: 460, margin: '0 auto', fontFamily: C.font } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'close', size: 20, color: '#fff' })),
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 12.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 } }, playerTitle),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14, color: '#fff' } }, i + 1, ' / ', blocks.length)),
      React.createElement('div', { style: { width: 40 } })),

    prep > 0
      ? React.createElement(React.Fragment, null,
        React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 } },
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Prépare-toi'),
          React.createElement('div', { style: { width: 120, height: 120, borderRadius: '50%', border: `4px solid ${cat.tint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('span', { style: { fontFamily: C.font, fontSize: 48, fontWeight: 800, color: cat.tint } }, prep)),
          React.createElement('div', { style: { textAlign: 'center', maxWidth: 260 } },
            React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, color: '#fff' } }, ex.label),
            React.createElement('div', { style: { fontSize: 13.5, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.45 } }, ex.detail && ex.detail.pos ? ex.detail.pos : 'Installe-toi pour le premier exercice')),
          React.createElement('button', { onClick: () => setPrep(0), style: { fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,.55)', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer' } }, 'Passer')))
      : React.createElement(React.Fragment, null,
        React.createElement('div', { style: { display: 'flex', gap: 4, marginBottom: 22 } },
          blocks.map((_, k) => React.createElement('div', { key: k, style: { flex: 1, height: 4, borderRadius: 999, background: k < i ? C.primary : k === i ? `color-mix(in srgb, ${C.primary} 40%, transparent)` : 'rgba(255,255,255,.15)', overflow: 'hidden' } },
            k === i && React.createElement('div', { style: { height: '100%', width: `${prog * 100}%`, background: C.primary, transition: 'width 1s linear' } })))),

        React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, overflowY: 'auto' } },
          React.createElement(Ring, { size: 220, stroke: 12, progress: prog, pulse: pulse && playing, color: cat.tint, track: 'rgba(255,255,255,.12)' },
            React.createElement('div', { style: { width: 168, height: 168, borderRadius: 999, overflow: 'hidden', position: 'relative', background: `color-mix(in srgb, ${cat.tint} 22%, rgba(0,0,0,.55))`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              ex.isRest
                ? React.createElement(Icon, { name: 'clock', size: 54, color: 'rgba(255,255,255,.6)' })
                : React.createElement('span', { style: { fontSize: 54, lineHeight: 1 } }, SPORT_EMOJI[ex.cat] || '🏋️'))),

          React.createElement('div', { style: { textAlign: 'center', maxWidth: 330, color: '#fff' } },
            React.createElement('button', { onClick: () => setShowDetail(true), style: { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: ex.detail ? 'pointer' : 'default', color: '#fff' } },
              React.createElement('h2', { style: { fontFamily: C.font, fontSize: 23, fontWeight: 700, letterSpacing: '-.01em' } }, ex.label),
              ex.detail && React.createElement(Icon, { name: 'info', size: 17, color: 'rgba(255,255,255,.5)' })),
            React.createElement('p', { style: { color: 'rgba(255,255,255,.65)', fontSize: 14.5, lineHeight: 1.5, marginTop: 8 } }, ex.cue),
            ex.muscles && React.createElement('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,.45)', marginTop: 12, fontWeight: 700 } }, React.createElement('span', { style: { textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Muscles'), ' · ', ex.muscles),
            (() => {
              const mg = muscleGroups(ex)
              if (!mg.size) return null
              const zoneLabels = { ischios: 'Ischios', mollets: 'Mollets', adducteurs: 'Adducteurs', fessiers: 'Fessiers', quadriceps: 'Quadriceps', abdominaux: 'Abdominaux', lombaires: 'Lombaires', pectoraux: 'Pectoraux', dos: 'Dos', epaules: 'Épaules', trapezes: 'Trapèzes', biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras' }
              return React.createElement('div', { style: { marginTop: 18, padding: '14px 10px 12px', background: 'rgba(255,255,255,.06)', borderRadius: C.radiusSm } },
                React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6, textAlign: 'center' } }, 'Muscles sollicités'),
                React.createElement(MuscleMap, { groups: mg, accent: cat.tint, size: 240 }),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 } },
                  Array.from(mg).map((zk) => React.createElement('span', { key: zk, style: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: `color-mix(in srgb, ${cat.tint} 25%, transparent)`, color: '#fff' } }, zoneLabels[zk] || zk))))
            })()),

          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
              isHold
                ? React.createElement(React.Fragment, null,
                  React.createElement('span', { style: { fontSize: 46, fontWeight: 700, lineHeight: 1, color: C.primary } }, left),
                  React.createElement('span', { style: { fontSize: 14, color: 'rgba(255,255,255,.5)', fontWeight: 600 } }, 'sec'))
                : React.createElement(React.Fragment, null,
                  React.createElement('span', { style: { fontSize: 46, fontWeight: 700, lineHeight: 1, color: C.primary } }, ex.reps),
                  React.createElement('span', { style: { fontSize: 14, color: 'rgba(255,255,255,.5)', fontWeight: 600 } }, 'répétitions'))),
            !isHold && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
              React.createElement(Icon, { name: 'clock', size: 13, color: 'rgba(255,255,255,.4)' }),
              React.createElement('span', { style: { fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 600 } }, Math.floor(left / 60) > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`))),

          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 8 } },
            React.createElement('button', { onClick: prev, disabled: i === 0, 'aria-label': 'Précédent', style: { width: 48, height: 48, borderRadius: 999, background: 'rgba(255,255,255,.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: i === 0 ? 0.3 : 1, color: '#fff' } },
              React.createElement(Icon, { name: 'prev', size: 20, color: '#fff' })),
            React.createElement('button', { onClick: () => isHold ? setPlaying((p) => !p) : next(), 'aria-label': 'Lecture', style: { width: 64, height: 64, borderRadius: 999, background: C.primary, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
              React.createElement(Icon, { name: isHold ? (playing ? 'pause' : 'play') : 'check', size: 26, color: '#fff' })),
            React.createElement('button', { onClick: next, 'aria-label': 'Suivant', style: { width: 48, height: 48, borderRadius: 999, background: 'rgba(255,255,255,.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' } },
              React.createElement(Icon, { name: 'next', size: 20, color: '#fff' }))),
          !isHold && React.createElement('div', { style: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4, fontWeight: 600 } }, 'Termine tes reps, puis valide ✓'))),

    showDetail && ex.detail && React.createElement(ExerciseDetailSheet, { ex, onClose: () => setShowDetail(false) }))
}
