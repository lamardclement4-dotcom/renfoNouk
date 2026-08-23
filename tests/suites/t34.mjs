import { acwrRisk } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const sess=(o,rpe)=>({id:'s'+o,date:iso(o),statut:'realise',sport:'course',duree:'60',...(rpe?{data:{rpe}}:{})})

// meme volume, intensites opposees
const base=[];for(let i=1;i<=28;i++) base.push(sess(i))
const easy={planningSessions:base.concat([1,3,5].map(o=>sess(o,3)))}
const hard={planningSessions:base.concat([1,3,5].map(o=>sess(o,10)))}
const rEasy=acwrRisk(easy), rHard=acwrRisk(hard)
a(rEasy.available && rHard.available,'ACWR calculable dans les deux cas')
a(rHard.ratio > rEasy.ratio, `meme volume, mais RPE 10 pese plus que RPE 3 (${rHard.ratio} vs ${rEasy.ratio})`)

// sans RPE : comportement inchange, on ne fabrique rien
const noRpe={planningSessions:base}
const withNeutral={planningSessions:base.map(s=>({...s,data:{rpe:5}}))}
a(Math.abs(acwrRisk(noRpe).ratio - acwrRisk(withNeutral).ratio) < 0.02,
  `RPE absent equivaut a RPE 5 (neutre) : ${acwrRisk(noRpe).ratio} vs ${acwrRisk(withNeutral).ratio}`)

// RPE invalide ignore
const bad={planningSessions:base.map(s=>({...s,data:{rpe:0}}))}
a(Math.abs(acwrRisk(bad).ratio - acwrRisk(noRpe).ratio) < 0.02,'RPE a 0 (champ vide) traite comme absent')
const nan={planningSessions:base.map(s=>({...s,data:{rpe:'abc'}}))}
a(Math.abs(acwrRisk(nan).ratio - acwrRisk(noRpe).ratio) < 0.02,'RPE non numerique ignore')

// une semaine dure apres un mois calme : le ratio doit grimper
const calm=[];for(let i=8;i<=28;i++) calm.push(sess(i,4))
const spike={planningSessions:calm.concat([1,2,3,4,5].map(o=>sess(o,9)))}
const rs=acwrRisk(spike)
a(rs.ratio>1.3,`pic d intensite detecte (ratio ${rs.ratio}, niveau ${rs.level})`)
console.log('\nALL PASS')
