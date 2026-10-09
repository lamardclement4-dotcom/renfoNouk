import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SegTabs, isoToday, Aide } from './kit'
import { ENERGIES, SENSATIONS, libelleNuit, nuitsRecentes, nuitsManquantes, reveilDe, resumeReveil, resumeNuit, decaler } from './sommeilReveil'
import { annoncer } from '../../annonces'
import { FACTEURS, facteursDe, dureeDepuisHeures, libelleDuree, minutesDe, influences, regulariteHoraires, chronotype } from './sommeilForme'
import { formeDb, formeSemaine, coucherDuSoir, normaleDuPouls, formeEtSeances, respectCoucher } from './formeContexte'
import { sleepAnalysis, BASE_NEED } from './sleepIntel'
import { rolling7Mins } from '../train/renfoIntel'

const SLEEP_COL = MODULE_TINTS.sommeil

function toMin(t) { const a = (t || '').split(':'); return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0) }
function fmtMin(m) { m = ((m % 1440) + 1440) % 1440; const p = (n) => (n < 10 ? '0' + n : '' + n); return p(Math.floor(m / 60)) + ':' + p(m % 60) }
function durFromTimes(bt, wk) { let diff = toMin(wk) - toMin(bt); if (diff <= 0) diff += 24 * 60; return diff / 60 }

// ── Choix de la nuit : les 7 dernières, les oubliées signalées ──
// Une nuit oubliée se rattrape ici : on choisit la nuit, puis on la saisit
// comme celle de la veille. Au-delà d'une semaine, « Autre date ».
function ChoixNuit({ log, date, onChange, onExpress }) {
  const today = isoToday()
  const nuits = nuitsRecentes(log, today, 7)
  const manquantes = nuits.filter((n) => !n.renseignee)
  const dansLaSemaine = nuits.some((n) => n.iso === date)
  return React.createElement('div', { style: { marginBottom: 20 } },
    React.createElement('div', { role: 'radiogroup', 'aria-label': 'Nuit à saisir', style: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 } },
      nuits.map((n) => {
        const on = n.iso === date
        return React.createElement('button', {
          key: n.iso, role: 'radio', 'aria-checked': on, onClick: () => onChange(n.iso),
          'aria-label': libelleNuit(n.iso) + (n.renseignee ? ', renseignée' : ', non renseignée'),
          style: { flex: '0 0 auto', minWidth: 62, padding: '8px 9px 7px', border: `1.5px solid ${on ? SLEEP_COL : C.line}`, borderTop: `3px solid ${on ? SLEEP_COL : n.renseignee ? C.line : C.warn}`, background: on ? `color-mix(in srgb, ${SLEEP_COL} 10%, ${C.surface})` : C.surface, color: C.ink, cursor: 'pointer', textAlign: 'left' },
        },
          React.createElement('div', { style: { fontFamily: C.display, fontSize: 14.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1, whiteSpace: 'nowrap' } }, n.titre),
          React.createElement('div', { style: { fontFamily: C.mono, fontSize: 9.5, marginTop: 4, color: n.renseignee ? C.ink3 : C.warn, textTransform: 'uppercase' } }, n.renseignee ? 'faite' : 'à remplir'))
      })),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 } },
      React.createElement('div', { style: { fontSize: 13, color: C.ink2, fontWeight: 600 } }, libelleNuit(date)),
      React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.mono, fontSize: 10.5, textTransform: 'uppercase', color: dansLaSemaine ? C.ink3 : SLEEP_COL, cursor: 'pointer', flex: '0 0 auto' } },
        'Autre date',
        React.createElement('input', { type: 'date', value: date, min: decaler(today, -60), max: today, 'aria-label': 'Choisir une autre nuit (date du réveil)', onChange: (e) => { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today) onChange(v) }, style: { fontFamily: C.mono, fontSize: 12, padding: '4px 6px', width: 128 } }))),
    manquantes.length >= 2 && onExpress ? React.createElement('button', { onClick: onExpress, style: { width: '100%', marginTop: 10, padding: '9px 12px', textAlign: 'left', background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.warn}`, color: C.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
      'Rattraper les ' + manquantes.length + ' nuits oubliées d’un coup', React.createElement('span', { style: { float: 'right', fontFamily: C.mono, color: C.ink3 } }, '→')) : null)
}

// ── Forme du jour : ce que la nuit dit de la séance d'aujourd'hui ──
// La note, son verdict et la consigne de séance ; à la demande, le détail
// du calcul ligne par ligne. Dessous, les sept derniers jours et l'heure
// du coucher pour la nuit qui vient.
const COULEUR_FORME = { haute: C.success, bonne: C.primary, moyenne: C.warn, basse: C.danger }
const LETTRE_JOUR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const petitTitre = { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3 }
function LigneCalcul({ lab, texte, pts, max }) {
  const signe = max == null
  const couleur = !signe ? C.ink : pts < 0 ? C.warn : pts > 0 ? C.success : C.ink3
  return React.createElement('div', { style: { padding: '8px 0', borderBottom: `1px solid ${C.line}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 } },
      React.createElement('div', { style: { minWidth: 0 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink2 } }, lab),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 1 } }, texte)),
      React.createElement('div', { style: { fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: couleur, flex: '0 0 auto' } },
        signe ? (pts > 0 ? '+' + pts : pts < 0 ? '−' + -pts : '0') : pts + ' / ' + max)),
    !signe ? React.createElement('div', { 'aria-hidden': true, style: { height: 3, background: C.line, marginTop: 6 } },
      React.createElement('div', { style: { height: 3, width: Math.round(pts / max * 100) + '%', background: SLEEP_COL } })) : null)
}
export function CarteForme({ db }) {
  const [detail, setDetail] = useState(false)
  const iso = isoToday()
  const f = formeDb(db, iso)
  if (!f) return null
  const col = COULEUR_FORME[f.niveau] || C.ink
  const semaine = formeSemaine(db, iso, 7)
  const notees = semaine.filter((x) => x.score != null)
  const soir = coucherDuSoir(db, iso)
  return React.createElement('div', { style: { padding: '13px 14px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}`, borderTop: `3px solid ${col}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      React.createElement('div', { style: { flex: '0 0 auto', textAlign: 'center', minWidth: 58 } },
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 28, fontWeight: 600, letterSpacing: '-.04em', color: col, lineHeight: 1 } }, f.score),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 3 } }, '/ 100')),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontFamily: C.display, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink2 } }, 'Forme du jour', React.createElement(Aide, { terme: 'forme' })),
        React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: col, marginTop: 3, lineHeight: 1.35 } }, f.verdict))),
    React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 10, paddingLeft: 10, borderLeft: `3px solid ${col}` } }, f.consigne),
    React.createElement('button', { type: 'button', onClick: () => setDetail((v) => !v), 'aria-expanded': detail, style: { display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 10, padding: '7px 0', background: 'none', border: 'none', borderTop: `1px solid ${C.line}`, color: SLEEP_COL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } },
      'Détail du calcul', React.createElement('span', { 'aria-hidden': true, style: { fontFamily: C.mono } }, detail ? '−' : '+')),
    detail ? React.createElement('div', null,
      f.parts.map((p) => React.createElement(LigneCalcul, { key: p.id, ...p })),
      f.ajustements.map((p) => React.createElement(LigneCalcul, { key: p.id, lab: p.lab, texte: p.texte, pts: p.pts })),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0 2px', fontSize: 12.5, fontWeight: 700, color: C.ink } },
        'Total', React.createElement('span', { style: { fontFamily: C.mono, color: col } }, f.score + ' / 100')),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, lineHeight: 1.45, marginTop: 4 } }, 'Un élément non noté compte un peu sous la moyenne. La note ne descend pas sous 0.')) : null,
    notees.length >= 2 ? React.createElement('div', { style: { marginTop: 12 } },
      React.createElement('div', { style: { ...petitTitre, fontSize: 11.5, marginBottom: 6 } }, 'Sept derniers jours · moyenne ' + Math.round(notees.reduce((a, x) => a + x.score, 0) / notees.length)),
      React.createElement('div', { role: 'list', style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 } },
        semaine.map((x) => {
          const c = x.score != null ? COULEUR_FORME[x.niveau] : C.line
          return React.createElement('div', { key: x.iso, role: 'listitem', 'aria-label': libelleNuit(x.iso) + (x.score != null ? ' : forme ' + x.score : ' : non renseignée'), style: { textAlign: 'center', padding: '5px 0 4px', borderTop: `3px solid ${c}`, background: x.iso === isoToday() ? C.surface2 : 'transparent' } },
            React.createElement('div', { style: { fontFamily: C.mono, fontSize: 9.5, color: C.ink3 } }, LETTRE_JOUR[new Date(x.iso + 'T00:00:00Z').getUTCDay()]),
            React.createElement('div', { style: { fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: x.score != null ? C.ink : C.ink3, marginTop: 2 } }, x.score != null ? x.score : '—'))
        }))) : null,
    soir ? React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` } },
      React.createElement('div', { style: { flex: '0 0 auto' } },
        React.createElement('div', { style: { ...petitTitre, fontSize: 11.5 } }, 'Ce soir'),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 18, fontWeight: 600, color: SLEEP_COL, marginTop: 2 } }, soir.coucher)),
      React.createElement('div', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'Au lit à cette heure ' + soir.raison + '.')) : null)
}

// ── Rattrapage express : toutes les nuits oubliées sur un écran ──
// La durée suffit pour que la nuit compte (dette, régularité, forme) ;
// le détail se complète ensuite si on s'en souvient.
function RattrapageExpress({ db, store, onFini }) {
  const log = db.sleepLog || {}
  const manquantes = nuitsManquantes(log, isoToday(), 7)
  const connues = Object.keys(log).map((d) => Number(log[d] && log[d].hours)).filter((h) => h > 0)
  const habituelle = connues.length ? Math.round(connues.reduce((a, b) => a + b, 0) / connues.length * 4) / 4 : 7.5
  const [valeurs, setValeurs] = useState(() => Object.fromEntries(manquantes.map((m) => [m.iso, habituelle])))
  const regler = (iso, delta) => setValeurs((v) => ({ ...v, [iso]: v[iso] == null ? habituelle : Math.max(3, Math.min(13, Math.round((v[iso] + delta) * 4) / 4)) }))
  const passer = (iso) => setValeurs((v) => ({ ...v, [iso]: v[iso] == null ? habituelle : null }))
  const aEnregistrer = Object.entries(valeurs).filter(([, h]) => h != null)
  function enregistrer() {
    store.set((sx) => {
      const next = { ...((sx && sx.sleepLog) || {}) }
      for (const [iso, h] of aEnregistrer) next[iso] = { ...(next[iso] || {}), hours: h, savedAt: Date.now(), saisieRapide: true }
      return { sleepLog: next }
    })
    annoncer(aEnregistrer.length + ' nuit' + (aEnregistrer.length > 1 ? 's' : '') + ' rattrapée' + (aEnregistrer.length > 1 ? 's' : ''))
    onFini()
  }
  const bouton = (lab, aria, f) => React.createElement('button', { 'aria-label': aria, onClick: f, style: { width: 36, height: 36, border: `1.5px solid ${C.line}`, background: C.surface, color: SLEEP_COL, fontSize: 20, fontWeight: 800, cursor: 'pointer', lineHeight: 1 } }, lab)
  return React.createElement('div', null,
    React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.5, marginBottom: 14 } }, 'Règle la durée de chaque nuit oubliée (préréglée sur ta moyenne, ' + libelleDuree(habituelle) + '). « Passer » si tu ne t’en souviens plus.'),
    React.createElement('div', { className: 'liste', style: { background: C.surface, border: `1px solid ${C.line}`, padding: '0 12px' } },
      manquantes.map((m) => {
        const h = valeurs[m.iso]
        return React.createElement('div', { key: m.iso, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' } },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontFamily: C.display, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1 } }, m.titre),
            React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 3 } }, libelleNuit(m.iso))),
          h != null ? bouton('−', 'Moins un quart d’heure', () => regler(m.iso, -0.25)) : null,
          React.createElement('div', { style: { fontFamily: C.mono, fontSize: 15, fontWeight: 600, minWidth: 62, textAlign: 'center', color: h != null ? C.ink : C.ink3 } }, h != null ? libelleDuree(h) : 'passée'),
          h != null ? bouton('+', 'Plus un quart d’heure', () => regler(m.iso, 0.25)) : null,
          React.createElement('button', { onClick: () => passer(m.iso), style: { flex: '0 0 auto', padding: '6px 8px', background: 'transparent', border: 'none', color: C.ink3, fontFamily: C.mono, fontSize: 10.5, textTransform: 'uppercase', cursor: 'pointer' } }, h != null ? 'Passer' : 'Reprendre'))
      })),
    React.createElement('button', { onClick: enregistrer, disabled: !aEnregistrer.length, style: { width: '100%', marginTop: 16, padding: 14, border: 'none', background: aEnregistrer.length ? SLEEP_COL : C.surface2, color: aEnregistrer.length ? 'var(--c-on-fill)' : C.ink3, fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', cursor: aEnregistrer.length ? 'pointer' : 'default' } }, 'Enregistrer ' + aEnregistrer.length + ' nuit' + (aEnregistrer.length > 1 ? 's' : '')),
    React.createElement('button', { onClick: onFini, style: { width: '100%', marginTop: 8, padding: 11, background: 'transparent', border: 'none', color: C.ink2, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' } }, 'Annuler'))
}

// ── Saisie d'une nuit : assistant en 5 étapes ──
function NightTab({ db, store, date, onDone }) {
  const log = db.sleepLog || {}
  const existing = log[date] || {}
  const dejaRenseignee = Number(existing.hours) > 0
  const rv = reveilDe(existing)
  // Heures de coucher et de lever : celles de la nuit si elle en a, sinon
  // celles de la routine, sinon celles de la dernière nuit qui en avait.
  const derniere = Object.keys(log).filter((d) => d < date && log[d] && log[d].coucher && log[d].lever).sort().pop()
  const rt = db.sleepRoutine && db.sleepRoutine.enabled ? db.sleepRoutine : null
  const [mode, setMode] = useState(existing.coucher && existing.lever ? 'heures' : 'duree')
  const [coucher, setCoucher] = useState(existing.coucher || (rt && rt.bedtime) || (derniere && log[derniere].coucher) || '23:00')
  const [lever, setLever] = useState(existing.lever || (rt && rt.wake) || (derniere && log[derniere].lever) || '07:00')
  const [endormissement, setEndormissement] = useState(Number(existing.endormissement) >= 0 && existing.endormissement != null ? Number(existing.endormissement) : 15)
  const [facteurs, setFacteurs] = useState(facteursDe(existing))
  const [dureeSaisie, setHours] = useState(Number(existing.hours) > 0 ? Number(existing.hours) : 7.5)
  const dureeHeures = dureeDepuisHeures(coucher, lever, endormissement)
  const hours = mode === 'heures' && dureeHeures ? dureeHeures : dureeSaisie
  const [awakenings, setAwakenings] = useState(existing.awakenings || 0)
  const [quality, setQuality] = useState(existing.quality || 0)
  const [energie, setEnergie] = useState(rv.energie)
  const [sensations, setSensations] = useState(rv.sensations)
  const [pouls, setPouls] = useState(Number(existing.pouls) >= 30 && Number(existing.pouls) <= 120 ? String(existing.pouls) : '')
  const poulsValide = /^\d{2,3}$/.test(pouls) && Number(pouls) >= 30 && Number(pouls) <= 120 ? Number(pouls) : null
  const normalePouls = normaleDuPouls({ sleepLog: log }, date).normale
  const [step, setStep] = useState(0)

  const hLabel = libelleDuree(hours)
  const STEPS = ['Durée', 'Réveils', 'Qualité', 'Au réveil', 'La veille']

  function saveNight() {
    const cur = db.sleepLog || {}
    const rt = db.sleepRoutine || null
    // Les autres champs d'une nuit (source d'import, routine du moment…)
    // sont gardés : on complète la nuit, on ne la remplace pas.
    store.set({ sleepLog: { ...cur, [date]: { ...(cur[date] || {}), hours, quality: quality || null, awakenings: awakenings || 0,
      reveil: { energie: energie || null, sensations }, facteurs, pouls: poulsValide,
      // Les heures ne sont gardées que si elles ont servi : une durée saisie
      // à la main ne doit pas cohabiter avec des heures qui la contredisent.
      coucher: mode === 'heures' ? coucher : null, lever: mode === 'heures' ? lever : null, endormissement: mode === 'heures' ? endormissement : null,
      routineBed: rt && rt.enabled ? rt.bedtime : null, routineWake: rt && rt.enabled ? rt.wake : null, savedAt: Date.now() } } })
    // La nuit du jour donne la forme du jour : on la dit tout de suite.
    const forme = date === isoToday() ? formeDb(db, date, { ...cur, [date]: { hours, quality: quality || null, reveil: { energie: energie || null, sensations }, pouls: poulsValide } }) : null
    annoncer(forme ? `Nuit enregistrée · forme du jour ${forme.score}/100 · ${forme.verdict.split(' :')[0].toLowerCase()}` : libelleNuit(date) + ' enregistrée')
    onDone()
  }
  function supprimerNuit() {
    store.annulable(libelleNuit(date) + ' supprimée', () => store.set((sx) => {
      const next = { ...((sx && sx.sleepLog) || {}) }
      delete next[date]
      return { sleepLog: next }
    }))
    onDone()
  }
  const basculer = (id) => setSensations((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const basculerFacteur = (id) => setFacteurs((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const progress = React.createElement('div', { style: { display: 'flex', gap: 6, marginBottom: 22 } },
    STEPS.map((lab, idx) => {
      const done = idx < step, cur = idx === step
      return React.createElement('button', { key: idx, type: 'button', onClick: () => setStep(idx), 'aria-label': 'Étape ' + (idx + 1) + ' : ' + lab, 'aria-current': cur ? 'step' : undefined, style: { flex: 1, textAlign: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' } },
        React.createElement('div', { style: { height: 4, borderRadius: 'var(--r-pill)', background: (done || cur) ? SLEEP_COL : C.line, transition: 'all .2s ease' } }),
        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, marginTop: 6, color: cur ? SLEEP_COL : C.ink3 } }, lab))
    }))

  const champHeure = (lab, val, set) => React.createElement('label', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: C.mono, fontSize: 10.5, textTransform: 'uppercase', color: C.ink3 } },
    lab,
    React.createElement('input', { type: 'time', step: 300, value: val, onChange: (e) => { if (minutesDe(e.target.value) != null) set(e.target.value) }, style: { fontFamily: C.mono, fontSize: 22, fontWeight: 600, padding: '8px 6px', textAlign: 'center', color: C.ink } }))
  const stepDuree = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { role: 'radiogroup', 'aria-label': 'Façon de saisir', style: { display: 'inline-grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${C.line}`, marginBottom: 16 } },
      [['duree', 'Durée'], ['heures', 'Coucher / lever']].map(([id, lab], i) => React.createElement('button', { key: id, role: 'radio', 'aria-checked': mode === id, onClick: () => setMode(id), style: { padding: '7px 12px', border: 'none', borderLeft: i ? `1px solid ${C.line}` : 'none', background: mode === id ? SLEEP_COL : 'transparent', color: mode === id ? 'var(--c-on-fill)' : C.ink2, fontFamily: C.mono, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer' } }, lab))),
    mode === 'duree'
      ? React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 18 } }, 'Combien de temps as-tu dormi ?'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 8 } },
          React.createElement('button', { 'aria-label': 'Moins un quart d’heure', onClick: () => setHours(Math.max(3, Math.round((hours - 0.25) * 4) / 4)), style: { width: 52, height: 52, borderRadius: 'var(--r-pill)', fontSize: 26, fontWeight: 800, border: `1.5px solid ${C.line}`, background: C.surface, color: SLEEP_COL, cursor: 'pointer', lineHeight: 1 } }, '−'),
          React.createElement('div', { style: { minWidth: 130 } }, React.createElement('div', { style: { fontFamily: C.mono, fontSize: 36, fontWeight: 600, letterSpacing: '-.03em', color: C.ink, lineHeight: 1 } }, hLabel)),
          React.createElement('button', { 'aria-label': 'Plus un quart d’heure', onClick: () => setHours(Math.min(13, Math.round((hours + 0.25) * 4) / 4)), style: { width: 52, height: 52, borderRadius: 'var(--r-pill)', fontSize: 26, fontWeight: 800, border: `1.5px solid ${C.line}`, background: C.surface, color: SLEEP_COL, cursor: 'pointer', lineHeight: 1 } }, '+')),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3 } }, 'Au quart d’heure près'))
      : React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 14 } }, champHeure('Coucher', coucher, setCoucher), champHeure('Lever', lever, setLever)),
        React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginBottom: 8 } }, 'Temps pour t’endormir'),
        React.createElement('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' } },
          [5, 15, 30, 45, 60].map((m) => React.createElement('button', { key: m, onClick: () => setEndormissement(m), 'aria-pressed': endormissement === m, style: { padding: '7px 10px', fontFamily: C.mono, fontSize: 12, border: `1.5px solid ${endormissement === m ? SLEEP_COL : C.line}`, background: C.surface, color: endormissement === m ? C.ink : C.ink2, fontWeight: endormissement === m ? 700 : 400, cursor: 'pointer' } }, (m === 60 ? '1 h' : m + ' min') + (m === 60 ? ' +' : '')))),
        React.createElement('div', { style: { marginTop: 14, fontSize: 13.5, color: C.ink2 } }, dureeHeures ? ['Sommeil : ', React.createElement('strong', { key: 'h', style: { fontFamily: C.mono, color: C.ink } }, libelleDuree(dureeHeures))] : 'Heures incohérentes : vérifie le coucher et le lever.')))

  const stepReveils = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 18 } }, 'T’es-tu réveillé pendant la nuit ?'),
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      [[0, 'Aucun'], [1, '1 fois'], [2, '2 fois'], [3, '3 +']].map(([val, lab]) => {
        const active = awakenings === val
        return React.createElement('button', { key: val, onClick: () => setAwakenings(val), 'aria-pressed': active, style: { fontFamily: C.display, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', flex: 1, padding: '14px 0', borderRadius: 0, border: '1.5px solid ' + (active ? SLEEP_COL : C.line), background: active ? SLEEP_COL : C.surface, color: active ? 'var(--c-on-fill)' : C.ink2, cursor: 'pointer' } }, lab)
      })))

  const stepQualite = React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 6 } }, 'Comment as-tu dormi ?'),
    React.createElement('div', { style: { height: 18, marginBottom: 12 } }, quality > 0 && React.createElement('span', { style: { fontSize: 13, color: SLEEP_COL, fontWeight: 700 } }, ['', 'Très mal', 'Mal', 'Correctement', 'Bien', 'Très bien'][quality])),
    React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
      [1, 2, 3, 4, 5].map((n) => React.createElement('button', { key: n, onClick: () => setQuality(quality === n ? 0 : n), 'aria-label': 'Qualité ' + n + ' sur 5', 'aria-pressed': quality >= n, style: { width: 48, height: 48, borderRadius: 0, border: '2px solid ' + (quality >= n ? SLEEP_COL : C.line), background: C.surface, color: SLEEP_COL, cursor: 'pointer', fontSize: 22 } }, quality >= n ? '★' : '☆'))),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 12 } }, 'Facultatif'))

  // Au réveil : l'énergie (une seule réponse) et les sensations (autant
  // qu'il en faut). Ce que la durée ne dit pas.
  const stepReveil = React.createElement('div', null,
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 10, textAlign: 'center' } }, 'Quelle énergie au réveil ?'),
    React.createElement('div', { role: 'radiogroup', 'aria-label': 'Énergie au réveil', style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: `1px solid ${C.line}`, background: C.surface } },
      ENERGIES.map((lab, i) => {
        const n = i + 1, on = energie === n
        return React.createElement('button', { key: n, role: 'radio', 'aria-checked': on, onClick: () => setEnergie(on ? null : n), style: { padding: '10px 2px 9px', border: 'none', borderLeft: i ? `1px solid ${C.line}` : 'none', background: on ? SLEEP_COL : 'transparent', color: on ? 'var(--c-on-fill)' : C.ink2, cursor: 'pointer' } },
          React.createElement('div', { style: { fontFamily: C.mono, fontSize: 15, fontWeight: 600 } }, n),
          React.createElement('div', { style: { fontSize: 10, fontWeight: 600, marginTop: 3, lineHeight: 1.15 } }, lab))
      })),
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, margin: '18px 0 10px', textAlign: 'center' } }, 'Et comment te sens-tu ?'),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' } },
      SENSATIONS.map((x) => {
        const on = sensations.includes(x.id)
        return React.createElement('button', { key: x.id, onClick: () => basculer(x.id), 'aria-pressed': on, style: { padding: '8px 11px', fontSize: 13, fontWeight: on ? 700 : 600, cursor: 'pointer', border: `1.5px solid ${on ? (x.bon ? C.success : C.warn) : C.line}`, borderLeftWidth: on ? 4 : 1.5, background: C.surface, color: C.ink } }, on ? '✓ ' + x.lab : x.lab)
      })),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 12, textAlign: 'center' } }, 'Facultatif · plusieurs choix possibles'),
    // Pouls au réveil : le signal le plus simple d'une récupération
    // incomplète, à condition de le comparer à sa propre normale.
    React.createElement('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 13.5, color: C.ink2 } },
      React.createElement('span', null, 'Pouls au réveil', React.createElement(Aide, { terme: 'pouls' })),
      React.createElement('input', { type: 'text', inputMode: 'numeric', pattern: '[0-9]*', maxLength: 3, value: pouls, placeholder: '—', 'aria-label': 'Pouls au réveil, en battements par minute', onChange: (e) => setPouls(e.target.value.replace(/\D/g, '').slice(0, 3)), style: { width: 64, fontFamily: C.mono, fontSize: 18, fontWeight: 600, textAlign: 'center', padding: '6px 4px', color: C.ink } }),
      React.createElement('span', { style: { fontFamily: C.mono, fontSize: 11, color: C.ink3 } }, 'bpm')),
    React.createElement('div', { style: { fontSize: 11.5, color: (pouls && !poulsValide) || (poulsValide && normalePouls != null && poulsValide - normalePouls >= 7) ? C.warn : C.ink3, marginTop: 6, textAlign: 'center' } },
      pouls && !poulsValide ? 'Entre 30 et 120 battements par minute.'
        : normalePouls != null ? 'Ta normale : ' + Math.round(normalePouls) + ' bpm' + (poulsValide ? ' · ' + (poulsValide - Math.round(normalePouls) >= 0 ? '+' : '−') + Math.abs(poulsValide - Math.round(normalePouls)) + ' aujourd’hui' : '')
          : 'Facultatif · allongé, avant de te lever'))

  // La veille : ce qui a pu jouer sur la nuit. Croisé sur plusieurs
  // semaines, c'est ce qui dit ce qui influence vraiment tes nuits.
  const stepVeille = React.createElement('div', null,
    React.createElement('div', { style: { fontSize: 14, color: C.ink2, marginBottom: 12, textAlign: 'center' } }, 'Hier soir, il y a eu…'),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' } },
      FACTEURS.map((f) => {
        const on = facteurs.includes(f.id)
        return React.createElement('button', { key: f.id, onClick: () => basculerFacteur(f.id), 'aria-pressed': on, style: { padding: '8px 11px', fontSize: 13, fontWeight: on ? 700 : 600, cursor: 'pointer', border: `1.5px solid ${on ? C.warn : C.line}`, borderLeftWidth: on ? 4 : 1.5, background: C.surface, color: C.ink } }, on ? '✓ ' + f.lab : f.lab)
      })),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 12, textAlign: 'center' } }, 'Facultatif · rien de particulier : laisse vide'))

  const panes = [stepDuree, stepReveils, stepQualite, stepReveil, stepVeille]
  const isLast = step === STEPS.length - 1

  return React.createElement('div', null,
    dejaRenseignee ? React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, marginBottom: 14, paddingLeft: 10, borderLeft: `3px solid ${SLEEP_COL}` } }, 'Nuit déjà renseignée : tu la modifies.') : null,
    progress,
    React.createElement('div', { style: { minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }, panes[step]),
    React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 26 } },
      step > 0 && React.createElement('button', { onClick: () => setStep(step - 1), style: { flex: '0 0 auto', padding: '14px 20px', borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 700, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink2, cursor: 'pointer' } }, 'Retour'),
      React.createElement('button', { onClick: isLast ? saveNight : () => setStep(step + 1), style: { fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', flex: 1, padding: 14, borderRadius: 'var(--r-pill)', border: 'none', color: 'var(--c-on-fill)', background: SLEEP_COL, cursor: 'pointer', boxShadow: 'none' } }, isLast ? 'Enregistrer — ' + hLabel : 'Suivant')),
    // Enregistrer sans tout remplir : dès la durée, la nuit compte.
    !isLast ? React.createElement('button', { onClick: saveNight, style: { width: '100%', marginTop: 10, padding: 11, background: 'transparent', border: 'none', color: SLEEP_COL, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' } }, 'Enregistrer maintenant (' + hLabel + ')') : null,
    dejaRenseignee ? React.createElement('button', { onClick: supprimerNuit, style: { width: '100%', marginTop: 6, padding: 11, background: 'transparent', border: `1px solid ${C.line}`, color: C.danger, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' } }, 'Supprimer cette nuit') : null)
}

function RoutineTab({ db, store }) {
  const routine0 = db.sleepRoutine || { bedtime: '23:00', wake: '07:00', enabled: false }
  const [bedtime, setBedtime] = useState(routine0.bedtime || '23:00')
  const [wake, setWake] = useState(routine0.wake || '07:00')
  const [enabled, setEnabled] = useState(!!routine0.enabled)

  const idealRounded = Math.round(durFromTimes(bedtime, wake) * 10) / 10
  const inIdealRange = idealRounded >= 7 && idealRounded <= 9
  const FALL = 15, CYCLE = 90
  const idealBeds = [6, 5].map((c) => fmtMin(toMin(wake) - (c * CYCLE + FALL)))
  const idealWakes = [5, 6].map((c) => fmtMin(toMin(bedtime) + FALL + c * CYCLE))
  const TARGETS = [7, 7.5, 8, 8.5, 9]

  function applyTarget(targetH) {
    const bm = toMin(bedtime)
    setWake(fmtMin((bm + Math.round(targetH * 60)) % 1440))
  }
  function saveRoutine() {
    store.set({ sleepRoutine: { bedtime, wake, enabled } })
  }

  const timeField = (label, value, setter) => React.createElement('div', { style: { flex: 1 } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 14.6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 8 } }, label),
    React.createElement('input', { type: 'time', value, onChange: (e) => setter(e.target.value), style: { width: '100%', padding: '11px 12px', borderRadius: 0, fontSize: 16, fontWeight: 700, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, boxSizing: 'border-box' } }))

  const idealCard = (title, sub, items, labels) => React.createElement('div', { style: { flex: 1, borderRadius: 0, padding: '13px 15px', background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 8 } }, title),
    React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 4 } }, sub),
    items.map((t, ix) => React.createElement('div', { key: ix, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: ix ? 6 : 2 } },
      React.createElement('span', { style: { fontFamily: C.mono, fontSize: 15, fontWeight: 600, letterSpacing: '-.03em', color: SLEEP_COL } }, t),
      React.createElement('span', { style: { fontSize: 11, color: C.ink3 } }, labels[ix]))))

  // Le coucher qui donne TA nuit : ton besoin du moment (relevé par
  // l'entraînement), ton temps habituel pour t'endormir, ta dette.
  const conseil = coucherDuSoir({ ...db, sleepRoutine: { enabled: true, wake } }, isoToday())
  const carteBesoin = conseil ? React.createElement('div', { style: { padding: '13px 15px', marginBottom: 16, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${SLEEP_COL}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 6 } }, 'Selon ton besoin', React.createElement(Aide, { terme: 'dette' })),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      React.createElement('div', { style: { fontFamily: C.mono, fontSize: 24, fontWeight: 600, letterSpacing: '-.03em', color: SLEEP_COL, lineHeight: 1 } }, conseil.coucher),
      React.createElement('div', { style: { flex: 1, fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } }, 'Au lit à cette heure ' + conseil.raison.replace(/ avant ton lever( habituel)? de /, ' avant un lever à ') + '.')),
    bedtime !== conseil.coucher ? React.createElement('button', { type: 'button', onClick: () => setBedtime(conseil.coucher), style: { marginTop: 10, padding: '8px 12px', border: `1.5px solid ${SLEEP_COL}`, background: C.surface, color: SLEEP_COL, fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, 'Prendre ' + conseil.coucher + ' comme coucher') : null) : null

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 16 } }, timeField('Heure de coucher', bedtime, setBedtime), timeField('Heure de réveil', wake, setWake)),
    carteBesoin,
    React.createElement('div', { style: { marginBottom: 18 } },
      React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 8 } }, 'Durée cible rapide'),
      React.createElement('div', { style: { display: 'flex', gap: 7 } },
        TARGETS.map((t) => {
          const lab = libelleDuree(t)
          const active = Math.abs(idealRounded - t) < 0.05
          return React.createElement('button', { key: t, onClick: () => applyTarget(t), style: { flex: 1, padding: '9px 0', borderRadius: 0, fontWeight: 700, fontSize: 12.5, border: '1.5px solid ' + (active ? SLEEP_COL : C.line), background: active ? SLEEP_COL : C.surface, color: active ? 'var(--c-on-fill)' : C.ink2, cursor: 'pointer' } }, lab)
        }))),
    React.createElement('div', { style: { borderRadius: 0, padding: '16px 18px', marginBottom: 14, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${SLEEP_COL}` } },
      React.createElement('div', { style: { fontFamily: C.display, fontSize: 14.6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 6 } }, 'Temps au lit'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12 } },
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 26, fontWeight: 600, letterSpacing: '-.03em', color: SLEEP_COL, lineHeight: 1 } }, libelleDuree(durFromTimes(bedtime, wake))),
        React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600 } }, 'de ' + bedtime + ' à ' + wake)),
      React.createElement('div', { style: { fontSize: 12.5, marginTop: 10, fontWeight: 600, color: inIdealRange ? 'var(--c-success)' : 'var(--c-danger)' } }, inIdealRange ? '✓ Dans la fenêtre recommandée (7–9 h, adulte).' : '⚠ Hors fenêtre recommandée pour un adulte (7–9 h).')),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 14 } },
      idealCard('Couchers en fin de cycle', 'pour un lever à ' + wake, idealBeds, ['9 h', '7 h 30']),
      idealCard('Levers en fin de cycle', 'pour un coucher à ' + bedtime, idealWakes, ['7 h 30', '9 h'])),
    React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 14, padding: '0 2px' } }, 'Basé sur des cycles de ~90 min (+15 min pour s’endormir) : se réveiller en fin de cycle est plus reposant.'),
    React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' } },
      React.createElement('input', { type: 'checkbox', checked: enabled, onChange: (e) => setEnabled(e.target.checked), style: { width: 18, height: 18, accentColor: SLEEP_COL, cursor: 'pointer' } }),
      React.createElement('span', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600 } }, 'Suivre cette routine')),
    React.createElement('button', { onClick: saveRoutine, style: { fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', width: '100%', padding: 14, borderRadius: 'var(--r-pill)', border: 'none', color: 'var(--c-on-fill)', background: SLEEP_COL, cursor: 'pointer', boxShadow: 'none' } }, 'Enregistrer la routine'))
}

// ── Onglet "Historique" : graphe 14 j + dette + efficacité ──
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
function fmtDay(iso) {
  const p = iso.split('-'); const dd = new Date(+p[0], +p[1] - 1, +p[2])
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  return days[dd.getDay()] + ' ' + (+p[2]) + ' ' + MONTHS[+p[1] - 1]
}
// Un bandeau chiffré + son commentaire. Le chiffre seul ne dit pas quoi
// en faire, d'où la phrase qui l'accompagne systématiquement.
function AnaRow({ label, value, hint, color }) {
  return React.createElement('div', { style: { padding: '11px 0', borderBottom: `1px solid ${C.line}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 } },
      React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink2 } }, label),
      React.createElement('div', { style: { fontFamily: C.mono, fontSize: 13.2, fontWeight: 600, letterSpacing: '-.03em', color: color || C.ink, flex: '0 0 auto' } }, value)),
    hint ? React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 4, lineHeight: 1.45 } }, hint) : null)
}

// Ce que quatorze nuits disent et qu'une nuit isolée ne peut pas dire :
// la dispersion des durées, l'écart semaine / week-end, et l'effet des
// séances sur la nuit qui suit.
function AnalysisBlock({ ana }) {
  if (!ana.nights) return null
  const reg = ana.regularity
  const cu = ana.catchUp
  const at = ana.afterTraining
  const lvlColor = (l) => (l === 'alert' ? 'var(--c-danger)' : l === 'warn' ? C.warn : C.success)
  const rows = []
  if (reg) {
    rows.push(React.createElement(AnaRow, {
      key: 'reg', label: 'Régularité des durées', color: lvlColor(reg.level),
      value: '± ' + libelleDuree(reg.sd),
      hint: reg.text,
    }))
  }
  if (cu) {
    rows.push(React.createElement(AnaRow, {
      key: 'cu', label: 'Semaine et week-end', color: cu.flagged ? C.warn : C.ink,
      value: libelleDuree(cu.weekday) + ' → ' + libelleDuree(cu.weekend),
      hint: cu.flagged
        ? `Tu dors ${libelleDuree(cu.gap)} de plus le week-end : le besoin est présent toute la semaine, c’est l’occasion de dormir qui manque en semaine.`
        : 'Durées comparables en semaine et le week-end : pas de restriction à rattraper.',
    }))
  }
  if (at) {
    rows.push(React.createElement(AnaRow, {
      key: 'at', label: 'Nuit après une séance', color: at.flagged ? C.warn : C.ink,
      value: libelleDuree(at.afterTraining) + ' (repos : ' + libelleDuree(at.afterRest) + ')',
      hint: at.flagged
        ? `Tu dors ${libelleDuree(Math.abs(at.diff))} de moins après une séance (${at.nightsAfter} nuits comparées). Regarde l’horaire de tes séances tardives et la caféine en fin de journée.`
        : `Les séances ne dégradent pas ta nuit (${at.nightsAfter} nuits comparées).`,
    }))
  }
  // Les conseils qui redisent une ligne déjà affichée au-dessus sont ôtés.
  const tips = (ana.tips || []).filter((t) => !(reg && t === reg.text) && !(cu && /^Tu récupères/.test(t)) && !(at && /^Tu dors/.test(t)))
  if (!rows.length && !tips.length) return null
  return React.createElement('div', { style: { borderRadius: 0, padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 2 } }, 'Analyse sur 14 jours'),
    rows.length ? rows : React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, padding: '8px 0' } }, 'Encore trop peu de nuits enregistrées pour analyser la régularité — compte au moins trois nuits.'),
    tips.length ? React.createElement('div', { style: { marginTop: 12 } },
      tips.map((t, i) => React.createElement('div', {
        key: i,
        style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: i ? 8 : 0 },
      },
        React.createElement('span', { style: { color: SLEEP_COL, fontWeight: 800, flex: '0 0 auto' } }, '•'),
        React.createElement('span', null, t)))) : null)
}

// Au réveil, sur 14 jours : énergie moyenne, sensations fréquentes, et ce
// qu'elles demandent (alléger la charge, se reposer).
function BlocReveil({ log }) {
  const r = resumeReveil(log, isoToday(), 14)
  if (!r.nuits) return null
  return React.createElement('div', { style: { padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 2 } }, 'Au réveil (14 derniers jours)'),
    r.energieMoy != null ? React.createElement(AnaRow, { label: 'Énergie moyenne', value: String(r.energieMoy).replace('.', ',') + ' / 5', color: r.energieMoy < 2.5 ? C.warn : C.ink, hint: ENERGIES[Math.min(4, Math.max(0, Math.round(r.energieMoy) - 1))] + ' en moyenne, sur ' + r.nuits + ' réveil' + (r.nuits > 1 ? 's' : '') + ' notés.' }) : null,
    r.frequentes.length ? React.createElement(AnaRow, { label: 'Sensations les plus fréquentes', value: '', hint: r.frequentes.slice(0, 4).map((f) => f.lab + ' (' + f.n + ')').join(' · ') }) : null,
    r.alertes.map((t, i) => React.createElement('div', { key: i, style: { fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 10, paddingLeft: 10, borderLeft: `3px solid ${C.warn}` } }, t)))
}

// Heures de coucher et de lever, quand elles sont saisies : leur
// régularité compte autant que la durée.
function BlocHoraires({ db }) {
  const log = db.sleepLog || {}
  const r = regulariteHoraires(log, isoToday(), 14)
  if (!r) return null
  const chrono = chronotype(log, isoToday())
  const tenu = respectCoucher(db, isoToday())
  const col = r.niveau === 'alert' ? C.danger : r.niveau === 'warn' ? C.warn : C.success
  return React.createElement('div', { style: { padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 2 } }, 'Horaires (' + r.nuits + ' nuits)'),
    React.createElement(AnaRow, { label: 'Coucher moyen', value: r.coucher + ' ± ' + r.ecartCoucher + ' min', color: col }),
    r.lever ? React.createElement(AnaRow, { label: 'Lever moyen', value: r.lever + ' ± ' + r.ecartLever + ' min', color: col }) : null,
    React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, padding: '10px 0', borderBottom: (r.endormissement != null || r.decalage != null) ? `1px solid ${C.line}` : 'none' } }, r.texte),
    r.endormissement != null ? React.createElement(AnaRow, { label: 'Endormissement moyen', value: r.endormissement + ' min', color: r.endormissement > 30 ? C.warn : C.ink, hint: r.texteEndormissement }) : null,
    r.decalage != null ? React.createElement(AnaRow, { label: React.createElement(React.Fragment, null, 'Décalage du week-end', React.createElement(Aide, { terme: 'decalage' })), value: Math.abs(r.decalage) < 15 ? 'aucun' : (r.decalage > 0 ? '+' : '−') + libelleDuree(Math.abs(r.decalage) / 60), color: Math.abs(r.decalage) >= 60 ? C.warn : C.ink, hint: r.texteDecalage }) : null,
    tenu ? React.createElement(AnaRow, { label: 'Coucher conseillé tenu', value: tenu.tenus + ' / ' + tenu.nuits, color: tenu.tenus * 2 >= tenu.nuits ? C.ink : C.warn, hint: tenu.texte }) : null,
    chrono ? React.createElement(AnaRow, { label: React.createElement(React.Fragment, null, 'Chronotype', React.createElement(Aide, { terme: 'chronotype' })), value: chrono.lab, hint: chrono.texte }) : null)
}

// Le cœur sur quatre semaines : dernière mesure, normale, jours qui s'en
// écartaient, et la courbe avec la normale en pointillé.
function BlocCoeur({ db }) {
  const iso = isoToday()
  const log = db.sleepLog || {}, vit = db.vitalsLog || {}
  const mesures = [
    { id: 'pouls', lab: 'Pouls au réveil', unite: 'bpm', terme: 'pouls', lire: (d) => log[d] && log[d].pouls, lo: 30, hi: 120, haut: true },
    { id: 'repos', lab: 'FC de repos (Santé)', unite: 'bpm', terme: 'pouls', lire: (d) => vit[d] && vit[d].restingHr, lo: 30, hi: 120, haut: true },
    { id: 'vfc', lab: 'Variabilité cardiaque', unite: 'ms', terme: 'vfc', lire: (d) => vit[d] && vit[d].hrv, lo: 5, hi: 300, haut: false },
  ]
  const blocs = []
  for (const m of mesures) {
    const pts = []
    for (let k = 27; k >= 0; k--) {
      const d = decaler(iso, -k), x = Number(m.lire(d))
      if (m.lire(d) != null && Number.isFinite(x) && x >= m.lo && x <= m.hi) pts.push({ k, x: Math.round(x) })
    }
    if (!pts.length) continue
    const der = pts[pts.length - 1], avant = pts.slice(0, -1)
    const normale = avant.length >= 5 ? avant.reduce((a, p) => a + p.x, 0) / avant.length : null
    const ecart = (x) => (normale == null ? false : m.haut ? x - normale >= 7 : x / normale <= 0.85)
    const horsNormale = normale == null ? 0 : pts.filter((p) => p.k < 14 && ecart(p.x)).length
    const quand = der.k === 0 ? 'aujourd’hui' : der.k === 1 ? 'hier' : 'il y a ' + der.k + ' jours'
    const hint = normale == null
      ? `Dernière mesure : ${quand}. Ta normale se dessine après 5 mesures (encore ${5 - avant.length}).`
      : `Dernière mesure : ${quand}. Normale : ${Math.round(normale)} ${m.unite} sur ${avant.length} mesures.`
        + (horsNormale ? ` ${horsNormale} jour${horsNormale > 1 ? 's' : ''} ${m.haut ? 'à 7 battements ou plus au-dessus' : 'à 15 % ou plus sous'} ces deux dernières semaines.` : ' Aucun écart marqué ces deux dernières semaines.')
    const W = 280, H = 34
    const xs = pts.map((p) => p.x).concat(normale != null ? [normale] : [])
    const lo = Math.min(...xs) - 2, hi = Math.max(...xs) + 2
    const y = (v) => H - 3 - ((v - lo) / (hi - lo)) * (H - 6)
    const x = (k) => ((27 - k) / 27) * W
    blocs.push(React.createElement('div', { key: m.id },
      React.createElement(AnaRow, { label: React.createElement(React.Fragment, null, m.lab, React.createElement(Aide, { terme: m.terme })), value: der.x + ' ' + m.unite, color: ecart(der.x) ? C.warn : C.ink, hint }),
      pts.length >= 2 ? React.createElement('svg', { width: '100%', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': m.lab + ' sur 4 semaines', style: { display: 'block', margin: '4px 0 6px' } },
        normale != null ? React.createElement('line', { x1: 0, x2: W, y1: y(normale), y2: y(normale), style: { stroke: C.ink3, strokeWidth: 1, strokeDasharray: '3 3' } }) : null,
        React.createElement('polyline', { points: pts.map((p) => x(p.k) + ',' + y(p.x)).join(' '), style: { fill: 'none', stroke: SLEEP_COL, strokeWidth: 1.5 } }),
        pts.filter((p) => ecart(p.x)).map((p) => React.createElement('rect', { key: p.k, x: x(p.k) - 2.5, y: y(p.x) - 2.5, width: 5, height: 5, style: { fill: C.warn } }))) : null))
  }
  if (!blocs.length) return null
  return React.createElement('div', { style: { padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 2 } }, 'Cœur au réveil (4 semaines)'),
    blocs,
    React.createElement('div', { style: { fontSize: 11, color: C.ink3, lineHeight: 1.45, marginTop: 4 } }, 'Pointillé : ta normale. Carré orange : jour nettement hors de ta normale, souvent une récupération incomplète.'))
}

// La note a-t-elle du sens pour toi ? Le ressenti des séances selon la
// forme du jour, sur deux mois.
function BlocFormeSeances({ db }) {
  const r = formeEtSeances(db, isoToday(), 60)
  if (!r.seances) return null
  return React.createElement('div', { style: { padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 8 } }, 'Ta forme et tes séances (60 jours)', React.createElement(Aide, { terme: 'forme' })),
    r.ecart != null ? React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 } },
      [['Bonne forme', r.ressentiHaute, r.haute, C.success], ['Forme faible', r.ressentiBasse, r.basse, C.warn]].map(([lab, v, n, col]) => React.createElement('div', { key: lab, style: { padding: '8px 10px', border: `1px solid ${C.line}`, borderTop: `3px solid ${col}` } },
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 600 } }, lab + ' · ' + n + ' séance' + (n > 1 ? 's' : '')),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 18, fontWeight: 600, color: C.ink, marginTop: 2 } }, String(v).replace('.', ',') + ' / 5'),
        React.createElement('div', { style: { fontSize: 10.5, color: C.ink3 } }, 'ressenti moyen')))) : null,
    React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } }, r.texte))
}

// Ce qui pèse vraiment sur TES nuits : les facteurs de la veille croisés
// avec la durée, l'énergie et la qualité sur 30 jours.
function BlocInfluences({ log }) {
  const notees = Object.values(log || {}).filter((e) => facteursDe(e).length).length
  if (!notees) return null
  const inf = influences(log, isoToday(), 30)
  return React.createElement('div', { style: { padding: '14px 16px', marginBottom: 18, background: C.surface, border: `1px solid ${C.line}` } },
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 8 } }, 'Ce qui influence tes nuits (30 jours)'),
    inf.length
      ? inf.slice(0, 4).map((x) => React.createElement('div', { key: x.id, style: { fontSize: 13, color: C.ink, lineHeight: 1.5, padding: '8px 0 8px 10px', borderLeft: `3px solid ${x.nefaste ? C.warn : C.success}`, marginTop: 6 } }, x.texte))
      : React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, lineHeight: 1.5 } }, 'Pas encore assez de nuits pour conclure : il faut qu’un même facteur soit noté au moins trois soirs, et absent au moins trois autres. Continue de noter la veille.'))
}

function HistoryTab({ db, store, onEdit }) {
  const log = db.sleepLog || {}
  const dates = Object.keys(log).filter((d) => log[d] && log[d].hours).sort().reverse()
  const recent = dates.slice(0, 14)
  if (recent.length === 0) {
    return React.createElement('div', { style: { textAlign: 'center', padding: '40px 10px', color: C.ink3, fontSize: 14 } },
      React.createElement(Icon, { name: 'moon', size: 28, color: C.line, style: { marginBottom: 12 } }),
      React.createElement('div', null, 'Aucune nuit enregistrée pour le moment.'),
      React.createElement('div', { style: { fontSize: 12.5, marginTop: 6 } }, 'Tes nuits apparaîtront ici au fil des jours.'),
      React.createElement('button', { onClick: () => onEdit(isoToday()), style: { marginTop: 16, padding: '11px 16px', border: 'none', background: SLEEP_COL, color: 'var(--c-on-fill)', fontFamily: C.display, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', cursor: 'pointer' } }, 'Saisir une nuit'))
  }
  const avgH = recent.reduce((a, d) => a + (log[d].hours || 0), 0) / recent.length
  const qs = recent.filter((d) => log[d].quality)
  const avgQ = qs.length ? qs.reduce((a, d) => a + log[d].quality, 0) / qs.length : null
  // La dette est calculée sur la quinzaine glissante, et contre un besoin
  // relevé par le volume d'entraînement : comparer un athlète en grosse
  // semaine à une norme fixe de huit heures masquerait son déficit réel.
  const weeklyMins = rolling7Mins(db)
  const ana = sleepAnalysis(db, { days: 14, today: isoToday(), weeklyTrainingMins: weeklyMins })
  const need = ana.need || BASE_NEED
  const debtTotal = ana.debt ? ana.debt.net : 0
  const debtLabel = debtTotal > 0 ? libelleDuree(debtTotal) : '0 h'
  const debtLevel = debtTotal < 3 ? 'faible' : debtTotal < 8 ? 'modérée' : 'élevée'
  const debtColor = debtTotal < 3 ? C.success : debtTotal < 8 ? C.warn : 'var(--c-danger)'
  // Efficacité : temps endormi sur temps au lit quand coucher et lever sont
  // saisis (chaque réveil compté dix minutes éveillé), sinon estimée sur
  // les seuls réveils.
  const avecHeures = (e) => minutesDe(e.coucher) != null && minutesDe(e.lever) != null
  const effDe = (e) => {
    if (!avecHeures(e)) return Math.max(60, 100 - (e.awakenings || 0) * 12)
    let lit = minutesDe(e.lever) - minutesDe(e.coucher)
    if (lit <= 0) lit += 1440
    return Math.max(40, Math.min(100, Math.round(((Number(e.hours) || 0) * 60 - (e.awakenings || 0) * 10) / lit * 100)))
  }
  const effList = recent.map((d) => effDe(log[d]))
  const avgEff = Math.round(effList.reduce((a, b) => a + b, 0) / effList.length)
  const effMesuree = recent.some((d) => avecHeures(log[d]))

  const chartDates = recent.slice().reverse()
  const chartMax = Math.max(...chartDates.map((d) => log[d].hours || 0), 9)
  const barW = 16, barGap = 6, chartH = 70
  const couleurEnergie = (n) => (n == null ? null : n <= 2 ? C.warn : n === 3 ? C.ink3 : C.success)
  const chartW = chartDates.length * (barW + barGap) - barGap

  const manquantes = nuitsManquantes(log, isoToday(), 7)
  return React.createElement('div', null,
    manquantes.length ? React.createElement('button', { onClick: () => onEdit(manquantes[0].iso), style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 14px', marginBottom: 14, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.warn}`, color: C.ink, cursor: 'pointer' } },
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700 } }, manquantes.length + ' nuit' + (manquantes.length > 1 ? 's' : '') + ' non renseignée' + (manquantes.length > 1 ? 's' : '') + ' cette semaine'),
        React.createElement('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } }, manquantes.map((m) => m.titre).join(', ') + ' — touche pour compléter')),
      React.createElement('span', { style: { fontFamily: C.mono, color: C.ink3 } }, '→')) : null,
    React.createElement('div', { style: { borderRadius: 0, padding: '14px 16px', marginBottom: 14, background: C.surface, border: `1px solid ${C.line}` } },
      React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 10 } }, 'Durée par nuit (14 derniers jours)'),
      React.createElement('svg', { width: '100%', height: chartH + 22, viewBox: '0 0 ' + chartW + ' ' + (chartH + 22), preserveAspectRatio: 'xMidYMax meet', role: 'img', 'aria-label': 'Durée des ' + chartDates.length + ' dernières nuits et énergie au réveil' },
        chartDates.map((d, i) => {
          const hh = log[d].hours || 0
          const bh = Math.max(3, Math.round((hh / chartMax) * chartH))
          const inRange = hh >= 7 && hh <= 9
          const ce = couleurEnergie(reveilDe(log[d]).energie)
          return React.createElement('g', { key: d },
            React.createElement('rect', { x: i * (barW + barGap), y: chartH - bh, width: barW, height: bh, style: { fill: inRange ? SLEEP_COL : `color-mix(in srgb, ${SLEEP_COL} 40%, ${C.surface2})` } }),
            ce ? React.createElement('rect', { x: i * (barW + barGap) + 4, y: chartH + 8, width: barW - 8, height: barW - 8, style: { fill: ce } }) : null)
        })),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 6, lineHeight: 1.45 } }, 'Barre foncée : dans la fenêtre recommandée (7–9 h). Carré dessous : énergie au réveil (vert en forme, gris correct, orange fatigué).')),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 14 } },
      React.createElement('div', { style: { flex: 1, borderRadius: 0, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${debtColor}` } },
        React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 4 } }, 'Dette de sommeil', React.createElement(Aide, { terme: 'dette' })),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 19, fontWeight: 600, letterSpacing: '-.03em', color: debtColor } }, debtLabel),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, '14 j · ' + debtLevel + ' · besoin ' + libelleDuree(need))),
      React.createElement('div', { style: { flex: 1, borderRadius: 0, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 4 } }, effMesuree ? 'Efficacité' : 'Efficacité estimée', React.createElement(Aide, { terme: 'efficacite' })),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 19, fontWeight: 600, letterSpacing: '-.03em', color: avgEff < 85 ? C.warn : C.ink } }, avgEff + ' %'),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, effMesuree ? 'Temps endormi / temps au lit' : 'D’après les réveils'))),
    React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: 18 } },
      React.createElement('div', { style: { flex: 1, borderRadius: 0, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${SLEEP_COL}` } },
        React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 4 } }, 'Moyenne durée'),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 21, fontWeight: 600, letterSpacing: '-.03em', color: SLEEP_COL } }, libelleDuree(avgH))),
      React.createElement('div', { style: { flex: 1, borderRadius: 0, padding: '14px 16px', background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 4 } }, 'Qualité moy.'),
        React.createElement('div', { style: { fontFamily: C.mono, fontSize: 21, fontWeight: 600, letterSpacing: '-.03em', color: C.ink } }, avgQ != null ? String(Math.round(avgQ * 10) / 10).replace('.', ',') + ' / 5' : '—'))),
    React.createElement(AnalysisBlock, { ana }),
    React.createElement(BlocReveil, { log }),
    React.createElement(BlocCoeur, { db }),
    React.createElement(BlocFormeSeances, { db }),
    React.createElement(BlocInfluences, { log }),
    React.createElement(BlocHoraires, { db }),
    React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3, marginBottom: 4 } }, recent.length + ' dernière' + (recent.length > 1 ? 's' : '') + ' nuit' + (recent.length > 1 ? 's' : '')),
    React.createElement('div', { style: { maxHeight: 280, overflowY: 'auto' } },
      recent.map((d) => {
        const e = log[d]; const h = e.hours; const hLab = libelleDuree(h); const aw = e.awakenings || 0
        const reveil = resumeNuit(e)
        // Toucher une nuit l'ouvre pour la corriger.
        return React.createElement('button', { key: d, onClick: () => onEdit(d), 'aria-label': 'Modifier la ' + libelleNuit(d).toLowerCase(), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '11px 2px', background: 'none', border: 'none', borderBottom: `1px solid ${C.line}`, cursor: 'pointer', color: C.ink } },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, fontWeight: 600 } }, fmtDay(d)),
            reveil ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, reveil) : null),
          React.createElement('div', { style: { fontSize: 13, color: C.ink3, flex: '0 0 auto', marginRight: 14 } }, aw > 0 ? aw + '× réveil' + (aw > 1 ? 's' : '') : ''),
          e.quality ? React.createElement('div', { style: { fontSize: 12.5, color: SLEEP_COL, flex: '0 0 auto', marginRight: 14, fontWeight: 700 } }, '★' + e.quality) : React.createElement('div', { style: { flex: '0 0 auto', marginRight: 14 } }),
          React.createElement('div', { style: { fontFamily: C.mono, fontSize: 14.1, fontWeight: 600, letterSpacing: '-.03em', color: C.ink, flex: '0 0 auto', minWidth: 58, textAlign: 'right' } }, hLab))
      })),
    React.createElement('button', { onClick: () => store.annulable('Historique du sommeil effacé', () => store.set({ sleepLog: {} })), style: { width: '100%', marginTop: 16, padding: 11, borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.line}`, background: 'transparent', color: C.ink3, cursor: 'pointer' } }, 'Effacer l’historique'))
}

export default function SleepSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('night')
  // Nuit en cours de saisie (date du réveil) : aujourd'hui par défaut, ou
  // une nuit passée choisie dans la liste ou depuis l'historique.
  const [nuit, setNuit] = useState(isoToday())
  const editer = (iso) => { setNuit(iso); setExpress(false); setTab('night') }
  const [express, setExpress] = useState(false)
  if (loading) {
    return React.createElement(FlowSpace, { bg: 'sante', title: 'Sommeil', onClose, tint: SLEEP_COL }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }
  return React.createElement(FlowSpace, { bg: 'sante', title: 'Sommeil', onClose, tint: SLEEP_COL },
    React.createElement(SegTabs, { tint: SLEEP_COL, value: tab, onChange: setTab, tabs: [{ id: 'night', lab: 'Saisie' }, { id: 'routine', lab: 'Routine' }, { id: 'history', lab: 'Historique' }] }),
    tab === 'night' && express && React.createElement(RattrapageExpress, { db, store, onFini: () => setExpress(false) }),
    tab === 'night' && !express && nuit === isoToday() && React.createElement(CarteForme, { db }),
    tab === 'night' && !express && React.createElement(ChoixNuit, { log: db.sleepLog || {}, date: nuit, onChange: setNuit, onExpress: () => setExpress(true) }),
    tab === 'night' && !express && React.createElement(NightTab, { key: nuit, db, store, date: nuit, onDone: () => { setNuit(isoToday()); setTab('history') } }),
    tab === 'routine' && React.createElement(RoutineTab, { db, store }),
    tab === 'history' && React.createElement(HistoryTab, { db, store, onEdit: editer }))
}
