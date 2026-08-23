import { toSeconds, fieldValue, fmtValue, shortLabel, sessionsOfSport, practisedSports,
  fieldRecords, fieldSplits, fieldFlags, fieldTexts, sportAnalysis, genericAnalysis, unitOf,
  DOMINANT_PCT, FREQUENT_PCT, TEXT_MIN_REPEAT }
  from '../../src/features/train/genericIntel.js'
import { SPORT_FIELDS } from '../../src/features/train/plannerData.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const T='2026-06-15'
const back=(n)=>{const[y,m,d]=T.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));x.setUTCDate(x.getUTCDate()-n);return x.toISOString().slice(0,10)}
const S=(off,sport,data,statut)=>({id:'s'+sport+off,date:back(off),sport,statut:statut||'realise',duree:'1 h 30',data})
const mk=(l)=>({planningSessions:l})
const O={today:T}

// ─── conversions ───
a(toSeconds('45:00')===2700,'mm:ss converti')
a(toSeconds('1:05:00')===3900,'h:mm:ss converti')
a(toSeconds('1:05')===65 && toSeconds('58:00')===3480,'1:05 vaut bien moins que 58:00, contrairement aux chaines')
a(toSeconds('')===null && toSeconds('abc')===null,'invalide -> null')
a(fieldValue({t:'num'},'42')===42 && fieldValue({t:'num'},'')===null,'champ numerique')
a(fieldValue({t:'select1'},'Match')===null,'un choix n est pas une valeur numerique')
a(fmtValue({t:'time'},3900)==='1:05:00','affichage d une duree')
a(fmtValue({t:'num'},12.5)==='12,5','decimale a la francaise')
a(fmtValue({t:'num'},null)===null,'valeur absente -> null')
a(shortLabel({lab:'Buts marqués (0)'})==='Buts marqués','unite retiree du libelle')
a(shortLabel({lab:'Dénivelé+ (m)'})==='Dénivelé+','parentheses finales retirees')

// ─── couverture des declarations ───
const withDir=Object.values(SPORT_FIELDS).flatMap(c=>c.fields).filter(f=>f.dir)
a(withDir.length>=85,`${withDir.length} champs portent une direction de record`)
a(withDir.every(f=>f.dir==='up'||f.dir==='down'),'chaque direction est up ou down')
a(withDir.every(f=>f.t==='num'||f.t==='time'),'seuls des champs mesurables portent une direction')
// verification de sens sur des cas connus
const get=(sp,k)=>SPORT_FIELDS[sp].fields.find(f=>f.k===k)
a(get('golf','score').dir==='down','au golf, un score bas vaut mieux')
a(get('tir','score').dir==='up','au tir, un score haut vaut mieux')
a(get('golf','putts').dir==='down','moins de putts vaut mieux')
a(get('orientation','erreurs').dir==='down','moins d erreurs vaut mieux')
a(get('triathlon','t1').dir==='down','une transition courte vaut mieux')
a(get('halterophilie','charge_max').dir==='up','une charge plus lourde vaut mieux')
a(!get('marche','sac').dir,'le poids du sac n est pas un record')
a(!get('plongee','temp_eau').dir,'la temperature de l eau non plus')

// ─── sports pratiques ───
a(practisedSports({},O).length===0,'aucune seance')
const db=mk([
  S(30,'football',{duree:90,buts:1,passes_d:0,poste:'Milieu',surface:'Herbe',type:'Match'}),
  S(20,'football',{duree:90,buts:2,passes_d:1,poste:'Milieu',surface:'Herbe',type:'Match'}),
  S(10,'football',{duree:60,buts:0,passes_d:2,poste:'Milieu',surface:'Synthétique',type:'Entraînement'}),
  S(3,'football',{duree:90,buts:3,passes_d:1,poste:'Milieu',surface:'Herbe',type:'Match'}),
  S(5,'golf',{trous:18,score:92,putts:34}),
  S(1,'golf',{trous:18,score:88,putts:31}),
  S(2,'football',{duree:90,buts:1},'planifie'),
])
a(practisedSports(db,O).sort().join()==='football,golf','2 sports pratiques detectes')
a(sessionsOfSport(db,'football',O).length===4,'la seance planifiee est exclue')

// ─── records generiques : LE point ───
const rec=fieldRecords(db,'football',O)
a(rec.length>0,`${rec.length} champs suivis en record`)
const buts=rec.find(r=>r.key==='buts')
a(buts.best.value===3 && buts.dir==='up',`meilleur total de buts : ${buts.best.value}`)
a(buts.isRecent,'record battu a la derniere seance -> signale comme recent')
a(buts.count===4,'4 seances renseignees, y compris le match a 0 but')
// LE piege : zero n a pas le meme sens selon la grandeur
const zeroDown=fieldRecords(mk([S(5,'golf',{trous:18,score:0,putts:30}),S(1,'golf',{trous:18,score:88,putts:31})]),'golf',O)
a(zeroDown.find(r=>r.key==='score').best.value===88,'un score de 0 ne devient pas un record imbattable')
const zeroUp=fieldRecords(mk([S(5,'football',{duree:90,buts:0}),S(1,'football',{duree:90,buts:0})]),'football',O)
a(zeroUp.find(r=>r.key==='buts').count===2,'mais deux matchs a 0 but comptent bien pour deux')
const golf=fieldRecords(db,'golf',O)
const score=golf.find(r=>r.key==='score')
a(score.best.value===88 && score.dir==='down',`meilleur score de golf : ${score.best.value} (le plus bas)`)
a(score.progress===4,`progression de ${score.progress} coups`)
const putts=golf.find(r=>r.key==='putts')
a(putts.best.value===31,'meilleur nombre de putts : le plus bas aussi')
// un champ sans direction ne produit pas de record
a(!fieldRecords(mk([S(1,'marche',{distance:12,sac:8}),S(5,'marche',{distance:10,sac:12})]),'marche',O).some(r=>r.key==='sac'),
  'le poids du sac ne devient pas un record')
a(fieldRecords({},'football',O).length===0,'aucune seance -> aucun record')
a(fieldRecords(db,'sport_inexistant',O).length===0,'sport inconnu -> aucun record')

// ─── repartitions ───
const sp=fieldSplits(db,'football',O)
const poste=sp.find(x=>x.key==='poste')
a(poste && poste.dominant.value==='Milieu' && poste.dominant.pct===100,'poste unique detecte')
a(poste.lopsided,'et signale comme tel')
const surface=sp.find(x=>x.key==='surface')
a(surface.items.length===2,'2 surfaces jouees')
a(surface.never.some(n=>n==='Salle'),'les surfaces jamais jouees sont nommees')
a(fieldSplits(db,'football',{...O,minCount:99}).length===0,'seuil de comptage respecte')

// ─── frequences ───
const chutes=mk([1,5,9,13].map(o=>S(o,'ski',{descentes:8,chute:o<9})))
const fl=fieldFlags(chutes,'ski',O)
const cf=fl.find(x=>x.key==='chute')
a(cf && cf.answered===4 && cf.yes===2,`${cf.yes} chutes sur ${cf.answered} seances renseignees`)
a(cf.pct===50 && cf.frequent,`${cf.pct} % -> frequent (seuil ${FREQUENT_PCT})`)
// une case jamais renseignee n est pas un "non"
const unanswered=mk([1,5,9,13].map(o=>S(o,'ski',{descentes:8})))
a(fieldFlags(unanswered,'ski',O).length===0,'case jamais renseignee -> aucune conclusion')
a(fieldFlags(mk([S(1,'ski',{chute:true})]),'ski',O).length===0,'trop peu de seances -> aucune conclusion')

// ─── synthese ───
a(sportAnalysis({},'football',O)===null,'aucune seance -> null')
a(sportAnalysis(db,'inconnu',O)===null,'sport inconnu -> null')
const sa=sportAnalysis(db,'football',O)
a(sa.label==='Football' && sa.sessions===4,'synthese par sport')
a(sa.tips.some(t=>/meilleur r[ée]sultat/.test(t)),'record recent remonte : '+(sa.tips.find(t=>/meilleur/.test(t))||'').slice(0,80))
a(sa.tips.some(t=>/jamais/.test(t)),'options jamais choisies remontees')
const ga=genericAnalysis(db,O)
a(ga.bySport.length===2,'les 2 sports analyses')
a(ga.tips.length>0,'conseils agreges')
a(genericAnalysis({},O).bySport.length===0,'db vide -> rien, sans crash')
a(genericAnalysis(null,O).tips.length===0,'db nulle geree')
// ─── temps devenus des records ───
const tri=mk([S(30,'triathlon',{nage:1500,velo:40,course:10,temps_total:'2:35:00',t1:'2:30'}),
              S(5,'triathlon',{nage:1500,velo:40,course:10,temps_total:'2:28:00',t1:'2:05'})])
const tr=fieldRecords(tri,'triathlon',O)
const tt=tr.find(r=>r.key==='temps_total')
a(tt && tt.dir==='down' && tt.best.value===8880,`meilleur temps de triathlon : ${fmtValue(tt,tt.best.value)} (le plus court)`)
a(tr.find(r=>r.key==='t1').dir==='down','la transition la plus rapide fait record')

// ─── valeurs libres qui se repetent ───
a(fieldTexts({},'surf',O).length===0,'aucune seance -> rien')
const spots=mk([1,5,9,13].map((o,i)=>S(o,'surf',{duree:'1h30',vagues:10,spot:i<3?'La Torche':'Hossegor'})))
const ft=fieldTexts(spots,'surf',O)
a(ft.length===1,'seul le spot est retenu : la duree en texte libre est une quantite, pas une etiquette')
a(ft[0].top.label==='La Torche',`spot le plus frequent : ${ft[0].top.label}`)
a(ft[0].top.count===3 && ft[0].distinct===2,`${ft[0].top.count} fois sur ${ft[0].total}, ${ft[0].distinct} spots distincts`)
// casse et espaces ignores
const messy=mk([1,5,9].map(o=>S(o,'surf',{duree:'1h30',spot:o===1?'la torche':'  La Torche '})))
a(fieldTexts(messy,'surf',O)[0].top.count===3,'casse et espaces regroupes')
// une valeur unique n apprend rien
const unique=mk([1,5].map((o,i)=>S(o,'surf',{duree:'1h30',spot:'Spot'+i})))
a(fieldTexts(unique,'surf',O).length===0,`valeur jamais repetee -> ecartee (seuil ${TEXT_MIN_REPEAT})`)
const sa2=sportAnalysis(spots,'surf',O)
a(sa2.tips.some(t=>/La Torche.*revient 3 fois/.test(t)),'et remonte en synthese')

// ─── mise en forme : le format que voit reellement l ecran ───
// fmtValue lisait `field.t`, or aucun appelant ne passe un champ brut : tous
// passent un enregistrement de fieldRecords, qui porte `type`. Les temps
// s affichaient donc en secondes.
a(fmtValue({ t: 'time' }, 2400) === '40:00', 'champ brut : 40 min mis en forme')
a(fmtValue({ type: 'time' }, 2400) === '40:00', 'enregistrement de fieldRecords : 40 min aussi')
a(fmtValue({ type: 'time' }, 200) === '3:20', '200 s -> 3:20, pas 200')
a(fmtValue({ type: 'time' }, 5700) === '1:35:00', 'au-dela de l heure')
a(fmtValue({ type: 'num' }, 37.456) === '37,46', 'nombre a la francaise')
a(fmtValue({ type: 'time' }, null) === null, 'valeur absente -> null')

// ─── unite : le libelle la porte, le placeholder ne l est pas ───
a(unitOf({ lab: 'Distance (km)' }) === 'km', 'unite tiree du libelle')
a(unitOf({ lab: 'Puissance moy. (W)' }) === 'W', 'watts')
a(unitOf({ lab: 'Dénivelé+ (m)' }) === 'm', 'metres')
a(unitOf({ lab: 'Cadence (pas/min)' }) === 'pas/min', 'unite composee')
a(unitOf({ lab: 'Temps (mm:ss)' }) === null, 'un format de saisie n est pas une unite')
a(unitOf({ lab: 'Ressenti (RPE 1-10)' }) === null, 'une echelle non plus')
a(unitOf({ lab: 'Allure (auto)' }) === null, 'ni une mention de calcul')
a(unitOf({ lab: 'Distance' }) === null, 'aucune parenthese -> aucune unite')
const recVelo = fieldRecords({ planningSessions: [
  { id: 'v1', date: '2026-06-01', sport: 'velo', statut: 'realise', duree: '1 h', data: { distance: 25, temps: '40:00', puissance: 235 } },
  { id: 'v2', date: '2026-06-08', sport: 'velo', statut: 'realise', duree: '2 h', data: { distance: 60, temps: '2:00:00', puissance: 190 } },
] }, 'velo', { today: '2026-06-15' })
const rDist = recVelo.find((r) => r.key === 'distance')
a(rDist.unit === 'km', "l enregistrement porte l unite reelle, pas le placeholder ('45')")
a(fmtValue(rDist, rDist.best.value) === '60', '60 km')
const rTps = recVelo.find((r) => r.key === 'temps')
a(rTps.unit === null, 'un temps n a pas d unite a afficher : le format la porte')
a(fmtValue(rTps, rTps.best.value) === '40:00', 'et il est mis en forme')

console.log('\nALL PASS')
