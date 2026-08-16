import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SegTabs, SecLab, NoteBox } from './kit'
import { PHASES, PHASE_ORDER, INTENSITE } from './cycleData'
import { cycleAnalysis, cycleStats, periodStarts, PMS_WINDOW_DAYS } from './cycleIntel'

const CYC = MODULE_TINTS.cycle

function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// Position dans le cycle + phase courante + prédictions.
//
// La longueur et le point de départ viennent désormais des règles
// réellement enregistrées quand il y en a assez : projeter depuis une date
// unique saisie il y a six mois accumule un décalage qui finit par ranger
// chaque jour dans la mauvaise phase.
export function cycleInfo(cycle, today = new Date()) {
  const stats = cycleStats(cycle)
  const starts = periodStarts(cycle)
  const len = stats && stats.count >= 2 ? Math.round(stats.mean) : (cycle.cycleLen || 28)
  const pl = cycle.periodLen || 5
  const anchor = starts.length ? starts[starts.length - 1] : cycle.startDate
  const start = new Date(anchor + 'T00:00:00')
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
  const ovDate = new Date(t); ovDate.setDate(t.getDate() + (daysToOv >= 0 ? daysToOv : daysToOv + len))
  return { day, len, phase, pl, daysToNext, nextDate, ovDate }
}

function Ring({ size = 80, stroke = 8, progress, color, track, children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return React.createElement('div', { style: { position: 'relative', width: size, height: size, flex: '0 0 auto' } },
    React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke, style: { stroke: track } }),
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke, strokeDasharray: circ, strokeDashoffset: circ * (1 - Math.max(0, Math.min(1, progress))), strokeLinecap: 'round', transform: `rotate(-90 ${size / 2} ${size / 2})`, style: { stroke: color } })),
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
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s ease' } },
    React.createElement('div', { style: { width: '100%', background: C.surface, borderRadius: '24px 24px 0 0', padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto', animation: 'sheetUp .3s ease' } },
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

  // Sans ce bouton, la seule façon de corriger une prédiction qui a dérivé
  // était de rouvrir les réglages : le flux ne s'affichait que les jours où
  // la prédiction elle-même annonçait des règles, ce qui la rendait
  // impossible à démentir. Le vrai premier jour est ici un fait qu'on
  // enregistre, et c'est lui qui recale tout le reste.
  const starts = periodStarts(cycle)
  const startedToday = starts.includes(todISO)
  const declarePeriod = () => {
    if (startedToday) return
    const list = [...new Set([...(cycle.periodStarts || []), todISO])].sort()
    store.set({
      cycle: {
        ...cycle,
        periodStarts: list.slice(-60),
        startDate: todISO,
        track: { ...track, [todISO]: { ...tTod, flux: tTod.flux || 2 } },
      },
    })
  }

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

    React.createElement('button', {
      onClick: declarePeriod, disabled: startedToday,
      style: {
        width: '100%', padding: '13px 15px', borderRadius: 999, fontSize: 14, fontWeight: 700,
        cursor: startedToday ? 'default' : 'pointer',
        border: `1.5px solid ${startedToday ? C.line : CYC}`,
        background: startedToday ? C.surface : `color-mix(in srgb, ${CYC} 10%, ${C.surface})`,
        color: startedToday ? C.ink3 : CYC,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      },
    },
      React.createElement(Icon, { name: startedToday ? 'check' : 'drop', size: 16, color: startedToday ? C.ink3 : CYC }),
      startedToday ? 'Premier jour enregistré' : 'Mes règles ont commencé aujourd’hui'),

    React.createElement('div', { style: { padding: '16px', borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 14 } }, 'Mon ressenti du jour'),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        trackRow('Énergie', 'energy', '#c79a4a'),
        trackRow('Sommeil', 'sleep', '#4a6fa5'),
        trackRow('Douleurs', 'pain', '#b5566a')),
      React.createElement('div', { style: { marginTop: 16 } },
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

// ── Onglet "Analyse" : ce que plusieurs cycles disent et qu'un jour ne dit pas ──
function statCard(label, value, hint, tint) {
  return React.createElement('div', { style: { flex: 1, padding: '13px 15px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em' } }, label),
    React.createElement('div', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 800, color: tint || C.ink, marginTop: 3 } }, value),
    hint ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2 } }, hint) : null)
}

// Barres comparées d'une métrique entre phases : le contraste se lit d'un
// coup d'œil là où quatre moyennes alignées demandent un effort.
function PhaseBars({ contrast, tint, label, unit = '/5' }) {
  if (!contrast) return null
  const max = Math.max(...contrast.byPhase.map((p) => p.mean), 5)
  return React.createElement('div', { style: { marginTop: 16 } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 9 } }, label),
    contrast.byPhase.map((p) => React.createElement('div', { key: p.phase, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 } },
      React.createElement('div', { style: { fontSize: 12, color: C.ink2, fontWeight: 600, flex: '0 0 82px' } }, p.label),
      React.createElement('div', { style: { flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: 'hidden' } },
        React.createElement('div', { style: { width: Math.round(p.mean / max * 100) + '%', height: '100%', borderRadius: 999, background: tint } })),
      React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink, flex: '0 0 42px', textAlign: 'right' } }, String(p.mean).replace('.', ',') + unit),
      React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, flex: '0 0 32px', textAlign: 'right' } }, p.n + ' j'))))
}

function AnalyseTab({ cycle }) {
  const ana = cycleAnalysis(cycle)
  const stats = ana.stats

  const empty = (msg) => React.createElement('div', { style: { textAlign: 'center', padding: '40px 14px', color: C.ink3, fontSize: 13.5, lineHeight: 1.5 } },
    React.createElement(Icon, { name: 'moon', size: 28, color: C.line, style: { marginBottom: 12 } }),
    React.createElement('div', null, msg))

  if (!ana.starts.length) return empty('Enregistre le premier jour de tes règles pour que l’application cale ses prédictions sur ta réalité.')

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      statCard('Cycles suivis', String(stats ? stats.count : 0), ana.starts.length + ' début' + (ana.starts.length > 1 ? 's' : '') + ' noté' + (ana.starts.length > 1 ? 's' : ''), CYC),
      statCard('Longueur moyenne', stats ? String(stats.mean).replace('.', ',') + ' j' : '—', stats && stats.count ? stats.min + ' à ' + stats.max + ' j' : 'à partir de 2 cycles')),

    stats ? React.createElement('div', { style: { padding: '13px 15px', borderRadius: C.radiusSm, background: stats.level === 'warn' ? `color-mix(in srgb, ${C.warn} 10%, ${C.surface})` : C.surface, border: `1px solid ${stats.level === 'warn' ? `color-mix(in srgb, ${C.warn} 30%, ${C.line})` : C.line}` } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 } }, 'Régularité'),
      React.createElement('div', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.5 } }, stats.text)) : null,

    ana.drift ? React.createElement(NoteBox, { tint: C.warn }, ana.drift.text + ' Mets la durée à jour dans les réglages pour des prédictions plus justes.') : null,

    (ana.energy || ana.pain || ana.sleep) ? React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Ton ressenti par phase'),
      React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 4, lineHeight: 1.45 } }, 'Moyennes de ce que tu as noté, rangées selon la phase où tu l’as noté.'),
      React.createElement(PhaseBars, { contrast: ana.energy, tint: '#c79a4a', label: 'Énergie' }),
      React.createElement(PhaseBars, { contrast: ana.sleep, tint: '#4a6fa5', label: 'Sommeil' }),
      React.createElement(PhaseBars, { contrast: ana.pain, tint: '#b5566a', label: 'Douleurs' })) : null,

    ana.pms ? React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: ana.pms.flagged ? `color-mix(in srgb, ${CYC} 8%, ${C.surface})` : C.surface, border: `1px solid ${ana.pms.flagged ? `color-mix(in srgb, ${CYC} 26%, ${C.line})` : C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, PMS_WINDOW_DAYS + ' jours avant tes règles'),
      React.createElement('div', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.5 } },
        ana.pms.flagged
          ? `Tu notes ${String(ana.pms.symptomsWin).replace('.', ',')} symptôme(s) par jour sur cette fenêtre, contre ${String(ana.pms.symptomsOther).replace('.', ',')} le reste du cycle.`
          : `Rien ne distingue nettement cette fenêtre du reste de ton cycle (${String(ana.pms.symptomsWin).replace('.', ',')} contre ${String(ana.pms.symptomsOther).replace('.', ',')} symptôme(s) par jour).`),
      ana.pms.topSymptoms.length ? React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 } },
        ana.pms.topSymptoms.map((s) => React.createElement('span', { key: s.symptom, style: { padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: `color-mix(in srgb, ${CYC} 14%, ${C.surface})`, color: CYC } }, s.symptom + ' · ' + s.pct + ' %'))) : null,
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 9 } }, ana.pms.windowDays + ' jours suivis dans la fenêtre, ' + ana.pms.otherDays + ' hors fenêtre')) : null,

    ana.symptoms.length ? React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 } }, 'Où tombent tes symptômes'),
      React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 10, lineHeight: 1.45 } }, 'Part des jours suivis de chaque phase où tu as noté le symptôme.'),
      ana.symptoms.slice(0, 8).map((s) => React.createElement('div', { key: s.symptom, style: { padding: '9px 0', borderBottom: `1px solid ${C.line}` } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 } },
          React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: C.ink2 } }, s.symptom),
          React.createElement('span', { style: { fontSize: 11.5, color: C.ink3, flex: '0 0 auto' } }, s.total + ' jour' + (s.total > 1 ? 's' : ''))),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 3 } },
          s.phases.map((p) => p.label + ' ' + p.pct + ' %').join(' · '))))) : null,

    React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Ce qu’on en retient'),
      ana.tips.map((t, i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: i ? 9 : 0 } },
        React.createElement('span', { style: { color: CYC, fontWeight: 800, flex: '0 0 auto' } }, '•'),
        React.createElement('span', null, t)))),

    ana.accuracy && ana.accuracy.n >= 2 ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, textAlign: 'center', lineHeight: 1.5 } },
      `Sur ${ana.accuracy.n} cycle${ana.accuracy.n > 1 ? 's' : ''} évalué${ana.accuracy.n > 1 ? 's' : ''}, la prédiction se trompe en moyenne de ${String(ana.accuracy.mae).replace('.', ',')} jour(s).`) : null,

    React.createElement(NoteBox, { tint: CYC }, 'Repères de suivi, pas un diagnostic. Règles absentes, douleurs invalidantes ou syndrome prémenstruel sévère relèvent d’un avis médical.'))
}

export default function CycleSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('today')
  const [setupOpen, setSetupOpen] = useState(false)

  if (loading) {
    return React.createElement(FlowSpace, { bg: 'sante', title: 'Cycle', onClose, tint: CYC }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }

  const cycle = db.cycle || {}
  const enabled = cycle.enabled && cycle.startDate
  const saveCycle = (c) => { store.set({ cycle: { ...cycle, ...c } }); setSetupOpen(false) }

  if (!enabled) {
    return React.createElement(FlowSpace, { bg: 'sante', title: 'Espace Cycle', onClose, tint: CYC },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '70vh' } },
        React.createElement('div', { style: { width: 96, height: 96, borderRadius: 999, background: `color-mix(in srgb, ${CYC} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' } }, React.createElement(Icon, { name: 'moon', size: 42, color: CYC })),
        React.createElement('h1', { style: { fontFamily: C.font, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' } }, 'Bouge avec ton cycle'),
        React.createElement('p', { style: { color: C.ink2, fontSize: 15.5, lineHeight: 1.55, marginTop: 12, maxWidth: 330, marginInline: 'auto' } }, 'Adapte tes séances à chaque phase, suis ton énergie, tes symptômes et la nutrition idéale pour chaque moment du mois.'),
        React.createElement('button', { onClick: () => setSetupOpen(true), style: { marginTop: 28, maxWidth: 300, marginInline: 'auto', width: '100%', padding: 16, borderRadius: 999, border: 'none', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', background: CYC, boxShadow: `0 12px 26px -14px ${CYC}` } }, 'Configurer mon cycle')),
      setupOpen && React.createElement(CycleSetup, { cycle, onSave: saveCycle, onClose: () => setSetupOpen(false) }))
  }

  return React.createElement(FlowSpace, { bg: 'sante', title: 'Cycle', onClose, tint: CYC, action: React.createElement('button', { onClick: () => setSetupOpen(true), style: { fontSize: 12.5, fontWeight: 700, color: CYC, background: 'none', border: 'none', cursor: 'pointer' } }, 'Dates') },
    React.createElement(SegTabs, { tint: CYC, value: tab, onChange: setTab, tabs: [{ id: 'today', lab: 'Aujourd’hui' }, { id: 'analyse', lab: 'Analyse' }, { id: 'phases', lab: 'Phases' }] }),
    tab === 'today' && React.createElement(TodayTab, { cycle, store }),
    tab === 'analyse' && React.createElement(AnalyseTab, { cycle }),
    tab === 'phases' && React.createElement(PhasesTab, null),
    setupOpen && React.createElement(CycleSetup, { cycle, onSave: saveCycle, onClose: () => setSetupOpen(false) }))
}
