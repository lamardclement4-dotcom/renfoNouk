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
// Données de référence onboarding (issues de l'ancienne app, fidèles)
// ============================================================
const SPORTS = [
  { id: 'course', label: 'Course à pied' },
  { id: 'demi', label: 'Demi-fond / piste' },
  { id: 'fond', label: 'Fond / marathon' },
  { id: 'trail', label: 'Trail' },
  { id: 'marche', label: 'Marche / randonnée' },
  { id: 'perche', label: 'Saut à la perche' },
  { id: 'sprint', label: 'Sprint / vitesse' },
  { id: 'saut', label: 'Sauts (longueur / hauteur)' },
  { id: 'lancers', label: 'Lancers' },
  { id: 'escalade', label: 'Escalade' },
  { id: 'muscu', label: 'Musculation' },
  { id: 'crossfit', label: 'Cross-training' },
  { id: 'gym', label: 'Gymnastique' },
  { id: 'velo', label: 'Vélo / cyclisme' },
  { id: 'vtt', label: 'VTT' },
  { id: 'ski', label: 'Ski / snowboard' },
  { id: 'skate', label: 'Skate / roller' },
  { id: 'natation', label: 'Natation' },
  { id: 'aviron', label: 'Aviron / kayak' },
  { id: 'surf', label: 'Surf / paddle' },
  { id: 'raquette', label: 'Tennis / padel / badminton' },
  { id: 'combat', label: 'Sports de combat' },
  { id: 'football', label: 'Football' },
  { id: 'basket', label: 'Basket / hand / volley' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'danse', label: 'Danse' },
  { id: 'yoga', label: 'Yoga / Pilates' },
  { id: 'equitation', label: 'Équitation' },
  { id: 'fitness', label: 'Renfo général' },
  { id: 'triathlon', label: 'Triathlon' },
  { id: 'patinage', label: 'Patinage / hockey' },
  { id: 'escrime', label: 'Escrime' },
  { id: 'golf', label: 'Golf' },
  { id: 'tir', label: 'Tir à l’arc / tir' },
  { id: 'pingpong', label: 'Tennis de table' },
  { id: 'voile', label: 'Voile / planche' },
  { id: 'callisthenie', label: 'Callisthénie / street workout' },
  { id: 'halterophilie', label: 'Haltérophilie' },
  { id: 'trampoline', label: 'Trampoline / acrobatie' },
  { id: 'frisbee', label: 'Ultimate / frisbee' },
  { id: 'orientation', label: 'Course d’orientation' },
  { id: 'plongee', label: 'Plongée / apnée' },
  { id: 'petanque', label: 'Pétanque / bowling' },
]

const ZONES = [
  { id: 'genoux', label: 'Genoux' },
  { id: 'dos', label: 'Dos / lombaires' },
  { id: 'epaules', label: 'Épaules' },
  { id: 'chevilles', label: 'Chevilles' },
  { id: 'hanches', label: 'Hanches' },
  { id: 'poignets', label: 'Poignets / coudes' },
  { id: 'cou', label: 'Cou / cervicales' },
]

const NIVEAUX = [
  { id: 'debutant', label: 'Débutant', sub: 'Je démarre ou je reprends' },
  { id: 'intermediaire', label: 'Intermédiaire', sub: "Je m'entraîne régulièrement" },
  { id: 'confirme', label: 'Confirmé', sub: 'Entraînement structuré depuis longtemps' },
]

const RENFO_GOALS = [
  { id: 'force', label: 'Force', sub: 'Charges lourdes, technique soignée' },
  { id: 'tonus', label: 'Tonification', sub: 'Volume modéré sur tout le corps' },
  { id: 'endurance', label: 'Endurance musculaire', sub: 'Circuits dynamiques, peu de repos' },
]

const NUTRI_OBJS = [
  { id: 'maintien', label: 'Maintien', sub: 'Rester à mon poids de forme' },
  { id: 'perte', label: 'Perte de poids', sub: 'Déficit modéré, protéines élevées' },
  { id: 'muscle', label: 'Prise de muscle', sub: 'Léger surplus, protéines 1.6-2 g/kg' },
  { id: 'endurance', label: "Performance endurance", sub: "Soutenir un gros volume d'entraînement" },
]

const ACTIVITES = [
  { id: 1.2, label: 'Sédentaire', sub: 'Assis la plupart du temps' },
  { id: 1.375, label: 'Légèrement actif', sub: 'Marche quotidienne, 1-2 séances/sem' },
  { id: 1.55, label: 'Actif', sub: 'Debout souvent, 3-4 séances/sem' },
  { id: 1.725, label: 'Très actif', sub: 'Travail physique ou 5+ séances/sem' },
]

const SUPPLEMENTS = [
  { id: 'creatine', label: 'Créatine', sub: 'Force et masse — preuve solide' },
  { id: 'cafeine', label: 'Caféine', sub: 'Performance et vigilance' },
  { id: 'electrolytes', label: 'Électrolytes', sub: 'Efforts longs / forte chaleur' },
  { id: 'collagene', label: 'Collagène', sub: 'Tendons et articulations' },
  { id: 'ashwagandha', label: 'Ashwagandha', sub: 'Stress et récupération' },
]

const RYTHMES = [
  { dailyMin: 10, weeklySessions: 3, label: 'Découverte', sub: '10 min · 3x/semaine' },
  { dailyMin: 15, weeklySessions: 4, label: 'Régulier', sub: '15 min · 4x/semaine' },
  { dailyMin: 25, weeklySessions: 5, label: 'Engagé', sub: '25 min · 5x/semaine' },
]

// Mêmes formules que l'ancienne app (Mifflin-St Jeor + repères protéiques ISSN),
// pour que l'estimation affichée en fin d'onboarding soit cohérente avec le futur module Nutrition.
const OB_ADJ = { maintien: [1, 1], endurance: [1, 1.03], muscle: [1.05, 1.15], perte: [0.8, 0.9] }
const OB_PROT = { maintien: [1.2, 1.6], endurance: [1.4, 1.6], muscle: [1.6, 2.0], perte: [2.0, 2.4] }

function estimerBesoins({ sexe, age, poids, taille, act, obj }) {
  const bmr = Math.round(10 * poids + 6.25 * taille - 5 * age + (sexe === 'h' ? 5 : -161))
  const tdee = Math.round(bmr * act)
  const a = OB_ADJ[obj] || [1, 1]
  const kcal = Math.round((tdee * a[0] + tdee * a[1]) / 2)
  const pr = OB_PROT[obj] || [1.2, 1.6]
  const prot = Math.round(((pr[0] + pr[1]) / 2) * poids)
  return { bmr, tdee, kcal, prot }
}

function ChoiceList({ items, selected, onPick, multi }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((o) => {
        const on = multi ? selected.includes(o.id) : selected === o.id
        return (
          <button key={o.id} type="button" onClick={() => onPick(o.id)}
            style={{ ...styles.optBtn, ...(on ? styles.optBtnActive : {}) }}>
            <span style={{ ...styles.optCheck, ...(on ? styles.optCheckActive : {}) }}>{on ? '✓' : ''}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{o.label}</span>
              {o.sub && <span style={{ fontSize: 12.5, color: '#999', marginTop: 2 }}>{o.sub}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SportPicker({ selected, onToggle }) {
  const [query, setQuery] = useState('')
  const norm = (s) => (s || '').toLowerCase()
  const filtered = query.trim() ? SPORTS.filter((s) => norm(s.label).includes(norm(query))) : SPORTS
  return (
    <div>
      <input style={styles.input} placeholder="Chercher un sport…" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      <div style={styles.chipGrid}>
        {filtered.map((s) => (
          <button key={s.id} type="button" onClick={() => onToggle(s.id)}
            style={selected.includes(s.id) ? styles.chipActive : styles.chip}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Onboarding — fidèle au parcours de l'ancienne app
// ============================================================
function Onboarding({ userId, onDone }) {
  const [stepId, setStepId] = useState('welcome')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [firstName, setFirstName] = useState('')
  const [goalIdx, setGoalIdx] = useState(1)
  const [sexe, setSexe] = useState('h')
  const [age, setAge] = useState(30)
  const [poids, setPoids] = useState(70)
  const [taille, setTaille] = useState(175)
  const [sports, setSports] = useState([])
  const [niveau, setNiveau] = useState('intermediaire')
  const [zones, setZones] = useState([])
  const [renfoGoal, setRenfoGoal] = useState('tonus')
  const [nutriObj, setNutriObj] = useState('maintien')
  const [act, setAct] = useState(1.55)
  const [supps, setSupps] = useState([])
  const [cycleChoice, setCycleChoice] = useState(null)
  const [cycleLen, setCycleLen] = useState(28)

  const order = ['welcome', 'name', 'body']
    .concat(sexe === 'f' ? ['cycle'] : [])
    .concat(['sports', 'level', 'renfogoal', 'nutriobj', 'activity', 'supps', 'zones', 'rhythm', 'final'])
  const idx = Math.max(0, order.indexOf(stepId))

  function next() { if (idx < order.length - 1) setStepId(order[idx + 1]) }
  function back() { if (idx > 0) setStepId(order[idx - 1]) }
  function toggleIn(setter) { return (id) => setter((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) }
  const toggleSport = toggleIn(setSports)
  const toggleZone = toggleIn(setZones)
  const toggleSupp = toggleIn(setSupps)

  const e = estimerBesoins({ sexe, age, poids, taille, act, obj: nutriObj })

  function isoDaysAgo(n) {
    const d = new Date(); d.setDate(d.getDate() - n)
    const p = (x) => (x < 10 ? '0' + x : '' + x)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  async function handleFinish() {
    setSaving(true); setError(null)

    let cycle = null
    if (sexe === 'f' && cycleChoice && cycleChoice !== 'no') {
      if (cycleChoice === 'recent') cycle = { enabled: true, cycleLen, periodLen: 5, startDate: isoDaysAgo(3) }
      else if (cycleChoice === 'midway') cycle = { enabled: true, cycleLen, periodLen: 5, startDate: isoDaysAgo(14) }
      else cycle = { enabled: false, cycleLen, periodLen: 5 }
    }

    const rythme = RYTHMES[goalIdx]

    const { error } = await supabase.from('profiles').update({
      first_name: firstName.trim(),
      phys: {
        sexe, age: Number(age), poids: Number(poids), taille: Number(taille),
        sports, niveau, renfoGoal, obj: nutriObj, act, suppIds: supps,
        onboardingDone: true,
      },
      goals: { dailyMin: rythme.dailyMin, weeklySessions: rythme.weeklySessions, goalIdx },
      cycle,
      sensitive_zones: zones,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (error) { setError(error.message); setSaving(false); return }
    onDone()
  }

  function skip() {
    setSaving(true)
    supabase.from('profiles').update({
      phys: { onboardingDone: true },
      updated_at: new Date().toISOString(),
    }).eq('id', userId).then(({ error }) => {
      if (error) { setError(error.message); setSaving(false); return }
      onDone()
    })
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {stepId !== 'welcome' && stepId !== 'final' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 18 }}>
            {order.slice(1, -1).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < idx ? '#c25a3f' : '#eee' }} />
            ))}
            {idx > 0 && (
              <button type="button" onClick={back} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#999', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Retour
              </button>
            )}
          </div>
        )}

        {stepId === 'welcome' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h1 style={styles.title}>Bienvenue{firstName ? `, ${firstName}` : ''} !</h1>
            <p style={{ color: '#666', fontSize: 15, marginTop: 12 }}>
              Quelques minutes pour tout régler : profil, objectifs, nutrition, cycle, compléments. Tout est modifiable ensuite.
            </p>
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 24 }}>Commencer</button>
            <button type="button" onClick={skip} style={{ ...styles.switchLink, marginTop: 14, display: 'block', margin: '14px auto 0' }}>
              Passer la configuration
            </button>
          </div>
        )}

        {stepId === 'name' && (
          <div>
            <h2 style={styles.stepTitle}>Comment tu t'appelles ?</h2>
            <input style={styles.input} placeholder="Ton prénom" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} autoFocus />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'body' && (
          <div>
            <h2 style={styles.stepTitle}>Quelques infos sur toi</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Elles servent au calcul de tes besoins (calories, protéines).</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {[{ id: 'h', label: 'Homme' }, { id: 'f', label: 'Femme' }].map((o) => (
                <button key={o.id} type="button" onClick={() => setSexe(o.id)}
                  style={{ flex: 1, ...(sexe === o.id ? styles.chipActive : styles.chip), textAlign: 'center' }}>
                  {o.label}
                </button>
              ))}
            </div>
            <label style={styles.label}>Âge</label>
            <input style={styles.input} type="number" value={age} onChange={(e) => setAge(e.target.value)} />
            <label style={styles.label}>Poids (kg)</label>
            <input style={styles.input} type="number" value={poids} onChange={(e) => setPoids(e.target.value)} />
            <label style={styles.label}>Taille (cm)</label>
            <input style={styles.input} type="number" value={taille} onChange={(e) => setTaille(e.target.value)} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'cycle' && (
          <div>
            <h2 style={styles.stepTitle}>Suivre ton cycle ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              L'app adapte alors séances et conseils à tes phases. Tes dernières règles ont commencé...
            </p>
            <ChoiceList items={[
              { id: 'recent', label: 'Ces derniers jours', sub: 'Cycle calé sur cette semaine' },
              { id: 'midway', label: 'Il y a environ 2 semaines', sub: 'Cycle calé en milieu de période' },
              { id: 'unknown', label: 'Je ne sais plus exactement', sub: "À activer plus tard dans l'espace Cycle" },
              { id: 'no', label: 'Ne pas suivre mon cycle', sub: "Tu pourras l'activer à tout moment" },
            ]} selected={cycleChoice} onPick={setCycleChoice} multi={false} />
            {cycleChoice && cycleChoice !== 'no' && (
              <div style={{ marginTop: 14 }}>
                <label style={styles.label}>Durée de ton cycle (jours)</label>
                <input style={styles.input} type="number" value={cycleLen} onChange={(e) => setCycleLen(Number(e.target.value))} />
              </div>
            )}
            <button type="button" onClick={next} disabled={!cycleChoice} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'sports' && (
          <div>
            <h2 style={styles.stepTitle}>Quel(s) sport(s) tu pratiques ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>On te proposera des séances de renfo, récup et plyo adaptées.</p>
            <SportPicker selected={sports} onToggle={toggleSport} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>
              {sports.length ? 'Continuer' : 'Passer'}
            </button>
          </div>
        )}

        {stepId === 'level' && (
          <div>
            <h2 style={styles.stepTitle}>Ton niveau actuel ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Il cale les seuils du suivi de charge d'entraînement.</p>
            <ChoiceList items={NIVEAUX} selected={niveau} onPick={setNiveau} multi={false} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'renfogoal' && (
          <div>
            <h2 style={styles.stepTitle}>Ton objectif renfo ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Il oriente les séances mises en avant.</p>
            <ChoiceList items={RENFO_GOALS} selected={renfoGoal} onPick={setRenfoGoal} multi={false} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'nutriobj' && (
          <div>
            <h2 style={styles.stepTitle}>Ton objectif nutrition ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Il fixe tes cibles caloriques et protéiques (repères ISSN).</p>
            <ChoiceList items={NUTRI_OBJS} selected={nutriObj} onPick={setNutriObj} multi={false} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'activity' && (
          <div>
            <h2 style={styles.stepTitle}>Ton activité au quotidien ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Hors séances — elle pondère ta dépense énergétique totale.</p>
            <ChoiceList items={ACTIVITES} selected={act} onPick={setAct} multi={false} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'supps' && (
          <div>
            <h2 style={styles.stepTitle}>Des compléments ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Optionnel, modifiable ensuite.</p>
            <ChoiceList items={SUPPLEMENTS} selected={supps} onPick={toggleSupp} multi={true} />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>
              {supps.length ? 'Continuer' : 'Aucun, continuer'}
            </button>
          </div>
        )}

        {stepId === 'zones' && (
          <div>
            <h2 style={styles.stepTitle}>Des zones sensibles en ce moment ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Un rappel de prudence s'affichera sur chaque séance.</p>
            <div style={styles.chipGrid}>
              {ZONES.map((z) => (
                <button key={z.id} type="button" onClick={() => toggleZone(z.id)}
                  style={zones.includes(z.id) ? styles.chipActive : styles.chip}>
                  {z.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>
              {zones.length ? 'Continuer' : 'Aucune, continuer'}
            </button>
          </div>
        )}

        {stepId === 'rhythm' && (
          <div>
            <h2 style={styles.stepTitle}>Quel rythme tu vises ?</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Tu pourras changer ça à tout moment dans ton profil.</p>
            <ChoiceList
              items={RYTHMES.map((g, i) => ({ id: i, label: g.label, sub: g.sub }))}
              selected={goalIdx} onPick={setGoalIdx} multi={false}
            />
            <button type="button" onClick={next} style={{ ...styles.button, marginTop: 16, width: '100%' }}>Continuer</button>
          </div>
        )}

        {stepId === 'final' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={styles.stepTitle}>{firstName ? `C'est prêt, ${firstName} !` : "C'est prêt !"}</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Tes besoins estimés :</p>
            <div style={{ display: 'flex', gap: 10, margin: '18px 0' }}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{e.kcal}</div>
                <div style={styles.statLabel}>kcal / jour</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{e.prot} g</div>
                <div style={styles.statLabel}>protéines / jour</div>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: '#999', lineHeight: 1.4 }}>
              Estimation Mifflin-St Jeor · repères ISSN/EFSA/OMS. Indicatif, pas un avis médical.
            </p>
            {error && <p style={styles.error}>{error}</p>}
            <button type="button" onClick={handleFinish} disabled={saving} style={{ ...styles.button, marginTop: 20, width: '100%' }}>
              {saving ? 'Enregistrement...' : "Terminer et accéder à l'app"}
            </button>
          </div>
        )}
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
  optBtn: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 12, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  optBtnActive: { border: '1.5px solid #c25a3f', background: '#fdf1ee' },
  optCheck: { width: 22, height: 22, borderRadius: 999, border: '2px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#c25a3f', flex: '0 0 auto' },
  optCheckActive: { border: '2px solid #c25a3f' },
  statCard: { flex: 1, padding: '16px 12px', borderRadius: 12, background: '#faf9f5', border: '1px solid #eee', textAlign: 'center' },
  statValue: { fontWeight: 800, fontSize: 24, color: '#c25a3f' },
  statLabel: { fontSize: 11.5, color: '#999', fontWeight: 600, marginTop: 3 },
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
