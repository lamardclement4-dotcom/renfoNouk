import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib'

const DAYS_HISTORY = 10

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Clés que l'ancienne app rangeait sous profiles.phys.nutrition (regroupées
// pour éviter d'encombrer le niveau racine de phys).
const NUTRITION_KEYS = ['foodFav', 'foodTargets', 'hydroSport', 'hydroPrefs', 'diagHistory']
// Clés à routage spécial : ni top-level phys, ni phys.nutrition.
const SPECIAL_KEYS = ['profilePhys', 'foodLog', 'hydroLog', 'cycle']

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
  const [dayRows, setDayRows] = useState({}) // { [date]: { food, hydration } }
  const rowIds = useRef({})
  // Miroirs synchrones de l'état, pour calculer le "next" en dehors des
  // updaters de setState : React (StrictMode) peut invoquer un updater deux
  // fois, ce qui déclencherait deux fois l'écriture Supabase si elle vivait
  // à l'intérieur du callback passé à setState.
  const physRef = useRef({})
  const cycleRef = useRef({})
  const dayRowsRef = useRef({})

  useEffect(() => {
    let active = true
    if (!userId) return
    async function load() {
      const since = isoDaysAgo(DAYS_HISTORY)
      const [{ data: profileRow }, { data: logRows }] = await Promise.all([
        supabase.from('profiles').select('phys,cycle').eq('id', userId).single(),
        supabase.from('nutrition_logs').select('id,date,data').eq('user_id', userId).gte('date', since),
      ])
      if (!active) return
      physRef.current = profileRow?.phys || {}
      cycleRef.current = profileRow?.cycle || {}
      setPhys(physRef.current)
      setCycle(cycleRef.current)
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
  const db = {
    ...phys,
    profilePhys: phys,
    cycle,
    foodFav: phys.nutrition?.foodFav || [],
    foodTargets: phys.nutrition?.foodTargets || null,
    hydroSport: phys.nutrition?.hydroSport || {},
    hydroPrefs: phys.nutrition?.hydroPrefs || {},
    diagHistory: phys.nutrition?.diagHistory || [],
    physTests: phys.physTests || [],
    foodLog: Object.fromEntries(Object.entries(dayRows).map(([d, v]) => [d, v.food || []])),
    hydroLog: Object.fromEntries(Object.entries(dayRows).map(([d, v]) => [d, v.hydration || []])),
  }

  const store = {
    get: () => db,
    set: (patchOrFn) => {
      const patch = typeof patchOrFn === 'function' ? patchOrFn(db) : patchOrFn

      if ('profilePhys' in patch) savePhys(() => patch.profilePhys)
      if ('cycle' in patch) saveCycle(() => patch.cycle)

      const nutriInPatch = NUTRITION_KEYS.filter((k) => k in patch)
      if (nutriInPatch.length) {
        savePhys((prev) => ({ ...prev, nutrition: { ...prev.nutrition, ...pick(patch, nutriInPatch) } }))
      }

      // Toute autre clé (physTests, sleepLog, suppPlan, painBilan, breathLog,
      // cycleDiag…) atterrit au niveau racine de phys.
      const topKeys = Object.keys(patch).filter((k) => !SPECIAL_KEYS.includes(k) && !NUTRITION_KEYS.includes(k))
      if (topKeys.length) {
        savePhys((prev) => ({ ...prev, ...pick(patch, topKeys) }))
      }

      if ('foodLog' in patch) {
        for (const [date, entries] of Object.entries(patch.foodLog)) {
          if (entries !== db.foodLog[date]) saveDay(date, { food: entries })
        }
      }
      if ('hydroLog' in patch) {
        for (const [date, entries] of Object.entries(patch.hydroLog)) {
          if (entries !== db.hydroLog[date]) saveDay(date, { hydration: entries })
        }
      }
    },
  }

  return { db, store, loading }
}
