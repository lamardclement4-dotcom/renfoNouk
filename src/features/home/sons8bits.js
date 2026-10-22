// ============================================================
// Sons 8 bits des moments forts, générés par le navigateur (onde carrée),
// aucun fichier. Coupés tant qu'on ne les active pas (Profil › Apparence) ;
// sur iPhone, la session audio « ambient » respecte le mode silencieux.
// Réglage propre à l'appareil (comme l'apparence).
// ============================================================
const CLE_SONS = 'renfo:sons'
export function sonsActifs() {
  try { return localStorage.getItem(CLE_SONS) === '1' } catch { return false }
}
export function reglerSons(actifs) {
  try { localStorage.setItem(CLE_SONS, actifs ? '1' : '0') } catch { /* stockage indisponible */ }
}
const MOTIFS = {
  seance: [523, 659, 784, 1047],
  record: [784, 988, 1175, 1568, 0, 1568],
  levelup: [523, 659, 784, 1047, 784, 1047, 1319],
  petit: [880, 1175],
}
let audio = null
export function jouer(motif, { forcer = false } = {}) {
  if (!forcer && !sonsActifs()) return
  try {
    if (!audio) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
      if (!AC) return
      if (navigator.audioSession) navigator.audioSession.type = 'ambient'
      audio = new AC()
    }
    if (audio.state === 'suspended') audio.resume()
    const notes = MOTIFS[motif] || MOTIFS.petit
    const t0 = audio.currentTime + 0.02
    notes.forEach((f, i) => {
      if (!f) return
      const o = audio.createOscillator(), g = audio.createGain()
      o.type = 'square'
      o.frequency.value = f
      const t = t0 + i * 0.075
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.005)
      g.gain.setValueAtTime(0.05, t + 0.06)
      g.gain.linearRampToValueAtTime(0.0001, t + 0.07)
      o.connect(g).connect(audio.destination)
      o.start(t)
      o.stop(t + 0.08)
    })
  } catch { /* pas de son : tant pis, l'animation suffit */ }
}

