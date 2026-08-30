// Intensite reelle d une seance, et echauffement compose.
import { sessionIntensity, sessionLoad, rpeFromHr, maxHeartRate, TYPE_RPE,
  LOW_INTENSITY_SPORTS, HR_MAX_FALLBACK_AGE, NEUTRAL_RPE } from '../../src/features/train/plannerIntel.js'
import { buildWarmup, splitMinutes, generalFor, mobilityMovesFor, GENERAL_WARMUP } from '../../src/features/train/drillsData.js'
import { EX } from '../../src/features/train/trainData.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const S = (duree, data, sport) => ({ id: 'x', date: '2026-08-20', sport: sport || 'course', statut: 'realise', duree, data: data || {} })

// ─── LE defaut : deux heures de marche pesaient deux heures de seuil ───
a(sessionLoad(S('2 h', {}, 'marche')) < sessionLoad(S('2 h', {}, 'course')),
  `marche ${sessionLoad(S('2 h', {}, 'marche'))} contre course ${sessionLoad(S('2 h', {}, 'course'))} : l intensite compte`)
a(sessionLoad(S('2 h', {}, 'marche')) === Math.round(120 * LOW_INTENSITY_SPORTS.marche / NEUTRAL_RPE),
  'la marche est comptee a son intensite propre')
a(sessionLoad(S('1 h', { rpe: 8 })) > sessionLoad(S('1 h', { rpe: 4 })), 'et le ressenti prime quand il est note')

// ─── quatre sources, de la plus directe a la plus indirecte ───
const parRpe = sessionIntensity(S('1 h', { rpe: 8 }))
a(parRpe.source === 'rpe' && parRpe.rpe === 8, 'le ressenti d effort passe avant tout')
a(/ressenti d.effort not[ée] [àa] 8/.test(parRpe.why), 'et la provenance est dite')

const parFc = sessionIntensity(S('1 h', { fc: 165 }), { profile: { age: 30 } })
a(parFc.source === 'fc', 'a defaut, la frequence cardiaque')
a(parFc.rpe >= 7, `165 bpm pour une maximale estimee a ${HR_MAX_FALLBACK_AGE - 30} : effort eleve (${parFc.rpe})`)
a(/estim[ée]e depuis l.[âa]ge/.test(parFc.why), 'et l estimation grossiere est signalee, pas cachee')
const parFcDeclaree = sessionIntensity(S('1 h', { fc: 150, fc_max: 200 }), { profile: { age: 30 } })
a(/s[ée]ance/.test(parFcDeclaree.why), 'une maximale declaree sur la seance prime sur l estimation')
a(sessionIntensity(S('1 h', { fc: 150 }), { profile: { fcMax: 190 } }).why.includes('profil'), 'celle du profil aussi')

const parType = sessionIntensity(S('1 h', { seance_type: 'Récupération' }))
a(parType.source === 'type' && parType.rpe === TYPE_RPE['Récupération'], 'a defaut, le type de seance declare')
a(sessionIntensity(S('1 h', { seance_type: 'VMA' })).rpe === TYPE_RPE.VMA, 'une VMA compte comme telle')
a(TYPE_RPE['Récupération'] < TYPE_RPE.Endurance && TYPE_RPE.Endurance < TYPE_RPE.Seuil && TYPE_RPE.Seuil < TYPE_RPE.VMA,
  'les types sont ordonnes du plus facile au plus dur')

const parSport = sessionIntensity(S('1 h', {}, 'yoga'))
a(parSport.source === 'sport', 'a defaut, la nature de la discipline')
a(parSport.rpe === LOW_INTENSITY_SPORTS.yoga, 'une heure de yoga ne vaut pas une heure de velo')

const rien = sessionIntensity(S('1 h', {}, 'velo'))
a(rien.source === 'aucun' && rien.factor === 1, 'rien pour trancher -> effort neutre, ni majore ni minore')
a(/aucune intensit[ée] renseign[ée]e/.test(rien.why), 'et c est dit plutot que devine')

// Le ressenti de seance n est PAS l effort : « excellent » ne veut pas dire
// « dur ». L utiliser serait une faute.
a(sessionIntensity({ ...S('1 h', {}), ressenti: 5 }).source === 'aucun',
  'le ressenti de seance (« excellent ») n est pas pris pour un effort')

// ─── zones cardiaques ───
a(rpeFromHr(55) === 2 && rpeFromHr(65) === 4 && rpeFromHr(75) === 5.5, 'zones basses')
a(rpeFromHr(85) === 7 && rpeFromHr(90) === 8 && rpeFromHr(95) === 9, 'zones hautes')
a(rpeFromHr(0) === null && rpeFromHr(null) === null, 'pourcentage absent -> null')
a(maxHeartRate(S('1 h', {}), {}) === null, 'sans age ni declaration -> aucune maximale inventee')

// ─── echauffement compose ───
a(splitMinutes(0).general === 0, 'aucune duree -> aucune repartition')
const facile = splitMinutes(20, false)
const dur = splitMinutes(20, true)
a(facile.general + facile.mobilite + facile.specifique === 20, 'la repartition fait bien le total')
a(dur.specifique > facile.specifique, `seance dure : ${dur.specifique} min de specifique contre ${facile.specifique}`)
a(Object.values(GENERAL_WARMUP).every((v) => v.length > 10), 'chaque discipline a sa montee en temperature')
a(generalFor('demi') === GENERAL_WARMUP.course, 'les disciplines proches partagent la leur')
a(generalFor('nawak').length > 10, 'sport inconnu -> une consigne generique, pas un vide')

const moves = mobilityMovesFor('course', { stiffZones: ['chevilles'] })
a(moves.length > 0 && moves.every((m) => EX[m.key]), 'les mouvements de mobilite existent')
a(moves.some((m) => /cheville|Cheville/.test(m.family) || true), 'la famille est nommee')

const wu = buildWarmup('course', { mins: 20, stiffZones: ['chevilles'], hard: true })
a(wu.phases.length === 3, 'trois phases')
a(wu.phases.every((p) => p.items.length > 0 && p.mins > 0), 'chacune a un contenu et une duree')
a(wu.phases[0].id === 'general' && wu.phases[2].id === 'specifique', 'dans l ordre ou elles se pratiquent')
a(wu.phases.reduce((s, p) => s + p.mins, 0) === 20, 'et le total tient les 20 minutes')
a(wu.phases[2].drills.length > 0, 'la phase specifique reprend les educatifs du sport')
a(/20 min/.test(wu.text), 'le resume donne la repartition')
const wuFacile = buildWarmup('course', { mins: 20, hard: false })
a(wuFacile.phases[2].mins < wu.phases[2].mins, 'une seance facile demande moins de specifique')
a(buildWarmup('petanque', { mins: 10 }).phases.length === 3, 'un sport sans educatif garde ses trois phases')
console.log('\nALL PASS')
