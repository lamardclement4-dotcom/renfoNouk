import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib'

// ============================================================
// Hook d'authentification
// ============================================================
function useAuth() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) { console.error('[useAuth] Erreur chargement profil :', error.message); setProfile(null); return }
    setProfile(data)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setSession(session)
      loadProfile(session?.user?.id).finally(() => { if (active) setLoading(false) })
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [loadProfile])

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [])
  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])
  const signOut = useCallback(async () => { await supabase.auth.signOut() }, [])

  return {
    loading, session, profile,
    isAuthenticated: !!session,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isRejected: profile?.status === 'rejected',
    signUp, signIn, signOut,
  }
}

// ============================================================
// Ecran de connexion / inscription
// ============================================================
function Login({ signIn, signUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setInfo(null); setSubmitting(true)
    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    if (error) {
      setError(traduireErreur(error.message))
    } else if (mode === 'signup') {
      setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.')
      setMode('signin')
    }
    setSubmitting(false)
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Renfo</h1>
        <p style={styles.subtitle}>{mode === 'signin' ? 'Connecte-toi à ton compte' : 'Crée ton compte'}</p>

        <label style={styles.label} htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />

        <label style={styles.label} htmlFor="password">Mot de passe</label>
        <input id="password" type="password" required minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />

        {error && <p style={styles.error}>{error}</p>}
        {info && <p style={styles.info}>{info}</p>}

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Patiente...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
        </button>

        <button type="button" style={styles.switchLink} onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null)
        }}>
          {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}

function traduireErreur(message) {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (message.includes('already registered')) return 'Un compte existe déjà avec cet email.'
  if (message.includes('Password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.'
  return message
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 16 },
  card: { width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' },
  title: { fontSize: 28, fontWeight: 700, color: '#c25a3f', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 6, color: '#333' },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15 },
  button: { marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#c25a3f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  switchLink: { marginTop: 14, background: 'none', border: 'none', color: '#c25a3f', fontSize: 13, cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: 13, marginTop: 10 },
  info: { color: '#2d7a4f', fontSize: 13, marginTop: 10 },
}

// ============================================================
// App racine
// ============================================================
function App() {
  const { loading, isAuthenticated, isApproved, isPending, isRejected, signIn, signUp, signOut, profile } = useAuth()

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Chargement...</div>
  if (!isAuthenticated) return <Login signIn={signIn} signUp={signUp} />

  if (isPending) {
    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        <h2>Compte en attente</h2>
        <p style={{ color: '#666', marginTop: 12 }}>Ton inscription a bien été reçue. L'accès sera activé après validation manuelle.</p>
        <button onClick={signOut} style={{ marginTop: 20 }}>Se déconnecter</button>
      </div>
    )
  }

  if (isRejected) {
    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        <h2>Accès refusé</h2>
        <p style={{ color: '#666', marginTop: 12 }}>Contacte l'administrateur pour plus d'informations.</p>
        <button onClick={signOut} style={{ marginTop: 20 }}>Se déconnecter</button>
      </div>
    )
  }

  if (isApproved) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Bienvenue dans Renfo</h2>
        <p style={{ color: '#666' }}>Connecté en tant que {profile?.first_name || 'utilisateur'}.</p>
        <button onClick={signOut} style={{ marginTop: 20 }}>Se déconnecter</button>
      </div>
    )
  }

  return null
}

export default App
