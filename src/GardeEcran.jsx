import React, { Component } from 'react'
import { C } from './features/health/kit'
import { estErreurDeChargement, rechargerUneFois } from './rechargement'

// ============================================================
// Garde d'écran : une erreur dans un écran ne fait plus tomber toute
// l'application.
//
// Sans elle, une exception au rendu démontait l'arbre React entier : écran
// blanc, barre de navigation comprise, et rien d'autre à faire que fermer
// l'app. Elle est posée autour de chaque onglet (et réinitialisée quand on
// en change), si bien qu'un écran en panne laisse les autres utilisables.
//
// Cas particulier, et le plus fréquent : l'app est restée ouverte pendant
// une mise en ligne (voir rechargement.js).
// ============================================================
export class GardeEcran extends Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    console.error('[écran] erreur de rendu :', erreur, info && info.componentStack)
    if (estErreurDeChargement(erreur)) rechargerUneFois()
  }

  render() {
    if (!this.state.erreur) return this.props.children
    const miseAJour = estErreurDeChargement(this.state.erreur)
    const bouton = { padding: '13px 18px', border: 'none', fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', cursor: 'pointer' }
    const h = React.createElement
    return h('div', { role: 'alert', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: C.bg, color: C.ink, fontFamily: C.font } },
      h('div', { style: { maxWidth: 400, width: '100%', background: C.surface, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.danger}`, padding: 22 } },
        h('div', { style: { fontFamily: C.display, fontSize: 28, fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 } }, miseAJour ? 'Nouvelle version' : 'Écran indisponible'),
        h('p', { style: { fontSize: 14, color: C.ink2, lineHeight: 1.5, margin: '10px 0 16px' } }, miseAJour
          ? 'L’app a été mise à jour pendant qu’elle était ouverte. Recharge-la pour continuer ; tes données ne sont pas touchées.'
          : 'Cet écran a rencontré un problème. Tes données ne sont pas touchées : les autres onglets restent utilisables.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('button', { onClick: () => window.location.reload(), style: { ...bouton, background: C.primary, color: C.onFill } }, 'Recharger l’app'),
          miseAJour ? null : h('button', { onClick: () => this.setState({ erreur: null }), style: { ...bouton, background: 'transparent', color: C.ink2, border: `1px solid ${C.ink3}` } }, 'Réessayer cet écran'))))
  }
}
