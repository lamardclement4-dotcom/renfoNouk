import React, { useState } from 'react'
import { C, Icon, FlowSpace, SegTabs } from '../health/kit'
import { SPORTS } from './trainData'
import { SPORT_FIELDS, EXERCISES_DB, TECH_PERCHE } from './plannerData'

const MUSCU_SPORTS = ['muscu', 'crossfit', 'callisthenie', 'gym', 'halterophilie']

const SPORT_EMOJI = {
  course: '🏃', demi: '🏃', fond: '🏃', trail: '⛰️', marche: '🥾',
  perche: '🤸', sprint: '⚡', saut: '🦘', lancers: '🥏',
  escalade: '🧗', muscu: '💪', crossfit: '🏋️', gym: '🤸',
  velo: '🚴', vtt: '🚵', ski: '⛷️', skate: '🛼',
  natation: '🏊', aviron: '🚣', surf: '🏄',
  raquette: '🎾', combat: '🥋', football: '⚽', basket: '🏀',
  rugby: '🏉', danse: '💃', yoga: '🧘', equitation: '🐎',
  fitness: '💪', triathlon: '🏆', patinage: '⛸️', escrime: '🤺',
  golf: '⛳', tir: '🎯', pingpong: '🏓', voile: '⛵',
  callisthenie: '🤸', halterophilie: '🏋️', trampoline: '🤸',
  frisbee: '🥏', orientation: '🧭', plongee: '🤿', petanque: '🎯',
}
const DEFAULT_SPORTS = ['muscu', 'course', 'yoga', 'natation', 'football', 'escalade']
const DUREES = ['15 min', '30 min', '45 min', '1 h', '1 h 30', '2 h', '2 h 30', '3 h', 'Personnalisée']
const RESSENTI = [{ val: 1, e: '😩', l: 'Très mauvais' }, { val: 2, e: '😕', l: 'Mauvais' }, { val: 3, e: '😐', l: 'Moyen' }, { val: 4, e: '🙂', l: 'Bon' }, { val: 5, e: '🤩', l: 'Excellent' }]
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_L = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MOIS_C = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const LOAD_BY_DUREE = { '15 min': 10, '30 min': 20, '45 min': 30, '1 h': 45, '1 h 30': 65, '2 h': 80, '2 h 30': 90, '3 h': 100 }

function isoDate(d) {
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function mondayOf(d) {
  const r = new Date(d), day = r.getDay()
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1))
  return r
}
function estimateLoad(s) { return LOAD_BY_DUREE[s.duree] || 45 }
function sportLabel(id) { const sp = SPORTS.find((s) => s.id === id); return sp ? sp.label : id }
function sportEmoji(id) { return SPORT_EMOJI[id] || '🏋️' }
function loadColor(load) { return load > 80 ? '#c46a5a' : load > 50 ? '#6f8fa6' : '#5b8a72' }

function SessionCard({ s, onOpen }) {
  const meta = [s.heure, s.duree].filter(Boolean).join(' · ')
  return React.createElement('button', { onClick: () => onOpen(s), style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer', marginBottom: 8 } },
    React.createElement('div', { style: { width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 } }, sportEmoji(s.sport)),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontWeight: 600, fontSize: 15 } }, sportLabel(s.sport)),
      React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 2 } }, meta),
      React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.statut === 'realise' ? 'color-mix(in srgb, #5b8a72 15%, ' + C.surface + ')' : 'color-mix(in srgb, #6f8fa6 15%, ' + C.surface + ')', color: s.statut === 'realise' ? '#5b8a72' : '#6f8fa6' } }, s.statut === 'realise' ? '✅ Réalisé' : '📅 Planifié'),
        s.exercises && s.exercises.length > 0 && React.createElement('span', { style: { fontSize: 11, color: C.ink3 } }, '💪 ' + s.exercises.length + ' ex.'),
        s.notes && React.createElement('span', { style: { fontSize: 11, color: C.ink3 } }, '📝'))),
    s.ressenti && React.createElement('div', { style: { fontSize: 20, flex: '0 0 auto' } }, RESSENTI[s.ressenti - 1].e))
}

function LoadBar({ load }) {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface2 } },
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, fontWeight: 600, flex: '0 0 auto' } }, 'Charge du jour'),
    React.createElement('div', { style: { flex: 1, height: 6, borderRadius: 999, background: C.line, overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: `${Math.min(load, 100)}%`, background: loadColor(load) } })),
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink2, flex: '0 0 auto' } }, load + '%'))
}

function DayView({ date, sessions, onOpen, onAdd }) {
  const ds = isoDate(date)
  const ss = sessions.filter((s) => s.date === ds).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
  if (!ss.length) {
    return React.createElement('div', { style: { textAlign: 'center', padding: '36px 10px' } },
      React.createElement('div', { style: { fontSize: 14, color: C.ink3, marginBottom: 14 } }, 'Aucune séance ce jour.'),
      React.createElement('button', { onClick: () => onAdd(ds), style: { padding: '10px 18px', borderRadius: 999, background: C.primary, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' } }, '+ Ajouter une séance'))
  }
  const load = ss.reduce((a, s) => a + estimateLoad(s), 0)
  return React.createElement('div', null,
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, fontWeight: 700, marginBottom: 10 } }, ss.length + ' séance' + (ss.length > 1 ? 's' : '')),
    ss.map((s) => React.createElement(SessionCard, { key: s.id, s, onOpen })),
    React.createElement(LoadBar, { load }),
    React.createElement('button', { onClick: () => onAdd(ds), style: { width: '100%', marginTop: 14, padding: 13, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' } }, '+ Ajouter une séance'))
}

function WeekView({ date, sessions, onOpen, onAdd }) {
  const mon = mondayOf(date)
  const today = isoDate(new Date())
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    const ds = isoDate(d)
    const ss = sessions.filter((s) => s.date === ds)
    days.push({ ds, d, ss, isToday: ds === today })
  }
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 } },
    days.map(({ ds, d, ss, isToday }, i) => {
      const load = ss.reduce((a, s) => a + estimateLoad(s), 0)
      return React.createElement('div', { key: ds, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 } },
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: isToday ? C.primary : C.ink3 } }, JOURS[i]),
        React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: isToday ? C.primary : C.ink, width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? `color-mix(in srgb, ${C.primary} 15%, ${C.surface})` : 'transparent' } }, d.getDate()),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, width: '100%', minHeight: 30 } },
          ss.length
            ? ss.map((s) => React.createElement('button', { key: s.id, onClick: () => onOpen(s), title: sportLabel(s.sport), style: { width: '100%', height: 26, borderRadius: 8, background: s.statut === 'planifie' ? 'transparent' : C.surface2, border: s.statut === 'planifie' ? `1.5px dashed ${C.line}` : 'none', fontSize: 14, cursor: 'pointer' } }, sportEmoji(s.sport)))
            : React.createElement('button', { onClick: () => onAdd(ds), style: { width: '100%', height: 26, borderRadius: 8, background: 'transparent', border: `1px dashed ${C.line}`, color: C.ink3, fontSize: 13, cursor: 'pointer' } }, '+')),
        load > 0 && React.createElement('div', { style: { width: '100%', height: 4, borderRadius: 999, background: C.line, overflow: 'hidden' } },
          React.createElement('div', { style: { height: '100%', width: `${Math.min(load, 100)}%`, background: loadColor(load) } })))
    }))
}

function MonthView({ date, sessions, onGoDay }) {
  const y = date.getFullYear(), m = date.getMonth() + 1
  const today = isoDate(new Date())
  const ss = sessions.filter((s) => { const [sy, sm] = s.date.split('-').map(Number); return sy === y && sm === m })
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 } },
      JOURS.map((j) => React.createElement('div', { key: j, style: { textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: C.ink3, padding: '4px 0' } }, j))),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 } },
      cells.map((day, i) => {
        if (!day) return React.createElement('div', { key: 'e' + i })
        const ds = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const daySs = ss.filter((s) => s.date === ds)
        const isToday = ds === today
        return React.createElement('button', { key: ds, onClick: () => onGoDay(ds), style: { aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 10, background: isToday ? `color-mix(in srgb, ${C.primary} 12%, ${C.surface})` : 'transparent', border: 'none', cursor: 'pointer' } },
          React.createElement('div', { style: { fontSize: 12.5, fontWeight: isToday ? 700 : 500, color: isToday ? C.primary : C.ink } }, day),
          React.createElement('div', { style: { display: 'flex', gap: 2 } },
            daySs.slice(0, 4).map((s, k) => React.createElement('div', { key: k, style: { width: 4, height: 4, borderRadius: 999, background: s.statut === 'realise' ? '#5b8a72' : '#6f8fa6' } }))))
      })),
    (() => {
      const real = ss.filter((s) => s.statut === 'realise').length
      return React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
        React.createElement('div', { style: { flex: 1, padding: '12px 8px', borderRadius: C.radiusSm, background: C.surface2, textAlign: 'center' } },
          React.createElement('div', { style: { fontWeight: 800, fontSize: 20 } }, ss.length),
          React.createElement('div', { style: { fontSize: 11, color: C.ink3, fontWeight: 600 } }, 'Planifiées')),
        React.createElement('div', { style: { flex: 1, padding: '12px 8px', borderRadius: C.radiusSm, background: C.surface2, textAlign: 'center' } },
          React.createElement('div', { style: { fontWeight: 800, fontSize: 20 } }, real),
          React.createElement('div', { style: { fontSize: 11, color: C.ink3, fontWeight: 600 } }, 'Réalisées')))
    })())
}

function fieldLabel() { return { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }
const fieldInputStyle = { width: '100%', padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }
function pillStyle(active) { return { padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? C.primary : C.line), background: active ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface, color: active ? C.primary : C.ink } }

function computeAllure(distance, temps) {
  const dist = parseFloat(distance)
  if (!dist || !temps) return ''
  const p = String(temps).split(':')
  if (p.length < 2) return ''
  const sec = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0)
  const as = sec / dist, min = Math.floor(as / 60), ss = Math.round(as % 60)
  return `${min}'${String(ss).padStart(2, '0')}"`
}

function CourseFields({ sport, data, setData }) {
  const allure = computeAllure(data.distance, data.temps)
  const upd = (k, v) => setData({ ...data, [k]: v, allure: k === 'distance' || k === 'temps' ? computeAllure(k === 'distance' ? v : data.distance, k === 'temps' ? v : data.temps) : data.allure })
  return React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: fieldLabel() }, sport === 'sprint' ? '⚡ Sprint' : sport === 'trail' ? '⛰️ Trail' : '🏃 Course'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      React.createElement('input', { type: 'number', step: '0.1', placeholder: 'Distance (km)', value: data.distance || '', onChange: (e) => upd('distance', e.target.value), style: fieldInputStyle }),
      React.createElement('input', { type: 'text', placeholder: 'Temps (mm:ss)', value: data.temps || '', onChange: (e) => upd('temps', e.target.value), style: fieldInputStyle }),
      React.createElement('input', { type: 'text', placeholder: 'Allure (auto)', value: allure, readOnly: true, style: { ...fieldInputStyle, color: C.ink3 } }),
      React.createElement('input', { type: 'number', placeholder: 'FC moy. (bpm)', value: data.fc || '', onChange: (e) => upd('fc', e.target.value), style: fieldInputStyle }),
      React.createElement('input', { type: 'number', placeholder: 'Dénivelé+ (m)', value: data.denivele || '', onChange: (e) => upd('denivele', e.target.value), style: { ...fieldInputStyle, gridColumn: '1 / -1' } })))
}

function PercheFields({ data, setData }) {
  const tech = data.tech || []
  return React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: fieldLabel() }, '🏋️ Perche'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 } },
      React.createElement('input', { type: 'number', step: '0.01', placeholder: 'Hauteur max (m)', value: data.hauteur || '', onChange: (e) => setData({ ...data, hauteur: e.target.value }), style: fieldInputStyle }),
      React.createElement('input', { type: 'number', placeholder: 'Nb sauts', value: data.sauts || '', onChange: (e) => setData({ ...data, sauts: e.target.value }), style: fieldInputStyle }),
      React.createElement('input', { type: 'text', placeholder: 'Perche utilisée (5.10m / 70kg)', value: data.perche || '', onChange: (e) => setData({ ...data, perche: e.target.value }), style: { ...fieldInputStyle, gridColumn: '1 / -1' } })),
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 8 } }, 'Travail technique'),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
      TECH_PERCHE.map((t) => {
        const active = tech.includes(t)
        return React.createElement('button', { key: t, onClick: () => setData({ ...data, tech: active ? tech.filter((x) => x !== t) : [...tech, t] }), style: pillStyle(active) }, t)
      })))
}

function EscaladeFields({ data, setData }) {
  const types = data.types || []
  return React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: fieldLabel() }, '🧗 Escalade'),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
      ['Bloc', 'Voie', 'Dalle', 'Dévers', 'Vertical'].map((t) => {
        const active = types.includes(t)
        return React.createElement('button', { key: t, onClick: () => setData({ ...data, types: active ? types.filter((x) => x !== t) : [...types, t] }), style: pillStyle(active) }, t)
      })),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      React.createElement('input', { type: 'text', placeholder: 'Niveau (6b+)', value: data.niveau || '', onChange: (e) => setData({ ...data, niveau: e.target.value }), style: fieldInputStyle }),
      React.createElement('input', { type: 'number', placeholder: 'Nb voies', value: data.voies || '', onChange: (e) => setData({ ...data, voies: e.target.value }), style: fieldInputStyle }),
      React.createElement('input', { type: 'number', placeholder: 'Nb blocs', value: data.blocs || '', onChange: (e) => setData({ ...data, blocs: e.target.value }), style: fieldInputStyle })))
}

function GenericSportFields({ sportId, data, setData }) {
  const cfg = SPORT_FIELDS[sportId]
  if (!cfg) return null
  return React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: fieldLabel() }, cfg.icon, ' ', cfg.label),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      cfg.fields.map((f) => {
        const val = data[f.k]
        if (f.t === 'num' || f.t === 'text' || f.t === 'time') {
          return React.createElement('input', { key: f.k, type: f.t === 'num' ? 'number' : 'text', step: f.step, placeholder: f.lab + (f.ph ? ` (${f.ph})` : ''), value: val || '', onChange: (e) => setData({ ...data, [f.k]: e.target.value }), style: fieldInputStyle })
        }
        if (f.t === 'select1') {
          return React.createElement('div', { key: f.k, style: { gridColumn: '1 / -1' } },
            React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 6, fontWeight: 600 } }, f.lab),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
              f.opts.map((o) => React.createElement('button', { key: o, onClick: () => setData({ ...data, [f.k]: o }), style: pillStyle(val === o) }, o))))
        }
        if (f.t === 'pills') {
          const cur = Array.isArray(val) ? val : []
          return React.createElement('div', { key: f.k, style: { gridColumn: '1 / -1' } },
            React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 6, fontWeight: 600 } }, f.lab),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
              f.opts.map((o) => { const on = cur.includes(o); return React.createElement('button', { key: o, onClick: () => setData({ ...data, [f.k]: on ? cur.filter((x) => x !== o) : [...cur, o] }), style: pillStyle(on) }, o) })))
        }
        if (f.t === 'bool') {
          const cur = val === true
          return React.createElement('div', { key: f.k, style: { gridColumn: '1 / -1' } },
            React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 6, fontWeight: 600 } }, f.lab),
            React.createElement('div', { style: { display: 'flex', gap: 7 } },
              React.createElement('button', { onClick: () => setData({ ...data, [f.k]: false }), style: pillStyle(!cur) }, 'Non'),
              React.createElement('button', { onClick: () => setData({ ...data, [f.k]: true }), style: pillStyle(cur) }, 'Oui')))
        }
        return null
      })))
}

function ExerciseSetRow({ exIdx, setIdx, set, onUpdate, onRemove }) {
  const mode = set.mode || 'reps'
  return React.createElement('div', { style: { marginBottom: 10 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: C.ink3 } }, `Série ${setIdx + 1}`),
      onRemove && React.createElement('button', { onClick: onRemove, 'aria-label': 'Retirer cette série', style: { fontSize: 13, color: '#b3402e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 6px 10px 16px' } }, '✕')),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, marginBottom: 3 } }, 'Séries'),
        React.createElement('input', { type: 'number', value: set.series || 3, onChange: (e) => onUpdate(exIdx, setIdx, 'series', e.target.value), style: { ...fieldInputStyle, padding: '8px 9px', fontSize: 13 } })),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, marginBottom: 3 } }, mode === 'duree' ? 'Durée (s)' : 'Reps'),
        React.createElement('input', { type: 'number', value: (mode === 'duree' ? set.duree : set.reps) || (mode === 'duree' ? 30 : 10), onChange: (e) => onUpdate(exIdx, setIdx, mode === 'duree' ? 'duree' : 'reps', e.target.value), style: { ...fieldInputStyle, padding: '8px 9px', fontSize: 13 } })),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, marginBottom: 3 } }, 'Charge kg'),
        React.createElement('input', { type: 'number', step: '0.5', placeholder: '0', value: set.charge || '', onChange: (e) => onUpdate(exIdx, setIdx, 'charge', e.target.value), style: { ...fieldInputStyle, padding: '8px 9px', fontSize: 13 } })),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, marginBottom: 3 } }, 'RPE'),
        React.createElement('input', { type: 'number', min: 1, max: 10, placeholder: '—', value: set.rpe || '', onChange: (e) => onUpdate(exIdx, setIdx, 'rpe', e.target.value), style: { ...fieldInputStyle, padding: '8px 9px', fontSize: 13 } }))),
    React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
      React.createElement('button', { onClick: () => onUpdate(exIdx, setIdx, 'mode', 'reps'), style: { flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === 'reps' ? `color-mix(in srgb, ${C.primary} 12%, ${C.surface})` : C.surface2, color: mode === 'reps' ? C.primary : C.ink3 } }, 'Répétitions'),
      React.createElement('button', { onClick: () => onUpdate(exIdx, setIdx, 'mode', 'duree'), style: { flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === 'duree' ? `color-mix(in srgb, ${C.primary} 12%, ${C.surface})` : C.surface2, color: mode === 'duree' ? C.primary : C.ink3 } }, 'Tenue chronométrée')))
}

function ExerciseCard({ ex, idx, history, onUpdateSet, onAddSet, onRemoveSet, onRemove }) {
  const h = history && history[ex.name]
  const last = h && h.last ? `Dernière : ${h.last.charge}kg × ${h.last.reps}` : ''
  const record = h && h.record ? `🏆 ${h.record.charge}kg` : ''
  const sets = ex.sets || []
  return React.createElement('div', { style: { padding: 12, borderRadius: C.radiusSm, background: C.surface2, marginBottom: 10 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5 } }, ex.name),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3 } }, ex.group)),
      React.createElement('div', { style: { textAlign: 'right' } },
        record && React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.primary } }, record),
        last && React.createElement('div', { style: { fontSize: 10, color: C.ink3 } }, last),
        React.createElement('button', { onClick: () => onRemove(idx), style: { fontSize: 12.5, color: '#b3402e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginTop: 3, padding: '9px 4px 9px 14px' } }, 'Retirer'))),
    sets.map((set, si) => React.createElement(ExerciseSetRow, { key: si, exIdx: idx, setIdx: si, set, onUpdate: onUpdateSet, onRemove: sets.length > 1 ? () => onRemoveSet(idx, si) : null })),
    React.createElement('button', { onClick: () => onAddSet(idx), style: { width: '100%', padding: '8px 0', borderRadius: 8, background: 'transparent', border: `1px dashed ${C.line}`, color: C.ink3, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginTop: 4 } }, '+ Ajouter une série'))
}

function MuscuFields({ sport, exercises, setExercises, exerciseHistory }) {
  const [query, setQuery] = useState('')
  const results = query.trim()
    ? Object.entries(EXERCISES_DB).flatMap(([g, list]) => list.filter((e) => e.toLowerCase().includes(query.toLowerCase())).map((e) => ({ n: e, g }))).slice(0, 8)
    : []

  function addEx(name, group) {
    const h = exerciseHistory && exerciseHistory[name]
    const sc = h && h.last ? h.last.charge + 2.5 : ''
    setExercises([...exercises, { name, group, sets: [{ mode: 'reps', series: 4, reps: 8, duree: 30, charge: sc, rpe: '', repos: 90 }] }])
    setQuery('')
  }
  function removeEx(idx) { setExercises(exercises.filter((_, i) => i !== idx)) }
  function addSet(idx) {
    const next = [...exercises]
    const last = next[idx].sets[next[idx].sets.length - 1] || {}
    next[idx] = { ...next[idx], sets: [...next[idx].sets, { mode: last.mode || 'reps', series: 1, reps: last.reps || 8, duree: last.duree || 30, charge: last.charge || 0, rpe: '', repos: 90 }] }
    setExercises(next)
  }
  function updateSet(exIdx, setIdx, field, value) {
    const next = [...exercises]
    const sets = [...next[exIdx].sets]
    sets[setIdx] = { ...sets[setIdx], [field]: field === 'mode' ? value : (parseFloat(value) || 0) }
    next[exIdx] = { ...next[exIdx], sets }
    setExercises(next)
  }
  function removeSet(exIdx, setIdx) {
    const next = [...exercises]
    next[exIdx] = { ...next[exIdx], sets: next[exIdx].sets.filter((_, i) => i !== setIdx) }
    setExercises(next)
  }

  const sportLabels = { muscu: '💪 Musculation', crossfit: '🏋️ Crossfit', callisthenie: '🤸 Callisthénie', gym: '🤸 Gym', halterophilie: '🏋️ Haltérophilie' }
  return React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: fieldLabel() }, sportLabels[sport] || '💪 Musculation'),
    React.createElement('div', { style: { position: 'relative', marginBottom: 12 } },
      React.createElement('input', { type: 'text', placeholder: 'Rechercher un exercice…', value: query, onChange: (e) => setQuery(e.target.value), style: fieldInputStyle }),
      results.length > 0 && React.createElement('div', { style: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', zIndex: 5, boxShadow: '0 8px 20px -8px rgba(0,0,0,.2)' } },
        results.map((r, i) => React.createElement('button', { key: i, onClick: () => addEx(r.n, r.g), style: { width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 13px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? `1px solid ${C.line}` : 'none', cursor: 'pointer', textAlign: 'left' } },
          React.createElement('span', { style: { fontSize: 13.5, fontWeight: 600 } }, r.n),
          React.createElement('span', { style: { fontSize: 11.5, color: C.ink3 } }, r.g))))),
    exercises.map((ex, i) => React.createElement(ExerciseCard, { key: i, ex, idx: i, history: exerciseHistory, onUpdateSet: updateSet, onAddSet: addSet, onRemoveSet: removeSet, onRemove: removeEx })),
    exercises.length === 0 && React.createElement('p', { style: { fontSize: 12.5, color: C.ink3, textAlign: 'center', padding: '10px 0' } }, 'Cherche et ajoute un exercice ci-dessus.'))
}

function SessionForm({ activeSports, initial, initialDate, exerciseHistory, onSave, onDelete, onClose }) {
  const [sport, setSport] = useState(initial?.sport || null)
  const [date, setDate] = useState(initial?.date || initialDate || isoDate(new Date()))
  const [heure, setHeure] = useState(initial?.heure || '')
  const [duree, setDuree] = useState(initial?.duree && DUREES.includes(initial.duree) ? initial.duree : (initial?.duree ? 'Personnalisée' : '1 h'))
  const [dureeCustom, setDureeCustom] = useState(initial?.duree && !DUREES.includes(initial.duree) ? initial.duree : '')
  const [statut, setStatut] = useState(initial?.statut || 'planifie')
  const [ressenti, setRessenti] = useState(initial?.ressenti || null)
  const [notes, setNotes] = useState(initial?.notes || '')
  const [data, setData] = useState(initial?.data || {})
  const [exercises, setExercises] = useState(initial?.exercises || [])
  const [dupDate, setDupDate] = useState('')

  const canSave = !!sport && !!date
  function handleSave() {
    onSave({
      id: initial?.id || 's_' + Date.now(),
      date, heure, sport,
      duree: duree === 'Personnalisée' ? (dureeCustom || 'Personnalisée') : duree,
      statut, ressenti, notes, data, exercises,
    })
  }
  // Copie la séance (sport, durée, champs, exercices/séries, notes) sur un
  // autre jour — repart en "Planifié" puisque cette occurrence-là n'a pas
  // encore eu lieu.
  function handleDuplicate() {
    if (!dupDate) return
    onSave({
      id: 's_' + Date.now(),
      date: dupDate, heure, sport,
      duree: duree === 'Personnalisée' ? (dureeCustom || 'Personnalisée') : duree,
      statut: 'planifie', ressenti: null, notes, data, exercises,
    })
  }

  return React.createElement('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 70, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s ease' } },
    React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '18px 22px calc(24px + env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto', animation: 'sheetUp .3s ease' } },
      React.createElement('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 16px' } }),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center', marginBottom: 18 } }, initial ? 'Modifier la séance' : 'Nouvelle séance'),

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Sport'),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 } },
        activeSports.map((sp) => {
          const active = sport === sp.id
          return React.createElement('button', { key: sp.id, onClick: () => setSport(sp.id), style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? C.primary : C.line), background: active ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface, color: active ? C.primary : C.ink } },
            React.createElement('span', null, sportEmoji(sp.id)), sp.label)
        })),

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Quand'),
      React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } },
        React.createElement('input', { type: 'date', value: date, onChange: (e) => setDate(e.target.value), style: { flex: 1, padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } }),
        React.createElement('input', { type: 'time', value: heure, onChange: (e) => setHeure(e.target.value), style: { flex: '0 0 auto', width: 110, padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })),

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Durée'),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: duree === 'Personnalisée' ? 8 : 16 } },
        DUREES.map((d) => {
          const active = duree === d
          return React.createElement('button', { key: d, onClick: () => setDuree(d), style: { padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (active ? C.primary : C.line), background: active ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface, color: active ? C.primary : C.ink } }, d)
        })),
      duree === 'Personnalisée' && React.createElement('input', { value: dureeCustom, onChange: (e) => setDureeCustom(e.target.value), placeholder: 'ex : 1h45', style: { width: '100%', padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box', marginBottom: 16 } }),

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Statut'),
      React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } },
        [{ id: 'planifie', label: '📅 Planifié' }, { id: 'realise', label: '✅ Réalisé' }].map((o) => {
          const active = statut === o.id
          return React.createElement('button', { key: o.id, onClick: () => setStatut(o.id), style: { flex: 1, padding: 12, borderRadius: C.radiusSm, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', border: '1.5px solid ' + (active ? C.primary : C.line), background: active ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface, color: active ? C.primary : C.ink } }, o.label)
        })),

      statut === 'realise' && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Ressenti'),
        React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
          RESSENTI.map((r) => React.createElement('button', { key: r.val, onClick: () => setRessenti(r.val), title: r.l, style: { flex: 1, padding: '10px 0', borderRadius: C.radiusSm, fontSize: 22, cursor: 'pointer', border: '1.5px solid ' + (ressenti === r.val ? C.primary : C.line), background: ressenti === r.val ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface } }, r.e)))),

      (sport === 'course' || sport === 'sprint' || sport === 'trail') && React.createElement(CourseFields, { sport, data, setData }),
      sport === 'perche' && React.createElement(PercheFields, { data, setData }),
      sport === 'escalade' && React.createElement(EscaladeFields, { data, setData }),
      sport && MUSCU_SPORTS.includes(sport) && React.createElement(MuscuFields, { sport, exercises, setExercises, exerciseHistory }),
      sport && !MUSCU_SPORTS.includes(sport) && sport !== 'course' && sport !== 'sprint' && sport !== 'trail' && sport !== 'perche' && sport !== 'escalade' && React.createElement(GenericSportFields, { sportId: sport, data, setData }),

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Notes'),
      React.createElement('textarea', { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: 'Objectifs, commentaires…', rows: 3, style: { width: '100%', padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: C.font, marginBottom: 18 } }),

      React.createElement('button', { disabled: !canSave, onClick: handleSave, style: { width: '100%', padding: 15, borderRadius: 999, background: canSave ? C.primary : C.surface2, color: canSave ? '#fff' : C.ink3, border: 'none', fontSize: 15, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' } }, '⚡ Enregistrer'),

      initial && React.createElement('div', { style: { marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Dupliquer vers un autre jour'),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement('input', { type: 'date', value: dupDate, onChange: (e) => setDupDate(e.target.value), style: { flex: 1, padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } }),
          React.createElement('button', { disabled: !dupDate, onClick: handleDuplicate, style: { flex: '0 0 auto', padding: '11px 16px', borderRadius: C.radiusSm, background: dupDate ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : C.surface2, border: `1.5px solid ${dupDate ? C.primary : C.line}`, color: dupDate ? C.primary : C.ink3, fontSize: 13.5, fontWeight: 700, cursor: dupDate ? 'pointer' : 'default' } }, '📋 Copier'))),

      initial && React.createElement('button', { onClick: () => onDelete(initial.id), style: { width: '100%', marginTop: 10, padding: 13, borderRadius: 999, background: 'transparent', border: `1px solid ${C.line}`, color: '#b3402e', fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, '🗑 Supprimer cette séance')))
}

// ============================================================
// Calendrier — planning des séances (créer/voir/modifier/supprimer),
// vues jour/semaine/mois, champs par sport (distance/allure/FC pour la
// course, hauteur/technique pour la perche, voies/niveau pour l'escalade,
// champs génériques pour les autres sports) et suivi série par série
// pour la musculation. Le minuteur de repos guidé et le calculateur
// d'allure "en direct" de l'ancienne app ne sont pas repris tels quels
// (ce terrain de lecture guidée est déjà couvert par le Lecteur de
// séance) — l'allure est recalculée à l'affichage à la place.
// ============================================================
export default function PlannerSpace({ db, store, onClose }) {
  const [view, setView] = useState('day')
  const [date, setDate] = useState(new Date())
  const [form, setForm] = useState(null) // null | 'new' | session object
  const [newDate, setNewDate] = useState(null)

  const sessions = db.planningSessions || []
  const exerciseHistory = db.exerciseHistory || {}
  const userSports = (db.profilePhys && db.profilePhys.sports) || []
  const activeSports = SPORTS.filter((sp) => (userSports.length ? userSports : DEFAULT_SPORTS).includes(sp.id))

  function navDate(dir) {
    const d = new Date(date)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setDate(d)
  }
  function openAdd(ds) { setNewDate(ds); setForm('new') }
  function openEdit(s) { setForm(s) }
  function saveSession(sess) {
    const prev = sessions.find((s) => s.id === sess.id)
    const next = prev ? sessions.map((s) => s.id === sess.id ? sess : s) : [...sessions, sess]
    const patch = { planningSessions: next }
    if (MUSCU_SPORTS.includes(sess.sport) && sess.statut === 'realise' && sess.exercises && sess.exercises.length) {
      const hist = { ...exerciseHistory }
      sess.exercises.forEach((ex) => {
        const maxCharge = Math.max(...ex.sets.map((st) => st.charge || 0))
        const lastSet = ex.sets[0] || {}
        const prevRecord = hist[ex.name] && hist[ex.name].record
        hist[ex.name] = {
          last: { charge: lastSet.charge || 0, reps: lastSet.reps || 0, date: sess.date },
          record: (!prevRecord || maxCharge > prevRecord.charge) ? { charge: maxCharge, date: sess.date } : prevRecord,
        }
      })
      patch.exerciseHistory = hist
    }
    // Une séance marquée "Réalisé" pour la première fois aujourd'hui met à
    // jour le streak (pas de source "live" pour ça). Le nombre de séances,
    // les minutes et le graphe "cette semaine" ne sont PAS incrémentés ici
    // — Accueil/Progrès les recalculent en direct depuis planningSessions
    // via trainingTotals(), pour ne jamais rater une séance ni la compter
    // deux fois (l'ancienne version incrémentait ici ET aurait ensuite été
    // recomptée en direct, doublant tout ce qui passe par le Calendrier).
    const wasRealise = prev && prev.statut === 'realise'
    if (sess.statut === 'realise' && !wasRealise) {
      const todayIso = isoDate(new Date())
      if (sess.date === todayIso) {
        const newStreak = db.completedToday ? db.streak : db.streak + 1
        patch.streak = newStreak
        patch.record = Math.max(db.record || 0, newStreak)
        patch.lastSessionISO = todayIso
      }
    }
    store.set(patch)
    setForm(null)
  }
  function deleteSession(id) {
    store.set({ planningSessions: sessions.filter((s) => s.id !== id) })
    setForm(null)
  }
  function goDay(ds) { setDate(new Date(ds + 'T00:00:00')); setView('day') }

  const today = isoDate(new Date())
  let label
  if (view === 'day') label = isoDate(date) === today ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  else if (view === 'week') { const m = mondayOf(date), s = new Date(m); s.setDate(m.getDate() + 6); label = `${m.getDate()} – ${s.getDate()} ${MOIS_C[s.getMonth()]} ${s.getFullYear()}` }
  else label = `${MOIS_L[date.getMonth()]} ${date.getFullYear()}`

  return React.createElement(FlowSpace, {
    title: 'Calendrier', onClose,
    action: React.createElement('button', { onClick: () => openAdd(view === 'day' ? isoDate(date) : null), 'aria-label': 'Ajouter une séance', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
      React.createElement(Icon, { name: 'plus', size: 20, color: C.primary })),
  },
    React.createElement(SegTabs, { tabs: [{ id: 'day', lab: 'Jour' }, { id: 'week', lab: 'Semaine' }, { id: 'month', lab: 'Mois' }], value: view, onChange: setView }),

    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 } },
      React.createElement('button', { onClick: () => navDate(-1), 'aria-label': 'Précédent', style: { width: 34, height: 34, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'prev', size: 16 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15, textTransform: 'capitalize' } }, label),
      React.createElement('button', { onClick: () => navDate(1), 'aria-label': 'Suivant', style: { width: 34, height: 34, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'next', size: 16 }))),

    view === 'day' && React.createElement(DayView, { date, sessions, onOpen: openEdit, onAdd: openAdd }),
    view === 'week' && React.createElement(WeekView, { date, sessions, onOpen: openEdit, onAdd: openAdd }),
    view === 'month' && React.createElement(MonthView, { date, sessions, onGoDay: goDay }),

    form && React.createElement(SessionForm, {
      activeSports,
      initial: form === 'new' ? null : form,
      initialDate: newDate,
      exerciseHistory,
      onSave: saveSession,
      onDelete: deleteSession,
      onClose: () => setForm(null),
    }))
}
