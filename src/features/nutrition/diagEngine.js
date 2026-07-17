// Moteur de recommandations du diagnostic nutrition, porté tel quel depuis
// l'ancienne app (bundle renfo v6). Chaque règle cite sa source scientifique.
// Ne pas modifier les seuils/textes sans re-vérifier le bundle d'origine.
export function buildConseils(ans, ctx) {
  const { bmr, cibLo, cibMid, protLo, protHi, poids, avg, validProfile } = ctx
    var c=[];
    var a=ans;

    // Croisements
    var reds=(a.energie==="epuise"||a.energie==="fatigue")&&(a.faim==="restreins"||a.faim==="faim_intense");
    var cortisol_loop=a.sommeil==="mauvais"&&a.faim==="faim_intense";
    var stress_eating=a.stress==="eleve"&&(a.emotionnel==="souvent"||a.emotionnel==="regulier");
    var perf_risk=a.peri==="rien"&&(a.energie==="fatigue"||a.energie==="epuise");
    var relation_alim=(a.flexibilite==="tout_rien"||a.flexibilite==="rigide")&&(a.emotionnel==="souvent"||a.emotionnel==="regulier");
    var chrono_crash=a.crash==="souvent"||a.crash==="toujours";
    var isolation_sociale=a.social==="evite"||a.social==="stresse";
    var budget_contraint=a.budget==="contraint"||a.budget==="difficile";
    var recup_deficit=a.recup_active==="rien"&&a.sommeil!=="bien";

    if(reds){c.push({col:"#b5566a",ic:"alert",priority:0,niveauPreuve:"★★★",
      title:"Déficit énergétique relatif (RED-S)",
      text:"Fatigue persistante + restriction alimentaire = signal RED-S. Conséquences documentées : baisse de performance, altérations hormonales (cycles, testostérone), immunité réduite, risque de fracture de stress.",
      conseil:"Augmente progressivement de 200-300 kcal/j. Ne descends pas sous ton BMR"+(bmr?" ("+bmr+" kcal)":"")+".",
      menu:null,
      source:"Mountjoy et al., Br J Sports Med 2018 — consensus RED-S (IOC)"
    });}

    if(cortisol_loop){c.push({col:"#b5566a",ic:"alert",priority:0,niveauPreuve:"★★★",
      title:"Boucle cortisol : manque de sommeil → fringales",
      text:"La privation de sommeil élève la ghréline (faim +24%) et réduit la leptine (satiété -18%). Ce mécanisme ajoute 300-500 kcal/j en moyenne. Aucune stratégie nutritionnelle ne compense un sommeil insuffisant.",
      conseil:"Priorité absolue : ajoute 1h de sommeil par nuit pendant 2 semaines avant toute autre modification.",
      menu:"Ce soir : chambre à 18°C, dernier café avant 14h, collation tryptophane légère : 1 banane + yaourt nature.",
      source:"Spiegel et al., Ann Intern Med 2004 ; Taheri et al., PLoS Med 2004"
    });}

    if(stress_eating){c.push({col:"#b5566a",ic:"heart",priority:0,niveauPreuve:"★★",
      title:"Stress chronique + alimentation émotionnelle",
      text:"Le cortisol chronique élevé stimule l'appétit pour les aliments à haute densité énergétique et renforce les comportements alimentaires compensatoires. Ce n'est pas un manque de volonté — c'est une réponse neurobiologique.",
      conseil:"Techniques validées : cohérence cardiaque (5 min 3x/j), pleine conscience avant les repas, identification des déclencheurs émotionnels.",
      menu:null,
      source:"Dallman et al., PNAS 2003 ; Epel et al., Psychoneuroendocrinology 2001"
    });}

    if(perf_risk){c.push({col:"#b5566a",ic:"zap",priority:0,niveauPreuve:"★★★",
      title:"Fatigue + absence de récupération nutritionnelle",
      text:"S'entraîner fatigué sans apport post-effort amplifie la dégradation musculaire et ralentit la resynthèse du glycogène de 50%. Le risque de blessure augmente significativement.",
      conseil:"Même minimal, un apport post-effort change tout :",
      menu:"Option 5 min : yaourt grec 150g + 1 banane = 18g prot + 30g glucides (~280 kcal). Ou verre de lait écrémé 300ml + 1 fruit.",
      source:"Aragon & Schoenfeld, JISSN 2013 ; Ivy et al., J Appl Physiol 2002"
    });}

    if(relation_alim){c.push({col:"#b5566a",ic:"heart",priority:0,niveauPreuve:"★★",
      title:"Relation conflictuelle avec l'alimentation",
      text:"Alimentation émotionnelle fréquente + rigidité alimentaire = signal d'une relation difficile avec la nourriture. Ce schéma s'auto-renforce et est indépendant de la volonté.",
      conseil:"L'alimentation intuitive (Tribole & Resch) et un suivi psycho-nutritionnel sont les approches les mieux documentées. Les régimes restrictifs aggravent ce pattern.",
      menu:null,
      source:"Braden et al., Appetite 2018 ; Tribole & Resch, Intuitive Eating 4e éd. 2020"
    });}

    if(recup_deficit){c.push({col:"#b5566a",ic:"moon",priority:0,niveauPreuve:"★★",
      title:"Double déficit de récupération",
      text:"Ni récupération active ni sommeil suffisant = régénération musculaire très limitée. La surcompensation (adaptation à l'entraînement) se produit pendant la récupération, pas pendant l'effort.",
      conseil:"Commence par une seule pratique simple :",
      menu:"10 min de marche post-entraînement + étirements des principaux groupes musculaires travaillés. Simple, gratuit, efficace.",
      source:"Halson, Sports Med 2014 ; Dattilo et al. 2011"
    });}

    // Crash post-repas
    if(chrono_crash&&!reds){
      var ig_link=a.ig==="rapides"||a.ig==="mixte";
      c.push({col:ig_link?"#b5566a":"#e07b39",ic:"flame",priority:ig_link?0:1,niveauPreuve:"★★",
        title:"Coup de barre post-repas"+(ig_link?" lié à l'IG":""),
        text:"La somnolence post-prandiale est souvent amplifiée par des glucides à IG élevé qui provoquent un pic d'insuline suivi d'une hypoglycémie réactive. Cela peut aussi signaler un repas trop copieux ou un manque de protéines.",
        conseil:"Stratégies validées pour stabiliser la glycémie :",
        menu:"1. Remplace pain blanc par pain complet ou seigle. 2. Commence chaque repas par les légumes + protéines, finit par les glucides. 3. 10 min de marche après le repas réduit le pic glycémique de 30%.",
        source:"Ebbeling et al., JAMA 2012 ; Mabasa et al., Nutrients 2020 ; OMS, Index glycémique 2003"
      });
    }

    // Budget contraint
    if(budget_contraint){c.push({col:"#e07b39",ic:"target",priority:1,niveauPreuve:"★★",
      title:"Budget alimentaire contraint — stratégies pratiques",
      text:"Manger sainement avec un petit budget est possible avec les bonnes stratégies. Les idées reçues sur le coût des aliments sains sont souvent fausses : les légumineuses, oeufs et surgelés sont parmi les aliments les plus denses nutritionnellement par euro.",
      conseil:"Top 5 meilleurs rapports nutrition/prix :",
      menu:"1. Oeufs (6 oeufs ~1€ = 36g prot). 2. Lentilles sèches (500g ~1€ = ~100g prot). 3. Flocons d'avoine (500g ~1€). 4. Légumes surgelés. 5. Sardines en boîte (~0.80€/boîte = 20g prot, oméga-3).",
      source:"Drewnowski & Darmon, Am J Clin Nutr 2005"
    });}

    // Isolation sociale alimentaire
    if(isolation_sociale){c.push({col:"#e07b39",ic:"user",priority:1,niveauPreuve:"★★",
      title:"Alimentation et contexte social — retrouver la flexibilité",
      text:"Planifier excessivement les repas sociaux ou les éviter génère un stress alimentaire qui s'auto-renforce. La rigidité alimentaire en contexte social est un facteur de risque de troubles du comportement alimentaire.",
      conseil:"Technique des \"règles souples\" : identifie 2-3 principes simples (ex. légumes à chaque repas, eau comme boisson principale) et laisse le reste flexible.",
      menu:null,
      source:"Westenhoefer et al., Int J Eat Disord 2013"
    });}

    // Glucides & IG
    if(a.ig==="evite"){c.push({col:"#e07b39",ic:"flame",priority:1,niveauPreuve:"★★★",
      title:"Évitement des glucides — performance à risque",
      text:"Les glucides sont le carburant principal de l'exercice intense. Les éviter réduit la performance, épuise le glycogène musculaire et peut augmenter la dégradation des protéines musculaires pendant l'effort.",
      conseil:"Si l'objectif est la perte de gras, un déficit calorique modéré avec glucides maintenus est plus efficace à long terme qu'une restriction glucidique sévère.",
      menu:"Autour de l'effort : 30-60g de glucides/h d'effort (banane, dattes, riz blanc) sont plus efficaces que la plupart des suppléments.",
      source:"Burke et al., J Sports Sci 2011 ; Thomas et al., JAND 2016"
    });}
    if(a.ig==="rapides"){c.push({col:"#e07b39",ic:"flame",priority:1,niveauPreuve:"★★★",
      title:"Glucides à IG élevé dominants",
      text:"Une alimentation dominée par les glucides rapides (pain blanc, riz blanc, sucreries) entraîne des oscillations glycémiques qui alimentent la faim, la fatigue et les fringales.",
      conseil:"Substitutions simples à IG plus bas :",
      menu:"Pain blanc → pain complet ou seigle. Riz blanc → riz basmati ou quinoa. Jus de fruits → fruits entiers. Ces seuls swaps réduisent l'IG global du repas de 15-25%.",
      source:"Ebbeling et al. 2012 ; OMS, Glycemic Index 2003"
    });}
    if(a.ig==="complexes"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Excellente qualité glucidique",
      text:"Les glucides complexes assurent un apport d'énergie progressif, une meilleure satiété et une flore intestinale plus diverse.",
      menu:null, source:"Burke et al. 2011 ; Thomas et al. 2016"
    });}

    // Petit-déjeuner
    if(a.petit_dej==="saute"){c.push({col:"#e07b39",ic:"spark",priority:1,niveauPreuve:"★★",
      title:"Petit-déjeuner souvent sauté",
      text:"Sauter régulièrement le petit-déjeuner allonge le jeûne nocturne, augmente le cortisol matinal et est associé à des apports moins bien répartis sans bénéfice prouvé sur la composition corporelle.",
      conseil:"Option ultra-rapide :",
      menu:"La veille, prépare un overnight oats : 50g flocons d'avoine + 150ml lait + 1 yaourt grec + fruits = prêt en 2 min le matin, 20g prot.",
      source:"Rong et al., JAND 2012 ; Leidy et al., Am J Clin Nutr 2015"
    });}
    if(a.petit_dej==="leger"){c.push({col:"#e07b39",ic:"spark",priority:1,niveauPreuve:"★★",
      title:"Petit-déjeuner léger — enrichir en protéines",
      text:"Un petit-déjeuner à 25-30g de protéines réduit la faim en fin de matinée et les apports totaux de la journée.",
      conseil:"Simple à améliorer :",
      menu:"Ajoute à ton café : 2 oeufs brouillés (12g prot) ou 150g fromage blanc (12g prot) ou 30g de noix + 1 yaourt grec (15g prot).",
      source:"Leidy et al. 2015"
    });}
    if(a.petit_dej==="complet"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Petit-déjeuner équilibré", text:"Protéines + glucides complexes le matin stabilisent la glycémie et réduisent les fringales de matinée.",
      menu:null, source:"Leidy et al. 2015"
    });}

    // Variété
    if(a.variete==="tres_faible"||a.variete==="faible"){c.push({col:"#e07b39",ic:"layers",priority:1,niveauPreuve:"★★★",
      title:"Alimentation peu variée",
      text:"La diversité alimentaire est corrélée à la diversité du microbiome intestinal. L'OMS recommande au moins 15-20 groupes d'aliments différents par semaine.",
      conseil:"Règle des 5 couleurs : vise 5 couleurs de fruits et légumes différentes cette semaine.",
      menu:"Semaine type diversifiée : lundi lentilles, mardi poisson, mercredi tofu + légumineuses, jeudi viande blanche, vendredi oeufs, week-end poisson gras. Même structure, 5 protéines différentes.",
      source:"FAO/OMS Food Diversity 2010 ; Sonnenburg & Sonnenburg, Nature 2016"
    });}
    if(a.variete==="elevee"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Excellente diversité alimentaire", text:"Grande variété = meilleure couverture micronutritionnelle et microbiome plus résilient.",
      menu:null, source:"FAO 2010 ; Sonnenburg 2016"
    });}

    // Énergie
    if(!reds){
      if(a.energie==="bonne"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
        title:"Énergie au beau fixe", text:"Bon niveau d'énergie = apport énergétique adapté et récupération efficace.",
        menu:null, source:null
      });}
      if(a.energie==="variable"||a.energie==="fatigue"){c.push({col:"#e07b39",ic:"flame",priority:1,niveauPreuve:"★★",
        title:"Fatigue récurrente à investiguer",
        text:"Causes possibles par ordre de fréquence : déficit calorique, manque de glucides péri-effort, déshydratation, carence en fer/vitamine D, manque de sommeil.",
        conseil:"Check-list rapide :",
        menu:"1. As-tu mangé ≥"+cibLo+"kcal hier ? 2. Urines jaune pâle ? 3. Bilan sanguin récent (ferritine, vitamine D) ? Ces 3 vérifications couvrent 80% des causes.",
        source:"Thomas et al. JAND 2016"
      });}
    }

    // Faim
    if(a.faim==="faim_intense"&&!cortisol_loop){c.push({col:"#e07b39",ic:"apple",priority:1,niveauPreuve:"★★★",
      title:"Fringales intenses",
      text:"Fringales intenses = souvent apport protéique insuffisant ou mauvaise répartition. Les protéines augmentent la satiété davantage que glucides et lipides.",
      conseil:"Vise 0,25 g prot/kg/repas répartis sur 4 prises :",
      menu:"Collation anti-fringale : 20-30g protéines (fromage blanc + noix, ou oeufs durs). Durée de satiété 3-4h vs 1-2h pour les glucides seuls.",
      source:"Leidy et al. 2015 ; ISSN Position Stand 2018"
    });}
    if(a.faim==="restreins"&&!reds){c.push({col:"#b5566a",ic:"alert",priority:0,niveauPreuve:"★★",
      title:"Restriction volontaire chronique",
      text:"Restreindre sous les besoins sur le long terme dégrade performance, santé osseuse, hormones et métabolisme de base (adaptation métabolique). Le corps s'adapte en réduisant sa dépense pour survivre.",
      conseil:"Si l'objectif est la perte de gras : déficit 300-500 kcal/j max, protéines hautes, entraînement en résistance.",
      menu:null, source:"Helms et al., IJSNEM 2014 ; Mountjoy et al. 2018"
    });}

    // Repas
    if(a.repas==="1_2"){c.push({col:"#e07b39",ic:"clock",priority:1,niveauPreuve:"★★★",
      title:"Trop peu de repas",
      text:"1-2 prises/j ne permet pas de maintenir la stimulation de la synthèse protéique (demi-vie ~3-4h). Résultat : catabolisme musculaire accru entre les repas.",
      conseil:"Ajoute 1-2 collations riches en protéines :",
      menu:"Collation 15 min de prep : fromage blanc 150g + miel + amandes = 15g prot, 200 kcal. Ou 3 oeufs durs (18g prot).",
      source:"Areta et al., J Physiol 2013 ; ISSN 2018"
    });}
    if(a.repas==="grignotage"){c.push({col:"#e07b39",ic:"clock",priority:1,niveauPreuve:"★★",
      title:"Grignotage continu",
      text:"Maintien permanent de la glycémie et de l'insuline, perturbation de la fenêtre de jeûne nocturne, difficulté à réguler l'appétit.",
      conseil:"Teste 3-5 vrais repas avec 3-4h entre chaque pendant 2 semaines.",
      menu:null, source:"Kahleova et al., J Nutr 2017"
    });}
    if(a.repas==="3_5_reg"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Rythme alimentaire optimal", text:"3 à 5 prises régulières = structure idéale pour la synthèse protéique et la régulation glycémique.",
      menu:null, source:"ISSN 2018"
    });}

    // Qualité
    if(a.qualite==="transforme"){c.push({col:"#b5566a",ic:"alert",priority:0,niveauPreuve:"★★★",
      title:"Ultra-transformés dominants",
      text:"Classification NOVA : +10% de mortalité par portion supplémentaire/jour dans une méta-analyse de 10 études. Faible densité nutritionnelle, sodium élevé, fibres basses.",
      conseil:"Remplacement progressif — 1 repas/jour :",
      menu:"Ce soir : riz 200g + thon boîte 150g + légumes surgelés = 35g prot, 400 kcal, prêt en 12 min. Moins cher et plus nutritif qu'un plat préparé.",
      source:"Monteiro et al., Public Health Nutr 2019 ; Rico-Campa et al., BMJ 2019"
    });}
    if(a.qualite==="mixte"){c.push({col:"#e07b39",ic:"flame",priority:1,niveauPreuve:"★★",
      title:"Alimentation mixte",
      text:"2-3x plus de sodium dans les plats préparés vs maison, moins de fibres. Impact cumulatif sur la pression artérielle et le microbiome.",
      conseil:"Batch cooking express 30 min/semaine :",
      menu:"Dimanche : 500g riz cuit + 6 oeufs durs + légumes rôtis = 4-5 déjeuners prêts. 30 min de travail = gain nutritionnel de toute la semaine.",
      source:"NOVA 2019 ; ANSES 2017"
    });}
    if(a.qualite==="tres_bonne"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Excellent ancrage alimentaire", text:"Aliments entiers = densité maximale en micronutriments, fibres et phytonutriments.",
      menu:null, source:"Willett et al., Lancet 2019"
    });}

    // Peri
    if(a.peri==="rien"&&!perf_risk){c.push({col:"#b5566a",ic:"zap",priority:0,niveauPreuve:"★★★",
      title:"Pas de stratégie péri-entraînement",
      text:"Resynthèse du glycogène réduite de 50% sans apport post-effort immédiat. Dégradation musculaire amplifiée.",
      conseil:"Post-effort dans les 2h :",
      menu:"Ratio gagnant : 3:1 glucides/protéines. Ex : verre de lait + banane (~250 kcal, 9g prot, 38g glucides). Ou riz + poulet si séance longue.",
      source:"Aragon & Schoenfeld 2013 ; Ivy et al. 2002"
    });}
    if(a.peri==="apres_seul"){c.push({col:"#e07b39",ic:"zap",priority:1,niveauPreuve:"★★",
      title:"Optimise l'avant",
      text:"Post-effort bien géré. Ajouter des glucides avant les séances intenses (+60 min) améliore encore la performance et préserve la masse musculaire.",
      conseil:"Pré-effort 60-90 min avant :",
      menu:"1 banane + 1 yaourt nature = 30g glucides progressifs + 5g prot. Ou 40g flocons d'avoine + lait si séance matinale.",
      source:"Burke et al. 2011"
    });}
    if(a.peri==="avant_apres"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Stratégie péri-entraînement optimale", text:"Avant + après = niveau A de recommandation ISSN.",
      menu:null, source:"ISSN (Thomas et al. 2016)"
    });}

    // Légumes
    if(a.legumes==="peu"){c.push({col:"#b5566a",ic:"leaf",priority:0,niveauPreuve:"★★★",
      title:"Fruits & légumes très insuffisants",
      text:"Méta-analyse 95 études (Aune 2017, n>2M) : 5 portions/j réduisent la mortalité toutes causes de 13%. Moins d'1 portion/j = carence vitamines C, K, folates, fibres.",
      conseil:"Double la quantité ce soir :",
      menu:"Hack simple : ajoute 80g légumes surgelés (brocoli, épinards, petits pois) à ton plat du soir = 1 portion pour ~0.40€, 2 min au micro-ondes.",
      source:"Aune et al. 2017 ; OMS 2003"
    });}
    if(a.legumes==="1_2"){c.push({col:"#e07b39",ic:"leaf",priority:1,niveauPreuve:"★★★",
      title:"Fruits & légumes sous les recommandations",
      text:"Chaque portion supplémentaire apporte des bénéfices additifs jusqu'à 5-7 portions/j.",
      conseil:"+2 portions facilement :",
      menu:"Matin : 1 fruit avec le petit-déj. Déjeuner : crudités (carottes, tomates). Dîner : 150g légumes cuits. = 3 portions ajoutées en 0 effort supplémentaire.",
      source:"Aune et al. 2017"
    });}
    if(a.legumes==="5plus"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Excellent apport en fruits & légumes", text:"5 portions/j + = couverture optimale fibres, antioxydants, microbiome.",
      menu:null, source:"Aune et al. 2017"
    });}

    // Protéines
    if(a.proteines_src==="insuffisant"){c.push({col:"#b5566a",ic:"layers",priority:0,niveauPreuve:"★★★",
      title:"Sources protéiques insuffisantes",
      text:"ISSN recommande 1,4-2,0 g/kg/j. Sous ce seuil, synthèse musculaire limitée même avec entraînement optimal.",
      conseil:"Top sources par rapport prot/kcal :",
      menu:"Thon boîte 150g = 35g prot (130 kcal). Fromage blanc 200g = 14g prot (110 kcal). Edamame 100g = 11g prot (120 kcal). 3 oeufs = 18g prot (210 kcal). Cible : "+(poids?protLo+"-"+protHi+"g/j":"1,6-2,0g/kg/j")+".",
      source:"Stokes et al. 2018 ; Morton et al. 2018"
    });}
    if(a.proteines_src==="vegetales"){c.push({col:"#e07b39",ic:"layers",priority:1,niveauPreuve:"★★",
      title:"Sources végétales — complémentarité",
      text:"Score DIAAS inférieur aux animales, déficit en leucine (clé synthèse musculaire). Augmenter la cible de 10-20% compense.",
      conseil:"Combinaisons complètes :",
      menu:"Lentilles 150g cuit (12g prot) + riz 100g (3g prot) + graines courge 30g (5g prot) = 20g prot, acides aminés complets. Ou tofu 150g + edamame 100g = 25g prot.",
      source:"van Vliet et al. 2015 ; FAO DIAAS 2013"
    });}
    if(a.proteines_src==="varies"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Sources protéiques diversifiées", text:"Variété = profil acides aminés complet + micronutriments complémentaires.",
      menu:null, source:"Stokes et al. 2018"
    });}

    // Stress & récupération active
    if(a.stress==="eleve"&&!stress_eating){c.push({col:"#e07b39",ic:"heart",priority:1,niveauPreuve:"★★",
      title:"Stress élevé — impact nutritionnel",
      text:"Le cortisol chronique augmente les besoins en magnésium, vitamine C et protéines, tout en perturbant la digestion et l'assimilation des nutriments.",
      conseil:"Nutrition anti-stress :",
      menu:"Magnésium bisglycinate 300-400mg/j le soir (déficient chez 70% des sportifs sous stress). Vitamine C 200mg/j (aliments : kiwi, poivron, agrumes).",
      source:"Nielsen & Lukaski, Magnesium Res 2006"
    });}
    if(a.stress==="burnout"){c.push({col:"#b5566a",ic:"alert",priority:0,niveauPreuve:"★★",
      title:"Surmenage — priorité à la récupération",
      text:"En état de surmenage, l'entraînement intensif aggrave le tableau. Le cortisol très élevé catabolise les muscles, perturbe le sommeil et inhibe les hormones anaboliques.",
      conseil:"Pendant 2-4 semaines : réduis l'intensité de l'entraînement de 40-50%, augmente les apports caloriques de 200-300 kcal/j, priorise le sommeil.",
      menu:null,
      source:"Meeusen et al., Med Sci Sports Exerc 2013 — consensus overtraining"
    });}
    if(a.recup_active==="rien"){c.push({col:"#e07b39",ic:"bolt",priority:1,niveauPreuve:"★★",
      title:"Absence de récupération active",
      text:"La récupération active (marche légère, étirements, mobilité, bain froid) accélère l'élimination des déchets métaboliques et réduit les courbatures de 20-30%.",
      conseil:"Minimum efficace :",
      menu:"10 min de marche légère post-entraînement + 5 min d'étirements des groupes musculaires travaillés. Gratuit, immédiat, efficace dès la première séance.",
      source:"Halson, Sports Med 2014"
    });}
    if(a.recup_active==="multiple"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Récupération active bien intégrée", text:"Pratiques multiples de récupération = optimisation maximale de la supercompensation.",
      menu:null, source:"Halson 2014"
    });}

    // Alimentation émotionnelle
    if(a.emotionnel==="souvent"||a.emotionnel==="regulier"){c.push({col:relation_alim?"#b5566a":"#e07b39",ic:"heart",priority:relation_alim?3:0,niveauPreuve:"★★",
      title:"Alimentation émotionnelle fréquente",
      text:"Manger en réponse aux émotions est un mécanisme de régulation appris, pas un défaut de volonté. Il est très fréquent (30-50% des adultes).",
      conseil:"Technique de pause de 10 min : note l'émotion présente avant de manger. Cette distance casse souvent le schéma automatique.",
      menu:null, source:"Braden et al. 2018 ; van Strien et al. 2016"
    });}
    if(a.emotionnel==="parfois"){c.push({col:"#e07b39",ic:"heart",priority:2,niveauPreuve:"★★",
      title:"Quelques épisodes d'alimentation émotionnelle",
      text:"Courant et non problématique en soi. L'enjeu est de reconnaître le déclencheur avant que ça devienne systématique.",
      conseil:"Identifie les 2-3 déclencheurs principaux (heure de la journée ? émotion spécifique ?) et prépare une alternative (marche, musique, appel).",
      menu:null, source:"Braden et al. 2018"
    });}

    // Flexibilité
    if(a.flexibilite==="tout_rien"||a.flexibilite==="rigide"||a.flexibilite==="compense"){c.push({col:"#b5566a",ic:"heart",priority:relation_alim?3:1,niveauPreuve:"★★",
      title:"Rigidité alimentaire",
      text:"La flexibilité cognitive alimentaire est corrélée à de meilleures habitudes à long terme. La rigidité est associée à des épisodes de compulsions et une moins bonne adhérence.",
      conseil:"Un repas plaisir planifié (sans restriction compensatoire) par semaine améliore l'adhérence à long terme.",
      menu:null, source:"Westenhoefer et al. 2013 ; Stewart et al. 2002"
    });}
    if(a.flexibilite==="serein"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Flexibilité alimentaire saine", text:"Vivre sereinement les écarts prédit une meilleure adhérence à long terme.",
      menu:null, source:"Stewart et al. 2002"
    });}

    // Social
    if(a.social==="facile"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Aisance alimentaire en société", text:"S'adapter facilement aux repas sociaux est un marqueur de flexibilité saine.",
      menu:null, source:null
    });}

    // Alcool/caféine
    if(a.alcool_cafe==="exces"){c.push({col:"#b5566a",ic:"droplet",priority:0,niveauPreuve:"★★★",
      title:"Alcool et caféine excessifs",
      text:"Alcool : inhibe la synthèse protéique de 24-37% post-effort (Parr 2014) + perturbe sommeil profond. Caféine >600mg/j : augmente cortisol, dégrade la récupération.",
      conseil:"Alcool : max 1 verre/jour (OMS = 0 pour la santé). Caféine : 3-6 mg/kg/j, dernier café avant 14h.",
      menu:null, source:"Parr et al. 2014 ; OMS 2023 ; Pickering & Grgic 2019"
    });}
    if(a.alcool_cafe==="cafe_eleve"){c.push({col:"#e07b39",ic:"droplet",priority:1,niveauPreuve:"★★",
      title:"Caféine ou alcool élevé",
      text:"4+ cafés/jour = perturbation du sommeil dès le soir. Alcool régulier = récupération musculaire dégradée.",
      conseil:"Réduis à 2-3 cafés, arrête avant 14h. Test : 4 semaines sans alcool et mesure l'impact sur ton sommeil.",
      menu:null, source:"Pickering & Grgic 2019 ; Parr et al. 2014"
    });}
    if(a.alcool_cafe==="aucun"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Très faible consommation", text:"Favorise sommeil de qualité, bonne récupération, régulation hormonale optimale.",
      menu:null, source:"Parr et al. 2014"
    });}

    // Hydratation
    if(a.urines==="tres_fonce"){c.push({col:"#b5566a",ic:"droplet",priority:0,niveauPreuve:"★★★",
      title:"Déshydratation sévère",
      text:"Urines marron = déshydratation sévère. -2% poids corporel en eau = -10-20% performance.",
      conseil:"Protocole réhydratation :",
      menu:"500ml maintenant + 250ml/30 min jusqu'à urine jaune pâle. Si sudation excessive : pincée de sel + jus de citron dans l'eau.",
      source:"Armstrong et al. 1994 ; EFSA 2010"
    });}
    if(a.urines==="fonce"){c.push({col:"#e07b39",ic:"droplet",priority:1,niveauPreuve:"★★★",
      title:"Hydratation insuffisante",
      text:"Urines jaune foncé = début de déshydratation. Cible : couleur 1-3 sur l'échelle Armstrong.",
      conseil:"Astuce pratique : bouteille 500ml sur le bureau, remplie 4x/jour. Bois sans attendre la soif.",
      menu:null, source:"EFSA 2010 ; Armstrong et al. 1994"
    });}
    if(a.urines==="pale"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Hydratation correcte", text:"Urines jaune pâle = bonne hydratation. Adapte +500-750ml/h d'effort intense.",
      menu:null, source:"Armstrong et al. 1994"
    });}

    // Digestion
    if(a.digestion==="transit"){c.push({col:"#e07b39",ic:"leaf",priority:1,niveauPreuve:"★★",
      title:"Transit lent",
      text:"Souvent lié à fibres ou eau insuffisants. EFSA recommande "+fibMin+"-"+fibMax+"g/j.",
      conseil:"Trio transit :",
      menu:"2 pruneaux + verre eau tiède le matin + 10 min marche post-repas = trio validé pour améliorer le transit en 5-7 jours.",
      source:"EFSA 2017 ; Mabasa et al. 2020"
    });}
    if(a.digestion==="ballonnements"){c.push({col:"#e07b39",ic:"leaf",priority:1,niveauPreuve:"★★",
      title:"Ballonnements fréquents",
      text:"Causes : augmentation trop rapide des fibres, FODMAP, déséquilibre microbiome.",
      conseil:"Augmente fibres +3g/semaine. Si ça persiste après 3 sem : bilan FODMAP.",
      menu:null, source:"Halmos et al. 2014 ; EFSA 2017"
    });}
    if(a.digestion==="ok"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Confort digestif optimal", text:"Bon transit = alimentation équilibrée en fibres et microbiome en bonne santé.",
      menu:null, source:null
    });}

    // Sommeil
    if(a.sommeil==="mauvais"&&!cortisol_loop){c.push({col:"#b5566a",ic:"moon",priority:0,niveauPreuve:"★★★",
      title:"Sommeil insuffisant — impact systémique",
      text:"<6h/nuit régulièrement : +300-500 kcal/j d'appétit, -30-40% d'effet anabolique de l'entraînement, cortisol élevé, résistance à l'insuline accrue.",
      conseil:"Protocole sommeil :",
      menu:"Chambre à 18-19°C. Écrans off 1h avant. Collation tryptophane légère : 1 banane + yaourt nature (favorise la sérotonine → mélatonine).",
      source:"Taheri et al. 2004 ; Dattilo et al. 2011"
    });}
    if(a.sommeil==="fragmente"&&!cortisol_loop){c.push({col:"#e07b39",ic:"moon",priority:1,niveauPreuve:"★★",
      title:"Sommeil fragmenté",
      text:"Récupération musculaire (GH nocturne), régulation cortisol et sensibilité insuline perturbées.",
      conseil:"Évite caféine >14h et repas lourds 2h avant coucher. Des glucides légers le soir favorisent l'endormissement.",
      menu:null, source:"Halson 2014"
    });}
    if(a.sommeil==="bien"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Sommeil récupérateur", text:"7-9h de qualité = récupération musculaire, régulation hormonale et performance cognitive optimales.",
      menu:null, source:"Halson 2014"
    });}

    // Compléments
    if(a.supplements==="aucun"){c.push({col:"#e07b39",ic:"spark",priority:2,niveauPreuve:"★★★",
      title:"3 carences fréquentes à couvrir",
      text:"80% de la population en carence vitamine D en hiver. Magnésium épuisé par stress et transpiration. Oméga-3 EPA+DHA chroniquement sous-consommés.",
      conseil:"Protocole fondamentaux :",
      menu:"1. Vitamine D3 1000-2000 UI/j (oct-avr). 2. Magnésium bisglycinate 300-400mg/j (soir). 3. Oméga-3 EPA+DHA 1-2g/j. Ces 3 seuls compléments couvrent les déficits les plus fréquents chez le sportif.",
      source:"Holick NEJM 2007 ; Nielsen & Lukaski 2006 ; Smith et al. 2011"
    });}
    if(a.supplements==="beaucoup"){c.push({col:"#e07b39",ic:"spark",priority:1,niveauPreuve:"★★",
      title:"Trop de compléments",
      text:"Pré-workouts (200-400mg caféine/dose) et brûleurs = efficacité très limitée, risques cardiovasculaires documentés.",
      conseil:"Garde fondamentaux + créatine si force. Retire le reste sur 4 semaines et observe.",
      menu:null, source:"Maughan et al. 2018 (consensus COI)"
    });}
    if(a.supplements==="basiques"){c.push({col:"#6f8a3a",ic:"check",priority:3,niveauPreuve:null,
      title:"Approche compléments optimale", text:"Fondamentaux uniquement = approche la plus efficace et la mieux documentée.",
      menu:null, source:"Maughan et al. 2018"
    });}

    // Journal foodLog
    if(avg&&validProfile&&!reds){
      if(avg.k<cibMid-400){c.push({col:"#e07b39",ic:"flame",priority:1,niveauPreuve:null,
        title:"Apport calorique sous la cible (journal 7j)",
        text:"Journal 7 jours : "+avg.k+" kcal/j en moyenne vs cible estimée "+cibMid+" kcal/j. Vérifier si déficit intentionnel ou non.",
        menu:null, source:"Mifflin-St Jeor"
      });}
      if(avg.p<protLo-10){c.push({col:"#5f7d8c",ic:"layers",priority:1,niveauPreuve:null,
        title:"Protéines sous la cible ISSN (journal 7j)",
        text:"Journal : "+avg.p+"g/j vs cible ISSN "+protLo+"-"+protHi+"g/j.",
        menu:null, source:"ISSN 2018"
      });}
      if(avg.fib>0&&avg.fib<fibMin-5){c.push({col:"#6f8a3a",ic:"leaf",priority:1,niveauPreuve:null,
        title:"Fibres insuffisantes (journal 7j)",
        text:"Journal : "+avg.fib+"g/j de fibres vs cible EFSA "+fibMin+"-"+fibMax+"g/j.",
        menu:null, source:"EFSA 2017"
      });}
    }

    return c.sort(function(a,b){return a.priority-b.priority;});
}
