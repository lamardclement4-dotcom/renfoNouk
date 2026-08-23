// Objectifs de macros. L ecran laissait saisir quatre nombres sans jamais les
// confronter : 2000 kcal avec 200 g de proteines, 300 de glucides et 100 de
// lipides font 2900 kcal, et rien ne le disait.
import { kcalFromMacros, coherence, fromPerKg, fromPercent, views, outOfRange,
  bmr, tdee, suggest, forDay, buildPlan, dayTypeFor, targetForDate,
  KCAL, GAP_OK, GAP_WARN, ACTIVITY, GOALS, DAY_TYPES, PER_KG, BIG_DAY_MINS }
  from '../../src/features/nutrition/macroTargets.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── coherence : LE defaut ───
a(kcalFromMacros({ prot: 200, gluc: 300, lip: 100 }) === 2900, '200 P + 300 G + 100 L = 2900 kcal')
const faux = coherence({ kcal: 2000, prot: 200, gluc: 300, lip: 100 })
a(faux.level === 'alert', "2000 kcal annonces pour 2900 reels : signale")
a(faux.diff === 900 && faux.pct === 45, `${faux.diff} kcal d ecart, soit ${faux.pct} %`)
a(/2900 kcal alors que l'objectif en annonce 2000/.test(faux.text), 'et les deux chiffres sont nommes')
const juste = coherence({ kcal: 2000, prot: 150, gluc: 200, lip: 67 })
a(juste.level === 'ok', `150 P + 200 G + 67 L = ${juste.derived} kcal : coherent`)
a(coherence({ kcal: 0 }) === null && coherence(null) === null, 'sans calories visees, rien a confronter')
a(coherence({ kcal: 2000, prot: 150, gluc: 205, lip: 67 }).level === 'warn', `entre ${GAP_OK} et ${GAP_WARN} % : simple avertissement`)

// ─── saisie en grammes par kilo ───
// « 1,6 g/kg de proteines » veut dire quelque chose ; « 112 g » ne veut rien
// dire sans le poids qui va avec.
const pk = fromPerKg({ kcal: 2500, weightKg: 70, protPerKg: 1.8, lipPerKg: 1 })
a(pk.prot === 126 && pk.lip === 70, '70 kg a 1,8 et 1 g/kg -> 126 g et 70 g')
a(pk.gluc === Math.round((2500 - 126 * 4 - 70 * 9) / 4), `les glucides prennent le reste : ${pk.gluc} g`)
a(Math.abs(kcalFromMacros(pk) - 2500) <= 4, 'et le total retombe sur les calories visees')
a(fromPerKg({ kcal: 2500, weightKg: 0, protPerKg: 2 }) === null, 'sans poids, aucun calcul')
a(fromPerKg({ kcal: 0, weightKg: 70, protPerKg: 2 }) === null, 'sans calories non plus')
// un objectif proteine si haut qu il ne reste rien : les glucides tombent a
// zero plutot que de devenir negatifs
const extreme = fromPerKg({ kcal: 1200, weightKg: 100, protPerKg: 3, lipPerKg: 1.5 })
a(extreme.gluc === 0, 'apport impossible -> glucides a zero, jamais negatifs')

// ─── saisie en pourcentages ───
const pc = fromPercent({ kcal: 2000, protPct: 30, glucPct: 40, lipPct: 30 })
a(pc.prot === 150 && pc.gluc === 200 && pc.lip === 67, '30/40/30 sur 2000 kcal')
a(coherence(pc).level === 'ok', 'et le resultat est coherent par construction')
a(fromPercent({ kcal: null }) === null, 'sans calories, rien')

// ─── lecture croisee ───
const v = views({ kcal: 2000, prot: 150, gluc: 200, lip: 67 }, 75)
a(v.prot.perKg === 2, '150 g pour 75 kg = 2 g/kg')
a(Math.abs(v.prot.pct - 30) < 1, `soit ${v.prot.pct} % des calories`)
a(views({ prot: 150 }, 0).prot.perKg === null, 'sans poids, pas de gramme par kilo')

// ─── reperes ───
a(outOfRange({ prot: 150, gluc: 300, lip: 70 }, 75).length === 0, 'un objectif ordinaire ne declenche rien')
const bas = outOfRange({ prot: 60, gluc: 300, lip: 70 }, 75)
a(bas.length === 1 && bas[0].key === 'prot' && bas[0].side === 'low', `0,8 g/kg de proteines : sous le repere de ${PER_KG.prot.min}`)
const haut = outOfRange({ prot: 300, gluc: 100, lip: 70 }, 75)
a(haut.some((x) => x.key === 'prot' && x.side === 'high'), '4 g/kg : au-dessus du repere')
a(outOfRange({ prot: 150 }, 0).length === 0, 'sans poids, aucun repere applicable')

// ─── depense estimee ───
a(bmr({ weightKg: 75, heightCm: 180, age: 30, sexe: 'h' }) === 1730, 'Mifflin-St Jeor, homme')
a(bmr({ weightKg: 60, heightCm: 165, age: 30, sexe: 'f' }) === 1320, 'et femme')
a(bmr({ weightKg: 75, heightCm: 180 }) === null, 'age manquant -> pas d estimation inventee')
a(tdee({ weightKg: 75, heightCm: 180, age: 30, sexe: 'h' }, 'modere') === Math.round(1730 * 1.55), 'facteur d activite applique')
a(tdee({ weightKg: 75, heightCm: 180, age: 30, sexe: 'h' }, 'inconnu') === Math.round(1730 * 1.55), 'activite inconnue -> modere par defaut')
a(ACTIVITY.length === 5 && GOALS.length === 4, `${ACTIVITY.length} niveaux d activite, ${GOALS.length} objectifs`)

const sug = suggest({ weightKg: 75, heightCm: 180, age: 30, sexe: 'h' }, { activity: 'modere', goal: 'muscle' })
a(sug.prot === Math.round(75 * 1.8), 'prise de muscle : 1,8 g/kg de proteines')
a(sug.kcal > sug.base, 'et un surplus calorique')
a(coherence(sug).level === 'ok', 'la suggestion est coherente avec elle-meme')
a(suggest({ weightKg: 75 }) === null, 'profil incomplet -> aucune suggestion')

// ─── jour d entrainement, jour de repos ───
// Un meme chiffre pour tous les jours est le principal defaut de precision :
// le besoin en glucides d une sortie longue n a rien a voir avec un jour sans
// seance. Proteines et lipides ne bougent pas.
const base = { kcal: 2500, prot: 140, gluc: 300, lip: 80 }
const repos = forDay(base, 'repos')
const gros = forDay(base, 'gros')
a(repos.gluc < base.gluc && gros.gluc > base.gluc, `${repos.gluc} g de glucides au repos, ${gros.gluc} g sur grosse seance`)
a(repos.prot === base.prot && repos.lip === base.lip, 'proteines et lipides inchanges : c est la charge qui bouge les glucides')
a(repos.kcal < base.kcal && gros.kcal > base.kcal, 'les calories suivent')
a(coherence(repos).level === 'ok' && coherence(gros).level === 'ok', 'chaque variante reste coherente')
a(forDay(base, 'nawak').gluc === base.gluc, 'type de jour inconnu -> jour ordinaire')
a(forDay(null, 'repos') === null, 'sans objectif, rien')

const plan = buildPlan(base, 75)
a(Object.keys(plan.days).length === DAY_TYPES.length, `${DAY_TYPES.length} variantes enregistrees d un coup`)
a(plan.coherence.level === 'ok' && plan.views.prot.perKg > 0, 'le plan porte sa coherence et ses lectures croisees')
a(Array.isArray(plan.warnings), 'et ses avertissements')
a(KCAL.prot === 4 && KCAL.gluc === 4 && KCAL.lip === 9 && KCAL.alc === 7, 'valeurs energetiques des macronutriments')

// ─── l objectif suit la journee ───
// Enregistrer trois variantes ne sert a rien si l ecran en montre toujours une
// seule.
const S = (date, duree, rpe, statut) => ({ id: date + duree, date, sport: 'course', statut: statut || 'realise', duree, data: { rpe } })
const jour = (sessions) => ({ planningSessions: sessions, foodTargets: { ...base, days: buildPlan(base, 75).days } })

a(dayTypeFor({ planningSessions: [] }, '2026-08-20') === 'repos', 'aucune seance -> jour de repos')
a(dayTypeFor({ planningSessions: [S('2026-08-20', '45 min', 5)] }, '2026-08-20') === 'normal', '45 min -> jour ordinaire')
a(dayTypeFor({ planningSessions: [S('2026-08-20', '2 h', 5)] }, '2026-08-20') === 'gros', `2 h -> grosse seance (seuil ${BIG_DAY_MINS} min)`)
a(dayTypeFor({ planningSessions: [S('2026-08-20', '30 min', 5), S('2026-08-20', '1 h 10', 5)] }, '2026-08-20') === 'gros', 'deux seances qui s additionnent')
a(dayTypeFor({ planningSessions: [S('2026-08-20', '1 h', 9)] }, '2026-08-20') === 'gros', 'une heure a RPE 9 pese autant qu une sortie longue')
a(dayTypeFor({ planningSessions: [S('2026-08-21', '2 h', 5)] }, '2026-08-20') === 'repos', 'la seance de la veille ne compte pas')
a(dayTypeFor({}, '2026-08-20') === 'repos', 'base vide -> repos, sans lever')

const tRepos = targetForDate(jour([]), '2026-08-20')
const tGros = targetForDate(jour([S('2026-08-20', '2 h', 6)]), '2026-08-20')
a(tRepos.dayType === 'repos' && tGros.dayType === 'gros', 'le type de jour est rendu')
a(tGros.gluc > tRepos.gluc, `${tRepos.gluc} g de glucides au repos, ${tGros.gluc} g sur grosse seance`)
a(tRepos.prot === tGros.prot, 'les proteines ne bougent pas')
a(tRepos.modulated && tGros.modulated, 'les deux viennent des variantes enregistrees')

// sans variantes, l objectif general sert tel quel : on ne fabrique pas une
// modulation que l utilisateur n a pas demandee
const brut = targetForDate({ foodTargets: base, planningSessions: [S('2026-08-20', '2 h', 6)] }, '2026-08-20')
a(brut.gluc === base.gluc && brut.modulated === false, 'aucune variante enregistree -> objectif inchange')
a(targetForDate({}, '2026-08-20') === null, 'aucun objectif -> null')

console.log('\nALL PASS')
