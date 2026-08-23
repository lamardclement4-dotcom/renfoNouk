import { rankRecommendations, MAX_PER_DOMAIN, TOP_COUNT } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const r=(level,action,text)=>({level,icon:'x',text,action})

a(rankRecommendations([]).top.length===0,'liste vide -> rien')
a(rankRecommendations(null).total===0,'entree nulle geree')
a(rankRecommendations([{level:'warn'}]).total===0,'entree sans texte ecartee')

// gravite : les alertes remontent
const mixed=[r('info','a','Info un'),r('alert','b','Alerte grave'),r('warn','c','Avertissement')]
const mk=rankRecommendations(mixed)
a(mk.top[0].level==='alert','l alerte passe devant')
a(mk.top[1].level==='warn' && mk.top[2].level==='info','puis avertissement, puis info')

// LE cas : un domaine qui noie les autres
const flood=[
  r('info','mobility','Zones de mobilité à travailler : Hanches'),
  r('warn','mobility','Hanches ressort dans 2 sources'),
  r('info','mobility','Ton programme de mobilité a 60 jours'),
  r('info','mobility','Ton test de mobilité a 100 jours'),
  r('warn','mobility','En course, chaîne postérieure est une zone clé'),
  r('alert','prevention','Douleur au genou depuis 40 jours'),
]
const fk=rankRecommendations(flood)
a(fk.top.filter(x=>x.action==='mobility').length===MAX_PER_DOMAIN,
  `la mobilité est limitée à ${MAX_PER_DOMAIN} entrées au lieu de 5`)
a(fk.top[0].action==='prevention','la douleur passe en premier, elle ne se fait plus noyer')
a(fk.rest.length===3,`les 3 restantes sont conservees, pas jetees (${fk.rest.length})`)
a(fk.top.length + fk.rest.length === 6,'aucun conseil perdu au total')

// doublons
const dup=[
  r('warn','sommeil','Seulement 5.0 h de sommeil cette nuit — en-dessous de 6 h'),
  r('warn','sommeil','Seulement 4.5 h de sommeil cette nuit — en-dessous de 6 h'),
  r('info','a','Autre sujet completement different ici'),
]
const dk=rankRecommendations(dup)
a(dk.duplicates===1,'les deux phrases quasi identiques comptent pour un doublon')
a(dk.top.length===2,'une seule des deux est conservee')
a(dk.top.some(x=>/sommeil/.test(x.text)),'la premiere version est gardee')
// deux conseils du meme domaine partageant une ouverture mais differents
const nearMiss=[
  r('info','mobility','Ton programme de mobilité a 60 jours et aucune séance faite'),
  r('info','mobility','Ton test de mobilité a 100 jours — le refaire prend quelques minutes'),
]
a(rankRecommendations(nearMiss).duplicates===0,'meme ouverture mais sujets differents -> pas fusionnes')
// domaines differents, texte identique : ce ne sont pas des doublons
const crossDomain=[r('info','a','Rien à signaler pour le moment'),r('info','b','Rien à signaler pour le moment')]
a(rankRecommendations(crossDomain).duplicates===0,'meme texte dans deux domaines -> conserves tous les deux')

// diversite : le premier tour prend un conseil par domaine
const many=[]
for(const d of ['a','b','c','d','e']) { many.push(r('info',d,'Premier de '+d)); many.push(r('info',d,'Second tres different pour '+d)) }
const dv=rankRecommendations(many,{max:5})
a(new Set(dv.top.map(x=>x.action)).size===5,'les 5 premiers couvrent 5 domaines distincts')

// plafond global
const lots=[]
// textes reellement distincts : sinon l empreinte les confond a juste titre
const SUJ=['sommeil','hydratation','proteines','charge','mobilite','gainage','souplesse','cadence','recuperation','cafeine',
 'fibres','glucides','lipides','tonnage','equilibre','tempo','repos','allure','denivele','technique',
 'fer','zinc','magnesium','vitamine','creatine','echauffement','etirement','massage','respiration','objectif',
 'poids','masse','tour de taille','pouls','tension','stress','humeur','energie','appetit','digestion']
for(let i=0;i<40;i++) lots.push(r('info','d'+i,`Point sur ${SUJ[i]} a surveiller de pres cette semaine`))
a(rankRecommendations(lots).top.length===TOP_COUNT,`plafond global de ${TOP_COUNT} respecte`)
a(rankRecommendations(lots).rest.length===32,'le reste est accessible')

// domaine absent
a(rankRecommendations([r('warn',null,'Sans domaine')]).top.length===1,'conseil sans domaine gere')
console.log('\nALL PASS')
