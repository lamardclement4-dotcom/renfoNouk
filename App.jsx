import { useAuth } from './features/auth/useAuth'
import Login from './features/auth/Login'
import './App.css'

function App() {
  const { loading, isAuthenticated, isApproved, isPending, isRejected, signIn, signUp, signOut, profile } = useAuth()

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Chargement...</div>
  }

  if (!isAuthenticated) {
    return <Login signIn={signIn} signUp={signUp} />
  }

  if (isPending) {
    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        <h2>Compte en attente</h2>
        <p style={{ color: '#666', marginTop: 12 }}>
          Ton inscription a bien été reçue. L'accès sera activé après validation manuelle.
        </p>
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
