import React, { useState } from 'react'
import { C, Icon, isoToday } from '../health/kit'
import { METRICS, parseScaleText, checkCoherence } from './scaleOcr'

const h = React.createElement

// ============================================================
// Import d'une capture d'écran de balance connectée.
//
// L'OCR s'exécute entièrement sur l'appareil : l'image ne quitte jamais
// le téléphone et rien n'est envoyé à un serveur. En contrepartie la
// lecture n'est pas parfaite, d'où l'écran de vérification : les valeurs
// détectées sont pré-remplies mais restent modifiables, et rien n'est
// enregistré avant confirmation explicite.
//
// Tesseract est chargé à la demande (import dynamique) : c'est plusieurs
// mégaoctets de moteur et de données de langue, hors de question de les
// imposer à tous les écrans au démarrage.
// ============================================================

const ORDER = METRICS.map((m) => m.key)

export default function ScaleImport({ onSave, onClose, defaultDate }) {
  const [phase, setPhase] = useState('pick') // pick | reading | review | error
  const [progress, setProgress] = useState(0)
  const [fields, setFields] = useState({})
  const [rejected, setRejected] = useState([])
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [error, setError] = useState(null)
  const [date, setDate] = useState(defaultDate || isoToday())

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError("Ce fichier n'est pas une image."); setPhase('error'); return }
    setPhase('reading'); setProgress(0); setError(null)
    let url
    try {
      const { default: Tesseract } = await import('tesseract.js')
      url = URL.createObjectURL(file)
      const res = await Tesseract.recognize(url, 'fra+eng', {
        logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) },
      })
      const text = (res && res.data && res.data.text) || ''
      setRawText(text)
      const { values, rejected: rej } = parseScaleText(text)
      if (Object.keys(values).length === 0) {
        setError("Aucune mesure n'a pu être lue sur cette image. Tu peux saisir les valeurs à la main ci-dessous.")
        setFields({})
        setRejected(rej)
        setPhase('review')
        return
      }
      const f = {}
      for (const [k, v] of Object.entries(values)) f[k] = String(v)
      setFields(f)
      setRejected(rej)
      setPhase('review')
    } catch (e) {
      // Le moteur se télécharge au premier usage : hors ligne, il échoue.
      setError("La lecture a échoué (" + (e && e.message ? e.message : 'erreur inconnue') + '). Une connexion est nécessaire au premier import, le temps de télécharger le moteur de lecture.')
      setPhase('error')
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  const parsed = {}
  for (const [k, v] of Object.entries(fields)) {
    const n = parseFloat(String(v).replace(',', '.'))
    if (Number.isFinite(n)) parsed[k] = n
  }
  const warns = checkCoherence(parsed)
  const filled = ORDER.filter((k) => parsed[k] != null)
  const canSave = parsed.kg > 0

  const sheet = (children) => h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 70, display: 'flex', alignItems: 'flex-end' } },
    h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '20px 20px 28px', boxSizing: 'border-box', maxHeight: '92vh', overflowY: 'auto' } },
      h('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 16px' } }),
      children))

  // ─── Choix du fichier ───────────────────────────────────────
  if (phase === 'pick' || phase === 'error') {
    return sheet(h('div', null,
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center' } }, 'Importer une capture'),
      h('p', { style: { fontSize: 13.5, color: C.ink2, textAlign: 'center', margin: '8px 0 18px', lineHeight: 1.5 } },
        'Choisis la capture d’écran de ton application de balance. La lecture se fait sur ton téléphone : l’image n’est envoyée nulle part.'),
      error && h('div', { style: { display: 'flex', gap: 9, padding: '11px 13px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${C.danger} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${C.danger} 28%, ${C.line})`, marginBottom: 14 } },
        h(Icon, { name: 'alert', size: 16, color: C.danger, style: { flexShrink: 0, marginTop: 1 } }),
        h('span', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } }, error)),
      h('label', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 18px', borderRadius: C.radius, border: `1.5px dashed ${C.line}`, background: C.surface2, cursor: 'pointer' } },
        h(Icon, { name: 'chart', size: 26, color: C.primary }),
        h('span', { style: { fontWeight: 700, fontSize: 14.5 } }, 'Choisir une image'),
        h('span', { style: { fontSize: 12, color: C.ink3 } }, 'PNG ou JPEG'),
        h('input', { type: 'file', accept: 'image/*', onChange: (e) => handleFile(e.target.files && e.target.files[0]), style: { display: 'none' } })),
      h('button', { onClick: () => { setFields({}); setRejected([]); setRawText(''); setPhase('review') }, style: { width: '100%', marginTop: 12, padding: 13, borderRadius: 999, background: 'transparent', border: `1.5px solid ${C.line}`, color: C.ink2, fontWeight: 700, fontSize: 14, cursor: 'pointer' } }, 'Saisir les mesures à la main')))
  }

  // ─── Lecture en cours ───────────────────────────────────────
  if (phase === 'reading') {
    return sheet(h('div', { style: { textAlign: 'center', padding: '14px 0 6px' } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 18 } }, 'Lecture de la capture…'),
      h('div', { style: { width: '100%', height: 6, borderRadius: 999, background: C.surface2, overflow: 'hidden', margin: '18px 0 10px' } },
        h('div', { style: { width: Math.max(4, progress) + '%', height: '100%', borderRadius: 999, background: C.primary, transition: 'width .3s ease' } })),
      h('div', { style: { fontSize: 12.5, color: C.ink3 } }, progress > 0 ? progress + ' %' : 'Préparation du moteur de lecture…'),
      h('p', { style: { fontSize: 11.5, color: C.ink3, marginTop: 14, lineHeight: 1.45 } }, 'Le premier import télécharge le moteur, les suivants sont immédiats.')))
  }

  // ─── Vérification avant enregistrement ──────────────────────
  return sheet(h('div', null,
    h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19, textAlign: 'center' } }, 'Vérifie les mesures'),
    h('p', { style: { fontSize: 12.5, color: C.ink2, textAlign: 'center', margin: '6px 0 16px', lineHeight: 1.45 } },
      filled.length ? `${filled.length} mesure${filled.length > 1 ? 's' : ''} détectée${filled.length > 1 ? 's' : ''}. Corrige ce qui est faux avant d’enregistrer.` : 'Renseigne au moins le poids.'),

    error && h('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45, padding: '11px 13px', borderRadius: C.radiusSm, background: C.surface2, marginBottom: 14 } }, error),

    warns.map((w, i) => h('div', { key: i, style: { display: 'flex', gap: 9, padding: '10px 12px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${C.warn} 12%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${C.warn} 30%, ${C.line})`, marginBottom: 8 } },
      h(Icon, { name: 'alert', size: 15, color: C.warn, style: { flexShrink: 0, marginTop: 1 } }),
      h('span', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.4 } }, w))),

    rejected.length > 0 && h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 12, lineHeight: 1.45 } },
      'Écarté car illisible ou hors plage : ', rejected.map((r) => r.label).join(', '), '.'),

    h('label', { style: { display: 'block', marginBottom: 12 } },
      h('span', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Date'),
      h('input', { type: 'date', value: date, max: isoToday(), onChange: (e) => setDate(e.target.value),
        style: { width: '100%', marginTop: 6, padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })),

    METRICS.map((m) => h('label', { key: m.key, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: `1px solid ${C.line}` } },
      h('span', { style: { flex: 1, fontSize: 13.5, fontWeight: 600, color: parsed[m.key] != null ? C.ink : C.ink3 } }, m.label),
      h('input', {
        type: 'number', inputMode: 'decimal', step: m.decimals ? '0.1' : '1',
        placeholder: '—',
        value: fields[m.key] === undefined ? '' : fields[m.key],
        onChange: (e) => setFields((f) => ({ ...f, [m.key]: e.target.value })),
        style: { width: 84, textAlign: 'right', padding: '8px 10px', borderRadius: C.radiusXs, border: `1.5px solid ${parsed[m.key] != null ? C.line : C.line}`, background: C.surface, color: C.ink, fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' },
      }),
      h('span', { style: { width: 34, fontSize: 12, color: C.ink3, fontWeight: 600 } }, m.unit))),

    rawText && h('button', { onClick: () => setShowRaw((v) => !v), style: { width: '100%', marginTop: 12, padding: 10, borderRadius: C.radiusSm, background: 'transparent', border: 'none', color: C.ink3, fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' } },
      showRaw ? '▾ Masquer le texte lu' : '▸ Voir le texte lu par l’appareil'),
    showRaw && h('pre', { style: { fontSize: 10.5, color: C.ink3, background: C.surface2, padding: 12, borderRadius: C.radiusSm, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto', margin: '0 0 8px' } }, rawText),

    h('button', {
      disabled: !canSave,
      onClick: () => { onSave({ date, ...parsed }); onClose() },
      style: { width: '100%', marginTop: 14, padding: 15, borderRadius: 999, background: canSave ? C.primary : C.surface2, color: canSave ? '#fff' : C.ink3, fontWeight: 800, fontSize: 15, border: 'none', cursor: canSave ? 'pointer' : 'default' },
    }, canSave ? 'Enregistrer' : 'Le poids est obligatoire'),
    h('button', { onClick: onClose, style: { width: '100%', marginTop: 10, padding: 12, borderRadius: 999, background: 'transparent', border: 'none', color: C.ink3, fontWeight: 700, fontSize: 14, cursor: 'pointer' } }, 'Annuler')))
}
