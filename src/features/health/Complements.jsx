import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SpaceBanner, SecLab, NoteBox, Pill, Choice, isoToday } from './kit'

const SUPP = MODULE_TINTS.complements

// Données réelles (cadre AIS + ISSN), classées par niveau de preuve.
const COMPS = {
  A: { lab: 'Performance — preuves fortes', items: [
    { id: 'creatine', n: 'Créatine monohydrate', e: 'Force, puissance, masse maigre', dose: '3–5 g/j en continu', pr: 'Très forte', pre: 'Très sûre ; bien s’hydrater', m: 'Peu importe l’heure, tous les jours', cure: 'En continu, sans pause nécessaire' },
    { id: 'cafeine', n: 'Caféine', e: 'Vigilance, baisse de l’effort perçu', dose: '3–6 mg/kg, ~60 min avant', pr: 'Très forte', pre: 'Sommeil, anxiété ; éviter le soir', m: '~60 min avant l’effort', cure: 'Ponctuel, avant les séances clés (évite l’accoutumance quotidienne)' },
    { id: 'betaalanine', n: 'Bêta-alanine', e: 'Efforts intenses 1–4 min', dose: '3–6 g/j (≥ 2–4 sem)', pr: 'Forte', pre: 'Fourmillements bénins ; fractionner', m: 'Réparti dans la journée', cure: 'En continu, effet cumulatif sur 4–8 sem' },
    { id: 'nitrates', n: 'Nitrates / betterave', e: 'Économie d’O₂, endurance', dose: '~2,5 h avant', pr: 'Forte', pre: 'Éviter bains de bouche antibactériens', m: '~2,5 h avant l’effort', cure: 'Ponctuel (compétition) ou cure courte < 4 sem' },
    { id: 'bicarbonate', n: 'Bicarbonate de sodium', e: 'Tampon, efforts répétés', dose: '0,2–0,3 g/kg, 1–2,5 h avant', pr: 'Forte', pre: 'Troubles digestifs ; tester à l’entraînement', m: '1–2,5 h avant l’effort', cure: 'Ponctuel, uniquement les jours de séance intense' },
    { id: 'citrulline', n: 'L-citrulline (malate)', e: 'Flux sanguin, fatigue perçue, répétitions', dose: '6–8 g ~60 min avant', pr: 'Émergente / modérée', pre: 'Légers troubles digestifs possibles ; effet variable selon les individus', m: '~60 min avant l’effort de résistance', cure: 'Ponctuel autour des séances clés, ou cure courte' },
  ] },
  B: { lab: 'Aliments sportifs & récup', items: [
    { id: 'proteine', n: 'Poudre de protéine', e: 'Atteindre la cible protéique', dose: '20–40 g/prise', pr: 'Forte', pre: 'Si l’alimentation ne couvre pas', m: 'Après la séance ou sur un repas', cure: 'Au besoin, selon tes apports du jour' },
    { id: 'glucides', n: 'Gels / boissons glucidiques', e: 'Carburant pendant l’effort', dose: '30–90 g/h', pr: 'Forte', pre: 'cf. onglet Course', m: 'Pendant l’effort', cure: 'Ponctuel, sur les sorties longues / la course' },
    { id: 'electrolytes', n: 'Électrolytes', e: 'Hydratation effort long/chaleur', dose: '~500–700 mg sodium/L', pr: 'Forte', pre: 'Adapter à la sudation', m: 'Pendant l’effort (chaleur, longue durée)', cure: 'Ponctuel, selon la sudation' },
    { id: 'cerise', n: 'Cerise acidulée', e: 'Récupération, moins de dommages', dose: 'autour des blocs intenses', pr: 'Modérée', pre: '—', m: 'Le soir, autour des compétitions', cure: 'Cure courte sur les blocs intenses' },
    { id: 'collagene', n: 'Collagène (+ vit. C)', e: 'Soutien tendons, ligaments, articulations', dose: '~15 g + vit. C, 30–60 min avant la charge', pr: 'Émergente', pre: 'Effet sur la performance non prouvé ; ne remplace pas les protéines', m: '30–60 min avant le travail de charge', cure: 'En continu sur un bloc de renfo/réhab' },
    { id: 'glutamine', n: 'L-glutamine', e: 'Intégrité intestinale, soutien immunitaire en charge élevée', dose: '~5 g/j', pr: 'Faible (sportif sain)', pre: 'Peu d’intérêt prouvé sur la performance ou la masse musculaire chez le sportif sain ; pertinence surtout en contexte clinique ou très forte charge', m: 'Après la séance ou le soir', cure: 'Cure sur les blocs de forte charge, sinon non indispensable' },
    { id: 'ashwagandha', n: 'Ashwagandha', e: 'Gestion du stress, sommeil, récupération', dose: '~300–600 mg/j (extrait KSM-66)', pr: 'Modérée / émergente', pre: 'Effet sédatif ; éviter grossesse et troubles thyroïdiens ; qualité variable', m: 'Le soir (sommeil) ou le matin', cure: 'En cure de 6–8 sem, puis une pause' },
  ] },
  C: { lab: 'Santé / si carence (sur bilan)', items: [
    { id: 'vitd', n: 'Vitamine D', e: 'Si carence (hiver, peu de soleil)', dose: 'guidé par bilan sanguin', pr: 'Bonne si carence', pre: 'Doser avant', m: 'Le matin, avec un repas gras', cure: 'Cure hivernale, ou en continu selon le bilan' },
    { id: 'vitc', n: 'Vitamine C', e: 'Si carence ; soutien immunitaire', dose: '~200–500 mg/j si besoin', pr: 'Bonne si carence', pre: 'À forte dose chronique (>1 g/j), peut émousser certaines adaptations à l’entraînement (signalisation oxydative) — éviter les mégadoses systématiques', m: 'Le matin, avec un repas', cure: 'Ponctuel (carence, coup de froid), pas en continu à forte dose' },
    { id: 'fer', n: 'Fer', e: 'Si carence confirmée', dose: 'sur prescription', pr: 'Bonne si déficit', pre: 'Jamais à l’aveugle : surcharge dangereuse', m: 'À jeun + vit. C, à distance du café/thé', cure: 'Cure encadrée par un médecin, avec re-dosage' },
    { id: 'calcium', n: 'Calcium', e: 'Santé osseuse si apports bas', dose: 'selon apports', pr: 'Bonne', pre: 'À distance du fer', m: 'Avec un repas, à distance du fer', cure: 'Selon les apports alimentaires' },
    { id: 'omega3', n: 'Oméga-3 (EPA/DHA)', e: 'Inflammation, santé générale', dose: 'selon produit', pr: 'Modérée à bonne', pre: 'Prudence si anticoagulants', m: 'Avec un repas (mieux toléré)', cure: 'En continu' },
    { id: 'magnesium', n: 'Magnésium', e: 'Crampes, sommeil, SPM', dose: 'selon produit', pr: 'Variable', pre: 'Effet laxatif à forte dose', m: 'Le soir (sommeil, crampes)', cure: 'En continu ou en cure selon le besoin' },
    { id: 'zinc', n: 'Zinc', e: 'Immunité, soutien si carence', dose: 'selon produit (cures courtes)', pr: 'Bonne si carence', pre: 'À distance du fer/calcium ; ne pas surdoser (gêne l’absorption du cuivre)', m: 'Avec un repas, à distance du fer/calcium', cure: 'Cures courtes (ex. autour d’un coup de froid)' },
    { id: 'multivit', n: 'Multivitamine', e: 'Filet de sécurité si alimentation déséquilibrée', dose: 'selon produit', pr: 'Faible', pre: 'Ne remplace pas une vraie alimentation', m: 'Le matin, avec un repas', cure: 'Au besoin, pas indispensable' },
  ] },
}
const ALL_COMPS = [...COMPS.A.items, ...COMPS.B.items, ...COMPS.C.items]
const COMP_BY_ID = Object.fromEntries(ALL_COMPS.map((c) => [c.id, c]))

function ComplementsTab({ db, store }) {
  const [grp, setGrp] = useState('A')
  const [q, setQ] = useState('')
  const day = isoToday()
  const plan = db.suppPlan || []
  const taken = (db.suppTaken || {})[day] || []
  const g = COMPS[grp]
  const inPlan = (id) => plan.includes(id)

  const toggle = (it) => {
    const next = plan.includes(it.id) ? plan.filter((x) => x !== it.id) : [...plan, it.id]
    store.set({ suppPlan: next })
  }
  const toggleTaken = (id) => {
    const cur = (db.suppTaken || {})[day] || []
    const nextDay = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    store.set({ suppTaken: { ...(db.suppTaken || {}), [day]: nextDay } })
  }

  const query = q.trim().toLowerCase()
  const results = query ? ALL_COMPS.filter((c) => (c.n + ' ' + c.e).toLowerCase().includes(query)) : []
  const planItems = plan.map((id) => COMP_BY_ID[id]).filter(Boolean)

  const SuppCard = (it) => {
    const sel = inPlan(it.id)
    return React.createElement('div', { key: it.id, style: { padding: 14, borderRadius: C.radiusSm, background: C.surface, border: '1px solid ' + (sel ? `color-mix(in srgb, ${SUPP} 45%, ${C.line})` : C.line) } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
        React.createElement('span', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, it.n),
        React.createElement(Pill, { tint: SUPP }, it.pr)),
      React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, marginTop: 4, lineHeight: 1.4 } }, it.e),
      React.createElement('div', { style: { display: 'flex', gap: 16, marginTop: 9, flexWrap: 'wrap' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Dose'),
          React.createElement('div', { style: { fontSize: 13, fontWeight: 600 } }, it.dose)),
        React.createElement('div', { style: { minWidth: 130 } },
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Moment'),
          React.createElement('div', { style: { fontSize: 13, fontWeight: 600 } }, it.m)),
        React.createElement('div', { style: { flex: 1, minWidth: 130 } },
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Cure'),
          React.createElement('div', { style: { fontSize: 13, color: C.ink2 } }, it.cure))),
      React.createElement('div', { style: { marginTop: 6 } },
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase' } }, 'Précautions'),
        React.createElement('div', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.4 } }, it.pre)),
      React.createElement('button', { onClick: () => toggle(it), style: { marginTop: 11, width: '100%', padding: 10, borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', border: '1.5px solid ' + (sel ? SUPP : C.line), background: sel ? SUPP : C.surface, color: sel ? '#fff' : C.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 } },
        sel ? React.createElement(React.Fragment, null, React.createElement(Icon, { name: 'check', size: 16, color: '#fff' }), ' Dans le plan') : '+ Ajouter au plan'))
  }

  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'spark', tint: SUPP, title: 'Compléments', text: 'Cadre AIS + ISSN, classés par niveau de preuve. Coche ceux que tu prends pour construire ton plan de prise.' }),

    React.createElement('div', { style: { position: 'relative', marginBottom: 16 } },
      React.createElement('span', { style: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex' } }, React.createElement(Icon, { name: 'search', size: 17, color: C.ink3 })),
      React.createElement('input', { value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Rechercher un complément (ex. citrulline, vitamine C)', style: { width: '100%', padding: '13px 15px 13px 38px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 15, outline: 'none', boxSizing: 'border-box' } }),
      q && React.createElement('button', { onClick: () => setQ(''), 'aria-label': 'Effacer', style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 } }, React.createElement(Icon, { name: 'close', size: 16, color: C.ink3 }))),

    query
      ? React.createElement(React.Fragment, null,
          React.createElement(SecLab, null, results.length + (results.length > 1 ? ' résultats' : ' résultat')),
          results.length === 0
            ? React.createElement('div', { style: { fontSize: 13, color: C.ink2, padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface2, lineHeight: 1.5 } }, 'Aucun complément documenté ne correspond. Seuls les compléments avec des données (dose, preuve) sont proposés.')
            : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, results.map((it) => SuppCard(it))))
      : React.createElement(React.Fragment, null,
          React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: `color-mix(in srgb, ${SUPP} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${SUPP} 28%, ${C.line})`, marginBottom: 18 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: planItems.length ? 12 : 0 } },
              React.createElement(Icon, { name: 'calendar', size: 20, color: SUPP }),
              React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, 'Mon plan de prise'),
              planItems.length > 0 && React.createElement('span', { style: { marginLeft: 'auto' } }, React.createElement(Pill, { tint: SUPP }, taken.length + '/' + planItems.length))),
            planItems.length === 0
              ? React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 8, lineHeight: 1.5 } }, 'Coche « Ajouter au plan » sur les compléments que tu prends : ils se rangent ici avec une coche « pris aujourd’hui ».')
              : React.createElement(React.Fragment, null,
                  React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Pris aujourd’hui'),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
                    planItems.map((it) => {
                      const t = taken.includes(it.id)
                      return React.createElement('button', { key: it.id, onClick: () => toggleTaken(it.id), style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer' } },
                        React.createElement('span', { style: { width: 24, height: 24, borderRadius: 999, flex: '0 0 auto', border: '2px solid ' + (t ? SUPP : C.line), background: t ? SUPP : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, t && React.createElement(Icon, { name: 'check', size: 14, color: '#fff' })),
                        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                          React.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, it.n),
                          React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, it.m)))
                    })),
                  React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '14px 0 8px' } }, 'Rythme des cures'),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    planItems.map((x) => React.createElement('div', { key: x.id, style: { fontSize: 13, color: C.ink2, lineHeight: 1.4 } }, React.createElement('strong', { style: { color: C.ink } }, x.n), ' — ', x.cure))),
                  React.createElement('button', { onClick: () => store.set({ suppPlan: [] }), style: { width: '100%', marginTop: 12, padding: 12, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Vider le plan'))),

          React.createElement(Choice, { tint: SUPP, value: grp, set: setGrp, options: [{ id: 'A', lab: 'Performance' }, { id: 'B', lab: 'Récup' }, { id: 'C', lab: 'Santé' }] }),
          React.createElement('div', { style: { height: 14 } }),
          React.createElement(SecLab, null, g.lab),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, g.items.map((it) => SuppCard(it)))),

    React.createElement(NoteBox, { tint: SUPP }, "Le plan de prise est une aide indicative. Informations éducatives, pas une prescription : avis médical/pharmacien requis, surtout sous traitement ou grossesse. Alimentation et sommeil d'abord."))
}

export default function ComplementsSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  if (loading) {
    return React.createElement(FlowSpace, { title: 'Compléments', onClose, tint: SUPP }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }
  return React.createElement(FlowSpace, { title: 'Compléments', onClose, tint: SUPP }, React.createElement(ComplementsTab, { db, store }))
}
