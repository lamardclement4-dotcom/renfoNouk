import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib'
import { createSyncQueue } from './syncQueue'

// Fenêtre de journal chargée au montage. Elle valait 10 jours, ce qui
// suffisait aux graphes de sept jours mais tronquait silencieusement toutes
// les analyses : nutriIntel et hydroIntel raisonnent sur 28 jours, et
// estimateTDEE aussi. Une moyenne « sur 28 jours » calculée sur 10 jours de
// données disponibles n'était pas approximative, elle était fausse — et rien
// ne le signalait. 35 jours couvrent la fenêtre d'analyse avec de la marge,
// pour 35 lignes au plus.
const DAYS_HISTORY = 35

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// Clés que l'ancienne app rangeait sous profiles.phys.nutrition (regroupées
// pour éviter d'encombrer le niveau racine de phys).
const NUTRITION_KEYS = ['foodFav', 'foodTargets', 'hydroSport', 'hydroPrefs', 'diagHistory']
// Clés à routage spécial : ni top-level phys, ni phys.nutrition.
const SPECIAL_KEYS = ['profilePhys', 'foodLog', 'hydroLog', 'cycle', 'goals', 'sensitiveZones']

// Journaux indexés par date qui n'étaient jamais élagués. Ils vivent dans la
// colonne `phys`, relue et réécrite EN ENTIER à chaque écriture : après
// quelques années, cocher un complément renvoyait des centaines de kilo-octets
// de sommeil et de météo à chaque clic. On garde treize mois — de quoi couvrir
// toutes les fenêtres d'analyse et une comparaison d'une année sur l'autre —
// et on élague au passage, une seule fois, dans le store plutôt que dans
// chaque écran.
const DATE_KEYED_LOGS = ['sleepLog', 'suppTaken', 'recoveryLog', 'weatherLog']
const LOG_RETENTION_DAYS = 400
// Listes qui grossissent lentement mais sans borne.
const CAPPED_LISTS = { physTests: 400, customGoals: 200, peakGoals: 100 }

function pruneDateMap(obj, maxDays) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const keys = Object.keys(obj).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
  // Les clés non datées ne sont pas de notre ressort : on les conserve telles
  // quelles plutôt que de supprimer une donnée qu'on ne sait pas interpréter.
  const others = Object.keys(obj).filter((k) => !/^\d{4}-\d{2}-\d{2}$/.test(k))
  if (keys.length <= maxDays) return obj
  const kept = keys.sort().slice(-maxDays)
  const out = {}
  for (const k of others) out[k] = obj[k]
  for (const k of kept) out[k] = obj[k]
  return out
}

function prunePatch(patch) {
  let out = patch
  for (const k of DATE_KEYED_LOGS) {
    if (k in out) {
      const pruned = pruneDateMap(out[k], LOG_RETENTION_DAYS)
      if (pruned !== out[k]) out = { ...out, [k]: pruned }
    }
  }
  for (const [k, cap] of Object.entries(CAPPED_LISTS)) {
    if (k in out && Array.isArray(out[k]) && out[k].length > cap) {
      out = { ...out, [k]: out[k].slice(-cap) }
    }
  }
  return out
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))
}

// Adapte le modèle "db plat / store.set(objetOuFonction)" de l'ancienne app
// (local-only) vers Supabase. Malgré son nom, ce hook sert désormais tous les
// modules santé (nutrition, hydratation, tests, sommeil, prévention, cycle,
// compléments, esprit) :
//   - profilePhys      -> la colonne jsonb profiles.phys en entier
//   - foodLog/hydroLog  -> une ligne par jour dans nutrition_logs (data jsonb)
//   - cycle             -> la colonne jsonb profiles.cycle (posée à l'onboarding)
//   - foodFav/…/diagHistory -> imbriqués sous profiles.phys.nutrition
//   - toute autre clé (physTests, sleepLog, suppPlan, painBilan, breathLog…)
//                        -> stockée au niveau racine de profiles.phys
// ─── État partagé par utilisateur ────────────────────────────
// Chaque appel du hook tenait sa propre copie de `phys`. Or plusieurs
// écrans sont montés en même temps : Progrès reste monté pendant qu'il
// affiche Tests physiques ou Sommeil, et chacun appelait le hook. Deux
// copies indépendantes du même profil, donc : enregistrer un test depuis
// Progrès, revenir, puis cocher un objectif réécrivait le profil depuis la
// copie périmée de Progrès — et le test disparaissait sans erreur.
//
// L'état vit désormais une seule fois par utilisateur, et tous les écrans
// montés s'y abonnent : une écriture les met tous à jour ensemble.
const instances = new Map()

function getInstance(userId) {
  let inst = instances.get(userId)
  if (!inst) {
    inst = {
      phys: {}, cycle: {}, goals: {}, sensitiveZones: [], dayRows: {},
      rowIds: {}, loading: true, started: false, listeners: new Set(),
      // Écriture en cours par date. Sans elle, deux ajouts rapprochés sur
      // une journée encore absente en base voyaient tous deux « pas de
      // ligne » et lançaient chacun un INSERT : ligne dupliquée, et au
      // rechargement l'une écrasait l'autre.
      dayWrites: {},
      // Toute écriture passe par la file : elle réessaie, survit à un
      // rechargement, et rend visible ce qui n'est pas encore parti.
      queue: null, sync: { status: 'idle', pending: 0, lastError: null },
      notify() { for (const l of this.listeners) l() },
    }
    inst.queue = createSyncQueue({ userId })
    inst.queue.setHandlers({
      phys: (t, payload) => supabase.from('profiles').update({ phys: payload }).eq('id', userId),
      cycle: (t, payload) => supabase.from('profiles').update({ cycle: payload }).eq('id', userId),
      goals: (t, payload) => supabase.from('profiles').update({ goals: payload }).eq('id', userId),
      zones: (t, payload) => supabase.from('profiles').update({ sensitive_zones: payload }).eq('id', userId),
      day: async (t, payload) => {
        const date = t.slice(4)
        const existingId = inst.rowIds[date]
        if (existingId) return supabase.from('nutrition_logs').update({ data: payload, updated_at: new Date().toISOString() }).eq('id', existingId)
        const res = await supabase.from('nutrition_logs').insert({ user_id: userId, date, data: payload }).select('id').single()
        if (!res.error && res.data) inst.rowIds[date] = res.data.id
        return res
      },
    })
    inst.queue.subscribe((st) => { inst.sync = st; inst.notify() })
    instances.set(userId, inst)
  }
  return inst
}

// Forme exacte du `db` exposé aux écrans. Sortie du hook pour qu'un test
// puisse rendre un écran sur la même structure que l'application, sans en
// redéclarer une approximation qui dériverait en silence.
// Les colonnes JSON reviennent telles qu'elles ont été écrites. Une écriture
// partielle, une donnée laissée par une version antérieure, et une liste
// revient sous forme d'objet — ou garde un `null` en son milieu. `x || []` ne
// voit ni l'un ni l'autre : la garde passe, et le `.filter` juste après fait
// tomber l'écran, loin de sa cause.
//
// La normalisation se fait ici parce que c'est le seul endroit qui construit
// le `db` remis aux écrans et aux modules : quatorze écrans et une douzaine de
// modules cessent d'avoir à s'en soucier chacun de leur côté.
const LIST_KEYS = [
  'planningSessions', 'physTests', 'weightLog', 'sessionLog', 'customGoals',
  'mobilityHistory', 'peakGoals', 'smartGoals', 'breathLog', 'foodFav', 'diagHistory',
]

function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

// `mobility` et `program` portent eux-mêmes une liste : le bilan de mobilité
// range ses neuf zones dans `zones`, le programme ses séances dans `sessions`.
function normalizeNested(src) {
  const out = { ...src }
  for (const k of LIST_KEYS) if (k in out) out[k] = asList(out[k])
  if (out.mobility && typeof out.mobility === 'object') {
    out.mobility = { ...out.mobility, zones: asList(out.mobility.zones) }
  }
  if (out.program && typeof out.program === 'object') {
    // `weak` liste les zones ciblées ; deux écrans la joignent ou la
    // parcourent directement.
    out.program = {
      ...out.program,
      sessions: asList(out.program.sessions),
      weak: asList(out.program.weak),
      done: out.program.done && typeof out.program.done === 'object' ? out.program.done : {},
    }
  }
  return out
}

export const buildDb = (rawPhys, cycleSrc, goalsSrc, zonesSrc, rowsSrc, todayISO) => {
  const physSrc = normalizeNested(rawPhys || {})
  return {
  ...physSrc,
  profilePhys: physSrc,
  cycle: cycleSrc,
  foodFav: physSrc.nutrition?.foodFav || [],
  foodTargets: physSrc.nutrition?.foodTargets || null,
  hydroSport: physSrc.nutrition?.hydroSport || {},
  hydroPrefs: physSrc.nutrition?.hydroPrefs || {},
  diagHistory: physSrc.nutrition?.diagHistory || [],
  physTests: asList(physSrc.physTests),
  foodLog: Object.fromEntries(Object.entries(rowsSrc).map(([d, v]) => [d, v.food || []])),
  hydroLog: Object.fromEntries(Object.entries(rowsSrc).map(([d, v]) => [d, v.hydration || []])),
  week: physSrc.week || [0, 0, 0, 0, 0, 0, 0],
  sessionLog: asList(physSrc.sessionLog),
  // Suivi du poids : historique des pesées ({date, kg}) et poids visé.
  weightLog: asList(physSrc.weightLog),
  weightGoal: physSrc.weightGoal || null,
  // Conditions météo par jour, pour adapter la charge et relire
  // après coup dans quelles conditions une séance a été faite.
  weatherLog: physSrc.weatherLog || {},
  // Thème choisi, pour le retrouver d'un appareil à l'autre.
  theme: physSrc.theme || null,
  streak: physSrc.streak || 0,
  sessionsTotal: physSrc.sessionsTotal || 0,
  minutesTotal: physSrc.minutesTotal || 0,
  record: physSrc.record || 0,
  goals: { dailyMin: 10, weeklySessions: 4, ...goalsSrc },
  completedToday: physSrc.lastSessionISO === todayISO,
  customGoals: asList(physSrc.customGoals),
  mobility: physSrc.mobility || null,
  mobilityHistory: asList(physSrc.mobilityHistory),
  program: physSrc.program || null,
  peakGoals: asList(physSrc.peakGoals),
  recoveryLog: physSrc.recoveryLog || {},
  sensitiveZones: asList(zonesSrc),
  }
}

export function useNutritionStore(userId) {
  const inst = userId ? getInstance(userId) : null
  const [, bump] = useState(0)

  useEffect(() => {
    if (!inst) return undefined
    const listener = () => bump((n) => n + 1)
    inst.listeners.add(listener)
    return () => { inst.listeners.delete(listener) }
  }, [inst])

  useEffect(() => {
    if (!userId || !inst || inst.started) return
    inst.started = true
    async function load() {
      const since = isoDaysAgo(DAYS_HISTORY)
      const [{ data: profileRow }, { data: logRows }] = await Promise.all([
        supabase.from('profiles').select('phys,cycle,sensitive_zones,goals').eq('id', userId).single(),
        supabase.from('nutrition_logs').select('id,date,data').eq('user_id', userId).gte('date', since),
      ])
      inst.phys = profileRow?.phys || {}
      inst.cycle = profileRow?.cycle || {}
      inst.goals = profileRow?.goals || {}
      inst.sensitiveZones = profileRow?.sensitive_zones || []
      const rows = {}
      for (const r of logRows || []) {
        rows[r.date] = { food: r.data?.food || [], hydration: r.data?.hydration || [] }
        inst.rowIds[r.date] = r.id
      }
      // Écritures d'une session précédente jamais parties (onglet fermé
      // pendant une coupure). Elles décrivent l'état local le plus récent :
      // elles doivent primer sur l'instantané serveur, sinon la personne
      // verrait sa saisie « disparaître » au rechargement avant de la voir
      // revenir une fois la file vidée.
      const pending = inst.queue.restorePending()
      for (const [target, payload] of Object.entries(pending)) {
        if (target === 'phys') inst.phys = payload
        else if (target === 'cycle') inst.cycle = payload
        else if (target === 'goals') inst.goals = payload
        else if (target === 'zones') inst.sensitiveZones = payload
        else if (target.startsWith('day:')) rows[target.slice(4)] = { food: payload.food || [], hydration: payload.hydration || [] }
        inst.queue.enqueue(target, payload)
      }
      inst.dayRows = rows
      inst.loading = false
      inst.notify()
    }
    load()
    return undefined
  }, [userId, inst])

  // Vues stables sur l'état partagé, pour que le reste du fichier garde sa
  // forme d'origine.
  const physRef = { get current() { return inst ? inst.phys : {} }, set current(v) { if (inst) inst.phys = v } }
  const cycleRef = { get current() { return inst ? inst.cycle : {} }, set current(v) { if (inst) inst.cycle = v } }
  const goalsRef = { get current() { return inst ? inst.goals : {} }, set current(v) { if (inst) inst.goals = v } }
  const sensitiveZonesRef = { get current() { return inst ? inst.sensitiveZones : [] }, set current(v) { if (inst) inst.sensitiveZones = v } }
  const dayRowsRef = { get current() { return inst ? inst.dayRows : {} }, set current(v) { if (inst) inst.dayRows = v } }
  const rowIds = { get current() { return inst ? inst.rowIds : {} } }
  const loading = inst ? inst.loading : true
  const phys = physRef.current
  const cycle = cycleRef.current
  const goals = goalsRef.current
  const sensitiveZones = sensitiveZonesRef.current
  const dayRows = dayRowsRef.current
  const notify = () => { if (inst) inst.notify() }

  const savePhys = useCallback((patchFn) => {
    const prev = physRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    physRef.current = next
    notify()
    if (inst) inst.queue.enqueue('phys', next)
  }, [userId])

  const saveCycle = useCallback((patchFn) => {
    const prev = cycleRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    cycleRef.current = next
    notify()
    if (inst) inst.queue.enqueue('cycle', next)
  }, [userId])

  const saveGoals = useCallback((patchFn) => {
    const prev = goalsRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    goalsRef.current = next
    notify()
    if (inst) inst.queue.enqueue('goals', next)
  }, [userId])

  const saveSensitiveZones = useCallback((patchFn) => {
    const prev = sensitiveZonesRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : patchFn
    sensitiveZonesRef.current = next
    notify()
    if (inst) inst.queue.enqueue('zones', next)
  }, [userId])

  // Ne charge que les DAYS_HISTORY derniers jours au montage (voir load() plus
  // haut) pour rester léger — au-delà, une journée du journal est chargée à la
  // demande quand l'utilisateur navigue vers une date plus ancienne (bouton
  // "Jour précédent" côté Nutrition.jsx), pour ne pas afficher une journée
  // vide alors que ses données existent bien en base.
  const ensureDay = useCallback((date) => {
    if (dayRowsRef.current[date] !== undefined || !userId) return
    supabase.from('nutrition_logs').select('id,date,data').eq('user_id', userId).eq('date', date).maybeSingle().then(({ data, error }) => {
      if (error) { console.error('[store] échec chargement journal du jour', error.message); return }
      const day = { food: data?.data?.food || [], hydration: data?.data?.hydration || [] }
      if (data) rowIds.current[date] = data.id
      dayRowsRef.current = { ...dayRowsRef.current, [date]: day }
      notify()
    })
  }, [userId])

  const saveDay = useCallback((date, partial) => {
    const prevDay = dayRowsRef.current[date] || { food: [], hydration: [] }
    const nextDay = { ...prevDay, ...partial }
    const nextAll = { ...dayRowsRef.current, [date]: nextDay }
    dayRowsRef.current = nextAll
    notify()

    // La file sérialise déjà par cible : une seule entrée par date, avec
    // la dernière charge utile. Deux ajouts rapprochés ne peuvent donc plus
    // produire deux INSERT concurrents.
    if (inst) inst.queue.enqueue('day:' + date, { food: nextDay.food || [], hydration: nextDay.hydration || [] })
  }, [userId])

  // Reconstitue le "db" plat attendu par les composants portés de l'ancienne app.
  // `...phys` expose toutes les clés racine (physTests, sleepLog, suppPlan…) ;
  // les entrées ci-dessous surchargent avec les valeurs dérivées/imbriquées.
  const todayISO = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })()

  // Une seule définition, utilisée pour le rendu comme pour l'état
  // synchrone. Les raccourcis d'écriture lisaient `db`, reconstruit depuis
  // l'état React : deux appels dans le même tick voyaient la même valeur
  // périmée, et le premier était écrasé — un objectif ajouté juste après un
  // autre disparaissait. Les refs, elles, sont à jour immédiatement.

  const db = buildDb(phys, cycle, goals, sensitiveZones, dayRows, todayISO)
  // État à jour à l'instant même, y compris les écritures de ce tick.
  const liveDb = () => buildDb(physRef.current, cycleRef.current, goalsRef.current, sensitiveZonesRef.current, dayRowsRef.current, todayISO)

  const store = {
    get: () => db,
    ensureDay,
    set: (patchOrFn) => {
      // La forme fonction reçoit l'état à jour, pas celui du dernier rendu :
      // deux `set` dans le même tick composaient sinon sur la même base
      // périmée, et le premier était perdu.
      const patch = prunePatch(typeof patchOrFn === 'function' ? patchOrFn(liveDb()) : patchOrFn)

      // Un même `set` pouvait déclencher jusqu'à trois UPDATE Supabase sur
      // la colonne `phys` — une par catégorie de clés. Chacune écrit
      // l'objet entier : si elles arrivaient dans le désordre, la moins
      // complète gagnait et la donnée la plus récente était perdue.
      // `saveWeight` était exactement dans ce cas (weightLog + profilePhys).
      // On compose donc une seule fois, puis on écrit une seule fois.
      const nutriInPatch = NUTRITION_KEYS.filter((k) => k in patch)
      const topKeys = Object.keys(patch).filter((k) => !SPECIAL_KEYS.includes(k) && !NUTRITION_KEYS.includes(k))
      const touchesPhys = 'profilePhys' in patch || nutriInPatch.length > 0 || topKeys.length > 0
      if (touchesPhys) {
        savePhys((prev) => {
          // `profilePhys` désigne la colonne entière : le patch la remplace,
          // les autres clés viennent ensuite s'y appliquer.
          let next = 'profilePhys' in patch ? { ...patch.profilePhys } : { ...prev }
          if (nutriInPatch.length) next = { ...next, nutrition: { ...next.nutrition, ...pick(patch, nutriInPatch) } }
          if (topKeys.length) next = { ...next, ...pick(patch, topKeys) }
          return next
        })
      }

      if ('cycle' in patch) saveCycle(() => patch.cycle)
      if ('goals' in patch) saveGoals(() => patch.goals)
      if ('sensitiveZones' in patch) saveSensitiveZones(() => patch.sensitiveZones)

      if ('foodLog' in patch) {
        const cur = dayRowsRef.current
        for (const [date, entries] of Object.entries(patch.foodLog)) {
          if (entries !== (cur[date] && cur[date].food)) saveDay(date, { food: entries })
        }
      }
      if ('hydroLog' in patch) {
        const cur = dayRowsRef.current
        for (const [date, entries] of Object.entries(patch.hydroLog)) {
          if (entries !== (cur[date] && cur[date].hydration)) saveDay(date, { hydration: entries })
        }
      }
    },

    // Actions dédiées au module Entraîner — équivalents des méthodes du store
    // local-only de l'ancienne app (Store.completeSession, Store.saveMobility…),
    // réécrites en termes de store.set pour rester compatibles Supabase.
    completeSession: (mins, meta = {}) => store.set((s) => {
      const day = (new Date().getDay() + 6) % 7 // 0=lundi … 6=dimanche
      const week = [...s.week]
      week[day] = (week[day] || 0) + mins
      const newStreak = s.completedToday ? s.streak : s.streak + 1
      // Séance programme/catalogue jouée via le lecteur intégré : la seule
      // trace qu'on en garde était le compteur "cette semaine" ci-dessus,
      // qui ne se recale jamais sur une vraie date — impossible de la
      // retrouver dans une rétrospective de semaines passées. On log
      // aussi la date exacte ici pour que ce soit possible.
      const log = [...s.sessionLog, { date: todayISO, mins, title: meta.title || null, cat: meta.cat || null }].slice(-300)
      return {
        week,
        sessionLog: log,
        sessionsTotal: s.sessionsTotal + 1,
        minutesTotal: s.minutesTotal + mins,
        streak: newStreak,
        record: Math.max(s.record, newStreak),
        lastSessionISO: todayISO,
      }
    }),
    saveMobility: (m) => store.set((s) => {
      const hist = s.mobilityHistory.filter((h) => h.date !== m.date)
      return { mobility: m, mobilityHistory: [...hist, m].slice(-30) }
    }),
    saveProgram: (p) => store.set({ program: p }),
    clearProgram: () => store.set({ program: null }),
    markProgramDone: (id) => store.set((s) => (
      s.program ? { program: { ...s.program, done: { ...(s.program.done || {}), [id]: true } } } : {}
    )),
    logRecovery: (id) => store.set((s) => {
      const log = { ...s.recoveryLog }
      const day = log[todayISO] || []
      log[todayISO] = day.includes(id) ? day : [...day, id]
      return { recoveryLog: log }
    }),
    addPeakGoal: (goal) => store.set((s) => ({ peakGoals: [...s.peakGoals, { id: 'pk' + Date.now(), ...goal }] })),
    updatePeakGoal: (id, patch) => store.set((s) => ({ peakGoals: s.peakGoals.map((g) => g.id === id ? { ...g, ...patch } : g) })),
    removePeakGoal: (id) => store.set((s) => ({ peakGoals: s.peakGoals.filter((g) => g.id !== id) })),
    // Les objectifs n'avaient aucune date : un objectif posé hier et un
    // autre qui traîne depuis six mois se ressemblaient exactement. On
    // horodate la création et l'accomplissement, sans quoi rien n'est
    // analysable. Les entrées antérieures restent sans date et sont
    // traitées comme telles plutôt que de s'en voir inventer une.
    addGoal: (label) => store.set((s) => ({ customGoals: [...s.customGoals, { id: 'g' + Date.now(), label, done: false, createdAt: todayISO }] })),
    updateGoal: (id, patch) => store.set((s) => ({
      customGoals: s.customGoals.map((g) => {
        if (g.id !== id) return g
        const next = { ...g, ...patch }
        if (patch && Object.prototype.hasOwnProperty.call(patch, 'done')) {
          next.doneAt = patch.done ? (g.doneAt || todayISO) : null
        }
        return next
      }),
    })),
    removeGoal: (id) => store.set((s) => ({ customGoals: s.customGoals.filter((g) => g.id !== id) })),
    setGoal: (key, val) => store.set((s) => ({ goals: { ...s.goals, [key]: val } })),
    setSensitiveZones: (zones) => store.set({ sensitiveZones: zones }),
  }

  // État de synchronisation, pour que l'écran puisse dire ce qui n'est pas
  // encore enregistré au lieu de laisser croire que tout est sauvegardé.
  const sync = inst ? inst.sync : { status: 'idle', pending: 0, lastError: null }
  const retrySync = () => { if (inst) inst.queue.retryNow() }

  return { db, store, loading, sync, retrySync }
}
