import React, { useState } from 'react'
import { C, Icon, FlowSpace, Ring } from '../health/kit'
import { CATS, SPORTS, ZONES, getSession } from './trainData'
import { RENFO_GOALS, RENFO_GOAL_ORDER } from './generateProgram'

const optRowStyle = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, background: C.surface, border: `1.5px solid ${C.line}`, marginBottom: 18, cursor: 'pointer' }

function Sheet({ title, sub, onClose, children }) {
  return React.createElement('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 70, display: 'flex', alignItems: 'flex-end' } },
    React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '18px 22px calc(24px + env(safe-area-inset-bottom))', maxHeight: '82vh', display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 16px' } }),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center', marginBottom: 4 } }, title),
      sub && React.createElement('p', { style: { fontSize: 12.5, color: C.ink3, textAlign: 'center', marginBottom: 14 } }, sub),
      React.createElement('div', { style: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 } }, children),
      React.createElement('button', { onClick: onClose, style: { marginTop: 14, width: '100%', padding: 16, borderRadius: 999, background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' } }, 'Terminé')))
}

function Card({ s, idx, tagText, done, onToggle, onOpen }) {
  const cat = CATS[s.cat] || { tint: C.primary }
  const isDone = !!done
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: C.radiusSm, background: C.surface, border: '1.5px solid ' + (isDone ? `color-mix(in srgb, ${C.primary} 35%, ${C.line})` : C.line) } },
    React.createElement('button', { onClick: onToggle, 'aria-label': isDone ? 'Fait, toucher pour annuler' : 'Marquer comme fait', style: { width: 48, height: 48, borderRadius: 14, flex: '0 0 auto', background: isDone ? C.primary : `color-mix(in srgb, ${cat.tint} 15%, ${C.surface})`, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
      isDone ? React.createElement(Icon, { name: 'check', size: 22, color: '#fff' }) : React.createElement('span', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 17, color: cat.tint } }, idx)),
    React.createElement('button', { onClick: onOpen, style: { flex: 1, minWidth: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer' } },
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        tagText && React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: cat.tint, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 } }, tagText),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, s.title),
        React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 2 } }, s.mins, ' min · ', (s.keys || []).length, ' mvts')),
      React.createElement(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } })))
}

export default function ProgramView({ db, store, onClose, onOpenSession, onMobility }) {
  const [sheet, setSheet] = useState(false)
  const [sheetGoal, setSheetGoal] = useState(false)
  const prog = db.program

  if (!prog) {
    return React.createElement(FlowSpace, { title: 'Mon programme', onClose },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '55vh' } },
        React.createElement('div', { style: { width: 88, height: 88, borderRadius: 999, background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' } },
          React.createElement(Icon, { name: 'route', size: 40, color: C.primary })),
        React.createElement('h1', { style: { fontFamily: C.font, fontSize: 23, fontWeight: 700, letterSpacing: '-.02em' } }, 'Pas encore de programme'),
        React.createElement('p', { style: { color: C.ink2, fontSize: 14.5, lineHeight: 1.5, marginTop: 12, maxWidth: 300, marginInline: 'auto' } }, 'Fais le test de mobilité : on génère des séances ciblées sur tes points faibles.'),
        React.createElement('button', { onClick: onMobility, style: { marginTop: 26, maxWidth: 300, marginInline: 'auto', width: '100%', padding: 15, borderRadius: 999, background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' } }, 'Faire le test')))
  }

  const renfoGoalId = (db.profilePhys && db.profilePhys.renfoGoal) || 'tonus'
  const renfoGoal = RENFO_GOALS[renfoGoalId]
  const setRenfoGoal = (id) => store.set((st) => ({ profilePhys: { ...(st.profilePhys || {}), renfoGoal: id } }))
  const renfoSessions = (renfoGoal.sessions || []).map((id) => getSession(id, prog)).filter(Boolean)
  const sports = (db.profilePhys && db.profilePhys.sports) || []
  const sportObjs = SPORTS.filter((sp) => sports.includes(sp.id))
  const sportSessions = [...new Set(sportObjs.flatMap((sp) => [...(sp.sessions || []), ...(sp.plyo || [])]))].map((id) => getSession(id, prog)).filter(Boolean)
  const done = prog.done || {}
  const allIds = [...prog.sessions.map((x) => x.id), ...sportSessions.map((x) => x.id)]
  const doneCount = allIds.filter((id) => done[id]).length
  const total = allIds.length || 1
  const pct = Math.round(doneCount / total * 100)
  const toggleDone = (id) => store.set((st) => st.program ? { program: { ...st.program, done: { ...(st.program.done || {}), [id]: !(st.program.done || {})[id] } } } : {})
  const toggleSport = (id) => store.set((st) => {
    const cur = (st.profilePhys && st.profilePhys.sports) || []
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    return { profilePhys: { ...(st.profilePhys || {}), sports: next } }
  })

  return React.createElement(FlowSpace, {
    title: 'Mon programme', onClose,
    action: React.createElement('button', { onClick: onMobility, 'aria-label': 'Refaire le test', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
      React.createElement(Icon, { name: 'target', size: 18 })),
  },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: C.primary, color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
        React.createElement(Ring, { size: 74, stroke: 8, progress: pct / 100, color: '#fff', track: 'rgba(255,255,255,.25)' },
          React.createElement('div', { style: { fontFamily: C.font, fontSize: 19, fontWeight: 700, color: '#fff' } }, pct, '%')),
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 18, lineHeight: 1.1 } }, 'Programme mobilité'),
          React.createElement('div', { style: { fontSize: 13, opacity: 0.9, marginTop: 4 } }, doneCount, '/', total, ' séances · score mobilité ', prog.score, '/100')))),

    React.createElement('p', { style: { color: C.ink2, fontSize: 14, lineHeight: 1.5, margin: '0 2px 16px' } }, 'Construit à partir de ton test. On commence par tes zones les plus raides — ',
      React.createElement('strong', { style: { color: C.ink } }, prog.weak.map((id) => (ZONES[id] ? ZONES[id].label : id).toLowerCase()).join(', ')), '.'),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '4px 2px 8px' } }, 'Mon sport'),
    React.createElement('button', { onClick: () => setSheet(true), style: optRowStyle },
      React.createElement(Icon, { name: 'bolt', size: 18, color: C.primary, style: { flex: '0 0 auto' } }),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sportObjs.length ? sportObjs.map((sp) => sp.label).join(', ') : 'Choisir mon sport'),
        React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 1 } }, sportObjs.length ? sportSessions.length + ' séances spécifiques ajoutées' : 'Ajoute des séances orientées performance')),
      React.createElement(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } })),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '4px 2px 8px' } }, 'Mon objectif renfo'),
    React.createElement('button', { onClick: () => setSheetGoal(true), style: optRowStyle },
      React.createElement(Icon, { name: renfoGoal.icon, size: 18, color: renfoGoal.tint, style: { flex: '0 0 auto' } }),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 15 } }, renfoGoal.label),
        React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 1 } }, renfoSessions.length + ' séances adaptées')),
      React.createElement(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } })),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '0 2px 8px' } }, 'Ciblé mobilité'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: sportSessions.length ? 18 : 8 } },
      prog.sessions.map((s, i) => React.createElement(Card, { key: s.id, s, idx: i + 1, tagText: s.tag, done: done[s.id], onToggle: () => toggleDone(s.id), onOpen: () => onOpenSession(s.id) }))),

    sportSessions.length > 0 && React.createElement(React.Fragment, null,
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '0 2px 8px' } }, 'Spécifique à ton sport'),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 } },
        sportSessions.map((s, j) => React.createElement(Card, { key: s.id, s, idx: prog.sessions.length + j + 1, tagText: (CATS[s.cat] && CATS[s.cat].label) || 'Performance', done: done[s.id], onToggle: () => toggleDone(s.id), onOpen: () => onOpenSession(s.id) })))),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '0 2px 8px' } }, 'Renforcement — ' + renfoGoal.label),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      renfoSessions.map((s, k) => React.createElement(Card, { key: s.id, s, idx: k + 1, tagText: renfoGoal.label, done: done[s.id], onToggle: () => toggleDone(s.id), onOpen: () => onOpenSession(s.id) }))),

    sheet && React.createElement(Sheet, { title: 'Mon sport', sub: 'Choisis une ou plusieurs disciplines', onClose: () => setSheet(false) },
      SPORTS.map((sp) => {
        const on = sports.includes(sp.id)
        return React.createElement('button', { key: sp.id, onClick: () => toggleSport(sp.id), style: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: C.radiusSm, textAlign: 'left', border: '1.5px solid ' + (on ? C.primary : C.line), background: on ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface, cursor: 'pointer' } },
          React.createElement(Icon, { name: sp.ic || 'bolt', size: 18, color: on ? C.primary : C.ink3, style: { flex: '0 0 auto' } }),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 14.5, color: on ? C.primary : C.ink } }, sp.label),
            React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sp.focus)),
          on && React.createElement(Icon, { name: 'check', size: 17, color: C.primary, style: { flex: '0 0 auto' } }))
      })),

    sheetGoal && React.createElement(Sheet, { title: 'Mon objectif renfo', sub: 'Choisis ce que tu veux travailler en priorité', onClose: () => setSheetGoal(false) },
      RENFO_GOAL_ORDER.map((gid) => {
        const g = RENFO_GOALS[gid]
        const on = renfoGoalId === gid
        return React.createElement('button', { key: gid, onClick: () => setRenfoGoal(gid), style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: C.radiusSm, textAlign: 'left', border: '1.5px solid ' + (on ? g.tint : C.line), background: on ? `color-mix(in srgb, ${g.tint} 10%, ${C.surface})` : C.surface, cursor: 'pointer' } },
          React.createElement(Icon, { name: g.icon, size: 18, color: on ? g.tint : C.ink3, style: { flex: '0 0 auto' } }),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5, color: on ? g.tint : C.ink } }, g.label),
            React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, lineHeight: 1.35, marginTop: 1 } }, g.desc)),
          on && React.createElement(Icon, { name: 'check', size: 17, color: g.tint, style: { flex: '0 0 auto' } }))
      })))
}
