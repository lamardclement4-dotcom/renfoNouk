// Données des phases du cycle menstruel, portées fidèlement du bundle de
// l'ancienne app (sources : IOC RED-S, ACSM, Ekenros 2024, Niering 2024…).
// Contenu éducatif — ne pas inventer, re-extraire du bundle si correction.

export const PHASES = {
  menstruation: {
    key: "menstruation", label: "R\xE8gles", tint: "#b5566a", icon: "moon",
    days: "J1 \u2013 J5 environ",
    energy: "\xC9nergie souvent basse",
    hormone: "\u0152strog\xE8nes et progest\xE9rone au plus bas \u2014 phase de renouvellement",
    advice: "Bouger aide \xE0 r\xE9duire les crampes (endo-morphines lib\xE9r\xE9es \xE0 l\u2019effort). Adapte l\u2019intensit\xE9 \xE0 ton ressenti : marche, v\xE9lo l\xE9ger, mobilit\xE9, nage douce, renfo l\xE9ger \u2014 aucune pression \xE0 performer. Si douleurs intenses, r\xE9cup\xE9ration active et chaleur en priorit\xE9.",
    intensite: "Faible \xE0 mod\xE9r\xE9e selon ressenti",
    a_eviter: "Sports de contact intenses, exercices en apn\xE9e prolong\xE9e, surcharge lourde si douleurs. \xC9vite le sucre raffin\xE9 et l\u2019alcool qui aggravent l\u2019inflammation.",
    nutrition: "Reconstitue le fer perdu (2\u201380 mg/j selon les flux) : viandes maigres, l\xE9gumineuses, \xE9pinards, tofu. Toujours associer une source de vitamine C pour doubler l\u2019absorption. Privil\xE9gie les oméga-3 (poisson gras, graines de lin) : une \xE9tude 2023 (American Journal of Clinical Nutrition) montre moins de douleurs menstruelles chez les femmes bien pourvues en magn\xE9sium et om\xE9ga-3.",
    micronutriments: [
      { nom: "Fer h\xE9minique", sources: "Viande rouge maigre, boudin noir, abats", pourquoi: "Compense les pertes sanguines (risque de carence chez 30\u201340\u202F% des sportives)" },
      { nom: "Vitamine C", sources: "Poivron rouge, kiwi, agrumes, persil", pourquoi: "Multiplie par 2 l\u2019absorption du fer non h\xE9minique" },
      { nom: "Om\xE9ga-3 (EPA/DHA)", sources: "Sardine, maquereau, saumon, graines de lin", pourquoi: "Anti-inflammatoire, r\xE9duit la dysm\xE9norh\xE9e (preuves cliniques)" },
      { nom: "Magn\xE9sium", sources: "Chocolat noir \u226570\u202F%, amandes, graines de courge, \xE9pinards", pourquoi: "200\u202Fmg/j r\xE9duit crampes et ballonnements (essai clinique)" },
      { nom: "Vitamine B6", sources: "Poulet, banane, noix, avocat, saumon", pourquoi: "Synergique avec le magn\xE9sium pour r\xE9duire les sympt\xF4mes" }
    ],
    aliments_cles: ["Sardines / maquereau / saumon", "Lentilles + jus de citron", "Épinards vapeur + poivron", "Chocolat noir 70\u202F%+", "Amandes / graines de courge", "Curcuma + gingembre (tisane ou cuisine)", "Camomille / mélisse (tisanes anti-crampes)"],
    seed_cycling: "Phase 1 : 1 c. \xE0 soupe/j de graines de lin + graines de courge (soutien \u0153strog\xE8nes).",
    recovery: "Phase inflammatoire : priorise le sommeil, l\u2019hydratation (pertes liquidiennes) et la chaleur locale (bouillotte) contre les crampes. R\xE9cup\xE9ration musculaire peut \xEAtre l\xE9g\xE8rement plus lente. La compression des jambes aide si jambes lourdes.",
    mobilite: "Mobilit\xE9 douce : respiration abdominale, col\xF4mne & dos (cat-vache, enfant), jambes contre le mur, \xE9tirements doux hanches. \xC9vite les postures abdominales intenses.",
    renfo: "Renfo l\xE9ger au poids du corps ou gainage doux si tu te sens bien. Pas de recherche de records. Si douleurs, passe \xE0 la r\xE9cup active.",
    session: "mob-recup20",
    symptoms: ["Crampes abdominales", "Fatigue", "Ballonnements", "Maux de t\xEAte", "Bas du dos sensible", "Humeur changeante", "Seins sensibles (d\xE9but)"],
    spm_tips: null
  },
  folliculaire: {
    key: "folliculaire", label: "Folliculaire", tint: "#c79a4a", icon: "leaf",
    days: "J6 \u2013 J13 environ",
    energy: "\xC9nergie qui monte progressivement",
    hormone: "\u0152strog\xE8nes en hausse continue \u2014 phase de croissance et d\u2019\xE9lan",
    advice: "Bonne tol\u00e9rance \u00e0 l\u2019intensit\u00e9 pour beaucoup de sportives \u2014 certaines \u00e9tudes associent la phase folliculaire tardive \u00e0 une force l\u00e9g\u00e8rement plus \u00e9lev\u00e9e, mais les revues les plus solides (umbrella review 2023, Frontiers) ne trouvent pas d\u2019effet constant sur la performance ou les gains en force. Base-toi surtout sur ton ressenti du jour. Sensibilit\u00e9 \u00e0 l\u2019insuline am\u00e9lior\u00e9e : les glucides sont bien utilis\u00e9s comme carburant.",
    intensite: "Mod\xE9r\xE9e \xE0 \xE9lev\xE9e, charge progressive",
    a_eviter: "Rien de particulier \xE0 \xE9viter \u2014 c\u2019est la meilleure fen\xEAtre pour les charges lourdes. Reste attentive \xE0 la technique sur les nouveaux gestes.",
    nutrition: "Glucides bien utilis\xE9s par l\u2019organisme : mise sur des glucides de qualit\xE9 (sarrasin, l\xE9gumineuses, riz complet) pour carburant. Prot\xE9ines maigres pour soutenir la prise de muscle. B6 et magn\xE9sium pour synth\xE8se s\xE9rotonine (humeur, motivation). Frontiers in Nutrition 2023 : alimentation riche en B6 + magn\xE9sium r\xE9duit les sympt\xF4mes du SPM chez 73\u202F% des femmes.",
    micronutriments: [
      { nom: "Zinc", sources: "Graines de tournesol, pois chiches, noix de cajou, viande", pourquoi: "Soutient la production d\u2019\u0153strog\xE8nes et la fonction thyro\xEFdienne" },
      { nom: "Vitamine B6", sources: "Poulet, banane, noix, avocat", pourquoi: "Pr\xE9curseur de la s\xE9rotonine, soutient l\u2019humeur et la motivation" },
      { nom: "Glucides complexes", sources: "Sarrasin, lentilles, riz complet, patate douce", pourquoi: "Sensibilit\xE9 insulinique au top : carburant optimal pour la performance" },
      { nom: "Vitamine D", sources: "Saumon, \u0153ufs, champignons, exposition solaire", pourquoi: "Soutien hormonal, pr\xE9vention des carences fr\xE9quentes chez les sportives" }
    ],
    aliments_cles: ["Poulet / dinde", "Lentilles / pois chiches", "Sarrasin / riz complet", "Banane + noix", "Saumon / oeufs", "Avocat", "Baies (myrtilles, framboises)"],
    seed_cycling: "Phase 1 (suite) : graines de lin + graines de courge jusqu\u2019\xE0 l\u2019ovulation.",
    recovery: "Certaines \u00e9tudes sugg\u00e8rent une tol\u00e9rance \u00e0 la charge l\u00e9g\u00e8rement meilleure en phase folliculaire tardive, mais les revues les plus robustes ne trouvent pas d\u2019effet consistant sur la r\u00e9cup\u00e9ration musculaire. Ajuste tes jours de repos \u00e0 tes sensations plut\xF4t qu\u2019au calendrier seul \u2014 c\u2019est un rep\xE8re possible, pas une r\xE8gle.",
    mobilite: "Mobilit\xE9 dynamique avant les s\xE9ances : hanches & ischios, r\xE9chauffement articulations. World's greatest stretch, hip 90-90.",
    renfo: "Si tu te sens bien, c\u2019est un bon moment pour tenter de nouveaux exercices techniques ou progresser en charge \u2014 sans que ce soit garanti par le cycle en lui-m\xEAme. Pliom\xE9trie g\xE9n\xE9ralement bien tol\xE9r\xE9e.",
    session: "renfo-bas",
    symptoms: ["Peu ou pas de sympt\xF4mes", "Bonne motivation", "Sommeil de qualit\xE9", "Peau souvent plus nette"],
    spm_tips: null
  },
  ovulation: {
    key: "ovulation", label: "Ovulation", tint: "#bf6a40", icon: "spark",
    days: "J14 \u2013 J17 environ",
    energy: "Pic d\u2019\xE9nergie",
    hormone: "Pic d\u2019\u0153strog\xE8nes, pic de testost\xE9rone \u2014 sommet hormonal du cycle",
    advice: "Beaucoup de sportives se sentent au sommet de leur forme \u00e0 ce moment du cycle. \u26A0\uFE0F Attention : la laxit\xE9 ligamentaire est l\xE9g\xE8rement accrue (effet \u0153strog\xE8nes) \u2192 soigne l\u2019\xE9chauffement et la technique sur les sauts, atterrissages et changements de direction. M\xE9ta-analyse 2024 (Sports Medicine) : les variations objectives de force sont faibles \u2014 c\u2019est surtout la perception qui est au sommet, pas n\xE9cessairement la performance mesur\xE9e.",
    intensite: "Maximale, comp\xE9tition, records",
    a_eviter: "\xC9chauffement bâcl\xE9 sur les sauts et sprints (risque ligamentaire accru). Ne pas n\xE9gliger les crit\xE8res techniques quand les charges augmentent.",
    nutrition: "Besoins normaux ou l\xE9g\xE8rement accrus. Prot\xE9ines pour soutenir la r\xE9cup\xE9ration post-effort intense. Antioxydants (baies, l\xE9gumes verts) contre l\u2019inflammation induite par l\u2019exercice. Hydratation bien contr\xF4l\xE9e (temp\xE9rature corporelle l\xE9g\xE8rement plus \xE9lev\xE9e).",
    micronutriments: [
      { nom: "Prot\xE9ines compl\xE8tes", sources: "\u0152ufs, poulet, poisson, legumineuses + c\xE9r\xE9ales", pourquoi: "Soutient la synth\xE8se musculaire apr\xE8s effort intense" },
      { nom: "Antioxydants", sources: "Baies, myrtilles, t\xE9 vert, grenade, l\xE9gumes verts", pourquoi: "Neutralise le stress oxydatif des s\xE9ances intenses" },
      { nom: "Om\xE9ga-3", sources: "Sardine, saumon, graines de chia", pourquoi: "Anti-inflammatoire post-effort, protection articulaire" },
      { nom: "Calcium + Vit D", sources: "Yaourt, fromage blanc, brocoli, saumon", pourquoi: "Protection osseuse et musculaire, pr\xE9vention des blessures" }
    ],
    aliments_cles: ["\u0152ufs entiers", "Poisson gras (sardine, maquereau)", "Myrtilles / framboises / grenade", "Brocoli / \xE9pinards", "Poulet / dinde", "Noix du Br\xE9sil (s\xE9l\xE9nium)", "Riz basmati / patate douce"],
    seed_cycling: "Phase 2 : bascule sur graines de s\xE9same + graines de tournesol (soutien progest\xE9rone).",
    recovery: "Bonne r\xE9cup\xE9ration musculaire. \xC9chauffement et retour au calme complets, surtout pour prot\xE9ger les articulations. Glacer les zones sensibles apr\xE8s les s\xE9ances intenses.",
    mobilite: "\xC9chauffement articulaire complet obligatoire : chevilles, genoux, hanches, \xE9paules. World's greatest stretch, CARs des hanches.",
    renfo: "Si tu te sens en forme, c\u2019est le moment pour des s\xE9ances lourdes et explosives, technique soign\xE9e \u2014 mais n\u2019oblige rien : la performance objective ne suit pas toujours la sensation \xE0 cette phase.",
    session: "renfo-full",
    symptoms: ["\xC9nergie \xE9lev\xE9e", "Force au top", "Contr\xF4le fin", "G\xEAne ovulatoire (douleur lateral) parfois", "Glaire cervicale modifi\xE9e"],
    spm_tips: null
  },
  luteale: {
    key: "luteale", label: "Lut\xE9ale", tint: "#6f8f86", icon: "heart",
    days: "J18 \u2013 J28 environ",
    energy: "\xC9nergie qui descend progressivement",
    hormone: "Progest\xE9rone dominante en d\xE9but, chute en fin de phase \u2014 phase de r\xE9cup\xE9ration interne",
    advice: "Commence fort (d\xE9but de phase) puis r\xE9duis le volume vers la fin (phase pr\xE9-r\xE8gles). Temp\xE9rature corporelle et FC l\xE9g\xE8rement plus hautes \u2192 l\u2019effort para\xEEt plus intense \xE0 intensit\xE9 \xE9gale : ajuste ta perception et ton allure. Privil\xE9gie l\u2019endurance mod\xE9r\xE9e, le gainage et la mobilit\xE9 en fin de phase. Le m\xE9tabolisme augmente de 5\u201310\u202F% : besoins \xE9nerg\xE9tiques r\xE9ellement plus \xE9lev\xE9s.",
    intensite: "Mod\xE9r\xE9e en d\xE9but, l\xE9g\xE8re en fin de phase",
    a_eviter: "Caf\xE9ine et alcool amplifient les sympt\xF4mes du SPM. Sucres rapides aggravent les fringales et les sautes d\u2019humeur. \xC9vite les d\xE9ficits caloriques importants \u2014 le corps en a besoin.",
    nutrition: "M\xE9tabolisme +5\u201310\u202F%, lipides utilis\xE9s pr\xE9f\xE9rentiellement. Prot\xE9ines suffisantes pour r\xE9duire les fringales. Glucides complexes (IG bas) pour \xE9viter les pics de glyc\xE9mie et sautes d\u2019humeur. Magn\xE9sium cl\xE9 : 200\u202Fmg/j r\xE9duit significativement les sympt\xF4mes du SPM (ballonnements, seins, humeur). B6 + magn\xE9sium = combo anti-SPM valid\xE9 scientifiquement.",
    micronutriments: [
      { nom: "Magn\xE9sium", sources: "Chocolat noir, amandes, \xE9pinards, graines de courge", pourquoi: "200\u202Fmg/j r\xE9duit crampes, ballonnements, irritabilit\xE9 (essai clinique)" },
      { nom: "Vitamine B6", sources: "Poulet, banane, noix, avocat", pourquoi: "S\xE9rotonine, gestion de l\u2019humeur ; synergique avec Mg" },
      { nom: "Calcium + Vit D", sources: "Laitage, brocoli, saumon, sardine", pourquoi: "Faible statut Vit D associ\xE9 \xE0 sympt\xF4mes SPM aggrav\xE9s (revue 2023)" },
      { nom: "Om\xE9ga-3", sources: "Poissons gras, graines de lin, chia, noix", pourquoi: "R\xE9duit inflammation et sensibilit\xE9 mammaire" },
      { nom: "Tryptophane", sources: "\u0152ufs, dinde, banane, graines de s\xE9same", pourquoi: "Pr\xE9curseur s\xE9rotonine, stabilise l\u2019humeur et le sommeil" }
    ],
    aliments_cles: ["Chocolat noir 70\u202F%+", "Amandes / noix / cajou", "Banane + noix de cajou", "Saumon / maquereau", "L\xE9gumineuses (lentilles, pois chiches)", "Patate douce", "Gingembre / curcuma (anti-inflammation)", "Camomille / valériane (sommeil)"],
    seed_cycling: "Phase 2 (suite) : graines de s\xE9same + graines de tournesol jusqu\u2019aux r\xE8gles.",
    recovery: "Sommeil souvent perturb\xE9 (progest\xE9rone puis chute), r\xE9tention d\u2019eau pouvant donner +1\u20132\u202Fkg (normal). Priorise le sommeil, l\u2019hydratation (paradoxal mais efficace contre la r\xE9tention), la gestion du stress. R\xE9cup\xE9ration musculaire plus longue en fin de phase.",
    mobilite: "Mobilit\xE9 compl\xE8te + relâchement au rouleau. Yoga restauratif, \xE9tirements longs, respiration. Mobilit\xE9 compl\xE8te, R\xE9cup au rouleau.",
    renfo: "Gainage et renfo l\xE9ger \xE0 mod\xE9r\xE9 en d\xE9but de phase. En fin de phase : r\xE9duis l\u2019intensit\xE9 et le volume si l\u2019effort para\xEEt excessivement dur ou si les sympt\xF4mes SPM sont marqu\xE9s.",
    session: "renfo-core2",
    symptoms: ["Ballonnements", "Fringales (sucr\xE9 ++ )", "Seins sensibles / gonfl\xE9s", "Irritabilit\xE9 / anxi\xE9t\xE9", "Fatigue", "Sommeil perturb\xE9", "Acn\xE9 possible", "Maux de t\xEAte", "R\xE9tention d\u2019eau"],
    spm_tips: "Si SPM marqu\xE9 : commence le magn\xE9sium (200\u202Fmg/j) + B6 10\u201350\u202Fmg/j d\xE8s la mi-phase. Limite caf\xE9ine, alcool, sel et sucre raffin\xE9. \xC9vite les r\xE9gimes caloriques stricts. R\xE9duis les charges et privil\xE9gie les activit\xE9s plaisir (marche, yoga, natation). Si sympt\xF4mes invalidants, consulte : TDPM ou endom\xE9triose \xE0 \xE9carter."
  }
};

export const PHASE_ORDER = ['menstruation', 'folliculaire', 'ovulation', 'luteale']

export const INTENSITE = {
  menstruation:  { rpe: '5–7 / 10', fc: '55–70 % FC max', charge: '50–70 % 1RM', volume: 'Réduit (–20 à –40 %)', cardio: 'Zone 1–2 (cardio léger)' },
  folliculaire:  { rpe: '6–9 / 10', fc: '65–85 % FC max', charge: '75–90 % 1RM', volume: 'Normal à augmenté', cardio: 'Zone 2–4 selon objectif' },
  ovulation:     { rpe: '7–10 / 10', fc: '75–90 % FC max', charge: '85–100 % 1RM', volume: 'Maximum', cardio: 'Zone 3–5 (seuils, fractionné)' },
  luteale:       { rpe: '6–8 / 10 début, 5–6 fin', fc: '65–80 % (FC perçue +5 bpm)', charge: '65–80 % 1RM fin de phase', volume: 'Modéré, dégressif', cardio: 'Zone 2–3, évite la chaleur' },
}
