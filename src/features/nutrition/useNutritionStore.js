import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib'

const DAYS_HISTORY = 10

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Adapte le modèle "db plat / store.set" de l'ancienne app (local-only) vers
// Supabase : profilePhys/foodFav/foodTargets/hydroSport/diagHistory vivent
// dans profiles.phys.nutrition (même colonne jsonb que l'onboarding, pas de
// migration nécessaire) ; foodLog/hydroLog sont dérivés d'une ligne par jour
// dans nutrition_logs (data: { food, hydration }).
export function useNutritionStore(userId) {
  const [loading, setLoading] = useState(true)
  const [phys, setPhys] = useState({})
  const [dayRows, setDayRows] = useState({}) // { [date]: { id, food, hydration } }
  const rowIds = useRef({})
  // Miroirs synchrones de l'état, pour calculer le "next" en dehors des
  // updaters de setState : React (StrictMode) peut invoquer un updater deux
  // fois, ce qui déclencherait deux fois l'écriture Supabase si elle vivait
  // à l'intérieur du callback passé à setState.
  const physRef = useRef({})
  const dayRowsRef = useRef({})

  useEffect(() => {
    let active = true
    if (!userId) return
    async function load() {
      const since = isoDaysAgo(DAYS_HISTORY)
      const [{ data: profileRow }, { data: logRows }] = await Promise.all([
        supabase.from('profiles').select('phys').eq('id', userId).single(),
        supabase.from('nutrition_logs').select('id,date,data').eq('user_id', userId).gte('date', since),
      ])
      if (!active) return
      physRef.current = profileRow?.phys || {}
      setPhys(physRef.current)
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
      if (error) console.error('[nutrition] échec sauvegarde profil', error.message)
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
      if (res.error) { console.error('[nutrition] échec sauvegarde journal', res.error.message); return }
      if (!existingId && res.data) rowIds.current[date] = res.data.id
    })
  }, [userId])

  // Reconstitue le "db" plat attendu par les composants portés de l'ancienne app.
  const db = {
    profilePhys: phys,
    foodFav: phys.nutrition?.foodFav || [],
    foodTargets: phys.nutrition?.foodTargets || null,
    hydroSport: phys.nutrition?.hydroSport || {},
    hydroPrefs: phys.nutrition?.hydroPrefs || {},
    diagHistory: phys.nutrition?.diagHistory || [],
    physTests: phys.physTests || [],
    foodLog: Object.fromEntries(Object.entries(dayRows).map(([d, v]) => [d, v.food || []])),
    hydroLog: Object.fromEntries(Object.entries(dayRows).map(([d, v]) => [d, v.hydration || []])),
  }

  // Emule l'API store.set(objetOuFonction) de l'ancienne app en routant
  // chaque clé du patch vers profiles.phys ou la ligne du jour concernée.
  const store = {
    set: (patchOrFn) => {
      const patch = typeof patchOrFn === 'function' ? patchOrFn(db) : patchOrFn
      if ('profilePhys' in patch) savePhys(() => patch.profilePhys)
      if ('physTests' in patch) savePhys((prev) => ({ ...prev, physTests: patch.physTests }))
      const nutritionKeys = ['foodFav', 'foodTargets', 'hydroSport', 'hydroPrefs', 'diagHistory']
      if (nutritionKeys.some((k) => k in patch)) {
        savePhys((prev) => ({
          ...prev,
          nutrition: {
            ...prev.nutrition,
            ...Object.fromEntries(nutritionKeys.filter((k) => k in patch).map((k) => [k, patch[k]])),
          },
        }))
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
