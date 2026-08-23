import { daysBetween, bilanHistory, bilanFreshness, riskTrend, tagPersistence,
  painEpisodes, openEpisode, painDuration, recurrentRegions, loadCrossCheck,
  preventionAnalysis, regionLabel, STALE_DAYS, VERY_STALE_DAYS,
  PAIN_SUBACUTE_DAYS, PAIN_CHRONIC_DAYS, RECO }
  from '../../src/features/health/preventionIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const T='2026-06-01'
const back=(n)=>{const[y,m,d]=T.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));x.setUTCDate(x.getUTCDate()-n);return x.toISOString().slice(0,10)}

// fraicheur
a(bilanFreshness({},T).level==='absent','aucun bilan')
a(bilanFreshness({prevention:{date:back(3)}},T).level==='fresh','bilan recent')
a(bilanFreshness({prevention:{date:back(50)}},T).level==='aging',`50 jours -> vieillissant (seuil ${STALE_DAYS})`)
a(bilanFreshness({prevention:{date:back(120)}},T).level==='stale',`120 jours -> perime (seuil ${VERY_STALE_DAYS})`)
const both={prevention:{date:back(90)},preventionLog:[{date:back(5),score:20,level:'Faible',tags:[]}]}
a(bilanFreshness(both,T).days===5,'historique prioritaire sur le champ courant')

// historique
a(bilanHistory({}).length===0,'aucun log')
a(bilanHistory({preventionLog:[{date:'nawak',score:3}]}).length===0,'date invalide ecartee')
a(bilanHistory({preventionLog:[{date:back(1),score:null}]}).length===0,'score manquant ecarte')
const hist={preventionLog:[
 {date:back(90),score:55,level:'Élevé',tags:['charge','core','cheville']},
 {date:back(45),score:40,level:'Modéré',tags:['core','cheville']},
 {date:back(2),score:22,level:'Modéré',tags:['core']}]}
a(bilanHistory(hist)[0].date===back(90),'historique trie du plus ancien au plus recent')

// tendance
a(riskTrend({})===null,'aucun bilan -> pas de tendance')
a(riskTrend({preventionLog:[{date:back(2),score:30,tags:[]}]})===null,'un seul bilan -> pas de tendance')
const tr=riskTrend(hist)
a(tr.diff===-18 && tr.level==='ok',`risque en baisse de ${Math.abs(tr.diff)} points`)
a(riskTrend({preventionLog:[{date:back(30),score:20,tags:[]},{date:back(2),score:45,tags:[]}]}).level==='warn','hausse signalee')
a(riskTrend({preventionLog:[{date:back(30),score:30,tags:[]},{date:back(2),score:33,tags:[]}]}).level==='flat','3 points -> stable')

// points faibles
const tp=tagPersistence(hist)
a(tp.persistent.length===1 && tp.persistent[0].tag==='core','le gainage traine')
a(tp.persistent[0].bilans===3,'present sur 3 bilans consecutifs')
a(tp.resolved.includes('cheville'),'la cheville a disparu')
a(!tp.resolved.includes('charge'),'deja resolue au bilan precedent -> pas resignalee')
a(tagPersistence({preventionLog:[{date:back(30),score:20,tags:['core']},{date:back(2),score:30,tags:['core','materiel']}]}).appeared.includes('materiel'),'nouveau point faible detecte')

// douleur
a(openEpisode({})===null,'aucun episode')
a(painDuration({},T)===null,'aucune douleur')
a(openEpisode({painEpisodes:[{region:'genou',start:back(60),end:back(40)}]})===null,'episode clos')
const pd1=painDuration({painEpisodes:[{region:'genou',start:back(3)}]},T)
a(pd1.days===3 && pd1.level==='info','3 jours -> info')
a(/genou/.test(pd1.text),'la zone est nommee')
a(painDuration({painEpisodes:[{region:'talon',start:back(10)}]},T).level==='warn',`10 jours -> vigilance (seuil ${PAIN_SUBACUTE_DAYS})`)
const chr=painDuration({painEpisodes:[{region:'jambe',start:back(30)}]},T)
a(chr.level==='alert' && /professionnel de sant/.test(chr.text),`30 jours -> alerte (seuil ${PAIN_CHRONIC_DAYS})`)
a(painDuration({painEpisodes:[{region:'jambe',start:back(1),urgent:true}]},T).level==='alert','signes urgents -> alerte immediate')
a(regionLabel('talon')==='talon / dessous du pied','libelle lisible')
a(regionLabel('zzz')==='zzz','zone inconnue telle quelle')
a(openEpisode({painEpisodes:[{region:'genou',start:back(60),end:back(50)},{region:'talon',start:back(4)}]}).region==='talon','episode ouvert le plus recent')

// recurrences
a(recurrentRegions({}).length===0,'aucun episode')
a(recurrentRegions({painEpisodes:[{region:'genou',start:back(20)}]}).length===0,'un seul episode -> pas une recurrence')
const rec=recurrentRegions({painEpisodes:[
 {region:'genou',start:back(200),end:back(180)},
 {region:'genou',start:back(90),end:back(70)},
 {region:'talon',start:back(30),end:back(25)}]})
a(rec.length===1 && rec[0].region==='genou' && rec[0].episodes===2,`genou recurrent : ${rec[0].episodes} episodes, ${rec[0].totalDays} jours`)

// charge declaree vs mesuree
a(loadCrossCheck({},null)===null,'sans ACWR -> null')
a(loadCrossCheck({prevention:{tags:['charge']}},{ratio:1.5})===null,'declare et mesure concordent')
a(loadCrossCheck({prevention:{tags:['core']}},{ratio:1.6}).level==='warn','hausse mesuree non declaree')
a(loadCrossCheck({prevention:{tags:['charge']}},{ratio:0.9}).level==='info','hausse declaree non mesuree')

// conseils partages
a(RECO.core && RECO.charge,'les conseils par point faible sont exposes au moteur')

// synthese
a(preventionAnalysis(null).tips.length>0,'db nulle -> sans crash')
a(/Fais le bilan/.test(preventionAnalysis({},{today:T}).tips[0]),'invite a faire le bilan')
const full=preventionAnalysis({...hist,
 prevention:{date:back(2),score:22,level:'Modéré',tags:['core']},
 painEpisodes:[{region:'genou',start:back(120),end:back(100)},{region:'genou',start:back(28)}]},
 {today:T,acwr:{ratio:1.7}})
a(full.pain.level==='alert','douleur de 28 jours -> alerte')
a(full.tips[0]===full.pain.text,'la douleur passe en premier')
a(full.tips.some(t=>/d[ée]j[àa] g[êe]n[ée] 2 fois/.test(t)),'recurrence remontee')
a(full.tips.some(t=>/charge aigu/.test(t)),'ecart de charge remonte')
a(full.tips.some(t=>/3 derniers bilans/.test(t)),'point faible persistant remonte')
console.log('\nALL PASS')
