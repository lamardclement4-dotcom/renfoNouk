import React from 'react'

// ============================================================
// Kit UI partagé des modules Santé, porté depuis l'ancienne app.
// L'ancienne app utilisait des CSS custom properties (var(--surface)…) ;
// on les fige ici en constantes littérales cohérentes avec le reste
// (fond #faf9f5, surfaces blanches, accent terracotta).
// ============================================================
export const C = {
  bg: '#faf9f5',
  surface: '#fff',
  surface2: '#f5f4ef',
  ink: '#2b2b2b',
  ink2: '#666',
  ink3: '#999',
  line: '#e6e3dd',
  primary: '#c25a3f',
  radius: 16,
  radiusSm: 12,
  radiusXs: 10,
  font: '-apple-system, BlinkMacSystemFont, sans-serif',
}

// Teintes par module (valeurs exactes de MODULE_TINTS de l'ancienne app).
export const MODULE_TINTS = {
  mobilite: '#6f8fa6',
  renfo: '#bf6a40',
  fullbody: '#bd923f',
  plyo: '#a85a36',
  recup: '#5b8a72',
  nutrition: '#6f8a3a',
  hydratation: '#2e7d9e',
  sommeil: '#4a6fa5',
  prevention: '#5f7d8c',
  cycle: '#b5566a',
  esprit: '#3f8f8a',
  complements: '#b8934a',
  danger: '#b5566a',
}

const ICONS = {
  apple: '🍎', drop: '💧', droplet: '💧', moon: '🌙', shield: '🛡️', wave: '🌊',
  spark: '✨', cup: '☕', leaf: '🌿', flame: '🔥', layers: '📊', route: '🏁',
  bolt: '⚡', zap: '⚡', target: '🎯', dumbbell: '🏋️', user: '👤', close: '✕',
  back: '←', arrow: '→', next: '›', play: '▶', check: '✓', chart: '📈', clock: '🕐',
  search: '🔍', heart: '❤', battery: '🔋', bell: '🔔', calendar: '📅', plus: '+',
  pill: '💊', sun: '☀️', bed: '🛏️', wind: '🍃', brain: '🧠', alert: '⚠',
  info: 'ℹ️', star: '★', run: '🏃', stretch: '🤸', snow: '❄️', trophy: '🏆',
}
export function Icon({ name, size = 16, color, style }) {
  return React.createElement('span', { style: { fontSize: size, lineHeight: 1, color, display: 'inline-block', ...style } }, ICONS[name] || '•')
}

// Conteneur plein écran d'un "space" (flow) avec en-tête + zone scrollable.
export function FlowSpace({ title, onClose, action, tint, children }) {
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 8px', flexShrink: 0 } },
      React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
        React.createElement(Icon, { name: 'back', size: 20 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15, color: tint || C.ink } }, title),
      React.createElement('div', { style: { width: 40, display: 'flex', justifyContent: 'flex-end' } }, action || null)),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '4px 18px 32px' } }, children))
}

export function SpaceBanner({ ic, tint, title, text }) {
  return React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: tint, color: '#fff', marginBottom: 18 } },
    React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } },
      React.createElement(Icon, { name: ic, size: 24, color: '#fff' })),
    React.createElement('div', { style: { fontFamily: C.font, fontSize: 22, fontWeight: 700, lineHeight: 1.1 } }, title),
    React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 8, lineHeight: 1.5 } }, text))
}

export function SecLab({ children, style }) {
  return React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '18px 2px 10px', ...style } }, children)
}

export function NoteBox({ tint = C.primary, children }) {
  return React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${tint} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${tint} 25%, ${C.line})`, fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 14 } },
    React.createElement('span', { style: { color: tint, fontWeight: 800, flex: '0 0 auto' } }, '!'),
    React.createElement('span', null, children))
}

export function SegTabs({ tabs, value, onChange, tint = C.primary }) {
  return React.createElement('div', { style: { display: 'flex', gap: 6, background: C.surface2, padding: 4, borderRadius: 999, marginBottom: 18 } },
    tabs.map((t) => {
      const active = value === t.id
      return React.createElement('button', { key: t.id, onClick: () => onChange(t.id),
        style: { flex: 1, padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', color: active ? '#fff' : C.ink2, background: active ? tint : 'transparent', transition: 'all .15s ease' } }, t.lab)
    }))
}

export function Pill({ tint = C.primary, children }) {
  return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: tint, background: `color-mix(in srgb, ${tint} 12%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${tint} 30%, ${C.line})` } }, children)
}

// Bouton d'action pleine largeur.
export function PrimaryBtn({ tint = C.primary, onClick, disabled, children, style }) {
  return React.createElement('button', { onClick, disabled,
    style: { width: '100%', padding: 15, borderRadius: 999, fontSize: 15, fontWeight: 800, border: 'none', color: '#fff', background: disabled ? C.surface2 : tint, cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : `0 12px 26px -14px ${tint}`, ...style } }, children)
}

export function Choice({ tint = C.primary, value, set, options, multi }) {
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
    options.map((o) => {
      const active = multi ? (value || []).includes(o.id) : value === o.id
      return React.createElement('button', { key: o.id, type: 'button', onClick: () => set(o.id),
        style: { padding: '10px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          border: '1.5px solid ' + (active ? tint : '#ddd'),
          background: active ? `color-mix(in srgb, ${tint} 12%, ${C.surface})` : C.surface,
          color: active ? tint : C.ink2 } }, o.lab)
    }))
}

export function isoToday() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
export function isoShift(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
