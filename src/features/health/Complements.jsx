import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SpaceBanner, SecLab, NoteBox, Pill, Choice, isoToday } from './kit'
import { detectInteractions, slotConflicts, personalDose, groupBySlot, adherenceBySupp, cureStatus } from './suppIntel'

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

const navBtn = { width: 38, height: 38, borderRadius: 999, flex: '0 0 auto', background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

// Décale une date ISO d'un nombre de jours, en UTC pur : construire la
// date en heure locale puis repasser par toISOString décale d'un jour dans
// les fuseaux en avance sur UTC.
function shiftISO(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

function fmtDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function ComplementsTab({ db, store }) {
  const [grp, setGrp] = useState('A')
  const [q, setQ] = useState('')
  // Les prises sont déjà stockées par date : il ne manquait que la
  // navigation pour rattraper un oubli de la veille ou relire une semaine.
  const [day, setDay] = useState(isoToday())
  const today = isoToday()
  const isToday = day === today
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

  // Bandeau des sept jours autour de la date affichée (lundi → dimanche),
  // avec le nombre de prises de chaque jour : les oublis se repèrent d'un
  // coup d'œil sans ouvrir chaque journée.
  const weightKg = Number((db.profilePhys || {}).poids) || 0
  const interactions = detectInteractions(plan)
  const sameSlot = new Set(slotConflicts(plan).map((i) => i.a + '|' + i.b))
  const adherence = adherenceBySupp(plan, db.suppTaken, { days: 14, today })

  const weekStrip = (() => {
    const [y, m, d] = day.split('-').map(Number)
    const ref = new Date(Date.UTC(y, m - 1, d))
    const monday = shiftISO(day, -(((ref.getUTCDay() + 6) % 7)))
    const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    return letters.map((letter, i) => {
      const iso = shiftISO(monday, i)
      const count = ((db.suppTaken || {})[iso] || []).length
      return { iso, letter, count, future: iso > today, pct: planItems.length ? Math.min(1, count / planItems.length) : 0 }
    })
  })()

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
          // Navigation de date : flèches jour par jour, retour direct à
          // aujourd'hui, et bandeau de semaine pour repérer les oublis.
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
            React.createElement('button', { onClick: () => setDay(shiftISO(day, -1)), 'aria-label': 'Jour précédent', style: navBtn }, React.createElement(Icon, { name: 'back', size: 17 })),
            React.createElement('div', { style: { flex: 1, textAlign: 'center', minWidth: 0 } },
              React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, isToday ? 'Aujourd’hui' : fmtDay(day)),
              !isToday && React.createElement('button', { onClick: () => setDay(today), style: { background: 'none', border: 'none', color: SUPP, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '2px 0 0' } }, 'Revenir à aujourd’hui')),
            React.createElement('button', {
              onClick: () => { if (!isToday) setDay(shiftISO(day, 1)) },
              disabled: isToday, 'aria-label': 'Jour suivant',
              style: { ...navBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'default' : 'pointer' },
            }, React.createElement(Icon, { name: 'next', size: 17 }))),

          planItems.length > 0 && React.createElement('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
            weekStrip.map((w) => React.createElement('button', {
              key: w.iso,
              onClick: () => setDay(w.iso),
              style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
            },
              React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: w.iso === day ? SUPP : C.ink3 } }, w.letter),
              React.createElement('span', {
                style: {
                  width: '100%', height: 26, borderRadius: 8,
                  border: w.iso === day ? `2px solid ${SUPP}` : `1px solid ${C.line}`,
                  background: w.pct > 0 ? `color-mix(in srgb, ${SUPP} ${Math.round(w.pct * 70) + 15}%, ${C.surface})` : C.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10.5, fontWeight: 700, color: w.pct >= 0.6 ? '#fff' : C.ink3,
                },
              }, w.future ? '' : w.count)))),

          React.createElement('div', { style: { padding: '15px 16px', borderRadius: C.radius, background: `color-mix(in srgb, ${SUPP} 10%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${SUPP} 28%, ${C.line})`, marginBottom: 18 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: planItems.length ? 12 : 0 } },
              React.createElement(Icon, { name: 'calendar', size: 20, color: SUPP }),
              React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16 } }, 'Mon plan de prise'),
              planItems.length > 0 && React.createElement('span', { style: { marginLeft: 'auto' } }, React.createElement(Pill, { tint: SUPP }, taken.length + '/' + planItems.length))),
            planItems.length === 0
              ? React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 8, lineHeight: 1.5 } }, 'Coche « Ajouter au plan » sur les compléments que tu prends : ils se rangent ici avec une coche de prise, jour par jour.')
              : React.createElement(React.Fragment, null,
                  React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, isToday ? 'Pris aujourd’hui' : 'Pris ce jour-là'),
                  // Regroupé par moment de la journée : une liste à plat ne
                  // dit pas quoi prendre maintenant, alors que c'est la
                  // seule question au moment de cocher.
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                    groupBySlot(planItems).map((g) => React.createElement('div', { key: g.id },
                      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                        React.createElement(Icon, { name: g.icon, size: 13, color: SUPP }),
                        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: C.ink2 } }, g.label)),
                      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
                        g.items.map((it) => {
                          const t = taken.includes(it.id)
                          const dose = personalDose(it.id, weightKg)
                          return React.createElement('button', { key: it.id, onClick: () => toggleTaken(it.id), style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer' } },
                            React.createElement('span', { style: { width: 24, height: 24, borderRadius: 999, flex: '0 0 auto', border: '2px solid ' + (t ? SUPP : C.line), background: t ? SUPP : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, t && React.createElement(Icon, { name: 'check', size: 14, color: '#fff' })),
                            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                              React.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, it.n),
                              React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, dose ? dose.text + ' pour toi' : it.m)))
                        }))))),
                  React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '14px 0 8px' } }, 'Rythme des cures'),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    planItems.map((x) => React.createElement('div', { key: x.id, style: { fontSize: 13, color: C.ink2, lineHeight: 1.4 } }, React.createElement('strong', { style: { color: C.ink } }, x.n), ' — ', x.cure))),
                  React.createElement('button', { onClick: () => store.set({ suppPlan: [] }), style: { width: '100%', marginTop: 12, padding: 12, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Vider le plan'))),

          // ─── Interactions ─────────────────────────────────────
          // Le catalogue signalait « à distance du fer » dans un texte que
          // personne ne rapproche du reste du plan. Ici les paires
          // réellement présentes sont confrontées.
          interactions.length > 0 && React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement(SecLab, null, 'Interactions de ton plan'),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              interactions.map((i, k) => {
                const col = i.kind === 'synergy' ? '#2fb865' : i.severity === 'high' ? C.danger : i.severity === 'moderate' ? C.warn : C.ink3
                const both = sameSlot.has(i.a + '|' + i.b)
                const na = (COMP_BY_ID[i.a] || {}).n || i.a
                const nb = (COMP_BY_ID[i.b] || {}).n || i.b
                return React.createElement('div', { key: k, style: { display: 'flex', gap: 10, padding: '11px 13px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${col} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${col} 26%, ${C.line})` } },
                  React.createElement(Icon, { name: i.kind === 'synergy' ? 'check' : 'alert', size: 16, color: col, style: { flexShrink: 0, marginTop: 2 } }),
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 3 } }, na, ' + ', nb,
                      i.kind === 'debated' ? React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: C.ink3, marginLeft: 6 } }, '· débattu') : null),
                    React.createElement('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45 } }, i.text),
                    both && React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: col, marginTop: 4 } }, 'Tous deux rangés au même moment de la journée : décale l’un des deux.')))
              })),
            React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' } },
              'Repères d’absorption d’usage courant, pas un avis médical.')),

          // ─── Observance par complément ────────────────────────
          // Le taux global masque le détail : on peut être à 80 % en
          // oubliant toujours le même produit, ce qui est l'information
          // utile.
          adherence.length > 0 && React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement(SecLab, null, 'Observance sur 14 jours'),
            React.createElement('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: '4px 14px' } },
              adherence.map((r, k) => {
                const it = COMP_BY_ID[r.id]
                if (!it) return null
                const cure = cureStatus(r.id, db.suppTaken, today)
                const col = r.pct >= 80 ? '#2fb865' : r.pct >= 50 ? C.warn : C.danger
                return React.createElement('div', { key: r.id, style: { padding: '11px 0', borderTop: k ? `1px solid ${C.line}` : 'none' } },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    React.createElement('span', { style: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, it.n),
                    React.createElement('span', { style: { fontSize: 11.5, color: C.ink3 } }, r.taken, '/', r.days, ' j'),
                    React.createElement('span', { style: { fontFamily: C.font, fontSize: 14.5, fontWeight: 800, color: col, minWidth: 42, textAlign: 'right' } }, r.pct, ' %')),
                  React.createElement('div', { style: { width: '100%', height: 5, borderRadius: 999, background: C.surface2, overflow: 'hidden', marginTop: 6 } },
                    React.createElement('div', { style: { width: r.pct + '%', height: '100%', borderRadius: 999, background: col } })),
                  cure && cure.flag && React.createElement('div', { style: { fontSize: 11.5, color: cure.flag.level === 'warn' ? C.warn : C.ink3, marginTop: 5, lineHeight: 1.4 } }, cure.flag.text))
              }))),

          React.createElement(Choice, { tint: SUPP, value: grp, set: setGrp, options: [{ id: 'A', lab: 'Performance' }, { id: 'B', lab: 'Récup' }, { id: 'C', lab: 'Santé' }] }),
          React.createElement('div', { style: { height: 14 } }),
          React.createElement(SecLab, null, g.lab),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, g.items.map((it) => SuppCard(it)))),

    React.createElement(NoteBox, { tint: SUPP }, "Le plan de prise est une aide indicative. Informations éducatives, pas une prescription : avis médical/pharmacien requis, surtout sous traitement ou grossesse. Alimentation et sommeil d'abord."))
}

export default function ComplementsSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  if (loading) {
    return React.createElement(FlowSpace, { bg: 'sante', title: 'Compléments', onClose, tint: SUPP }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }
  return React.createElement(FlowSpace, { bg: 'sante', title: 'Compléments', onClose, tint: SUPP }, React.createElement(ComplementsTab, { db, store }))
}
