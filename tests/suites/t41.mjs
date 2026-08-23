import { gradeIndex, gradeByAngle, projects, attemptEfficiency, plateau,
  sessionShape, warmupCheck, lieuSplit, priseSplit, bestByStyle, ascents, climbAnalysis,
  LIEUX, PRISES, ANGLE_GAP_WIDE, PROJECT_MIN_TRIES, PROJECT_STALE_DAYS, PLATEAU_DAYS, WARMUP_GAP }
  from '../../src/features/train/climbIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y, m, d] = T.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const A = (grade, style, opt) => ({ grade, style, scale: 'voie', ...(opt || {}) })
const S = (off, asc) => ({ id: 's' + off, date: back(off), sport: 'escalade', statut: 'realise', duree: '2 h', data: { ascents: asc } })
const mk = (sessions) => ({ planningSessions: sessions })

// ─── niveau par profil : la lecture la plus actionnable ───
a(gradeByAngle([]) === null, 'aucune croix -> null')
const oneAngle = ascents(mk([S(1, [A('7a', 'travail', { angle: 'devers' })])]), { today: T })
a(gradeByAngle(oneAngle).gap === null, 'un seul profil -> aucun ecart calculable')
const skewed = ascents(mk([S(1, [
  A('7a', 'travail', { angle: 'devers' }), A('6c+', 'travail', { angle: 'devers' }),
  A('6a', 'travail', { angle: 'dalle' }), A('5c', 'avue', { angle: 'dalle' }),
])]), { today: T })
const ga = gradeByAngle(skewed)
a(ga.best.id === 'devers' && ga.worst.id === 'dalle', `${ga.best.grade} en devers contre ${ga.worst.grade} en dalle`)
a(ga.gap >= ANGLE_GAP_WIDE && ga.lopsided, `${ga.gap} cotations d ecart -> signale`)
a(/pas un manque de niveau, c'est une qualit[ée] en retard/.test(ga.text), 'presente comme une qualite en retard, pas un echec')
a(/pr[ée]cision de pied/.test(ga.text), 'et la qualite manquante est nommee : ' + ga.text.slice(-45))
const even = ascents(mk([S(1, [
  A('6b', 'travail', { angle: 'devers' }), A('6b', 'travail', { angle: 'dalle' }), A('6a+', 'avue', { angle: 'vertical' }),
])]), { today: T })
a(!gradeByAngle(even).lopsided, 'niveau homogene -> aucun reproche')
// un essai rate ne compte pas comme niveau atteint
const failAngle = ascents(mk([S(1, [A('8a', 'essai', { angle: 'toit' }), A('6a', 'avue', { angle: 'dalle' }), A('6b', 'travail', { angle: 'devers' })])]), { today: T })
a(!gradeByAngle(failAngle).items.some((x) => x.id === 'toit'), 'un essai rate ne cree pas un niveau en toit')

// ─── projets ───
a(projects([], { today: T }).length === 0, 'aucune voie nommee -> aucun projet')
const noName = ascents(mk([S(1, [A('7a', 'essai')])]), { today: T })
a(projects(noName, { today: T }).length === 0, 'voie sans nom -> pas de projet')
const proj = ascents(mk([
  S(90, [A('7b', 'essai', { name: 'La Rage', attempts: 4 })]),
  S(70, [A('7b', 'essai', { name: 'La Rage', attempts: 6 })]),
  S(5, [A('6c', 'travail', { name: 'Facile', attempts: 2 })]),
]), { today: T })
const ps = projects(proj, { today: T })
a(ps.length === 2, `${ps.length} voies suivies par nom`)
const rage = ps.find((p) => p.name === 'La Rage')
a(rage.open && rage.tries === 10, `projet ouvert, ${rage.tries} essais cumules`)
a(rage.sessions === 2, '2 seances dessus')
a(rage.stale && rage.idleDays >= PROJECT_STALE_DAYS, `laisse depuis ${rage.idleDays} jours -> signale`)
a(!ps.find((p) => p.name === 'Facile').open, 'une voie enchainee n est plus un projet')
a(ps[0].open, 'les projets ouverts remontent en premier')
// meme nom mais echelle differente : deux projets distincts
const dual = ascents(mk([S(1, [
  { grade: '7a', style: 'essai', scale: 'voie', name: 'Homonyme', attempts: 3 },
  { grade: '7a', style: 'essai', scale: 'bloc', name: 'Homonyme', attempts: 3 },
])]), { today: T })
a(projects(dual, { today: T }).length === 2, 'meme nom en voie et en bloc -> deux projets distincts')
// casse du nom sans importance
const caseIns = ascents(mk([S(3, [A('7a', 'essai', { name: 'La Rage', attempts: 2 })]), S(1, [A('7a', 'essai', { name: 'la rage', attempts: 2 })])]), { today: T })
a(projects(caseIns, { today: T }).length === 1, 'la casse du nom ne cree pas deux projets')

// ─── efficacite des essais ───
a(attemptEfficiency([], 'voie') === null, 'pas assez de donnees -> null')
const eff = ascents(mk([
  S(75, [A('6c', 'travail', { attempts: 8 }), A('6c', 'travail', { attempts: 10 }), A('6b', 'travail', { attempts: 6 })]),
  S(10, [A('6c', 'travail', { attempts: 3 }), A('6c', 'travail', { attempts: 4 }), A('6b', 'travail', { attempts: 2 })]),
]), { today: T })
const ae = attemptEfficiency(eff, 'voie')
a(ae && ae.delta < 0 && ae.level === 'ok', `de ${ae.first.perSend} a ${ae.last.perSend} essais par croix`)
a(/plus efficace, pas seulement plus fort/.test(ae.text), 'et la nuance est faite')

// ─── plateau ───
a(plateau([], 'voie', { today: T }) === null, 'pas assez de croix -> null')
// max ancien, mais on grimpe toujours
const plat = ascents(mk([
  S(200, [A('7a', 'travail')]),
  ...[150, 120, 90, 60, 30, 10, 5].map((o) => S(o, [A('6c', 'travail'), A('6b', 'avue')])),
]), { days: 365, today: T })
const pl = plateau(plat, 'voie', { today: T })
a(pl && pl.days >= PLATEAU_DAYS, `plateau de ${pl.days} jours detecte`)
a(pl.sessionsSince >= 5, `${pl.sessionsSince} croix depuis le record`)
a(/Les paliers font partie de la progression/.test(pl.text), 'presente sans dramatiser')
a(/changement de registre/.test(pl.text), 'et une piste concrete donnee')
// interruption : on ne parle pas de plateau
const paused = ascents(mk([S(200, [A('7a', 'travail')]), S(5, [A('6c', 'travail')])]), { days: 365, today: T })
a(plateau(paused, 'voie', { today: T }) === null, 'trop peu de croix depuis -> ce n est pas un plateau')

// ─── echauffement ───
const best = { travail: { index: gradeIndex('7a') } }
const cold = S(3, [A('6c+', 'travail'), A('6b', 'travail'), A('6a', 'avue')])
const sh = sessionShape(cold, best, 'voie')
a(sh && !sh.warmedUp, 'seance demarrant pres du maximum -> pas d echauffement')
a(/poulies des doigts demandent une mont[ée]e en charge/.test(sh.text), 'avec la raison physiologique')
const warm = S(3, [A('5b', 'avue'), A('6a', 'avue'), A('7a', 'travail')])
a(sessionShape(warm, best, 'voie').warmedUp, `demarrage ${WARMUP_GAP} cotations sous le max -> echauffement correct`)
a(sessionShape(S(3, [A('6a', 'avue')]), best, 'voie') === null, 'moins de 3 voies -> aucune conclusion')
const wc = warmupCheck(mk([S(3, [A('7a', 'travail'), A('6c', 'travail'), A('6b', 'travail')])]), { today: T })
a(wc.length >= 1, 'seance sans echauffement remontee')

// ─── salle et falaise ───
a(lieuSplit([], 'voie') === null, 'pas assez de croix -> null')
const lx = ascents(mk([S(5, [
  A('7a', 'travail', { lieu: 'salle' }), A('6c+', 'travail', { lieu: 'salle' }),
  A('6a', 'travail', { lieu: 'falaise' }), A('5c', 'avue', { lieu: 'falaise' }),
])]), { today: T })
const ls = lieuSplit(lx, 'voie')
a(ls.gap >= 2, `${ls.gap} cotations entre salle et falaise`)
a(/lecture, la pose de pied sur rocher/.test(ls.text), 'et l explication ne parle pas de force')
const close = ascents(mk([S(5, [
  A('6b', 'travail', { lieu: 'salle' }), A('6b', 'travail', { lieu: 'salle' }),
  A('6a+', 'travail', { lieu: 'falaise' }), A('6a', 'avue', { lieu: 'falaise' }),
])]), { today: T })
a(lieuSplit(close, 'voie').gap < 2, 'ecart habituel -> rien a signaler')

// ─── types de prises ───
a(priseSplit([]) === null, 'pas assez de donnees -> null')
const grip = ascents(mk([S(5, Array.from({ length: 9 }, () => A('6b', 'travail', { prises: ['reglette'] })).concat([A('6a', 'avue', { prises: ['bac'] })]))]), { today: T })
const gs = priseSplit(grip)
a(gs.lopsided && gs.items[0].id === 'reglette', `${gs.items[0].pct} % sur reglettes`)
a(gs.missing.some((m) => m.id === 'pince'), 'les prehensions jamais travaillees sont nommees')
a(/tendons diff[ée]rents/.test(gs.text), 'et la raison donnee')
a(!gs.missing.some((m) => m.id === 'mono'), 'les mono-doigts ne sont pas reproches comme un manque')

// ─── synthese ───
const full = climbAnalysis(mk([
  S(90, [A('7b', 'essai', { name: 'La Rage', attempts: 5 })]),
  S(70, [A('7b', 'essai', { name: 'La Rage', attempts: 5 })]),
  S(3, [A('7a', 'travail', { angle: 'devers' }), A('6c', 'travail', { angle: 'devers' }), A('5c', 'avue', { angle: 'dalle' })]),
]), { today: T })
a(full.angleVoie && full.angleVoie.lopsided, 'ecart entre profils detecte')
a(full.openProjects.length === 1, 'un projet ouvert')
a(full.tips.some((t) => /La Rage/.test(t)), 'le projet est nomme dans la synthese')
a(full.tips.some((t) => /qualit[ée] en retard/.test(t)), 'et la faiblesse par profil aussi')
a(climbAnalysis({}, { today: T }).tips.length > 0, 'db vide -> synthese sans crash')
console.log('\nALL PASS')
