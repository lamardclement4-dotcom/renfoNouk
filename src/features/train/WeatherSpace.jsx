import React, { useState } from 'react'
import { C, Icon, FlowSpace, Card, isoToday } from '../health/kit'
import { WEATHER_FIELDS, parseWeatherText } from './weatherOcr'
import { weatherAdvice, adjustPace, fmtPace } from './weatherIntel'

const h = React.createElement

// ============================================================
// Conditions d'entraînement : saisie ou import d'une capture d'écran
// météo, puis adaptation de la charge. Les conditions sont enregistrées
// par jour dans db.weatherLog, ce qui permet de relire après coup dans
// quelles conditions une séance a été faite.
// ============================================================

const RISK_COLOR = { ok: C.success, moderate: C.warn, high: C.calorie, danger: C.danger, unknown: C.ink3 }

const DURATIONS = [30, 45, 60, 90, 120]

export default function WeatherSpace({ db, store, onClose }) {
  const today = isoToday()
  const saved = (db.weatherLog || {})[today] || null
  const [fields, setFields] = useState(() => {
    const o = {}
    if (saved) for (const f of WEATHER_FIELDS) if (saved[f.key] != null) o[f.key] = String(saved[f.key])
    return o
  })
  const [mins, setMins] = useState(60)
  const [phase, setPhase] = useState('idle') // idle | reading
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [rejected, setRejected] = useState([])

  const conditions = {}
  for (const f of WEATHER_FIELDS) {
    const n = parseFloat(String(fields[f.key] ?? '').replace(',', '.'))
    if (Number.isFinite(n)) conditions[f.key] = n
  }
  const advice = weatherAdvice(conditions, { sessionMins: mins })

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError("Ce fichier n'est pas une image."); return }
    setPhase('reading'); setProgress(0); setError(null)
    let url
    try {
      const { default: Tesseract } = await import('tesseract.js')
      url = URL.createObjectURL(file)
      const res = await Tesseract.recognize(url, 'fra+eng', {
        logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) },
      })
      const { values, rejected: rej } = parseWeatherText((res && res.data && res.data.text) || '')
      setRejected(rej)
      if (!Object.keys(values).length) {
        setError("Aucune donnée n'a pu être lue. Saisis les conditions à la main ci-dessous.")
      } else {
        const next = { ...fields }
        for (const [k, v] of Object.entries(values)) next[k] = String(v)
        setFields(next)
      }
    } catch (e) {
      setError('La lecture a échoué (' + (e && e.message ? e.message : 'erreur inconnue') + '). Une connexion est nécessaire au premier import, le temps de télécharger le moteur de lecture.')
    } finally {
      if (url) URL.revokeObjectURL(url)
      setPhase('idle')
    }
  }

  function save() {
    if (!Object.keys(conditions).length) return
    store.set({ weatherLog: { ...(db.weatherLog || {}), [today]: { ...conditions, date: today } } })
  }

  // Allure de référence du profil, s'il en a une : sert à montrer
  // concrètement ce que « +11 % » veut dire en minutes par kilomètre.
  const refPace = Number((db.profilePhys || {}).allureRef) || 300
  const adjusted = advice && advice.effort > 0 ? adjustPace(refPace, advice.effort) : null
  const riskCol = advice ? (RISK_COLOR[advice.risk.level] || C.ink3) : C.ink3

  return h(FlowSpace, {
    title: 'Conditions',
    subtitle: 'Renseigne la météo du jour pour ajuster la séance.',
    onClose,
    bg: 'entrainer',
  },
    // ─── Import ─────────────────────────────────────────────────
    h(Card, { style: { marginBottom: 12 } },
      phase === 'reading'
        ? h('div', { style: { textAlign: 'center', padding: '8px 0' } },
          h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, 'Lecture de la capture…'),
          h('div', { style: { width: '100%', height: 6, borderRadius: 999, background: C.surface2, overflow: 'hidden', margin: '14px 0 8px' } },
            h('div', { style: { width: Math.max(4, progress) + '%', height: '100%', borderRadius: 999, background: C.primary, transition: 'width .3s ease' } })),
          h('div', { style: { fontSize: 12, color: C.ink3 } }, progress > 0 ? progress + ' %' : 'Préparation du moteur…'))
        : h('label', { style: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' } },
          h('div', { style: { width: 42, height: 42, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            h(Icon, { name: 'plus', size: 20, color: C.primary })),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, 'Importer une capture météo'),
            h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2, lineHeight: 1.4 } }, 'Lecture sur ton téléphone, l’image n’est envoyée nulle part.')),
          h('input', { type: 'file', accept: 'image/*', onChange: (e) => handleFile(e.target.files && e.target.files[0]), style: { display: 'none' } }))),

    error && h('div', { style: { display: 'flex', gap: 9, padding: '11px 13px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${C.danger} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${C.danger} 26%, ${C.line})`, marginBottom: 12 } },
      h(Icon, { name: 'alert', size: 16, color: C.danger, style: { flexShrink: 0, marginTop: 1 } }),
      h('span', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } }, error)),

    rejected.length > 0 && h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 12, lineHeight: 1.45 } },
      'Écarté car illisible ou hors plage : ', rejected.map((r) => r.label).join(', '), '.'),

    // ─── Saisie ─────────────────────────────────────────────────
    h(Card, { style: { marginBottom: 12 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 6 } }, 'Conditions'),
      WEATHER_FIELDS.map((f, i) => h('label', { key: f.key, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
        h('span', { style: { flex: 1, fontSize: 13.5, fontWeight: 600, color: conditions[f.key] != null ? C.ink : C.ink3 } }, f.label),
        h('input', {
          type: 'number', inputMode: 'decimal', placeholder: '—',
          value: fields[f.key] === undefined ? '' : fields[f.key],
          onChange: (e) => setFields((v) => ({ ...v, [f.key]: e.target.value })),
          style: { width: 82, textAlign: 'right', padding: '8px 10px', borderRadius: C.radiusXs, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' },
        }),
        h('span', { style: { width: 36, fontSize: 11.5, color: C.ink3, fontWeight: 600 } }, f.unit)))),

    // ─── Adaptation ─────────────────────────────────────────────
    advice
      ? h(React.Fragment, null,
        h(Card, { style: { marginBottom: 12, background: `color-mix(in srgb, ${riskCol} 8%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${riskCol} 26%, ${C.line})` } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } },
            h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${riskCol} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h(Icon, { name: advice.risk.level === 'ok' ? 'check' : 'alert', size: 22, color: riskCol })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 800, fontSize: 15.5, color: riskCol } }, advice.risk.label),
              h('div', { style: { fontSize: 12.5, color: C.ink2, marginTop: 2 } }, 'Ressenti ', advice.feels, ' °C'))),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
            [
              { lab: 'Effort', val: advice.effort > 0 ? '+' + advice.effort + ' %' : '—' },
              { lab: 'Volume', val: advice.volumeCut > 0 ? '−' + advice.volumeCut + ' %' : '—' },
              { lab: 'Boisson', val: advice.hydration > 0 ? '+' + advice.hydration + ' ml' : '—' },
            ].map((s, i) => h('div', { key: i, style: { padding: '10px 8px', borderRadius: C.radiusSm, background: C.surface, textAlign: 'center' } },
              h('div', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800 } }, s.val),
              h('div', { style: { fontSize: 10.5, color: C.ink3, fontWeight: 600, marginTop: 2 } }, s.lab))))),

        // Durée de la séance : l'hydratation en dépend directement.
        h(Card, { style: { marginBottom: 12 } },
          h('div', { style: { fontSize: 12.5, color: C.ink2, fontWeight: 600, marginBottom: 10 } }, 'Durée prévue de la séance'),
          h('div', { style: { display: 'flex', gap: 7 } },
            DURATIONS.map((d) => h('button', {
              key: d,
              onClick: () => setMins(d),
              style: { flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: d === mins ? '#fff' : C.ink2, background: d === mins ? C.primary : C.surface, border: `1px solid ${d === mins ? C.primary : C.line}` },
            }, d + ' min'))),
          adjusted && h('div', { style: { marginTop: 12, padding: '11px 12px', borderRadius: C.radiusSm, background: C.surface2, fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } },
            'Concrètement, une allure de ', h('strong', null, fmtPace(refPace), '/km'), ' se court plutôt à ',
            h('strong', { style: { color: riskCol } }, fmtPace(adjusted), '/km'), ' dans ces conditions, à effort ressenti identique.')),

        h(Card, { style: { marginBottom: 14 } },
          h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 10 } }, 'Ce que ça change'),
          advice.tips.map((t, i) => h('div', { key: i, style: { display: 'flex', gap: 9, padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
            h('span', { style: { width: 5, height: 5, borderRadius: 999, background: riskCol, flexShrink: 0, marginTop: 7 } }),
            h('span', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.5 } }, t))),
          h('div', { style: { fontSize: 11, color: C.ink3, marginTop: 12, lineHeight: 1.45, fontStyle: 'italic' } },
            'Ordres de grandeur issus des repères usuels de physiologie de l’effort : à ajuster selon ton acclimatation.')))
      : h(Card, { style: { marginBottom: 14, textAlign: 'center', padding: '24px 16px' } },
        h('div', { style: { fontSize: 13.5, color: C.ink3, lineHeight: 1.5 } }, 'Renseigne au moins la température pour obtenir une adaptation.')),

    h('button', {
      disabled: !advice,
      onClick: save,
      style: { width: '100%', padding: 15, borderRadius: 999, background: advice ? C.primary : C.surface2, color: advice ? '#fff' : C.ink3, fontWeight: 800, fontSize: 15, border: 'none', cursor: advice ? 'pointer' : 'default' },
    }, saved ? 'Mettre à jour les conditions du jour' : 'Enregistrer les conditions du jour'))
}
