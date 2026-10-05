// Faux Supabase : enregistre chaque ecriture pour pouvoir les compter et
// rejouer un desordre d arrivee.
export const calls = { phys: [], cycle: [], goals: [], zones: [], days: [], inserts: [], updates: [] }
export function reset() { for (const k of Object.keys(calls)) calls[k] = [] }

const ok = (data) => Promise.resolve({ data, error: null })
// Pannes simulees : nombre de lectures du profil qui echoueront encore, et
// la facon d echouer (erreur renvoyee par Supabase, ou exception levee).
export const pannes = { lecture: 0, jette: false, profil: null }
const lireProfil = () => {
  if (pannes.lecture > 0) {
    pannes.lecture--
    if (pannes.jette) return Promise.reject(new TypeError('Failed to fetch'))
    return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } })
  }
}

export const supabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        single: () => (pannes.lecture > 0 ? lireProfil() : ok(pannes.profil || { phys: {}, cycle: {}, goals: {}, sensitive_zones: [] })),
        maybeSingle: () => ok(null),
        gte: () => ok([]),
        eq: () => ({ maybeSingle: () => ok(null) }),
      }),
      gte: () => ok([]),
      single: () => ok(null),
      maybeSingle: () => ok(null),
    }),
    update: (payload) => ({
      eq: () => {
        if (payload.phys) calls.phys.push(payload.phys)
        if (payload.cycle) calls.cycle.push(payload.cycle)
        if (payload.goals) calls.goals.push(payload.goals)
        if (payload.sensitive_zones) calls.zones.push(payload.sensitive_zones)
        if (payload.data) calls.updates.push(payload.data)
        calls.days.push({ table, payload })
        return ok(null)
      },
    }),
    insert: (payload) => {
      calls.inserts.push(payload)
      return {
        select: () => ({ single: () => ok({ id: 'row' + calls.inserts.length }) }),
        then: (cb) => cb({ data: null, error: null }),
      }
    },
    delete: () => ({ eq: () => ok(null) }),
  }),
  auth: { getUser: () => ok({ user: { id: 'u1' } }) },
}
export default { supabase }
