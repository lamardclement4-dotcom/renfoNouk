// ============================================================
// File d'attente des écritures vers Supabase.
//
// Jusqu'ici, une écriture qui échouait finissait dans un console.error et
// nulle part ailleurs. Réseau coupé, session expirée, règle refusée :
// l'écran affichait la saisie, elle n'était jamais partie, et personne ne
// le savait. Un repas noté dans le métro disparaissait au rechargement.
//
// Chaque écriture porte déjà l'objet complet de sa cible (le profil
// entier, la journée entière) : deux écritures successives sur la même
// cible ne se complètent pas, la seconde remplace la première. La file
// n'a donc à retenir que la dernière charge utile par cible — c'est ce
// qui permet de la garder petite et de rejouer sans risque de doublon.
//
// Elle survit à un rechargement : sans cela, fermer l'onglet pendant une
// coupure réseau perdait la saisie pour de bon.
// ============================================================

export const STORAGE_PREFIX = 'renfo:sync:'
// Au-delà, on renonce à conserver la file plutôt que de faire échouer
// l'écriture locale : le quota de localStorage est de quelques mégaoctets
// et une file énorme le remplirait au détriment du reste.
export const MAX_STORED_BYTES = 2_000_000
export const BASE_DELAY_MS = 1000
export const MAX_DELAY_MS = 30_000
export const MAX_ATTEMPTS = 8

export function backoffDelay(attempt, { base = BASE_DELAY_MS, max = MAX_DELAY_MS } = {}) {
  if (!(attempt > 0)) return base
  return Math.min(max, base * Math.pow(2, attempt - 1))
}

// Une erreur d'authentification ou de permission ne se résout pas en
// réessayant : insister ferait tourner la file indéfiniment. Une panne
// réseau, elle, se résout toute seule.
export function isRetryable(error) {
  if (!error) return false
  const code = String(error.code || '')
  const msg = String(error.message || '').toLowerCase()
  if (code.startsWith('42') || code === 'PGRST301') return false
  if (/jwt|unauthor|forbidden|permission|violates row-level/.test(msg)) return false
  return true
}

export function createSyncQueue({ userId, storage, online, now } = {}) {
  const store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null)
  const isOnline = online || (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  const clock = now || (() => Date.now())
  const key = STORAGE_PREFIX + (userId || 'anon')

  const q = {
    // cible -> { payload, attempts, lastError }
    entries: new Map(),
    handlers: {},
    status: 'idle', // idle | saving | pending | error
    lastError: null,
    listeners: new Set(),
    flushing: false,
    timer: null,
  }

  const notify = () => { for (const l of q.listeners) l(publicState()) }

  function publicState() {
    return {
      status: q.status,
      pending: q.entries.size,
      lastError: q.lastError,
      // Cibles en attente, pour pouvoir dire ce qui n'est pas encore parti.
      targets: [...q.entries.keys()],
    }
  }

  function persist() {
    if (!store) return
    try {
      const obj = {}
      for (const [target, e] of q.entries) obj[target] = e.payload
      const json = JSON.stringify(obj)
      if (json.length > MAX_STORED_BYTES) { store.removeItem(key); return }
      store.setItem(key, json)
    } catch {
      // Quota plein ou stockage indisponible : la file continue de vivre en
      // mémoire, on perd seulement la survie au rechargement.
    }
  }

  function restore() {
    if (!store) return {}
    try {
      const raw = store.getItem(key)
      if (!raw) return {}
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : {}
    } catch { return {} }
  }

  function setStatus(next) {
    if (q.status === next) return
    q.status = next
    notify()
  }

  return {
    subscribe(fn) { q.listeners.add(fn); return () => q.listeners.delete(fn) },
    state: publicState,

    // `handlers` associe un préfixe de cible à la fonction qui écrit
    // réellement. Le module reste ainsi ignorant de Supabase, donc testable.
    setHandlers(handlers) { q.handlers = handlers || {} },

    // Charges utiles retrouvées d'une session précédente : elles décrivent
    // des modifications locales jamais parties.
    restorePending: restore,

    enqueue(target, payload) {
      q.entries.set(target, { payload, attempts: 0, lastError: null })
      persist()
      setStatus(q.status === 'error' ? 'error' : 'pending')
      notify()
      this.flush()
    },

    async flush() {
      if (q.flushing) return
      if (!q.entries.size) { q.lastError = null; setStatus('idle'); return }
      if (!isOnline()) { setStatus('pending'); return }
      q.flushing = true
      setStatus('saving')
      try {
        // On relit la file à chaque tour plutôt que d'en prendre un
        // instantané : une écriture arrivée pendant l'envoi serait sinon
        // restée bloquée jusqu'à la suivante, `enqueue` déclenchant un
        // `flush` qui repartait aussitôt faute de pouvoir entrer.
        for (let guard = 0; q.entries.size && guard < 1000; guard++) {
          const [target, entry] = q.entries.entries().next().value
          const kind = target.split(':')[0]
          const handler = q.handlers[kind]
          if (!handler) { q.entries.delete(target); continue }
          let res
          try {
            res = await handler(target, entry.payload)
          } catch (err) {
            res = { error: err }
          }
          const error = res && res.error
          if (!error) {
            // Une écriture plus récente sur la même cible a pu remplacer
            // l'entrée pendant l'envoi. Supprimer par cible jetterait cette
            // charge utile plus fraîche sans jamais l'envoyer : on ne
            // supprime que si c'est bien celle qu'on vient de traiter.
            if (q.entries.get(target) === entry) q.entries.delete(target)
            entry.lastError = null
            continue
          }
          entry.attempts += 1
          entry.lastError = error.message || String(error)
          q.lastError = entry.lastError
          if (!isRetryable(error) || entry.attempts >= MAX_ATTEMPTS) {
            // On garde l'entrée : la personne doit pouvoir réessayer
            // elle-même plutôt que de voir sa saisie s'évaporer.
            setStatus('error')
            persist()
            return
          }
          const delay = backoffDelay(entry.attempts)
          persist()
          setStatus('pending')
          clearTimeout(q.timer)
          q.timer = setTimeout(() => this.flush(), delay)
          return
        }
        persist()
        q.lastError = null
        setStatus(q.entries.size ? 'pending' : 'idle')
      } finally {
        q.flushing = false
      }
    },

    // Reprise manuelle, pour le bouton « Réessayer ».
    retryNow() {
      for (const e of q.entries.values()) e.attempts = 0
      q.lastError = null
      clearTimeout(q.timer)
      return this.flush()
    },

    // Nombre d'écritures encore en attente, pour prévenir avant fermeture.
    pendingCount() { return q.entries.size },

    clear() {
      q.entries.clear()
      q.lastError = null
      clearTimeout(q.timer)
      if (store) { try { store.removeItem(key) } catch { /* stockage indisponible */ } }
      setStatus('idle')
    },

    _now: clock,
  }
}
