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
import { marquerMontre as poserDrapeau, lienEnvoyerMaintenant, adresseRetour, lireCleLocale, garderCleLocale } from './montreDrapeau'

const COL = MODULE_TINTS.sommeil
const URL_DEPOT = ((import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '').replace(/\/$/, '') + '/rest/v1/rpc/deposer_mesures_montre'
const CLE_PUBLIQUE = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || ''
// Le raccourci tout prêt, signé, publié avec le site (outils/raccourci).
const HOTE = (() => { try { return new URL(URL_DEPOT).host || 'le serveur de Renfo' } catch { return 'le serveur de Renfo' } })()
const RACCOURCI = ((import.meta.env && import.meta.env.BASE_URL) || '/') + 'raccourci/' + encodeURIComponent('Envoyer ma nuit') + '.shortcut'


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

// Étapes numérotées, une action par ligne.
function Liste({ items }) {
  return React.createElement('ol', { style: { margin: '6px 0 0', paddingLeft: 20, fontSize: 12.5, color: C.ink2, lineHeight: 1.55 } },
    // Espaces insécables dans les guillemets : un « ne reste jamais seul en
    // bout de ligne, loin du bouton qu'il nomme.
    items.map((t, i) => React.createElement('li', { key: i, style: { marginBottom: 6 } }, t.replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»'))))
}

function AvecCopie({ lab, valeur, quoi }) {
  return React.createElement('div', { style: { margin: '8px 0' } },
    React.createElement('div', { style: { fontFamily: C.mono, fontSize: 10.5, textTransform: 'uppercase', color: C.ink3, marginBottom: 4 } }, lab),
    React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'stretch' } },
      React.createElement('code', { style: { flex: 1, minWidth: 0, fontFamily: C.mono, fontSize: 11.5, padding: '7px 8px', border: `1px solid ${C.line}`, background: C.surface2, color: C.ink, overflowWrap: 'anywhere', userSelect: 'all' } }, valeur || '—'),
      React.createElement('button', { type: 'button', onClick: () => copier(valeur, quoi), disabled: !valeur, style: { flex: '0 0 auto', padding: '0 12px', border: `1.5px solid ${COL}`, background: C.surface, color: COL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, 'Copier')))
}

const ETAPES_RACCOURCI = [
  ['Ouvre l’app Raccourcis, touche « + » et nomme le raccourci « Envoyer ma nuit ».'],
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
    garderCleLocale(userId, r.cle)
    // Copiée tout de suite : l'étape suivante (installer le raccourci) la
    // demande, et l'iPhone n'a qu'à la coller.
    copier(r.cle, 'Clé')
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
    if (!r.erreur) { poserDrapeau(userId, false); garderCleLocale(userId, null); setCle(null); charger() }
  }

  const titre = (t) => React.createElement('div', { style: { fontFamily: C.display, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink2, margin: '18px 0 8px' } }, t)
  const bloc = { padding: '12px 14px', background: C.surface, border: `1px solid ${C.line}` }
  const bouton = (lab, f, plein) => React.createElement('button', { type: 'button', onClick: f, disabled: occupe, style: { padding: '10px 14px', border: plein ? 'none' : `1.5px solid ${COL}`, background: plein ? COL : C.surface, color: plein ? 'var(--c-on-fill)' : COL, fontSize: 13.5, fontWeight: 700, cursor: occupe ? 'default' : 'pointer', opacity: occupe ? 0.6 : 1 } }, lab)

  return React.createElement('div', null,
    React.createElement('button', { type: 'button', onClick: onRetour, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0 10px', background: 'none', border: 'none', color: COL, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' } }, '← ' + retour),
    React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.55 } },
      'Chaque matin, un raccourci de l’app Raccourcis (celle d’Apple, déjà sur ton iPhone) lit dans Santé ta nuit (durée, heures, phases), puis ta fréquence cardiaque au repos, ta variabilité cardiaque, ta respiration et ton oxygène sanguin la nuit, et tes minutes d’exercice, et les envoie à ce site. Elles comptent dans ta forme du jour et dans Santé › Cœur. Rien à installer depuis l’App Store. Quatre étapes, une seule fois.'),

    // État
    React.createElement('div', { style: { ...bloc, marginTop: 14, borderLeft: `3px solid ${etat.configuree ? C.success : etat.erreur ? C.warn : C.line}` } },
      etat.chargement ? React.createElement('div', { style: { fontSize: 13, color: C.ink3 } }, 'Vérification…')
        : etat.erreur === 'migration' ? React.createElement('div', { style: { fontSize: 13, color: C.ink, lineHeight: 1.5 } }, 'Le serveur n’est pas encore prêt : les migrations 0005 à 0010 (dossier supabase/migrations) doivent être appliquées dans Supabase (éditeur SQL), une seule fois, dans l’ordre.')
          : etat.erreur ? React.createElement('div', { style: { fontSize: 13, color: C.ink, lineHeight: 1.5 } }, 'Serveur injoignable pour l’instant. Réessaie avec du réseau.')
            : React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: C.ink } }, etat.configuree ? 'Clé active' : 'Pas encore reliée'),
              React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 3 } }, etat.configuree ? 'Dernier dépôt : ' + (quand(etat.dernierDepot) || 'aucun pour l’instant') : 'Commence par créer ta clé.'),
              etat.configuree ? React.createElement('a', { href: lienEnvoyerMaintenant(adresseRetour()), style: { display: 'block', textAlign: 'center', marginTop: 10, padding: '10px 14px', background: COL, color: 'var(--c-on-fill)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' } }, 'Envoyer maintenant depuis la montre') : null,
              etat.configuree ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4, lineHeight: 1.4 } }, 'Ouvre Raccourcis, lance « Envoyer ma nuit », puis revient ici : ta nuit est rangée aussitôt. Marche même sans automatisation.') : null,
              etat.configuree ? React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } }, bouton('Relever maintenant', relever), bouton(confirme === 'deconnecter' ? 'Oui, supprimer la clé' : 'Déconnecter', deconnecter)) : null,
              confirme === 'deconnecter' ? React.createElement('div', { style: { fontSize: 12, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'Le raccourci ne pourra plus rien déposer. Les nuits déjà rangées restent. ', React.createElement('button', { type: 'button', onClick: () => setConfirme(null), style: { background: 'none', border: 'none', padding: 0, color: COL, fontWeight: 700, cursor: 'pointer', fontSize: 12 } }, 'Annuler')) : null,
              message ? React.createElement('div', { role: 'status', style: { fontSize: 12.5, color: C.ink2, marginTop: 8 } }, message) : null)),

    etat.erreur === 'migration' ? null : React.createElement(React.Fragment, null,
      React.createElement('div', { style: { ...bloc, marginTop: 14, fontSize: 12.5, color: C.ink2, lineHeight: 1.55, borderLeft: `3px solid ${COL}` } },
        React.createElement('strong', { style: { color: C.ink } }, 'Avant de commencer : '),
        'fais tout sur ton iPhone, avec ce site ouvert dans Safari. Compte 5 minutes. Il te faut une Apple Watch qui enregistre ton sommeil (app Santé › Sommeil).'),

      etat.configuree ? React.createElement('details', { style: { marginTop: 10, fontSize: 12.5, color: C.ink2 } },
        React.createElement('summary', { style: { cursor: 'pointer', color: COL, fontWeight: 700 } }, 'Tu as déjà installé « Envoyer ma nuit » ? Mettre à jour (version 5, avec l’oxygène)'),
        React.createElement('div', { style: { ...bloc, marginTop: 8 } },
          React.createElement(Liste, { items: [
            'La version 5 envoie la nuit d’abord, puis FC au repos, VFC, respiration, oxygène sanguin et minutes d’exercice. Si ta clé s’affiche à l’étape 1 (« gardée sur cet appareil »), touche « Copier » ; sinon, il en faut une nouvelle.',
            'Sur la montre, l’oxygène doit être mesuré : app Watch de l’iPhone › Oxygène sanguin › active les mesures, y compris en arrière-plan pendant le sommeil.',
            'Pas de clé affichée à l’étape 1 : touche « Remplacer ma clé », puis « Oui, remplacer ma clé ». La nouvelle clé est copiée (et gardée sur cet appareil pour la prochaine fois).',
            'Étape 2 : installe le raccourci. Si Raccourcis propose « Remplacer » ou « Garder les deux », choisis « Remplacer ». Colle la clé.',
            'Étape 3 : lance-le une fois et touche « Tout activer » sur l’écran Santé (la nouvelle mesure, « Saturation en oxygène », y apparaît).',
            'Vérifie l’automatisation : app Raccourcis › onglet « Automatisation » › touche ton automatisation du réveil. Elle doit lancer « Envoyer ma nuit » ; sinon, touche l’action et choisis-le à nouveau.',
          ] }))) : null,

      titre('Étape 1 · Créer ta clé (ici)'),
      React.createElement('div', { style: bloc },
        cle ? React.createElement(React.Fragment, null,
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: C.success, marginBottom: 4 } }, '✓ Clé créée et copiée'),
          React.createElement(AvecCopie, { lab: 'Ta clé (affichée une seule fois)', valeur: cle, quoi: 'Clé' }),
          React.createElement('div', { style: { fontSize: 12, color: C.ink3, lineHeight: 1.45 } }, 'Elle est dans le presse-papiers. Ne copie rien d’autre avant la fin de l’étape 2. Si le message « Clé copiée » n’est pas apparu, touche « Copier ». Ne la partage pas.'))
          : etat.configuree && lireCleLocale(userId) ? React.createElement('div', null,
            React.createElement(AvecCopie, { lab: 'Ta clé (gardée sur cet appareil)', valeur: lireCleLocale(userId), quoi: 'Clé' }),
            React.createElement('div', { style: { fontSize: 12, color: C.ink3, lineHeight: 1.45, marginBottom: 8 } }, 'Touche « Copier » pour réinstaller ou mettre à jour le raccourci avec la même clé. Ne la partage pas.'),
            bouton(confirme === 'remplacer' ? 'Oui, remplacer ma clé' : 'Remplacer ma clé', creer),
            confirme === 'remplacer' ? React.createElement('div', { style: { fontSize: 12, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'L’ancienne clé cessera aussitôt de marcher. ', React.createElement('button', { type: 'button', onClick: () => setConfirme(null), style: { background: 'none', border: 'none', padding: 0, color: COL, fontWeight: 700, cursor: 'pointer', fontSize: 12 } }, 'Annuler')) : null)
          : React.createElement('div', null,
            React.createElement(Liste, { items: [
              'Touche « ' + (etat.configuree ? 'Remplacer ma clé' : 'Créer ma clé') + ' » ci-dessous.',
              'Le message « Clé copiée » s’affiche en bas de l’écran : ta clé est dans le presse-papiers.',
            ] }),
            React.createElement('div', { style: { marginTop: 10 } }, bouton(confirme === 'remplacer' ? 'Oui, remplacer ma clé' : etat.configuree ? 'Remplacer ma clé' : 'Créer ma clé', creer, !etat.configuree)),
            etat.configuree ? React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Tu as déjà une clé. En créer une nouvelle désactive l’ancienne : il faudra refaire l’étape 2.') : null,
            confirme === 'remplacer' ? React.createElement('div', { style: { fontSize: 12, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'L’ancienne clé cessera aussitôt de marcher. ', React.createElement('button', { type: 'button', onClick: () => setConfirme(null), style: { background: 'none', border: 'none', padding: 0, color: COL, fontWeight: 700, cursor: 'pointer', fontSize: 12 } }, 'Annuler')) : null)),

      titre('Étape 2 · Installer le raccourci'),
      React.createElement('div', { style: bloc },
        React.createElement('a', { href: RACCOURCI, target: '_blank', rel: 'noopener', style: { display: 'block', textAlign: 'center', padding: '11px 14px', background: COL, color: 'var(--c-on-fill)', fontFamily: C.display, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', textDecoration: 'none' } }, 'Installer le raccourci'),
        React.createElement(Liste, { items: [
          'Touche « Installer le raccourci » ci-dessus.',
          'Safari demande s’il faut télécharger « Envoyer ma nuit.shortcut » : touche « Télécharger ».',
          'Touche l’icône des téléchargements (un cercle avec une flèche ↓) dans la barre d’adresse de Safari, puis « Envoyer ma nuit ». Si tu ne la vois pas : app Fichiers › Téléchargements › « Envoyer ma nuit ».',
          'L’app Raccourcis (celle d’Apple, déjà sur l’iPhone) s’ouvre sur « Envoyer ma nuit ». Touche « Ajouter le raccourci » (ou « Configurer le raccourci »).',
          'À la question « Colle ta clé… », touche le champ, efface le texte déjà présent, touche à nouveau puis « Coller ». La clé fait une seule ligne d’une quarantaine de caractères.',
          'Touche « Ajouter le raccourci ». Il apparaît dans l’onglet « Raccourcis ».',
        ] })),

      titre('Étape 3 · Le lancer une fois'),
      React.createElement('div', { style: bloc },
        React.createElement(Liste, { items: [
          'Dans l’app Raccourcis, onglet « Raccourcis » en bas, touche la tuile « Envoyer ma nuit ».',
          'Écran « Accès à Santé » : touche « Tout activer » (Sommeil, Fréquence cardiaque au repos, Variabilité de la fréquence cardiaque, Fréquence respiratoire, Saturation en oxygène, Minutes d’exercice), puis « Autoriser ». Il peut s’afficher deux fois : une pour la nuit, une pour les autres mesures.',
          'Message « Autoriser “Envoyer ma nuit” à envoyer des éléments à ' + HOTE + ' ? » : touche « Toujours autoriser ».',
          'Si l’iPhone demande d’autoriser les notifications de Raccourcis : « Autoriser ».',
          'Une notification « Renfo » s’affiche et se termine par « Données envoyées : nuit. » (les autres mesures partent juste après, sans notification). Si elle dit autre chose, suis ce qu’elle indique (voir aussi « Ça ne marche pas ? » plus bas).',
          'Reviens sur ce site et recharge la page : en haut, « Dernier dépôt » indique l’heure de l’envoi. Touche « Relever maintenant » pour voir ta nuit dans Sommeil.',
        ] })),

      titre('Étape 4 · Chaque matin, tout seul'),
      React.createElement('div', { style: bloc },
        React.createElement(Liste, { items: [
          'Dans l’app Raccourcis, onglet « Automatisation » en bas.',
          'Touche « + » en haut à droite (ou « Nouvelle automatisation »).',
          'Choisis « Réveil ». Garde « Est arrêté » et « N’importe quel réveil » (ou choisis ton réveil du matin).',
          'Coche « Exécuter immédiatement » (pas « Exécuter après confirmation »), puis touche « Suivant ».',
          'Choisis « Envoyer ma nuit ». C’est fini : chaque matin, quand tu arrêtes ton réveil, ta nuit et tes signaux partent vers Renfo, et une notification le confirme.',
        ] }),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 8, lineHeight: 1.45 } }, 'Pas de réveil ? Choisis plutôt « Heure de la journée », 8:00, « Quotidiennement ».'),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Tu ne vois pas « Réveil » ni « Heure de la journée » ? Fais défiler la liste, ou tape « heure » dans la barre de recherche en haut de la liste. Sur iOS 16 : « Créer une automatisation personnelle » d’abord. Toujours rien : utilise le bouton « Envoyer maintenant depuis la montre » en haut de cet écran, il marche sans automatisation.')),

      titre('Tes rappels dans ces notifications'),
      React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink2, lineHeight: 1.55 } },
        React.createElement('div', { style: { marginBottom: 6 } }, 'Chaque envoi rapporte aussi le rappel du moment, préparé par ce site à chaque fois que tu l’ouvres :'),
        React.createElement(Liste, { items: [
          'Au réveil : ta forme du jour, calculée sur la nuit qui vient d’arriver (« Forme du jour : 64/100. Forme correcte : séance normale. »).',
          'À 13 h : ta séance prévue avec ta forme (« Séance du jour : Course à pied à 18:30, 1 h. Forme 64 : séance normale. »), et l’eau bue face à ta cible (« Eau : 0,8 L sur 2,5 L. Il reste 1,7 L. »).',
          'À 20 h : l’heure du coucher conseillée (« Ce soir : au lit vers 22:30 pour dormir 8 h. »).',
        ] }),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Ouvre ce site au moins une fois par jour : c’est là que les rappels du lendemain se préparent. Chaque rappel n’arrive qu’une fois. Ton eau est lue au moment de l’envoi : note ce que tu bois dans Renfo › Santé › Hydratation.')),

      titre('Étape 5 · Plusieurs envois par jour (conseillé)'),
      React.createElement('div', { style: bloc },
        React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginBottom: 4 } },
          'Le matin, la montre n’a parfois pas fini de verser ta nuit dans Santé, et ta FC au repos se calcule au fil de la journée. Deux envois de plus la complètent. Chaque envoi reprend les dernières 24 h : rien n’est compté deux fois, et ce que tu as corrigé à la main n’est jamais remplacé.'),
        React.createElement(Liste, { items: [
          'App Raccourcis › onglet « Automatisation » › « + » en haut à droite.',
          'Choisis « Heure de la journée ».',
          'Touche l’heure et règle 13:00. Sous « Répéter », garde « Quotidiennement ».',
          'Coche « Exécuter immédiatement », puis touche « Suivant ».',
          'Choisis « Envoyer ma nuit ».',
          'Recommence les points 1 à 5 avec 20:00.',
        ] }),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 8, lineHeight: 1.45 } }, 'Chaque envoi affiche une notification « Renfo », sans son. Ce site range aussi ce qui est arrivé à chaque ouverture (au plus toutes les 10 minutes), ou quand tu touches « Relever maintenant ».')),

      React.createElement('details', { style: { marginTop: 14, fontSize: 12.5, color: C.ink2 } },
        React.createElement('summary', { style: { cursor: 'pointer', color: COL, fontWeight: 700 } }, 'Ça ne marche pas ?'),
        React.createElement('div', { style: { ...bloc, marginTop: 8 } },
          React.createElement(Liste, { items: [
            'Notification « clé refusée » ou « clé absente » : refais l’étape 1 (« Remplacer ma clé »), supprime « Envoyer ma nuit » dans Raccourcis (appui long › Supprimer), puis refais l’étape 2.',
            'Notification « aucune donnée trouvée » ou « aucune nuit trouvée » : ta montre n’a rien enregistré sur les dernières 24 h. Vérifie dans l’app Santé › Sommeil, porte la montre la nuit (suivi du sommeil activé), puis relance le raccourci.',
            'Notification « Le serveur de Renfo n’a pas pu recevoir ta nuit » : le serveur n’est pas encore à jour (migrations 0005 à 0010 dans Supabase, à appliquer par l’administrateur). Un message en anglais vient d’une ancienne version du raccourci : réinstalle-le (étape 2).',
            'Aucune notification : Réglages › Notifications › Raccourcis › active « Autoriser les notifications ». L’envoi a peut-être quand même eu lieu : recharge cette page.',
            'Santé refusé par erreur, ou une mesure manque : Réglages › Santé › Accès aux données et appareils › Raccourcis › active Sommeil, Fréquence cardiaque au repos, Variabilité de la fréquence cardiaque, Fréquence respiratoire, Saturation en oxygène et Minutes d’exercice.',
            'Pas d’oxygène dans Santé › Cœur : vérifie que la montre le mesure (app Watch de l’iPhone › Oxygène sanguin › mesures activées, y compris en arrière-plan pendant le sommeil) et que tu as bien la version 5 du raccourci. Les mesures arrivent avec l’envoi du matin.',
            'Le téléchargement rouvre ce site au lieu du fichier : recharge la page une fois, puis réessaie l’étape 2.',
          ] }))),

      // Le chemin d'avant, pour qui veut aussi la FC au repos et la VFC, ou
      // si l'installation ne passe pas.
      React.createElement('details', { style: { marginTop: 14, fontSize: 12.5, color: C.ink2 } },
        React.createElement('summary', { style: { cursor: 'pointer', color: COL, fontWeight: 700 } }, 'Construire le raccourci à la main (avec FC et VFC)'),
        React.createElement('div', { style: { ...bloc, marginTop: 8 } },
          React.createElement(AvecCopie, { lab: 'Adresse (URL)', valeur: URL_DEPOT, quoi: 'Adresse' }),
          React.createElement(AvecCopie, { lab: 'En-tête apikey (clé publique de l’app)', valeur: CLE_PUBLIQUE, quoi: 'En-tête' }),
          React.createElement('ol', { style: { margin: '10px 0 0', paddingLeft: 20, fontSize: 12.5, color: C.ink2, lineHeight: 1.55 } },
            ETAPES_RACCOURCI.map(([texte, code, note], i) => React.createElement('li', { key: i, style: { marginBottom: 8 } }, texte,
              code ? React.createElement('code', { style: { display: 'block', fontFamily: C.mono, fontSize: 11.5, margin: '4px 0', padding: '5px 7px', background: C.surface2, border: `1px solid ${C.line}`, color: C.ink } }, code) : null,
              note ? React.createElement('span', { style: { display: 'block', fontSize: 11.5, color: C.ink3 } }, note) : null))))),

      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, color: C.ink3, lineHeight: 1.45, marginTop: 14 } },
        React.createElement(Icon, { name: 'shield', size: 14, color: C.ink3 }),
        'Les mesures passent par ton compte Renfo, chiffrées en transit. La boîte de dépôt est vidée à chaque relevé, et rien n’y reste plus de 30 jours.')))
}
