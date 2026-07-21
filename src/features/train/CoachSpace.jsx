import React, { useState, useRef, useEffect } from 'react'
import { C, Icon, SegTabs } from '../health/kit'
import { recommendations } from './renfoIntel'
import { coachGreeting, coachReply } from './coachChat'

const COACH = '#534ab7'

const GROUPS = [
  { level: 'alert', label: 'À traiter en priorité', color: '#c46a3a' },
  { level: 'warn', label: 'À surveiller', color: '#c4a03a' },
  { level: 'info', label: 'Conseils', color: C.primary },
]

// Libellé du bouton d'action par destination — affiché sur chaque carte
// de recommandation cliquable pour ouvrir directement le module concerné.
const ACTION_LABELS = {
  nutrition: 'Ouvrir Nutrition', hydratation: 'Ouvrir Hydratation', sommeil: 'Ouvrir Sommeil',
  prevention: 'Ouvrir Prévention', mobility: 'Ouvrir Mobilité', tests: 'Ouvrir Tests physiques',
  planner: 'Ouvrir le Calendrier', esprit: 'Ouvrir Esprit', cycle: 'Ouvrir Cycle',
  complements: 'Ouvrir Compléments', peak: 'Ouvrir Pic de forme', recovery: 'Ouvrir Récupération',
}

// Onglet "Conseils" : les recommandations groupées par priorité (inchangé).
function AdviceTab({ db, onAction }) {
  const recos = recommendations(db)
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: COACH, color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
        React.createElement(Icon, { name: 'target', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 19, fontWeight: 700, lineHeight: 1.15 } }, 'Tes recommandations'),
      React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 7, lineHeight: 1.5 } }, 'Générées à partir de tes données réelles (charge, sommeil, nutrition, mobilité, tests). Touche une carte pour ouvrir le module concerné — ou passe sur « Discuter » pour me poser une question.')),

    recos.length === 0
      ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px', gap: 12 } },
        React.createElement('div', { style: { width: 56, height: 56, borderRadius: 999, background: 'color-mix(in srgb, #4a8a6a 16%, ' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement(Icon, { name: 'check', size: 26, color: '#4a8a6a' })),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, 'Rien à signaler'),
        React.createElement('p', { style: { fontSize: 13, color: C.ink3, maxWidth: 280, lineHeight: 1.4 } }, 'Aucune recommandation active selon tes données actuelles. Reviens après avoir renseigné plus d\'informations (sommeil, séances, tests) pour des conseils plus précis.'))
      : GROUPS.map((g) => {
        const items = recos.filter((r) => r.level === g.level)
        if (!items.length) return null
        return React.createElement('div', { key: g.level, style: { marginBottom: 18 } },
          React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, g.label),
          items.map((r, i) => {
            const clickable = !!(r.action && onAction)
            return React.createElement(clickable ? 'button' : 'div', {
              key: i,
              onClick: clickable ? () => onAction(r.action) : undefined,
              style: {
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: C.radiusSm, marginBottom: 8,
                background: `color-mix(in srgb, ${g.color} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${g.color} 25%, ${C.line})`,
                width: '100%', textAlign: 'left', cursor: clickable ? 'pointer' : 'default',
              },
            },
              React.createElement(Icon, { name: r.icon || 'target', size: 16, color: g.color, style: { flex: '0 0 auto', marginTop: 1 } }),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('span', { style: { fontSize: 13.5, color: C.ink, lineHeight: 1.45 } }, r.text),
                clickable && React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: g.color, marginTop: 6 } }, ACTION_LABELS[r.action] || 'Ouvrir')),
              clickable && React.createElement(Icon, { name: 'arrow', size: 16, color: g.color, style: { flex: '0 0 auto', marginTop: 1 } }))
          }))
      }),

    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, marginTop: 8, background: `color-mix(in srgb, ${COACH} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${COACH} 22%, ${C.line})` } },
      React.createElement(Icon, { name: 'search', size: 16, color: COACH, style: { flex: '0 0 auto', marginTop: 2 } }),
      React.createElement('p', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'Système de règles déterministe (pas un modèle de langage) : transparent et basé sur des seuils documentés.')))
}

// Onglet "Discuter" : conversation avec le coach, entrée libre + suggestions.
function ChatTab({ db, onAction }) {
  const [messages, setMessages] = useState(() => [coachGreeting()])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  function send(text) {
    const t = (text || '').trim()
    if (!t || typing) return
    setMessages((m) => [...m, { from: 'user', text: t }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [...m, coachReply(t, db)])
      setTyping(false)
    }, 450)
  }

  const last = messages[messages.length - 1]
  const chips = !typing && last && last.from === 'coach' && last.chips ? last.chips : []

  return React.createElement(React.Fragment, null,
    React.createElement('div', { ref: scrollRef, style: { flex: 1, overflowY: 'auto', padding: '4px 18px 12px', display: 'flex', flexDirection: 'column', gap: 10 } },
      messages.map((m, i) => {
        const coach = m.from === 'coach'
        return React.createElement('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: coach ? 'flex-start' : 'flex-end' } },
          React.createElement('div', { style: {
            maxWidth: '86%', padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
            borderRadius: coach ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
            background: coach ? C.surface : COACH, color: coach ? C.ink : '#fff',
            border: coach ? `1px solid ${C.line}` : 'none',
          } }, m.text),
          coach && m.action && onAction && React.createElement('button', {
            onClick: () => onAction(m.action),
            style: { marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700, color: COACH, background: `color-mix(in srgb, ${COACH} 10%, ${C.surface})`, border: `1.5px solid color-mix(in srgb, ${COACH} 35%, ${C.line})`, cursor: 'pointer' },
          }, m.actionLabel || 'Ouvrir', React.createElement(Icon, { name: 'arrow', size: 14, color: COACH })))
      }),
      typing && React.createElement('div', { style: { alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: C.surface, border: `1px solid ${C.line}`, color: C.ink3, fontSize: 14 } }, '…')),

    chips.length > 0 && React.createElement('div', { style: { display: 'flex', gap: 7, overflowX: 'auto', padding: '4px 18px 8px', flexShrink: 0 } },
      chips.map((c, i) => React.createElement('button', { key: i, onClick: () => send(c),
        style: { flex: '0 0 auto', padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: COACH, background: C.surface, border: `1.5px solid color-mix(in srgb, ${COACH} 30%, ${C.line})`, cursor: 'pointer', whiteSpace: 'nowrap' } }, c))),

    React.createElement('form', { onSubmit: (e) => { e.preventDefault(); send(input) }, style: { display: 'flex', gap: 8, padding: '8px 18px calc(14px + env(safe-area-inset-bottom))', borderTop: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 } },
      React.createElement('input', {
        value: input, onChange: (e) => setInput(e.target.value), placeholder: 'Écris ta question…',
        style: { flex: 1, padding: '11px 14px', borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.bg, fontSize: 14.5, outline: 'none' },
      }),
      React.createElement('button', { type: 'submit', 'aria-label': 'Envoyer', disabled: !input.trim(),
        style: { width: 42, height: 42, borderRadius: 999, border: 'none', background: input.trim() ? COACH : C.surface2, color: '#fff', fontSize: 17, cursor: input.trim() ? 'pointer' : 'default', flex: '0 0 auto' } }, '➤')))
}

export default function CoachSpace({ db, onClose, onAction }) {
  const [tab, setTab] = useState('chat')

  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, animation: 'spaceIn .22s ease' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 8px', flexShrink: 0 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadowSm } },
        React.createElement(Icon, { name: 'back', size: 20 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15 } }, 'Coach'),
      React.createElement('div', { style: { width: 40 } })),
    React.createElement('div', { style: { padding: '4px 18px 0', flexShrink: 0 } },
      React.createElement(SegTabs, { tabs: [{ id: 'chat', lab: 'Discuter' }, { id: 'conseils', lab: 'Conseils' }], value: tab, onChange: setTab, tint: COACH })),
    tab === 'chat'
      ? React.createElement(ChatTab, { db, onAction })
      : React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '4px 18px 32px' } },
        React.createElement(AdviceTab, { db, onAction })))
}
