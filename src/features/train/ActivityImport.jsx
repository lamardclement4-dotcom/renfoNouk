import React, { useState } from 'react'
import { C, Icon, FlowSpace, Card } from '../health/kit'
import { SPORTS } from './trainData'
import { parseActivityFile, parseActivityText, toSession } from './activityParse'

const h = React.createElement

// ============================================================
// Import d'une activité venue d'ailleurs : fichier de trace exporté
// (Strava, Garmin, Decathlon, Polar…) ou capture d'écran du résumé.
//
// Rien n'est enregistré sans être montré d'abord. Une séance mal lue et
// enregistrée en silence fausse la charge, les records et les moyennes
// pendant des mois sans qu'on sache pourquoi : l'écran affiche donc ce
// qu'il a compris, et attend une confirmation.
// ============================================================

const ROWS = [
  { k: 'distance', lab: 'Distance', unit: 'km' },
  { k: 'temps', lab: 'Temps', unit: '' },
  { k: 'denivele', lab: 'Dénivelé+', unit: 'm' },
  { k: 'fc', lab: 'FC moyenne', unit: 'bpm' },
  { k: 'cadence', lab: 'Cadence', unit: '' },
  { k: 'calories', lab: 'Calories', unit: 'kcal' },
]

const SOURCE_LABEL = { gpx: 'fichier GPX', tcx: 'fichier TCX', capture: 'capture d’écran' }

export default function ActivityImport({ onSave, onClose }) {
  const [phase, setPhase] = useState('idle') // idle | reading | preview
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(null)

  function accept(activity, fallbackName) {
    if (!activity || (activity.km == null && activity.seconds == null)) {
      setError(`Rien de lisible dans ${fallbackName}. Un export GPX ou TCX, ou une capture montrant distance et temps.`)
      setPhase('idle')
      return
    }
    const sess = toSession(activity, {})
    if (!sess) {
      setError("Aucune date trouvée dans le fichier. Choisis la séance à la main dans le calendrier.")
      setPhase('idle')
      return
    }
    setDraft(sess)
    setPhase('preview')
  }

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setPhase('reading')
    setProgress(0)
    try {
      if (/^image\//.test(file.type)) {
        // Tesseract pèse plusieurs mégaoctets : il n'est chargé qu'ici, au
        // moment où on s'en sert. L'image ne quitte pas l'appareil.
        const { default: Tesseract } = await import('tesseract.js')
        const url = URL.createObjectURL(file)
        const res = await Tesseract.recognize(url, 'fra+eng', {
          logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) },
        })
        URL.revokeObjectURL(url)
        accept(parseActivityText(res.data.text), 'cette capture')
      } else {
        const text = await file.text()
        accept(parseActivityFile(text), 'ce fichier')
      }
    } catch (e) {
      setError('Lecture impossible : ' + (e && e.message ? e.message : 'fichier illisible'))
      setPhase('idle')
    }
  }

  function save() {
    if (!draft || !draft.sport) return
    onSave(draft)
    onClose()
  }

  const pick = (lab, sub, accepts) => h('label', { style: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' } },
    h('div', { style: { width: 42, height: 42, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: 'plus', size: 20, color: C.primary })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, lab),
      h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2, lineHeight: 1.4 } }, sub)),
    h('input', { type: 'file', accept: accepts, onChange: (e) => handleFile(e.target.files && e.target.files[0]), style: { display: 'none' } }))

  return h(FlowSpace, { title: 'Importer une activité', onClose, fixed: false, bg: 'entrainer' },

    phase === 'reading'
      ? h(Card, { style: { marginBottom: 12, textAlign: 'center', padding: '20px 16px' } },
        h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, 'Lecture…'),
        h('div', { style: { width: '100%', height: 6, borderRadius: 999, background: C.surface2, overflow: 'hidden', margin: '14px 0 8px' } },
          h('div', { style: { width: Math.max(4, progress) + '%', height: '100%', borderRadius: 999, background: C.primary, transition: 'width .3s ease' } })),
        h('div', { style: { fontSize: 12, color: C.ink3 } }, progress > 0 ? progress + ' %' : 'Préparation…'))
      : null,

    phase !== 'preview' && phase !== 'reading' ? h('div', null,
      h(Card, { style: { marginBottom: 12 } },
        pick('Fichier d’activité', 'Export GPX ou TCX — Strava, Garmin, Decathlon, Polar, Suunto…', '.gpx,.tcx,application/gpx+xml,text/xml')),
      h(Card, { style: { marginBottom: 12 } },
        pick('Capture d’écran', 'Le résumé de l’activité. La lecture se fait sur l’appareil, l’image n’est envoyée nulle part.', 'image/*')),
      h('p', { style: { fontSize: 12, color: C.ink3, lineHeight: 1.5, padding: '0 4px' } },
        'Le fichier exporté est plus fiable qu’une capture : il porte la trace complète, donc la distance réelle et le dénivelé. La capture dépanne quand l’export n’est pas à portée.'),
    ) : null,

    error ? h('div', { style: { display: 'flex', gap: 9, padding: '11px 13px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${C.danger} 8%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${C.danger} 25%, ${C.line})`, marginBottom: 12 } },
      h(Icon, { name: 'alert', size: 16, color: C.danger, style: { flexShrink: 0, marginTop: 1 } }),
      h('span', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } }, error)) : null,

    phase === 'preview' && draft ? h('div', null,
      h(Card, { style: { marginBottom: 12 } },
        h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 2 } }, 'Ce qui a été lu'),
        h('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 12 } },
          'D’après ', SOURCE_LABEL[draft.source] || 'ce fichier', ' · ',
          new Date(draft.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
          draft.heure ? ' à ' + draft.heure : ''),
        ROWS.map((r, i) => {
          const v = draft.data[r.k]
          if (v == null) return null
          return h('div', { key: r.k, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
            h('span', { style: { flex: 1, fontSize: 13.5, fontWeight: 600 } }, r.lab),
            h('span', { style: { fontFamily: C.font, fontSize: 15, fontWeight: 700 } }, String(v).replace('.', ',')),
            h('span', { style: { width: 34, fontSize: 11.5, color: C.ink3, fontWeight: 600 } }, r.unit))
        }),
        h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 10, lineHeight: 1.45 } },
          'Durée retenue : ', draft.duree, draft.data.temps ? ` · temps ${draft.data.temps}` : '')),

      // Le sport n'est pas toujours déductible d'un export. Plutôt que
      // d'en choisir un au hasard, on le demande : une séance rangée dans
      // la mauvaise discipline en fausse l'analyse pendant des mois.
      h(Card, { style: { marginBottom: 12 } },
        h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15, marginBottom: 8 } },
          draft.sport ? 'Sport' : 'Quel sport ?'),
        !draft.sport ? h('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 10, lineHeight: 1.45 } },
          'Le fichier ne le dit pas. Sans lui, la séance ne peut pas être analysée.') : null,
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
          SPORTS.map((s) => {
            const on = s.id === draft.sport
            return h('button', {
              key: s.id, onClick: () => setDraft({ ...draft, sport: s.id }),
              style: { padding: '8px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? C.primary : C.line}`, background: on ? C.primary : 'transparent', color: on ? '#fff' : C.ink2 },
            }, s.label)
          }))),

      h('div', { style: { display: 'flex', gap: 9 } },
        h('button', {
          onClick: () => { setDraft(null); setPhase('idle'); setError(null) },
          style: { flex: 1, padding: '13px', borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
        }, 'Recommencer'),
        h('button', {
          onClick: save, disabled: !draft.sport,
          style: { flex: 2, padding: '13px', borderRadius: C.radiusSm, border: 'none', background: draft.sport ? C.primary : C.surface2, color: draft.sport ? '#fff' : C.ink3, fontSize: 14, fontWeight: 700, cursor: draft.sport ? 'pointer' : 'default' },
        }, 'Enregistrer la séance')),
    ) : null)
}
