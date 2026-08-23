import { recommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const A=(g,st,opt)=>({grade:g,style:st,scale:'voie',...(opt||{})})
const S=(o,asc)=>({id:'e'+o,date:iso(o),sport:'escalade',statut:'realise',duree:'2 h',data:{ascents:asc}})

a(Array.isArray(recommendations({})),'db vide -> pas de crash')

// faiblesse par profil
const skew={planningSessions:[S(3,[A('7a','travail',{angle:'devers'}),A('6c+','travail',{angle:'devers'}),
  A('6c','travail',{angle:'devers'}),A('6a','travail',{angle:'dalle'}),A('5c','avue',{angle:'dalle'})])]}
const sk=txt(recommendations(skew))
a(/cotations d.[ée]cart/.test(sk),'ecart entre profils remonte : '+(sk.match(/Tu sors du[^.]*\./)||[''])[0].slice(0,95))
a(/qualit[ée] en retard/.test(sk),'presente comme une qualite en retard')

// seance sans echauffement
const cold={planningSessions:[S(3,[A('7a','travail'),A('6c','travail'),A('6b','travail'),A('6b','avue'),A('6a','avue')])]}
const ct=txt(recommendations(cold))
a(/commence directement en 7a/.test(ct),'demarrage a froid remonte')
a(/poulies des doigts/.test(ct),'avec la raison physiologique')

// projet abandonne
const proj={planningSessions:[
  S(120,[A('7b','essai',{name:'La Rage',attempts:5}),A('6b','avue'),A('6a','avue')]),
  S(100,[A('7b','essai',{name:'La Rage',attempts:5}),A('6a','avue'),A('5c','avue')]),
  S(5,[A('5c','avue'),A('6a','avue'),A('6a','travail')])]}
const pt=txt(recommendations(proj))
a(/La Rage.*ouvert depuis/.test(pt.replace(/\n/g,' ')),'projet en suspens remonte : '+(pt.match(/« La Rage »[^.]*\./)||[''])[0].slice(0,90))
a(/Le reprendre s[ée]rieusement ou le laisser/.test(pt),'et la decision est posee')

// prehensions
const grip={planningSessions:[S(3,Array.from({length:10},()=>A('6b','travail',{prises:['reglette']})))]}
a(/% de tes voies passent sur r[ée]glettes/.test(txt(recommendations(grip))),'prehension unique remontee')

// pratique equilibree -> silence
const ok={planningSessions:[S(5,[A('5b','avue',{angle:'dalle'}),A('6a','avue',{angle:'vertical'}),
  A('6b','travail',{angle:'devers'}),A('6a+','travail',{angle:'dalle'}),A('6b','flash',{angle:'vertical'})])]}
const okt=txt(recommendations(ok))
a(!/commence directement/.test(okt),'echauffement correct -> aucun reproche')
a(!/qualit[ée] en retard/.test(okt),'niveau homogene -> aucun reproche')
console.log('\nALL PASS')
