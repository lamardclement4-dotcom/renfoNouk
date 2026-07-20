import React, { useState, useEffect } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { Icon } from '../health/kit'

// ============================================================
// Tests physiques, portés depuis le bundle de l'ancienne app
// (module PhysicalTestsSpace). Les recommandations de séances
// pointaient vers la bibliothèque "Renforcement" de l'ancienne
// app (window.getSession) qui n'existe pas encore ici : les
// messages de conseil sont conservés, les boutons de séance sont
// omis en attendant que ce module soit porté.
// ============================================================

const TESTS_COLOR = '#5b6fa5'
const SURFACE = '#fff'
const SURFACE2 = '#f5f4ef'
const INK = '#2b2b2b'
const INK2 = '#666'
const INK3 = '#999'
const LINE = '#e6e3dd'
const RADIUS = 16
const RADIUS_SM = 12
const FONT = '-apple-system, BlinkMacSystemFont, sans-serif'

/* ─── Normes scientifiques par sexe et tranche d'âge ────────────────────────
   Sources : Cooper (1968), ACSM Guidelines for Exercise Testing (11e éd. 2021),
   McGill (2002), NSCA, YMCA Fitness Testing, Rikli & Jones (2013).
   Niveau de preuve : moyennes de population, recommandations consensuelles.
   Limite : ne remplacent pas un test en laboratoire (ex. ergospirométrie pour le VO2max). */
function ageGroup(age) {
  const a = Number(age) || 30
  if (a < 30) return '20-29'
  if (a < 40) return '30-39'
  if (a < 50) return '40-49'
  if (a < 60) return '50-59'
  return '60+'
}

// Seuils : [Excellent, Bien, Acceptable, Faible]
const NORMS = {
  cooper: {
    h: { '20-29': [2800, 2400, 2000, 1600], '30-39': [2700, 2300, 1900, 1500], '40-49': [2500, 2100, 1750, 1400], '50-59': [2300, 1950, 1600, 1300], '60+': [2100, 1800, 1450, 1200] },
    f: { '20-29': [2300, 2000, 1700, 1400], '30-39': [2200, 1900, 1600, 1350], '40-49': [2100, 1800, 1500, 1300], '50-59': [1900, 1650, 1400, 1200], '60+': [1700, 1500, 1300, 1100] },
  },
  gai_max: {
    h: { '20-29': [180, 120, 60, 30], '30-39': [170, 115, 58, 28], '40-49': [160, 105, 55, 25], '50-59': [145, 95, 50, 22], '60+': [130, 85, 45, 20] },
    f: { '20-29': [150, 100, 45, 22], '30-39': [140, 95, 43, 20], '40-49': [130, 85, 40, 18], '50-59': [115, 75, 35, 16], '60+': [100, 65, 30, 14] },
  },
  squat30: {
    h: { '20-29': [25, 20, 15, 10], '30-39': [24, 19, 14, 9], '40-49': [22, 17, 13, 8], '50-59': [20, 15, 11, 7], '60+': [18, 13, 9, 5] },
    f: { '20-29': [22, 17, 13, 8], '30-39': [21, 16, 12, 7], '40-49': [19, 14, 10, 6], '50-59': [17, 12, 9, 5], '60+': [15, 10, 7, 4] },
  },
  souplesse: {
    h: { '20-29': [40, 34, 17, 0], '30-39': [38, 32, 15, -2], '40-49': [35, 28, 12, -4], '50-59': [32, 24, 8, -6], '60+': [28, 20, 4, -8] },
    f: { '20-29': [41, 37, 23, 10], '30-39': [39, 35, 21, 8], '40-49': [37, 32, 18, 5], '50-59': [34, 29, 15, 2], '60+': [31, 26, 12, -1] },
  },
  push30: {
    h: { '20-29': [36, 29, 22, 14], '30-39': [33, 26, 19, 12], '40-49': [29, 22, 16, 10], '50-59': [25, 18, 13, 8], '60+': [20, 14, 10, 6] },
    f: { '20-29': [30, 23, 17, 10], '30-39': [27, 21, 15, 9], '40-49': [24, 18, 13, 7], '50-59': [21, 15, 11, 6], '60+': [17, 12, 8, 4] },
  },
}

const LEVEL_COLORS = { Excellent: '#4a8a6a', Bien: '#7a9a4a', Acceptable: '#c4a03a', Faible: '#c47a3a', 'Très faible': '#c4503a' }
const LEVEL_SCORES = { Excellent: 5, Bien: 4, Acceptable: 3, Faible: 2, 'Très faible': 1 }

function makeInterpret(testId) {
  return (val, sexe, age) => {
    const v = Number(val)
    const sx = sexe === 'f' ? 'f' : 'h'
    const grp = ageGroup(age)
    const table = (NORMS[testId] && NORMS[testId][sx] && NORMS[testId][sx][grp]) || NORMS[testId].h['20-29']
    let lvl
    if (v >= table[0]) lvl = 'Excellent'
    else if (v >= table[1]) lvl = 'Bien'
    else if (v >= table[2]) lvl = 'Acceptable'
    else if (v >= table[3]) lvl = 'Faible'
    else lvl = 'Très faible'
    return { level: lvl, color: LEVEL_COLORS[lvl], score: LEVEL_SCORES[lvl] }
  }
}

export const TESTS_DEF = [
  { id: 'cooper', label: 'Test de Cooper', unit: 'm', icon: 'route', color: '#e07b54', input: { type: 'number', min: 500, max: 5000, step: 50, placeholder: 'Distance en mètres' },
    protocol: "Courir 12 minutes à allure maximale sur terrain plat. Mesurer la distance. VO₂max ≈ (d – 504,9) / 44,73. Source : Cooper (1968), ACSM Guidelines (2021).",
    interpret: makeInterpret('cooper'), vo2max: (val) => Math.round((Number(val) - 504.9) / 44.73) },
  { id: 'gai_max', label: 'Gainage ventral max', unit: 's', icon: 'layers', color: '#5b6fa5', input: { type: 'number', min: 0, max: 600, step: 5, placeholder: 'Durée en secondes' },
    protocol: 'Position planche avant-bras, corps aligné. Maintenir le plus longtemps possible sans compensation. Source : McGill (2002), NSCA.',
    interpret: makeInterpret('gai_max') },
  { id: 'squat30', label: 'Squats 30 secondes', unit: 'rép.', icon: 'bolt', color: '#7a5fa5', input: { type: 'number', min: 0, max: 80, step: 1, placeholder: 'Nombre de répétitions' },
    protocol: 'Pieds écartés, descendre cuisses parallèles au sol, remonter complet. Maximum en 30s. Source : YMCA, Rikli & Jones (2013).',
    interpret: makeInterpret('squat30') },
  { id: 'souplesse', label: 'Sit & Reach', unit: 'cm', icon: 'target', color: '#5b8a72', input: { type: 'number', min: -30, max: 40, step: 1, placeholder: 'cm (+ = au-delà des pieds)' },
    protocol: 'Assis, jambes tendues, se pencher le plus loin possible. + = au-delà des pieds, - = en-deçà. Source : ACSM (2021), Wells & Dillon (1952).',
    interpret: makeInterpret('souplesse') },
  { id: 'push30', label: 'Pompes 30 secondes', unit: 'rép.', icon: 'dumbbell', color: '#a55b5b', input: { type: 'number', min: 0, max: 80, step: 1, placeholder: 'Nombre de répétitions' },
    protocol: "Pompes standard ou sur genoux. Descendre jusqu'au contact de poitrine, remonter bras tendus. Maximum en 30s. Source : YMCA, NSCA.",
    interpret: makeInterpret('push30') },
]

function isoToday() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60
  return m ? m + "'" + String(s).padStart(2, '0') + '"' : s + '"'
}

const FLOW_STYLE = { position: 'fixed', inset: 0, background: '#faf9f5', zIndex: 55, display: 'flex', flexDirection: 'column', padding: '20px 22px', fontFamily: FONT, overflowY: 'auto', animation: 'spaceIn .22s ease' }

function ProfileBadge({ sexe, age, onEdit }) {
  const label = (sexe === 'f' ? 'Femme' : 'Homme') + ' · ' + ageGroup(age) + ' ans'
  return React.createElement('button', { onClick: onEdit, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, background: SURFACE, border: `1px solid ${LINE}`, cursor: 'pointer', marginBottom: 14, alignSelf: 'flex-start' } },
    React.createElement(Icon, { name: 'user', size: 14, color: INK3 }),
    React.createElement('span', { style: { fontSize: 12.5, fontWeight: 600, color: INK2 } }, label),
    React.createElement('span', { style: { fontSize: 11.5, color: TESTS_COLOR, fontWeight: 700, marginLeft: 2 } }, 'Modifier'))
}

function QuickProfileSheet({ sexe, age, onSave, onClose }) {
  const [sx, setSx] = useState(sexe || 'h')
  const [ag, setAg] = useState(age || 30)
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end' } },
    React.createElement('div', { style: { width: '100%', background: SURFACE, borderRadius: '24px 24px 0 0', padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto' } },
      React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 19, marginBottom: 6 } }, 'Ton profil'),
      React.createElement('div', { style: { fontSize: 13.5, color: INK3, marginBottom: 18, lineHeight: 1.4 } }, 'Pour calculer des normes adaptées et comparables à ta tranche de population.'),
      React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Sexe'),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          ['h', 'f'].map((v) => {
            const active = sx === v
            return React.createElement('button', { key: v, onClick: () => setSx(v),
              style: { flex: 1, padding: 14, borderRadius: RADIUS_SM, fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
                border: active ? `1.5px solid ${TESTS_COLOR}` : `1.5px solid ${LINE}`,
                background: active ? `color-mix(in srgb, ${TESTS_COLOR} 8%, ${SURFACE})` : SURFACE,
                color: active ? TESTS_COLOR : INK } }, v === 'h' ? 'Homme' : 'Femme')
          }))),
      React.createElement('div', { style: { marginBottom: 20 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Âge'),
        React.createElement('input', { type: 'number', min: 14, max: 100, value: ag, onChange: (e) => setAg(e.target.value),
          style: { width: '100%', padding: '13px 15px', borderRadius: RADIUS_SM, border: `1.5px solid ${LINE}`, background: '#faf9f5', color: INK, fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })),
      React.createElement('div', { style: { display: 'flex', gap: 10 } },
        React.createElement('button', { onClick: onClose, style: { flex: 1, padding: 15, borderRadius: 999, background: SURFACE, border: `1px solid ${LINE}`, color: INK, fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Annuler'),
        React.createElement('button', { onClick: () => onSave(sx, Number(ag) || 30), style: { flex: 1, padding: 15, borderRadius: 999, background: TESTS_COLOR, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Enregistrer'))))
}

function Timer({ onDone }) {
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecs((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const m = Math.floor(secs / 60), s = secs % 60
  const display = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')

  return React.createElement('div', { style: { textAlign: 'center', padding: '20px 0' } },
    React.createElement('div', { style: { fontFamily: FONT, fontSize: 56, fontWeight: 700, letterSpacing: '-.02em', color: running ? TESTS_COLOR : INK, lineHeight: 1 } }, display),
    React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 } },
      React.createElement('button', { onClick: () => setRunning((r) => !r),
        style: { flex: 1, padding: 14, borderRadius: 999, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', background: running ? SURFACE2 : TESTS_COLOR, color: running ? INK : '#fff' } },
        running ? 'Pause' : secs === 0 ? 'Démarrer' : 'Reprendre'),
      secs > 0 && React.createElement('button', { onClick: () => { setRunning(false); onDone && onDone(secs) },
        style: { padding: '14px 20px', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: SURFACE, border: `1.5px solid ${LINE}`, color: INK } }, 'Valider'),
      secs > 0 && React.createElement('button', { onClick: () => { setSecs(0); setRunning(false) },
        style: { padding: '14px 20px', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: SURFACE, border: `1.5px solid ${LINE}`, color: INK3 } }, '↺')))
}

// ============================================================
// Recommandations par test et par niveau (Sources : McGill 2002 pour le
// gainage, ACSM 2021, NSCA, YMCA). Les boutons de séance de l'ancienne
// app (renfo-bas, mob-hanches15, etc.) pointaient vers la bibliothèque
// de séances "Renforcement" — pas encore portée, donc seul le message
// contextuel est affiché ici pour l'instant.
// ============================================================
const TEST_RECO = {
  cooper: {
    Excellent: 'Endurance excellente. Maintiens avec 2 séances cardio/sem.',
    Bien: 'Bonne endurance aérobie. Renforce les fondations musculaires pour progresser.',
    Acceptable: 'Endurance à développer. Priorité : séances longues à intensité modérée + renfo général.',
    Faible: 'Endurance insuffisante. Commence par des séances courtes progressives et travaille la mobilité.',
    'Très faible': 'Endurance très basse. Starts progressifs essentiels — mobilité d’abord, puis renfo léger.',
  },
  gai_max: {
    Excellent: 'Stabilité du core excellente. Maintiens avec du renfo anti-rotation.',
    Bien: 'Bon gainage. Progresse avec des exercices anti-rotation et charge additionnelle.',
    Acceptable: 'Gainage à améliorer. Le core est la base de toute performance — travaille-le avant les charges lourdes.',
    Faible: 'Stabilité lombo-pelvienne insuffisante (McGill 2002). Risque de compensation et blessure lombaire. Priorité absolue.',
    'Très faible': 'Core très faible — évite les charges lourdes sur le dos tant que le gainage n’est pas établi. Commence doucement.',
  },
  squat30: {
    Excellent: 'Très bonne puissance des membres inférieurs. Ajoute de la plyométrie pour encore progresser.',
    Bien: 'Bonne force du bas du corps. Travaille la mobilité des hanches et chevilles pour aller plus loin.',
    Acceptable: 'Force des jambes à améliorer. Combine renfo bas du corps et mobilité pour progresser efficacement.',
    Faible: 'Force et/ou mobilité membres inférieurs insuffisantes. Commence par la mobilité chevilles/hanches avant de charger.',
    'Très faible': 'Commence par la mobilité articulaire avant tout renforcement chargé — risque de compensation.',
  },
  souplesse: {
    Excellent: 'Très bonne amplitude articulaire. Maintiens avec des étirements réguliers.',
    Bien: 'Bonne souplesse. Quelques séances de mobilité globale pour maintenir.',
    Acceptable: 'Amplitude à améliorer. La mobilité conditionne la qualité de tes mouvements de renfo.',
    Faible: 'Souplesse insuffisante — les compensations au renfo risquent de créer des déséquilibres. Mobilité en priorité.',
    'Très faible': 'Amplitude très réduite. Fais de la mobilité quotidiennement (10–15 min) avant toute séance de renfo.',
  },
  push30: {
    Excellent: 'Très bonne force du haut du corps. Varie les stimuli avec des exercices instables ou lestés.',
    Bien: 'Bonne force bras/épaules. Ajoute du renfo épaules et mobilité thoracique.',
    Acceptable: 'Force du haut à développer. Travaille aussi la mobilité épaules/thoracique pour progresser sans blesser.',
    Faible: 'Force membres supérieurs insuffisante. Commence par le poids du corps avec une forme parfaite.',
    'Très faible': 'Commence par la mobilité des épaules et un renfo léger progressif — pas de charges lourdes.',
  },
}

function RecoSessions({ testId, level }) {
  const msg = TEST_RECO[testId] && TEST_RECO[testId][level]
  if (!msg) return null
  const isGood = level === 'Excellent' || level === 'Bien'
  const isWarn = level === 'Acceptable'
  const tint = isGood ? '#4a8a6a' : isWarn ? '#c4a03a' : '#c4503a'
  return React.createElement('div', { style: { marginTop: 18, padding: '14px 16px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${tint} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${tint} 24%, ${LINE})`, lineHeight: 1.5, textAlign: 'left' } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: tint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 } }, isGood ? 'Très bien' : isWarn ? 'Axe de progression' : 'Priorité'),
    React.createElement('div', { style: { fontSize: 13.5, color: INK2 } }, msg))
}

function TestDetail({ def, history, sexe, age, onSave, onDelete, onBack }) {
  const [val, setVal] = useState('')
  const [step, setStep] = useState('protocol')
  const [timerVal, setTimerVal] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const isTimer = def.unit === 's'
  const interp = val !== '' ? def.interpret(val, sexe, age) : null
  const last = history && history.length > 0 ? history[history.length - 1] : null
  const prev = history && history.length > 1 ? history[history.length - 2] : null

  function handleSave() {
    if (val === '' || isNaN(Number(val))) return
    onSave({ testId: def.id, value: Number(val), date: isoToday(), unit: def.unit })
    setStep('saved')
  }

  if (step === 'saved') {
    const si = def.interpret(val, sexe, age)
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
      React.createElement('button', { onClick: onBack, style: { alignSelf: 'flex-start', marginBottom: 20, padding: '8px 14px', borderRadius: 999, background: SURFACE, border: `1.5px solid ${LINE}`, color: INK, fontSize: 14, fontWeight: 600, cursor: 'pointer' } }, '← Retour'),
      React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' } },
        React.createElement('div', { style: { width: 80, height: 80, borderRadius: 999, margin: '0 auto 20px', background: `color-mix(in srgb, ${si.color} 15%, ${SURFACE})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement('div', { style: { fontFamily: FONT, fontSize: 26, fontWeight: 800, color: si.color } }, '✓')),
        React.createElement('div', { style: { fontFamily: FONT, fontSize: 28, fontWeight: 700, marginBottom: 8 } }, 'Enregistré !'),
        React.createElement('div', { style: { fontSize: 20, fontWeight: 700, color: si.color, marginBottom: 6 } }, val + ' ' + def.unit),
        React.createElement('div', { style: { display: 'inline-block', padding: '6px 16px', borderRadius: 999, fontWeight: 700, fontSize: 15, marginBottom: 16, background: `color-mix(in srgb, ${si.color} 14%, ${SURFACE})`, color: si.color } }, si.level),
        def.vo2max && React.createElement('div', { style: { fontSize: 14, color: INK2, marginBottom: 12 } }, 'VO₂max estimé : ' + def.vo2max(val) + ' mL/kg/min'),
        React.createElement('div', { style: { fontSize: 12, color: INK3, marginBottom: 16 } }, 'Norme appliquée : ' + (sexe === 'f' ? 'Femme' : 'Homme') + ' · ' + ageGroup(age) + ' ans'),
        React.createElement(RecoSessions, { testId: def.id, level: si.level }),
        React.createElement('button', { onClick: onBack, style: { padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 8, background: TESTS_COLOR, color: '#fff' } }, 'Voir tous les tests')))
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 } },
      React.createElement('button', { onClick: onBack, style: { width: 38, height: 38, borderRadius: 999, cursor: 'pointer', flexShrink: 0, background: SURFACE, border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement(Icon, { name: 'back', size: 18 })),
      React.createElement('div', null,
        React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 19 } }, def.label),
        React.createElement('div', { style: { fontSize: 13, color: INK3 } }, def.unit === 's' ? 'Temps · Chronométré' : 'Résultat · Valeur saisie'))),

    React.createElement('div', { style: { display: 'flex', gap: 6, background: SURFACE2, padding: 4, borderRadius: 999, marginBottom: 18 } },
      ['protocol', 'do'].map((s) => {
        const active = step === s
        return React.createElement('button', { key: s, onClick: () => setStep(s),
          style: { flex: 1, padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .15s', color: active ? '#fff' : INK2, background: active ? TESTS_COLOR : 'transparent' } },
          s === 'protocol' ? 'Protocole' : 'Passer le test')
      })),

    step === 'protocol' && React.createElement('div', null,
      React.createElement('div', { style: { padding: 20, borderRadius: RADIUS, background: def.color, color: '#fff', marginBottom: 16 } },
        React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
          React.createElement(Icon, { name: def.icon, size: 24, color: '#fff' })),
        React.createElement('div', { style: { fontFamily: FONT, fontSize: 21, fontWeight: 700, lineHeight: 1.1 } }, def.label),
        React.createElement('p', { style: { fontSize: 14, opacity: .92, marginTop: 8, lineHeight: 1.5 } }, def.protocol),
        React.createElement('div', { style: { marginTop: 12, fontSize: 12.5, opacity: .85, fontWeight: 600 } }, 'Normes : ' + (sexe === 'f' ? 'Femme' : 'Homme') + ' · ' + ageGroup(age) + ' ans')),

      last
        ? React.createElement('div', { style: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, padding: 16, marginBottom: 14 } },
            React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 12 } }, 'Dernier résultat'),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
              React.createElement('div', { style: { fontFamily: FONT, fontSize: 32, fontWeight: 700, color: def.interpret(last.value, sexe, age).color, lineHeight: 1 } }, last.value),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 13, color: INK3 } }, def.unit + ' · ' + fmtDate(last.date)),
                React.createElement('div', { style: { display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12.5, marginTop: 4, background: `color-mix(in srgb, ${def.interpret(last.value, sexe, age).color} 14%, ${SURFACE})`, color: def.interpret(last.value, sexe, age).color } }, def.interpret(last.value, sexe, age).level))),
            prev && React.createElement('div', { style: { marginTop: 12, padding: '10px 0 0', borderTop: `1px solid ${LINE}`, fontSize: 13, color: INK3 } },
              'Précédent : ', React.createElement('strong', { style: { color: INK } }, prev.value + ' ' + def.unit), ' · ' + fmtDate(prev.date)))
        : React.createElement('div', { style: { padding: '14px 16px', borderRadius: RADIUS_SM, marginBottom: 14, fontSize: 13.5, color: INK2, background: `color-mix(in srgb, ${TESTS_COLOR} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${TESTS_COLOR} 22%, ${LINE})` } }, 'Aucun résultat encore — passe ce test pour établir ta référence.'),

      history && history.length > 0 && React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('button', { onClick: () => setShowHistory(!showHistory), style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px', background: 'transparent', border: 'none', cursor: 'pointer' } },
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em' } }, `Historique (${history.length})`),
          React.createElement(Icon, { name: 'arrow', size: 14, color: INK3, style: { display: 'inline-block', transform: showHistory ? 'rotate(-90deg)' : 'rotate(90deg)' } })),
        showHistory && React.createElement('div', { style: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, overflow: 'hidden' } },
          history.slice().reverse().map((t, i) => {
            const lv = def.interpret(t.value, sexe, age)
            return React.createElement('div', { key: t.date + i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 ? `1px solid ${LINE}` : 'none' } },
              React.createElement('div', { style: { flex: 1 } },
                React.createElement('span', { style: { fontWeight: 700, color: lv.color } }, t.value + ' ' + def.unit),
                React.createElement('span', { style: { fontSize: 12.5, color: INK3, marginLeft: 8 } }, fmtDate(t.date))),
              onDelete && React.createElement('button', { onClick: () => onDelete(t.date), 'aria-label': 'Supprimer ce résultat', style: { width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent', color: INK3, fontSize: 15, cursor: 'pointer', flex: '0 0 auto' } }, '✕'))
          }))),

      React.createElement('button', { onClick: () => setStep('do'), style: { width: '100%', padding: 16, borderRadius: 999, fontSize: 15.5, fontWeight: 700, border: 'none', cursor: 'pointer', background: TESTS_COLOR, color: '#fff', boxShadow: `0 12px 26px -14px ${TESTS_COLOR}` } }, 'Passer le test maintenant →')),

    step === 'do' && React.createElement('div', null,
      isTimer && React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: INK2, marginBottom: 12, textAlign: 'center' } }, 'Lance le chrono, maintiens la position'),
        React.createElement(Timer, { onDone: (s) => { setTimerVal(s); setVal(String(s)) } }),
        timerVal && React.createElement('div', { style: { fontSize: 13, color: INK3, textAlign: 'center', marginTop: 6 } }, 'Chrono validé : ' + fmtDuration(timerVal))),

      React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('label', { style: { display: 'block' } },
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em' } }, isTimer ? 'Durée (secondes)' : 'Saisir le résultat'),
          React.createElement('div', { style: { position: 'relative' } },
            React.createElement('input', { type: def.input.type, min: def.input.min, max: def.input.max, step: def.input.step, placeholder: def.input.placeholder, value: val, onChange: (e) => setVal(e.target.value),
              style: { width: '100%', marginTop: 6, padding: '14px 70px 14px 15px', borderRadius: RADIUS_SM, border: `1.5px solid ${LINE}`, background: '#faf9f5', color: INK, fontSize: 20, fontWeight: 700, outline: 'none', boxSizing: 'border-box' } }),
            React.createElement('span', { style: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: INK3, fontWeight: 600, pointerEvents: 'none' } }, def.unit)))),

      interp && val !== '' && React.createElement('div', { style: { padding: 16, borderRadius: RADIUS_SM, marginBottom: 16, background: `color-mix(in srgb, ${interp.color} 10%, ${SURFACE})`, border: `1.5px solid color-mix(in srgb, ${interp.color} 30%, ${LINE})` } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Ton niveau'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          React.createElement('div', { style: { fontSize: 24, fontWeight: 700, color: interp.color, fontFamily: FONT } }, interp.level),
          def.vo2max && React.createElement('div', { style: { fontSize: 13, color: INK3 } }, '· VO₂max ~' + def.vo2max(val) + ' mL/kg/min')),
        React.createElement('div', { style: { display: 'flex', gap: 4, marginTop: 12 } },
          [1, 2, 3, 4, 5].map((n) => React.createElement('div', { key: n, style: { flex: 1, height: 6, borderRadius: 999, transition: 'background .3s', background: n <= interp.score ? interp.color : SURFACE2 } })))),

      React.createElement('button', { onClick: handleSave, disabled: val === '' || isNaN(Number(val)),
        style: { width: '100%', padding: 16, borderRadius: 999, fontSize: 15.5, fontWeight: 700, border: 'none', cursor: val !== '' && !isNaN(Number(val)) ? 'pointer' : 'default', transition: 'all .2s',
          background: val !== '' && !isNaN(Number(val)) ? TESTS_COLOR : SURFACE2, color: val !== '' && !isNaN(Number(val)) ? '#fff' : INK3 } }, 'Enregistrer le résultat')))
}

export default function PhysicalTestsSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [sel, setSel] = useState(null)
  const [profOpen, setProfOpen] = useState(false)

  if (loading) {
    return React.createElement('div', { style: { minHeight: '100vh', background: '#faf9f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK3, fontFamily: FONT } }, 'Chargement...')
  }

  const profilePhys = db.profilePhys || {}
  const sexe = profilePhys.sexe === 'f' ? 'f' : 'h'
  const age = Number(profilePhys.age) || 30
  const hasProfile = !!(profilePhys.sexe && profilePhys.age)

  const tests = db.physTests || []

  function saveTest(entry) {
    const existing = (db.physTests || []).filter((t) => !(t.testId === entry.testId && t.date === entry.date))
    store.set({ physTests: existing.concat([entry]) })
  }
  function deleteTest(testId, date) {
    store.set({ physTests: (db.physTests || []).filter((t) => !(t.testId === testId && t.date === date)) })
  }
  function saveProfile(sx, ag) {
    store.set((st) => ({ profilePhys: { ...(st.profilePhys || {}), sexe: sx, age: ag } }))
    setProfOpen(false)
  }
  function historyFor(id) {
    return tests.filter((t) => t.testId === id).sort((a, b) => a.date.localeCompare(b.date))
  }
  function globalScore() {
    const byId = {}
    tests.forEach((t) => { if (!byId[t.testId] || t.date > byId[t.testId].date) byId[t.testId] = t })
    const ids = Object.keys(byId)
    if (ids.length === 0) return null
    let sum = 0
    ids.forEach((tid) => {
      const def = TESTS_DEF.find((d) => d.id === tid)
      if (!def) return
      sum += def.interpret(byId[tid].value, sexe, age).score
    })
    return Math.round((sum / ids.length) / 5 * 100)
  }

  if (sel) {
    const def = TESTS_DEF.find((d) => d.id === sel)
    return React.createElement('div', { style: FLOW_STYLE },
      React.createElement(TestDetail, { def, history: historyFor(sel), sexe, age, onSave: saveTest, onDelete: (date) => deleteTest(sel, date), onBack: () => setSel(null) }))
  }

  const score = globalScore()

  return React.createElement('div', { style: FLOW_STYLE },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 } },
      React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: '-.01em' } }, 'Tests physiques'),
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, cursor: 'pointer', background: SURFACE, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement(Icon, { name: 'close', size: 18 }))),

    React.createElement(ProfileBadge, { sexe, age, onEdit: () => setProfOpen(true) }),

    !hasProfile && React.createElement('div', { style: { padding: '12px 14px', borderRadius: RADIUS_SM, marginBottom: 14, fontSize: 13, color: INK2, background: 'color-mix(in srgb, #c4a03a 10%, #fff)', border: '1px solid color-mix(in srgb, #c4a03a 25%, #e6e3dd)' } },
      'Profil par défaut utilisé (Homme, 20-29 ans). Renseigne ton sexe et ton âge pour des normes précises.'),

    React.createElement('div', { style: { padding: 20, borderRadius: RADIUS, background: TESTS_COLOR, color: '#fff', marginBottom: 18, flexShrink: 0 } },
      score !== null
        ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
            React.createElement('div', { style: { width: 64, height: 64, borderRadius: 999, flex: '0 0 auto', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              React.createElement('div', { style: { fontFamily: FONT, fontSize: 22, fontWeight: 800 } }, score)),
            React.createElement('div', null,
              React.createElement('div', { style: { fontFamily: FONT, fontSize: 18, fontWeight: 700 } }, 'Score condition physique'),
              React.createElement('p', { style: { fontSize: 13, opacity: .9, marginTop: 4 } }, 'Basé sur tes derniers résultats, ajusté à ton profil')))
        : React.createElement('div', null,
            React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
              React.createElement(Icon, { name: 'chart', size: 24, color: '#fff' })),
            React.createElement('div', { style: { fontFamily: FONT, fontSize: 22, fontWeight: 700, lineHeight: 1.1 } }, 'Évalue ta condition physique'),
            React.createElement('p', { style: { fontSize: 14, opacity: .92, marginTop: 8, lineHeight: 1.5 } }, '5 tests validés scientifiquement, avec normes ajustées à ton sexe et ton âge.'))),

    React.createElement('div', { style: { flex: 1, overflowY: 'auto' } },
      TESTS_DEF.map((def) => {
        const hist = historyFor(def.id)
        const last = hist.length > 0 ? hist[hist.length - 1] : null
        const interp = last ? def.interpret(last.value, sexe, age) : null
        const prev = hist.length > 1 ? hist[hist.length - 2] : null
        const delta = last && prev ? last.value - prev.value : null

        return React.createElement('button', { key: def.id, onClick: () => setSel(def.id),
          style: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: 16, cursor: 'pointer',
            borderRadius: RADIUS_SM, border: '1.5px solid ' + (interp ? `color-mix(in srgb, ${interp.color} 30%, ${LINE})` : LINE), background: SURFACE, marginBottom: 10 } },
          React.createElement('div', { style: { width: 52, height: 52, borderRadius: 14, flex: '0 0 auto', background: `color-mix(in srgb, ${def.color} 14%, ${SURFACE})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement(Icon, { name: def.icon, size: 24, color: def.color })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontFamily: FONT, fontWeight: 600, fontSize: 16, marginBottom: 2 } }, def.label),
            last
              ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  React.createElement('span', { style: { fontSize: 15, fontWeight: 700, color: interp.color } }, last.value + ' ' + def.unit),
                  React.createElement('span', { style: { fontSize: 12, padding: '2px 9px', borderRadius: 999, fontWeight: 700, background: `color-mix(in srgb, ${interp.color} 12%, ${SURFACE})`, color: interp.color } }, interp.level),
                  delta !== null && React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: delta >= 0 ? '#4a8a6a' : '#c4503a' } }, (delta >= 0 ? '▲+' : '▼') + delta + ' vs précédent'))
              : React.createElement('div', { style: { fontSize: 13, color: INK3 } }, 'Pas encore réalisé · ' + def.unit)),
          React.createElement(Icon, { name: 'arrow', size: 19, color: INK3 }))
      })),

    profOpen && React.createElement(QuickProfileSheet, { sexe, age, onSave: saveProfile, onClose: () => setProfOpen(false) }))
}
