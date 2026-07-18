import { ZONES, sessionDuration } from './trainData'

const FILLERS = ['chatVache', 'ischio', 'cheville', 'pont', 'gainage', 'fente']

function estMins(keys) {
  try {
    return sessionDuration({ keys })
  } catch {
    return Math.max(6, keys.length * 2)
  }
}

// Construit un programme de 3 séances ciblées sur les zones les plus raides
// détectées par le test de mobilité (les 3 scores les plus bas).
export function generateProgram(zones, score) {
  const weak = [...zones].sort((a, b) => a.val - b.val).slice(0, 3)
  const sessions = weak.map((z) => {
    const def = ZONES[z.id]
    let keys = [...new Set(def.corr)]
    for (const f of FILLERS) {
      if (keys.length >= 5) break
      if (!keys.includes(f)) keys.push(f)
    }
    keys = keys.slice(0, 5)
    return {
      id: 'prog-' + z.id,
      generated: true,
      cat: def.cat,
      zone: z.id,
      title: def.fix,
      subtitle: 'Séance ciblée sur ta zone la plus raide',
      level: 'Personnalisé',
      mins: estMins(keys),
      focus: def.label,
      keys,
      tag: z.val <= 1 ? 'Priorité' : z.val === 2 ? 'À renforcer' : 'Entretien',
    }
  })
  return { createdAt: Date.now(), score, weak: weak.map((w) => w.id), sessions, done: {} }
}

export const RENFO_GOALS = {
  force: { id: 'force', label: 'Force', tint: '#bf6a40', icon: 'bolt', desc: 'Charges plus lourdes, moins de répétitions, technique soignée', sessions: ['renfo-bas', 'renfo-post', 'renfo-haut', 'renfo-mb'] },
  tonus: { id: 'tonus', label: 'Tonification', tint: '#a85a36', icon: 'target', desc: 'Volume modéré sur l’ensemble du corps, gainage inclus', sessions: ['renfo-core', 'renfo-bas', 'renfo-haut', 'renfo-core2'] },
  endurance: { id: 'endurance', label: 'Endurance musculaire', tint: '#7d9471', icon: 'heart', desc: 'Circuits dynamiques, peu de repos, tout le corps', sessions: ['full-circuit', 'full-elast', 'renfo-full', 'full-mb'] },
}
export const RENFO_GOAL_ORDER = ['force', 'tonus', 'endurance']
