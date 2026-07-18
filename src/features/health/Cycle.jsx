import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SegTabs, SecLab, NoteBox } from './kit'
import { PHASES, PHASE_ORDER, INTENSITE } from './cycleData'

const CYC = MODULE_TINTS.cycle

function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// Position dans le cycle + phase courante + prédictions.
function cycleInfo(cycle, today = new Date()) {
  const len = cycle.cycleLen || 28
  const pl = cycle.periodLen || 5
  const start = new Date(cycle.startDate + 'T00:00:00')
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.floor((t - start) / 864e5)
  const day = ((diff % len) + len) % len + 1
  let phase
  if (day <= pl) phase = 'menstruation'
  else if (day <= Math.round(len * 0.46)) phase = 'folliculaire'
  else if (day <= Math.round(len * 0.57)) phase = 'ovulation'
  else phase = 'luteale'
  const daysToNext = len - day + 1
  const nextDate = new Date(t); nextDate.setDate(t.getDate() + daysToNext)
  const ovDay = Math.round(len * 0.46) + 1
  const daysToOv = ovDay - day
  const ovDate = new Date(t); ovDate.setDate(t.getDate() + (daysToOv > 0 ? daysToOv : daysToOv + len))
  return { day, len, phase, pl, daysToNext, nextDate, ovDate }
}

function Ring({ size = 80, stroke = 8, progress, color, track, children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return React.createElement('div', { style: { position: 'relative', width: size, height: size, flex: '0 0 auto' } },
    React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: track, strokeWidth: stroke }),
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: color, strokeWidth: stroke, strokeDasharray: circ, strokeDashoffset: circ * (1 - Math.max(0, Math.min(1, progress))), strokeLinecap: 'round', transform: `rotate(-90 ${size / 2} ${size / 2})` })),
    React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, children))
}

// ── Configuration des dates (si le cycle n'est pas encore réglé) ──
function CycleSetup({ cycle, onSave, onClose }) {
  const [startDate, setStartDate] = useState((cycle && cycle.startDate) || isoDate(new Date()))
  const [cycleLen, setCycleLen] = useState((cycle && cycle.cycleLen) || 28)
  const [periodLen, setPeriodLen] = useState((cycle && cycle.periodLen) || 5)
  const field = (label, node) => React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, label), node)
  const numInput = (value, setter, min, max) => React.createElement('input', { type: 'number', value, min, max, onChange: (e) => setter(Number(e.target.value)), style: { width: '100%', padding: '13px 15px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end' } },
    React.createElement('div', { style: { width: '100%', background: C.surface, borderRadius: '24px 24px 0 0', padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto' } },
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, marginBottom: 6 } }, 'Ton cycle'),
      React.createElement('div', { style: { fontSize: 13.5, color: C.ink3, marginBottom: 18, lineHeight: 1.4 } }, 'Pour situer ta phase et adapter les séances. Modifiable à tout moment.'),
      field('Premier jour des dernières règles', React.createElement('input', { type: 'date', value: startDate, onChange: (e) => setStartDate(e.target.value), style: { width: '100%', padding: '13px 15px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })),
      field('Durée du cycle (jours)', numInput(cycleLen, setCycleLen, 20, 45)),
      field('Durée des règles (jours)', numInput(periodLen, setPeriodLen, 1, 10)),
      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 6 } },
        React.createElement('button', { onClick: onClose, style: { flex: 1, padding: 15, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Annuler'),
        React.createElement('button', { onClick: () => onSave({ enabled: true, startDate, cycleLen, periodLen }), style: { flex: 1, padding: 15, borderRadius: 999, background: CYC, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Enregistrer')))
  )
}

const FLUX = ['Léger', 'Normal', 'Abondant', 'Très abondant']
const HUMEURS = ['😢 Pas bien', '😕 Tendue', '😐 Neutre', '🙂 Bien', '😄 Super']
const SYMPTOMES = ['Crampes', 'Ballonnements', 'Seins sensibles', 'Maux de tête', 'Fatigue', 'Acné', 'Nausées', 'Lombalgies', 'Rétention eau']

function TodayTab({ cycle, store }) {
  const info = cycleInfo(cycle)
  const ph = PHASES[info.phase]
  const it = INTENSITE[info.phase]
  const track = cycle.track || {}
  const todISO = isoDate(new Date())
  const tTod = track[todISO] || {}
  const setTrack = (patch) => store.set({ cycle: { ...cycle, track: { ...track, [todISO]: { ...tTod, ...patch } } } })

  const Dots = ({ value, onPick, tint, max = 5 }) => React.createElement('div', { style: { display: 'flex', gap: 6 } },
    [...Array(max)].map((_, i) => {
      const n = i + 1
      return React.createElement('button', { key: n, onClick: () => onPick(value === n ? 0 : n), 'aria-label': 'Niveau ' + n, style: { width: 30, height: 30, borderRadius: 999, border: '2px solid ' + (value >= n ? tint : C.line), background: value >= n ? tint : 'transparent', cursor: 'pointer', transition: 'all .15s' } })
    }))

  const trackRow = (label, key, tint) => React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
    React.createElement('span', { style: { fontSize: 13.5, fontWeight: 600, color: C.ink2 } }, label),
    React.createElement(Dots, { value: tTod[key] || 0, onPick: (v) => setTrack({ [key]: v }), tint }))

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: ph.tint, color: '#fff' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        React.createElement(Ring, { size: 80, stroke: 8, progress: info.day / info.len, color: '#fff', track: 'rgba(255,255,255,.28)' }, React.createElement(Icon, { name: ph.icon, size: 26, color: '#fff' })),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 12, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Jour ' + info.day + ' / ' + info.len),
          React.createElement('div', { style: { fontFamily: C.font, fontSize: 24, fontWeight: 700, lineHeight: 1.05 } }, 'Phase ' + ph.label.toLowerCase()),
          React.createElement('div', { style: { fontSize: 13, opacity: .9, marginTop: 2 } }, ph.energy),
          React.createElement('div', { style: { fontSize: 11.5, opacity: .8, marginTop: 4 } }, '⚡ ' + it.rpe + ' RPE · ' + it.fc))),
      React.createElement('div', { style: { marginTop: 14, fontSize: 13.5, lineHeight: 1.5, opacity: .95 } }, ph.advice)),

    React.createElement('div', { style: { padding: '12px 14px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${ph.tint} 6%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${ph.tint} 20%, ${C.line})` } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: ph.tint, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, '⚡ Paramètres d’entraînement — phase ' + ph.label.toLowerCase()),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' } },
        [['RPE cible', it.rpe], ['FC cible', it.fc], ['Charge', it.charge], ['Volume', it.volume], ['Cardio', it.cardio]].map(([l, v]) =>
          React.createElement('div', { key: l, style: { fontSize: 12.5 } }, React.createElement('span', { style: { color: C.ink3, fontWeight: 600 } }, l + ' '), React.createElement('span', { style: { color: C.ink2, fontWeight: 500 } }, v))))),

    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      React.createElement('div', { style: { flex: 1, padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Prochaines règles'),
        React.createElement('div', { style: { fontSize: 15, fontWeight: 700, marginTop: 4 } }, 'J-' + info.daysToNext),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, info.nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))),
      React.createElement('div', { style: { flex: 1, padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Prochaine ovulation'),
        React.createElement('div', { style: { fontSize: 15, fontWeight: 700, marginTop: 4 } }, info.ovDate > new Date() ? 'J+' + Math.ceil((info.ovDate - new Date()) / 864e5) : 'Passée'),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, info.ovDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })))),

    React.createElement('div', { style: { padding: '16px', borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 14 } }, 'Mon ressenti du jour'),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        trackRow('Énergie', 'energy', '#c79a4a'),
        trackRow('Sommeil', 'sleep', '#4a6fa5'),
        trackRow('Douleurs', 'pain', '#b5566a')),
      info.phase === 'menstruation' && React.createElement('div', { style: { marginTop: 16 } },
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 8 } }, 'Flux'),
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          FLUX.map((fl, i) => React.createElement('button', { key: fl, onClick: () => setTrack({ flux: tTod.flux === i + 1 ? 0 : i + 1 }), style: { padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (tTod.flux === i + 1 ? CYC : C.line), background: tTod.flux === i + 1 ? `color-mix(in srgb, ${CYC} 12%, ${C.surface})` : C.surface, color: tTod.flux === i + 1 ? CYC : C.ink2 } }, fl)))),
      React.createElement('div', { style: { marginTop: 16 } },
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 8 } }, 'Humeur'),
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          HUMEURS.map((h, i) => React.createElement('button', { key: h, onClick: () => setTrack({ mood: tTod.mood === i + 1 ? 0 : i + 1 }), style: { padding: '7px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (tTod.mood === i + 1 ? CYC : C.line), background: tTod.mood === i + 1 ? `color-mix(in srgb, ${CYC} 12%, ${C.surface})` : C.surface, color: tTod.mood === i + 1 ? CYC : C.ink2 } }, h)))),
      React.createElement('div', { style: { marginTop: 16 } },
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 8 } }, 'Symptômes'),
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          SYMPTOMES.map((s) => {
            const on = (tTod.symptoms || []).includes(s)
            return React.createElement('button', { key: s, onClick: () => { const cur = tTod.symptoms || []; setTrack({ symptoms: on ? cur.filter((x) => x !== s) : [...cur, s] }) }, style: { padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (on ? CYC : C.line), background: on ? CYC : C.surface, color: on ? '#fff' : C.ink2 } }, s)
          })))),

    ph.spm_tips && React.createElement(NoteBox, { tint: ph.tint }, ph.spm_tips))
}

function PhasesTab() {
  const [open, setOpen] = useState(null)
  const section = (title, body) => body ? React.createElement('div', { style: { marginTop: 10 } },
    React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 3 } }, title),
    React.createElement('div', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.5 } }, body)) : null
  return React.createElement('div', null,
    React.createElement(SecLab, null, 'Les 4 phases'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      PHASE_ORDER.map((k) => {
        const p = PHASES[k]
        const isOpen = open === k
        return React.createElement('div', { key: k, style: { borderRadius: C.radiusSm, background: C.surface, border: '1px solid ' + (isOpen ? `color-mix(in srgb, ${p.tint} 40%, ${C.line})` : C.line), overflow: 'hidden' } },
          React.createElement('button', { onClick: () => setOpen(isOpen ? null : k), style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 14, background: 'transparent', border: 'none', cursor: 'pointer' } },
            React.createElement('div', { style: { width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', background: `color-mix(in srgb, ${p.tint} 15%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: p.icon, size: 20, color: p.tint })),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, color: p.tint } }, p.label),
              React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 1 } }, p.days + ' · ' + p.energy)),
            React.createElement(Icon, { name: isOpen ? 'close' : 'next', size: 18, color: C.ink3 })),
          isOpen && React.createElement('div', { style: { padding: '0 14px 16px' } },
            section('Hormones', p.hormone),
            section('Conseil séances', p.advice),
            section('Intensité', p.intensite),
            section('À éviter', p.a_eviter),
            section('Nutrition', p.nutrition),
            p.aliments_cles && React.createElement('div', { style: { marginTop: 10 } },
              React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Aliments clés'),
              React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, p.aliments_cles.map((a, i) => React.createElement('span', { key: i, style: { padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: p.tint, background: `color-mix(in srgb, ${p.tint} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${p.tint} 25%, ${C.line})` } }, a)))),
            p.micronutriments && React.createElement('div', { style: { marginTop: 12 } },
              React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Micronutriments'),
              React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                p.micronutriments.map((m, i) => React.createElement('div', { key: i, style: { padding: '10px 12px', borderRadius: C.radiusSm, background: C.bg, border: `1px solid ${C.line}` } },
                  React.createElement('div', { style: { fontSize: 13, fontWeight: 700 } }, m.nom),
                  React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } }, m.sources),
                  React.createElement('div', { style: { fontSize: 12, color: C.ink2, marginTop: 3, lineHeight: 1.4 } }, m.pourquoi))))),
            section('Récupération', p.recovery),
            section('Mobilité', p.mobilite),
            section('Renforcement', p.renfo),
            section('Seed cycling', p.seed_cycling),
            p.symptoms && React.createElement('div', { style: { marginTop: 10 } },
              React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Symptômes fréquents'),
              React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } }, p.symptoms.join(' · '))),
            p.spm_tips && React.createElement(NoteBox, { tint: p.tint }, p.spm_tips)))
      })),
    React.createElement(NoteBox, { tint: CYC }, 'Repères éducatifs (IOC, ACSM, revues récentes). Les effets du cycle sur la performance sont variables selon les individus — base-toi surtout sur ton ressenti. En cas de règles absentes, douleurs invalidantes ou SPM sévère, consulte.'))
}

export default function CycleSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('today')
  const [setupOpen, setSetupOpen] = useState(false)

  if (loading) {
    return React.createElement(FlowSpace, { title: 'Cycle', onClose, tint: CYC }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }

  const cycle = db.cycle || {}
  const enabled = cycle.enabled && cycle.startDate
  const saveCycle = (c) => { store.set({ cycle: { ...cycle, ...c } }); setSetupOpen(false) }

  if (!enabled) {
    return React.createElement(FlowSpace, { title: 'Espace Cycle', onClose, tint: CYC },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '70vh' } },
        React.createElement('div', { style: { width: 96, height: 96, borderRadius: 999, background: `color-mix(in srgb, ${CYC} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' } }, React.createElement(Icon, { name: 'moon', size: 42, color: CYC })),
        React.createElement('h1', { style: { fontFamily: C.font, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' } }, 'Bouge avec ton cycle'),
        React.createElement('p', { style: { color: C.ink2, fontSize: 15.5, lineHeight: 1.55, marginTop: 12, maxWidth: 330, marginInline: 'auto' } }, 'Adapte tes séances à chaque phase, suis ton énergie, tes symptômes et la nutrition idéale pour chaque moment du mois.'),
        React.createElement('button', { onClick: () => setSetupOpen(true), style: { marginTop: 28, maxWidth: 300, marginInline: 'auto', width: '100%', padding: 16, borderRadius: 999, border: 'none', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', background: CYC, boxShadow: `0 12px 26px -14px ${CYC}` } }, 'Configurer mon cycle')),
      setupOpen && React.createElement(CycleSetup, { cycle, onSave: saveCycle, onClose: () => setSetupOpen(false) }))
  }

  return React.createElement(FlowSpace, { title: 'Cycle', onClose, tint: CYC, action: React.createElement('button', { onClick: () => setSetupOpen(true), style: { fontSize: 12.5, fontWeight: 700, color: CYC, background: 'none', border: 'none', cursor: 'pointer' } }, 'Dates') },
    React.createElement(SegTabs, { tint: CYC, value: tab, onChange: setTab, tabs: [{ id: 'today', lab: 'Aujourd’hui' }, { id: 'phases', lab: 'Phases' }] }),
    tab === 'today' && React.createElement(TodayTab, { cycle, store }),
    tab === 'phases' && React.createElement(PhasesTab, null),
    setupOpen && React.createElement(CycleSetup, { cycle, onSave: saveCycle, onClose: () => setSetupOpen(false) }))
}
