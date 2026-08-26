// Routines toutes faites, et progression de niveau.
import { TEMPLATE_FAMILIES, familyById, familiesFor, templateId, parseTemplateId,
  templateRoutine, familyProgress, suggestions, allTemplateRoutines, SESSIONS_TO_UNLOCK }
  from '../../src/features/train/routineTemplates.js'
import { EX, getSession } from '../../src/features/train/trainData.js'
import { routineMins } from '../../src/features/train/routines.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── les modeles tiennent debout ───
a(TEMPLATE_FAMILIES.length >= 3, `${TEMPLATE_FAMILIES.length} familles`)
let niveaux = 0
for (const f of TEMPLATE_FAMILIES) {
  a(f.levels.length >= 4, `${f.label} : ${f.levels.length} niveaux`)
  niveaux += f.levels.length
  const wantCat = f.kind === 'pliometrie' ? 'plyo' : 'mobilite'
  f.levels.forEach((l, i) => {
    // Une cle inexistante serait silencieusement ignoree : la routine
    // perdrait un mouvement sans que rien ne le dise.
    a(l.keys.every((k) => EX[k]), `${f.id} niveau ${i + 1} : tous les mouvements existent`)
    a(l.keys.every((k) => EX[k].cat === wantCat), `${f.id} niveau ${i + 1} : tous de la bonne famille`)
    a(l.keys.every((k) => !EX[k].isRest), `${f.id} niveau ${i + 1} : aucune recuperation`)
    a(new Set(l.keys).size === l.keys.length, `${f.id} niveau ${i + 1} : aucun doublon`)
    a(l.why && l.why.length > 40, `${f.id} niveau ${i + 1} : le pourquoi du niveau est dit`)
  })
  // La difficulte doit monter : plus de tours ou plus de repos entre les
  // series, jamais moins d un niveau au suivant.
  for (let i = 1; i < f.levels.length; i++) {
    const prev = f.levels[i - 1]
    const cur = f.levels[i]
    a(cur.sets >= prev.sets && cur.restSecs >= prev.restSecs,
      `${f.id} : le niveau ${i + 1} ne recule pas sur les tours ni la recuperation`)
  }
}
a(niveaux >= 12, `${niveaux} niveaux au total`)
// L ordre pliometrique n est pas arbitraire : les contrebas en dernier.
const plyo = familiesFor('pliometrie')[0]
a(plyo.levels[0].keys.includes('ankleHops'), 'on commence par les appuis courts')
a(plyo.levels[plyo.levels.length - 1].keys.includes('depthJump'), 'et les contrebas viennent en dernier')
a(!plyo.levels[0].keys.includes('depthJump'), 'jamais de contrebas au premier niveau : ce sont les forces les plus elevees')

// ─── identifiants ───
const id = templateId('plyo-appuis', 2)
a(parseTemplateId(id).level === 2 && parseTemplateId(id).family.id === 'plyo-appuis', 'l identifiant porte sa famille et son niveau')
a(parseTemplateId('nawak') === null && parseTemplateId('tpl_plyo-appuis_99') === null, 'identifiant invalide -> null')

// ─── une routine modele est une routine ───
const r = templateRoutine('mob-hanches', 0)
a(r.kind === 'mobilite' && r.keys.length > 0 && r.sets >= 1, 'forme de routine')
a(r.template === true && r.custom === false, 'marquee comme modele')
a(routineMins(r) > 0, `duree estimee : ${routineMins(r)} min`)
a(templateRoutine('nawak', 0) === null && templateRoutine('mob-hanches', 99) === null, 'famille ou niveau inconnu -> null')
// Et elle doit etre jouable, sinon elle ne sert a rien.
const all = allTemplateRoutines()
a(all.length === niveaux, `${all.length} routines modeles jouables`)
a(getSession(r.id, null, all) !== null, 'le lecteur retrouve un modele comme une routine composee')

// ─── progression : elle se merite ───
const vide = familyProgress({}, 'plyo-appuis')
a(vide.current === 0 && vide.remaining === SESSIONS_TO_UNLOCK, `au depart : niveau 1, ${SESSIONS_TO_UNLOCK} seances a faire`)
a(vide.next === 1 && !vide.complete, 'un niveau suivant existe')

const log = {}
const jour = (n) => { const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
for (let i = 0; i < SESSIONS_TO_UNLOCK - 1; i++) log[jour(i)] = [templateId('plyo-appuis', 0)]
const presque = familyProgress({ routineLog: log }, 'plyo-appuis')
a(presque.current === 0 && presque.remaining === 1, 'une seance avant de passer : on reste au niveau 1')
a(/Encore 1 s[ée]ance/.test(presque.text), 'et il reste dit combien')

log[jour(9)] = [templateId('plyo-appuis', 0)]
const monte = familyProgress({ routineLog: log }, 'plyo-appuis')
a(monte.current === 1, `${SESSIONS_TO_UNLOCK} seances faites -> niveau 2 propose`)
a(monte.levels[0].done === SESSIONS_TO_UNLOCK, 'le niveau precedent garde son compte')

// tout fait : on ne propose pas un niveau qui n existe pas
const tout = { routineLog: {} }
let d = 0
for (let lvl = 0; lvl < plyo.levels.length; lvl++) {
  for (let i = 0; i < SESSIONS_TO_UNLOCK; i++) { tout.routineLog[jour(d++)] = [templateId('plyo-appuis', lvl)] }
}
const fini = familyProgress(tout, 'plyo-appuis')
a(fini.complete && fini.current === plyo.levels.length - 1, 'tous les niveaux faits -> on reste au dernier')
a(/s.entretiennent, elles ne s.acqui[èe]rent pas une fois pour toutes/.test(fini.text), 'et il est dit pourquoi le reprendre')

// ─── suggestions ───
const sg = suggestions({ routineLog: log }, { kind: 'pliometrie' })
a(sg.length === familiesFor('pliometrie').length, 'une suggestion par famille du type')
a(sg[0].levelNumber === 2 && sg[0].levelCount === plyo.levels.length, `niveau ${sg[0].levelNumber}/${sg[0].levelCount}`)
a(sg[0].justUnlocked, 'le passage de niveau est signale')
a(/Niveau d[ée]bloqu[ée]/.test(sg[0].note), 'et annonce comme tel : ' + sg[0].note)
a(suggestions({}).length === TEMPLATE_FAMILIES.length, 'sans type : toutes les familles')
a(suggestions({})[0].levelNumber === 1, 'base vide -> premier niveau')
console.log('\nALL PASS')
