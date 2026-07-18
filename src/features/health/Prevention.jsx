import React, { useState, useEffect } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, MODULE_TINTS, Icon, FlowSpace, SpaceBanner, SecLab, NoteBox, SegTabs, isoToday } from './kit'

const PREV = MODULE_TINTS.prevention

const QUIZ = [
  { theme: 'Antécédents', q: 'Une blessure liée à la course dans les 12 derniers mois ?', opts: [['Non', 0], ['Oui', 3]] },
  { theme: 'Antécédents', q: 'Déjà eu une fracture de fatigue ?', opts: [['Non', 0], ['Oui', 3]], bone: true },
  { theme: 'Charge', q: 'Volume augmenté de plus de ~10 % sur 2 semaines ?', opts: [['Non', 0], ['Oui', 3]], tag: 'charge' },
  { theme: 'Charge', q: 'Jours de repos complets par semaine ?', opts: [['2+', 0], ['1', 1], ['0', 3]], tag: 'charge' },
  { theme: 'Récupération', q: 'Heures de sommeil par nuit ?', opts: [['7–9 h', 0], ['6–7 h', 1], ['< 6 h', 3]], tag: 'recup' },
  { theme: 'Récupération', q: 'Fatigue persistante, courbatures qui traînent, motivation en baisse ?', opts: [['Non', 0], ['Oui', 3]], tag: 'recup' },
  { theme: 'Énergie', q: 'Penses-tu manger assez pour couvrir ton entraînement ?', opts: [['Oui', 0], ['Pas sûr', 3]], tag: 'energie', soft: true },
  { theme: 'Force', q: 'Équilibre sur une jambe, yeux ouverts :', opts: [['> 30 s', 0], ['10–30 s', 1], ['< 10 s', 3]], tag: 'prop' },
  { theme: 'Force', q: 'Au squat sur une jambe, ton genou rentre vers l’intérieur ?', opts: [['Non', 0], ['Un peu', 1], ['Oui', 3]], tag: 'hanche' },
  { theme: 'Force', q: 'Tu fais du renforcement musculaire…', opts: [['2+/sem', 0], ['Parfois', 1], ['Jamais', 3]], tag: 'hanche' },
  { theme: 'Matériel', q: 'Âge de tes chaussures de course ?', opts: [['< 500 km', 0], ['500–800 km', 1], ['> 800 km / usées', 3]] },
  { theme: 'Échauffement', q: 'Tu t’échauffes avant les séances intenses ?', opts: [['Toujours', 0], ['Parfois', 1], ['Rarement', 3]], tag: 'echauffement' },
  { theme: 'Charge', q: 'Ajout récent de fractionné, côtes ou vitesse ?', opts: [['Non', 0], ['Un peu', 1], ['Beaucoup', 3]], tag: 'charge' },
  { theme: 'Terrain', q: 'Tu cours surtout sur…', opts: [['Surfaces variées', 0], ['Surtout du dur (bitume)', 1], ['Changement récent de surface', 3]], tag: 'terrain' },
  { theme: 'Matériel', q: 'Changement récent de chaussures (modèle / drop) ?', opts: [['Non', 0], ['Oui, progressif', 1], ['Oui, brutal', 3]], tag: 'materiel' },
  { theme: 'Mobilité', q: 'Mobilité de cheville (genou vers l’avant, talon au sol) :', opts: [['Ample', 0], ['Limite', 1], ['Très raide', 3]], tag: 'cheville' },
  { theme: 'Mobilité', q: 'Souplesse ischios / mollets ?', opts: [['Bonne', 0], ['Moyenne', 1], ['Raide', 3]], tag: 'mobilite' },
  { theme: 'Force', q: 'Gainage : tu tiens la planche…', opts: [['> 45 s', 0], ['20–45 s', 1], ['< 20 s', 3]], tag: 'core' },
  { theme: 'Technique', q: 'Ta foulée :', opts: [['Cadence élevée, foulée courte', 0], ['Moyenne', 1], ['Grandes enjambées, talon marqué', 3]], tag: 'technique' },
  { theme: 'Antécédents', q: 'Une zone qui se rappelle souvent à toi (genou, tendon d’Achille, tibia) ?', opts: [['Non', 0], ['Une zone', 1], ['Oui, récurrente', 3]], tag: 'antecedent' },
  { theme: 'Récupération', q: 'Reprise après une maladie / blessure récente ?', opts: [['Non concerné', 0], ['Oui, progressive', 1], ['Oui, direct comme avant', 3]], tag: 'recup' },
  { theme: 'Douleur', q: 'Raideur douloureuse au premier pas le matin (talon / tendon) ?', opts: [['Non', 0], ['Parfois', 1], ['Souvent', 3]], tag: 'antecedent' },
  { theme: 'Douleur', q: 'As-tu une douleur en ce moment ?', opts: [['Non', 0], ['Oui, gêne stable', 1], ['Oui, vive / au repos', 3]], flag: true, painGate: true },
  { theme: 'Douleur', q: 'Dans quelle zone, précisément ?', opts: [['Pied / orteils', 0, 'pied'], ['Talon / dessous du pied', 0, 'talon'], ['Cheville', 0, 'cheville'], ['Tibia / mollet', 0, 'jambe'], ['Genou', 0, 'genou'], ['Cuisse avant (quadriceps)', 0, 'quadri'], ['Cuisse arrière (ischio)', 0, 'ischio'], ['Hanche / bassin', 0, 'hanche'], ['Bas du dos', 0, 'dos']], painOnly: true, tag: 'pain_region' },
  { theme: 'Douleur', q: 'Ça ressemble plutôt à…', opts: [['De l’os (dur, très localisé)', 3, 'os'], ['Un tendon (raide le matin)', 2, 'tendon'], ['Un muscle (corps du muscle)', 1, 'muscle'], ['Une articulation (dans le joint)', 2, 'articulation'], ['Sous le pied, comme une lame', 2, 'fascia']], painOnly: true, tag: 'pain_struct', flag: true },
  { theme: 'Douleur', q: 'Peux-tu la pointer avec un doigt ?', opts: [['Oui, un point précis', 3, 'precis'], ['Une petite zone', 1, 'zone'], ['Diffuse, large', 0, 'diffuse']], painOnly: true, tag: 'pain_point', flag: true },
  { theme: 'Douleur', q: 'Qu’est-ce qui la déclenche le plus ?', opts: [['L’impact / la course', 2, 'impact'], ['Montées-descentes, escaliers', 1, 'pente'], ['S’accroupir, plier le genou', 1, 'flexion'], ['Les premiers pas du matin', 1, 'matin'], ['La pression / l’appui dessus', 1, 'appui']], painOnly: true, tag: 'pain_trigger' },
  { theme: 'Douleur', q: 'Quand fait-elle mal ?', opts: [['Après l’effort seulement', 1, 'apres'], ['À l’échauffement puis ça passe', 1, 'echauf'], ['Pendant tout l’effort', 2, 'pendant'], ['Au repos ou la nuit', 3, 'repos']], painOnly: true, tag: 'pain_when', flag: true },
  { theme: 'Douleur', q: 'Gonflement, rougeur ou chaleur ?', opts: [['Non', 0, 'non'], ['Un peu', 1, 'peu'], ['Oui, net', 2, 'oui']], painOnly: true, tag: 'pain_swell' },
  { theme: 'Douleur', q: 'Intensité quand c’est au pire ?', opts: [['Légère (gêne)', 1, 'leg'], ['Modérée (gêne la course)', 2, 'mod'], ['Forte (m’empêche de courir)', 3, 'fort']], painOnly: true, tag: 'pain_intensity', flag: true },
  { theme: 'Douleur', q: 'Hausse de charge ou nouveauté juste avant ?', opts: [['Non', 0, 'non'], ['Oui (volume, vitesse, terrain, chaussures)', 2, 'oui']], painOnly: true, tag: 'pain_load' },
  { theme: 'Douleur', q: 'Depuis combien de temps ?', opts: [['Quelques jours', 1, 'recent'], ['1 à 3 semaines', 2, 'sub'], ['Plus de 3 semaines', 3, 'chronique']], painOnly: true, tag: 'pain_dur' },
  { theme: 'Douleur', q: 'Elle évolue plutôt…', opts: [['S’améliore', 0, 'mieux'], ['Stable', 1, 'stable'], ['Empire', 3, 'pire']], painOnly: true, tag: 'pain_evo', flag: true },
]

const RECO = {
  charge: 'Charge en hausse → progression plus graduelle (~10 %/sem max) + jours de repos.',
  recup: 'Récup/sommeil à soigner → vise 7–9 h, ajoute mobilité et une vraie journée off.',
  energie: 'Énergie → vérifie tes apports (onglet Nutrition). En cas de doute, parles-en à un professionnel.',
  prop: 'Équilibre faible → travaille la proprioception (équilibre unipodal, surfaces instables).',
  hanche: 'Hanche/valgus → renforce abducteurs et fessiers (coquille, abductions, pont).',
  echauffement: 'Échauffement → 5–10 min progressif + quelques gammes avant les séances intenses.',
  terrain: 'Terrain → varie les surfaces et introduis tout changement progressivement.',
  materiel: 'Chaussures → change de modèle en douceur (alterne ancien/nouveau sur 2–3 semaines).',
  cheville: 'Cheville raide → mobilité de cheville (genou au mur, fentes mobiles, mollets).',
  mobilite: 'Souplesse limitée → mobilité ciblée ischios/mollets/hanches au quotidien.',
  core: 'Gainage faible → renforce le tronc (planches, dead bug, anti-rotation).',
  technique: 'Foulée → vise une cadence un peu plus élevée et un appui sous le centre de gravité.',
  antecedent: 'Zone sensible récurrente → renfo ciblé + surveille la charge ; si ça revient, bilan pro.',
}

function painAdvice(k) {
  const { region: r, struct: st, point: pt, trigger: tg, when: wn, swell: sw, evo: ev, dur: du, load: ld } = k
  const c = []
  let orientation = ''
  let urgent = false
  const bone = st === 'os'
  if (bone && pt === 'precis' && (tg === 'impact' || ld === 'oui')) {
    urgent = true
    orientation = 'Douleur osseuse en un point précis' + (r === 'jambe' ? ' du tibia' : r === 'pied' ? ' du pied' : '') + ', aggravée par l’impact' + (ld === 'oui' ? ' après une hausse de charge' : '') + ' : ces signes peuvent évoquer une fracture de fatigue.'
    c.push('Arrête la course et les impacts dès maintenant.')
    c.push('Consulte un médecin rapidement (un avis et une imagerie peuvent être utiles).')
    c.push('En attendant, garde si possible une activité sans impact et indolore (vélo, natation).')
  } else if (bone && r === 'jambe') {
    orientation = 'Douleur osseuse diffuse le long du bord interne du tibia : souvent compatible avec une périostite tibiale.'
    c.push('Réduis le volume et les impacts, privilégie les surfaces souples.')
    c.push('Renforce mollets et pieds, glace après l’effort, reprise très progressive.')
    c.push('Si la douleur se concentre en un point précis ou empire → avis médical (fracture de fatigue).')
  } else if (st === 'tendon' && (r === 'cheville' || r === 'jambe')) {
    orientation = 'Douleur au tendon d’Achille' + (wn === 'echauf' ? ', qui se déroulle à l’échauffement' : '') + ' : profil de tendinopathie d’Achille.'
    c.push('Évite à-coups, côtes et vitesse le temps que ça se calme.')
    c.push('Isométriques du mollet (montées sur pointes tenues 30–45 s), indolores, puis renfo progressif.')
    c.push('Évite les étirements brusques et le pied nu sur surfaces dures.')
  } else if (st === 'tendon' && r === 'genou') {
    orientation = 'Douleur sous la rotule : profil de tendinopathie rotulienne (genou du sauteur).'
    c.push('Réduis sauts et pliométrie ; renfo isométrique des quadriceps, indolore.')
    c.push('Charge progressive, évite les flexions profondes douloureuses.')
  } else if (st === 'articulation' && r === 'genou' && (tg === 'pente' || tg === 'flexion')) {
    orientation = 'Douleur à l’avant du genou (escaliers, descentes, position fléchie) : profil de syndrome fémoro-patellaire.'
    c.push('Renforce quadriceps et fessiers ; évite temporairement descentes et flexions douloureuses.')
    c.push('Réduis le dénivelé, garde une foulée souple, pas d’étirement douloureux.')
  } else if (st === 'fascia' || (r === 'talon' && tg === 'matin')) {
    orientation = 'Douleur sous le talon / la voûte, marquée aux premiers pas du matin : profil de fasciite plantaire.'
    c.push('Étire mollet et fascia, masse la voûte (balle / bouteille gelée), chaussage amorti.')
    c.push('Évite la marche pieds nus sur sol dur ; reprends la course progressivement.')
  } else if (st === 'muscle') {
    orientation = 'Douleur dans le corps du muscle : plutôt d’origine musculaire (contracture, courbature, voire élongation si apparue brutalement).'
    c.push('Repos relatif, chaleur et auto-massage doux, hydratation.')
    c.push('Reprise progressive et indolore ; douleur vive survenue en pleine course → repos, glace, avis.')
  } else if (st === 'articulation') {
    orientation = 'Douleur articulaire : à surveiller, surtout en cas de gonflement ou de blocage.'
    c.push('Évite ce qui la déclenche, glace en cas de gonflement.')
    c.push('Blocage, instabilité ou gonflement net → consulte.')
  } else {
    orientation = 'Profil peu spécifique : reste prudent et observe l’évolution.'
    c.push('Réduis la charge, soigne récupération et sommeil, ré-évalue dans quelques jours.')
  }
  if (sw === 'oui') c.push('Gonflement / chaleur nets : glace, surélévation, et avis médical si ça ne régresse pas.')
  if (wn === 'repos') { c.push('Douleur au repos ou la nuit : signe à ne pas négliger → avis d’un professionnel.'); if (bone) urgent = true }
  if (ev === 'pire' || du === 'chronique') c.push('Si ça empire ou dure plus de 2–3 semaines, consulte un professionnel.')
  return { orientation, conseils: c, urgent }
}

const btnStyle = { display: 'flex', alignItems: 'center', gap: 13, padding: 16, borderRadius: C.radiusSm, background: C.surface, width: '100%', cursor: 'pointer' }
const primaryBtn = { width: '100%', padding: 16, borderRadius: 999, border: 'none', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', background: PREV, boxShadow: `0 12px 26px -14px ${PREV}` }
const ghostBtn = { width: '100%', padding: 16, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }

function BilanTab({ db, store }) {
  const [step, setStep] = useState(-1)
  const [ans, setAns] = useState({})
  const gateIdx = QUIZ.findIndex((q) => q.painGate)
  const hasPain = gateIdx >= 0 && ans[gateIdx] != null && QUIZ[gateIdx].opts[ans[gateIdx]][1] > 0
  const visible = (i) => !QUIZ[i].painOnly || hasPain

  // Résultat calculé (utilisé par le rendu ET l'effet de persistance).
  const atResults = step >= QUIZ.length
  const result = React.useMemo(() => {
    if (!atResults) return null
    let score = 0, maxv = 0, flag = false, bone = false
    const tags = new Set()
    QUIZ.forEach((qq, i) => {
      if (!visible(i)) return
      maxv += Math.max(...qq.opts.map((o) => o[1]))
      const ai = ans[i]
      if (ai == null) return
      const val = qq.opts[ai][1]
      score += val
      if (qq.flag && val >= 3) flag = true
      if (qq.bone && val >= 3) bone = true
      if (qq.tag && !qq.painOnly && val >= 2) tags.add(qq.tag)
    })
    const ratio = maxv > 0 ? score / maxv : 0
    const level = ratio < 0.18 ? { l: 'Faible', t: '#5b8a72', d: 'Entretien : mobilité + renfo préventif 2×/sem.' }
      : ratio < 0.4 ? { l: 'Modéré', t: '#6f8a3a', d: 'Cible tes points faibles ci-dessous et revois ta progression de charge.' }
      : { l: 'Élevé', t: '#b5566a', d: 'Prudence : réduis la charge, priorise les corrections, envisage un bilan pro.' }
    const optOf = (tag) => { const i = QUIZ.findIndex((q) => q.tag === tag); return i < 0 || ans[i] == null ? null : QUIZ[i].opts[ans[i]] }
    const PAIN_TAGS = ['pain_region', 'pain_struct', 'pain_point', 'pain_trigger', 'pain_when', 'pain_swell', 'pain_intensity', 'pain_load', 'pain_dur', 'pain_evo']
    const painParts = PAIN_TAGS.map((t) => { const o = optOf(t); return o ? o[0] : null }).filter(Boolean)
    const pk = {}
    PAIN_TAGS.forEach((t) => { const o = optOf(t); if (o) pk[t.replace('pain_', '')] = o[2] })
    const adv = hasPain ? painAdvice(pk) : null
    return { ratio, level, tags, flag, bone, painParts, pk, adv }
  }, [atResults, ans, hasPain])

  // Persistance du bilan dans le store (effet toujours appelé, jamais conditionnel).
  useEffect(() => {
    if (!result || !store) return
    store.set({ prevention: {
      date: isoToday(), score: Math.round(result.ratio * 100), level: result.level.l, tags: [...result.tags],
      pain: hasPain ? { active: true, region: result.pk.region || null, struct: result.pk.struct || null, urgent: !!(result.adv && result.adv.urgent), flag: !!result.flag, recordedAt: Date.now() } : null,
    } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.level.l, hasPain, result?.flag, result?.ratio])

  const advance = (from, na) => {
    const pain = gateIdx >= 0 && na[gateIdx] != null && QUIZ[gateIdx].opts[na[gateIdx]][1] > 0
    const vis = (i2) => !QUIZ[i2].painOnly || pain
    let i = from + 1
    while (i < QUIZ.length && !vis(i)) i++
    setStep(i)
  }
  const goPrev = (from) => { let i = from - 1; while (i >= 0 && !visible(i)) i--; setStep(Math.max(0, i)) }
  const visCount = QUIZ.filter((q, i) => visible(i)).length
  const baseCount = QUIZ.filter((q) => !q.painOnly).length
  const posOf = (idx) => QUIZ.filter((q, j) => j <= idx && visible(j)).length

  if (step === -1) {
    return React.createElement('div', null,
      React.createElement(SpaceBanner, { ic: 'shield', tint: PREV, title: 'Bilan de prévention', text: `${baseCount} questions pour situer ton risque de blessure, plus quelques-unes ciblées si tu as une douleur. Ce n’est pas un diagnostic.` }),
      React.createElement('button', { onClick: () => setStep(0), style: primaryBtn }, 'Commencer le bilan'),
      React.createElement(NoteBox, { tint: PREV }, "Outil d'orientation. En cas de douleur qui empire, qui réveille la nuit, sur un point précis ou sur l'os → consulte un professionnel."))
  }

  if (atResults && result) {
    const { level, tags, flag, bone, painParts, adv } = result
    return React.createElement('div', null,
      adv && adv.urgent && React.createElement('div', { style: { padding: '14px 16px', borderRadius: C.radiusSm, background: '#a23a4f', color: '#fff', marginBottom: 14, fontSize: 14, lineHeight: 1.5, fontWeight: 700 } }, "Signes à ne pas négliger : stoppe les impacts et demande l'avis d'un professionnel de santé sans tarder."),
      flag && !(adv && adv.urgent) && React.createElement('div', { style: { padding: '14px 16px', borderRadius: C.radiusSm, background: '#b5566a', color: '#fff', marginBottom: 14, fontSize: 14, lineHeight: 1.5, fontWeight: 600 } }, "Repos et avis d'un professionnel de santé recommandés — surtout en cas de douleur au repos, la nuit, sur un point précis ou sur l'os."),
      React.createElement('div', { style: { padding: 20, borderRadius: C.radius, background: level.t, color: '#fff', marginBottom: 16, textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.9 } }, 'Risque global'),
        React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 30, marginTop: 4 } }, level.l),
        React.createElement('p', { style: { fontSize: 14, opacity: 0.92, marginTop: 8, lineHeight: 1.5 } }, level.d)),
      hasPain && painParts.length > 0 && React.createElement('div', { style: { padding: 16, borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 14 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } }, 'Profil de ta douleur'),
        React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.5 } }, painParts.join(' · ')),
        adv && React.createElement('div', { style: { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.line}` } },
          React.createElement('div', { style: { fontSize: 14.5, color: C.ink, lineHeight: 1.5, fontWeight: 600, marginBottom: 9 } }, adv.orientation),
          React.createElement('ul', { style: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 } }, adv.conseils.map((cc, ci) => React.createElement('li', { key: ci, style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.45 } }, cc))),
          React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 11, fontStyle: 'italic' } }, 'Orientation, pas un diagnostic — en cas de doute, consulte.'))),
      bone && React.createElement(NoteBox, { tint: '#b5566a' }, 'Antécédent de fracture de fatigue : vigilance santé osseuse (énergie, calcium, vitamine D, sommeil). Toute douleur osseuse précise → consulte sans tarder.'),
      tags.size > 0 && React.createElement(React.Fragment, null,
        React.createElement(SecLab, null, 'Tes priorités'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 } },
          [...tags].map((t) => RECO[t] && React.createElement('div', { key: t, style: { display: 'flex', gap: 11, alignItems: 'flex-start', padding: '13px 14px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
            React.createElement('div', { style: { width: 30, height: 30, borderRadius: 9, flex: '0 0 auto', background: `color-mix(in srgb, ${PREV} 14%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement(Icon, { name: 'check', size: 16, color: PREV })),
            React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.45 } }, RECO[t]))))),
      React.createElement('button', { onClick: () => { setAns({}); setStep(-1) }, style: { ...ghostBtn, marginTop: 10 } }, 'Refaire le bilan'),
      hasPain && React.createElement('button', { onClick: () => store.set((s) => ({ prevention: { ...(s.prevention || {}), pain: null } })), style: { ...ghostBtn, marginTop: 8, color: C.ink3 } }, 'Marquer la douleur comme résolue'),
      React.createElement(NoteBox, { tint: PREV }, 'Ce bilan oriente la prévention ; il ne remplace pas un professionnel.'))
  }

  const qq = QUIZ[step]
  return React.createElement('div', null,
    React.createElement('div', { style: { height: 6, borderRadius: 999, background: C.surface2, overflow: 'hidden', marginBottom: 18 } },
      React.createElement('div', { style: { height: '100%', width: `${(posOf(step) - 1) / visCount * 100}%`, background: PREV, transition: 'width .25s ease' } })),
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: PREV, textTransform: 'uppercase', letterSpacing: '.04em' } }, qq.theme, ' · ', posOf(step), '/', visCount),
    React.createElement('h2', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 21, lineHeight: 1.25, margin: '8px 0 18px' } }, qq.q, qq.soft && React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: C.ink3 } }, ' (optionnel)')),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      qq.opts.map((o, i) => {
        const active = ans[step] === i
        return React.createElement('button', { key: i, onClick: () => { const na = { ...ans, [step]: i }; setAns(na); setTimeout(() => advance(step, na), 140) },
          style: { ...btnStyle, border: '1.5px solid ' + (active ? PREV : C.line), ...(active ? { background: `color-mix(in srgb, ${PREV} 8%, ${C.surface})` } : {}) } },
          React.createElement('span', { style: { width: 22, height: 22, borderRadius: 999, flex: '0 0 auto', border: '2px solid ' + (active ? PREV : C.line), background: active ? PREV : 'transparent' } }),
          React.createElement('span', { style: { fontWeight: 600, fontSize: 15.5 } }, o[0]))
      })),
    React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 18 } },
      step > 0 && React.createElement('button', { onClick: () => goPrev(step), style: { ...ghostBtn, flex: 1 } }, 'Retour'),
      qq.soft && React.createElement('button', { onClick: () => advance(step, ans), style: { ...ghostBtn, flex: 1 } }, 'Passer')))
}

const INJURIES = [
  { z: 'Genou', n: 'Syndrome rotulien', sy: 'Douleur sourde autour/derrière la rotule, pire aux squats, escaliers, position assise.', ca: 'Faiblesse hanches/cuisses, genou en valgus, hausse de volume rapide.', ai: 'Réduire la charge douloureuse, renfo hanches/fessiers et quadriceps.', pr: 'Abducteurs de hanche, pont fessier, progression du kilométrage.', co: 'Gonflement, blocage, instabilité, ou douleur > 1 semaine.' },
  { z: 'Genou', n: 'Essuie-glace (ITBS)', sy: 'Douleur sur l’extérieur du genou, souvent de pire en pire pendant la course.', ca: 'Faiblesse hanche latérale, descentes, dévers, pas trop croisé.', ai: 'Réduire descentes/volume, renfo des abducteurs.', pr: 'Moyen fessier, éviter le pas trop large et l’excès de descente.', co: 'Douleur latérale qui persiste malgré la baisse de charge.' },
  { z: 'Cheville', n: 'Tendinopathie d’Achille', sy: 'Raideur/douleur à l’arrière de la cheville, surtout le matin ; mollets tendus.', ca: 'Mollets raides, hausse de km, côtes/vitesse sans récup.', ai: 'Réduire le volume, heel drops excentriques, étirement du mollet.', pr: 'Excentrique du mollet, mobilité cheville, charge progressive.', co: 'Douleur brutale (suspicion de rupture) → urgence.' },
  { z: 'Pied', n: 'Aponévrosite plantaire', sy: 'Douleur talon/voûte, maximale aux premiers pas du matin.', ca: 'Perte de force du pied, mollets raides, hausse de charge.', ai: 'Étirement plantaire + mollet, renfo du pied.', pr: 'Renfo du pied, étirements, chaussures adaptées.', co: 'Douleur > quelques semaines malgré les soins.' },
  { z: 'Tibia', n: 'Périostite tibiale', sy: 'Douleur diffuse le long du bord interne du tibia.', ca: 'Hausse soudaine de volume, changement de surface.', ai: 'Adapter la charge, glace, renfo tibial et mollet.', pr: 'Progression graduelle, renfo pointe-talon.', co: 'Si la douleur devient un point précis → suspicion osseuse.' },
  { z: 'Mollet / ischio', n: 'Claquage / élongation', sy: 'Douleur brutale en sprint/accélération, parfois sensation de « coup ».', ca: 'Muscle faible ou fatigué, échauffement insuffisant.', ai: 'Repos relatif puis remise en charge progressive.', pr: 'Renfo excentrique, échauffement, puissance de hanche.', co: 'Douleur vive, hématome, perte de force → avis pro.' },
  { z: 'Cheville', n: 'Entorse', sy: 'Douleur, gonflement rapide, instabilité après un faux pas.', ca: 'Terrain accidenté, faiblesse des stabilisateurs, fatigue.', ai: 'Repos/glace/compression/élévation, puis rééducation proprio.', pr: 'Proprioception, renfo péroniers, vigilance en descente.', co: 'Impossibilité d’appuyer, gonflement important → écarter une fracture.' },
  { z: 'Hanche', n: 'Tendinopathie fessière', sy: 'Douleur sur le côté de la hanche, parfois couché sur le côté.', ca: 'Faiblesse abducteurs/moyen fessier, valgus dynamique.', ai: 'Renfo progressif des abducteurs, gestion de charge.', pr: 'Abductions, coquille, pont fessier unilatéral.', co: 'Douleur latérale de hanche persistante.' },
]

function BlessuresTab() {
  const [open, setOpen] = useState(null)
  const feux = [
    ['#5b8a72', 'Vert', 'Pas de douleur, ou gêne qui disparaît à l’échauffement → on continue.'],
    ['#6f8a3a', 'Jaune', 'Gêne légère et stable → on réduit le volume, on surveille, on traite la cause.'],
    ['#b5566a', 'Rouge', 'Douleur vive, qui s’aggrave ou persiste au repos → stop et avis médical.'],
  ]
  return React.createElement('div', null,
    React.createElement(SpaceBanner, { ic: 'shield', tint: PREV, title: 'Reconnaître & prévenir', text: "Pour chaque blessure : symptômes, causes, ce qui aide, prévention et quand consulter. ~70 % des blessures viennent d'une surcharge." }),
    React.createElement(SecLab, null, 'Le système des feux'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 } },
      feux.map(([col, l, d], i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}` } },
        React.createElement('span', { style: { width: 14, height: 14, borderRadius: 999, background: col, flex: '0 0 auto', marginTop: 3 } }),
        React.createElement('div', null, React.createElement('span', { style: { fontWeight: 700, fontSize: 14.5 } }, l), React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 1, lineHeight: 1.45 } }, d))))),
    React.createElement('div', { style: { padding: '14px 16px', borderRadius: C.radiusSm, background: 'color-mix(in srgb, #b5566a 9%, #fff)', border: '1px solid color-mix(in srgb, #b5566a 25%, #e6e3dd)', marginBottom: 18 } },
      React.createElement('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 15.5, color: '#b5566a' } }, 'Fracture de fatigue — à ne pas manquer'),
      React.createElement('div', { style: { fontSize: 13, color: C.ink2, marginTop: 5, lineHeight: 1.5 } }, "Douleur à l'impact du pied, point précis au toucher, qui revient à la reprise. Facteurs : hausse de charge, < 7 h de sommeil, déficit énergétique, manque de vitamine D. Dès la suspicion → consulte.")),
    React.createElement(SecLab, null, 'Fiches par blessure'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      INJURIES.map((it, i) => {
        const isOpen = open === i
        return React.createElement('div', { key: i, style: { borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, overflow: 'hidden' } },
          React.createElement('button', { onClick: () => setOpen(isOpen ? null : i), style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 14, background: 'transparent', border: 'none', cursor: 'pointer' } },
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: PREV, textTransform: 'uppercase', letterSpacing: '.03em' } }, it.z),
              React.createElement('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 16, marginTop: 1 } }, it.n)),
            React.createElement(Icon, { name: isOpen ? 'close' : 'next', size: 18, color: C.ink3 })),
          isOpen && React.createElement('div', { style: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 } },
            [['Symptômes', it.sy], ['Causes & facteurs', it.ca], ['Ce qui aide', it.ai], ['Prévention', it.pr], ['Quand consulter', it.co]].map(([k, v], j) =>
              React.createElement('div', { key: j },
                React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: k === 'Quand consulter' ? '#b5566a' : C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, k),
                React.createElement('div', { style: { fontSize: 13.5, color: C.ink2, marginTop: 1, lineHeight: 1.45 } }, v)))))
      })),
    React.createElement(NoteBox, { tint: PREV }, 'Sert à reconnaître et prévenir, pas à diagnostiquer. En cas de doute, on lève le pied — et on consulte.'))
}

export default function PreventionSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('bilan')
  if (loading) {
    return React.createElement(FlowSpace, { title: 'Prévention', onClose, tint: PREV }, React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }
  return React.createElement(FlowSpace, { title: 'Prévention', onClose, tint: PREV },
    React.createElement(SegTabs, { tint: PREV, value: tab, onChange: setTab, tabs: [{ id: 'bilan', lab: 'Bilan' }, { id: 'blessures', lab: 'Blessures' }] }),
    tab === 'bilan' && React.createElement(BilanTab, { db, store }),
    tab === 'blessures' && React.createElement(BlessuresTab, null))
}
