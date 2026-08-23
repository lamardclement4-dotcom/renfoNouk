import { SPORT_FIELDS } from '../../src/features/train/plannerData.js'
import { SPORTS } from '../../src/features/train/trainData.js'
import { readFileSync } from 'node:fs'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const ids=Object.keys(SPORT_FIELDS)
const all=ids.flatMap(id=>SPORT_FIELDS[id].fields)
console.log('sports :',ids.length,'| champs :',all.length)

// --- couverture ---
a(all.length>=250,`${all.length} champs au total (96 avant)`)
const thin=ids.filter(id=>SPORT_FIELDS[id].fields.length<4)
a(thin.length===0,`aucun sport sous 4 champs${thin.length?' : '+thin:''} (17 en avaient 2)`)
const minF=Math.min(...ids.map(id=>SPORT_FIELDS[id].fields.length))
a(minF>=5,`le sport le moins detaille en a ${minF}`)

// --- RPE partout : c est lui qui permet de calculer une charge ---
const noRpe=ids.filter(id=>!SPORT_FIELDS[id].fields.some(f=>f.k==='rpe'))
a(noRpe.length===0,`les ${ids.length} sports ont un RPE${noRpe.length?' sauf '+noRpe:''}`)

// --- integrite des definitions ---
const TYPES=new Set(['num','text','time','select1','pills','bool','auto-allure'])
const badType=all.filter(f=>!TYPES.has(f.t))
a(badType.length===0,`tous les types sont rendus par l ecran${badType.length?' | inconnus: '+badType.map(f=>f.t):''}`)
const noOpts=all.filter(f=>(f.t==='select1'||f.t==='pills')&&(!Array.isArray(f.opts)||!f.opts.length))
a(noOpts.length===0,'chaque liste de choix a bien ses options')
const noLab=all.filter(f=>!f.lab)
a(noLab.length===0,'chaque champ a un libelle')
for(const id of ids){
  const ks=SPORT_FIELDS[id].fields.map(f=>f.k)
  a(new Set(ks).size===ks.length,`aucune cle dupliquee dans ${id}`)
}
a(ids.every(id=>SPORT_FIELDS[id].icon&&SPORT_FIELDS[id].label),'chaque sport a une icone et un libelle')

// --- les cles d origine sont conservees (donnees deja enregistrees) ---
const ORIG={demi:['distance','temps','allure','fc'],fond:['distance','temps','allure','fc'],
 marche:['distance','duree','denivele','terrain'],velo:['distance','temps','denivele','fc','type'],
 vtt:['distance','temps','denivele','difficulte'],aviron:['distance','temps','fc','type'],
 patinage:['duree','distance','type'],orientation:['distance','temps','denivele','difficulte'],
 triathlon:['nage','velo','course','temps_total'],natation:['distance','temps','longueurs','bassin','nages'],
 surf:['duree','vagues','conditions'],voile:['duree','vent'],plongee:['profondeur','duree','type'],
 football:['duree','type','fc'],basket:['duree','type','fc'],rugby:['duree','type','fc'],
 raquette:['duree','type','sets'],pingpong:['duree','type','sets'],frisbee:['duree','type'],
 combat:['duree','type','intensite'],escrime:['duree','type','touches'],
 lancers:['nb_lancers','meilleure_perf','engin'],saut:['nb_sauts','meilleure_perf','type'],
 ski:['duree','descentes','denivele','niveau','chute'],skate:['duree','type','chute'],
 trampoline:['duree','type'],golf:['trous','type'],tir:['nb_tirs','type','distance'],
 petanque:['duree','parties','type'],danse:['duree','style','intensite'],yoga:['duree','style'],
 equitation:['duree','type'],crossfit:['duree','type','rpe'],gym:['duree','type'],
 callisthenie:['duree','type'],halterophilie:['duree','mouvement','charge_max'],fitness:['duree','type']}
let lost=[]
for(const [id,keys] of Object.entries(ORIG)){
  const now=new Set((SPORT_FIELDS[id]||{fields:[]}).fields.map(f=>f.k))
  for(const k of keys) if(!now.has(k)) lost.push(id+'.'+k)
}
a(lost.length===0,`les ${Object.values(ORIG).flat().length} cles d origine sont toutes conservees${lost.length?' | perdues: '+lost:''}`)

// --- tous les sports du catalogue sont couverts ---
const DEDIES=['course','trail','perche','sprint','escalade','muscu']
const orphelins=SPORTS.map(s=>s.id).filter(id=>!SPORT_FIELDS[id]&&!DEDIES.includes(id))
a(orphelins.length===0,`aucun sport sans champs${orphelins.length?' : '+orphelins:''} (les 6 autres ont un ecran dedie)`)

// --- le bug auto-allure ---
const src=readFileSync('../../src/features/train/PlannerSpace.jsx','utf8')
const gen=src.slice(src.indexOf('function GenericSportFields'),src.indexOf('function ExerciseSetRow'))
a(/auto-allure/.test(gen),"le rendu generique traite desormais auto-allure (il retombait sur null)")
a(/computeAllure\(data\.distance, data\.temps\)/.test(gen),"et recalcule l allure depuis distance et temps")
const autoSports=ids.filter(id=>SPORT_FIELDS[id].fields.some(f=>f.t==='auto-allure'))
a(autoSports.length===2,`les 2 sports concernes (${autoSports}) affichent maintenant leur allure`)

// --- repartition ---
const byCount={}
for(const id of ids){const n=SPORT_FIELDS[id].fields.length;byCount[n]=(byCount[n]||0)+1}
console.log('champs par sport :',JSON.stringify(Object.fromEntries(Object.entries(byCount).sort((a,b)=>+a[0]-+b[0]))))
console.log('\nALL PASS')
