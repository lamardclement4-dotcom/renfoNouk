import { recommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const R=(o,data,sp)=>({id:'r'+o+(data.distance||'')+(sp||''),date:iso(o),sport:sp||'course',statut:'realise',duree:'1 h',data})
const prof={profilePhys:{poids:72,sexe:'h',age:32}}

a(Array.isArray(recommendations({})),'db vide -> pas de crash')
a(!/tu vaudrais environ/.test(txt(recommendations({}))),'aucune donnee -> aucune projection')

// projection sur une distance jamais courue
const runner={...prof,planningSessions:[R(10,{distance:10,temps:'44:00',denivele:30}),R(40,{distance:5,temps:'21:00',denivele:10})]}
const rt=txt(recommendations(runner))
a(/tu vaudrais environ/.test(rt),'projection remontee : '+(rt.match(/D'après ton[^—]*/)||[''])[0].slice(0,95))
a(/une projection, pas une promesse/.test(rt),'et presentee comme telle')
a(/semi-marathon/i.test(rt),'sur une distance jamais courue')

// hausse de volume brutale
const spike={...prof,planningSessions:[R(8,{distance:10,temps:'50:00'}),R(0,{distance:22,temps:'2:00:00'}),R(2,{distance:22,temps:'2:00:00'})]}
const st=txt(recommendations(spike))
a(/volume de course est pass[ée] de/.test(st),'hausse de volume remontee : '+(st.match(/Ton volume de course[^.]*\./)||[''])[0].slice(0,90))
a(/tendons et les os/.test(st),'avec la raison')

// cadence basse
const cad={...prof,planningSessions:[R(2,{distance:8,temps:'45:00',cadence:158}),R(5,{distance:8,temps:'45:00',cadence:156}),R(9,{distance:8,temps:'45:00',cadence:160})]}
a(/Cadence moyenne de 158/.test(txt(recommendations(cad))),'cadence basse remontee')

// une seule nage
const swim={...prof,planningSessions:[1,5,9,13].map(o=>R(o,{distance:1500,temps:'30:00',nages:['Crawl']},'natation'))}
const wt=txt(recommendations(swim))
a(/ne nages qu.en crawl/.test(wt),'nage unique remontee')
a(/Varier les nages/.test(wt),'et la raison donnee')

// pratique variee -> silence
const varied={...prof,planningSessions:[1,5,9,13].map((o,i)=>R(o,{distance:1500,temps:'30:00',nages:i%2?['Crawl','Dos']:['Brasse']},'natation'))}
a(!/ne nages qu.en/.test(txt(recommendations(varied))),'nages variees -> aucun reproche')
console.log('\nALL PASS')
