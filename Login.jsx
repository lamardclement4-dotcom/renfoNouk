import { useState } from 'react'

export default function Login({ signIn, signUp }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

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
        <p style={styles.subtitle}>
          {mode === 'signin' ? 'Connecte-toi à ton compte' : 'Crée ton compte'}
        </p>

        <label style={styles.label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label} htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        {error && <p style={styles.error}>{error}</p>}
        {info && <p style={styles.info}>{info}</p>}

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Patiente...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
        </button>

        <button
          type="button"
          style={styles.switchLink}
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setInfo(null)
          }}
        >
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
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#faf9f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
  },
  title: { fontSize: 28, fontWeight: 700, color: '#c25a3f', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 6, color: '#333' },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #ddd',
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    padding: '12px',
    borderRadius: 10,
    border: 'none',
    background: '#c25a3f',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  switchLink: {
    marginTop: 14,
    background: 'none',
    border: 'none',
    color: '#c25a3f',
    fontSize: 13,
    cursor: 'pointer',
  },
  error: { color: '#c0392b', fontSize: 13, marginTop: 10 },
  info: { color: '#2d7a4f', fontSize: 13, marginTop: 10 },
}
