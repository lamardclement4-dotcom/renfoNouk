import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib'

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
export function useNutritionStore(userId) {
  const [loading, setLoading] = useState(true)
  const [phys, setPhys] = useState({})
  const [cycle, setCycle] = useState({})
  const [goals, setGoals] = useState({})
  const [sensitiveZones, setSensitiveZones] = useState([])
  const [dayRows, setDayRows] = useState({}) // { [date]: { food, hydration } }
  const rowIds = useRef({})
  // Miroirs synchrones de l'état, pour calculer le "next" en dehors des
  // updaters de setState : React (StrictMode) peut invoquer un updater deux
  // fois, ce qui déclencherait deux fois l'écriture Supabase si elle vivait
  // à l'intérieur du callback passé à setState.
  const physRef = useRef({})
  const cycleRef = useRef({})
  const goalsRef = useRef({})
  const sensitiveZonesRef = useRef([])
  const dayRowsRef = useRef({})

  useEffect(() => {
    let active = true
    if (!userId) return
    async function load() {
      const since = isoDaysAgo(DAYS_HISTORY)
      const [{ data: profileRow }, { data: logRows }] = await Promise.all([
        supabase.from('profiles').select('phys,cycle,sensitive_zones,goals').eq('id', userId).single(),
        supabase.from('nutrition_logs').select('id,date,data').eq('user_id', userId).gte('date', since),
      ])
      if (!active) return
      physRef.current = profileRow?.phys || {}
      cycleRef.current = profileRow?.cycle || {}
      goalsRef.current = profileRow?.goals || {}
      sensitiveZonesRef.current = profileRow?.sensitive_zones || []
      setPhys(physRef.current)
      setCycle(cycleRef.current)
      setGoals(goalsRef.current)
      setSensitiveZones(sensitiveZonesRef.current)
      const rows = {}
      for (const r of logRows || []) {
        rows[r.date] = { food: r.data?.food || [], hydration: r.data?.hydration || [] }
        rowIds.current[r.date] = r.id
      }
      dayRowsRef.current = rows
      setDayRows(rows)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [userId])

  const savePhys = useCallback((patchFn) => {
    const prev = physRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    physRef.current = next
    setPhys(next)
    supabase.from('profiles').update({ phys: next }).eq('id', userId).then(({ error }) => {
      if (error) console.error('[store] échec sauvegarde phys', error.message)
    })
  }, [userId])

  const saveCycle = useCallback((patchFn) => {
    const prev = cycleRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    cycleRef.current = next
    setCycle(next)
    supabase.from('profiles').update({ cycle: next }).eq('id', userId).then(({ error }) => {
      if (error) console.error('[store] échec sauvegarde cycle', error.message)
    })
  }, [userId])

  const saveGoals = useCallback((patchFn) => {
    const prev = goalsRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : { ...prev, ...patchFn }
    goalsRef.current = next
    setGoals(next)
    supabase.from('profiles').update({ goals: next }).eq('id', userId).then(({ error }) => {
      if (error) console.error('[store] échec sauvegarde objectifs', error.message)
    })
  }, [userId])

  const saveSensitiveZones = useCallback((patchFn) => {
    const prev = sensitiveZonesRef.current
    const next = typeof patchFn === 'function' ? patchFn(prev) : patchFn
    sensitiveZonesRef.current = next
    setSensitiveZones(next)
    supabase.from('profiles').update({ sensitive_zones: next }).eq('id', userId).then(({ error }) => {
      if (error) console.error('[store] échec sauvegarde zones sensibles', error.message)
    })
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
      setDayRows(dayRowsRef.current)
    })
  }, [userId])

  const saveDay = useCallback((date, partial) => {
    const prevDay = dayRowsRef.current[date] || { food: [], hydration: [] }
    const nextDay = { ...prevDay, ...partial }
    const nextAll = { ...dayRowsRef.current, [date]: nextDay }
    dayRowsRef.current = nextAll
    setDayRows(nextAll)

    const data = { food: nextDay.food || [], hydration: nextDay.hydration || [] }
    const existingId = rowIds.current[date]
    const write = existingId
      ? supabase.from('nutrition_logs').update({ data, updated_at: new Date().toISOString() }).eq('id', existingId)
      : supabase.from('nutrition_logs').insert({ user_id: userId, date, data }).select('id').single()
    write.then((res) => {
      if (res.error) { console.error('[store] échec sauvegarde journal', res.error.message); return }
      if (!existingId && res.data) rowIds.current[date] = res.data.id
    })
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
  const buildDb = (physSrc, cycleSrc, goalsSrc, zonesSrc, rowsSrc) => ({
    ...physSrc,
    profilePhys: physSrc,
    cycle: cycleSrc,
    foodFav: physSrc.nutrition?.foodFav || [],
    foodTargets: physSrc.nutrition?.foodTargets || null,
    hydroSport: physSrc.nutrition?.hydroSport || {},
    hydroPrefs: physSrc.nutrition?.hydroPrefs || {},
    diagHistory: physSrc.nutrition?.diagHistory || [],
    physTests: physSrc.physTests || [],
    foodLog: Object.fromEntries(Object.entries(rowsSrc).map(([d, v]) => [d, v.food || []])),
    hydroLog: Object.fromEntries(Object.entries(rowsSrc).map(([d, v]) => [d, v.hydration || []])),
    week: physSrc.week || [0, 0, 0, 0, 0, 0, 0],
    sessionLog: physSrc.sessionLog || [],
    // Suivi du poids : historique des pesées ({date, kg}) et poids visé.
    weightLog: physSrc.weightLog || [],
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
    customGoals: physSrc.customGoals || [],
    mobility: physSrc.mobility || null,
    mobilityHistory: physSrc.mobilityHistory || [],
    program: physSrc.program || null,
    peakGoals: physSrc.peakGoals || [],
    recoveryLog: physSrc.recoveryLog || {},
    sensitiveZones: zonesSrc,
  })

  const db = buildDb(phys, cycle, goals, sensitiveZones, dayRows)
  // État à jour à l'instant même, y compris les écritures de ce tick.
  const liveDb = () => buildDb(physRef.current, cycleRef.current, goalsRef.current, sensitiveZonesRef.current, dayRowsRef.current)

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

  return { db, store, loading }
}
