// ============================================================
// XP et niveaux, façon borne d'arcade.
//
// Rien n'est stocké : l'XP se recalcule à chaque fois depuis tes données
// réelles, donc une séance supprimée retire ses points, une nuit importée
// les ajoute, et rien n'est jamais compté deux fois.
//   séance réalisée ............ +50
//   nuit au moins égale au besoin +20
//   cible d'eau atteinte ....... +10
//   objectif atteint ........... +30
//   record battu ............... +100
// Un niveau tous les 1 000 XP.
// ============================================================
import { trainingTotals, hydroDay, hydricTargetMl, rolling7Mins } from '../train/renfoIntel'
import { neededHours } from '../health/sleepIntel'

export const BAREME = { seance: 50, nuit: 20, eau: 10, objectif: 30, record: 100 }
export const PALIER = 1000
export const LIBELLES = { seance: 'séance réalisée', nuit: 'nuit complète', eau: 'cible d’eau atteinte', objectif: 'objectif atteint', record: 'record battu' }

const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])

// Records battus : chaque fois qu'une séance dépasse le meilleur précédent
// du même exercice (charge en musculation) ou la meilleure barre à la
// perche. La toute première fois ne compte pas : il n'y avait rien à battre.
export function recordsBattus(db) {
  const seances = asList(db && db.planningSessions)
    .filter((s) => s.statut === 'realise' && typeof s.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date))
  const meilleur = {}
  let n = 0
  const voir = (cle, val) => {
    if (!(val > 0)) return
    if (meilleur[cle] != null && val > meilleur[cle]) n++
    if (meilleur[cle] == null || val > meilleur[cle]) meilleur[cle] = val
  }
  for (const s of seances) {
    for (const ex of asList(s.exercises)) {
      if (!ex.name) continue
      voir('ex:' + ex.name, Math.max(0, ...asList(ex.sets).map((st) => num(st.charge))))
    }
    if (s.sport === 'perche' && s.data) voir('perche', num(s.data.hauteur))
  }
  return n
}

export function xpDetail(db) {
  const d = db || {}
  const seance = trainingTotals(d).sessionsTotal
  let nuit = 0
  for (const [jour, e] of Object.entries(d.sleepLog || {})) {
    const h = num(e && e.hours)
    if (h > 0 && h >= neededHours(rolling7Mins(d, jour))) nuit++
  }
  const cible = hydricTargetMl(d)
  let eau = 0
  for (const jour of Object.keys(d.hydroLog || {})) if (cible > 0 && hydroDay(d, jour).ml >= cible) eau++
  const objectif = asList(d.customGoals).filter((g) => g.done).length
  const record = recordsBattus(d)
  return { seance, nuit, eau, objectif, record }
}

export function xpTotal(detail) {
  return Object.keys(BAREME).reduce((a, k) => a + (detail[k] || 0) * BAREME[k], 0)
}

export function niveau(total) {
  return { niveau: Math.floor(total / PALIER) + 1, dansNiveau: total % PALIER, palier: PALIER, total }
}

export function xpRenfo(db) {
  const detail = xpDetail(db)
  return { ...niveau(xpTotal(detail)), detail }
}

// Ce qui a été gagné entre deux relevés du détail : le moment fort à
// fêter (le plus marquant d'abord), l'XP gagnée, et le passage de niveau.
const ORDRE = ['record', 'seance', 'objectif', 'nuit', 'eau']
export const TITRES = { record: 'NEW RECORD', seance: 'STAGE CLEAR', objectif: 'OBJECTIF ATTEINT', nuit: 'NUIT COMPLETE', eau: 'CIBLE D’EAU ATTEINTE' }
export function gains(avant, apres) {
  if (!avant || !apres) return null
  const plus = {}
  let xp = 0
  for (const k of ORDRE) {
    const d = (apres[k] || 0) - (avant[k] || 0)
    if (d > 0) { plus[k] = d; xp += d * BAREME[k] }
  }
  if (!xp) return null
  const principal = ORDRE.find((k) => plus[k])
  const nAvant = niveau(xpTotal(avant)).niveau, nApres = niveau(xpTotal(apres)).niveau
  return { principal, titre: TITRES[principal], plus, xp, levelUp: nApres > nAvant ? nApres : null }
}
