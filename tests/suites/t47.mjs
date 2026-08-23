import { weekBounds, weekDays, bySport, compare, highlights, toughest,
  consistency, planFit, context, retroAnalysis, BASELINE_WEEKS }
  from '../../src/features/train/retroIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const LUN='2026-06-15'  // lundi
const day=(i)=>{const[y,m,d]=LUN.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));x.setUTCDate(x.getUTCDate()+i);return x.toISOString().slice(0,10)}
const S=(i,sport,duree,rpe,statut,data)=>({id:'s'+i+sport+(rpe||''),date:day(i),sport,duree,statut:statut||'realise',data:{...(rpe?{rpe}:{}) ,...(data||{})}})
const meta=(sp)=>({label:{course:'Course à pied',muscu:'Musculation',velo:'Vélo'}[sp]||sp,color:'#888'})
const O={weekOf:LUN,today:day(6),sportMeta:meta}

// ─── bornes ───
a(weekBounds(LUN).monday===LUN && weekBounds(LUN).sunday===day(6),'lundi -> dimanche')
a(weekBounds(day(3)).monday===LUN,'un jeudi ramene au lundi de sa semaine')

// ─── jours ───
const db={planningSessions:[
  S(0,'course','1 h',6), S(2,'muscu','1 h 30',9), S(4,'course','45 min',4),
  S(5,'velo','2 h',7,'planifie'),
  S(-3,'course','1 h',5),  // semaine precedente
], sessionLog:[{date:day(2),mins:20,cat:'mobilite',title:'Mobilité'}]}
const w=weekDays(db,O)
a(w.days.length===7,'7 jours')
a(w.days[0].done.length===1 && w.days[0].load===72,`lundi : 1 h a RPE 6 -> charge ${w.days[0].load}`)
a(w.days[1].active===false,'mardi vide')
a(w.days[2].played.length===1 && w.days[2].mins===110,'le lecteur integre compte dans les minutes')
a(w.days[2].hard,'mercredi a RPE 9 -> seance dure')
a(w.days[5].missed===1,'la seance planifiee du samedi est comptee comme non faite')
a(!w.days.some(d=>d.done.some(s=>s.date===day(-3))),'la semaine precedente est exclue')

// ─── par sport ───
const sp=bySport(w,meta)
a(sp.length===2,`2 sports realises (${sp.map(x=>x.label)})`)
a(sp[0].label==='Course à pied' && sp[0].sessions===2,'course en tete avec 2 seances')
a(sp[0].pct+sp[1].pct===100,'les parts somment a 100 %')
a(sp.every(x=>x.load>0),'chaque sport porte sa charge')

// ─── comparaison : LE point ───
const hist={planningSessions:[]}
for(let k=1;k<=BASELINE_WEEKS;k++) for(const d of [0,2,4]) hist.planningSessions.push(S(-7*k+d,'course','1 h',5))
// semaine en cours tres chargee
for(const d of [0,1,2,3,4]) hist.planningSessions.push(S(d,'course','1 h 30',9))
const c=compare(hist,O)
a(c.baselineWeeks===BASELINE_WEEKS,`moyenne calculee sur ${c.baselineWeeks} semaines`)
a(c.basePct>50,`charge superieure de ${c.basePct} % a la moyenne des 4 semaines`)
a(c.prevPct!==null,'ecart a la semaine precedente aussi disponible')
// une semaine de coupure fausse la comparaison a la seule semaine precedente
const afterBreak={planningSessions:[
  ...[1,2,3,4].flatMap(k=>[0,2,4].map(d=>S(-7*k+d,'course','1 h',5))),
]}
afterBreak.planningSessions=afterBreak.planningSessions.filter(s=>s.date<day(-7)||s.date>day(-1))
for(const d of [0,2,4]) afterBreak.planningSessions.push(S(d,'course','1 h',5))
const cb=compare(afterBreak,O)
a(cb.prevLoad===0,'semaine precedente vide')
a(cb.meanBase>0,'mais la moyenne de reference reste calculable : la comparaison ne s effondre pas')

// ─── regularite ───
const cons=consistency(w)
a(cons.active===3 && cons.rest===4,`${cons.active} jours actifs, ${cons.rest} de repos`)
a(cons.longest===1,'aucun enchainement')
const streak=consistency(weekDays({planningSessions:[0,1,2,3].map(i=>S(i,'course','1 h',5))},O))
a(streak.longest===4,'4 jours d affilee detectes')
a(streak.spread>0,'dispersion de la charge calculee')

// ─── respect du plan ───
const fit=planFit(w,{today:day(6)})
a(fit.done===3 && fit.missed===1,`${fit.done} faites, ${fit.missed} manquee`)
a(fit.pct===75,`${fit.pct} % du plan tenu`)
// une seance encore a venir n est pas une seance manquee
const early=planFit(w,{today:day(1)})
a(early.missed===0 && early.upcoming===1,'seance du samedi encore a venir le mardi -> pas reprochee')

// ─── ce qu on a fait de mieux ───
a(highlights({},O).length===0,'aucune donnee -> aucun record')
const recDb={planningSessions:[
  {id:'g1',date:day(-20),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:1}},
  {id:'g2',date:day(-10),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:2}},
  {id:'g3',date:day(3),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:5}},
]}
const hi=highlights(recDb,O)
a(hi.some(h=>h.key==='buts' && h.value===5),`record de la semaine detecte (${hi.find(h=>h.key==='buts').display} buts)`)
// un record etabli hors de la semaine n est pas remonte
const older={planningSessions:[
  {id:'o1',date:day(-20),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:5}},
  {id:'o2',date:day(3),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:1}},
]}
a(!highlights(older,O).some(h=>h.key==='buts'),'record anterieur a la semaine -> non remonte')
// une premiere mesure n est pas un record
const first={planningSessions:[{id:'f1',date:day(3),sport:'football',statut:'realise',duree:'1 h 30',data:{duree:90,buts:2}}]}
a(highlights(first,O).length===0,'une seule mesure -> pas encore un record')

// ─── seance la plus dure ───
a(toughest(weekDays({},O),meta)===null,'aucune seance -> null')
const tg=toughest(w,meta)
a(tg.label==='Musculation' && tg.rpe===9,`la plus dure : ${tg.label} a RPE ${tg.rpe}`)

// ─── contexte ───
const ctxDb={...db, sleepLog:Object.fromEntries([0,1,2,3,4,5,6].map(i=>[day(i),{hours:6,quality:3}])),
  weightLog:[{date:day(0),kg:78},{date:day(6),kg:77.2}]}
const ctx=context(ctxDb,O)
a(ctx.sleep && ctx.sleep.mean===6,`${ctx.sleep.mean} h de sommeil en moyenne`)
a(ctx.weight && ctx.weight.delta===-0.8,`poids ${ctx.weight.delta} kg sur la semaine`)
a(context({},O).sleep===null,'aucune donnee -> contexte vide sans crash')

// ─── synthese narrative ───
a(retroAnalysis(null,O).story.length>0,'db nulle -> sans crash')
a(/Aucune s[ée]ance cette semaine/.test(retroAnalysis({},O).story[0]),'semaine vide -> dit clairement')
const ra=retroAnalysis(ctxDb,O)
a(ra.story.length>=3,`${ra.story.length} phrases de recit`)
a(/3 s[ée]ances sur 3 jours/.test(ra.story.join(' ')),'volume raconte')
a(/2 sports/.test(ra.story.join(' ')),'repartition racontee')
a(/La plus dure/.test(ra.story.join(' ')),'seance marquante citee')
a(/n'a pas eu lieu/.test(ra.story.join(' ')),'seance manquee citee')
a(/6 h de sommeil par nuit/.test(ra.story.join(' ')),'contexte sommeil cite')
a(/Poids/.test(ra.story.join(' ')),'variation de poids citee')
// le record passe en premier
const raRec=retroAnalysis(recDb,O)
a(/meilleur r[ée]sultat/.test(raRec.story[0]),'un record ouvre le recit : '+raRec.story[0].slice(0,75))
// aucune seance faite mais des seances prevues
const missedAll=retroAnalysis({planningSessions:[0,2].map(i=>S(i,'course','1 h',5,'planifie'))},O)
a(/Aucune s[ée]ance r[ée]alis[ée]e/.test(missedAll.story[0]),'plan non tenu -> dit sans detour')
console.log('\nALL PASS')
