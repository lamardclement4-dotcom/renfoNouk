import { recommendations, rankRecommendations } from '../../src/features/train/renfoIntel.js'
const a=(c,m)=>{if(!c)throw new Error('FAIL: '+m);console.log('OK:',m)}
const p=n=>n<10?'0'+n:''+n
const iso=(o)=>{const d=new Date();d.setDate(d.getDate()-o);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
const txt=(r)=>(r||[]).map(x=>x.text||'').join(' || ')
const S=(o,sport,data)=>({id:'s'+sport+o,date:iso(o),sport,statut:'realise',duree:'1 h 30',data})

a(Array.isArray(recommendations({})),'db vide -> pas de crash')

// record battu a la derniere seance
const foot={planningSessions:[
  S(30,'football',{duree:90,buts:1,poste:'Milieu',surface:'Herbe'}),
  S(20,'football',{duree:90,buts:2,poste:'Milieu',surface:'Herbe'}),
  S(10,'football',{duree:90,buts:0,poste:'Milieu',surface:'Herbe'}),
  S(1,'football',{duree:90,buts:4,poste:'Milieu',surface:'Herbe'})]}
const ft=txt(recommendations(foot))
a(/Football : buts marqu[ée]s [àa] 4/.test(ft),'record generique remonte : '+(ft.match(/Football[^—]*/)||[''])[0].slice(0,80))
a(/meilleur r[ée]sultat/.test(ft),'et presente comme un record')

// golf : le score le plus bas gagne
const golf={planningSessions:[S(20,'golf',{trous:18,score:95,putts:36}),S(2,'golf',{trous:18,score:86,putts:30})]}
const gt=txt(recommendations(golf))
a(/Golf : score total [àa] 86/.test(gt),'au golf, le meilleur score est le plus bas : '+(gt.match(/Golf[^—]*/)||[''])[0].slice(0,60))

// un seul conseil par sport, meme avec beaucoup de donnees
const multi={planningSessions:[
  ...[30,20,10,1].map(o=>S(o,'football',{duree:90,buts:o===1?4:1,poste:'Milieu',surface:'Herbe'})),
  ...[25,15,5].map(o=>S(o,'ski',{descentes:8,denivele:2000,chute:true,niveau:'Rouge'})),
  ...[22,12,3].map(o=>S(o,'golf',{trous:18,score:90,putts:33}))]}
const recos=recommendations(multi)
const gener=recos.filter(r=>/^(Football|Ski \/ snowboard|Golf)/.test(r.text||''))
a(gener.length<=3,`au plus un conseil par sport (${gener.length} pour 3 sports)`)

// la hierarchisation limite encore
const ranked=rankRecommendations(recos)
a(ranked.top.length<=8,`selection finale de ${ranked.top.length} conseils`)

// sport sans donnee -> aucun conseil generique
a(!/Football/.test(txt(recommendations({planningSessions:[S(1,'football',{},'planifie')]}))),'seance sans donnee -> rien')

// ─── hierarchisation : gravite d abord, variete ensuite ───
const RANK = { alert: 0, warn: 1, info: 2 }
// Les textes doivent differer par leurs mots : l empreinte anti-doublon
// normalise les chiffres, donc « x 1 » et « x 2 » se confondraient.
const MOTS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
const mk = (level, domain, n) => Array.from({ length: n }, (_, i) => ({ level, domain, action: 'planner', text: level + ' ' + domain + ' ' + MOTS[i] }))

// Le defaut : un simple constat passait devant des avertissements jamais
// affiches, parce que le tour par domaine servait un conseil par domaine
// avant de revenir au second, tous niveaux confondus.
const many = [...mk('info', 'a', 1), ...mk('warn', 'b', 3), ...mk('warn', 'c', 3), ...mk('warn', 'd', 3), ...mk('warn', 'e', 3),
  ...mk('warn', 'f', 3), ...mk('warn', 'g', 3), ...mk('warn', 'h', 3), ...mk('warn', 'i', 3)]
const rk = rankRecommendations(many)
a(rk.top.length === 8, '8 conseils en tete')
a(!rk.top.some((r) => r.level === 'info'), 'aucun constat affiche tant qu il reste des avertissements')
for (let i = 1; i < rk.top.length; i++)
  a(RANK[rk.top[i].level] >= RANK[rk.top[i - 1].level], 'la gravite ne remonte jamais (position ' + (i + 1) + ')')

// La variete tient a l interieur d un meme niveau.
const spread = rankRecommendations([...mk('warn', 'x', 5), ...mk('warn', 'y', 5), ...mk('warn', 'z', 5), ...mk('warn', 'w', 5)])
const doms = spread.top.map((r) => r.domain)
a(new Set(doms.slice(0, 4)).size === 4, 'les quatre premiers viennent de quatre domaines differents')
a(doms.filter((d) => d === 'x').length === 2, 'et aucun domaine ne depasse deux conseils')

// Une alerte passe devant un avertissement meme si son domaine a deja servi.
const mixed = rankRecommendations([...mk('warn', 'k', 1), ...mk('alert', 'k', 1), ...mk('warn', 'm', 1)])
a(mixed.top[0].level === 'alert', "l alerte vient en tete, meme si son domaine avait deja un avertissement")

// Le domaine sert au classement, l action reste la destination.
const both = rankRecommendations([...mk('warn', 'escalade', 3), ...mk('warn', 'sprint', 3)])
a(both.top.every((r) => r.action === 'planner'), 'la destination reste le planning')
a(new Set(both.top.map((r) => r.domain)).size === 2, 'mais escalade et sprint comptent comme deux domaines')
a(both.top.length === 4, 'chacun obtient ses deux places, la ou un domaine unique en aurait eu deux au total')

// Rien n est perdu : ce qui ne tient pas en tete reste accessible.
a(rk.top.length + rk.rest.length === many.length, 'tete + reste = tout ce qui a ete produit')
a(rk.rest.every((r) => !rk.top.includes(r)), 'et aucun conseil ne figure des deux cotes')


// ─── invariants sur tout conseil produit ───
// Un conseil sans `action` ne s ouvre sur rien : la carte reste inerte au
// clic. Un conseil sans `domain` retombe dans un fourre-tout et fausse le
// plafond par domaine.
const ZONE_IDS = ['post','hanches','flechisseurs','thoracique','epaules','nuque','chevilles','core','equilibre']
const MZ = (v) => ZONE_IDS.map((id, i) => ({ id, zone: id, label: id, val: id === 'hanches' ? v : (i % 3) + 1 }))
const sleepLog = {}; for (let i = 0; i < 20; i++) sleepLog[iso(i)] = { hours: i % 3 ? 5.5 : 8, bed: '01:30' }
const bases = [
  {},
  { sleepLog, mobility: { score: 48, date: iso(5), zones: MZ(1) } },
  { customGoals: [{ s: 'Semi-marathon', due: iso(3), done: false }], sensitiveZones: ['genou'],
    goals: { weeklySessions: 4, dailyMin: 20 }, suppPlan: ['creatine'], suppTaken: {} },
]
let vus = 0
for (const b of bases) {
  for (const r of recommendations(b)) {
    vus++
    a(typeof r.text === 'string' && r.text.trim() !== '', 'chaque conseil porte un texte')
    a(!!r.action, 'chaque conseil ouvre un écran : ' + r.text.slice(0, 46))
    a(!!r.domain, 'chaque conseil declare un domaine : ' + r.text.slice(0, 46))
    a(['alert', 'warn', 'info'].includes(r.level), 'niveau connu : ' + r.level)
  }
}
a(vus > 10, vus + ' conseils passes en revue sur trois bases differentes')

console.log('\nALL PASS')
