import { parseSprintTime, fmtSprintTime, EVENTS, EVENT_BY_ID, STARTS,
  windLegal, windLabel, WIND_LEGAL_MAX, WIND_RELEVANT,
  sprintPerfs, records, maxVelocity, speedEndurance, reactionAnalysis,
  sessionVolume, volumeByWeek, recoveryCheck, seasonBests, sprintAnalysis,
  REACTION_SLOW, RECOVERY_SEC_PER_10M, SPRINT_VOLUME_JUMP_PCT }
  from '../../src/features/train/sprintIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y, m, d] = T.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const P = (epreuve, temps, opt) => ({ epreuve, temps, ...(opt || {}) })
const S = (off, data) => ({ id: 's' + off, date: back(off), sport: 'sprint', statut: 'realise', duree: '1 h 30', data })
const mk = (sessions) => ({ planningSessions: sessions })

// ─── chronos au centieme ───
a(parseSprintTime('10.85') === 10.85, 'centieme conserve')
a(parseSprintTime('10,85') === 10.85, 'virgule acceptee')
a(parseSprintTime('1:52.30') === 112.3, '400 m au format minutes-secondes')
a(parseSprintTime('11') === 11, 'secondes entieres acceptees')
a(parseSprintTime('') === null && parseSprintTime(null) === null, 'vide -> null')
a(parseSprintTime('abc') === null && parseSprintTime('10.8.5') === null, 'format invalide -> null')
a(parseSprintTime('0') === null, 'temps nul refuse')
a(fmtSprintTime(10.85) === '10,85', 'affichage a la francaise')
a(fmtSprintTime(112.3) === "1'52,30", '400 m affiche en minutes')
a(fmtSprintTime(65.05) === "1'05,05", 'secondes sur deux chiffres')
a(fmtSprintTime(0) === null, 'temps nul -> null')

// ─── vent ───
a(WIND_LEGAL_MAX === 2, 'limite a 2 m/s')
a(windLegal('100', 1.8), '+1,8 m/s reste homologable')
a(!windLegal('100', 2.5), '+2,5 m/s ne l est pas')
a(windLegal('100', -1.2), 'vent debout toujours homologable')
a(windLegal('400', 5), 'le vent n est pas mesure sur 400 m')
a(!WIND_RELEVANT.includes('400'), 'et le 400 m ne figure pas dans les epreuves ventees')
a(windLegal('100', null), 'vent non mesure -> on ne disqualifie pas')
a(windLabel(2.3) === '+2,3 m/s' && windLabel(-1) === '-1,0 m/s', 'libelle du vent')
a(windLabel(null) === null, 'vent absent -> null')

// ─── lecture des performances ───
a(sprintPerfs({}, { today: T }).length === 0, 'aucune seance')
const db = mk([
  S(300, { perfs: [P('100', '11.20', { vent: 0.5, depart: 'blocs', reaction: 0.185 })] }),
  S(60, { perfs: [P('100', '10.95', { vent: 1.2, depart: 'blocs', reaction: 0.172 }), P('200', '22.40', { vent: 0.8, depart: 'blocs' })] }),
  S(20, { perfs: [P('100', '10.80', { vent: 3.4, depart: 'blocs', reaction: 0.168 })] }),
  S(10, { perfs: [P('nawak', '10.0'), P('100', 'abc')] }),
])
const perfs = sprintPerfs(db, { today: T })
a(perfs.length === 4, `${perfs.length} performances lues, epreuve et chrono invalides ecartes`)
a(perfs[0].speed > 0 && perfs[0].kmh > 0, 'vitesse en m/s et km/h calculees')
a(perfs.find((p) => p.sec === 10.8).legal === false, 'le 10,80 avec +3,4 m/s est marque non homologable')

// ─── LE point : records avec et sans vent ───
const recs = records(perfs)
const r100 = recs.find((r) => r.event === '100')
a(r100.legal.sec === 10.95, `record homologable : ${fmtSprintTime(r100.legal.sec)}`)
a(r100.any.sec === 10.8, `meilleur temps toutes conditions : ${fmtSprintTime(r100.any.sec)}`)
a(r100.windAssisted && r100.windAssisted.sec === 10.8, 'le chrono vente est identifie comme tel, pas confondu avec le record')
a(r100.count === 3, '3 tentatives sur 100 m')
const r200 = recs.find((r) => r.event === '200')
a(r200 && !r200.windAssisted, 'aucun vent excessif sur 200 m')

// ─── vitesse ───
a(maxVelocity([]) === null, 'aucune performance -> null')
const mv = maxVelocity(perfs)
a(mv.method === 'moyenne', 'sans depart lance, on ne parle que de moyenne')
a(/vitesse maximale r[ée]elle est plus [ée]lev[ée]e/.test(mv.text), 'et la limite est dite')
const flying = sprintPerfs(mk([S(5, { perfs: [P('60', '6.10', { depart: 'lance' })] })]), { today: T })
const fv = maxVelocity(flying)
a(fv.method === 'lancé' && fv.speed > 9, `depart lance -> vitesse maximale mesuree (${fv.speed} m/s)`)

// ─── endurance de vitesse ───
a(speedEndurance([]).length === 0, 'sans records -> rien')
// 200 m tres au-dessus du double du 100 m
const weak = records(sprintPerfs(mk([S(5, { perfs: [P('100', '11.00', { vent: 0 }), P('200', '23.50', { vent: 0 })] })]), { today: T }))
const we = speedEndurance(weak)
a(we.length === 1 && we[0].level === 'warn', `differentiel de ${we[0].diff} s -> resistance en retard`)
a(/r[ée]sistance [àa] la fatigue qui manque/.test(we[0].text), 'et le diagnostic est explicite')
a(/distances longues [àa] intensit[ée] proche du maximum/.test(we[0].text), 'avec la piste de travail')
// 200 m tres proche du double
const strong = records(sprintPerfs(mk([S(5, { perfs: [P('100', '11.00', { vent: 0 }), P('200', '22.05', { vent: 0 })] })]), { today: T }))
const se = speedEndurance(strong)
a(se[0].level === 'info' && /vitesse pure qui limite/.test(se[0].text), 'endurance solide -> c est la vitesse pure qui limite')
// differentiel habituel
const okDiff = records(sprintPerfs(mk([S(5, { perfs: [P('100', '11.00', { vent: 0 }), P('200', '22.40', { vent: 0 })] })]), { today: T }))
a(speedEndurance(okDiff)[0].level === 'ok', 'differentiel habituel -> rien a signaler')
// un chrono vente ne sert pas de base au differentiel
const windy = records(sprintPerfs(mk([S(5, { perfs: [P('100', '10.50', { vent: 4 }), P('200', '22.40', { vent: 0 })] })]), { today: T }))
a(speedEndurance(windy).length === 0 || speedEndurance(windy)[0].actual === 22.4, 'le differentiel se calcule sur les chronos homologables')

// ─── temps de reaction ───
a(reactionAnalysis([]) === null, 'moins de 3 mesures -> null')
const ra = reactionAnalysis(perfs)
a(ra && ra.count === 3, `${ra.count} temps de reaction mesures`)
a(ra.mean < REACTION_SLOW && ra.level === 'ok', `moyenne de ${ra.mean} s, correcte`)
const slow = sprintPerfs(mk([S(5, { perfs: [P('100', '11.0', { reaction: 0.26 }), P('100', '11.1', { reaction: 0.28 }), P('100', '11.2', { reaction: 0.25 })] })]), { today: T })
const rs = reactionAnalysis(slow)
a(rs.level === 'info' && /au signal, pas [àa] la jambe/.test(rs.text), 'reaction lente -> du temps a gagner ailleurs que physiquement')

// ─── volume ───
a(sessionVolume({}) === 0, 'seance vide -> 0 m')
a(sessionVolume(S(1, { series: 2, reps: 4, repDistance: 60 })) === 480, '2 × 4 × 60 m = 480 m')
a(sessionVolume(S(1, { perfs: [P('100', '11.0'), P('200', '22.5')] })) === 300, 'les performances comptent aussi')
a(sessionVolume(S(1, { series: 1, reps: 3, repDistance: 80, perfs: [P('100', '11.0')] })) === 340, 'repetitions et performances additionnees')
const vol = volumeByWeek(mk([S(8, { series: 2, reps: 4, repDistance: 60 }), S(1, { series: 4, reps: 6, repDistance: 80 })]), { today: T })
a(vol.weeks.length === 8, '8 semaines')
a(vol.jump && vol.jump.pct > SPRINT_VOLUME_JUMP_PCT, `hausse de ${vol.jump.pct} % signalee`)
a(/ischio-jambiers se l[èe]sent presque toujours [àa] vitesse maximale/.test(vol.jump.text), 'avec la raison')
a(/hausse brutale du volume/.test(vol.jump.text), 'et le facteur de risque nomme')
const steady = volumeByWeek(mk([S(8, { series: 2, reps: 4, repDistance: 60 }), S(1, { series: 2, reps: 4, repDistance: 60 })]), { today: T })
a(steady.jump === null, 'volume stable -> aucun signalement')

// ─── recuperation ───
a(recoveryCheck({}) === null, 'sans distance -> null')
a(recoveryCheck(S(1, { repDistance: 60 })) === null, 'sans recuperation notee -> null')
const full = recoveryCheck(S(1, { repDistance: 60, recup: '6:00' }))
a(full.full && /vrai travail de vitesse/.test(full.text), `6 min pour 60 m -> recuperation complete (${RECOVERY_SEC_PER_10M} s par 10 m)`)
const short = recoveryCheck(S(1, { repDistance: 60, recup: '2:00' }))
a(!short.full && /travaille la r[ée]sistance plut[ôo]t que la vitesse pure/.test(short.text), '2 min pour 60 m -> ce n est plus de la vitesse')
a(/un choix l[ée]gitime/.test(short.text), 'sans en faire une faute')
a(recoveryCheck(S(1, { repDistance: 60, recup: '5' })).rec === 300, 'recuperation en minutes seules acceptee')

// ─── saison ───
a(seasonBests([], '100').length === 0, 'aucune performance -> aucune saison')
const sb = seasonBests(perfs, '100')
a(sb.length >= 1 && sb.every((x) => x.time), 'meilleures performances par annee')

// ─── synthese ───
a(sprintAnalysis(null, { today: T }).tips.length > 0, 'db nulle -> synthese sans crash')
a(/Aucune s[ée]ance de sprint/.test(sprintAnalysis({}, { today: T }).tips[0]), 'aucune donnee -> invitation')
a(/un chrono sans vent ne se compare [àa] rien/.test(sprintAnalysis({}, { today: T }).tips[0]), 'et la raison donnee')
const ana = sprintAnalysis(db, { today: T })
a(ana.tips.some((t) => /au-del[àa] de la limite de 2 m\/s/.test(t)), 'chrono vente signale')
a(ana.tips.some((t) => /c'est elle qu'il faut battre/.test(t)), 'et la vraie reference rappelee')
console.log('\nALL PASS')
