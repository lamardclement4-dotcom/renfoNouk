import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// Etat centralisé de l'authentification :
//   loading  -> on ne sait pas encore si l'utilisateur est connecté (évite un flash)
//   session  -> session Supabase active, ou null
//   profile  -> ligne `profiles` correspondante (contient status/role), ou null
export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[useAuth] Erreur chargement profil :', error.message)
      setProfile(null)
      return
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setSession(session)
      loadProfile(session?.user?.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    loading,
    session,
    profile,
    isAuthenticated: !!session,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isRejected: profile?.status === 'rejected',
    signUp,
    signIn,
    signOut,
  }
}
