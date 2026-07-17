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

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) loadProfile(session.user.id)
  }, [session, loadProfile])

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
    loading, session, profile, refreshProfile,
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
      setInfo('Compte créé.')
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

// ============================================================
// Onboarding — recueil profil / sports / objectifs
// ============================================================
const SPORTS_DISPONIBLES = [
  'Perche', 'Escalade', 'Demi-fond', 'Sprint', 'Musculation',
  'Course à pied', 'Natation', 'Cyclisme', 'Football', 'Basketball', 'Autre',
]
const OBJECTIFS_DISPONIBLES = [
  'Performance', 'Prévention des blessures', 'Prise de muscle',
  'Perte de poids', 'Mobilité', 'Récupération',
]

function Onboarding({ userId, onDone }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [firstName, setFirstName] = useState('')
  const [sexe, setSexe] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [sports, setSports] = useState([])
  const [niveau, setNiveau] = useState('intermediaire')
  const [weeklySessions, setWeeklySessions] = useState(3)
  const [dailyMinutes, setDailyMinutes] = useState(30)
  const [objectifs, setObjectifs] = useState([])
  const [zonesSensibles, setZonesSensibles] = useState('')

  function toggleSport(s) {
    setSports((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }
  function toggleObjectif(o) {
    setObjectifs((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])
  }

  const steps = [
    { title: 'Ton prénom', valid: firstName.trim().length > 0 },
    { title: 'Tes infos physiques', valid: sexe && birthYear && weightKg && heightCm },
    { title: 'Tes sports pratiqués', valid: sports.length > 0 },
    { title: 'Ton niveau', valid: !!niveau },
    { title: 'Tes objectifs', valid: objectifs.length > 0 },
    { title: 'Zones sensibles (optionnel)', valid: true },
  ]

  async function handleFinish() {
    setSaving(true); setError(null)
    const { error } = await supabase.from('profiles').update({
      first_name: firstName.trim(),
      phys: {
        sexe, birthYear: Number(birthYear), weightKg: Number(weightKg), heightCm: Number(heightCm),
        sports, niveau, onboardingDone: true,
      },
      goals: { weeklySessions: Number(weeklySessions), dailyMinutes: Number(dailyMinutes), objectifs },
      sensitive_zones: zonesSensibles.split(',').map((z) => z.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (error) { setError(error.message); setSaving(false); return }
    onDone()
  }

  function next() {
    if (step === steps.length - 1) { handleFinish(); return }
    setStep((s) => s + 1)
  }
  function prev() { setStep((s) => Math.max(0, s - 1)) }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <p style={styles.stepIndicator}>Étape {step + 1} / {steps.length}</p>
        <h2 style={styles.stepTitle}>{steps[step].title}</h2>

        {step === 0 && (
          <input style={styles.input} placeholder="Ton prénom" value={firstName}
            onChange={(e) => setFirstName(e.target.value)} autoFocus />
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select style={styles.input} value={sexe} onChange={(e) => setSexe(e.target.value)}>
              <option value="">Sexe</option>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
              <option value="autre">Autre / préfère ne pas dire</option>
            </select>
            <input style={styles.input} type="number" placeholder="Année de naissance" value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)} />
            <input style={styles.input} type="number" placeholder="Poids (kg)" value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)} />
            <input style={styles.input} type="number" placeholder="Taille (cm)" value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div style={styles.chipGrid}>
            {SPORTS_DISPONIBLES.map((s) => (
              <button key={s} type="button" onClick={() => toggleSport(s)}
                style={sports.includes(s) ? styles.chipActive : styles.chip}>
                {s}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['avance', 'Avancé'],
            ].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setNiveau(val)}
                style={niveau === val ? styles.chipActive : styles.chip}>
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={styles.chipGrid}>
              {OBJECTIFS_DISPONIBLES.map((o) => (
                <button key={o} type="button" onClick={() => toggleObjectif(o)}
                  style={objectifs.includes(o) ? styles.chipActive : styles.chip}>
                  {o}
                </button>
              ))}
            </div>
            <label style={styles.label}>Séances / semaine visées</label>
            <input style={styles.input} type="number" min="1" max="14" value={weeklySessions}
              onChange={(e) => setWeeklySessions(e.target.value)} />
            <label style={styles.label}>Minutes / jour visées</label>
            <input style={styles.input} type="number" min="5" max="240" value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)} />
          </div>
        )}

        {step === 5 && (
          <div>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
              Blessures ou zones à surveiller (séparées par des virgules), laisse vide si aucune.
            </p>
            <input style={styles.input} placeholder="ex: épaule droite, genou gauche"
              value={zonesSensibles} onChange={(e) => setZonesSensibles(e.target.value)} />
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button type="button" onClick={prev} style={styles.buttonSecondary}>Retour</button>
          )}
          <button type="button" onClick={next} disabled={!steps[step].valid || saving} style={styles.button}>
            {saving ? 'Enregistrement...' : step === steps.length - 1 ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 16 },
  card: { width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' },
  title: { fontSize: 28, fontWeight: 700, color: '#c25a3f', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  stepIndicator: { fontSize: 12, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepTitle: { fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 6, color: '#333' },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15, marginBottom: 8, width: '100%' },
  button: { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#c25a3f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', flex: 1 },
  buttonSecondary: { padding: '12px 20px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  switchLink: { marginTop: 14, background: 'none', border: 'none', color: '#c25a3f', fontSize: 13, cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: 13, marginTop: 10 },
  info: { color: '#2d7a4f', fontSize: 13, marginTop: 10 },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { padding: '8px 14px', borderRadius: 20, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 14, cursor: 'pointer' },
  chipActive: { padding: '8px 14px', borderRadius: 20, border: '1px solid #c25a3f', background: '#c25a3f', color: '#fff', fontSize: 14, cursor: 'pointer' },
}

// ============================================================
// App racine
// ============================================================
function App() {
  const { loading, isAuthenticated, isApproved, isPending, isRejected, signIn, signUp, signOut, profile, refreshProfile } = useAuth()

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
    const onboardingDone = profile?.phys?.onboardingDone
    if (!onboardingDone) {
      return <Onboarding userId={profile.id} onDone={refreshProfile} />
    }
    return (
      <div style={{ padding: 40 }}>
        <h2>Bienvenue dans Renfo, {profile?.first_name || ''}</h2>
        <p style={{ color: '#666' }}>
          {profile?.phys?.sports?.join(', ')} · Niveau {profile?.phys?.niveau}
        </p>
        <button onClick={signOut} style={{ marginTop: 20 }}>Se déconnecter</button>
      </div>
    )
  }

  return null
}

export default App
