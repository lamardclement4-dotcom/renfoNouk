// ============================================================
// Rappels glissés dans les notifications du raccourci « Envoyer ma nuit »
// (migration 0008). Le site les prépare à chaque ouverture, pour
// aujourd'hui et demain, avec ses propres calculs ; le serveur les envoie
// quand le raccourci passe dans leur créneau (réveil, 13 h, 20 h) :
//   - matin      4 h – 11 h : la forme du jour, une note par durée de nuit
//                             possible (le serveur prend celle de la nuit
//                             reçue) ;
//   - midi      11 h – 15 h : la séance prévue, avec la forme ;
//   - après-midi 13 h – 18 h : l'eau bue (lue par le serveur) face à la
//                             cible ;
//   - soir      18 h – 24 h : l'heure du coucher conseillée.
// Rien ici ne touche au réseau.
// ============================================================
import { formeDuJour, libelleDuree } from './sommeilForme'
import { formeContexte, coucherDuSoir } from './formeContexte'
import { decaler } from './sommeilReveil'
import { hydricTargetMl } from '../train/renfoIntel'
import { SPORTS } from '../train/trainData'

const p2 = (n) => String(n).padStart(2, '0')

// « 2026-10-15T04:00:00+02:00 » : l'heure de l'iPhone, avec son décalage.
export function instantLocal(iso, h, mi = 0) {
  if (h >= 24) return instantLocal(decaler(iso, 1), h - 24, mi)
  const [y, m, d] = iso.split('-').map(Number)
  const off = -new Date(y, m - 1, d, h, mi).getTimezoneOffset()
  const s = off >= 0 ? '+' : '-'
  return `${iso}T${p2(h)}:${p2(mi)}:00${s}${p2(Math.floor(Math.abs(off) / 60))}:${p2(Math.abs(off) % 60)}`
}

const texteForme = (f) => `Forme du jour : ${f.score}/100. ${f.verdict}`
const courtForme = (f) => `Forme ${f.score} : ${f.verdict.split(' : ')[1] || f.verdict}`

// La forme pour chaque durée de nuit, de 4 h à 10 h par quart d'heure ;
// deux bandes voisines au même texte n'en font qu'une.
export function bandesForme(db, jour) {
  const log = { ...((db && db.sleepLog) || {}) }
  const out = []
  for (let min = 240; min <= 600; min += 15) {
    log[jour] = { hours: min / 60 }
    const f = formeDuJour(log, jour, formeContexte({ ...db, sleepLog: log }, jour))
    if (!f) continue
    const texte = texteForme(f)
    if (out.length && out[out.length - 1].texte === texte) continue
    out.push({ min, texte, court: courtForme(f) })
  }
  return out
}

const nomSport = (id) => { const s = SPORTS.find((x) => x.id === id); return s ? s.label : 'Séance' }
export function texteSeances(db, jour) {
  const prevues = (Array.isArray(db && db.planningSessions) ? db.planningSessions : [])
    .filter((s) => s && s.statut === 'planifie' && s.date === jour)
    .sort((a, b) => String(a.heure || '').localeCompare(String(b.heure || '')))
  if (!prevues.length) return null
  const une = (s) => nomSport(s.sport) + (s.heure ? ' à ' + s.heure : '') + (s.duree ? ', ' + s.duree : '')
  return (prevues.length > 1 ? 'Séances du jour : ' : 'Séance du jour : ') + prevues.slice(0, 3).map(une).join(' ; ') + '.'
}

export function rappelsMontre(db, aujourdhui) {
  const lignes = []
  const log = (db && db.sleepLog) || {}
  for (const jour of [aujourdhui, decaler(aujourdhui, 1)]) {
    const creneau = (moment, de, a) => ({ jour, moment, debut: instantLocal(jour, de), fin: instantLocal(jour, a) })
    // Matin : la nuit est déjà connue (site ouvert après l'envoi) → note
    // exacte ; sinon une note par durée de nuit.
    const nuitConnue = Number(log[jour] && log[jour].hours) > 0
    const exacte = nuitConnue ? formeDuJour(log, jour, formeContexte(db, jour)) : null
    if (exacte) lignes.push({ ...creneau('matin', 4, 11), texte: texteForme(exacte) })
    else {
      const bandes = bandesForme(db, jour)
      if (bandes.length) lignes.push({ ...creneau('matin', 4, 11), texte: bandes[0].texte, bandes })
    }
    const seances = texteSeances(db, jour)
    if (seances) lignes.push({ ...creneau('midi', 11, 15), texte: seances + (exacte ? ' ' + courtForme(exacte) : '{forme}') })
    const cible = hydricTargetMl(db)
    if (cible >= 500 && cible <= 8000) lignes.push({ ...creneau('apresmidi', 13, 18), texte: 'Eau : {bu} sur {cible}. Il reste {reste}.', cible_eau: cible })
    const soir = coucherDuSoir(db, jour)
    if (soir) lignes.push({ ...creneau('soir', 18, 24), texte: `Ce soir : au lit vers ${soir.coucher} pour dormir ${libelleDuree(soir.besoin)}.` })
  }
  return lignes
}
