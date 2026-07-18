import React from 'react'
import { C, Icon, FlowSpace, SpaceBanner, NoteBox } from '../health/kit'
import { SESSIONS, sessionDuration } from './trainData'

const PLYO_T = '#a85a36'

export default function PliometrieSpace({ onClose, onOpenSession }) {
  const list = SESSIONS.filter((s) => s.cat === 'plyo')
  return React.createElement(FlowSpace, { title: 'Pliométrie', onClose },
    React.createElement(SpaceBanner, { ic: 'bolt', tint: PLYO_T, title: 'Sauts & explosivité', text: 'Le travail de rebond rend la foulée plus économique et plus puissante. À placer en début de séance, sur jambes fraîches.' }),
    React.createElement('div', { style: { padding: '14px 16px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 18 } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Avant de commencer'),
      [
        ['Pré-requis', 'Prévois 3–6 mois de course + renfo avant de te lancer. Réception « comme un chat », sur l’avant des pieds.'],
        ['Dosage', 'Compte 1–2 séances/semaine, 48 h de récup entre deux. Commence à 2 × 6–8 reps et progresse sur 4–6 semaines.'],
        ['Quand', 'En début de séance, après l’échauffement — jamais sur des muscles fatigués.'],
      ].map(([k, v], i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 10, marginBottom: 7 } },
        React.createElement('span', { style: { color: PLYO_T, fontWeight: 800, flex: '0 0 auto' } }, '·'),
        React.createElement('div', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.45 } }, React.createElement('strong', { style: { color: C.ink } }, k, ' :'), ' ', v)))),

    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Séances, du plus simple au plus exigeant'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 } },
      list.map((s) => {
        const mins = sessionDuration(s)
        return React.createElement('button', { key: s.id, onClick: () => onOpenSession(s.id), style: { display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', padding: 12, borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer' } },
          React.createElement('div', { style: { width: 52, height: 52, borderRadius: 14, flex: '0 0 auto', background: `color-mix(in srgb, ${PLYO_T} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement(Icon, { name: 'bolt', size: 22, color: PLYO_T })),
          React.createElement('div', { style: { flex: 1, textAlign: 'left', minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: PLYO_T, textTransform: 'uppercase', letterSpacing: '.03em' } }, s.level),
            React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 16, marginTop: 1 } }, s.title),
            React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 2, lineHeight: 1.4 } }, s.subtitle),
            React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 6 } }, mins, ' min · ', s.keys.length, ' mvts')),
          React.createElement(Icon, { name: 'arrow', size: 19, color: C.ink3, style: { flex: '0 0 auto', alignSelf: 'center' } }))
      })),

    React.createElement(NoteBox, { tint: PLYO_T }, 'Règle d’or : qualité > quantité. Dès que la réception devient bruyante ou molle, arrête la série. Stop immédiat en cas de douleur osseuse ou de point précis qui revient à chaque saut.'))
}
