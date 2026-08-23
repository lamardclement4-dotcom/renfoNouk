import { recommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const A=(grade,style,scale,angle)=>({grade,style,scale:scale||'voie',angle})
const S=(o,asc)=>({id:'e'+o,date:iso(o),sport:'escalade',statut:'realise',duree:'2 h',data:{ascents:asc}})

a(Array.isArray(recommendations({})),'db vide -> pas de crash')
a(!/tendons des doigts/.test(txt(recommendations({}))),'aucune donnee -> aucune conclusion escalade')

// moins de 5 croix : on ne conclut pas
const few={planningSessions:[S(1,[A('7a','travail'),A('6a','avue')])]}
a(!/base manque/.test(txt(recommendations(few))),'trop peu de croix -> silence')

// deux seances dures consecutives
const b2b={planningSessions:[S(1,[A('7a','travail'),A('6c','travail'),A('6b','avue')]),
                             S(2,[A('7a','travail'),A('6c+','travail'),A('6b','flash')]),
                             S(9,[A('6a','avue'),A('6a','avue')])]}
const bt=txt(recommendations(b2b))
a(/deux s[ée]ances dures d.escalade sur deux jours cons[ée]cutifs/.test(bt),'enchainement remonte : '+(bt.match(/\d+ fois deux séances[^.]*\./)||[''])[0].slice(0,80))
a(/tendons des doigts s.adaptent bien plus lentement/.test(bt),'avec la raison physiologique')

// pyramide trop mince
const thin={planningSessions:[S(3,[A('7a','travail'),A('6c+','travail'),A('6b','avue'),A('6a','avue'),A('6a','flash')])]}
const tt=txt(recommendations(thin))
a(/la base manque/.test(tt),'pyramide fragile remontee : '+(tt.match(/Tu as sorti du[^.]*\./)||[''])[0].slice(0,90))

// ecart a vue / apres travail
const gap={planningSessions:[S(3,[A('7b','travail'),A('6a','avue'),A('6a','avue'),A('5c','avue'),A('5c','flash')])]}
a(/Consolider le niveau interm[ée]diaire/.test(txt(recommendations(gap))),'ecart de niveau remonte')

// profil unique
const dev={planningSessions:[S(3,Array.from({length:9},()=>A('6b','travail','voie','devers')))]}
const dt=txt(recommendations(dev))
a(/% de tes croix sont en d[ée]vers/.test(dt),'desequilibre de profil remonte')
a(/tu ne grimpes jamais en/.test(dt),'et les profils absents sont nommes')

// pratique equilibree -> silence
const ok={planningSessions:[
  S(3,[A('6c','travail','voie','dalle'),A('6b+','travail','voie','vertical'),A('6b+','flash','voie','devers'),A('6b','avue','voie','dalle'),A('6b+','avue','voie','vertical')]),
  S(10,[A('6b+','travail','voie','devers'),A('6b','avue','voie','dalle')])]}
const okt=txt(recommendations(ok))
a(!/tendons des doigts/.test(okt) && !/la base manque/.test(okt),'pratique saine -> aucune alerte escalade')
console.log('\nALL PASS')
