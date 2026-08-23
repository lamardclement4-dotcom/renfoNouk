import { SPORT_GRADES, BOULDER_GRADES, gradeIndex, gradeLabel, gradeGap, normalizeGrade,
  STYLES, STYLE_BY_ID, isSent, ANGLES, sessionAscents, ascents, bestByStyle, styleGap,
  pyramid, angleSplit, fingerLoad, isHardSession, progression, sessionStats, climbAnalysis,
  GAP_WIDE, PYRAMID_BASE, MAX_HARD_PER_WEEK, HARD_GAP_FROM_MAX }
  from '../../src/features/train/climbIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y, m, d] = T.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const A = (grade, style, scale, angle) => ({ grade, style, scale: scale || 'voie', angle })
const S = (off, asc) => ({ id: 's' + off, date: back(off), sport: 'escalade', statut: 'realise', duree: '2 h', data: { ascents: asc } })

// ─── cotations ───
a(SPORT_GRADES.length === 28 && BOULDER_GRADES.length === 23, `${SPORT_GRADES.length} cotations voie, ${BOULDER_GRADES.length} en bloc`)
a(gradeIndex('6b+') === gradeIndex('6B+'), 'insensible a la casse')
a(gradeIndex(' 7a ') === gradeIndex('7a'), 'espaces ignores')
a(gradeIndex('7a') > gradeIndex('6c+'), '7a est au-dessus de 6c+')
a(gradeIndex('nawak') === null, 'cotation inconnue -> null')
a(gradeIndex('') === null && gradeIndex(null) === null, 'entree vide geree')
// LE point : les deux echelles ne se confondent pas
a(gradeIndex('7a', 'voie') !== gradeIndex('7a', 'bloc'), '7a de voie et 7a de bloc ont des rangs differents')
a(gradeIndex('5+', 'bloc') !== null, '5+ existe en bloc')
a(gradeIndex('5+', 'voie') === null, 'mais pas dans l echelle des voies')
a(gradeIndex('5b', 'voie') !== null && gradeIndex('5b', 'bloc') === null, 'et inversement pour 5b')
a(gradeLabel(gradeIndex('7b'), 'voie') === '7b', 'aller-retour cotation / rang')
a(gradeLabel(999) === null && gradeLabel(-1) === null, 'rang hors bornes -> null')
a(gradeGap('7a', '6c') === 2, '7a est 2 crans au-dessus de 6c')
a(gradeGap('6a', 'nawak') === null, 'ecart incalculable -> null')

// ─── styles ───
a(STYLES.length === 4, '4 styles')
a(isSent('avue') && isSent('flash') && isSent('travail'), 'les 3 reussites comptent')
a(!isSent('essai'), 'un essai n est pas une reussite')
a(!isSent('inconnu'), 'style inconnu -> pas une reussite')
a(STYLE_BY_ID.avue.rank < STYLE_BY_ID.travail.rank, 'a vue est plus exigeant qu apres travail')

// ─── lecture des croix ───
a(sessionAscents(null).length === 0, 'seance nulle geree')
a(sessionAscents({ data: {} }).length === 0, 'seance sans croix')
a(sessionAscents({ date: T, data: { ascents: [{ grade: 'nawak' }] } }).length === 0, 'cotation invalide ecartee')
const one = sessionAscents({ date: T, data: { ascents: [{ grade: '6b', style: 'avue', scale: 'voie' }] } })
a(one.length === 1 && one[0].index === gradeIndex('6b'), 'croix lue avec son rang')
a(sessionAscents({ date: T, data: { ascents: [{ grade: '6b' }] } })[0].style === 'travail', 'style absent -> apres travail par defaut')

const db = { planningSessions: [
  S(0, [A('7a', 'travail'), A('6b', 'avue'), A('6c', 'flash')]),
  S(7, [A('6c+', 'travail'), A('6a', 'avue'), A('7a', 'essai')]),
  S(14, [A('6c', 'travail'), A('6b+', 'travail')]),
  S(200, [A('8a', 'travail')]), // hors fenetre
  { id: 'x', date: back(1), sport: 'course', statut: 'realise', duree: '1 h' },
] }
const list = ascents(db, { days: 180, today: T })
a(list.length === 8, `${list.length} croix retenues, la course et la seance hors fenetre exclues`)
a(!list.some((x) => x.grade === '8a'), 'croix de plus de 180 jours ecartee')
a(ascents(db, { days: 180, today: T, scale: 'bloc' }).length === 0, 'filtre par echelle')

// ─── niveau par style ───
const best = bestByStyle(list, 'voie')
a(best.avue.grade === '6b', `meilleur a vue : ${best.avue.grade}`)
a(best.flash.grade === '6c', `meilleur flash : ${best.flash.grade}`)
a(best.travail.grade === '7a', `meilleur apres travail : ${best.travail.grade}`)
a(!Object.values(best).some((b) => b.style === 'essai'), 'un essai rate ne devient jamais un record')
a(best.avue.count === 2, 'nombre de croix par style')

// ─── ecart entre styles ───
a(styleGap({}) === null, 'sans les deux styles -> null')
const wide = styleGap({ avue: { index: gradeIndex('6a'), grade: '6a', style: 'avue' }, travail: { index: gradeIndex('7b'), grade: '7b' } })
a(wide.gap >= GAP_WIDE && wide.level === 'warn', `${wide.gap} cotations d ecart -> signale`)
a(/Consolider le niveau interm/.test(wide.text), 'et la piste est donnee')
const narrow = styleGap({ avue: { index: gradeIndex('6c'), grade: '6c', style: 'avue' }, travail: { index: gradeIndex('6c+'), grade: '6c+' } })
a(narrow.level === 'info' && /ne t.engages presque jamais/.test(narrow.text), 'ecart nul -> on ne projette jamais')
const okGap = styleGap({ avue: { index: gradeIndex('6b'), grade: '6b', style: 'avue' }, travail: { index: gradeIndex('6c+'), grade: '6c+' } })
a(okGap.level === 'ok', 'ecart habituel -> rien a dire')

// ─── pyramide ───
a(pyramid([], 'voie') === null, 'aucune croix -> null')
const thin = ascents({ planningSessions: [S(0, [A('7a', 'travail'), A('6c+', 'travail')])] }, { today: T })
const pt = pyramid(thin, 'voie')
a(!pt.solid, `1 croix sous le ${pt.topGrade} -> base insuffisante`)
a(/la base manque/.test(pt.text), 'et c est dit : ' + pt.text.slice(-45))
const solid = ascents({ planningSessions: [S(0, [A('7a', 'travail'), A('6c+', 'travail'), A('6c+', 'flash'), A('6c+', 'avue')])] }, { today: T })
const ps = pyramid(solid, 'voie')
a(ps.solid && ps.below >= PYRAMID_BASE, `${ps.below} croix en dessous -> niveau consolide`)
a(ps.rows[0].grade === '7a', 'la cotation la plus haute en tete')
// les essais rates ne comptent pas dans la pyramide
const withFail = ascents({ planningSessions: [S(0, [A('7b', 'essai'), A('6a', 'avue')])] }, { today: T })
a(pyramid(withFail, 'voie').topGrade === '6a', 'un essai rate ne gonfle pas la pyramide')

// ─── profils de mur ───
a(angleSplit([]) === null, 'pas assez de croix -> null')
const dev = ascents({ planningSessions: [S(0, Array.from({ length: 8 }, () => A('6b', 'travail', 'voie', 'devers')).concat([A('6a', 'avue', 'voie', 'vertical')]))] }, { today: T })
const asp = angleSplit(dev)
a(asp.lopsided && asp.items[0].id === 'devers', `${asp.items[0].pct} % en devers -> desequilibre`)
a(asp.missing.some((m) => m.id === 'dalle'), 'la dalle jamais grimpee est nommee')
a(/Varier les profils/.test(asp.text), 'et la raison donnee')
const mixed = ascents({ planningSessions: [S(0, [A('6a','travail','voie','dalle'),A('6a','travail','voie','dalle'),A('6b','travail','voie','vertical'),A('6b','travail','voie','vertical'),A('6c','travail','voie','devers'),A('6c','travail','voie','devers')])] }, { today: T })
a(!angleSplit(mixed).lopsided, 'profils varies -> aucun reproche')

// ─── charge des doigts : LE risque propre a l escalade ───
a(fingerLoad({}, { today: T }) === null, 'aucune seance -> null')
const b2b = { planningSessions: [S(0, [A('7a', 'travail')]), S(1, [A('7a', 'travail')]), S(10, [A('6a', 'avue')])] }
const fl = fingerLoad(b2b, { today: T })
a(fl.backToBack.length === 1, 'deux seances dures consecutives detectees')
a(fl.flags.some((f) => f.id === 'consecutif'), 'et signalees')
a(/tendons des doigts s.adaptent bien plus lentement/.test(fl.flags.find((f) => f.id === 'consecutif').text), 'avec la raison physiologique')
// seances faciles collees : aucun reproche
const easy = { planningSessions: [S(0, [A('7a', 'travail')]), S(1, [A('5c', 'avue')]), S(2, [A('5c', 'avue')])] }
a(fingerLoad(easy, { today: T }).backToBack.length === 0, 'deux seances faciles consecutives -> rien a signaler')
a(isHardSession(sessionAscents(S(0, [A('7a', 'travail')])), { travail: { index: gradeIndex('7a') } }, 'voie'), 'seance au niveau max -> dure')
a(!isHardSession(sessionAscents(S(0, [A('5c', 'avue')])), { travail: { index: gradeIndex('7a') } }, 'voie'), `${HARD_GAP_FROM_MAX} crans sous le max -> pas dure`)
// frequence
// une seance dure tous les 2 jours sur 28 jours = 3,5 par semaine
const often = { planningSessions: [0,2,4,6,8,10,12,14,16,18,20,22,24,26].map((o) => S(o, [A('7a', 'travail')])) }
const fo = fingerLoad(often, { today: T })
a(fo.hardPerWeek > MAX_HARD_PER_WEEK && fo.flags.some((f) => f.id === 'frequence'), `${fo.hardPerWeek} seances dures par semaine -> signale`)

// ─── progression ───
a(progression([], 'voie') === null, 'aucune croix -> null')
const prog = ascents({ planningSessions: [S(120, [A('6a', 'travail')]), S(60, [A('6b', 'travail')]), S(5, [A('6c', 'travail')])] }, { days: 180, today: T })
const pr = progression(prog, 'voie')
a(pr.months.length === 3 && pr.gain > 0, `progression de ${pr.first.grade} a ${pr.last.grade} sur ${pr.months.length} mois`)

// ─── volume ───
const st = sessionStats(db, { days: 28, today: T })
a(st.sessions === 3 && st.total === 8, `${st.sessions} seances, ${st.total} croix`)
a(st.sent === 7 && st.failed === 1, `${st.sent} reussies, ${st.failed} echec`)
a(st.successRate === 88, `taux de reussite ${st.successRate} %`)

// ─── synthese ───
a(climbAnalysis(null, { today: T }).tips.length > 0, 'db nulle -> synthese sans crash')
a(/Aucune voie enregistr[ée]e/.test(climbAnalysis({}, { today: T }).tips[0]), 'invite a enregistrer les croix')
const ana = climbAnalysis(b2b, { today: T })
a(/tendons des doigts/.test(ana.tips[0]), 'le risque doigts passe en premier')
const full = climbAnalysis(db, { today: T })
a(full.bestVoie.travail.grade === '7a' && full.stats.total === 8, 'synthese complete')
console.log('\nALL PASS')
