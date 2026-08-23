import { recommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const d0=new Date()
const iso=(o)=>{const d=new Date(d0);d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const S=(o,duree,rpe,statut)=>({id:'s'+o+(rpe||''),date:iso(o),sport:'course',duree,statut:statut||'planifie',...(rpe?{data:{rpe}}:{})})
// Jours restants de la semaine en cours. Leur NOMBRE dépend du jour où le
// test tourne : un jeudi il en reste quatre, un dimanche un seul. On
// compense en chargeant chaque jour restant assez pour que la projection
// franchisse le seuil quel que soit le jour — sinon le test passerait ou
// échouerait selon la date.
const dow=(d0.getDay()+6)%7
const future=[];for(let i=0;i<=6-dow;i++) future.push(-i)
const perDay=Math.ceil(12/future.length)  // séances par jour restant

a(Array.isArray(recommendations({})),'db vide -> pas de crash')
a(!/Si tu fais tout ce qui est pr[ée]vu/.test(txt(recommendations({}))),'sans planning -> aucune projection')

// historique regulier + semaine prevue tres lourde
const hist=[];for(let k=1;k<=28;k++) hist.push(S(k,'1 h',5,'realise'))
const heavy={planningSessions:hist.concat(future.flatMap(o=>Array.from({length:perDay},(_,k)=>({...S(o,'1 h 30',9),id:'f'+o+'_'+k}))))}
const ht=txt(recommendations(heavy))
a(/Si tu fais tout ce qui est pr[ée]vu cette semaine/.test(ht),'projection remontee : '+(ht.match(/Si tu fais tout[^.]*\./)||[''])[0].slice(0,105))
a(/pour l'instant/.test(ht),'distingue ce qui est deja fait de ce qui reste')
a(/all[ée]ger ou d[ée]placer/.test(ht),'et propose une action concrete')

// semaine legere -> silence
const light={planningSessions:hist.concat([S(0,'45 min',4)])}
a(!/Si tu fais tout ce qui est pr[ée]vu/.test(txt(recommendations(light))),'semaine legere -> aucune alerte de projection')

// aucune seance restante a faire : rien a annoncer
const allDone={planningSessions:hist.concat(future.map(o=>S(o,'1 h 30',9,'realise')))}
a(!/Si tu fais tout ce qui est pr[ée]vu/.test(txt(recommendations(allDone))),'plus rien a faire -> pas de projection')

// structure : pas de repos
const noRest={planningSessions:hist.concat([0,1,2,3,4,5,6].map(i=>({id:'n'+i,date:iso(dow-i),sport:'course',duree:'1 h',statut:'planifie',data:{rpe:5}})))}
const nt=txt(recommendations(noRest))
a(/Aucun jour de repos complet/.test(nt),'absence de repos signalee')

// planning non tenu
const dropped={planningSessions:[]}
for(let k=1;k<=20;k++) dropped.planningSessions.push(S(k,'1 h',6,k<=5?'realise':'planifie'))
a(/plus ambitieux que ce qui se r[ée]alise/.test(txt(recommendations(dropped))),'planning irrealiste signale')
console.log('\nALL PASS')
