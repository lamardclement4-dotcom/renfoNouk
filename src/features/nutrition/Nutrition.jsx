import React, { useState } from 'react'
import { FOODS, BOISSONS, COURSE_REF, DIAG_QUESTIONS, PILIERS } from './nutritionData'
import { buildConseils } from './diagEngine'
import { useNutritionStore } from './useNutritionStore'

// ============================================================
// Design tokens (équivalent des CSS custom properties de
// l'ancienne app, ramenés aux valeurs littérales déjà utilisées
// dans App.jsx pour rester cohérent visuellement).
// ============================================================
const NUTRI = '#c25a3f'
const DANGER = '#c0392b'
const SURFACE = '#fff'
const SURFACE2 = '#f5f4ef'
const INK = '#2b2b2b'
const INK2 = '#666'
const INK3 = '#999'
const LINE = '#e6e3dd'
const RADIUS = 16
const RADIUS_SM = 12
const FONT = '-apple-system, BlinkMacSystemFont, sans-serif'

const xst = {
  flow: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#faf9f5', fontFamily: FONT },
  primaryBtn: { padding: '13px 20px', borderRadius: RADIUS_SM, border: 'none', color: '#fff', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', width: '100%' },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15, marginTop: 8, width: '100%', boxSizing: 'border-box' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, border: 'none', background: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto' },
  ghostBtn: { padding: '12px 16px', borderRadius: RADIUS_SM, border: '1.5px solid #ddd', background: 'transparent', color: INK, fontWeight: 600, cursor: 'pointer' },
  optBtn: { display: 'flex', alignItems: 'center', borderRadius: RADIUS_SM, border: `1px solid ${LINE}`, background: SURFACE },
  sheetWrap: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'flex-end', zIndex: 50 },
  sheet: { background: SURFACE, borderRadius: '20px 20px 0 0', padding: '20px 18px 28px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' },
}

const ICONS = {
  apple: '🍎', flame: '🔥', layers: '📊', route: '🏁', clock: '🕐', search: '🔍', check: '✓',
  moon: '🌙', heart: '❤', bolt: '⚡', leaf: '🌿', drop: '💧', droplet: '💧', alert: '⚠',
  spark: '✨', target: '🎯', user: '👤', battery: '🔋', zap: '⚡', cup: '☕', glass: '🥤',
  bottle: '🧴', back: '←', next: '→', prev: '←', arrow: '→', close: '✕',
}
function Icon({ name, size = 16, color }) {
  return React.createElement('span', { style: { fontSize: size, lineHeight: 1, color, display: 'inline-block' } }, ICONS[name] || '•')
}

function FlowHeader({ title, onClose }) {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${LINE}`, background: SURFACE } },
    React.createElement('button', { onClick: onClose, style: xst.iconBtn, 'aria-label': 'Retour' }, React.createElement(Icon, { name: 'back', size: 18 })),
    React.createElement('div', { style: { fontWeight: 700, fontSize: 18, color: INK } }, title))
}

// ============================================================
// Composants partagés (portés de l'ancienne app)
// ============================================================
function SpaceBanner({ ic, tint, title, text }) {
  return React.createElement('div', { style: { padding: 20, borderRadius: RADIUS, background: tint, color: '#fff', marginBottom: 18 } },
    React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
      React.createElement(Icon, { name: ic, size: 24, color: '#fff' })),
    React.createElement('div', { style: { fontFamily: FONT, fontSize: 23, fontWeight: 700, lineHeight: 1.1 } }, title),
    React.createElement('p', { style: { fontSize: 14.5, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, text))
}
function SecLab({ children, style }) {
  return React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '16px 2px 8px', ...style } }, children)
}
function NoteBox({ tint, children }) {
  return React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${tint} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${tint} 25%, ${LINE})`, fontSize: 12.5, color: INK2, lineHeight: 1.5, marginTop: 14 } },
    React.createElement('span', { style: { color: tint, fontWeight: 800, flex: '0 0 auto' } }, '!'),
    React.createElement('span', null, children))
}
function NumField({ label, value, set, unit, min, max }) {
  return React.createElement('label', { style: { display: 'block', flex: 1 } },
    React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK3 } }, label),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
      React.createElement('input', { type: 'number', value, min, max, onChange: (e) => set(Number(e.target.value)), style: { ...xst.input, marginTop: 4 } }),
      unit && React.createElement('span', { style: { fontSize: 12.5, color: INK3, flex: '0 0 auto' } }, unit)))
}
function Choice({ tint, value, set, options, multi }) {
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
    options.map((o) => {
      const active = multi ? (value || []).includes(o.id) : value === o.id
      return React.createElement('button', {
        key: o.id, type: 'button', onClick: () => set(o.id),
        style: { padding: '10px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600,
          border: '1.5px solid ' + (active ? tint : '#ddd'),
          background: active ? `color-mix(in srgb, ${tint} 12%, ${SURFACE})` : SURFACE,
          color: active ? tint : INK2, cursor: 'pointer' },
      }, o.lab)
    }))
}
function ResultCard({ label, value, sub, tint, big }) {
  return React.createElement('div', { style: { flex: 1, padding: big ? '18px 14px' : '14px 12px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${tint} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${tint} 22%, ${LINE})`, textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: big ? 22 : 17, fontWeight: 800, color: tint, fontFamily: FONT } }, value),
    React.createElement('div', { style: { fontSize: 11, color: INK3, marginTop: 3 } }, label),
    sub && React.createElement('div', { style: { fontSize: 10.5, color: INK3, marginTop: 1 } }, sub))
}
function Pill({ tint, children }) {
  return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: tint, background: `color-mix(in srgb, ${tint} 12%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${tint} 30%, ${LINE})` } }, children)
}
function Bar({ lab, val, target, unit, tint }) {
  const pct = target > 0 ? Math.min(1, val / target) : 0
  const over = target > 0 && val > target * 1.05
  return React.createElement('div', { style: { marginBottom: 11 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
      React.createElement('span', { style: { fontSize: 13, fontWeight: 700 } }, lab),
      React.createElement('span', { style: { fontSize: 12.5, color: INK2 } },
        React.createElement('strong', { style: { color: INK } }, Math.round(val)), target ? ' / ' + target : '', ' ', unit, target > 0 ? ' · ' + Math.round(pct * 100) + '%' : '')),
    React.createElement('div', { style: { height: 8, borderRadius: 999, background: SURFACE2, overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: pct * 100 + '%', background: over ? '#b5566a' : tint, borderRadius: 999, transition: 'width .3s ease' } })))
}
function chipBtn(active) {
  return { padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1.5px solid ' + (active ? NUTRI : '#ddd'), background: active ? `color-mix(in srgb, ${NUTRI} 12%, ${SURFACE})` : SURFACE, color: active ? NUTRI : INK2, cursor: 'pointer' }
}

// ============================================================
// Radar SVG du diagnostic
// ============================================================
function DiagRadar({ scores }) {
  const N = PILIERS.length
  const cx = 120, cy = 120, R = 88
  function pt(i, val) {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2
    const r = R * Math.max(0, Math.min(100, val || 0)) / 100
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }
  function ptOuter(i, extra) {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2
    return [cx + (R + (extra || 0)) * Math.cos(angle), cy + (R + (extra || 0)) * Math.sin(angle)]
  }
  const gridLevels = [20, 40, 60, 80, 100]
  const grids = gridLevels.map((v) => {
    const pts = PILIERS.map((_, i) => pt(i, v))
    const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + 'Z'
    return React.createElement('path', { key: 'g' + v, d, fill: 'none', stroke: LINE, strokeWidth: v === 100 ? 1.5 : 0.8, strokeDasharray: v === 100 ? 'none' : '3,3' })
  })
  const axes = PILIERS.map((p, i) => {
    const outer = ptOuter(i, 0)
    return React.createElement('line', { key: 'ax' + i, x1: cx, y1: cy, x2: outer[0].toFixed(1), y2: outer[1].toFixed(1), stroke: LINE, strokeWidth: 1 })
  })
  const dataPts = PILIERS.map((p, i) => pt(i, scores[p.id] >= 0 ? scores[p.id] : 0))
  const dataD = dataPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + 'Z'
  const dots = PILIERS.map((p, i) => {
    const sc = scores[p.id] || 0
    const col = sc >= 70 ? p.col : sc >= 45 ? '#e07b39' : '#b5566a'
    const dp = dataPts[i]
    return React.createElement('circle', { key: 'dot' + i, cx: dp[0].toFixed(1), cy: dp[1].toFixed(1), r: 5, fill: col, stroke: SURFACE, strokeWidth: 2 })
  })
  const labels = PILIERS.map((p, i) => {
    const lp = ptOuter(i, 26)
    const sc = scores[p.id] || 0
    const col = sc >= 70 ? p.col : sc >= 45 ? '#e07b39' : '#b5566a'
    return React.createElement('g', { key: 'lab' + i },
      React.createElement('text', { x: lp[0].toFixed(1), y: (lp[1] - 5).toFixed(1), textAnchor: 'middle', dominantBaseline: 'middle', fontSize: '9', fontWeight: '700', fill: col }, p.label),
      React.createElement('text', { x: lp[0].toFixed(1), y: (lp[1] + 7).toFixed(1), textAnchor: 'middle', dominantBaseline: 'middle', fontSize: '9', fontWeight: '800', fill: col }, sc + '/100'))
  })
  const tickLabels = [20, 40, 60, 80].map((v) => {
    const p = pt(2, v)
    return React.createElement('text', { key: 'tick' + v, x: (p[0] + 4).toFixed(1), y: p[1].toFixed(1), fontSize: '7.5', fill: INK3, dominantBaseline: 'middle' }, v)
  })
  return React.createElement('svg', { viewBox: '0 0 240 240', width: '100%', style: { maxWidth: 260, display: 'block', margin: '0 auto' } },
    React.createElement('g', null, grids), React.createElement('g', null, tickLabels), React.createElement('g', null, axes),
    React.createElement('path', { d: dataD, fill: NUTRI, fillOpacity: .15, stroke: NUTRI, strokeWidth: 2.5, strokeLinejoin: 'round' }),
    React.createElement('g', null, dots), React.createElement('g', null, labels))
}

// ============================================================
// Onglet Calories (Mifflin-St Jeor)
// ============================================================
function CaloriesTab({ body, setBody, onMacros }) {
  body = body || {}
  const [sex, _setSex] = useState(body.sexe || 'h')
  const [poids, _setPoids] = useState(body.poids || 70)
  const [taille, _setTaille] = useState(body.taille || 175)
  const [age, _setAge] = useState(body.age || 30)
  const [act, _setAct] = useState(body.act || 1.55)
  const [obj, _setObj] = useState(body.obj || 'maintien')
  const setSex = (v) => { _setSex(v); setBody({ sexe: v }) }
  const setPoids = (v) => { _setPoids(v); setBody({ poids: v }) }
  const setTaille = (v) => { _setTaille(v); setBody({ taille: v }) }
  const setAge = (v) => { _setAge(v); setBody({ age: v }) }
  const setAct = (v) => { _setAct(v); setBody({ act: v }) }
  const setObj = (v) => { _setObj(v); setBody({ obj: v }) }
  const valid = poids && taille && age
  const bmr = valid ? Math.round(10 * poids + 6.25 * taille - 5 * age + (sex === 'h' ? 5 : -161)) : 0
  const tdee = Math.round(bmr * act)
  const ADJ = { maintien: [1, 1], endurance: [1, 1.03], muscle: [1.05, 1.15], perte: [0.8, 0.9] }
  const FR = { maintien: 'équilibre', endurance: 'à hauteur de la dépense', muscle: 'léger surplus', perte: 'léger déficit · jamais sous le BMR' }
  const [lo, hi] = ADJ[obj]
  const cibLo = Math.round(tdee * lo), cibHi = Math.round(tdee * hi)
  const cible = cibLo === cibHi ? `${cibLo}` : `${cibLo}–${cibHi}`
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'apple', tint: NUTRI, title: 'Calories journalières', text: 'Estime ton métabolisme de base, ta dépense totale, puis ta cible selon ton objectif (Mifflin-St Jeor).' }),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: NUTRI, fontWeight: 600, margin: '-6px 2px 14px' } },
      React.createElement(Icon, { name: 'check', size: 14, color: NUTRI }), ' Profil sauvegardé et réutilisé dans tous les onglets.'),
    React.createElement(SecLab, null, 'Toi'),
    React.createElement(Choice, { tint: NUTRI, value: sex, set: setSex, options: [{ id: 'h', lab: 'Homme' }, { id: 'f', lab: 'Femme' }] }),
    React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 12 } },
      React.createElement(NumField, { label: 'Poids', unit: 'kg', value: poids, set: setPoids, min: 30, max: 200 }),
      React.createElement(NumField, { label: 'Taille', unit: 'cm', value: taille, set: setTaille, min: 120, max: 230 }),
      React.createElement(NumField, { label: 'Âge', unit: 'ans', value: age, set: setAge, min: 10, max: 100 })),
    React.createElement(SecLab, { style: { marginTop: 18 } }, "Niveau d'activité"),
    React.createElement(Choice, { tint: NUTRI, value: act, set: setAct, options: [
      { id: 1.2, lab: 'Sédentaire' }, { id: 1.375, lab: 'Léger' }, { id: 1.55, lab: 'Modéré' }, { id: 1.725, lab: 'Élevé' }, { id: 1.9, lab: 'Très élevé' },
    ] }),
    React.createElement('div', { style: { height: 16 } }),
    React.createElement(SecLab, null, 'Objectif'),
    React.createElement(Choice, { tint: NUTRI, value: obj, set: setObj, options: [
      { id: 'maintien', lab: 'Maintien' }, { id: 'endurance', lab: 'Endurance' }, { id: 'muscle', lab: 'Muscle' }, { id: 'perte', lab: 'Perte de gras' },
    ] }),
    valid && React.createElement('div', { style: { marginTop: 20 } },
      React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 10 } },
        React.createElement(ResultCard, { label: 'Métabolisme base', value: bmr, sub: 'kcal', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Dépense totale', value: tdee, sub: 'kcal / TDEE', tint: NUTRI })),
      React.createElement(ResultCard, { big: true, label: `Cible · ${obj === 'perte' ? 'perte de gras' : obj}`, value: cible + ' kcal', sub: FR[obj], tint: NUTRI }),
      React.createElement('button', { onClick: onMacros, style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginTop: 12 } }, 'Répartir en macros →')),
    React.createElement(NoteBox, { tint: NUTRI }, "Ne descends jamais sous ton métabolisme de base. Le déficit reste léger et encadré ; en cas de fatigue ou de cycle perturbé, remonte les apports et consulte. Repères indicatifs, pas un avis diététique."))
}

// ============================================================
// Onglet Macros (protéines/glucides ISSN)
// ============================================================
function MacrosTab({ body, setBody }) {
  body = body || {}
  const [poids, _setPoids] = useState(body.poids || 70)
  const [obj, _setObj] = useState(body.obj || 'maintien')
  const [vol, _setVol] = useState(body.vol || 'modere')
  const setPoids = (v) => { _setPoids(v); setBody({ poids: v }) }
  const setObj = (v) => { _setObj(v); setBody({ obj: v }) }
  const setVol = (v) => { _setVol(v); setBody({ vol: v }) }
  const PROT = { maintien: [1.2, 1.6], endurance: [1.4, 1.6], muscle: [1.6, 2], perte: [2, 2.4] }
  const CARB = { repos: [3, 5], modere: [5, 7], eleve: [6, 10], tres: [8, 12] }
  const cursor = obj === 'perte' ? 0 : obj === 'maintien' ? 0.5 : 1
  const FR = { maintien: 'équilibre énergétique', endurance: 'équilibre, + les gros jours', muscle: 'léger surplus', perte: 'léger déficit' }
  const valid = poids > 0
  const pr = PROT[obj], cr = CARB[vol]
  const prLo = Math.round(poids * pr[0]), prHi = Math.round(poids * pr[1])
  const carbLo = Math.round(poids * (obj === 'perte' ? cr[0] : obj === 'maintien' ? (cr[0] + cr[1]) / 2 - 0.5 : cr[1] - 1))
  const carbHi = Math.round(poids * (obj === 'perte' ? (cr[0] + cr[1]) / 2 : obj === 'maintien' ? (cr[0] + cr[1]) / 2 + 0.5 : cr[1]))
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'apple', tint: NUTRI, title: 'Protéines & glucides', text: "L'objectif pilote les protéines et le cadre énergétique ; les glucides se calent sur le volume du jour." }),
    React.createElement(SecLab, null, 'Poids'),
    React.createElement('div', { style: { display: 'flex', gap: 10 } }, React.createElement(NumField, { label: 'Poids du corps', unit: 'kg', value: poids, set: setPoids, min: 30, max: 200 })),
    React.createElement('div', { style: { height: 16 } }),
    React.createElement(SecLab, null, 'Objectif'),
    React.createElement(Choice, { tint: NUTRI, value: obj, set: setObj, options: [
      { id: 'maintien', lab: 'Maintien' }, { id: 'endurance', lab: 'Endurance' }, { id: 'muscle', lab: 'Muscle' }, { id: 'perte', lab: 'Perte de gras' },
    ] }),
    React.createElement('div', { style: { height: 16 } }),
    React.createElement(SecLab, null, 'Volume du jour'),
    React.createElement(Choice, { tint: NUTRI, value: vol, set: setVol, options: [
      { id: 'repos', lab: 'Repos' }, { id: 'modere', lab: 'Modéré (~1h)' }, { id: 'eleve', lab: 'Élevé (1-3h)' }, { id: 'tres', lab: 'Très élevé' },
    ] }),
    valid && React.createElement('div', { style: { marginTop: 20 } },
      React.createElement('div', { style: { display: 'flex', gap: 10 } },
        React.createElement(ResultCard, { label: 'Protéines', value: `${prLo}–${prHi} g`, sub: `${pr[0]}–${pr[1]} g/kg`, tint: NUTRI, big: true }),
        React.createElement(ResultCard, { label: 'Glucides', value: `${carbLo}–${carbHi} g`, sub: 'selon le volume', tint: NUTRI, big: true })),
      React.createElement('div', { style: { marginTop: 10 } }, React.createElement(ResultCard, { label: 'Cadre énergétique', value: FR[obj], tint: NUTRI })),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
        React.createElement(Pill, { tint: NUTRI }, 'Lipides 20–30 %'),
        React.createElement(Pill, { tint: NUTRI }, '~0,25 g/kg de prot. par repas'),
        React.createElement(Pill, { tint: NUTRI }, '4 kcal/g · lipides 9 kcal/g'))),
    React.createElement(NoteBox, { tint: NUTRI }, "Fourchettes de référence (ISSN), pas des prescriptions. Pour la perte de gras : garde les protéines hautes et les glucides autour de l'effort plutôt que de tout restreindre. Anti-RED-S : mange à hauteur de ta dépense."))
}

// ============================================================
// Onglet Course (fueling course à pied)
// ============================================================
function CourseTab({ body, setBody }) {
  body = body || {}
  const [dur, setDur] = useState(120)
  const [poids, _setPoids] = useState(body.poids || 70)
  const setPoids = (v) => { _setPoids(v); setBody({ poids: v }) }
  const valid = dur > 0 && poids > 0
  const hrs = dur / 60
  let gph, type
  if (dur < 60) { gph = 0; type = 'Eau suffit' }
  else if (hrs <= 2.5) { gph = 45; type = '30–60 g/h, sucre au choix' }
  else { gph = 75; type = '60–90 g/h, mélange glucose:fructose' }
  const total = Math.round(gph * hrs)
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'route', tint: NUTRI, title: 'Nutrition de course', text: "Cale tes apports sur la durée estimée de l'effort (pas la distance, surtout en trail)." }),
    React.createElement(SecLab, null, 'Ton effort'),
    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      React.createElement(NumField, { label: 'Durée estimée', unit: 'min', value: dur, set: setDur, min: 10, max: 1200 }),
      React.createElement(NumField, { label: 'Poids', unit: 'kg', value: poids, set: setPoids, min: 30, max: 200 })),
    valid && React.createElement('div', { style: { marginTop: 18 } },
      React.createElement(ResultCard, { big: true, label: "Glucides pendant l'effort", value: gph === 0 ? '0 g/h' : `${gph} g/h`, sub: type, tint: NUTRI }),
      gph > 0 && React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 10 } },
        React.createElement(ResultCard, { label: 'À emporter (≈)', value: `${total} g`, sub: 'de glucides', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Hydratation', value: '400–800', sub: 'ml / h', tint: NUTRI })),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
        React.createElement(Pill, { tint: NUTRI }, 'Sodium 500–700 mg / L'),
        React.createElement(Pill, { tint: NUTRI }, 'Fractionner toutes les 15–20 min'),
        hrs > 2.5 && React.createElement(Pill, { tint: NUTRI }, 'Caféine 3–6 mg/kg'))),
    React.createElement('div', { style: { height: 22 } }),
    React.createElement(SecLab, null, 'Repères par type de course'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      COURSE_REF.map((r, i) => React.createElement('div', { key: i, style: { padding: '12px 14px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}` } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
          React.createElement('span', { style: { fontFamily: FONT, fontWeight: 600, fontSize: 15 } }, r.c),
          React.createElement('span', { style: { fontSize: 12, color: INK3, fontWeight: 600 } }, r.d)),
        React.createElement('div', { style: { fontSize: 13, color: INK2, marginTop: 3, lineHeight: 1.4 } }, r.p)))),
    React.createElement(NoteBox, { tint: NUTRI }, "Règle d'or : rien de nouveau le jour de la course. Teste toujours gels, boissons et apports à l'entraînement. Les gros apports demandent un « entraînement de l'intestin » progressif."))
}

// ============================================================
// Onglet Timing nutritionnel
// ============================================================
function TimingTab({ body }) {
  body = body || {}
  const poids = Number(body.poids) || 70
  const protPre = Math.round(poids * 0.25)
  const protPost = Math.round(poids * 0.35)
  const Block = ({ ic, title, children }) => React.createElement('div', { style: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, padding: 16, marginBottom: 12 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      React.createElement('div', { style: { width: 32, height: 32, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb, ${NUTRI} 14%, ${SURFACE})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement(Icon, { name: ic, size: 16, color: NUTRI })),
      React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 15 } }, title)),
    children)
  const Item = (text) => React.createElement('div', { style: { fontSize: 13.5, color: INK2, lineHeight: 1.5, marginBottom: 6 } }, '• ' + text)
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'clock', tint: NUTRI, title: 'Timing nutritionnel', text: "Repères généraux autour de l'entraînement. L'apport total sur la journée compte davantage que le timing précis : ces fenêtres affinent, elles ne remplacent pas une alimentation suffisante." }),
    React.createElement(Block, { ic: 'clock', title: 'Avant l’effort (2-3 h)' },
      Item('Repas mixte : glucides + protéines modérées, peu de fibres/graisses pour limiter l’inconfort digestif.'),
      Item('Hydratation progressive plutôt qu’en une fois.')),
    React.createElement(Block, { ic: 'bolt', title: 'Juste avant (< 1 h)' },
      Item('Si besoin : encas léger, glucides simples, ' + protPre + ' g de protéines max.'),
      Item('Éviter les graisses/fibres en grande quantité juste avant.')),
    React.createElement(Block, { ic: 'drop', title: 'Pendant (effort > 60-90 min)' },
      Item('Glucides 30-90 g/h selon durée et intensité (voir onglet Course pour le calcul détaillé).'),
      Item('Hydratation régulière, ajustée à la chaleur et à la sudation.')),
    React.createElement(Block, { ic: 'leaf', title: 'Après l’effort' },
      Item('Protéines : repère ~' + protPost + ' g (0,3-0,4 g/kg), répété sur la journée plutôt qu’en une seule prise.'),
      Item("Glucides selon l'intensité et l'enchaînement des séances (récupération rapide si 2 séances/jour)."),
      Item("La fenêtre stricte de 30 min est nuancée par la littérature récente — quelques heures restent efficaces si l'apport total journalier est suffisant.")),
    React.createElement(NoteBox, { tint: NUTRI }, "Repères généraux (ISSN, Kerksick et al. 2017/2018 ; Aragon & Schoenfeld 2013). Niveau de preuve modéré — ne remplacent pas un avis individualisé, notamment en cas d'objectif de composition corporelle ou de pathologie."))
}

// ============================================================
// Onglet Hydratation
// ============================================================
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const todayISO = () => new Date().toISOString().slice(0, 10)
function shiftISO(iso, d) {
  const x = new Date(iso + 'T00:00:00')
  x.setDate(x.getDate() + d)
  return x.toISOString().slice(0, 10)
}
function dateLabel(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function HydrationTab({ db, store, body }) {
  body = body || {}
  const sp = db.hydroSport || {}
  const [min, setMin] = useState(sp.min != null ? sp.min : 0)
  const [intensite, setIntensite] = useState(sp.intensite || 'modere')
  const [climat, setClimat] = useState(sp.climat || 'tempere')
  const persist = (patch) => store.set((st) => ({ hydroSport: { min, intensite, climat, ...patch } }))
  const today = todayISO()
  const log = (db.hydroLog && db.hydroLog[today]) || []
  const eff = log.reduce((a, e) => a + e.ml * (e.factor != null ? e.factor : 1), 0)
  const totalMl = log.reduce((a, e) => a + e.ml, 0)
  const caf = log.reduce((a, e) => a + (e.caf || 0), 0)
  const sucre = log.reduce((a, e) => a + (e.sucre || 0), 0)
  const sugarMax = 40
  const poids = Number(body.poids) || 70
  const rate = intensite === 'leger' ? 400 : intensite === 'intense' ? 850 : 600
  let base = 30 * poids
  let effort = (Number(min) || 0) / 60 * rate
  if (climat === 'chaud') { base *= 1.1; effort *= 1.25 }
  const objectif = Math.round((base + effort) / 50) * 50
  const hasBody = !!body.poids
  const addDrink = (b) => store.set((st) => {
    const h = { ...st.hydroLog || {} }
    h[today] = [...(h[today] || []), { id: 'h' + Date.now(), n: b.n, ml: b.ml, factor: b.factor, caf: b.caf, sucre: b.sucre, ic: b.ic }]
    return { hydroLog: h }
  })
  const removeDrink = (id) => store.set((st) => {
    const h = { ...st.hydroLog || {} }
    h[today] = (h[today] || []).filter((e) => e.id !== id)
    return { hydroLog: h }
  })
  const days = []
  for (let i = 6; i >= 0; i--) days.push(shiftISO(today, -i))
  const dayEff = (iso) => ((db.hydroLog && db.hydroLog[iso]) || []).reduce((a, e) => a + e.ml * (e.factor != null ? e.factor : 1), 0)
  const maxV = Math.max(objectif, ...days.map(dayEff), 1)
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'leaf', tint: NUTRI, title: 'Hydratation', text: "Ton objectif s'ajuste à ton poids et à ta séance. L'eau reste la référence ; café, thé, jus comptent presque autant." }),
    React.createElement('div', { style: { padding: '18px 16px 8px', borderRadius: RADIUS, background: `color-mix(in srgb, ${NUTRI} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 26%, ${LINE})`, marginBottom: 14 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } },
        React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Objectif du jour'),
        React.createElement('span', { style: { fontWeight: 800, fontSize: 20, color: NUTRI } }, (objectif / 1000).toFixed(1), ' L')),
      React.createElement(Bar, { lab: 'Bu aujourd’hui', val: eff, target: objectif, unit: 'ml', tint: NUTRI }),
      React.createElement('div', { style: { fontSize: 12, color: INK3, marginTop: 2 } }, 'Base ', Math.round(base), ' ml', effort > 0 ? ` + effort ${Math.round(effort)} ml` : '', climat === 'chaud' ? ' · chaleur prise en compte' : '', '.'),
      React.createElement('div', { style: { marginTop: 13, paddingTop: 13, borderTop: `1px solid color-mix(in srgb, ${NUTRI} 18%, ${LINE})` } },
        React.createElement(Bar, { lab: 'Sucre des boissons', val: sucre, target: sugarMax, unit: 'g', tint: '#c2863c' }),
        React.createElement('div', { style: { fontSize: 12, color: INK3, marginTop: 2 } }, 'Repère : sucres des boissons à garder bas (~25–50 g/jour).')),
      !hasBody && React.createElement('div', { style: { fontSize: 12.5, color: '#b5566a', marginTop: 6 } }, 'Renseigne ton poids dans Calories/Macros pour un objectif personnalisé (défaut : 70 kg).')),
    React.createElement(SecLab, null, 'Ta séance du jour'),
    React.createElement('div', { style: { marginBottom: 6 } }, React.createElement(NumField, { label: 'Durée de sport', unit: 'min', value: min, set: (v) => { setMin(v); persist({ min: v }) }, min: 0, max: 300 })),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: INK3, margin: '8px 0 6px' } }, 'Intensité'),
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
      [['leger', 'Léger'], ['modere', 'Modéré'], ['intense', 'Intense']].map(([v, l]) => React.createElement('button', { key: v, onClick: () => { setIntensite(v); persist({ intensite: v }) }, style: chipBtn(intensite === v) }, l))),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: INK3, margin: '4px 0 6px' } }, 'Météo'),
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } },
      [['tempere', 'Tempéré'], ['chaud', 'Chaud']].map(([v, l]) => React.createElement('button', { key: v, onClick: () => { setClimat(v); persist({ climat: v }) }, style: chipBtn(climat === v) }, l))),
    React.createElement(SecLab, null, 'Ajouter une boisson'),
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } },
      BOISSONS.map((b, i) => React.createElement('button', { key: i, onClick: () => addDrink(b), style: { ...chipBtn(false), display: 'inline-flex', alignItems: 'center', gap: 6 } },
        React.createElement(Icon, { name: b.ic, size: 14, color: INK3 }), React.createElement('span', null, b.n), React.createElement('span', { style: { color: INK3, fontWeight: 600 } }, b.ml, ' ml', b.sucre ? ` · ${b.sucre} g` : '')))),
    log.length > 0 && React.createElement(React.Fragment, null,
      React.createElement(SecLab, null, 'Aujourd’hui · ', Math.round(totalMl), ' ml', sucre > 0 ? ` · ${Math.round(sucre)} g sucre` : '', caf > 0 ? ` · ${Math.round(caf)} mg caféine` : ''),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 } },
        log.map((e) => React.createElement('div', { key: e.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 10px 14px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}` } },
          React.createElement(Icon, { name: e.ic || 'drop', size: 16, color: INK3 }),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, e.n),
            React.createElement('div', { style: { fontSize: 12, color: INK3 } }, e.ml, ' ml', e.sucre ? ` · ${e.sucre} g sucre` : '', e.caf ? ` · ${e.caf} mg caféine` : '')),
          React.createElement('button', { onClick: () => removeDrink(e.id), 'aria-label': 'Retirer', style: { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK3, background: 'transparent', border: 'none', cursor: 'pointer' } },
            React.createElement(Icon, { name: 'close', size: 16 })))))),
    caf > 400 && React.createElement(NoteBox, { tint: '#b5566a' }, 'Plus de 400 mg de caféine aujourd’hui : au-delà, mieux vaut lever le pied, surtout en fin de journée.'),
    sucre > 50 && React.createElement(NoteBox, { tint: '#b5566a' }, Math.round(sucre), " g de sucre via les boissons aujourd'hui : les boissons sucrées sont la source la plus facile à réduire (repère : viser plutôt sous ~25–50 g de sucres ajoutés/jour)."),
    React.createElement(SecLab, null, '7 derniers jours'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, padding: '0 2px', marginBottom: 4 } },
      days.map((iso) => {
        const v = dayEff(iso)
        const h = Math.max(3, v / maxV * 74)
        const isT = iso === today
        return React.createElement('div', { key: iso, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, justifyContent: 'flex-end' } },
          React.createElement('div', { style: { width: '100%', height: h, borderRadius: 6, background: isT ? NUTRI : `color-mix(in srgb, ${NUTRI} 30%, ${SURFACE2})` } }),
          React.createElement('span', { style: { fontSize: 10, color: isT ? NUTRI : INK3, fontWeight: isT ? 700 : 600 } }, new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' })))
      })),
    React.createElement(NoteBox, { tint: NUTRI }, 'Avant : bois ~300–500 ml dans les 2 h. Pendant : ~400–800 ml/h si l’effort dépasse 1 h ou s’il fait chaud, avec des électrolytes (boisson d’effort, pincée de sel). Après : rebois 1,5× ce que tu as perdu. Repère simple : urines claires = bonne hydratation.'))
}

// ============================================================
// Journal alimentaire
// ============================================================
function TargetSheet({ targets, body, onSave, onClose, onMacros }) {
  body = body || {}
  const [kcal, setKcal] = useState((targets && targets.kcal) || 2000)
  const [prot, setProt] = useState((targets && targets.prot) || 110)
  const [gluc, setGluc] = useState((targets && targets.gluc) || 250)
  const [lip, setLip] = useState((targets && targets.lip) || 65)
  const [fib, setFib] = useState((targets && targets.fib) || 30)
  const canAuto = body.poids && body.taille && body.age
  const fromProfile = () => {
    if (!canAuto) return
    const bmr = Math.round(10 * body.poids + 6.25 * body.taille - 5 * body.age + ((body.sexe || 'h') === 'h' ? 5 : -161))
    const tdee = Math.round(bmr * (body.act || 1.55))
    const ADJ = { maintien: 1, endurance: 1.02, muscle: 1.1, perte: 0.85 }
    const kc = Math.round(tdee * (ADJ[body.obj || 'maintien'] || 1))
    const PROT = { maintien: 1.4, endurance: 1.5, muscle: 1.8, perte: 2.2 }
    const pr = Math.round(body.poids * (PROT[body.obj || 'maintien'] || 1.4))
    const lp = Math.round(kc * 0.25 / 9)
    const gl = Math.max(20, Math.round((kc - pr * 4 - lp * 9) / 4))
    setKcal(kc); setProt(pr); setGluc(gl); setLip(lp); setFib(Math.round(kc / 1000 * 14))
  }
  return React.createElement('div', { style: xst.sheetWrap, onClick: onClose },
    React.createElement('div', { style: xst.sheet, onClick: (e) => e.stopPropagation() },
      React.createElement('div', { style: { width: 38, height: 4, borderRadius: 999, background: LINE, margin: '0 auto 18px' } }),
      React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 19, textAlign: 'center', marginBottom: 4 } }, 'Mes objectifs du jour'),
      React.createElement('p', { style: { fontSize: 12.5, color: INK3, textAlign: 'center', marginBottom: 16, lineHeight: 1.4 } }, 'Calcule-les depuis ton profil, ou ajuste-les à la main.'),
      canAuto && React.createElement('button', { onClick: fromProfile, style: { ...xst.ghostBtn, width: '100%', marginBottom: 14, padding: 12, fontSize: 14, fontWeight: 700, color: NUTRI, borderColor: `color-mix(in srgb, ${NUTRI} 40%, #ddd)` } },
        'Calculer depuis mon profil (', body.poids, ' kg · ', { maintien: 'maintien', endurance: 'endurance', muscle: 'muscle', perte: 'perte de gras' }[body.obj || 'maintien'], ')'),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement(NumField, { label: 'Calories', unit: 'kcal', value: kcal, set: setKcal, min: 800, max: 6000 }),
        React.createElement(NumField, { label: 'Protéines', unit: 'g', value: prot, set: setProt, min: 20, max: 400 })),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
        React.createElement(NumField, { label: 'Glucides', unit: 'g', value: gluc, set: setGluc, min: 20, max: 800 }),
        React.createElement(NumField, { label: 'Lipides', unit: 'g', value: lip, set: setLip, min: 10, max: 300 })),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
        React.createElement(NumField, { label: 'Fibres', unit: 'g', value: fib, set: setFib, min: 0, max: 120 }),
        React.createElement('div', { style: { flex: 1 } })),
      React.createElement('button', { onClick: () => { onSave({ kcal, prot, gluc, lip, fib }); onClose() }, style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginTop: 18 } }, 'Enregistrer')))
}

function FoodTab({ db, store }) {
  const [date, setDate] = useState(todayISO())
  const [mode, setMode] = useState('main')
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(null)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState('midi')
  const [editId, setEditId] = useState(null)
  const [tgtSheet, setTgtSheet] = useState(false)
  const log = (db.foodLog && db.foodLog[date]) || []
  const targets = db.foodTargets || null
  const favs = db.foodFav || []
  const tot = log.reduce((a, e) => ({ k: a.k + e.k, p: a.p + e.p, g: a.g + e.g, l: a.l + e.l, fib: a.fib + (e.fib || 0) }), { k: 0, p: 0, g: 0, l: 0, fib: 0 })
  const MEALS = [{ id: 'matin', label: 'Petit-déjeuner' }, { id: 'midi', label: 'Déjeuner' }, { id: 'soir', label: 'Dîner' }, { id: 'collation', label: 'Collation' }]
  const mealOf = (e) => (MEALS.some((m) => m.id === e.meal) ? e.meal : 'collation')
  const per100 = (e) => e.per || { k: e.grams ? e.k / e.grams * 100 : 0, p: e.grams ? e.p / e.grams * 100 : 0, g: e.grams ? e.g / e.grams * 100 : 0, l: e.grams ? e.l / e.grams * 100 : 0, fib: e.grams ? (e.fib || 0) / e.grams * 100 : 0 }
  const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? 'matin' : h < 15 ? 'midi' : h < 21 ? 'soir' : 'collation' }
  const isFav = (n) => favs.some((f) => f.n === n)
  const toggleFav = (food) => store.set((s) => {
    const cur = s.foodFav || []
    const exists = cur.some((f) => f.n === food.n)
    const next = exists ? cur.filter((f) => f.n !== food.n) : [...cur, { n: food.n, k: food.k, p: food.p, g: food.g, l: food.l, port: food.port || 100, portLab: food.portLab || '' }]
    return { foodFav: next }
  })
  const addEntry = (food, gr, ml) => {
    const f = gr / 100
    const per = { k: food.k, p: food.p, g: food.g, l: food.l, fib: food.fib || 0 }
    const entry = { id: 'e' + Date.now(), n: food.n, grams: gr, meal: ml, per, k: per.k * f, p: per.p * f, g: per.g * f, l: per.l * f, fib: (per.fib || 0) * f }
    store.set((s) => { const fl = { ...s.foodLog || {} }; fl[date] = [...(fl[date] || []), entry]; return { foodLog: fl } })
  }
  const updateEntry = (id, gr, ml) => store.set((s) => {
    const fl = { ...s.foodLog || {} }
    fl[date] = (fl[date] || []).map((e) => {
      if (e.id !== id) return e
      const pr = e.per || per100(e)
      const f = gr / 100
      return { ...e, grams: gr, meal: ml, per: pr, k: pr.k * f, p: pr.p * f, g: pr.g * f, l: pr.l * f, fib: (pr.fib || 0) * f }
    })
    return { foodLog: fl }
  })
  const removeEntry = (id) => store.set((s) => { const fl = { ...s.foodLog || {} }; fl[date] = (fl[date] || []).filter((e) => e.id !== id); return { foodLog: fl } })
  const openAdd = (ml) => { setMeal(ml); setEditId(null); setPick(null); setQ(''); setMode('search') }
  const openEdit = (e) => {
    const pr = per100(e)
    setPick({ n: e.n, k: pr.k, p: pr.p, g: pr.g, l: pr.l, port: e.grams, portLab: '' })
    setGrams(e.grams); setMeal(mealOf(e)); setEditId(e.id); setMode('qty')
  }
  const chooseFood = (food) => { setPick(food); setGrams(food.port || 100); setEditId(null); setMode('qty') }
  const recents = (() => {
    const all = db.foodLog || {}
    const seen = {}; const out = []
    const dates = Object.keys(all).sort().reverse()
    for (const d of dates) {
      const arr = all[d] || []
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i]
        if (seen[e.n]) continue
        seen[e.n] = 1
        const pr = e.per || per100(e)
        out.push({ n: e.n, k: pr.k, p: pr.p, g: pr.g, l: pr.l, port: e.grams, portLab: '' })
        if (out.length >= 10) return out
      }
    }
    return out
  })()

  if (mode === 'search') {
    const res = (norm(q) ? FOODS.filter((f) => norm(f.n).includes(norm(q))) : FOODS).slice(0, 40)
    const Quick = ({ food, kk }) => React.createElement('button', { key: kk, onClick: () => chooseFood(food), style: { ...chipBtn(false), display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', maxWidth: '100%' } },
      React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, isFav(food.n) ? '★ ' : '', food.n))
    return React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
        React.createElement('button', { onClick: () => { setMode('main'); setQ('') }, style: xst.iconBtn, 'aria-label': 'Retour' }, React.createElement(Icon, { name: 'back', size: 19 })),
        React.createElement('input', { autoFocus: true, value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Chercher un aliment…', style: { ...xst.input, marginTop: 0, flex: 1 } })),
      React.createElement('div', { style: { fontSize: 12.5, color: INK3, marginBottom: 14 } }, 'Pour le repas : ', React.createElement('strong', { style: { color: NUTRI } }, (MEALS.find((m) => m.id === meal) || {}).label)),
      norm(q) === '' && favs.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(SecLab, null, 'Favoris'),
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } }, favs.map((f, i) => React.createElement(Quick, { key: 'fav' + i, kk: 'fav' + i, food: f })))),
      norm(q) === '' && recents.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(SecLab, null, 'Récents'),
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } }, recents.map((f, i) => React.createElement(Quick, { key: 'rec' + i, kk: 'rec' + i, food: f })))),
      norm(q) === '' && React.createElement(SecLab, null, 'Tous les aliments'),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        res.map((f) => React.createElement('div', { key: f.id, style: { ...xst.optBtn, justifyContent: 'space-between', padding: '8px 8px 8px 14px' } },
          React.createElement('button', { onClick: () => chooseFood(f), style: { flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1, background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer' } },
            React.createElement('span', { style: { fontWeight: 600, fontSize: 14.5 } }, f.n),
            React.createElement('span', { style: { fontSize: 11.5, color: INK3 } }, f.k, ' kcal /100g')),
          React.createElement('button', { onClick: () => toggleFav(f), 'aria-label': 'Favori', style: { flex: '0 0 auto', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: isFav(f.n) ? '#d9a441' : INK3, background: 'transparent', border: 'none', cursor: 'pointer' } }, isFav(f.n) ? '★' : '☆')))),
      res.length === 0 && React.createElement('div', { style: { textAlign: 'center', color: INK3, fontSize: 13.5, padding: '20px 0' } },
        'Aucun résultat. Tu peux ajouter cet aliment à la main :',
        React.createElement('button', { onClick: () => { setPick({ n: q || 'Aliment', k: 0, p: 0, g: 0, l: 0, custom: true }); setGrams(100); setEditId(null); setMode('qty') }, style: { ...xst.ghostBtn, width: '100%', marginTop: 12, padding: 12, fontSize: 14 } }, '+ Aliment personnalisé')))
  }

  if (mode === 'qty' && pick) {
    const f = grams / 100
    const ck = pick.k * f, cp = pick.p * f, cg = pick.g * f, cl = pick.l * f
    return React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
        React.createElement('button', { onClick: () => setMode(editId ? 'main' : 'search'), style: xst.iconBtn, 'aria-label': 'Retour' }, React.createElement(Icon, { name: 'back', size: 19 })),
        React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 18, flex: 1 } }, pick.n),
        !pick.custom && React.createElement('button', { onClick: () => toggleFav(pick), 'aria-label': 'Favori', style: { fontSize: 21, color: isFav(pick.n) ? '#d9a441' : INK3, background: 'transparent', border: 'none', flex: '0 0 auto', cursor: 'pointer' } }, isFav(pick.n) ? '★' : '☆')),
      pick.custom && React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement(SecLab, null, 'Valeurs pour 100 g'),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement(NumField, { label: 'kcal', value: pick.k, set: (v) => setPick({ ...pick, k: v }), min: 0, max: 900 }),
          React.createElement(NumField, { label: 'Prot.', unit: 'g', value: pick.p, set: (v) => setPick({ ...pick, p: v }), min: 0, max: 100 }),
          React.createElement(NumField, { label: 'Gluc.', unit: 'g', value: pick.g, set: (v) => setPick({ ...pick, g: v }), min: 0, max: 100 }),
          React.createElement(NumField, { label: 'Lip.', unit: 'g', value: pick.l, set: (v) => setPick({ ...pick, l: v }), min: 0, max: 100 }))),
      React.createElement(SecLab, null, 'Repas'),
      React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } }, MEALS.map((m) => React.createElement('button', { key: m.id, onClick: () => setMeal(m.id), style: chipBtn(meal === m.id) }, m.label))),
      React.createElement(SecLab, null, 'Quantité'),
      React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-end' } }, React.createElement(NumField, { label: 'Poids', unit: 'g', value: grams, set: setGrams, min: 1, max: 2000 })),
      React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
        pick.port ? React.createElement('button', { onClick: () => setGrams(pick.port), style: chipBtn(grams === pick.port) }, pick.portLab ? pick.portLab + ' ' : '', '(', pick.port, ' g)') : null,
        [50, 100, 150, 200].map((gp) => React.createElement('button', { key: gp, onClick: () => setGrams(gp), style: chipBtn(grams === gp) }, gp, ' g'))),
      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 18 } },
        React.createElement(ResultCard, { label: 'kcal', value: Math.round(ck), tint: NUTRI, big: true }),
        React.createElement(ResultCard, { label: 'Prot.', value: Math.round(cp) + ' g', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Gluc.', value: Math.round(cg) + ' g', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Lip.', value: Math.round(cl) + ' g', tint: NUTRI })),
      editId ? React.createElement('div', null,
        React.createElement('button', { onClick: () => { updateEntry(editId, grams, meal); setMode('main'); setPick(null); setEditId(null) }, style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginTop: 16 } }, 'Enregistrer'),
        React.createElement('button', { onClick: () => { removeEntry(editId); setMode('main'); setPick(null); setEditId(null) }, style: { width: '100%', marginTop: 10, padding: 12, fontSize: 14, fontWeight: 700, color: DANGER, background: 'transparent', border: 'none', cursor: 'pointer' } }, 'Supprimer du journal'))
        : React.createElement('button', { onClick: () => { addEntry(pick, grams, meal); setMode('main'); setQ(''); setPick(null) }, style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginTop: 16 } }, 'Ajouter au journal'))
  }

  const days = []
  for (let i = 6; i >= 0; i--) days.push(shiftISO(date, -i))
  const dayKcal = (iso) => ((db.foodLog && db.foodLog[iso]) || []).reduce((a, e) => a + e.k, 0)
  const maxK = Math.max(targets ? (targets.kcal || 0) : 0, ...days.map(dayKcal), 1)
  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
      React.createElement('button', { onClick: () => setDate(shiftISO(date, -1)), style: xst.iconBtn, 'aria-label': 'Jour précédent' }, React.createElement(Icon, { name: 'prev', size: 18 })),
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 17, textTransform: 'capitalize' } }, dateLabel(date)),
        date !== todayISO() && React.createElement('button', { onClick: () => setDate(todayISO()), style: { fontSize: 12, color: NUTRI, fontWeight: 700, marginTop: 1, background: 'transparent', border: 'none', cursor: 'pointer' } }, 'Revenir à aujourd’hui')),
      React.createElement('button', { onClick: () => setDate(shiftISO(date, 1)), disabled: date >= todayISO(), style: { ...xst.iconBtn, opacity: date >= todayISO() ? 0.4 : 1 }, 'aria-label': 'Jour suivant' }, React.createElement(Icon, { name: 'next', size: 18 }))),
    targets ? React.createElement('div', { style: { padding: '16px 16px 6px', borderRadius: RADIUS, background: SURFACE, border: `1px solid ${LINE}`, marginBottom: 16 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
        React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Consommé vs objectifs'),
        React.createElement('button', { onClick: () => setTgtSheet(true), style: { fontSize: 12.5, fontWeight: 700, color: NUTRI, background: 'transparent', border: 'none', cursor: 'pointer' } }, 'Modifier')),
      React.createElement(Bar, { lab: 'Calories', val: tot.k, target: targets.kcal, unit: 'kcal', tint: NUTRI }),
      React.createElement(Bar, { lab: 'Protéines', val: tot.p, target: targets.prot, unit: 'g', tint: '#7c9a8e' }),
      React.createElement(Bar, { lab: 'Glucides', val: tot.g, target: targets.gluc, unit: 'g', tint: '#c79a4a' }),
      React.createElement(Bar, { lab: 'Lipides', val: tot.l, target: targets.lip, unit: 'g', tint: '#b5827a' }),
      React.createElement(Bar, { lab: 'Fibres', val: tot.fib, target: targets.fib || 30, unit: 'g', tint: '#8a9b5a' }))
      : React.createElement('div', { style: { padding: 16, borderRadius: RADIUS, background: `color-mix(in srgb, ${NUTRI} 10%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 28%, ${LINE})`, marginBottom: 16 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
          React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 16 } }, 'Total du jour'),
          React.createElement('div', { style: { fontWeight: 800, fontSize: 18, color: NUTRI } }, Math.round(tot.k), ' kcal')),
        React.createElement('div', { style: { fontSize: 13, color: INK2, marginTop: 4, lineHeight: 1.5 } }, 'Définis des objectifs pour suivre tes apports vs une cible.'),
        React.createElement('button', { onClick: () => setTgtSheet(true), style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginTop: 12 } }, 'Régler mes objectifs')),
    React.createElement('button', { onClick: () => openAdd(defaultMeal()), style: { ...xst.primaryBtn, background: NUTRI, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginBottom: 16 } }, '+ Ajouter un aliment'),
    MEALS.map((m) => {
      const items = log.filter((e) => mealOf(e) === m.id)
      const sub = items.reduce((a, e) => a + e.k, 0)
      return React.createElement('div', { key: m.id, style: { marginBottom: 12, borderRadius: RADIUS, background: SURFACE, border: `1px solid ${LINE}`, overflow: 'hidden' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' } },
          React.createElement('span', { style: { fontWeight: 700, fontSize: 14.5 } }, m.label),
          React.createElement('span', { style: { fontSize: 12.5, color: INK3, fontWeight: 600 } }, Math.round(sub), ' kcal')),
        items.map((e) => React.createElement('button', { key: e.id, onClick: () => openEdit(e), style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', borderTop: `1px solid ${LINE}`, background: 'transparent', cursor: 'pointer' } },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, e.n),
            React.createElement('div', { style: { fontSize: 12, color: INK3, marginTop: 1 } }, Math.round(e.grams), ' g · ', Math.round(e.k), ' kcal · P ', Math.round(e.p), ' · G ', Math.round(e.g), ' · L ', Math.round(e.l))),
          React.createElement(Icon, { name: 'arrow', size: 16, color: INK3 }))),
        React.createElement('button', { onClick: () => openAdd(m.id), style: { width: '100%', padding: '11px 14px', border: 'none', borderTop: `1px solid ${LINE}`, color: NUTRI, fontWeight: 700, fontSize: 13.5, textAlign: 'left', background: 'transparent', cursor: 'pointer' } }, '+ Ajouter'))
    }),
    React.createElement(SecLab, null, '7 derniers jours'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, padding: '0 2px' } },
      days.map((iso) => {
        const k = dayKcal(iso)
        const h = Math.max(3, k / maxK * 74)
        const isSel = iso === date
        return React.createElement('button', { key: iso, onClick: () => setDate(iso), style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, justifyContent: 'flex-end', background: 'transparent', border: 'none', cursor: 'pointer' } },
          React.createElement('div', { style: { width: '100%', height: h, borderRadius: 6, background: isSel ? NUTRI : `color-mix(in srgb, ${NUTRI} 30%, ${SURFACE2})` } }),
          React.createElement('span', { style: { fontSize: 10, color: isSel ? NUTRI : INK3, fontWeight: isSel ? 700 : 600 } }, new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' })))
      })),
    React.createElement(NoteBox, { tint: NUTRI }, "Journal sauvegardé et lié à ton compte. Valeurs indicatives (base d'aliments simplifiée) — pour un suivi clinique, voir un professionnel."),
    tgtSheet && React.createElement(TargetSheet, { targets, body: db.profilePhys || {}, onSave: (t) => store.set({ foodTargets: t }), onClose: () => setTgtSheet(false) }))
}

// ============================================================
// Diagnostic nutrition (questionnaire + radar + recommandations)
// ============================================================
function DiagTab({ db, store, onGoToJournal }) {
  const body = db.profilePhys || {}
  const sex = body.sexe || 'h'
  const poids = +body.poids || 0
  const taille = +body.taille || 0
  const age = +body.age || 0
  const act = +body.act || 1.55
  const obj = body.obj || 'maintien'

  const [step, setStep] = useState(0)
  const [ans, setAns] = useState({})
  const TOTAL = DIAG_QUESTIONS.length
  const setAns1 = (key, val) => setAns((prev) => ({ ...prev, [key]: val }))

  const validProfile = poids > 0 && taille > 0 && age > 0
  const bmr = validProfile ? Math.round(10 * poids + 6.25 * taille - 5 * age + (sex === 'h' ? 5 : -161)) : 0
  const tdee = Math.round(bmr * act)
  const ADJ = { maintien: [1, 1], endurance: [1, 1.03], muscle: [1.05, 1.15], perte: [0.8, 0.9] }
  const cibLo = Math.round(tdee * ADJ[obj][0])
  const cibHi = Math.round(tdee * ADJ[obj][1])
  const cibMid = Math.round((cibLo + cibHi) / 2)
  const PROT = { maintien: [1.2, 1.6], endurance: [1.4, 1.6], muscle: [1.6, 2.0], perte: [2.0, 2.4] }
  const protLo = Math.round(poids * PROT[obj][0])
  const protHi = Math.round(poids * PROT[obj][1])
  const hydLit = sex === 'h' ? 2.0 : 1.6
  const fibMin = sex === 'h' ? 30 : 25
  const fibMax = sex === 'h' ? 35 : 32
  const imc = validProfile ? Math.round(poids / (taille / 100) / (taille / 100) * 10) / 10 : 0

  const days7 = (() => {
    const logs = db.foodLog || {}
    const out = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const entries = logs[iso] || []
      if (entries.length > 0) out.push(entries.reduce((a, e) => ({ k: a.k + e.k, p: a.p + e.p, fib: a.fib + (e.fib || 0) }), { k: 0, p: 0, fib: 0 }))
    }
    return out
  })()
  const hasLog = days7.length >= 2
  const avg = hasLog ? {
    k: Math.round(days7.reduce((s, d) => s + d.k, 0) / days7.length),
    p: Math.round(days7.reduce((s, d) => s + d.p, 0) / days7.length),
    fib: Math.round(days7.reduce((s, d) => s + d.fib, 0) / days7.length * 10) / 10,
  } : null

  const diagHistory = db.diagHistory || []
  const lastScore = diagHistory.length > 0 ? diagHistory[diagHistory.length - 1] : null

  function calcPiliers() {
    const totals = {}, counts = {}
    PILIERS.forEach((p) => { totals[p.id] = 0; counts[p.id] = 0 })
    DIAG_QUESTIONS.forEach((q) => {
      const a = ans[q.key]; if (a === undefined) return
      const opt = q.options.find((o) => o.id === a); if (!opt) return
      totals[q.pilier] = (totals[q.pilier] || 0) + opt.score
      counts[q.pilier] = (counts[q.pilier] || 0) + 10
    })
    const res = {}
    PILIERS.forEach((p) => { res[p.id] = counts[p.id] > 0 ? Math.round(totals[p.id] / counts[p.id] * 100) : -1 })
    return res
  }
  function calcScore() {
    let pts = 0, total = 0
    DIAG_QUESTIONS.forEach((q) => {
      const a = ans[q.key]; if (a === undefined) return
      const opt = q.options.find((o) => o.id === a)
      if (opt) { pts += opt.score; total += 10 }
    })
    return total > 0 ? Math.round(pts / total * 100) : 0
  }
  function saveScore(sc) {
    const today = new Date().toISOString().slice(0, 10)
    const hist = (db.diagHistory || []).slice(-4)
    hist.push({ date: today, score: sc, piliers: calcPiliers() })
    store.set({ diagHistory: hist })
  }

  function ProgBar() {
    const pct = Math.round(step / TOTAL * 100)
    const q = DIAG_QUESTIONS[step - 1]
    const pilier = q ? PILIERS.find((p) => p.id === q.pilier) : null
    return React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: INK3, marginBottom: 5 } },
        React.createElement('span', null, 'Question ' + step + ' / ' + TOTAL),
        pilier && React.createElement('span', { style: { color: pilier.col, fontWeight: 700 } }, pilier.label),
        React.createElement('span', null, pct + '%')),
      React.createElement('div', { style: { height: 5, background: LINE, borderRadius: 99, overflow: 'hidden' } },
        React.createElement('div', { style: { height: '100%', borderRadius: 99, background: NUTRI, width: pct + '%', transition: 'width .35s ease' } })))
  }
  function OptBtn({ opt, selected, onSelect }) {
    return React.createElement('button', {
      onClick: () => onSelect(opt.id),
      style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14, marginBottom: 8,
        border: '1.5px solid ' + (selected ? NUTRI : LINE), background: selected ? `color-mix(in srgb, ${NUTRI} 11%, ${SURFACE})` : SURFACE,
        color: selected ? NUTRI : INK, fontWeight: selected ? 700 : 500, fontSize: 13.5, cursor: 'pointer' },
    },
      React.createElement('span', { style: { fontSize: 19, flex: '0 0 auto', width: 26, textAlign: 'center' } }, opt.emoji),
      React.createElement('span', { style: { flex: 1 } }, opt.lab),
      React.createElement('span', { style: { marginLeft: 'auto', fontSize: 10, fontWeight: 800, flex: '0 0 auto', color: selected ? NUTRI : INK3, background: selected ? `color-mix(in srgb, ${NUTRI} 12%, ${SURFACE})` : LINE, padding: '2px 6px', borderRadius: 99 } }, opt.score + '/10'))
  }
  function Card({ c }) {
    return React.createElement('div', { style: { padding: '13px 14px', borderRadius: RADIUS_SM, marginBottom: 10, background: `color-mix(in srgb, ${c.col} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${c.col} 28%, ${LINE})` } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } },
        React.createElement(Icon, { name: c.ic, size: 16, color: c.col }),
        React.createElement('span', { style: { fontWeight: 700, fontSize: 14, color: c.col, flex: 1 } }, c.title),
        c.niveauPreuve && React.createElement('span', { style: { fontSize: 10, color: c.col, fontWeight: 700, background: `color-mix(in srgb, ${c.col} 15%, ${SURFACE})`, padding: '2px 6px', borderRadius: 99 } }, c.niveauPreuve)),
      React.createElement('div', { style: { fontSize: 13, color: INK2, lineHeight: 1.55 } }, c.text),
      (c.conseil || c.menu) && React.createElement('div', { style: { marginTop: 8, padding: '9px 11px', borderRadius: 9, background: `color-mix(in srgb, ${c.col} 6%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${c.col} 16%, ${LINE})` } },
        c.conseil && React.createElement('div', { style: { fontSize: 12.5, color: INK2, lineHeight: 1.5, marginBottom: c.menu ? 5 : 0 } }, React.createElement('span', { style: { fontWeight: 700, color: c.col } }, 'A faire : '), c.conseil),
        c.menu && React.createElement('div', { style: { fontSize: 12, color: INK2, lineHeight: 1.5, paddingTop: c.conseil ? 5 : 0, borderTop: c.conseil ? `1px solid color-mix(in srgb, ${c.col} 15%, ${LINE})` : 'none' } }, React.createElement('span', { style: { fontWeight: 700, color: c.col } }, 'Exemple : '), c.menu)),
      c.source && React.createElement('div', { style: { fontSize: 10.5, color: INK3, marginTop: 5, fontStyle: 'italic' } }, c.source))
  }
  function PilierBar({ p, score: sc }) {
    if (sc < 0) return null
    const col = sc >= 70 ? p.col : sc >= 45 ? '#e07b39' : '#b5566a'
    return React.createElement('div', { style: { marginBottom: 9 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, React.createElement(Icon, { name: p.ic, size: 13, color: col }), React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: INK2 } }, ' ' + p.label)),
        React.createElement('span', { style: { fontSize: 12.5, fontWeight: 800, color: col } }, sc + '/100')),
      React.createElement('div', { style: { height: 7, background: LINE, borderRadius: 99, overflow: 'hidden' } }, React.createElement('div', { style: { height: '100%', width: sc + '%', background: col, borderRadius: 99, transition: 'width .5s ease' } })))
  }

  if (step === 0) {
    return React.createElement('div', null,
      React.createElement(SpaceBanner, { ic: 'search', tint: NUTRI, title: 'Diagnostic nutrition complet', text: '22 questions — énergie, alimentation, hydratation, récupération, comportement. Résultats par pilier + plan d’action personnalisé.' }),
      lastScore && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${NUTRI} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 20%, ${LINE})`, marginBottom: 12 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 10.5, color: INK3 } }, 'Dernier diagnostic (' + lastScore.date + ')'),
          React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: INK2, marginTop: 1 } }, 'Score : ' + lastScore.score + '/100')),
        React.createElement('div', { style: { marginLeft: 'auto', fontFamily: FONT, fontSize: 28, fontWeight: 800, color: NUTRI } }, lastScore.score + '/100')),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 } },
        PILIERS.map((p) => {
          const qCount = DIAG_QUESTIONS.filter((q) => q.pilier === p.id).length
          const lastPilierScore = lastScore && lastScore.piliers ? lastScore.piliers[p.id] : -1
          return React.createElement('div', { key: p.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${p.col} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${p.col} 20%, ${LINE})` } },
            React.createElement('div', { style: { width: 30, height: 30, borderRadius: 9, flex: '0 0 auto', background: p.col, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: p.ic, size: 14, color: '#fff' })),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: p.col } }, p.label),
              React.createElement('div', { style: { fontSize: 10.5, color: INK3 } }, qCount + ' Q' + (lastPilierScore >= 0 ? ' · ' + lastPilierScore + '/100' : ''))))
        })),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        React.createElement('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${NUTRI} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 20%, ${LINE})`, fontSize: 12.5, color: INK2 } }, React.createElement(Icon, { name: 'clock', size: 13, color: NUTRI }), React.createElement('span', null, ' 4-5 min')),
        React.createElement('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${NUTRI} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 20%, ${LINE})`, fontSize: 12.5, color: INK2 } }, React.createElement(Icon, { name: 'layers', size: 13, color: NUTRI }), React.createElement('span', null, ' ' + TOTAL + ' questions'))),
      React.createElement('button', { onClick: () => setStep(1), style: { width: '100%', padding: '15px', borderRadius: RADIUS_SM, background: NUTRI, color: '#fff', fontWeight: 700, fontSize: 15.5, boxShadow: `0 12px 26px -14px ${NUTRI}`, marginBottom: 10, border: 'none', cursor: 'pointer' } }, 'Démarrer le diagnostic →'),
      React.createElement(NoteBox, { tint: NUTRI }, 'Repères indicatifs — ISSN, EFSA, OMS. Pas un avis médical ou diététique.'))
  }

  if (step >= 1 && step <= TOTAL) {
    const q = DIAG_QUESTIONS[step - 1]
    if (!q) return null
    const curAns = ans[q.key]
    const pilier = PILIERS.find((p) => p.id === q.pilier)
    return React.createElement('div', null,
      React.createElement(ProgBar, null),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '13px 14px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${NUTRI} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 20%, ${LINE})` } },
        React.createElement('div', { style: { width: 42, height: 42, borderRadius: 12, flex: '0 0 auto', background: NUTRI, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: q.ic, size: 20, color: '#fff' })),
        React.createElement('div', null,
          pilier && React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: pilier.col, marginBottom: 3 } }, pilier.label),
          React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 15.5, lineHeight: 1.3 } }, q.text))),
      q.options.map((opt) => React.createElement(OptBtn, { key: opt.id, opt, selected: curAns === opt.id, onSelect: (val) => setAns1(q.key, val) })),
      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 12 } },
        step > 1 && React.createElement('button', { onClick: () => setStep(step - 1), style: { flex: 1, padding: '12px', borderRadius: RADIUS_SM, border: '1.5px solid #ddd', background: SURFACE, color: INK2, fontWeight: 600, fontSize: 14, cursor: 'pointer' } }, '← Retour'),
        React.createElement('button', {
          onClick: () => { if (curAns) { if (step < TOTAL) setStep(step + 1); else { const sc = calcScore(); saveScore(sc); setStep(TOTAL + 1) } } },
          disabled: !curAns,
          style: { flex: 2, padding: '12px', borderRadius: RADIUS_SM, background: curAns ? NUTRI : LINE, color: curAns ? '#fff' : INK3, fontWeight: 700, fontSize: 14.5, boxShadow: curAns ? `0 8px 20px -10px ${NUTRI}` : 'none', transition: 'all .2s ease', border: 'none', cursor: curAns ? 'pointer' : 'default' },
        }, step < TOTAL ? 'Suivant →' : 'Voir mes résultats →')))
  }

  const score = calcScore()
  const piliers = calcPiliers()
  const conseils = buildConseils(ans, { bmr, cibLo, cibMid, protLo, protHi, poids, avg, validProfile })
  const urgent = conseils.filter((c) => c.priority === 0)
  const attn = conseils.filter((c) => c.priority === 1 || c.priority === 2)
  const positifs = conseils.filter((c) => c.priority === 3)
  const sCol = score >= 70 ? '#6f8a3a' : score >= 45 ? '#e07b39' : '#b5566a'
  const sLab = score >= 70 ? 'Bon équilibre global' : score >= 45 ? "Des axes d'amélioration" : 'Points critiques'
  // Le score qu'on vient de sauvegarder est déjà dans diagHistory à ce stade
  // (saveScore a tourné avant ce rendu) : on compare donc à l'entrée d'avant,
  // pas à lastScore qui pointe maintenant sur ce même run.
  const priorHistory = diagHistory.slice(0, -1)
  const priorLast = priorHistory.length > 0 ? priorHistory[priorHistory.length - 1] : null
  const prevDiff = priorLast ? (score - priorLast.score) : null

  return React.createElement('div', null,
    React.createElement('div', { style: { padding: '18px 14px 14px', borderRadius: RADIUS, marginBottom: 12, background: `color-mix(in srgb, ${sCol} 9%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${sCol} 28%, ${LINE})` } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
        React.createElement('div', { style: { width: 70, height: 70, borderRadius: 18, flex: '0 0 auto', background: sCol, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
          React.createElement('div', { style: { fontFamily: FONT, fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 } }, score),
          React.createElement('div', { style: { fontSize: 10, color: 'rgba(255,255,255,.75)', fontWeight: 700 } }, '/100')),
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: FONT, fontSize: 17, fontWeight: 700, color: sCol, lineHeight: 1.25 } }, sLab),
          React.createElement('div', { style: { fontSize: 11.5, color: INK3, marginTop: 4 } }, urgent.length + ' urgent(s) · ' + attn.length + ' à améliorer · ' + positifs.length + ' acquis'),
          prevDiff !== null && React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, marginTop: 5, color: prevDiff > 0 ? '#6f8a3a' : prevDiff < 0 ? '#b5566a' : INK3 } }, prevDiff > 0 ? '▲ +' + prevDiff + ' pts vs précédent' : prevDiff < 0 ? '▼ ' + prevDiff + ' pts vs précédent' : '= identique au précédent'))),
      React.createElement(DiagRadar, { scores: piliers })),
    React.createElement(SecLab, null, 'Scores par pilier'),
    React.createElement('div', { style: { padding: '12px 14px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}`, marginBottom: 12 } },
      PILIERS.map((p) => React.createElement(PilierBar, { key: p.id, p, score: piliers[p.id] || 0 }))),
    urgent.length > 0 && React.createElement('div', null,
      React.createElement(SecLab, null, "Plan d'action — " + urgent.length + ' priorité(s) immédiate(s)'),
      React.createElement('div', { style: { borderRadius: RADIUS_SM, overflow: 'hidden', border: `1px solid color-mix(in srgb, #b5566a 28%, ${LINE})`, marginBottom: 12 } },
        urgent.map((c, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, background: `color-mix(in srgb, #b5566a 5%, ${SURFACE})` } },
          React.createElement('div', { style: { width: 24, height: 24, borderRadius: 99, flex: '0 0 auto', background: '#b5566a', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '' + (i + 1)),
          React.createElement('div', null,
            React.createElement('div', { style: { fontWeight: 700, fontSize: 13.5, color: INK } }, ' ' + c.title),
            c.menu && React.createElement('div', { style: { fontSize: 12, color: INK3, marginTop: 3, lineHeight: 1.45, fontStyle: 'italic' } }, c.menu),
            c.source && React.createElement('div', { style: { fontSize: 10, color: INK3, marginTop: 2 } }, c.source)))))),
    attn.length > 0 && React.createElement('div', null, React.createElement(SecLab, null, "Axes d'amélioration (" + attn.length + ')'), attn.map((c, i) => React.createElement(Card, { key: i, c }))),
    positifs.length > 0 && React.createElement('div', null,
      React.createElement(SecLab, null, 'Tes points forts (' + positifs.length + ')'),
      React.createElement('div', { style: { borderRadius: RADIUS_SM, border: `1px solid color-mix(in srgb, #6f8a3a 25%, ${LINE})`, overflow: 'hidden', marginBottom: 10 } },
        positifs.map((c, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, background: `color-mix(in srgb, #6f8a3a 5%, ${SURFACE})` } },
          React.createElement(Icon, { name: 'check', size: 14, color: '#6f8a3a' }),
          React.createElement('span', { style: { fontSize: 13.5, fontWeight: 600, color: INK } }, ' ' + c.title))))),
    React.createElement(SecLab, null, 'Tes ' + TOTAL + ' réponses'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 12 } },
      DIAG_QUESTIONS.map((q) => {
        const a = ans[q.key]
        const opt = a ? q.options.find((o) => o.id === a) : null
        const pilier = PILIERS.find((p) => p.id === q.pilier)
        const sc = opt ? opt.score : null
        const scCol = sc >= 7 ? '#6f8a3a' : sc >= 4 ? '#e07b39' : '#b5566a'
        return React.createElement('div', { key: q.key, style: { padding: '8px 10px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}` } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', { style: { fontSize: 9, fontWeight: 700, color: pilier ? pilier.col : INK3, textTransform: 'uppercase', letterSpacing: '.03em' } }, q.title),
            sc !== null && React.createElement('span', { style: { fontSize: 9, fontWeight: 800, color: scCol } }, sc + '/10')),
          React.createElement('div', { style: { fontSize: 11.5, fontWeight: 600, marginTop: 2, lineHeight: 1.3 } }, opt ? (opt.emoji + ' ' + opt.lab.slice(0, 30) + (opt.lab.length > 30 ? '...' : '')) : '—'))
      })),
    hasLog && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${NUTRI} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${NUTRI} 20%, ${LINE})`, marginBottom: 10 } },
      React.createElement(Icon, { name: 'apple', size: 16, color: NUTRI }),
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('div', { style: { fontWeight: 700, fontSize: 13 } }, ' Journal — ' + days7.length + ' jours enregistrés'),
        React.createElement('div', { style: { fontSize: 11.5, color: INK3, marginTop: 1 } }, 'Moy. : ' + (avg ? avg.k + ' kcal/j · ' + avg.p + 'g prot/j' : '-'))),
      onGoToJournal && React.createElement('button', { onClick: onGoToJournal, style: { padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${NUTRI}`, background: 'transparent', color: NUTRI, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' } }, 'Journal →')),
    validProfile && React.createElement('div', null,
      React.createElement(SecLab, null, 'Tes repères chiffrés'),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
        React.createElement(ResultCard, { label: 'Calories cible', value: cibLo === cibHi ? '' + cibLo : cibLo + '-' + cibHi, sub: 'kcal / ' + obj, tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Protéines ISSN', value: protLo + '-' + protHi + 'g', sub: PROT[obj][0] + '-' + PROT[obj][1] + ' g/kg/j', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Hydratation', value: hydLit + 'L', sub: 'boissons/j EFSA', tint: NUTRI }),
        React.createElement(ResultCard, { label: 'Fibres EFSA', value: fibMin + '-' + fibMax + 'g', sub: 'par jour', tint: NUTRI })),
      imc > 0 && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}`, marginBottom: 8 } },
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: INK3, textTransform: 'uppercase' } }, 'IMC · OMS'),
          React.createElement('div', { style: { fontFamily: FONT, fontWeight: 700, fontSize: 18, marginTop: 1 } }, imc)),
        React.createElement('div', { style: { fontSize: 12.5, color: INK2 } }, imc < 18.5 ? 'Insuffisance pondérale' : imc < 25 ? 'Poids normal' : imc < 30 ? 'Surpoids' : 'Obésité'))),
    React.createElement('div', { style: { padding: '10px 12px', borderRadius: RADIUS_SM, background: SURFACE, border: `1px solid ${LINE}`, marginBottom: 10, fontSize: 10.5, color: INK3, lineHeight: 1.8 } },
      React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, 'Niveau de preuve'),
      React.createElement('div', null, '★★★ Méta-analyse / revue systématique'),
      React.createElement('div', null, '★★ Essai contrôlé randomisé / cohorte prospective'),
      React.createElement('div', null, '★ Étude observationnelle / expert consensus')),
    React.createElement('button', { onClick: () => { setStep(0); setAns({}) }, style: { width: '100%', padding: '13px', marginTop: 4, borderRadius: RADIUS_SM, border: `1.5px solid ${NUTRI}`, background: 'transparent', color: NUTRI, fontWeight: 700, fontSize: 14, cursor: 'pointer' } }, '↺ Refaire le diagnostic'),
    React.createElement(NoteBox, { tint: NUTRI }, 'Repères indicatifs — ISSN, EFSA, OMS. Pas un avis médical ou diététique.' + (bmr ? ' BMR estimé : ' + bmr + ' kcal.' : '')))
}

// ============================================================
// Racine : navigation entre les 6 onglets Nutrition
// ============================================================
export default function NutritionSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('aliments')
  const body = db.profilePhys || {}
  const setBody = (patch) => store.set((s) => ({ profilePhys: { ...(s.profilePhys || {}), ...patch } }))

  if (loading) {
    return React.createElement('div', { style: xst.flow },
      React.createElement(FlowHeader, { title: 'Nutrition', onClose }),
      React.createElement('div', { style: { padding: 40, textAlign: 'center', color: INK3 } }, 'Chargement...'))
  }

  const TABS = [
    { id: 'aliments', lab: 'Journal', ic: 'apple' },
    { id: 'calories', lab: 'Calories', ic: 'flame' },
    { id: 'macros', lab: 'Macros', ic: 'layers' },
    { id: 'course', lab: 'Course', ic: 'route' },
    { id: 'timing', lab: 'Timing', ic: 'clock' },
    { id: 'hydratation', lab: 'Hydratation', ic: 'droplet' },
    { id: 'diag', lab: 'Diagnostic', ic: 'search' },
  ]

  return React.createElement('div', { style: xst.flow },
    React.createElement(FlowHeader, { title: 'Nutrition', onClose }),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '0 18px 24px' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '18px 0' } },
        TABS.map((it) => {
          const active = tab === it.id
          return React.createElement('button', {
            key: it.id, onClick: () => setTab(it.id),
            style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', borderRadius: 14,
              border: '1.5px solid ' + (active ? NUTRI : LINE),
              background: active ? `color-mix(in srgb, ${NUTRI} 11%, ${SURFACE})` : SURFACE,
              color: active ? NUTRI : INK, fontWeight: 700, fontSize: 13.5, textAlign: 'left', cursor: 'pointer' },
          },
            React.createElement('span', { style: { width: 30, height: 30, borderRadius: 9, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? NUTRI : `color-mix(in srgb, ${NUTRI} 13%, ${SURFACE})`, color: active ? '#fff' : NUTRI } },
              React.createElement(Icon, { name: it.ic, size: 16 })),
            it.lab)
        })),
      tab === 'aliments' && React.createElement(FoodTab, { db, store }),
      tab === 'calories' && React.createElement(CaloriesTab, { body, setBody, onMacros: () => setTab('macros') }),
      tab === 'macros' && React.createElement(MacrosTab, { body, setBody }),
      tab === 'course' && React.createElement(CourseTab, { body, setBody }),
      tab === 'timing' && React.createElement(TimingTab, { body }),
      tab === 'hydratation' && React.createElement(HydrationTab, { db, store, body }),
      tab === 'diag' && React.createElement(DiagTab, { db, store, onGoToJournal: () => setTab('aliments') })))
}
