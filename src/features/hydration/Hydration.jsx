import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { Icon, C, GRADIENTS } from '../health/kit'
import { DRINK_CATEGORIES, scaleDrink, searchDrinks } from '../nutrition/drinksData'
import { hydroAnalysis, CAF_HALF_LIFE_H } from './hydroIntel'

// ============================================================
// Hydratation unifiée (Eau + Boissons + Caféine + Sucres),
// portée depuis le bundle de l'ancienne app (module HydrationCompSpace).
// La migration depuis les anciens silos localStorage de l'app d'origine
// (renfo_drinks_v1 etc.) est volontairement omise : elle n'a pas de sens
// pour des comptes créés directement sur Supabase.
// ============================================================

// Jetons repris du kit partagé pour suivre le thème (cf. Nutrition).
const SURFACE = C.surface
const SURFACE2 = C.surface2
const INK = C.ink
const INK2 = C.ink2
const INK3 = C.ink3
const LINE = C.line
const RADIUS_SM = C.radiusSm
const RADIUS_XS = C.radiusXs
const FONT = C.font

const COL_EAU = 'var(--m-hydra)'
const COL_CAF = C.warn
const COL_SUC = 'var(--m-cycle)'

function hlog(db) { return (db && db.hydroLog) || {} }
function entryCaf(e) { return Number(e.caf != null ? e.caf : e.mg) || 0 }
function entryWaterMl(e) { return (Number(e.ml) || 0) * (e.factor != null ? Number(e.factor) : 1) }
function entryName(e) { return e.n || e.name || 'Boisson' }

function isoToday() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
// Reconstruit la date en UTC pur : new Date(iso+'T00:00:00') est interprété en
// heure locale, et .toISOString() reconvertit en UTC — dans un fuseau en avance
// sur UTC, ça décalait le résultat d'un jour en arrière.
function isoShift(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
function hhMM(ts) { return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }

// Le catalogue vit dans `drinksData` : deux cent trente boissons avec leurs
// macros, partagées avec l'écran Nutrition. Celui qui vivait ici ne portait
// que le volume, la caféine et le sucre.
const DRINKS = DRINK_CATEGORIES


const QUICK = [
  { n: 'Verre', ml: 200, ic: 'glass' },
  { n: 'Bouteille', ml: 500, ic: 'bottle' },
  { n: 'Gourde', ml: 750, ic: 'bottle' },
]

function chipBtn(active, color) {
  return { padding: '7px 13px', borderRadius: 999, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
    border: '1.5px solid ' + (active ? color : LINE),
    background: active ? `color-mix(in srgb, ${color} 12%, ${SURFACE})` : SURFACE,
    color: active ? color : INK2, transition: 'all .15s ease' }
}
const ST = {
  secLab: { fontSize: 11.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.04em', margin: '18px 2px 10px' },
  card: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, padding: 14, marginBottom: 10 },
  logEntry: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, marginBottom: 8 },
  delBtn: { width: 30, height: 30, borderRadius: 9, background: SURFACE2, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto', cursor: 'pointer', border: 'none' },
  primaryBtn: (col) => ({ width: '100%', padding: 13, borderRadius: 999, fontSize: 15, fontWeight: 800, border: 'none', color: '#fff', background: col, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }),
  noteBox: (col) => ({ display: 'flex', gap: 10, padding: '12px 13px', borderRadius: RADIUS_SM, fontSize: 12.5, color: INK2, lineHeight: 1.5, marginTop: 14, background: `color-mix(in srgb, ${col} 8%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${col} 22%, ${LINE})` }),
  fieldInput: { width: '100%', padding: '10px 13px', border: `1.5px solid ${LINE}`, borderRadius: RADIUS_XS, fontSize: 14, background: SURFACE2, color: INK, outline: 'none', boxSizing: 'border-box' },
}

function Alert({ type, children }) {
  const colors = { danger: C.danger, warn: C.warn, info: COL_EAU, check: C.carb }
  const col = colors[type] || colors.info
  return React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 13px', borderRadius: RADIUS_SM, background: `color-mix(in srgb, ${col} 10%, ${SURFACE})`, border: `1px solid color-mix(in srgb, ${col} 30%, ${LINE})`, color: col, fontWeight: 600, fontSize: 13, marginBottom: 10 } },
    React.createElement(Icon, { name: type === 'check' ? 'check' : 'spark', size: 16, color: col }),
    children)
}

function MiniRing({ pct, color, ic }) {
  const R = 30, circ = 2 * Math.PI * R
  const p = Math.max(0, Math.min(1, pct))
  const off = circ * (1 - p)
  return React.createElement('div', { style: { position: 'relative', width: 72, height: 72, flexShrink: 0 } },
    React.createElement('svg', { viewBox: '0 0 72 72', width: 72, height: 72 },
      React.createElement('circle', { cx: 36, cy: 36, r: R, fill: 'none', stroke: `color-mix(in srgb, ${color} 15%, ${LINE})`, strokeWidth: 7 }),
      React.createElement('circle', { cx: 36, cy: 36, r: R, fill: 'none', stroke: color, strokeWidth: 7, strokeDasharray: circ, strokeDashoffset: off, strokeLinecap: 'round', transform: 'rotate(-90 36 36)', style: { transition: 'stroke-dashoffset .5s ease' } })),
    React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
      React.createElement(Icon, { name: ic, size: 20, color })))
}

function Dashboard({ totals: t, limits: lim }) {
  const cards = [
    { ic: 'drop', col: COL_EAU, lab: 'Eau', val: (t.ml / 1000).toFixed(2), unit: 'L', sub: 'Obj. ' + (lim.water / 1000).toFixed(1) + ' L', pct: t.ml / lim.water, flag: t.ml >= lim.water ? 'ok' : null },
    { ic: 'cup', col: COL_CAF, lab: 'Caféine', val: String(Math.round(t.mg)), unit: 'mg', sub: 'Limite ' + lim.caffeine + ' mg', pct: t.mg / lim.caffeine, flag: t.mg > lim.caffeine ? 'over' : null },
    { ic: 'drop', col: COL_SUC, lab: 'Sucres', val: String(Math.round(t.sugar)), unit: 'g', sub: 'OMS < ' + lim.sugar + ' g', pct: t.sugar / lim.sugar, flag: t.sugar > lim.sugar ? 'over' : null },
  ]
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 } },
    cards.map((c, i) => {
      const border = c.flag === 'over' ? `color-mix(in srgb, ${c.col} 55%, ${LINE})` : LINE
      return React.createElement('div', { key: i, style: { background: SURFACE, border: `1px solid ${border}`, borderRadius: RADIUS_SM, padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        React.createElement(MiniRing, { pct: c.pct, color: c.col, ic: c.ic }),
        React.createElement('div', { style: { fontSize: 18, fontWeight: 900, color: c.col, lineHeight: 1 } }, c.val, React.createElement('span', { style: { fontSize: 11, fontWeight: 700, marginLeft: 2 } }, c.unit)),
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.02em' } }, c.lab),
        React.createElement('div', { style: { fontSize: 10.5, color: c.flag === 'over' ? c.col : INK3, fontWeight: c.flag === 'over' ? 700 : 500 } }, c.sub))
    }))
}

function CustomDrinkForm({ onSave, onCancel }) {
  const [nm, setNm] = useState('')
  const [ml, setMl] = useState('')
  const [mg, setMg] = useState('')
  const [sug, setSug] = useState('')
  return React.createElement('div', null,
    React.createElement('input', { value: nm, onChange: (e) => setNm(e.target.value), placeholder: 'Nom de la boisson', style: { ...ST.fieldInput, marginBottom: 8 } }),
    React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 8 } },
      React.createElement('input', { value: ml, onChange: (e) => setMl(e.target.value), type: 'number', placeholder: 'ml', min: 0, style: ST.fieldInput }),
      React.createElement('input', { value: mg, onChange: (e) => setMg(e.target.value), type: 'number', placeholder: 'caféine mg', min: 0, style: ST.fieldInput }),
      React.createElement('input', { value: sug, onChange: (e) => setSug(e.target.value), type: 'number', placeholder: 'sucre g', min: 0, style: ST.fieldInput })),
    React.createElement('button', { onClick: () => onSave(nm.trim() || 'Boisson perso', Number(ml) || 0, Number(mg) || 0, Number(sug) || 0), style: ST.primaryBtn(COL_EAU) }, 'Enregistrer'),
    React.createElement('button', { onClick: onCancel, style: { width: '100%', marginTop: 8, padding: 10, borderRadius: 999, border: `1.5px solid ${LINE}`, background: 'transparent', color: INK2, fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, 'Annuler'))
}

function TodayTab({ db, store }) {
  const poids = Number((db.profilePhys || {}).poids) || 70
  const limits = { water: Math.round(poids * 35), caffeine: 400, sugar: 50 }

  const [selCat, setSelCat] = useState(0)
  const [selSrc, setSelSrc] = useState(null)
  const [qty, setQty] = useState(1)

  const today = isoToday()
  const entries = (hlog(db)[today] || []).slice().reverse()
  const totals = entries.reduce((a, e) => { a.ml += entryWaterMl(e); a.mg += entryCaf(e); a.sugar += e.sugar || 0; return a }, { ml: 0, mg: 0, sugar: 0 })

  // L'entrée porte désormais ses macros : une bière ou un latte comptent
  // dans les calories du jour, ce qui n'était pas le cas — le journal
  // d'hydratation ne retenait que le volume, la caféine et le sucre.
  function addEntry(name, cat, ml, mg, sugar, macros) {
    if ((ml || 0) <= 0 && (mg || 0) <= 0 && (sugar || 0) <= 0) return
    const m = macros || {}
    const entry = { id: 'd' + Date.now(), ts: Date.now(), n: name, cat,
      factor: m.hyd != null ? m.hyd : 1,
      kcal: Math.round(m.kcal || 0), prot: m.prot || 0, carb: m.carb || 0, fat: m.fat || 0,
      alc: m.alc || 0, abv: m.abv || 0,
      ml: Math.round(ml || 0), caf: Math.round(mg || 0), sugar: Math.round(sugar || 0) }
    store.set((st) => {
      const h = { ...(st.hydroLog || {}) }
      h[today] = [...(h[today] || []), entry]
      return { hydroLog: h }
    })
    setSelSrc(null); setQty(1)
  }
  function addDrink(src) {
    const d = scaleDrink(src, qty || 1)
    addEntry(d.n, DRINKS[selCat].id, d.ml, d.caf, d.sugar, d)
  }
  function removeEntry(id) {
    store.set((st) => {
      const h = { ...(st.hydroLog || {}) }
      h[today] = (h[today] || []).filter((e) => e.id !== id)
      return { hydroLog: h }
    })
  }

  const cat = DRINKS[selCat]

  return React.createElement('div', null,
    React.createElement('div', { style: ST.secLab }, "Aujourd'hui"),
    React.createElement(Dashboard, { totals, limits }),

    totals.mg > limits.caffeine && React.createElement(Alert, { type: 'danger' }, 'Caféine au-delà de la limite EFSA (' + limits.caffeine + ' mg).'),
    totals.sugar > limits.sugar && React.createElement(Alert, { type: 'warn' }, 'Sucres au-delà du repère OMS (' + limits.sugar + ' g).'),
    totals.ml >= limits.water && React.createElement(Alert, { type: 'check' }, 'Objectif hydratation atteint — ' + (totals.ml / 1000).toFixed(2) + ' L.'),

    React.createElement('div', { style: ST.secLab }, 'Ajout rapide — eau'),
    React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 6 } },
      QUICK.map((q, i) => React.createElement('button', { key: i, onClick: () => addEntry(q.n, 'eaux', q.ml, 0, 0),
        style: { flex: 1, padding: '11px 4px', borderRadius: 12, border: `1.5px solid color-mix(in srgb, ${COL_EAU} 30%, ${LINE})`, background: `color-mix(in srgb, ${COL_EAU} 6%, ${SURFACE})`, fontWeight: 700, fontSize: 12, color: COL_EAU, textAlign: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: q.ic, size: 18, color: COL_EAU }),
        React.createElement('div', { style: { fontSize: 11, color: INK3, marginTop: 3 } }, q.ml + ' ml')))),

    React.createElement('div', { style: ST.secLab }, 'Bibliothèque de boissons'),
    React.createElement('div', { style: ST.card },
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
        DRINKS.map((c, ci) => React.createElement('button', { key: ci, onClick: () => { setSelCat(ci); setSelSrc(null) }, style: chipBtn(ci === selCat, COL_EAU) },
          React.createElement(Icon, { name: c.icon, size: 13, color: ci === selCat ? COL_EAU : INK3, style: { marginRight: 5, verticalAlign: '-2px' } }), c.label))),

      selSrc && selSrc.custom
        ? React.createElement(CustomDrinkForm, { onSave: (nm, ml, mg, sug) => addEntry(nm, 'perso', ml, mg, sug), onCancel: () => setSelSrc(null) })
        : selSrc
        ? React.createElement('div', null,
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
              React.createElement('strong', { style: { fontSize: 15, fontWeight: 800 } }, selSrc.n),
              React.createElement('button', { onClick: () => setSelSrc(null), style: { fontSize: 12, color: INK3, fontWeight: 700, padding: '6px 10px', border: `1px solid ${LINE}`, borderRadius: 8, background: SURFACE2, cursor: 'pointer' } }, 'Changer')),
            React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-end' } },
              React.createElement('div', { style: { flex: 1 } },
                React.createElement('label', { style: { fontSize: 12, fontWeight: 700, color: INK3, marginBottom: 5, display: 'block' } }, 'Quantité'),
                React.createElement('input', { type: 'number', defaultValue: qty, min: 0.5, max: 20, step: 0.5, onChange: (e) => setQty(parseFloat(e.target.value) || 1), style: ST.fieldInput })),
              React.createElement('div', { style: { flex: 1.4, fontSize: 12, color: INK2, lineHeight: 1.5, paddingBottom: 4 } },
                React.createElement('div', null, React.createElement('strong', { style: { color: COL_EAU } }, Math.round(selSrc.ml * (qty || 1)) + ' ml')),
                selSrc.caf > 0 && React.createElement('div', null, React.createElement('strong', { style: { color: COL_CAF } }, Math.round(selSrc.caf * (qty || 1)) + ' mg caféine')),
                selSrc.kcal > 0 && React.createElement('div', null, React.createElement('strong', { style: { color: C.calorie } }, Math.round(selSrc.kcal * (qty || 1)) + ' kcal'),
                  (selSrc.prot || selSrc.carb || selSrc.fat)
                    ? React.createElement('span', { style: { color: INK3 } }, ' · ',
                      [selSrc.prot ? Math.round(selSrc.prot * (qty || 1) * 10) / 10 + ' g P' : null,
                        selSrc.carb ? Math.round(selSrc.carb * (qty || 1) * 10) / 10 + ' g G' : null,
                        selSrc.fat ? Math.round(selSrc.fat * (qty || 1) * 10) / 10 + ' g L' : null].filter(Boolean).join(' · '))
                    : null),
                selSrc.alc > 0 && React.createElement('div', null, React.createElement('strong', { style: { color: C.danger } }, String(Math.round(selSrc.alc * (qty || 1) * 10) / 10).replace('.', ',') + ' g d’alcool'),
                  React.createElement('span', { style: { color: INK3 } }, ' · ', selSrc.abv, '°')),
                selSrc.sugar > 0 && React.createElement('div', null, React.createElement('strong', { style: { color: COL_SUC } }, Math.round(selSrc.sugar * (qty || 1)) + ' g sucre')))),
            React.createElement('button', { onClick: () => addDrink(selSrc), style: ST.primaryBtn(COL_EAU) }, 'Enregistrer'))
        : React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            cat.items.map((src, si) => React.createElement('button', { key: si, onClick: () => { setSelSrc(src); setQty(1) }, style: chipBtn(false, COL_EAU) },
              src.n,
              !src.custom && React.createElement('span', { style: { color: INK3, fontSize: 11, marginLeft: 5 } },
                src.ml + ' ml' + (src.kcal ? ' · ' + src.kcal + ' kcal' : '') + (src.caf ? ' · ' + src.caf + ' mg' : '') + (src.abv ? ' · ' + src.abv + '°' : '')))))),

    entries.length > 0
      ? React.createElement('div', null,
          React.createElement('div', { style: ST.secLab }, 'Journal du jour · ' + entries.length + ' prise' + (entries.length > 1 ? 's' : '')),
          entries.map((e) => {
            // Les catégories sont désormais identifiées par un code stable
            // plutôt que par leur libellé : renommer « Jus » en « Jus &
            // smoothies » ne doit pas faire disparaître l'icône des entrées
            // déjà enregistrées.
            const icon = (DRINK_CATEGORIES.find((c) => c.id === e.cat) || {}).icon || 'layers'
            const parts = []
            if (e.ml) parts.push(e.ml + ' ml')
            if (entryCaf(e)) parts.push(entryCaf(e) + ' mg')
            if (e.sugar) parts.push(e.sugar + ' g sucre')
            const meta = e.ts ? parts.join(' · ') + '  ·  ' + hhMM(e.ts) : parts.join(' · ')
            return React.createElement('div', { key: e.id, style: ST.logEntry },
              React.createElement('div', { style: { width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `color-mix(in srgb, ${COL_EAU} 14%, ${SURFACE2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                React.createElement(Icon, { name: icon, size: 17, color: COL_EAU })),
              React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { fontWeight: 700, fontSize: 14 } }, entryName(e)),
                React.createElement('div', { style: { fontSize: 12, color: INK3, marginTop: 2 } }, meta)),
              React.createElement('button', { onClick: () => removeEntry(e.id), style: ST.delBtn }, '×'))
          }))
      : React.createElement('div', { style: { textAlign: 'center', padding: '24px 16px', color: INK3, fontSize: 13.5, lineHeight: 1.6 } }, 'Aucune prise enregistrée. Choisis une boisson ci-dessus.'),

    React.createElement('div', { style: ST.noteBox(COL_EAU) },
      React.createElement(Icon, { name: 'drop', size: 14, color: COL_EAU, style: { flexShrink: 0, marginTop: 1 } }),
      React.createElement('span', null,
        React.createElement('strong', null, 'Bases : '),
        "Eau ~35 ml/kg/j (EFSA/ANSES) — café et thé comptent dans les apports. Caféine < 400 mg/j (EFSA 2015). Sucres libres < 50 g/j, idéal < 25 g (OMS 2015).")))
}

// ── Analyse sur 28 jours ──
// L'écran ne montrait que trois totaux quotidiens. L'horodatage de chaque
// boisson n'était lu nulle part, et la préférence « coupure caféine du
// soir » servait à composer une phrase de conseil sans jamais être
// comparée à ce qui avait réellement été bu.
function HydroAnalysis({ db, targetMl }) {
  const ana = hydroAnalysis(db, { days: 28, targetMl })
  const LVL = { ok: 'var(--c-success)', info: INK3, warn: C.warn, alert: '#c4503a', none: INK3 }
  const card = (children, tint) => React.createElement('div', {
    style: {
      padding: '14px 15px', borderRadius: RADIUS_SM, marginBottom: 10,
      background: tint ? `color-mix(in srgb, ${tint} 9%, ${SURFACE})` : SURFACE,
      border: `1px solid ${tint ? `color-mix(in srgb, ${tint} 26%, ${LINE})` : LINE}`,
    },
  }, children)
  const lab = (t) => React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 } }, t)
  const body = (t, col) => React.createElement('div', { style: { fontSize: 12.5, color: col || INK2, lineHeight: 1.5 } }, t)

  if (!ana.series.length) return null

  const lc = ana.lateCaffeine
  return React.createElement('div', null,
    React.createElement('div', { style: ST.secLab }, 'Analyse — 28 derniers jours'),

    ana.adherence ? card([
      React.createElement('div', { key: 'l' }, lab('Cible atteinte')),
      React.createElement('div', { key: 'v', style: { display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 } },
        React.createElement('span', { style: { fontSize: 21, fontWeight: 800, color: LVL[ana.adherence.level] } }, ana.adherence.hit + '/' + ana.adherence.days),
        React.createElement('span', { style: { fontSize: 12, color: INK3, fontWeight: 600 } }, 'jours')),
      React.createElement('div', { key: 't' }, body(ana.adherence.text)),
    ], ana.adherence.level === 'ok' ? null : C.warn) : null,

    lc && lc.trackedDays ? card([
      React.createElement('div', { key: 'l' }, lab(`Caféine après ${ana.cutoff} h`)),
      React.createElement('div', { key: 't' }, body(lc.text)),
      lc.meanResidual != null ? React.createElement('div', { key: 'r', style: { fontSize: 11.5, color: INK3, marginTop: 6, lineHeight: 1.45 } },
        `Il reste en moyenne ${lc.meanResidual} mg en circulation à 23 h (demi-vie de ${CAF_HALF_LIFE_H} h).`) : null,
    ], lc.level === 'warn' ? C.warn : null) : null,

    ana.vsSleep ? card([
      React.createElement('div', { key: 'l' }, lab('Caféine du soir et sommeil')),
      React.createElement('div', { key: 't' }, body(
        ana.vsSleep.flagged
          ? `Les nuits suivant une caféine tardive : ${ana.vsSleep.hoursLate} h et qualité ${ana.vsSleep.qualityLate}/5, contre ${ana.vsSleep.hoursOther} h et ${ana.vsSleep.qualityOther}/5 les autres nuits.`
          : `Aucun écart net entre les nuits suivant une caféine tardive (${ana.vsSleep.nightsLate}) et les autres (${ana.vsSleep.nightsOther}).`)),
      React.createElement('div', { key: 'n', style: { fontSize: 11, color: INK3, marginTop: 6 } }, 'Calculé sur ton propre historique.'),
    ], ana.vsSleep.flagged ? C.warn : null) : null,

    ana.distribution ? card([
      React.createElement('div', { key: 'l' }, lab('Répartition dans la journée')),
      React.createElement('div', { key: 'b', style: { display: 'flex', height: 9, borderRadius: 999, overflow: 'hidden', marginBottom: 8 } },
        React.createElement('div', { style: { width: ana.distribution.morningPct + '%', background: COL_EAU } }),
        React.createElement('div', { style: { flex: 1, background: `color-mix(in srgb, ${COL_EAU} 35%, ${SURFACE2})` } }),
        React.createElement('div', { style: { width: ana.distribution.eveningPct + '%', background: C.warn } })),
      React.createElement('div', { key: 't' }, body(ana.distribution.text)),
    ], ana.distribution.level === 'warn' ? C.warn : null) : null,

    card([
      React.createElement('div', { key: 'l' }, lab('Ce qu’on en retient')),
      ana.tips.map((t, i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: INK2, lineHeight: 1.5, marginTop: i ? 8 : 0 } },
        React.createElement('span', { style: { color: COL_EAU, fontWeight: 800, flex: '0 0 auto' } }, '•'),
        React.createElement('span', null, t))),
    ]))
}

function TrendsTab({ db, store }) {
  const poids = Number((db.profilePhys || {}).poids) || 70
  const today = isoToday()
  const cutoff = (db.hydroPrefs || {}).eveningCutoff || 16

  function dayTotals(iso) {
    return (hlog(db)[iso] || []).reduce((a, e) => { a.ml += entryWaterMl(e); a.mg += entryCaf(e); a.sugar += e.sugar || 0; return a }, { ml: 0, mg: 0, sugar: 0 })
  }
  const hist = []
  for (let i = 6; i >= 0; i--) { const iso = isoShift(today, -i); hist.push({ iso, ...dayTotals(iso) }) }
  const avgRaw = hist.reduce((a, d) => { a.ml += d.ml; a.mg += d.mg; a.sugar += d.sugar; return a }, { ml: 0, mg: 0, sugar: 0 })
  const avg = { ml: Math.round(avgRaw.ml / 7), mg: Math.round(avgRaw.mg / 7), sugar: Math.round(avgRaw.sugar / 7) }

  function Chart(title, key, col, max) {
    const top = Math.max(...hist.map((d) => d[key]), max, 1)
    return React.createElement('div', null,
      React.createElement('div', { style: ST.secLab }, title),
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 14 } },
        hist.map((d) => {
          const isT = d.iso === today
          const h = Math.max(4, (d[key] / top) * 64)
          const day = new Date(d.iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' })
          return React.createElement('div', { key: d.iso, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'flex-end' } },
            React.createElement('div', { style: { width: '100%', borderRadius: '5px 5px 0 0', height: h, minHeight: 3, transition: 'height .3s ease', background: isT ? col : `color-mix(in srgb, ${col} 35%, ${SURFACE2})` } }),
            React.createElement('span', { style: { fontSize: 10, color: isT ? col : INK3, fontWeight: 700 } }, day))
        })))
  }

  return React.createElement('div', null,
    React.createElement('div', { style: ST.secLab }, 'Moyennes — 7 derniers jours'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 } },
      [
        { v: (avg.ml / 1000).toFixed(2), u: 'L', l: 'Eau', c: COL_EAU },
        { v: String(avg.mg), u: 'mg', l: 'Caféine', c: COL_CAF },
        { v: String(avg.sugar), u: 'g', l: 'Sucres', c: COL_SUC },
      ].map((s, i) => React.createElement('div', { key: i, style: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, padding: 13, textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 20, fontWeight: 800, color: s.c } }, s.v, React.createElement('span', { style: { fontSize: 11, marginLeft: 2 } }, s.u)),
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginTop: 4 } }, s.l)))),

    Chart('Hydratation (ml/j)', 'ml', COL_EAU, poids * 35),
    Chart('Caféine (mg/j)', 'mg', COL_CAF, 400),
    Chart('Sucres (g/j)', 'sugar', COL_SUC, 50),

    React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 14px', background: SURFACE, border: `1px solid ${LINE}`, borderRadius: RADIUS_SM, padding: '12px 14px' } },
      React.createElement(Icon, { name: 'moon', size: 17, color: INK3 }),
      React.createElement('span', { style: { fontSize: 13, flex: 1 } }, 'Coupure caféine du soir'),
      React.createElement('select', { value: cutoff, onChange: (e) => store.set({ hydroPrefs: { ...(db.hydroPrefs || {}), eveningCutoff: parseInt(e.target.value, 10) } }),
        style: { padding: '6px 10px', border: `1.5px solid ${LINE}`, borderRadius: RADIUS_XS, background: SURFACE2, fontSize: 13, color: INK, cursor: 'pointer' } },
        [12, 13, 14, 15, 16, 17, 18].map((h) => React.createElement('option', { key: h, value: h }, h + 'h00')))),

    React.createElement(HydroAnalysis, { db, targetMl: Math.round(poids * 35) }),

    React.createElement('div', { style: ST.secLab }, 'Électrolytes'),
    React.createElement('div', { style: ST.noteBox(COL_EAU) },
      React.createElement(Icon, { name: 'bolt', size: 14, color: COL_EAU, style: { flexShrink: 0, marginTop: 1 } }),
      React.createElement('span', null,
        React.createElement('strong', null, 'Effort long ou chaleur : '),
        "vise ~500-700 mg de sodium/L (+ potassium, magnésium) au-delà de 60 min d'effort ou en forte chaleur pour prévenir crampes et hyponatrémie. Les boissons sport en apportent (preuve forte sur l'effort prolongé).")),

    React.createElement('div', { style: ST.noteBox(COL_CAF) },
      React.createElement(Icon, { name: 'cup', size: 14, color: COL_CAF }),
      React.createElement('span', null,
        React.createElement('strong', null, 'Caféine & sommeil : '),
        'demi-vie 5-7 h. Une prise après ' + cutoff + 'h peut dégrader le sommeil. Pour la perf : 3-6 mg/kg ~60 min avant l\'effort (Grgic 2020).')))
}

export default function HydrationSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('today')

  if (loading) {
    return React.createElement('div', { style: { minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK3, fontFamily: FONT } }, 'Chargement...')
  }

  const TABS = [
    { id: 'today', lab: "Aujourd'hui", ic: 'drop' },
    { id: 'trends', lab: 'Tendances', ic: 'chart' },
  ]

  return React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 55, backgroundColor: C.bg, backgroundImage: GRADIENTS.sante, backgroundAttachment: 'local', backgroundRepeat: 'no-repeat', display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: FONT, animation: 'spaceIn .22s ease' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 0', flexShrink: 0 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 38, height: 38, borderRadius: 11, background: SURFACE, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', boxShadow: '0 1px 3px rgba(43,43,43,.06), 0 1px 2px rgba(43,43,43,.04)' } },
        React.createElement(Icon, { name: 'back', size: 20 })),
      React.createElement('div', { style: { flex: 1, fontFamily: FONT, fontSize: 18, fontWeight: 700 } }, 'Hydratation')),
    React.createElement('div', { style: { display: 'flex', padding: '12px 16px 0' } },
      TABS.map((t) => {
        const isActive = tab === t.id
        return React.createElement('button', { key: t.id, onClick: () => setTab(t.id),
          style: { flex: 1, padding: '9px 6px', borderRadius: 999, fontWeight: 700, fontSize: 13, border: '1.5px solid ' + (isActive ? COL_EAU : LINE), background: isActive ? COL_EAU : SURFACE, color: isActive ? '#fff' : INK2, margin: '0 3px', transition: 'all .15s ease', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 } },
          React.createElement(Icon, { name: t.ic, size: 14, color: isActive ? '#fff' : INK3 }), t.lab)
      })),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '4px 16px 32px' } },
      tab === 'today' && React.createElement(TodayTab, { db, store }),
      tab === 'trends' && React.createElement(TrendsTab, { db, store })))
}
