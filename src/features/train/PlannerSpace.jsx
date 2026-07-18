import React, { useState } from 'react'
import { C, Icon, FlowSpace, SegTabs } from '../health/kit'
import { SPORTS } from './trainData'

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

function SessionForm({ activeSports, initial, initialDate, onSave, onDelete, onClose }) {
  const [sport, setSport] = useState(initial?.sport || null)
  const [date, setDate] = useState(initial?.date || initialDate || isoDate(new Date()))
  const [heure, setHeure] = useState(initial?.heure || '')
  const [duree, setDuree] = useState(initial?.duree && DUREES.includes(initial.duree) ? initial.duree : (initial?.duree ? 'Personnalisée' : '1 h'))
  const [dureeCustom, setDureeCustom] = useState(initial?.duree && !DUREES.includes(initial.duree) ? initial.duree : '')
  const [statut, setStatut] = useState(initial?.statut || 'planifie')
  const [ressenti, setRessenti] = useState(initial?.ressenti || null)
  const [notes, setNotes] = useState(initial?.notes || '')

  const canSave = !!sport && !!date
  function handleSave() {
    onSave({
      id: initial?.id || 's_' + Date.now(),
      date, heure, sport,
      duree: duree === 'Personnalisée' ? (dureeCustom || 'Personnalisée') : duree,
      statut, ressenti, notes,
    })
  }

  return React.createElement('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 70, display: 'flex', alignItems: 'flex-end' } },
    React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '18px 22px calc(24px + env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto' } },
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

      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Notes'),
      React.createElement('textarea', { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: 'Objectifs, commentaires…', rows: 3, style: { width: '100%', padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: C.font, marginBottom: 18 } }),

      React.createElement('button', { disabled: !canSave, onClick: handleSave, style: { width: '100%', padding: 15, borderRadius: 999, background: canSave ? C.primary : C.surface2, color: canSave ? '#fff' : C.ink3, border: 'none', fontSize: 15, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' } }, '⚡ Enregistrer'),
      initial && React.createElement('button', { onClick: () => onDelete(initial.id), style: { width: '100%', marginTop: 10, padding: 13, borderRadius: 999, background: 'transparent', border: `1px solid ${C.line}`, color: '#b3402e', fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, '🗑 Supprimer cette séance')))
}

// ============================================================
// Calendrier — planning des séances (créer/voir/modifier/supprimer),
// vues jour/semaine/mois. Version resserrée du planificateur de
// l'ancienne app : les fonctions avancées propres à la musculation
// (suivi série par série, minuteur d'intervalles, calcul d'allure)
// ne sont pas reprises ici, ce terrain étant déjà couvert par les
// modules Programme/Catalogue/Lecteur de séance.
// ============================================================
export default function PlannerSpace({ db, store, onClose }) {
  const [view, setView] = useState('day')
  const [date, setDate] = useState(new Date())
  const [form, setForm] = useState(null) // null | 'new' | session object
  const [newDate, setNewDate] = useState(null)

  const sessions = db.planningSessions || []
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
    const next = sessions.some((s) => s.id === sess.id) ? sessions.map((s) => s.id === sess.id ? sess : s) : [...sessions, sess]
    store.set({ planningSessions: next })
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
      onSave: saveSession,
      onDelete: deleteSession,
      onClose: () => setForm(null),
    }))
}
