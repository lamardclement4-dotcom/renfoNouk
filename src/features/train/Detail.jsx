import React from 'react'
import { C, Icon, Pill } from '../health/kit'
import { CATS, getSession, sessionExercises } from './trainData'

const ZONE_LABELS = { genoux: 'Genoux', dos: 'Dos / lombaires', epaules: 'Épaules', chevilles: 'Chevilles', hanches: 'Hanches', poignets: 'Poignets / coudes', cou: 'Cou / cervicales' }

export function SessionCard({ s, onOpen }) {
  const cat = CATS[s.cat]
  const n = sessionExercises(s).length
  return React.createElement('button', { onClick: () => onOpen(s.id), style: { display: 'flex', alignItems: 'stretch', width: '100%', textAlign: 'left', borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, overflow: 'hidden', marginBottom: 10, cursor: 'pointer' } },
    React.createElement('div', { style: { width: 68, flex: '0 0 auto', background: `color-mix(in srgb, ${cat.tint} 35%, ${C.surface2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 } }, cat.icon || '🏋️'),
    React.createElement('div', { style: { flex: 1, textAlign: 'left', minWidth: 0, padding: '12px 14px' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 } },
        React.createElement('span', { style: { width: 7, height: 7, borderRadius: 999, background: cat.tint } }),
        React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: cat.tint, textTransform: 'uppercase', letterSpacing: '.03em' } }, cat.label)),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 16.5, fontWeight: 600, letterSpacing: '-.01em' } }, s.title),
      React.createElement('div', { style: { fontSize: 13, color: C.ink3, marginTop: 4, display: 'flex', gap: 12 } },
        React.createElement('span', null, s.mins, ' min'), React.createElement('span', null, '·'),
        React.createElement('span', null, n, ' mvts'), React.createElement('span', null, '·'),
        React.createElement('span', null, s.level))),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', paddingRight: 14 } }, React.createElement(Icon, { name: 'arrow', size: 18, color: C.ink3 })))
}

export default function Detail({ id, program, sensitiveZones, onBack, onStart }) {
  const s = getSession(id, program)
  if (!s) {
    return React.createElement('div', { style: { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: 24 } },
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 18 } }, 'Séance introuvable'),
      React.createElement('p', { style: { fontSize: 14, color: C.ink2, maxWidth: 280 } }, "Cette séance n'existe plus ou n'a pas pu être chargée."),
      React.createElement('button', { onClick: onBack, style: { padding: '11px 18px', borderRadius: 999, background: C.primary, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' } }, 'Retour'))
  }
  const cat = CATS[s.cat] || { tint: C.primary, label: '' }
  const blocks = sessionExercises(s)
  const rows = []
  blocks.forEach((b) => {
    const last = rows[rows.length - 1]
    if (last && last.key === b.key && b.side) last.sides = 2
    else rows.push({ ...b, sides: b.side ? 1 : 0 })
  })
  const zoneLabels = (sensitiveZones || []).map((z) => ZONE_LABELS[z] || z).join(' · ')

  return React.createElement('div', { style: { padding: '18px 18px 32px', maxWidth: 460, margin: '0 auto', fontFamily: C.font } },
    React.createElement('div', { style: { position: 'relative', height: 200, borderRadius: C.radius, overflow: 'hidden', marginBottom: 18, background: `color-mix(in srgb, ${cat.tint} 22%, ${C.surface})` } },
      React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement('span', { style: { fontSize: 88, opacity: 0.15 } }, cat.icon || '🏋️')),
      React.createElement('button', { onClick: onBack, 'aria-label': 'Retour', style: { position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 999, background: C.surface, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'back', size: 18 })),
      React.createElement('div', { style: { position: 'absolute', left: 18, bottom: 14, right: 18 } },
        React.createElement(Pill, { solid: true, tint: cat.tint, style: { marginBottom: 8 } }, cat.label),
        React.createElement('h1', { style: { fontFamily: C.font, fontSize: 26, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.015em' } }, s.title))),

    React.createElement('p', { style: { color: C.ink2, fontSize: 15, lineHeight: 1.5, marginBottom: 16 } }, s.subtitle, '.'),

    zoneLabels && React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, background: 'color-mix(in srgb, #c4a03a 12%, ' + C.surface + ')', border: '1px solid color-mix(in srgb, #c4a03a 35%, ' + C.line + ')', marginBottom: 16 } },
      React.createElement(Icon, { name: 'shield', size: 17, color: '#a8862a' }),
      React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.45 } },
        React.createElement('strong', { style: { color: C.ink } }, 'Zones à ménager : ', zoneLabels, '. '),
        "Réduis l'amplitude ou saute un mouvement si tu sens une gêne, et stoppe en cas de douleur.")),

    React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 20 } },
      [{ ic: 'clock', v: s.mins + ' min', l: 'Durée' }, { ic: 'layers', v: blocks.length, l: 'Mouvements' }, { ic: 'target', v: s.level, l: 'Niveau' }].map((m, i) =>
        React.createElement('div', { key: i, style: { flex: 1, padding: '12px 8px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, textAlign: 'center' } },
          React.createElement(Icon, { name: m.ic, size: 17, color: C.primary }),
          React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15, marginTop: 6 } }, m.v),
          React.createElement('div', { style: { fontSize: 11, color: C.ink3, fontWeight: 600 } }, m.l)))),

    s.focus && React.createElement(React.Fragment, null,
      React.createElement('div', { style: { fontSize: 13, color: C.ink3, fontWeight: 600, marginBottom: 4 } }, 'Focus'),
      React.createElement('div', { style: { fontSize: 15, color: C.ink2, marginBottom: 22 } }, s.focus)),

    React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 18, marginBottom: 12 } }, 'Programme'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 22 } },
      rows.map((r, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 'none' } },
        React.createElement('span', { style: { fontFamily: C.font, fontSize: 13, fontWeight: 700, color: C.ink3, width: 20 } }, String(i + 1).padStart(2, '0')),
        React.createElement('div', { style: { width: 40, height: 40, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb, ${CATS[r.cat].tint} 14%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement('span', { style: { fontSize: 19 } }, CATS[r.cat].icon || '🏋️')),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 14.5 } }, r.name),
          React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, r.type === 'hold' ? `${r.secs}s` : `${r.reps} reps`, r.sides === 2 ? ' · 2 côtés' : '', r.muscles ? ` · ${r.muscles}` : '')),
        React.createElement(Pill, { tint: C.ink3 }, r.type === 'hold' ? 'Maintien' : 'Répétitions')))),

    React.createElement('button', { onClick: onStart, style: { width: '100%', padding: 16, borderRadius: 999, background: C.primary, color: '#fff', fontWeight: 700, fontSize: 15.5, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 12px 26px -14px ${C.primary}` } },
      React.createElement(Icon, { name: 'play', size: 16, color: '#fff' }), 'Commencer la séance'))
}
