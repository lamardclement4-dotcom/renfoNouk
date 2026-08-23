import { recommendations, rankRecommendations } from '../../src/features/train/renfoIntel.js'
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const at=(dISO,h,ml,caf)=>{const[y,m,d]=dISO.split('-').map(Number);return{id:'x',ts:new Date(y,m-1,d,h,0).getTime(),n:'b',cat:'eau',factor:1,ml:ml||0,caf:caf||0,sugar:12}}
// profil realiste : quelqu un qui utilise vraiment l app depuis 3 mois
const db={ profilePhys:{poids:78,taille:180,sexe:'h',age:32,sports:['course','muscu']},
  foodTargets:{kcal:2400,prot:150,gluc:260,lip:80,fib:30},
  planningSessions:[], sleepLog:{}, hydroLog:{}, foodLog:{}, suppTaken:{},
  suppPlan:['creatine','vitd','magnesium','fer','calcium'],
  physTests:[{testId:'cooper',value:2600,date:iso(120),unit:'m'},{testId:'cooper',value:2200,date:iso(10),unit:'m'},
             {testId:'gai_max',value:120,date:iso(120),unit:'s'},{testId:'gai_max',value:80,date:iso(10),unit:'s'}],
  mobility:{date:iso(100),score:58,level:'x',zones:[{id:'hanches',label:'Hanches',val:1},{id:'post',label:'Chaîne postérieure',val:1},{id:'chevilles',label:'Chevilles',val:2}]},
  mobilityHistory:[{date:iso(160),score:58,level:'x',zones:[{id:'hanches',label:'Hanches',val:1},{id:'post',label:'Chaîne postérieure',val:2},{id:'chevilles',label:'Chevilles',val:2}]},
                   {date:iso(100),score:58,level:'x',zones:[{id:'hanches',label:'Hanches',val:1},{id:'post',label:'Chaîne postérieure',val:1},{id:'chevilles',label:'Chevilles',val:2}]}],
  sensitiveZones:['hanches'],
  program:{createdAt:Date.now()-60*864e5,weak:['hanches','post','chevilles'],done:{},sessions:[{id:'a'},{id:'b'},{id:'c'}]},
  prevention:{date:iso(100),score:55,level:'Élevé',tags:['charge','core','recup'],pain:{active:true,region:'genou',urgent:false}},
  preventionLog:[{date:iso(160),score:60,level:'Élevé',tags:['charge','core','recup']},{date:iso(100),score:55,level:'Élevé',tags:['charge','core','recup']}],
  painEpisodes:[{region:'genou',start:iso(200),end:iso(180)},{region:'genou',start:iso(40)}],
  weightLog:[], weightGoal:74,
  customGoals:[{id:'g1',label:'Courir 10 km',done:false,createdAt:iso(120)}],
  smartGoals:[{id:'s1',s:'Semi-marathon',due:iso(3)}],
  breathLog:[], diagHistory:[{date:iso(160),score:62,piliers:{energie:40,alimentation:55,hydratation:85,recuperation:70,comportement:50}},
                             {date:iso(100),score:62,piliers:{energie:70,alimentation:55,hydratation:85,recuperation:80,comportement:50}}],
}
// 3 mois de donnees
for(let i=0;i<90;i++){
  const d=iso(i)
  db.sleepLog[d]={hours:i%3===0?5:6.5,quality:2,awakenings:2}
  db.hydroLog[d]=[at(d,9,600),at(d,20,300,140)]
  db.foodLog[d]=[{id:'a',n:'x',k:1900,p:95,g:200,l:70,fib:16}]
  db.suppTaken[d]= i%2===0?['creatine']:[]
  db.weightLog.push({date:d,kg:78+ (i*0.01)})
}
for(let i=0;i<24;i++){
  db.planningSessions.push({id:'s'+i,date:iso(i*2),statut:'realise',sport:i%2?'muscu':'course',duree:'90',
    exercises:i%2?[{name:'Développé couché',group:'Pectoraux',sets:[{mode:'reps',series:6,reps:8,charge:80,rpe:9}]},
                   {name:'Squat',group:'Quadriceps',sets:[{mode:'reps',series:5,reps:8,charge:100,rpe:9}]}]:undefined})
}
const recos=recommendations(db)
console.log('NOMBRE DE RECOMMANDATIONS :', recos.length)
const byLevel={}; const byAction={}
for(const r of recos){byLevel[r.level]=(byLevel[r.level]||0)+1;byAction[r.action]=(byAction[r.action]||0)+1}
console.log('par niveau  :', JSON.stringify(byLevel))
console.log('par domaine :', JSON.stringify(byAction))
const k=rankRecommendations(recos)
console.log('\nAPRES HIERARCHISATION : ' + k.top.length + ' en tete, ' + k.rest.length + ' accessibles, ' + k.duplicates + ' doublons ecartes')
console.log('domaines en tete :', [...new Set(k.top.map(x=>x.action))].join(', '))
console.log('\n--- ce que l ecran Coach montre d abord ---')
k.top.forEach((r,i)=>console.log(`${String(i+1).padStart(2)}. [${r.level}/${r.action}] ${r.text.slice(0,86)}`))
const stall=recos.find(r=>/plafonne/.test(r.text))
console.log('\n--- conseil muscu (etait contradictoire avec l ecran Progres) ---')
console.log(stall ? stall.text : 'aucun')
