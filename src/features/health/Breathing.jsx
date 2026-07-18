import React, { useState, useEffect, useRef } from 'react'
import { C, MODULE_TINTS, Icon, FlowSpace } from './kit'

const BR = MODULE_TINTS.esprit

// Protocoles de respiration (cohérence cardiaque : Lehrer & Gevirtz 2014).
const PROTOCOLS = [
  { id: 'coherence', name: 'Cohérence cardiaque', sub: '5 s inspire · 5 s expire', inhale: 5, hold: 0, exhale: 5, holdEnd: 0,
    desc: 'Respiration lente à ~6 cycles/min. La technique la plus étudiée pour réduire le stress perçu et réguler la variabilité de fréquence cardiaque.' },
  { id: 'box', name: 'Respiration carrée', sub: '4 s · 4 s · 4 s · 4 s', inhale: 4, hold: 4, exhale: 4, holdEnd: 4,
    desc: 'Inspire, bloque, expire, bloque à durée égale. Utilisée pour recentrer l’attention avant un effort ou une échéance stressante.' },
  { id: 'long_exhale', name: 'Expiration prolongée', sub: '4 s inspire · 7 s expire', inhale: 4, hold: 0, exhale: 7, holdEnd: 0,
    desc: 'Expiration plus longue que l’inspiration : favorise l’activation parasympathique, utile avant le sommeil ou après un pic de stress.' },
]
const DURATIONS = [2, 5, 10]

function ProtocolCard({ p, active, onClick }) {
  return React.createElement('button', { onClick, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: C.radiusSm, marginBottom: 10, cursor: 'pointer', border: '1.5px solid ' + (active ? BR : C.line), background: active ? `color-mix(in srgb, ${BR} 10%, ${C.surface})` : C.surface } },
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14.5, color: active ? BR : C.ink, marginBottom: 2 } }, p.name),
      React.createElement('div', { style: { fontSize: 12, color: C.ink3 } }, p.sub)),
    active ? React.createElement(Icon, { name: 'check', size: 18, color: BR }) : null)
}

function DurationPicker({ value, onChange }) {
  return React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 18 } },
    DURATIONS.map((d) => {
      const active = value === d
      return React.createElement('button', { key: d, onClick: () => onChange(d), style: { flex: 1, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14.5, border: '1.5px solid ' + (active ? BR : C.line), background: active ? BR : C.surface, color: active ? '#fff' : C.ink, cursor: 'pointer' } }, d + ' min')
    }))
}

// Session active : cercle animé + décompte.
function BreathingSession({ protocol, minutes, onFinish, onExit }) {
  const phasesRef = useRef(null)
  if (!phasesRef.current) {
    const seq = [{ name: 'inhale', secs: protocol.inhale, label: 'Inspire' }]
    if (protocol.hold > 0) seq.push({ name: 'hold', secs: protocol.hold, label: 'Retiens' })
    seq.push({ name: 'exhale', secs: protocol.exhale, label: 'Expire' })
    if (protocol.holdEnd > 0) seq.push({ name: 'holdEnd', secs: protocol.holdEnd, label: 'Retiens' })
    phasesRef.current = seq
  }
  const [st, setSt] = useState({ phaseIdx: 0, secLeft: phasesRef.current[0].secs, totalLeft: minutes * 60, done: false })

  useEffect(() => {
    if (st.done) return
    const seq = phasesRef.current
    const timer = setInterval(() => {
      setSt((prev) => {
        if (prev.done) return prev
        const totalLeft = prev.totalLeft - 1
        if (totalLeft <= 0) return { phaseIdx: prev.phaseIdx, secLeft: 0, totalLeft: 0, done: true }
        let secLeft = prev.secLeft - 1
        let phaseIdx = prev.phaseIdx
        if (secLeft <= 0) { phaseIdx = (prev.phaseIdx + 1) % seq.length; secLeft = seq[phaseIdx].secs }
        return { phaseIdx, secLeft, totalLeft, done: false }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [st.done])

  useEffect(() => {
    if (st.done) { const t = setTimeout(() => onFinish(), 1800); return () => clearTimeout(t) }
  }, [st.done])

  const seq = phasesRef.current
  const curPhase = seq[st.phaseIdx]
  const scale = curPhase.name === 'inhale' ? 1.35 : curPhase.name === 'exhale' ? 0.78 : 1.06
  const mm = Math.floor(st.totalLeft / 60), ss = st.totalLeft % 60
  const timeLabel = mm + ':' + (ss < 10 ? '0' : '') + ss

  if (st.done) {
    return React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, minHeight: '70vh' } },
      React.createElement('div', { style: { width: 64, height: 64, borderRadius: 999, background: `color-mix(in srgb, ${BR} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: 'check', size: 30, color: BR })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 19 } }, 'Séance terminée'),
      React.createElement('div', { style: { fontSize: 13.5, color: C.ink3 } }, minutes + ' minute' + (minutes > 1 ? 's' : '') + ' de respiration guidée'))
  }

  return React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '70vh' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
      React.createElement('button', { onClick: onExit, style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, React.createElement(Icon, { name: 'close', size: 18 })),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, color: C.ink3 } }, timeLabel)),
    React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
      React.createElement('div', { style: { width: 180, height: 180, borderRadius: 999, background: `color-mix(in srgb, ${BR} 22%, ${C.surface})`, border: `2px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${scale})`, transition: `transform ${curPhase.secs}s ease-in-out`, marginBottom: 28 } },
        React.createElement('span', { style: { fontFamily: C.font, fontWeight: 800, fontSize: 30, color: BR } }, st.secLeft)),
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 21, color: C.ink } }, curPhase.label)))
}

// Préparation mentale : techniques de psychologie du sport.
const MENTAL_TECHNIQUES = [
  { id: 'imagery', ic: 'target', name: 'Imagerie mentale', phase: 'avant', niveau: 'Preuve bonne (combinée à la pratique réelle)', source: 'Holmes & Collins 2001 (PETTLEP)', desc: 'Visualise ton geste ou ta course en détail : sensations corporelles, environnement, rythme. Plus l’imagerie est concrète et multisensorielle, plus l’effet est documenté.', script: ['Installe-toi confortablement, yeux fermés.', 'Visualise le contexte réel : lieu, bruits, météo, échauffement.', 'Imagine le mouvement ou l’effort en détail, à la vitesse réelle.', 'Ressens les sensations : respiration, appuis, tension musculaire.', 'Termine sur une image de réussite et de calme.'] },
  { id: 'selftalk', ic: 'spark', name: 'Auto-discours', phase: 'avant', niveau: 'Preuve petite à modérée mais réplicable', source: 'Hatzigeorgiadis et al., méta-analyse 2011', desc: 'Le discours intérieur influence la performance. Deux types validés : instructionnel (focus technique) et motivationnel (encouragement), à utiliser selon la tâche.', script: ['Choisis 1-2 mots clés techniques (ex: « relâché », « grand »).', 'Répète-les au moment précis du geste, pas en continu.', 'En cas de doute/fatigue : phrase motivationnelle courte et personnelle.', 'Évite la négation (« ne pas ») : formule en positif.'] },
  { id: 'goals', ic: 'check', name: 'Objectifs SMART', interactive: 'smart', phase: 'avant', niveau: 'Preuve solide, parmi les plus robustes en psychologie de la performance', source: 'Locke & Latham 1990 / 2002', desc: 'Un objectif spécifique et mesurable améliore la performance bien plus qu’un objectif vague (« faire de mon mieux »). L’effet est l’un des plus répliqués en psychologie appliquée.', script: [] },
  { id: 'confidence', ic: 'flame', name: 'Confiance & auto-efficacité', phase: 'avant', niveau: 'Cadre théorique solide, effets variables selon le contexte', source: 'Bandura 1977 / 1997', desc: 'La confiance en sa capacité à réussir une tâche précise (pas la confiance générale) repose sur 4 sources identifiées, par ordre d’influence.', script: ['Expériences de maîtrise : repense à une réussite passée similaire, même petite.', 'Modelage social : observe ou repense à quelqu’un qui a réussi une tâche comparable.', 'Persuasion verbale : un encouragement crédible de quelqu’un dont l’avis compte pour toi.', 'États physiologiques : interprète les sensations de stress comme de l’activation, pas de la peur.'] },
  { id: 'routine', ic: 'check', name: 'Routine pré-performance', phase: 'avant', niveau: 'Bonne preuve sur la régulation de l’anxiété', source: 'Cotterill 2010', desc: 'Une séquence d’actions fixe avant l’effort (physique + mentale) réduit l’incertitude et stabilise la concentration, surtout dans les moments à enjeu.', script: ['Définis une séquence courte et reproductible (5-10 min avant l’effort).', 'Inclus : échauffement physique, 1 repère mental, 1 respiration.', 'Répète-la à l’identique à chaque fois, entraînement comme compétition.', 'Ajuste-la progressivement, jamais le jour J.'] },
  { id: 'attention', ic: 'search', name: 'Focus attentionnel', phase: 'pendant', niveau: 'Preuve solide sur le focus externe ; nuancée pour association/dissociation', source: 'Morgan & Pollock 1977 ; Wulf', desc: 'Deux leviers distincts : (1) focus externe (sur l’effet du geste, pas sur le corps) > focus interne pour la plupart des tâches motrices ; (2) dissociation (penser à autre chose) aide sur les efforts longs et sous-maximaux, l’association reprend l’avantage à haute intensité ou en fin de course.', script: ['Effort sous-maximal/long : laisse l’esprit vagabonder ou utilise un repère externe (paysage, musique).', 'Effort intense ou décisif : reviens sur les sensations et la technique — l’association protège mieux à ce moment-là.', 'Sur un geste technique précis, pense à l’effet recherché (« pousse le sol ») plutôt qu’au mouvement du corps lui-même.', 'Teste les deux à l’entraînement pour savoir ce qui te convient selon le contexte.'] },
  { id: 'flow', ic: 'bolt', name: 'État de flow', phase: 'pendant', niveau: 'Modèle théorique bien établi, conditions d’apparition documentées', source: 'Csikszentmihalyi 1990', desc: 'État d’absorption totale dans l’action, sensation de fluidité et de contrôle. Apparaît surtout quand le défi perçu et le niveau de compétence sont équilibrés — ni trop facile (ennui), ni trop dur (anxiété).', script: ['Ajuste la difficulté à ton niveau du jour : ni trop simple, ni hors de portée.', 'Fixe un objectif clair et immédiat pour cette séance précise.', 'Élimine les distractions évitables avant de commencer.', 'Accepte de ne pas « forcer » le flow : il vient en conséquence des conditions, pas sur commande.'] },
  { id: 'pain', ic: 'heart', name: 'Gestion de la douleur perçue', phase: 'pendant', niveau: 'Preuve modérée, stratégies cognitives validées', source: 'Tenenbaum & Hutchinson', desc: 'La sensation d’effort/douleur est en partie modulable par l’attention et l’interprétation. Recadrer plutôt que supprimer ou ignorer est l’approche la mieux soutenue.', script: ['Nomme la sensation sans l’amplifier (« mes jambes brûlent » plutôt que « je n’en peux plus »).', 'Découpe l’effort restant en segments courts plutôt que de penser à la distance totale.', 'Utilise un mot-clé associatif (« relâche », « pousse ») au moment le plus dur.', 'Distingue inconfort attendu (normal) et douleur anormale (signal d’arrêt — ne jamais ignorer).'] },
  { id: 'mindfulness', ic: 'leaf', name: 'Pleine conscience', phase: 'avant', niveau: 'Preuve modérée, recherche active', source: 'Kaufman et al. (MSPE) ; Birrer et al. 2012', desc: 'Observer ses pensées et sensations sans jugement, plutôt que les combattre. Utile face à la rumination ou la pression de performance.', script: ['Assieds-toi, attention sur la respiration, sans la contrôler.', 'Quand une pensée arrive (doute, pression), note-la sans la juger.', 'Reviens à la respiration ou aux sensations du corps.', '5 minutes suffisent pour commencer ; régularité > durée.'] },
]

function SmartGoalForm() {
  const [f, setF] = useState({ s: '', m: '', a: '', r: '', t: '' })
  const FIELDS = [
    { k: 's', label: 'Spécifique', ph: 'Quoi exactement ? (ex: courir 10 km)' },
    { k: 'm', label: 'Mesurable', ph: 'Comment tu sais que c’est réussi ? (ex: en moins de 55 min)' },
    { k: 'a', label: 'Atteignable', ph: 'Réaliste avec ton niveau actuel ?' },
    { k: 'r', label: 'Pertinent', ph: 'Pourquoi c’est important pour toi ?' },
    { k: 't', label: 'Temporel', ph: 'Pour quand ? (ex: dans 6 semaines)' },
  ]
  const filled = FIELDS.filter((x) => f[x.k].trim().length > 0).length
  return React.createElement('div', null,
    FIELDS.map((x) => React.createElement('div', { key: x.k, style: { marginBottom: 10 } },
      React.createElement('label', { style: { fontSize: 11.5, fontWeight: 700, color: BR, display: 'block', marginBottom: 4 } }, x.label),
      React.createElement('input', { type: 'text', value: f[x.k], placeholder: x.ph, onChange: (e) => setF({ ...f, [x.k]: e.target.value }), style: { width: '100%', padding: '9px 11px', borderRadius: 9, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 13.5, boxSizing: 'border-box' } }))),
    filled === 5
      ? React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 9, marginTop: 6, background: `color-mix(in srgb, ${BR} 12%, ${C.surface})` } },
          React.createElement(Icon, { name: 'check', size: 15, color: BR, style: { flex: '0 0 auto', marginTop: 1 } }),
          React.createElement('p', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.4 } }, 'Objectif complet. Note-le quelque part de visible — l’écrire renforce l’engagement.'))
      : React.createElement('p', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4 } }, filled + '/5 champs remplis · pas sauvegardé, à noter ailleurs une fois terminé'))
}

function TechniqueCard({ t, open, onToggle }) {
  return React.createElement('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, marginBottom: 10, overflow: 'hidden' } },
    React.createElement('button', { onClick: onToggle, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', cursor: 'pointer', background: 'transparent', border: 'none' } },
      React.createElement('div', { style: { width: 36, height: 36, borderRadius: 11, flex: '0 0 auto', background: `color-mix(in srgb, ${BR} 14%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: t.ic, size: 17, color: BR })),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 14.5 } }, t.name),
        React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 1 } }, t.niveau)),
      React.createElement('div', { style: { transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s ease' } }, React.createElement(Icon, { name: 'next', size: 16, color: C.ink3 }))),
    open ? React.createElement('div', { style: { padding: '0 16px 16px' } },
      React.createElement('p', { style: { fontSize: 13, color: C.ink2, lineHeight: 1.5, marginBottom: 12 } }, t.desc),
      t.interactive === 'smart'
        ? React.createElement(SmartGoalForm, null)
        : React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Pour commencer'),
            t.script.map((s, i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: C.ink2, lineHeight: 1.4 } },
              React.createElement('span', { style: { fontWeight: 700, color: BR, flex: '0 0 auto' } }, (i + 1) + '.'),
              React.createElement('span', null, s)))),
      React.createElement('div', { style: { fontSize: 11, color: C.ink3, marginTop: 10, fontStyle: 'italic' } }, t.source)) : null)
}

function MentalTab() {
  const [openId, setOpenId] = useState(null)
  const card = (t) => React.createElement(TechniqueCard, { key: t.id, t, open: openId === t.id, onToggle: () => setOpenId(openId === t.id ? null : t.id) })
  return React.createElement('div', null,
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: BR, color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } }, React.createElement(Icon, { name: 'target', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 700, lineHeight: 1.15 } }, 'Prépare ta tête'),
      React.createElement('p', { style: { fontSize: 14, opacity: .92, marginTop: 7, lineHeight: 1.5 } }, 'Techniques de psychologie du sport pour la concentration, la confiance et la gestion de la pression avant un effort important.')),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Avant l’effort'),
    MENTAL_TECHNIQUES.filter((t) => t.phase === 'avant').map(card),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10, marginTop: 14 } }, 'Pendant l’effort'),
    MENTAL_TECHNIQUES.filter((t) => t.phase === 'pendant').map(card),
    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, marginTop: 8, background: `color-mix(in srgb, ${BR} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${BR} 22%, ${C.line})` } },
      React.createElement(Icon, { name: 'search', size: 16, color: BR, style: { flex: '0 0 auto', marginTop: 2 } }),
      React.createElement('p', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'Effets en moyenne de population, variables selon l’individu et la régularité de pratique. Ne remplacent pas un accompagnement par un psychologue du sport en cas de difficulté marquée.')))
}

function BreathingTab({ proto, setProto, mins, setMins, onStart }) {
  return React.createElement('div', null,
    React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: BR, color: '#fff', marginBottom: 18 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 } }, React.createElement(Icon, { name: 'wave', size: 24, color: '#fff' })),
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 700, lineHeight: 1.15 } }, 'Régule ton stress'),
      React.createElement('p', { style: { fontSize: 14, opacity: .92, marginTop: 7, lineHeight: 1.5 } }, 'Respiration guidée avec minuteur visuel. Quelques minutes suffisent pour ralentir avant un effort, après une journée chargée, ou avant de dormir.')),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Choisis ton protocole'),
    PROTOCOLS.map((p) => React.createElement(ProtocolCard, { key: p.id, p, active: proto.id === p.id, onClick: () => setProto(p) })),
    React.createElement('p', { style: { fontSize: 12.5, color: C.ink3, lineHeight: 1.5, marginBottom: 18 } }, proto.desc),
    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 } }, 'Durée'),
    React.createElement(DurationPicker, { value: mins, onChange: setMins }),
    React.createElement('button', { onClick: onStart, style: { width: '100%', padding: 16, borderRadius: C.radiusSm, border: 'none', background: BR, color: '#fff', fontWeight: 700, fontSize: 15.5, cursor: 'pointer', boxShadow: `0 12px 26px -14px ${BR}` } }, 'Commencer'),
    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, marginTop: 14, background: `color-mix(in srgb, ${BR} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${BR} 22%, ${C.line})` } },
      React.createElement(Icon, { name: 'search', size: 16, color: BR, style: { flex: '0 0 auto', marginTop: 2 } }),
      React.createElement('p', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.45 } }, 'Niveau de preuve modéré-bon sur le stress perçu à court terme (Lehrer & Gevirtz 2014). Outil de régulation ponctuelle, pas un substitut à une prise en charge du stress chronique ou de l’anxiété.')))
}

export default function BreathingSpace({ onClose }) {
  const [tab, setTab] = useState('breathing')
  const [proto, setProto] = useState(PROTOCOLS[0])
  const [mins, setMins] = useState(5)
  const [inSession, setInSession] = useState(false)

  if (inSession) {
    return React.createElement('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', padding: '20px 22px', fontFamily: C.font } },
      React.createElement(BreathingSession, { protocol: proto, minutes: mins, onFinish: () => setInSession(false), onExit: () => setInSession(false) }))
  }

  const TABS = [{ id: 'breathing', lab: 'Respiration', ic: 'wave' }, { id: 'mental', lab: 'Préparation mentale', ic: 'target' }]
  return React.createElement(FlowSpace, { title: 'Esprit & performance', onClose, tint: BR },
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0 18px' } },
      TABS.map((it) => {
        const active = tab === it.id
        return React.createElement('button', { key: it.id, onClick: () => setTab(it.id), style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', borderRadius: 14, border: '1.5px solid ' + (active ? BR : C.line), background: active ? `color-mix(in srgb, ${BR} 11%, ${C.surface})` : C.surface, color: active ? BR : C.ink, fontWeight: 700, fontSize: 13.5, textAlign: 'left', cursor: 'pointer' } },
          React.createElement('span', { style: { width: 30, height: 30, borderRadius: 9, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? BR : `color-mix(in srgb, ${BR} 13%, ${C.surface})`, color: active ? '#fff' : BR } }, React.createElement(Icon, { name: it.ic, size: 16 })), it.lab)
      })),
    tab === 'mental'
      ? React.createElement(MentalTab, null)
      : React.createElement(BreathingTab, { proto, setProto, mins, setMins, onStart: () => setInSession(true) }))
}
