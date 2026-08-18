// ============================================================
// Analyse des tests physiques dans la durée.
//
// Les résultats étaient tous conservés — `db.physTests` garde chaque
// passage — mais seule la valeur la plus récente était relue. L'écran
// montrait « Cooper : 2400 m, Bien » sans jamais dire si c'était mieux ou
// moins bien qu'avant, ni depuis quand la mesure datait. Un test passé il
// y a huit mois s'affichait exactement comme celui d'hier.
//
// Un test physique est un instantané : ce qu'il apporte vient de sa
// répétition. Ce module ajoute donc les trois choses qui manquaient — la
// progression, la vétusté, et un profil d'ensemble qui situe les points
// forts et faibles les uns par rapport aux autres.
//
// Repères de population, pas des mesures de laboratoire.
// ============================================================

import { TESTS_DEF } from './PhysicalTests'

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const todayISO = () => {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

export const TEST_LABELS = {
  cooper: 'Endurance aérobie', gai_max: 'Gainage', squat30: 'Force des jambes',
  souplesse: 'Souplesse', push30: 'Force du haut du corps',
}

// Les cinq tests vont tous dans le même sens — plus la valeur est haute,
// meilleur c'est. On l'inscrit explicitement plutôt que de le supposer :
// un test ajouté plus tard (temps sur distance, tour de taille) irait dans
// l'autre sens et retournerait silencieusement toutes les conclusions.
export const HIGHER_IS_BETTER = {
  cooper: true, gai_max: true, squat30: true, souplesse: true, push30: true,
}

// Variation en deçà de laquelle on ne conclut rien. Ces tests de terrain
// ont une reproductibilité limitée : deux passages du même jour ne
// donnent pas le même chiffre. Annoncer une progression sur 2 % serait
// commenter du bruit. Le gainage et la souplesse, plus sensibles aux
// conditions du jour, demandent une marge plus large.
export const NOISE_PCT = { cooper: 3, squat30: 5, push30: 5, gai_max: 8, souplesse: 8 }
export const DEFAULT_NOISE_PCT = 5

export function noiseFloor(testId) {
  return NOISE_PCT[testId] != null ? NOISE_PCT[testId] : DEFAULT_NOISE_PCT
}

// ─── Séries ──────────────────────────────────────────────────
export function testHistory(db, testId) {
  return ((db && db.physTests) || [])
    .filter((t) => t && t.testId === testId && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && num(t.value) != null)
    .map((t) => ({ ...t, value: num(t.value) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function testedIds(db) {
  const ids = new Set(((db && db.physTests) || []).map((t) => t && t.testId).filter(Boolean))
  return TESTS_DEF.map((d) => d.id).filter((id) => ids.has(id))
}

export function missingIds(db) {
  const done = new Set(testedIds(db))
  return TESTS_DEF.map((d) => d.id).filter((id) => !done.has(id))
}

// ─── Vétusté ─────────────────────────────────────────────────
// Un test se refait toutes les huit à douze semaines : plus souvent, la
// progression se perd dans le bruit de mesure ; beaucoup plus tard, le
// chiffre affiché ne décrit plus l'état actuel.
export const RETEST_DAYS = 84
export const STALE_DAYS = 168

export function freshness(db, testId, today) {
  const ref = today || todayISO()
  const hist = testHistory(db, testId)
  if (!hist.length) return { level: 'absent', days: null, date: null, text: 'Jamais passé.' }
  const date = hist[hist.length - 1].date
  const days = Math.max(0, daysBetween(date, ref))
  if (days >= STALE_DAYS) return { level: 'stale', days, date, text: `Passé il y a ${days} jours : le chiffre affiché ne dit plus grand-chose de ton niveau actuel.` }
  if (days >= RETEST_DAYS) return { level: 'due', days, date, text: `Passé il y a ${days} jours — c'est le moment de le refaire pour mesurer la progression.` }
  return { level: 'fresh', days, date, text: days === 0 ? 'Passé aujourd’hui.' : `Passé il y a ${days} jour${days > 1 ? 's' : ''}.` }
}

// ─── Progression d'un test ───────────────────────────────────
export function testProgress(db, testId, { sexe = 'h', age = 30, today } = {}) {
  const hist = testHistory(db, testId)
  if (!hist.length) return null
  const def = TESTS_DEF.find((d) => d.id === testId)
  const higher = HIGHER_IS_BETTER[testId] !== false
  const first = hist[0]
  const last = hist[hist.length - 1]
  const best = hist.reduce((a, t) => ((higher ? t.value > a.value : t.value < a.value) ? t : a), hist[0])
  const level = def ? def.interpret(last.value, sexe, age) : null

  let change = null
  if (hist.length >= 2) {
    const prev = hist[hist.length - 2]
    const delta = Math.round((last.value - prev.value) * 10) / 10
    // Un point de départ à zéro ou négatif (le Sit & Reach descend sous
    // zéro) rend le pourcentage ininterprétable : on s'en tient au delta.
    const pct = Math.abs(prev.value) > 0 ? Math.round(delta / Math.abs(prev.value) * 1000) / 10 : null
    const improved = higher ? delta > 0 : delta < 0
    const floor = noiseFloor(testId)
    const meaningful = pct != null ? Math.abs(pct) >= floor : Math.abs(delta) > 0
    let dir = 'flat'
    if (meaningful) dir = improved ? 'up' : 'down'
    change = {
      prev, delta, pct, improved, meaningful, dir,
      spanDays: daysBetween(prev.date, last.date),
      floor,
    }
  }

  const totalDelta = Math.round((last.value - first.value) * 10) / 10
  return {
    testId, label: TEST_LABELS[testId] || (def && def.label) || testId,
    unit: def ? def.unit : '', color: def ? def.color : null,
    history: hist, count: hist.length,
    first, last, best, level,
    totalDelta,
    isBest: last.value === best.value && hist.length > 1,
    change,
    freshness: freshness(db, testId, today),
    vo2max: def && def.vo2max ? def.vo2max(last.value) : null,
  }
}

// ─── Profil d'ensemble ───────────────────────────────────────
// Le niveau de chaque test rapporté aux autres : c'est la comparaison
// entre eux, pas la valeur absolue, qui indique où porter l'effort.
export function fitnessProfile(db, { sexe = 'h', age = 30, today } = {}) {
  const ids = testedIds(db)
  if (!ids.length) return null
  const items = ids.map((id) => testProgress(db, id, { sexe, age, today })).filter(Boolean)
  const scored = items.filter((i) => i.level && i.level.score != null)
  if (!scored.length) return null
  const mean = scored.reduce((a, i) => a + i.level.score, 0) / scored.length
  const sorted = [...scored].sort((a, b) => a.level.score - b.level.score)
  return {
    items, tested: ids.length, total: TESTS_DEF.length,
    missing: missingIds(db),
    mean: Math.round(mean * 10) / 10,
    // Sur cinq, ramené à 100 pour rester lisible à côté des autres scores
    // de l'application.
    score: Math.round(mean / 5 * 100),
    weakest: sorted[0],
    strongest: sorted[sorted.length - 1],
    weak: scored.filter((i) => i.level.score <= 2),
    spread: sorted.length > 1 ? sorted[sorted.length - 1].level.score - sorted[0].level.score : 0,
  }
}

// Tests dont le dernier passage est en recul net par rapport au précédent.
export function regressions(db, opts) {
  return testedIds(db)
    .map((id) => testProgress(db, id, opts))
    .filter((p) => p && p.change && p.change.dir === 'down')
    .sort((a, b) => Math.abs(b.change.pct || 0) - Math.abs(a.change.pct || 0))
}

// Le test à refaire en priorité : jamais passé d'abord, puis le plus
// ancien au-delà du délai de retest.
export function nextTest(db, today) {
  const missing = missingIds(db)
  if (missing.length) {
    const def = TESTS_DEF.find((d) => d.id === missing[0])
    return { testId: missing[0], label: TEST_LABELS[missing[0]] || (def && def.label) || missing[0], reason: 'jamais passé', days: null }
  }
  const due = testedIds(db)
    .map((id) => ({ id, f: freshness(db, id, today) }))
    .filter((x) => x.f.level === 'due' || x.f.level === 'stale')
    .sort((a, b) => b.f.days - a.f.days)
  if (!due.length) return null
  const def = TESTS_DEF.find((d) => d.id === due[0].id)
  return { testId: due[0].id, label: TEST_LABELS[due[0].id] || (def && def.label) || due[0].id, reason: `passé il y a ${due[0].f.days} jours`, days: due[0].f.days }
}

// ─── Synthèse ────────────────────────────────────────────────
export function testsAnalysis(db, { sexe = 'h', age = 30, today } = {}) {
  const opts = { sexe, age, today }
  const profile = fitnessProfile(db, opts)
  const regs = regressions(db, opts)
  const next = nextTest(db, today)
  const items = profile ? profile.items : []
  const improved = items.filter((i) => i.change && i.change.dir === 'up')

  const tips = []
  if (!profile) {
    tips.push('Aucun test physique passé. Un premier passage donne le point de départ ; c’est la répétition ensuite qui rend la progression lisible.')
  } else {
    if (regs.length) {
      const r = regs[0]
      tips.push(`${r.label} en recul de ${Math.abs(r.change.pct)} % depuis le passage précédent (${r.change.prev.value} → ${r.last.value} ${r.unit}). Au-delà de ${r.change.floor} %, ce n’est plus du bruit de mesure.`)
    }
    if (improved.length) {
      const i = improved[0]
      tips.push(`${i.label} : ${i.change.delta > 0 ? '+' : '−'}${Math.abs(i.change.delta)} ${i.unit} depuis le passage précédent${i.isBest ? ', c’est ton meilleur résultat' : ''}.`)
    }
    if (profile.weak.length) {
      tips.push(`Niveau faible en ${profile.weak.map((w) => w.label.toLowerCase()).join(', ')} : c’est là que le renforcement rapporte le plus.`)
    } else if (profile.spread >= 2) {
      tips.push(`${profile.strongest.label} est nettement au-dessus de ${profile.weakest.label.toLowerCase()} : rééquilibrer coûte moins d’efforts que pousser encore ton point fort.`)
    }
    if (profile.missing.length) {
      tips.push(`${profile.missing.length} test${profile.missing.length > 1 ? 's' : ''} sur ${profile.total} jamais passé${profile.missing.length > 1 ? 's' : ''} : le profil reste partiel.`)
    }
    const singles = items.filter((i) => i.count === 1)
    if (singles.length === items.length && items.length) {
      tips.push('Chaque test n’a été passé qu’une fois : c’est un point de départ, pas encore une progression. Refais-les dans deux à trois mois.')
    }
    if (next && !profile.missing.length) {
      tips.push(`À refaire en priorité : ${next.label.toLowerCase()} (${next.reason}).`)
    }
  }
  if (!tips.length) tips.push('Profil complet et à jour. Rien à ajuster.')

  return { profile, regressions: regs, improved, next, tips }
}
