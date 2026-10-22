// ============================================================
// Moments forts, façon borne d'arcade : quand l'XP monte (séance
// enregistrée, record battu, cible d'eau atteinte, objectif fini, nuit
// complète), un bandeau clignote en haut de l'écran, le gain d'XP monte
// par sauts, et un petit air 8 bits joue si les sons sont activés.
//
// L'XP vient de xpIntel (recalculée depuis les données) : ce composant
// compare le détail à celui vu la dernière fois sur cet appareil. Le
// premier passage n'a rien à fêter, il note seulement où on en est.
// ============================================================
import React, { useState, useEffect } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C } from '../health/kit'
import { xpDetail, gains, LIBELLES, BAREME } from './xpIntel'
import { jouer } from './sons8bits'

// ─── Le bandeau ───
function Bandeau({ m, onFin }) {
  useEffect(() => {
    const id = setTimeout(onFin, m.titre === 'LEVEL UP' ? 2300 : 1900)
    return () => clearTimeout(id)
  }, [m]) // eslint-disable-line react-hooks/exhaustive-deps
  const ligne = '▓▓▓ ' + m.titre + ' ▓▓▓'
  return React.createElement('div', {
    role: 'status', 'aria-live': 'polite', onClick: onFin,
    // Toujours un écran sombre (comme une borne), quelle que soit l'apparence.
    className: 'ecran',
    style: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 95, display: 'flex', justifyContent: 'center', pointerEvents: 'auto', paddingTop: 'env(safe-area-inset-top)', background: C.bg, borderBottom: `2px solid ${m.couleur || C.trace}`, animation: 'bandeauEntre .2s steps(4, end)' },
  },
    React.createElement('div', { style: { position: 'relative', width: '100%', maxWidth: 460, padding: '12px 14px 11px', textAlign: 'center', color: C.ink, cursor: 'pointer' } },
      React.createElement('div', { style: { fontFamily: C.pixel, fontSize: 13, lineHeight: 1.4, color: m.couleur || C.trace, animation: 'bandeauClignote .5s steps(1, end) 3' } }, ligne),
      React.createElement('div', { style: { fontFamily: C.pixel, fontSize: 8.5, lineHeight: 1.7, marginTop: 6, color: C.ink2 } }, m.sous),
      m.xp ? React.createElement('div', { 'aria-hidden': true, style: { position: 'absolute', right: 16, bottom: 8, fontFamily: C.pixel, fontSize: 12, color: m.couleur || C.trace, animation: 'xpMonte 1.2s steps(8, end) .3s both' } }, '+' + m.xp) : null))
}

export default function MomentsForts({ userId }) {
  const { db, loading } = useNutritionStore(userId)
  const [file, setFile] = useState([])
  useEffect(() => {
    if (loading || !userId || !db) return
    const detail = xpDetail(db)
    const cle = 'renfo:xp:' + userId
    let avant = null
    try { avant = JSON.parse(localStorage.getItem(cle) || 'null') } catch { avant = null }
    try { localStorage.setItem(cle, JSON.stringify(detail)) } catch { return }
    const g = gains(avant, detail)
    if (!g) return
    const sous = Object.entries(g.plus).map(([k, n]) => (n > 1 ? n + ' × ' : '') + LIBELLES[k].toUpperCase() + ' +' + n * BAREME[k]).join(' · ')
    const nouveaux = [{ id: Date.now(), titre: g.titre, sous: sous + ' · +' + g.xp + ' XP', xp: g.xp, couleur: g.principal === 'record' ? C.warn : C.trace }]
    if (g.levelUp) nouveaux.push({ id: Date.now() + 1, titre: 'LEVEL UP', sous: 'NIVEAU ' + g.levelUp + ' · PRESS START', couleur: C.warn })
    setFile((f) => [...f, ...nouveaux])
    jouer(g.levelUp ? 'levelup' : g.principal === 'record' ? 'record' : g.principal === 'seance' || g.principal === 'objectif' ? 'seance' : 'petit')
  }, [db, loading, userId])
  if (!file.length) return null
  return React.createElement(Bandeau, { key: file[0].id, m: file[0], onFin: () => setFile((f) => f.slice(1)) })
}
