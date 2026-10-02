import React, { useState, lazy } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, isoToday } from './kit'
import { PHASES } from './cycleData'

// Les sept sous-espaces ne s'ouvrent que sur une tuile pressée. Chargés
// d'avance, ils pesaient tous sur l'ouverture de « Santé » : la table
// CIQUAL et le catalogue des boissons dépassent à eux seuls 200 ko, que
// personne ne lit tant qu'il n'a pas ouvert Nutrition ou Hydratation.
const NutritionSpace = lazy(() => import('../nutrition/Nutrition'))
const HydrationSpace = lazy(() => import('../hydration/Hydration'))
const SleepSpace = lazy(() => import('./Sleep'))
const PreventionSpace = lazy(() => import('./Prevention'))
const CycleSpace = lazy(() => import('./Cycle'))
const BreathingSpace = lazy(() => import('./Breathing'))
const ComplementsSpace = lazy(() => import('./Complements'))
// Recettes à suivre en cuisinant : à part de la nutrition, dont les recettes
// sont des compositions pesées pour les macros.
const CookbookSpace = lazy(() => import('../nutrition/CookbookSpace'))

// ============================================================
// Écran "Santé & bien-être" — porte de sortie de l'ancienne app
// vers ses 7 sous-espaces. Nutrition et Hydratation existaient déjà
// comme modules séparés ; les 5 autres sont ajoutés ici.
// ============================================================
export default function HealthHome({ userId, onClose, initialSpace, embedded }) {
  const { db, loading } = useNutritionStore(userId)
  const [space, setSpace] = useState(initialSpace || null)

  // Quand l'écran est ouvert en profondeur depuis ailleurs (une
  // recommandation, l'accueil, la progression), fermer doit ramener à
  // l'appelant, pas déposer sur la grille des sept tuiles que la personne
  // n'a jamais demandée. Même correctif que côté entraînement.
  const backToHub = embedded ? onClose : () => setSpace(null)

  if (space === 'nutrition') return React.createElement(NutritionSpace, { userId, onClose: backToHub })
  if (space === 'hydratation') return React.createElement(HydrationSpace, { userId, onClose: backToHub })
  if (space === 'sommeil') return React.createElement(SleepSpace, { userId, onClose: backToHub })
  if (space === 'prevention') return React.createElement(PreventionSpace, { userId, onClose: backToHub })
  if (space === 'cycle') return React.createElement(CycleSpace, { userId, onClose: backToHub })
  if (space === 'esprit') return React.createElement(BreathingSpace, { userId, onClose: backToHub })
  if (space === 'complements') return React.createElement(ComplementsSpace, { userId, onClose: backToHub })
  if (space === 'cuisine') return React.createElement(CookbookSpace, { userId, onClose: backToHub })

  if (loading) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  const todayKey = isoToday()
  const sleepToday = (db.sleepLog || {})[todayKey]
  const cyclePhaseLabel = db.cycle && db.cycle.enabled && db.cycle.startDate
    ? (() => {
        try {
          const len = db.cycle.cycleLen || 28, pl = db.cycle.periodLen || 5
          const start = new Date(db.cycle.startDate + 'T00:00:00')
          const t = new Date(); t.setHours(0, 0, 0, 0)
          const diff = Math.floor((t - start) / 864e5)
          const day = ((diff % len) + len) % len + 1
          const phase = day <= pl ? 'menstruation' : day <= Math.round(len * 0.46) ? 'folliculaire' : day <= Math.round(len * 0.57) ? 'ovulation' : 'luteale'
          return PHASES[phase].label
        } catch { return 'Femmes' }
      })()
    : 'Femmes'

  const tiles = [
    { ic: 'apple', tint: MODULE_TINTS.nutrition, lab: 'Nutrition', sub: 'Cal · macros', on: 'nutrition' },
    { ic: 'drop', tint: MODULE_TINTS.hydratation, lab: 'Hydratation', sub: 'Eau · compl.', on: 'hydratation' },
    { ic: 'moon', tint: MODULE_TINTS.sommeil, lab: 'Sommeil', sub: sleepToday ? `${sleepToday.hours} h cette nuit` : 'Log du jour', on: 'sommeil' },
    { ic: 'shield', tint: MODULE_TINTS.prevention, lab: 'Prévention', sub: 'Bilan de risque', on: 'prevention' },
    { ic: 'moon', tint: MODULE_TINTS.cycle, lab: 'Cycle', sub: cyclePhaseLabel, on: 'cycle' },
    { ic: 'wave', tint: MODULE_TINTS.esprit, lab: 'Esprit', sub: 'Respiration · mental', on: 'esprit' },
    { ic: 'spark', tint: MODULE_TINTS.complements, lab: 'Compléments', sub: 'Plan · rappels', on: 'complements' },
    { ic: 'flame', tint: MODULE_TINTS.nutrition, lab: 'Cuisine', sub: (db.cookbook || []).length ? `${db.cookbook.length} recette${db.cookbook.length > 1 ? 's' : ''}` : 'Recettes à suivre', on: 'cuisine' },
  ]

  const el = React.createElement
  // Hub "Santé" : même traitement que les autres onglets (grand titre,
  // cartes surélevées sur fond dégradé).
  return el('div', { style: {
    ...(embedded
      ? { position: 'fixed', inset: 0, zIndex: 55, animation: 'spaceIn .22s ease' }
      : { flex: 1, minHeight: 0, width: '100%' }),
    backgroundColor: C.bg, backgroundImage: 'var(--g-paper)', backgroundSize: 'var(--g-paper-size)', backgroundPosition: '-1px -1px', backgroundAttachment: 'local',
    display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font,
  } },
    el('div', { style: { flex: 1, overflowY: 'auto', padding: '14px 18px 32px' } },
      el('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 38, height: 38, borderRadius: 0, background: C.surface, border: `1px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.ink, boxShadow: 'none', marginBottom: 12 } },
        el(Icon, { name: 'back', size: 19 })),
      el('h1', { style: { fontFamily: C.display, fontSize: 34, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: .95, margin: 0 } }, 'Santé'),
      el('p', { style: { fontSize: 13.5, color: C.ink2, margin: '6px 0 18px' } }, 'Nutrition, sommeil, prévention et bien-être'),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        tiles.map((t, i) => el('button', { key: i, onClick: () => setSpace(t.on),
          style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: 16, borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}`, boxShadow: 'none', cursor: 'pointer' } },
          el('div', { style: { width: 42, height: 42, borderRadius: 0, background: 'transparent', border: `1.5px solid ${t.tint}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 } },
            el(Icon, { name: t.ic, size: 21, color: t.tint })),
          el('div', { style: { fontFamily: C.display, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1 } }, t.lab),
          el('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, t.sub))))))
}
