import { recommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const P=(e,t,o)=>({epreuve:e,temps:t,...(o||{})})
const S=(o,data)=>({id:'s'+o,date:iso(o),sport:'sprint',statut:'realise',duree:'1 h 30',data})

a(Array.isArray(recommendations({})),'db vide -> pas de crash')
a(!/homologable/.test(txt(recommendations({}))),'aucune donnee -> aucune conclusion sprint')

// chrono vente pris pour un record
const windy={planningSessions:[S(30,{perfs:[P('100','11.05',{vent:0.4})]}),S(10,{perfs:[P('100','10.78',{vent:3.6})]})]}
const wt=txt(recommendations(windy))
a(/au-del[àa] de la limite homologable/.test(wt),'chrono vente signale : '+(wt.match(/Ton meilleur 100 m[^.]*\./)||[''])[0].slice(0,100))
a(/Ta r[ée]f[ée]rence reste 11,05/.test(wt),'et la vraie reference rappelee')

// vent regulier -> silence
const clean={planningSessions:[S(30,{perfs:[P('100','11.05',{vent:0.4})]}),S(10,{perfs:[P('100','10.90',{vent:1.1})]})]}
a(!/au-del[àa] de la limite homologable/.test(txt(recommendations(clean))),'vent regulier -> aucune alerte')

// endurance de vitesse en retard
const weak={planningSessions:[S(10,{perfs:[P('100','11.00',{vent:0}),P('200','23.60',{vent:0})]})]}
const kt=txt(recommendations(weak))
a(/r[ée]sistance [àa] la fatigue qui manque/.test(kt),'differentiel remonte : '+(kt.match(/Ton 200 m[^.]*\./)||[''])[0].slice(0,95))

// hausse brutale du volume
const spike={planningSessions:[S(8,{series:2,reps:4,repDistance:60}),S(1,{series:5,reps:6,repDistance:100})]}
const st=txt(recommendations(spike))
a(/volume de sprint est pass[ée] de/.test(st),'hausse de volume remontee')
a(/ischio-jambiers/.test(st),'avec le risque nomme')

// recuperations trop courtes
const shortRec={planningSessions:[S(3,{repDistance:60,recup:'1:30'}),S(6,{repDistance:60,recup:'1:30'})]}
const rt=txt(recommendations(shortRec))
a(/travaille la r[ée]sistance plut[ôo]t que la vitesse pure/.test(rt),'recuperation insuffisante remontee')
a(/choix l[ée]gitime/.test(rt),'sans en faire une faute')

// reaction lente
const slow={planningSessions:[S(3,{perfs:[P('100','11.0',{reaction:0.26}),P('100','11.1',{reaction:0.27}),P('100','11.2',{reaction:0.25})]})]}
a(/au signal, pas [àa] la jambe/.test(txt(recommendations(slow))),'reaction lente remontee')
console.log('\nALL PASS')
