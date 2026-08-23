import { daysBetween, periodBlocks, periodStarts, cycleLengths, cycleStats, lengthDrift,
  phaseOfDate, trackedDays, metricByPhase, metricContrast, symptomsByPhase,
  pmsPattern, predictionAccuracy, cycleAnalysis, PMS_WINDOW_DAYS }
  from '../../src/features/health/cycleIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const D=(iso,n)=>{const[y,m,d]=iso.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}

// dates
a(daysBetween('2026-01-01','2026-01-31')===30,'30 jours de janvier')
a(daysBetween('2026-02-28','2026-03-01')===1,'2026 non bissextile')
a(daysBetween('2024-02-28','2024-03-01')===2,'2024 bissextile')
a(daysBetween('2026-03-29','2026-03-30')===1,'passage heure d ete sans decalage (UTC pur)')

// blocs de regles
const t=(e)=>e
a(periodBlocks(null).length===0,'track nul gere')
const bl=periodBlocks({'2026-01-01':{flux:2},'2026-01-02':{flux:2},'2026-01-29':{flux:2}})
a(bl.length===2,'deux episodes distincts')
a(periodBlocks({'2026-01-01':{flux:2},'2026-01-03':{flux:2}}).length===1,'un jour non note ne coupe pas')
a(periodBlocks({'2026-01-01':{flux:2},'2026-01-05':{flux:2}}).length===2,'quatre jours d ecart coupent')
a(periodBlocks({'2026-01-01':{flux:0}}).length===0,'flux a 0 ignore')

// debuts et longueurs
const cyc={startDate:'2026-01-01',cycleLen:28,periodLen:5,track:{
 '2026-01-01':{flux:2},'2026-01-30':{flux:2},'2026-02-27':{flux:2}}}
a(periodStarts(cyc).length===3,'trois debuts detectes')
a(periodStarts({startDate:'2026-01-01',periodStarts:['2026-01-03'],track:{}}).length===1,'deux debuts rapproches -> un episode')
const lens=cycleLengths(cyc)
a(lens.length===2 && lens[0].len===29,`cycles de ${lens.map(l=>l.len)} jours`)
a(cycleLengths({startDate:'2026-01-01',periodStarts:['2026-01-01','2026-06-01','2026-06-29'],track:{}}).length===1,'ecart de 151 jours ecarte')

// regularite
a(cycleStats({track:{}})===null,'aucun cycle -> null')
a(cycleStats(cyc).level==='unknown','moins de 3 cycles -> indetermine')
const reg={periodStarts:['2026-01-01','2026-01-29','2026-02-26','2026-03-26'],track:{}}
a(cycleStats(reg).mean===28 && cycleStats(reg).level==='ok','trois cycles de 28 jours -> reguliers')
const irr={periodStarts:['2026-01-01','2026-01-23','2026-03-02','2026-03-24'],track:{}}
a(cycleStats(irr).level==='warn' && /professionnel de sant/.test(cycleStats(irr).text),'irregularite signalee avec renvoi')

// derive du reglage
a(lengthDrift(reg)===null,'28 declare / 28 observe -> pas de derive')
a(lengthDrift({...reg,cycleLen:35}).diff===-7,'derive detectee')

// phases
const pc={periodStarts:['2026-01-01','2026-01-29'],cycleLen:28,periodLen:5,track:{}}
a(phaseOfDate('2026-01-01',pc).phase==='menstruation','J1')
a(phaseOfDate('2026-01-13',pc).phase==='folliculaire','J13 folliculaire (bornes de cycleInfo)')
a(phaseOfDate('2026-01-14',pc).phase==='ovulation','J14 ovulation')
a(phaseOfDate('2026-01-17',pc).phase==='luteale','J17 luteale')
a(phaseOfDate('2026-01-29',pc).phase==='menstruation','recale sur le debut suivant')
a(phaseOfDate('2025-12-01',pc)===null,'avant le premier suivi -> null')
a(phaseOfDate('2026-01-01',{track:{}})===null,'aucun debut connu -> null')

// ressenti par phase
const rich={periodStarts:['2026-01-01','2026-01-29'],cycleLen:28,periodLen:5,track:{
 '2026-01-02':{energy:2,pain:4,mood:2,symptoms:['Crampes','Fatigue'],flux:2},
 '2026-01-03':{energy:2,pain:4,mood:2,symptoms:['Crampes']},
 '2026-01-10':{energy:5,pain:1,mood:5,symptoms:[]},
 '2026-01-11':{energy:5,pain:1,mood:4,symptoms:[]},
 '2026-01-26':{energy:3,pain:2,mood:2,symptoms:['Ballonnements','Fatigue']},
 '2026-01-27':{energy:2,pain:3,mood:2,symptoms:['Ballonnements','Crampes','Fatigue']},
 '2026-01-28':{energy:2,pain:3,mood:1,symptoms:['Ballonnements','Fatigue']}}}
const td=trackedDays(rich)
a(td.length===7,'7 jours suivis')
a(td[4].daysToPeriod===3,'26 janv -> J-3 avant les regles')
const mbp=metricByPhase(td,'energy')
a(mbp.find(x=>x.phase==='menstruation').mean===2,'energie 2/5 en menstruation')
a(mbp.find(x=>x.phase==='folliculaire').mean===5,'energie 5/5 en folliculaire')
const ec=metricContrast(td,'energy')
a(ec.low.phase==='menstruation' && ec.high.phase==='folliculaire' && ec.significant,`creux et pic identifies (ecart ${ec.gap})`)
a(metricContrast([],'energy')===null,'aucune donnee -> null')
const sbp=symptomsByPhase(td)
a(sbp.find(s=>s.symptom==='Ballonnements').top.phase==='luteale','ballonnements surtout en luteale')
a(!sbp.find(s=>s.symptom==='Nausees'),'symptome jamais note absent')

// syndrome premenstruel
const pms=pmsPattern(td)
a(pms.windowDays===3 && pms.otherDays===4,`${pms.windowDays} jours dans la fenetre, ${pms.otherDays} hors`)
a(pms.symptomsWin>pms.symptomsOther && pms.flagged,'motif premenstruel signale')
a(pmsPattern([])===null,'aucun jour -> null')
a(PMS_WINDOW_DAYS===5,'fenetre de 5 jours')

// fiabilite des predictions
a(predictionAccuracy({periodStarts:['2026-01-01','2026-01-29'],track:{}})===null,'un seul cycle -> pas d evaluation')
a(predictionAccuracy(irr).mae>0,'erreur moyenne sur cycles irreguliers')

// synthese
a(cycleAnalysis(null).tips.length>0,'cycle nul -> sans crash')
a(/Enregistre le premier jour/.test(cycleAnalysis({}).tips[0]),'invite a enregistrer le premier jour')
const full=cycleAnalysis(rich)
a(full.tips.some(t=>/[ée]nergie/i.test(t)),'conseil sur l energie par phase')
a(full.tips.some(t=>/douleurs/i.test(t)),'conseil sur les douleurs')
a(full.tips.some(t=>/pr[ée]menstruel/i.test(t)),'conseil premenstruel')
a(cycleAnalysis({...reg,cycleLen:35}).tips.some(t=>/35 jours/.test(t)),'derive remontee')
console.log('\nALL PASS')
