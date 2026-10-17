// ============================================================
// Espace « Cœur » : la fréquence cardiaque, de la récupération du matin
// aux zones d'entraînement. Les calculs vivent dans coeurIntel.js.
// ============================================================
import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, FlowSpace, isoToday, Aide } from './kit'
import { annoncer } from '../../annonces'
import { serie, tendanceRepos, zoneVfc, oxygene, temperature, vo2Montre, niveauVo2, recuperation, fcMarche, fcMax, zonesKarvonen, vo2Estime, vo2Test, seancesFc, bilanCoeur, NOM_SOURCE, NOM_SOURCE_MAX } from './coeurIntel'

const COL = MODULE_TINTS.coeur
const fr = (x) => String(x).replace('.', ',')
const titre = (t, aide) => React.createElement('div', { style: { fontFamily: C.display, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink2, margin: '20px 0 8px', paddingBottom: 4, borderBottom: `1px solid ${C.line}` } }, t, aide ? React.createElement(Aide, { terme: aide }) : null)
const bloc = { padding: '12px 14px', background: C.surface, border: `1px solid ${C.line}` }
const COULEUR = { bonne: C.success, surveiller: C.warn, incomplete: C.danger }

function Mesure({ lab, valeur, unite, sous, couleur, aide }) {
  return React.createElement('div', { style: { flex: 1, minWidth: 0, padding: '10px 10px 9px', border: `1px solid ${C.line}`, borderTop: `3px solid ${couleur || C.line}`, background: C.surface } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, lineHeight: 1.2 } }, lab, aide ? React.createElement(Aide, { terme: aide }) : null),
    React.createElement('div', { style: { fontFamily: C.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 4, lineHeight: 1 } }, valeur == null ? '—' : fr(valeur), valeur == null ? null : React.createElement('span', { style: { fontSize: 11, color: C.ink3, marginLeft: 3 } }, unite)),
    React.createElement('div', { style: { fontSize: 10.5, color: C.ink3, marginTop: 4, lineHeight: 1.3 } }, sous || ' '))
}

// Courbe sur `jours` jours : points reliés, normale en pointillé, deux
// bornes de zone en tirets si fournies, et des jours marqués en orange.
function Courbe({ points, jours, normale, bas, haut, unite, marques }) {
  if (!points || points.length < 2) return React.createElement('div', { style: { fontSize: 12, color: C.ink3, padding: '6px 0' } }, 'Pas encore assez de mesures pour une courbe.')
  const W = 300, H = 70
  const vals = points.map((p) => p.v).concat([normale, bas, haut].filter((x) => x != null))
  const lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2
  const y = (v) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8)
  const x = (k) => ((jours - 1 - k) / (jours - 1)) * W
  const ligne = (v, tirets, key) => React.createElement('line', { key, x1: 0, x2: W, y1: y(v), y2: y(v), style: { stroke: C.ink3, strokeWidth: 1, strokeDasharray: tirets } })
  return React.createElement('svg', { width: '100%', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Courbe sur ' + jours + ' jours, en ' + unite, style: { display: 'block', margin: '6px 0' } },
    normale != null ? ligne(normale, '3 3', 'n') : null,
    bas != null ? ligne(bas, '1 4', 'b') : null,
    haut != null ? ligne(haut, '1 4', 'h') : null,
    React.createElement('polyline', { points: points.map((p) => x(p.k) + ',' + y(p.v)).join(' '), style: { fill: 'none', stroke: COL, strokeWidth: 1.5 } }),
    (marques || []).map((k) => { const p = points.find((q) => q.k === k); return p ? React.createElement('rect', { key: 'm' + k, x: x(k) - 2.5, y: y(p.v) - 2.5, width: 5, height: 5, style: { fill: C.warn } }) : null }),
    (() => { const d = points[points.length - 1]; return React.createElement('rect', { x: x(d.k) - 3, y: y(d.v) - 3, width: 6, height: 6, style: { fill: COL } }) })())
}

function Champ({ lab, valeur, unite, placeholder, onValider, aide, min, max }) {
  const [v, setV] = useState(valeur != null ? String(valeur) : '')
  const n = Number(v)
  const ok = /^\d{2,3}$/.test(v) && n >= min && n <= max
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.line}` } },
    React.createElement('span', { style: { flex: 1, fontSize: 13, fontWeight: 600, color: C.ink2 } }, lab, aide ? React.createElement(Aide, { terme: aide }) : null),
    React.createElement('input', { type: 'text', inputMode: 'numeric', maxLength: 3, value: v, placeholder: placeholder || '—', 'aria-label': lab, onChange: (e) => setV(e.target.value.replace(/\D/g, '').slice(0, 3)), style: { width: 58, fontFamily: C.mono, fontSize: 16, fontWeight: 600, textAlign: 'center', padding: '5px 4px', color: C.ink } }),
    React.createElement('span', { style: { fontFamily: C.mono, fontSize: 11, color: C.ink3, width: 30 } }, unite),
    React.createElement('button', { type: 'button', disabled: !ok, onClick: () => onValider(n), style: { padding: '6px 10px', border: `1.5px solid ${ok ? COL : C.line}`, background: C.surface, color: ok ? COL : C.ink3, fontSize: 12.5, fontWeight: 700, cursor: ok ? 'pointer' : 'default' } }, 'OK'))
}

export default function CoeurSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  if (loading) return React.createElement(FlowSpace, { bg: 'sante', title: 'Cœur', onClose, tint: COL }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  const iso = isoToday()
  const t = tendanceRepos(db, iso)
  const v = zoneVfc(db, iso)
  const o2 = oxygene(db, iso)
  const tp = temperature(db, iso)
  const rc = recuperation(db, iso)
  const fm = fcMarche(db, iso)
  const vMontre = vo2Montre(db, iso)
  const resp = serie(db, iso, 'resp', 30)
  const b = bilanCoeur(db, iso)
  const max = fcMax(db, iso)
  const repos = t && (t.m30 != null ? t.m30 : t.derniere && t.derniere.v)
  const zones = max && repos ? zonesKarvonen(max.valeur, repos) : null
  const vo2 = max && repos ? vo2Estime(max.valeur, repos) : null
  const cooper = vo2Test(db)
  const seances = seancesFc(db, iso, 8, zones, max && max.valeur)
  const p = db.profilePhys || {}
  const poulsJour = ((db.sleepLog || {})[iso] || {}).pouls
  const o2Jour = ((db.sleepLog || {})[iso] || {}).spo2

  const enregistrerPouls = (n) => {
    store.set((sx) => { const log = (sx && sx.sleepLog) || {}; return { sleepLog: { ...log, [iso]: { ...(log[iso] || {}), pouls: n } } } })
    annoncer('Pouls au réveil enregistré : ' + n + ' bpm')
  }
  const enregistrerO2 = (n) => {
    store.set((sx) => { const log = (sx && sx.sleepLog) || {}; return { sleepLog: { ...log, [iso]: { ...(log[iso] || {}), spo2: n } } } })
    annoncer('Oxygène enregistré : ' + n + ' %')
  }
  const enregistrerProfil = (cle, n, msg) => {
    store.set((sx) => ({ profilePhys: { ...((sx && sx.profilePhys) || {}), [cle]: n } }))
    annoncer(msg)
  }
  const dernier = (l) => (l && l.length ? l[l.length - 1] : null)
  const rDer = dernier(resp)

  return React.createElement(FlowSpace, { bg: 'sante', title: 'Cœur', onClose, tint: COL },
    React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.55 } }, 'Ta fréquence cardiaque et ton oxygène sanguin, de la récupération du matin aux zones d’entraînement. Les mesures viennent de ta montre (Profil › Apple Watch) ou de ce que tu saisis ici.'),

    // ── Bilan du jour ──
    titre('Aujourd’hui'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
      React.createElement(Mesure, { lab: t ? (t.source === 'sante' ? 'FC au repos' : 'Pouls au réveil') : 'FC au repos', aide: 'pouls', valeur: t && t.derniere ? t.derniere.v : null, unite: 'bpm', couleur: t && t.derniere && t.m30 != null && t.derniere.v - t.m30 >= 7 ? C.warn : COL, sous: t && t.m30 != null ? 'normale ' + fr(t.m30) : t ? 'normale après 7 mesures' : 'aucune mesure' }),
      React.createElement(Mesure, { lab: 'VFC (7 j)', aide: 'vfc', valeur: v && v.m7 != null ? v.m7 : (v && v.points.length ? dernier(v.points).v : null), unite: 'ms', couleur: v && v.statut === 'sous' ? C.warn : COL, sous: v && v.bas != null ? 'zone ' + fr(v.bas) + '–' + fr(v.haut) : v ? 'zone après 10 mesures' : 'aucune mesure' }),
      React.createElement(Mesure, { lab: 'Respiration', aide: 'respiration', valeur: rDer ? rDer.v : null, unite: '/min', couleur: COL, sous: rDer ? (rDer.k === 0 ? 'cette nuit' : 'il y a ' + rDer.k + ' j') : 'aucune mesure' }),
      React.createElement(Mesure, { lab: o2 && o2.source === 'saisie' ? 'Oxygène (saisi)' : 'Oxygène la nuit', aide: 'spo2', valeur: o2 ? o2.derniere.v : null, unite: '%', couleur: o2 && o2.statut !== 'normal' ? C.warn : COL, sous: o2 ? (o2.normale != null ? 'normale ' + fr(o2.normale) : o2.derniere.k === 0 ? 'cette nuit' : 'il y a ' + o2.derniere.k + ' j') : 'aucune mesure' }),
      React.createElement(Mesure, { lab: 'Température nuit', aide: 'tempPoignet', valeur: tp && tp.ecart != null ? (tp.ecart > 0 ? '+' : '') + fr(tp.ecart) : tp ? tp.derniere.v : null, unite: '°C', couleur: tp && tp.statut !== 'normal' && tp.statut !== 'basse' ? C.warn : COL, sous: tp ? (tp.ecart != null ? 'écart à ta normale' : 'normale après 5 nuits') : 'aucune mesure' }),
      React.createElement(Mesure, { lab: 'Récup. 1 min', aide: 'recupFc', valeur: rc ? Math.round(rc.derniere.v) : null, unite: 'bpm', couleur: rc && rc.lente ? C.warn : COL, sous: rc ? (rc.derniere.k === 0 ? 'aujourd’hui' : 'il y a ' + rc.derniere.k + ' j') + (rc.normale != null ? ' · normale ' + rc.normale : '') : 'après une séance' })),
    b.verdict ? React.createElement('div', { style: { ...bloc, marginTop: 8, borderLeft: `3px solid ${COULEUR[b.niveau] || C.line}` } },
      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: COULEUR[b.niveau] || C.ink } }, b.verdict),
      b.alertes.map((a, i) => React.createElement('div', { key: i, style: { fontSize: 12, color: C.ink2, marginTop: 4, lineHeight: 1.45 } }, '• ' + a))) : null,

    // ── Saisie directe ──
    titre('Saisir'),
    React.createElement('div', { style: { ...bloc, paddingTop: 2, paddingBottom: 2 } },
      React.createElement(Champ, { key: 'p' + (poulsJour || ''), lab: 'Pouls au réveil, aujourd’hui', aide: 'pouls', valeur: poulsJour, unite: 'bpm', min: 30, max: 120, onValider: enregistrerPouls }),
      React.createElement(Champ, { key: 'm' + (p.fcMax || ''), lab: 'FC max (si tu la connais)', valeur: p.fcMax, unite: 'bpm', placeholder: max ? String(max.valeur) : '—', min: 130, max: 230, onValider: (n) => enregistrerProfil('fcMax', n, 'FC max enregistrée : ' + n + ' bpm') }),
      React.createElement(Champ, { key: 'o' + (o2Jour || ''), lab: 'Oxygène, mesure ponctuelle', aide: 'spo2', valeur: o2Jour, unite: '%', min: 70, max: 100, onValider: enregistrerO2 }),
      !(Number(p.age) > 0) ? React.createElement(Champ, { key: 'age', lab: 'Ton âge (pour estimer la FC max)', unite: 'ans', min: 10, max: 99, onValider: (n) => enregistrerProfil('age', n, 'Âge enregistré') }) : null),
    React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Pouls au réveil : une minute au poignet, encore allongé, avant de te lever. Oxygène : app Oxygène sanguin de la montre, assis, bras posé, 15 secondes sans bouger. FC max : la plus haute vue en fin d’effort très dur, ou celle d’un test.'),

    // ── FC au repos ──
    titre('FC au repos (3 mois)', 'pouls'),
    t ? React.createElement('div', { style: bloc },
      React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, 'Source : ' + NOM_SOURCE[t.source] + ' · ' + t.points.length + ' mesures'),
      React.createElement(Courbe, { points: t.points, jours: 90, normale: t.m30, unite: 'bpm' }),
      React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } },
        (t.m7 != null ? `Semaine : ${fr(t.m7)} bpm` : '') + (t.m30 != null ? ` · mois : ${fr(t.m30)} bpm` : '') + (t.pente != null ? ` · ${t.pente > 0 ? '+' : ''}${fr(t.pente)} bpm/mois` : '')),
      t.texte ? React.createElement('div', { style: { fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 6 } }, t.texte) : null,
      fm ? React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 6 } }, `FC à la marche : ${fm.m30 != null ? fm.m30 + ' bpm sur 30 jours' : Math.round(fm.derniere.v) + ' bpm'}` + (fm.evolution != null ? ` (${fm.evolution > 0 ? '+' : ''}${fr(fm.evolution)} en deux mois${fm.evolution <= -2 ? ' : ton endurance progresse' : ''})` : '') + '.', React.createElement(Aide, { terme: 'fcMarche' })) : null,
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6 } }, 'Pointillé : ta moyenne du mois. La tendance apparaît après 15 mesures étalées sur un mois.'))
      : React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink3 } }, 'Aucune mesure encore : relie ta montre (Profil › Apple Watch) ou saisis ton pouls au réveil ci-dessus.'),

    // ── VFC ──
    titre('Variabilité cardiaque (30 jours)', 'vfc'),
    v ? React.createElement('div', { style: bloc },
      React.createElement(Courbe, { points: v.points, jours: 30, normale: v.normale, bas: v.bas, haut: v.haut, unite: 'ms' }),
      React.createElement('div', { style: { fontSize: 12.5, color: v.statut === 'sous' ? C.warn : C.ink, lineHeight: 1.5 } }, v.texte || `Ta zone habituelle se dessine après 10 mesures (${v.mesures} pour l’instant).`),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6 } }, 'Pointillé : ta moyenne ; tirets : ta zone habituelle. La VFC varie beaucoup d’un jour à l’autre : regarde la semaine.'))
      : React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink3 } }, 'Mesurée par la montre pendant la nuit : elle arrive avec le raccourci « Envoyer ma nuit ».'),

    // ── Oxygène sanguin ──
    titre(o2 && o2.source === 'saisie' ? 'Oxygène sanguin (30 jours)' : 'Oxygène sanguin (30 nuits)', 'spo2'),
    o2 ? React.createElement('div', { style: bloc },
      React.createElement(Courbe, { points: o2.points, jours: 30, normale: o2.normale, unite: '%', marques: o2.marques }),
      o2.source === 'montre' ? React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } },
        (o2.derniere.k === 0 ? 'Cette nuit' : o2.derniere.k === 1 ? 'La nuit d’avant' : 'Dernière nuit mesurée') + ` : moyenne ${fr(o2.derniere.v)} %`
          + (o2.derniere.min != null ? `, plus basse ${fr(o2.derniere.min)} %` : '')
          + `, ${o2.derniere.bas || 0} mesure${o2.derniere.bas > 1 ? 's' : ''} sous 90 %`
          + (o2.derniere.n ? ` (${o2.derniere.n} mesure${o2.derniere.n > 1 ? 's' : ''})` : '') + '.'
          + (o2.m7 != null ? ` Semaine : ${fr(o2.m7)} %.` : '')) : null,
      React.createElement('div', { style: { fontSize: 12.5, color: o2.statut === 'normal' ? C.ink : C.warn, lineHeight: 1.5, marginTop: 6 } }, o2.texte),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, (o2.source === 'montre' ? 'Pointillé : ta moyenne ; carré orange : nuit avec des chutes. ' : '') + 'Mesurée au poignet : la montre peut se tromper de 2 points, et un bracelet desserré fait chuter la mesure. Ce n’est pas un examen médical.'))
      : React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink3, lineHeight: 1.5 } }, 'Aucune mesure encore. Sur l’iPhone : app Watch › Oxygène sanguin, active les mesures (et celles en arrière-plan pendant le sommeil). Puis mets à jour le raccourci « Envoyer ma nuit » (Profil › Apple Watch, version 5). Ou saisis une mesure ponctuelle ci-dessus.'),

    // ── Température au poignet ──
    tp ? React.createElement(React.Fragment, null,
      titre('Température la nuit (30 nuits)', 'tempPoignet'),
      React.createElement('div', { style: bloc },
        React.createElement(Courbe, { points: tp.points, jours: 30, normale: tp.normale, unite: '°C' }),
        React.createElement('div', { style: { fontSize: 12.5, color: tp.statut === 'fievre' || tp.statut === 'haute' ? C.warn : C.ink, lineHeight: 1.5 } }, tp.texte),
        React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Mesurée au poignet pendant le sommeil : seul l’écart à ta normale compte. Après l’ovulation, elle monte de 0,2 à 0,4 °C (voir Santé › Cycle).'))) : null,

    // ── Récupération après l'effort ──
    rc ? React.createElement(React.Fragment, null,
      titre('Récupération après l’effort', 'recupFc'),
      React.createElement('div', { style: bloc },
        React.createElement(Courbe, { points: rc.points, jours: 90, normale: rc.normale, unite: 'bpm' }),
        React.createElement('div', { style: { fontSize: 12.5, color: rc.lente ? C.warn : C.ink, lineHeight: 1.5 } }, rc.texte),
        React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Mesurée par la montre à la fin des séances enregistrées (app Exercice). Elle monte quand ton endurance progresse.'))) : null,

    // ── Zones ──
    titre('Tes zones d’entraînement', 'zonesFc'),
    zones ? React.createElement('div', { style: bloc },
      React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 6, lineHeight: 1.45 } }, `FC max ${max.valeur} bpm (${NOM_SOURCE_MAX[max.source]}) · FC au repos ${fr(repos)} bpm · méthode de Karvonen`),
      React.createElement('div', { className: 'liste' },
        zones.map((z) => React.createElement('div', { key: z.z, style: { display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0' } },
          React.createElement('span', { style: { fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: COL, width: 22 } }, 'Z' + z.z),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink } }, z.lab),
            React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, lineHeight: 1.35 } }, z.but)),
          React.createElement('span', { style: { fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.ink, flex: '0 0 auto' } }, z.min + '–' + z.max)))),
      max.source === 'age' ? React.createElement('div', { style: { fontSize: 11.5, color: C.warn, marginTop: 6, lineHeight: 1.45 } }, 'FC max estimée depuis l’âge (± 10 bpm selon les personnes)' + (max.vue ? `, ta plus haute en séance est ${max.vue} bpm` : '') + ' : saisis la tienne si tu la connais, tes zones seront plus justes.') : null,
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'La même FC max sert au calcul de charge de tes séances, et ta zone s’affiche quand tu notes ta FC moyenne dans le calendrier.'))
      : React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink3, lineHeight: 1.5 } }, !max ? 'Il faut ta FC max (ou ton âge) : saisis-la ci-dessus.' : 'Il faut ta FC au repos : relie ta montre ou saisis ton pouls au réveil quelques matins.'),

    // ── VO2max ──
    // Trois mesures possibles, de la plus juste à la plus indirecte : le
    // test de Cooper, la montre (forme cardio), l'estimation par la FC.
    cooper || vMontre || vo2 ? (() => {
      const lignes = [
        cooper ? { lab: 'Test de Cooper', court: 'test de Cooper', v: cooper.valeur, sous: `${cooper.distance} m en 12 min, le ${cooper.date.split('-').reverse().join('/')}` } : null,
        vMontre ? { lab: 'Montre (forme cardio)', court: 'montre (forme cardio)', v: vMontre.valeur, sous: `le ${vMontre.date.split('-').reverse().join('/')}` + (vMontre.evolution != null ? ` · ${vMontre.evolution > 0 ? '+' : ''}${fr(vMontre.evolution)} en deux mois` : '') } : null,
        vo2 ? { lab: 'Estimation par ta FC', court: 'estimation par ta FC', v: vo2, sous: 'FC max / FC au repos (Uth), ± 15 %' } : null,
      ].filter(Boolean)
      const ref = lignes[0]
      const niv = niveauVo2(ref.v, db)
      return React.createElement(React.Fragment, null,
        titre('VO2max', 'vo2max'),
        React.createElement('div', { style: bloc },
          React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
            React.createElement('span', { style: { fontFamily: C.mono, fontSize: 24, fontWeight: 600, color: COL } }, fr(ref.v)),
            React.createElement('span', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'ml/kg/min · ' + ref.court + (niv ? ` · niveau « ${niv} » pour ton âge` : ''))),
          lignes.length > 1 ? React.createElement('div', { className: 'liste', style: { marginTop: 6 } },
            lignes.map((l) => React.createElement('div', { key: l.lab, style: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0' } },
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: C.ink } }, l.lab),
                React.createElement('div', { style: { fontSize: 11, color: C.ink3 } }, l.sous)),
              React.createElement('span', { style: { fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.ink } }, fr(l.v))))) : React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4 } }, ref.sous),
          !cooper ? React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Le test de Cooper (Entraîner › Tests physiques) la mesure mieux. La montre l’estime pendant tes marches et courses en extérieur.') : null))
    })() : null,

    // ── Séances ──
    titre('FC de tes séances'),
    seances.length ? React.createElement('div', { className: 'liste', style: { ...bloc, paddingTop: 2, paddingBottom: 2 } },
      seances.map((s, i) => React.createElement('div', { key: s.date + i, style: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 0' } },
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.ink } }, s.sport + (s.mins ? ' · ' + s.mins + ' min' : '')),
          React.createElement('div', { style: { fontSize: 11.5, color: C.ink3 } }, s.date.split('-').reverse().slice(0, 2).join('/') + (s.pct ? ' · ' + s.pct + ' % de ta FC max' : ''))),
        React.createElement('span', { style: { fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.ink } }, s.fc + ' bpm'),
        s.zone != null ? React.createElement('span', { style: { fontFamily: C.mono, fontSize: 11.5, fontWeight: 700, color: COL, width: 26, textAlign: 'right' } }, s.zone ? 'Z' + s.zone : '<Z1') : null)))
      : React.createElement('div', { style: { ...bloc, fontSize: 12.5, color: C.ink3, lineHeight: 1.5 } }, 'Note la FC moyenne de tes séances (Calendrier › séance › « FC moy. ») : tu verras ici dans quelle zone tu t’entraînes vraiment.'))
}
