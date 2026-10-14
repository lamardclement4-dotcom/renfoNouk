// ============================================================
// Relier son Apple Watch : la clé, le Raccourci, l'automatisation.
//
// L'iPhone fait le travail : un Raccourci lit Santé chaque matin et dépose
// la nuit, la FC au repos et la VFC dans la boîte du serveur (voir
// montre.js et la migration 0005). Cet écran donne la clé, les valeurs à
// copier, les étapes à suivre, et dit si les dépôts arrivent.
// ============================================================
import React, { useState, useEffect } from 'react'
import { C, MODULE_TINTS, Icon } from './kit'
import { annoncer } from '../../annonces'
import { marquerMontre as poserDrapeau } from './montreDrapeau'

const COL = MODULE_TINTS.sommeil
const URL_DEPOT = ((import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '').replace(/\/$/, '') + '/rest/v1/rpc/deposer_mesures_montre'
const CLE_PUBLIQUE = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || ''


function quand(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  const h = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  const auj = new Date(); auj.setHours(0, 0, 0, 0)
  const jour = new Date(d); jour.setHours(0, 0, 0, 0)
  const k = Math.round((auj - jour) / 86400000)
  return k === 0 ? 'aujourd’hui à ' + h : k === 1 ? 'hier à ' + h : 'il y a ' + k + ' jours'
}

function copier(valeur, quoi) {
  const fait = () => annoncer(quoi + ' copié' + (/clé|URL/.test(quoi) ? 'e' : ''))
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(valeur).then(fait, () => annoncer('Copie impossible : sélectionne le texte à la main.'))
  } catch { annoncer('Copie impossible : sélectionne le texte à la main.') }
}

function AvecCopie({ lab, valeur, quoi }) {
  return React.createElement('div', { style: { margin: '8px 0' } },
    React.createElement('div', { style: { fontFamily: C.mono, fontSize: 10.5, textTransform: 'uppercase', color: C.ink3, marginBottom: 4 } }, lab),
    React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'stretch' } },
      React.createElement('code', { style: { flex: 1, minWidth: 0, fontFamily: C.mono, fontSize: 11.5, padding: '7px 8px', border: `1px solid ${C.line}`, background: C.surface2, color: C.ink, overflowWrap: 'anywhere', userSelect: 'all' } }, valeur || '—'),
      React.createElement('button', { type: 'button', onClick: () => copier(valeur, quoi), disabled: !valeur, style: { flex: '0 0 auto', padding: '0 12px', border: `1.5px solid ${COL}`, background: C.surface, color: COL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, 'Copier')))
}

const ETAPES_RACCOURCI = [
  ['Ouvre l’app Raccourcis, touche « + » et nomme le raccourci « Renfo ».'],
  ['Ajoute l’action « Rechercher des échantillons de santé ». Type : « Analyse du sommeil ». Filtre : « Date de début » est dans les derniers « 1 jour ». Tri : « Date de début », du plus ancien au plus récent. Sans limite.'],
  ['Ajoute « Répéter avec chaque élément ». À l’intérieur, ajoute « Texte » et compose une ligne :', 'sommeil;[Date de début];[Date de fin];[Valeur]', 'Chaque [ ] est la variable « Élément répété », dont tu choisis la propriété. Garde les points-virgules.'],
  ['Sous « Fin de la répétition », ajoute « Combiner le texte » : « Résultats répétés », séparateur « Nouvelle ligne ».'],
  ['Refais les étapes 2 à 4 pour « Fréquence cardiaque au repos » (derniers 2 jours) avec la ligne :', 'fc;[Date de début];[Valeur]'],
  ['Puis pour « Variabilité de la fréquence cardiaque » (dernier 1 jour) avec la ligne :', 'vfc;[Date de début];[Valeur]'],
  ['Ajoute « Texte » et insère les trois « Texte combiné », un par ligne.'],
  ['Ajoute « Obtenir le contenu de l’URL » avec l’adresse ci-dessous. Touche « Afficher plus » : méthode « POST » ; en-têtes « apikey » (valeur ci-dessous) et « Content-Type » = application/json ; corps « JSON » avec deux champs texte : « jeton » = ta clé, « texte » = le texte de l’étape 7.'],
  ['Lance le raccourci une fois et autorise l’accès à Santé. En haut de cet écran, « Dernier dépôt » passe à maintenant.'],
]

export default function MontrePanneau({ userId, store, onRetour, retour = 'Retour à la saisie' }) {
  const [etat, setEtat] = useState({ chargement: true })
  const [cle, setCle] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState(null)
  // Remplacer ou supprimer la clé coupe le raccourci : on le dit, et on
  // demande une seconde touche, sur place.
  const [confirme, setConfirme] = useState(null)

  const charger = () => import('./montreSync').then((m) => m.etatMontre(userId)).then((e) => {
    setEtat(e)
    if (e && e.configuree) poserDrapeau(userId, true)
  }).catch(() => setEtat({ erreur: 'reseau' }))
  useEffect(() => { charger() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function creer() {
    if (etat.configuree && confirme !== 'remplacer') { setConfirme('remplacer'); return }
    setConfirme(null)
    setOccupe(true)
    const m = await import('./montreSync')
    const r = await m.nouvelleCle(userId).catch(() => ({ erreur: 'reseau' }))
    setOccupe(false)
    if (r.erreur) { setEtat({ ...etat, erreur: r.erreur }); return }
    setCle(r.cle)
    poserDrapeau(userId, true)
    charger()
  }
  async function relever() {
    setOccupe(true)
    const m = await import('./montreSync')
    const r = await m.releverMontre(store, { force: true, silencieux: true }).catch(() => ({ erreur: 'reseau' }))
    setOccupe(false)
    setMessage(r.erreur === 'migration' ? null : r.erreur ? 'Relevé impossible pour l’instant (réseau ?).' : r.vide ? 'Rien de neuf dans la boîte.' : (r.phrase || 'Dépôt relevé, rien de nouveau à ranger.') + (r.ecartees ? ` (${r.ecartees} ligne${r.ecartees > 1 ? 's' : ''} illisible${r.ecartees > 1 ? 's' : ''} écartée${r.ecartees > 1 ? 's' : ''})` : ''))
    if (r.erreur === 'migration') setEtat({ erreur: 'migration' })
    else charger()
  }
  async function deconnecter() {
    if (confirme !== 'deconnecter') { setConfirme('deconnecter'); return }
    setConfirme(null)
    setOccupe(true)
    const m = await import('./montreSync')
    const r = await m.supprimerCle(userId).catch(() => ({ erreur: 'reseau' }))
    setOccupe(false)
    if (!r.erreur) { poserDrapeau(userId, false); setCle(null); charger() }
  }

  const titre = (t) => React.createElement('div', { style: { fontFamily: C.display, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink2, margin: '18px 0 8px' } }, t)
  const bloc = { padding: '12px 14px', background: C.surface, border: `1px solid ${C.line}` }
  const bouton = (lab, f, plein) => React.createElement('button', { type: 'button', onClick: f, disabled: occupe, style: { padding: '10px 14px', border: plein ? 'none' : `1.5px solid ${COL}`, background: plein ? COL : C.surface, color: plein ? 'var(--c-on-fill)' : COL, fontSize: 13.5, fontWeight: 700, cursor: occupe ? 'default' : 'pointer', opacity: occupe ? 0.6 : 1 } }, lab)

  return React.createElement('div', null,
    React.createElement('button', { type: 'button', onClick: onRetour, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0 10px', background: 'none', border: 'none', color: COL, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' } }, '← ' + retour),
    React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.55 } },
      'Chaque matin, un raccourci de ton iPhone lit dans Santé ta nuit (avec ses phases), ta fréquence cardiaque au repos et ta variabilité cardiaque, et les dépose ici. Renfo les range à l’ouverture, sans toucher à ce que tu as noté à la main. Rien d’autre n’est lu.'),

    // État
    React.createElement('div', { style: { ...bloc, marginTop: 14, borderLeft: `3px solid ${etat.configuree ? C.success : etat.erreur ? C.warn : C.line}` } },
      etat.chargement ? React.createElement('div', { style: { fontSize: 13, color: C.ink3 } }, 'Vérification…')
        : etat.erreur === 'migration' ? React.createElement('div', { style: { fontSize: 13, color: C.ink, lineHeight: 1.5 } }, 'Le serveur n’est pas encore prêt : la migration « 0005_montre.sql » doit être appliquée dans Supabase (éditeur SQL), une seule fois.')
          : etat.erreur ? React.createElement('div', { style: { fontSize: 13, color: C.ink, lineHeight: 1.5 } }, 'Serveur injoignable pour l’instant. Réessaie avec du réseau.')
            : React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: C.ink } }, etat.configuree ? 'Clé active' : 'Pas encore reliée'),
              React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 3 } }, etat.configuree ? 'Dernier dépôt : ' + (quand(etat.dernierDepot) || 'aucun pour l’instant') : 'Commence par créer ta clé.'),
              etat.configuree ? React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } }, bouton('Relever maintenant', relever, true), bouton(confirme === 'deconnecter' ? 'Oui, supprimer la clé' : 'Déconnecter', deconnecter)) : null,
              confirme === 'deconnecter' ? React.createElement('div', { style: { fontSize: 12, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'Le raccourci ne pourra plus rien déposer. Les nuits déjà rangées restent. ', React.createElement('button', { type: 'button', onClick: () => setConfirme(null), style: { background: 'none', border: 'none', padding: 0, color: COL, fontWeight: 700, cursor: 'pointer', fontSize: 12 } }, 'Annuler')) : null,
              message ? React.createElement('div', { role: 'status', style: { fontSize: 12.5, color: C.ink2, marginTop: 8 } }, message) : null)),

    etat.erreur === 'migration' ? null : React.createElement(React.Fragment, null,
      titre('1 · Ta clé'),
      React.createElement('div', { style: bloc },
        cle ? React.createElement(React.Fragment, null,
          React.createElement(AvecCopie, { lab: 'Ta clé (affichée une seule fois)', valeur: cle, quoi: 'Clé' }),
          React.createElement('div', { style: { fontSize: 12, color: C.warn, lineHeight: 1.45 } }, 'Colle-la dans le raccourci maintenant : elle ne sera plus affichée. Elle donne le droit de déposer des mesures dans ton compte, rien d’autre ; ne la partage pas.'))
          : React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginBottom: 10 } }, etat.configuree ? 'Ta clé est dans ton raccourci. Une nouvelle clé remplace l’ancienne.' : 'Une clé personnelle, à coller dans le raccourci. Le serveur n’en garde qu’une empreinte.'),
            bouton(confirme === 'remplacer' ? 'Oui, remplacer ma clé' : etat.configuree ? 'Remplacer ma clé' : 'Créer ma clé', creer, !etat.configuree),
            confirme === 'remplacer' ? React.createElement('div', { style: { fontSize: 12, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'L’ancienne clé cessera aussitôt de marcher : il faudra coller la nouvelle dans le raccourci. ', React.createElement('button', { type: 'button', onClick: () => setConfirme(null), style: { background: 'none', border: 'none', padding: 0, color: COL, fontWeight: 700, cursor: 'pointer', fontSize: 12 } }, 'Annuler')) : null)),

      titre('2 · Le raccourci (une fois)'),
      React.createElement('div', { style: bloc },
        React.createElement(AvecCopie, { lab: 'Adresse (URL)', valeur: URL_DEPOT, quoi: 'Adresse' }),
        React.createElement(AvecCopie, { lab: 'En-tête apikey (clé publique de l’app)', valeur: CLE_PUBLIQUE, quoi: 'En-tête' }),
        React.createElement('ol', { style: { margin: '10px 0 0', paddingLeft: 20, fontSize: 12.5, color: C.ink2, lineHeight: 1.55 } },
          ETAPES_RACCOURCI.map(([texte, code, note], i) => React.createElement('li', { key: i, style: { marginBottom: 8 } }, texte,
            code ? React.createElement('code', { style: { display: 'block', fontFamily: C.mono, fontSize: 11.5, margin: '4px 0', padding: '5px 7px', background: C.surface2, border: `1px solid ${C.line}`, color: C.ink } }, code) : null,
            note ? React.createElement('span', { style: { display: 'block', fontSize: 11.5, color: C.ink3 } }, note) : null)))),

      titre('3 · Chaque matin, tout seul'),
      React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink2, lineHeight: 1.55 } },
        'Raccourcis › Automatisation › « + » › « Réveil » › « Quand mon réveil est arrêté » (ou « Heure de la journée », 9:00) › « Exécuter immédiatement » › choisis « Renfo ». Ta nuit arrive pendant que tu te lèves.'),

      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, color: C.ink3, lineHeight: 1.45, marginTop: 14 } },
        React.createElement(Icon, { name: 'shield', size: 14, color: C.ink3 }),
        'Les mesures passent par ton compte Renfo, chiffrées en transit. La boîte de dépôt est vidée à chaque relevé, et rien n’y reste plus de 30 jours.')))
}
