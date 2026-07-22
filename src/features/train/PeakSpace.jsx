import React, { useState } from 'react'
import { C, Icon } from '../health/kit'
import { SPORTS } from './trainData'
import { peakReadiness } from './renfoIntel'

var PEAK_COLOR = '#a3526b';
var PHASE_COLORS = { base: '#5b6fa5', build: '#bf6a40', taper: '#4a8a6a', today: '#a3526b', past: '#9c9489' };
var PHASE_LABELS = { base: 'Développement général', build: 'Développement spécifique', taper: 'Affûtage', today: 'Jour J', past: 'Terminé' };

/* ═══════════════════════════════════════════════════════════════════════
   MOTEUR DE PÉRIODISATION
   Recalculé à chaque affichage à partir de (aujourd'hui, date objectif,
   type d'effort) — aucun plan figé stocké, donc aucune dérive possible
   si l'utilisateur modifie la date.

   Bases scientifiques (affûtage) :
   - Endurance : réduction de volume 41–60 %, intensité ET fréquence
     maintenues, durée ≤ 21 jours, en paliers ou progressive.
     Wang et al. 2023, "Effects of tapering on performance in endurance
     athletes: a systematic review and meta-analysis" (14 études, PLOS ONE).
     Niveau de preuve : bon (méta-analyse récente).
   - Force / puissance : réduction ~50 % (40–60 %) du volume, intensité
     maintenue ou légèrement accrue, durée ≤ 14 jours.
     Travis et al. 2020, revue systématique (peaking maximal strength).
     Niveau de preuve : modéré (peu d'études comparatives directes).
   - Limite commune : ces repères viennent d'études sur sportifs entraînés
     à intensité/volume déjà élevés ; à assouplir pour un pratiquant loisir.
   ═══════════════════════════════════════════════════════════════════════ */

var EFFORT_PROFILES = {
  endurance: { label: 'Endurance longue', taperDays: 14, buildDays: 28, reductionMin: 41, reductionMax: 60, preuve: 'bon',
    note: 'Réduis le volume (distance/durée) de 41 à 60 %, en gardant l\u2019intensité (allures) et la fréquence des séances quasi identiques.' },
  force: { label: 'Force maximale', taperDays: 10, buildDays: 21, reductionMin: 40, reductionMax: 60, preuve: 'modéré',
    note: 'Réduis le volume (séries × répétitions) d\u2019environ 50 %, en maintenant ou augmentant légèrement les charges (intensité).' },
  puissance: { label: 'Puissance / vitesse', taperDays: 10, buildDays: 21, reductionMin: 30, reductionMax: 50, preuve: 'limité',
    note: 'Réduis le volume de 30 à 50 %, garde des efforts brefs et rapides (peu de répétitions) à intensité maximale pour conserver la vitesse d\u2019exécution.' },
  collectif: { label: 'Sport collectif / intermittent', taperDays: 8, buildDays: 21, reductionMin: 20, reductionMax: 35, preuve: 'faible',
    note: 'Réduis le volume total (durée/nombre d\u2019exercices) de 20 à 35 %, en gardant quelques séquences à intensité match pour ne pas perdre le rythme de jeu.' },
  hypertrophie: { label: 'Musculation / esthétique', taperDays: 7, buildDays: 21, reductionMin: 30, reductionMax: 50, preuve: 'faible',
    note: 'Si c\u2019est pour un physique-show : la vraie \u00AB peak week \u00BB se joue surtout côté nutrition/hydratation (hors périmètre entraînement) — vois le module Nutrition. Côté entraînement : baisse le volume de 30 à 50 % en gardant l\u2019intensité, pour arriver reposé et \u00AB plein \u00BB (pump) sans fatigue résiduelle.' },
  technique: { label: 'Technique / précision', taperDays: 7, buildDays: 14, reductionMin: 20, reductionMax: 40, preuve: 'très faible',
    note: 'Réduis surtout la charge physique et le volume de répétitions de 20 à 40 %, tout en gardant des répétitions techniques courtes et de qualité pour ne pas perdre les sensations.' },
  explosivite: { label: 'Explosivité (essai unique)', taperDays: 8, buildDays: 21, reductionMin: 40, reductionMax: 60, preuve: 'faible',
    note: 'Réduis fortement le volume (40 à 60 %) tout en gardant des efforts très proches du maximum sur peu de répétitions, pour arriver frais et précis sur tes 2-3 essais de compétition (haltéro, saut, lancer).' },
  combat: { label: 'Sport de combat', taperDays: 7, buildDays: 21, reductionMin: 50, reductionMax: 75, preuve: 'limité',
    note: 'Réduis nettement le volume (50 à 75 %) sur la dernière semaine, en gardant quelques échanges courts à intensité de combat pour garder les repères et le timing.' },
  agres: { label: 'Souplesse / Agrès', taperDays: 7, buildDays: 21, reductionMin: 25, reductionMax: 40, preuve: 'très faible',
    note: 'Réduis le volume physique (répétitions, difficulté) de 25 à 40 %, mais NE COUPE PAS le travail de souplesse : l\u2019amplitude articulaire se perd vite à l\u2019arrêt, contrairement aux autres qualités.' },
  mixte: { label: 'Autre / non précisé', taperDays: 12, buildDays: 21, reductionMin: 30, reductionMax: 45, preuve: 'faible',
    note: 'Réduis le volume d\u2019entraînement de 30 à 45 %, en gardant l\u2019intensité des exercices spécifiques et la fréquence des séances.' }
};
var PREUVE_LABELS = { bon: 'bon (méta-analyse récente)', modéré: 'modéré (revue systématique, peu d\u2019essais comparatifs directs)', limité: 'limité (quelques études isolées)', faible: 'faible (peu ou pas d\u2019études dédiées — extrapolation raisonnée)', 'très faible': 'très faible (aucune littérature dédiée trouvée — à prendre comme repère prudent, pas comme prescription validée)' };

var AFFUTAGE_CITATIONS = {
  endurance: 'réduction de volume de 41 à 60 %, intensité et fréquence maintenues, sur \u2264 21 jours (méta-analyse Wang et al., 2023, 14 études — niveau de preuve bon).',
  force: 'réduction de volume d\u2019environ 50 %, intensité maintenue ou accrue, sur \u2264 14 jours (revue Travis et al., 2020 ; ACSM 2026 — niveau de preuve modéré).',
  puissance: 'réduction de volume de 30 à 50 %, vitesse d\u2019exécution maintenue (revue \u00AB Less is More \u00BB, données sur lanceurs \u224825-40 % et rugbymen \u224875 % sur 3 semaines — niveau de preuve limité, résultats hétérogènes selon le sport).',
  collectif: 'repères prudents (20 à 35 % de réduction) faute de méta-analyse dédiée aux sports collectifs — la revue de Mujika & Padilla (2003) couvre surtout des sports individuels, les données spécifiques au collectif restent rares.',
  hypertrophie: 'réduction de volume de 30 à 50 % en gardant l\u2019intensité, pour une définition musculaire optimale au jour J — peu d\u2019essais contrôlés dédiés spécifiquement à l\u2019affûtage pré-physique-show.',
  technique: 'repères très prudents (20 à 40 % de réduction) — aucune littérature spécifique trouvée pour les sports à dominante technique/précision, la priorité va au repos mental plus qu\u2019à la charge physique.',
  explosivite: 'réduction marquée du volume (40 à 60 %) en gardant l\u2019intensité proche du maximum sur peu de répétitions — repère extrapolé des principes de tapering force/puissance (ACSM 2026 ; revue \u00AB Less is More \u00BB), pas d\u2019étude dédiée spécifiquement au format \u00AB 3 essais \u00BB de compétition trouvée.',
  combat: 'réduction marquée (50 à 75 %) sur la dernière semaine — s\u2019appuie sur une étude chez des lutteurs élite comparant 50 % et 75 % de réduction de volume sur 1 semaine (les deux groupes tapering ont progressé par rapport au groupe témoin) — niveau de preuve limité, une seule étude identifiée.',
  agres: 'réduction modérée (25 à 40 %) mais maintien impératif du travail de souplesse — aucune méta-analyse dédiée trouvée ; le principe de ne pas couper la mobilité s\u2019appuie sur les connaissances générales de détraining (perte d\u2019amplitude articulaire rapide à l\u2019arrêt), pas sur une étude de tapering spécifique aux agrès.',
  mixte: 'repères adaptés (30 à 45 % de réduction) faute de catégorie plus précise — à ajuster selon ta sensation.'
};

var PHASE_DETAILS = {
  base: {
    objectif: 'Construire la capacité de base : endurance/force générale, technique, mobilité, prévention.',
    volume: 'Progressif, +5 à 10 %/semaine maximum (repère empirique de prévention des blessures de surcharge).',
    intensite: 'Modérée dans l\u2019ensemble ; pas besoin de séances à très haute intensité systématiques.',
    recuperation: 'Au moins 1 jour de repos complet ou activité très légère par semaine.',
    attention: 'Ne saute pas cette phase même si le délai est court : elle limite le risque de blessure quand la charge augmentera.'
  },
  build: {
    objectif: 'Se rapprocher du geste ou de l\u2019épreuve cible : travail spécifique, allures/charges proches de l\u2019objectif.',
    volume: 'Élevé et stable, avec éventuellement une semaine de charge un peu plus difficile juste avant l\u2019affûtage.',
    intensite: 'Croissante — c\u2019est la phase où l\u2019entraînement se rapproche le plus de la performance visée.',
    recuperation: 'Surveille les signaux de fatigue excessive (sommeil, humeur, performance qui stagne) : la marge d\u2019erreur est plus faible qu\u2019en phase de base.',
    attention: 'Une semaine de surcharge suivie d\u2019un affûtage améliore davantage la performance qu\u2019un affûtage seul (Wang et al. 2023), mais une surcharge mal gérée augmente le risque de blessure ou de surentraînement.'
  },
  taper: {
    objectif: 'Dissiper la fatigue accumulée tout en conservant les adaptations obtenues.',
    volume: 'Réduction marquée du volume (détail chiffré ci-dessous selon ton type d\u2019effort).',
    intensite: 'Maintenue, voire légèrement augmentée — c\u2019est l\u2019élément qui influence le plus le résultat selon les données disponibles.',
    recuperation: 'Priorité au sommeil, à la nutrition et à la gestion du stress dans les derniers jours.',
    attention: 'Évite d\u2019introduire de nouveaux exercices ou une intensité inhabituelle à ce stade.'
  }
};

/* ─── Prescriptions numériques indicatives par phase × type d\u2019effort ──────
   Endurance : zones en % de la FC max, modèle à 5 zones classique + repère
   polarisé (\u224880 % du temps en zone facile / \u224820 % en zone difficile,
   très peu à l\u2019allure seuil) — Rosenblat et al. 2019, méta-analyse (petit
   effet favorable au modèle polarisé, niveau de preuve modéré).
   Force/puissance : ACSM 2026 (Currier et al., synthèse de 137 revues,
   >30 000 participants, MSSE) — force : \u226580 % 1RM, amplitude complète,
   2-3 séries, exercices clés en premier, \u2265 2 séances/semaine ; hypertrophie :
   \u226510 séries/groupe musculaire/semaine, charge 30-100 % 1RM si l\u2019effort est
   suffisant (\u2248 2-3 répétitions en réserve, pas besoin d\u2019aller à l\u2019échec).
   ──────────────────────────────────────────────────────────────────────── */
var PHASE_PRESCRIPTIONS = {
  endurance: {
    base: { sessions: '3 à 5 séances/semaine', repartition: '\u2248 80 % en endurance fondamentale (Z1-Z2, facile, on peut parler), \u2248 20 % plus soutenu.', cle: 'Sortie longue hebdomadaire + 1 séance de côtes/technique courte.' },
    build: { sessions: '4 à 6 séances/semaine', repartition: 'On introduit 1-2 séances au seuil ou en intervalles (Z3-Z4), le reste reste facile — garder la majorité du volume en endurance facile.', cle: '1 séance spécifique à l\u2019allure ou au format de l\u2019épreuve cible par semaine.' },
    taper: { sessions: 'Même fréquence qu\u2019en Build, volume divisé par 2 environ', repartition: 'Intensité maintenue : garde 1-2 efforts courts à allure cible, mais raccourcis les séries et les séances faciles.', cle: 'Quelques accélérations courtes proches de l\u2019allure de course pour garder les sensations, jamais de nouvelle séance inhabituelle.' }
  },
  force: {
    base: { sessions: '2 à 3 séances/semaine par groupe musculaire', repartition: '\u2265 10 séries/groupe musculaire/semaine, charge large 30-100 % 1RM tant que l\u2019effort est suffisant (\u22482-3 répétitions en réserve) — pas besoin d\u2019aller à l\u2019échec (ACSM 2026).', cle: 'Travail d\u2019amplitude complète, exercices polyarticulaires en premier dans la séance.' },
    build: { sessions: '2 à 3 séances/semaine', repartition: 'Bascule progressive vers des charges plus lourdes (\u2192 70-85 % 1RM), volume qui reste élevé mais un peu moins qu\u2019en Base.', cle: 'Exercices clés (les mouvements les plus proches de ta performance cible) toujours en début de séance.' },
    taper: { sessions: 'Même fréquence, \u2248 2-3 séries par exercice clé (au lieu de 4-6)', repartition: 'Charge maintenue haute (\u226580 % 1RM), c\u2019est le VOLUME (nombre de séries) qui baisse, pas la charge (ACSM 2026 ; Travis et al. 2020).', cle: '1-2 répétitions à charge quasi maximale suffisent pour garder l\u2019activation neuromusculaire, sans fatigue résiduelle.' }
  },
  mixte: {
    base: { sessions: '3 à 4 séances/semaine', repartition: 'Mélange technique/physique, intensité majoritairement modérée, quelques répétitions en réserve sur les exercices de renfo.', cle: 'Travail technique du geste + renforcement général 1-2 fois/semaine.' },
    build: { sessions: '3 à 5 séances/semaine', repartition: 'Séances plus spécifiques au sport (situations, intensité proche de la compétition), renfo qui se rapproche des qualités clés (force/puissance/répétition d\u2019efforts).', cle: '1 séance à intensité proche de la compétition par semaine.' },
    taper: { sessions: 'Même fréquence, contenu allégé', repartition: 'Volume réduit de 30 à 45 %, intensité et gestes spécifiques maintenus pour garder les repères techniques.', cle: 'Quelques séquences courtes à intensité match/compétition, sans accumuler la fatigue.' }
  },
  puissance: {
    base: { sessions: '2 à 4 séances/semaine', repartition: 'Force générale (30-100 % 1RM, effort suffisant) + travail de vitesse/pliométrie à faible volume (\u2264 24 contacts/séance pour les exercices de puissance).', cle: 'Technique du mouvement explosif (saut, lancer, sprint) travaillée à chaque séance, jamais fatiguée.' },
    build: { sessions: '3 à 5 séances/semaine', repartition: 'Charges modérées (30-70 % 1RM) déplacées vite, peu de répétitions par série, récupération complète entre les efforts.', cle: 'Séances de vitesse/puissance placées quand tu es frais (jamais en fin de séance fatiguée).' },
    taper: { sessions: 'Même fréquence, volume divisé par 2 à 3', repartition: 'Charge et vitesse d\u2019exécution maintenues, nombre de répétitions fortement réduit.', cle: 'Quelques répétitions explosives de très haute qualité valent mieux qu\u2019un gros volume fatigant.' }
  },
  collectif: {
    base: { sessions: '2 à 4 séances + matchs/entraînements collectifs', repartition: 'Travail physique général (force, endurance intermittente) en complément du travail collectif habituel.', cle: '1 séance de renforcement général par semaine en plus du travail d\u2019équipe.' },
    build: { sessions: 'Fréquence habituelle de l\u2019équipe + séances individuelles ciblées', repartition: 'Intensité rapprochée du rythme de match, volume de renforcement qui reste présent mais un peu réduit.', cle: 'Séances à intensité \u00AB match \u00BB (répétitions d\u2019efforts intermittents) 1 à 2 fois/semaine.' },
    taper: { sessions: 'Fréquence maintenue, contenu allégé', repartition: 'Réduction modérée du volume (20 à 35 %), on garde des touches courtes à intensité match pour ne pas perdre le rythme.', cle: 'Quelques séquences courtes et intenses valent mieux qu\u2019une séance longue à la veille de la compétition.' }
  },
  hypertrophie: {
    base: { sessions: '3 à 5 séances/semaine', repartition: '\u2265 10 séries/groupe musculaire/semaine, charge large 30-100 % 1RM, effort proche de l\u2019échec (\u22482-3 répétitions en réserve), emphase excentrique (ACSM 2026).', cle: 'Progression continue du volume ou de la charge séance après séance.' },
    build: { sessions: '4 à 6 séances/semaine', repartition: 'Volume qui continue de grimper (jusqu\u2019à 15-20 séries/groupe si la récupération suit), toujours un effort suffisant sur chaque série.', cle: 'Surveiller le sommeil et l\u2019alimentation : c\u2019est souvent le facteur limitant à ce volume.' },
    taper: { sessions: 'Fréquence maintenue, volume divisé par 2', repartition: 'Baisse du nombre de séries en gardant l\u2019intensité (charge), pour arriver reposé sans perdre le \u00AB plein \u00BB musculaire.', cle: 'La vraie \u00AB peak week \u00BB d\u2019un physique-show est surtout nutritionnelle (voir le module Nutrition) — l\u2019entraînement ne fait qu\u2019une partie du travail ici.' }
  },
  technique: {
    base: { sessions: '2 à 4 séances/semaine', repartition: 'Volume de répétitions techniques modéré, qualité du geste avant la quantité.', cle: 'Travail décomposé du geste + situations complètes.' },
    build: { sessions: '3 à 5 séances/semaine', repartition: 'Répétitions en conditions proches de la compétition (pression, enjeu simulé), léger travail physique de soutien si pertinent.', cle: 'Simulations de compétition (mise en situation réelle) 1 fois/semaine.' },
    taper: { sessions: 'Fréquence réduite, séances courtes', repartition: 'Peu de répétitions mais de haute qualité, priorité au repos mental et à la préparation (matériel, routine).', cle: 'Éviter de \u00AB trop en faire \u00BB dans les derniers jours : la fraîcheur mentale compte autant que la technique ici.' }
  },
  explosivite: {
    base: { sessions: '3 à 4 séances/semaine', repartition: 'Travail technique du geste (arraché/épaulé-jeté, appel de saut, geste de lancer) + force générale de soutien, charges variées.', cle: 'Beaucoup de répétitions techniques à charge sous-maximale pour ancrer le mouvement.' },
    build: { sessions: '3 à 5 séances/semaine', repartition: 'Charges qui se rapprochent du maximum, volume qui reste conséquent, simulations d\u2019essais de compétition.', cle: '1 séance par semaine qui simule le format de compétition (3 essais, montée en charge).' },
    taper: { sessions: 'Fréquence maintenue, volume divisé par 2 à 2,5', repartition: 'Charges proches du maximum sur très peu de répétitions, jamais de nouveau record à l\u2019entraînement.', cle: 'Ouvre avec des charges connues et sûres ; garde tes essais les plus lourds pour le jour de la compétition.' }
  },
  combat: {
    base: { sessions: '4 à 6 séances/semaine (technique + physique)', repartition: 'Travail technique varié, endurance spécifique au combat, renforcement général.', cle: '1 séance de renforcement général + travail technique régulier.' },
    build: { sessions: '5 à 7 séances/semaine', repartition: 'Rounds/assauts à intensité proche de la compétition, gestion progressive du poids de forme si catégorie de poids concernée.', cle: 'Sparring/assauts contrôlés à intensité compétition 1 à 2 fois/semaine, jamais la veille.' },
    taper: { sessions: 'Fréquence réduite en fin de semaine', repartition: 'Volume en forte baisse (50 à 75 %), quelques échanges courts et rapides pour garder le timing.', cle: 'Repos et gestion du poids/hydratation priorisés sur les derniers jours si pesée officielle.' }
  },
  agres: {
    base: { sessions: '3 à 6 séances/semaine', repartition: 'Souplesse active/passive à chaque séance, technique décomposée, renforcement spécifique.', cle: 'La souplesse se travaille systématiquement, jamais \u00AB en option \u00BB.' },
    build: { sessions: '4 à 6 séances/semaine', repartition: 'Enchaînements complets répétés, difficulté qui se rapproche du niveau de compétition.', cle: 'Passages complets du programme de compétition, avec notation/feedback si possible.' },
    taper: { sessions: 'Fréquence maintenue, volume et difficulté réduits', repartition: 'Moins de répétitions et de passages complets, mais la routine de souplesse reste quasi intacte.', cle: 'Ne saute pas les étirements des derniers jours : la perte d\u2019amplitude peut coûter cher en notation.' }
  }
};

/* ─── Modèle indicatif de dernière semaine avant l\u2019objectif ────────────────
   Gabarit pratique (pas issu d\u2019une méta-analyse dédiée jour par jour) qui
   traduit les principes validés : volume en forte baisse, intensité maintenue
   via des efforts courts et espacés ("ouvreurs"), repos rapproché du jour J.
   À ajuster selon tes sensations — ce n\u2019est pas une prescription rigide.
   ──────────────────────────────────────────────────────────────────────── */
var FINAL_WEEK_TEMPLATE = {
  endurance: [
    { d: 7, type: 'Séance modérée', detail: 'Volume réduit (\u2248 70 % de d\u2019habitude), allure habituelle, à l\u2019écoute des sensations.' },
    { d: 6, type: 'Repos ou très léger', detail: 'Repos complet ou récupération active 20-30 min.' },
    { d: 5, type: 'Affûtage + accélérations', detail: 'Séance courte avec quelques accélérations à l\u2019allure cible pour garder le neuromusculaire actif.' },
    { d: 4, type: 'Repos', detail: 'Repos complet ou marche légère.' },
    { d: 3, type: 'Séance courte et vive', detail: 'Volume faible, quelques répétitions courtes à l\u2019allure cible, beaucoup de récupération entre.' },
    { d: 2, type: 'Repos', detail: 'Repos ou mobilité très légère.' },
    { d: 1, type: 'Activation légère', detail: '10-15 min très facile + mobilité. Priorité au sommeil et à la logistique (matériel, trajet, repas).' },
    { d: 0, type: 'Jour J', detail: 'Échauffement habituel, hydratation normale, fais confiance au travail effectué.' }
  ],
  force: [
    { d: 7, type: 'Séance charge moyenne', detail: 'Volume réduit, charges autour de 70-75 % 1RM.' },
    { d: 6, type: 'Repos', detail: 'Repos complet.' },
    { d: 5, type: 'Séance ouvreur', detail: '1-2 répétitions à charge élevée (\u2248 85-90 % 1RM) sur les mouvements clés, très peu de séries — juste pour garder l\u2019activation.' },
    { d: 4, type: 'Repos', detail: 'Repos complet ou mobilité légère.' },
    { d: 3, type: 'Séance très courte', detail: 'Quelques répétitions à charge modérée-haute, volume minimal.' },
    { d: 2, type: 'Repos', detail: 'Repos complet.' },
    { d: 1, type: 'Activation légère', detail: 'Mobilisation articulaire, quelques répétitions à charge légère. Priorité sommeil et nutrition.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement habituel complet, pas de charge inhabituelle avant l\u2019épreuve.' }
  ],
  mixte: [
    { d: 7, type: 'Séance modérée', detail: 'Volume réduit, intensité proche de d\u2019habitude.' },
    { d: 6, type: 'Repos ou très léger', detail: 'Récupération active courte si besoin.' },
    { d: 5, type: 'Séance spécifique courte', detail: 'Quelques séquences techniques/tactiques à intensité proche de la compétition.' },
    { d: 4, type: 'Repos', detail: 'Repos complet ou mobilité légère.' },
    { d: 3, type: 'Séance courte et vive', detail: 'Volume faible, gestes clés à intensité maintenue.' },
    { d: 2, type: 'Repos', detail: 'Repos ou activation très légère.' },
    { d: 1, type: 'Activation légère', detail: 'Mobilité, gestes techniques légers. Priorité sommeil et logistique.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement habituel, confiance dans la préparation.' }
  ],
  puissance: [
    { d: 7, type: 'Séance réduite', detail: 'Volume divisé par 2, vitesse d\u2019exécution maintenue.' },
    { d: 6, type: 'Repos', detail: 'Repos complet.' },
    { d: 5, type: 'Séance explosive courte', detail: 'Quelques sauts/lancers/sprints très courts, qualité maximale, récupération complète entre chaque.' },
    { d: 4, type: 'Repos', detail: 'Repos complet ou mobilité légère.' },
    { d: 3, type: 'Activation courte', detail: 'Quelques répétitions explosives à faible volume, sensations de vitesse.' },
    { d: 2, type: 'Repos', detail: 'Repos complet.' },
    { d: 1, type: 'Activation légère', detail: 'Quelques amorces très courtes à vitesse normale, pas de fatigue. Priorité sommeil.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement dynamique complet, quelques amorces avant l\u2019épreuve.' }
  ],
  collectif: [
    { d: 7, type: 'Entraînement réduit', detail: 'Intensité proche de d\u2019habitude, un peu moins de volume.' },
    { d: 6, type: 'Repos ou récupération', detail: 'Séance légère ou repos selon calendrier d\u2019équipe.' },
    { d: 5, type: 'Séance à intensité match', detail: 'Séquences courtes et intenses (transitions, situations réelles), volume total réduit.' },
    { d: 4, type: 'Repos', detail: 'Repos ou récupération active légère.' },
    { d: 3, type: 'Activation courte', detail: 'Touches de balle/technique à intensité modérée, pas de séance longue.' },
    { d: 2, type: 'Repos', detail: 'Repos complet ou étirements légers.' },
    { d: 1, type: 'Activation légère', detail: 'Échauffement collectif léger, quelques gestes techniques. Priorité récupération et sommeil.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement habituel d\u2019avant-match, routine habituelle.' }
  ],
  hypertrophie: [
    { d: 7, type: 'Séance allégée', detail: 'Volume divisé par 2 (moins de séries), charges habituelles.' },
    { d: 6, type: 'Repos', detail: 'Repos complet.' },
    { d: 5, type: 'Séance courte', detail: 'Quelques séries par groupe musculaire, effort modéré, pas de séries à l\u2019échec.' },
    { d: 4, type: 'Repos', detail: 'Repos complet.' },
    { d: 3, type: 'Activation légère', detail: 'Quelques répétitions légères, sensations, pas de fatigue.' },
    { d: 2, type: 'Repos', detail: 'Repos complet. Nutrition/hydratation à ajuster si physique-show (voir module Nutrition).' },
    { d: 1, type: 'Repos ou activation très légère', detail: 'Priorité sommeil et gestion du stress.' },
    { d: 0, type: 'Jour J', detail: 'Routine habituelle, pas de nouveauté.' }
  ],
  technique: [
    { d: 7, type: 'Séance normale allégée', detail: 'Un peu moins de répétitions que d\u2019habitude.' },
    { d: 6, type: 'Repos', detail: 'Repos complet.' },
    { d: 5, type: 'Séance courte et qualitative', detail: 'Peu de répétitions, focus qualité du geste.' },
    { d: 4, type: 'Repos', detail: 'Repos ou activité très légère.' },
    { d: 3, type: 'Activation courte', detail: 'Quelques répétitions techniques, routine habituelle.' },
    { d: 2, type: 'Repos', detail: 'Repos complet, préparation mentale.' },
    { d: 1, type: 'Repos ou activation très légère', detail: 'Préparation matérielle/logistique, sommeil prioritaire.' },
    { d: 0, type: 'Jour J', detail: 'Routine d\u2019échauffement habituelle, rien de nouveau.' }
  ],
  explosivite: [
    { d: 7, type: 'Séance charge moyenne-haute', detail: 'Volume réduit, quelques répétitions à charge proche du maximum.' },
    { d: 6, type: 'Repos', detail: 'Repos complet.' },
    { d: 5, type: 'Séance ouvreur technique', detail: 'Simulation courte du format de compétition (montée en charge sur 2-3 essais), sans aller au maximum.' },
    { d: 4, type: 'Repos', detail: 'Repos complet.' },
    { d: 3, type: 'Activation courte', detail: 'Quelques répétitions techniques à charge légère-moyenne, vitesse d\u2019exécution.' },
    { d: 2, type: 'Repos', detail: 'Repos complet, vérification du matériel/équipement.' },
    { d: 1, type: 'Activation très légère', detail: 'Mobilité, gestes techniques à vide ou charge très légère. Priorité sommeil.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement complet habituel, montée en charge progressive comme à l\u2019entraînement.' }
  ],
  combat: [
    { d: 7, type: 'Séance modérée', detail: 'Technique + physique, volume réduit par rapport au pic de la préparation.' },
    { d: 6, type: 'Repos ou récupération', detail: 'Repos ou activité très légère.' },
    { d: 5, type: 'Assaut/sparring léger', detail: 'Échanges courts, intensité sous-maximale, focus technique et timing.' },
    { d: 4, type: 'Repos', detail: 'Repos complet.' },
    { d: 3, type: 'Séance technique courte', detail: 'Répétitions techniques à faible intensité physique.' },
    { d: 2, type: 'Repos', detail: 'Repos complet. Attention à la gestion du poids si pesée officielle proche.' },
    { d: 1, type: 'Activation très légère', detail: 'Mobilité, gestes techniques à vide. Priorité sommeil, hydratation et poids de forme.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement habituel d\u2019avant-compétition, routine connue.' }
  ],
  agres: [
    { d: 7, type: 'Séance allégée', detail: 'Moins de passages complets, souplesse maintenue intégralement.' },
    { d: 6, type: 'Repos actif', detail: 'Souplesse + repos, pas de passage complet.' },
    { d: 5, type: 'Passage(s) complet(s)', detail: '1-2 passages du programme de compétition, à intensité proche du jour J.' },
    { d: 4, type: 'Repos actif', detail: 'Souplesse + mobilité, pas de charge technique lourde.' },
    { d: 3, type: 'Séance courte', detail: 'Éléments clés isolés, pas de passage complet.' },
    { d: 2, type: 'Repos actif', detail: 'Souplesse uniquement, repos physique.' },
    { d: 1, type: 'Activation légère', detail: 'Souplesse + quelques gestes techniques légers. Priorité sommeil.' },
    { d: 0, type: 'Jour J', detail: 'Échauffement et routine de souplesse habituels, rien de nouveau.' }
  ]
};

function buildFinalWeekPlan(goal) {
  var profile = goal.effortType || 'mixte';
  var template = FINAL_WEEK_TEMPLATE[profile] || FINAL_WEEK_TEMPLATE.mixte;
  return template.map(function(row) {
    var d = parseISO(goal.eventDate);
    d.setDate(d.getDate() - row.d);
    var iso = toISOFromDate(d);
    return { date: iso, daysBefore: row.d, type: row.type, detail: row.detail };
  });
}

function toISOFromDate(d) {
  var p = function(n){ return n < 10 ? '0'+n : ''+n; };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}

/* Plan semaine par semaine : réutilise computePeakPlan (aucune logique dupliquée),
   simplement rejoué pour chaque début de semaine à venir. Les semaines de même
   phase en Base/Développement sont regroupées ; l\u2019affûtage reste détaillé
   semaine par semaine car c\u2019est là que la précision compte le plus.
   Plafonné à 26 semaines affichées pour rester lisible sur un objectif lointain. */
function buildWeeklyOutline(goal) {
  var rows = [];
  var cur = null;
  var base = startOfDay(new Date());
  for (var i = 0; i < 26; i++) {
    var wd = new Date(base);
    wd.setDate(wd.getDate() + i * 7);
    var iso = toISOFromDate(wd);
    var p = computePeakPlan(goal, iso);
    if (p.daysRemaining < 0) break;
    if (p.phase === 'taper' || p.phase === 'today') {
      if (cur) { rows.push(cur); cur = null; }
      rows.push({ type: 'week', startISO: iso, phase: p.phase, targetVolumePct: p.targetVolumePct, daysRemaining: p.daysRemaining });
    } else {
      if (cur && cur.phase === p.phase) { cur.endISO = iso; cur.count++; }
      else { if (cur) rows.push(cur); cur = { type: 'group', phase: p.phase, startISO: iso, endISO: iso, count: 1 }; }
    }
    if (p.daysRemaining <= 0) break;
  }
  if (cur) rows.push(cur);
  return rows;
}
function todayISO() {
  var d = new Date();
  var p = function(n){ return n < 10 ? '0'+n : ''+n; };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function parseISO(s) {
  var parts = (s||'').split('-').map(Number);
  return new Date(parts[0]||1970, (parts[1]||1)-1, parts[2]||1);
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysBetween(fromISO, toISO) {
  var a = startOfDay(parseISO(fromISO));
  var b = startOfDay(parseISO(toISO));
  return Math.round((b - a) / 86400000);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function computePeakPlan(goal, todayStr) {
  todayStr = todayStr || todayISO();
  var profile = EFFORT_PROFILES[goal.effortType] || EFFORT_PROFILES.mixte;
  var daysRemaining = daysBetween(todayStr, goal.eventDate);

  var phase, taperProgress = null, targetVolumePct = null;
  if (daysRemaining < 0) {
    phase = 'past';
  } else if (daysRemaining === 0) {
    phase = 'today';
  } else if (daysRemaining <= profile.taperDays) {
    phase = 'taper';
    taperProgress = clamp(1 - (daysRemaining / profile.taperDays), 0, 1);
    var reductionCenter = (profile.reductionMin + profile.reductionMax) / 2;
    targetVolumePct = Math.round(100 - taperProgress * reductionCenter);
  } else if (daysRemaining <= profile.taperDays + profile.buildDays) {
    phase = 'build';
  } else {
    phase = 'base';
  }

  var taperStartISO = null;
  if (daysRemaining >= 0) {
    var d = parseISO(goal.eventDate);
    d.setDate(d.getDate() - profile.taperDays);
    var p = function(n){ return n < 10 ? '0'+n : ''+n; };
    taperStartISO = d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }

  return {
    daysRemaining: daysRemaining,
    weeksRemaining: Math.ceil(daysRemaining / 7),
    phase: phase,
    profile: profile,
    taperProgress: taperProgress,
    targetVolumePct: targetVolumePct,
    taperStartISO: taperStartISO
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   UI
   ═══════════════════════════════════════════════════════════════════════ */

var FLOW_STYLE = { position: 'fixed', inset: 0, background: C.bg, zIndex: 60, display: 'flex',
  flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, animation: 'spaceIn .22s ease' };
var SCROLL_STYLE = { flex: 1, overflowY: 'auto', padding: '20px 22px calc(22px + env(safe-area-inset-bottom))' };

function fmtDate(iso) {
  if (!iso) return '';
  var d = parseISO(iso);
  var MOIS = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear();
}
function countdownLabel(days) {
  if (days < 0) return 'Passé';
  if (days === 0) return 'Jour J';
  if (days === 1) return 'J-1';
  return 'J-' + days;
}

function PhaseBadge(phase) {
  return React.createElement('span', { style: {
    fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
    background: 'color-mix(in srgb, ' + PHASE_COLORS[phase] + ` 14%, ${C.surface})`,
    color: PHASE_COLORS[phase]
  } }, PHASE_LABELS[phase]);
}

/* Suggestion indicative de catégorie selon le sport choisi (l\u2019utilisateur
   garde toujours la main : dès qu\u2019il touche un bouton de catégorie, la
   suggestion automatique s\u2019arrête pour ce formulaire). */
var SPORT_EFFORT_HINT = {
  course: 'endurance', demi: 'endurance', fond: 'endurance', trail: 'endurance', marche: 'endurance',
  velo: 'endurance', vtt: 'endurance', natation: 'endurance', aviron: 'endurance', ski: 'endurance',
  triathlon: 'endurance', orientation: 'endurance', patinage: 'endurance', voile: 'endurance',
  sprint: 'puissance', saut: 'explosivite', lancers: 'explosivite', halterophilie: 'explosivite', trampoline: 'explosivite',
  muscu: 'force', crossfit: 'force', callisthenie: 'force',
  football: 'collectif', basket: 'collectif', rugby: 'collectif', frisbee: 'collectif',
  raquette: 'collectif', pingpong: 'collectif',
  combat: 'combat', escrime: 'combat',
  gym: 'agres', fitness: 'hypertrophie', danse: 'agres',
  golf: 'technique', tir: 'technique', petanque: 'technique',
  escalade: 'puissance', skate: 'puissance', surf: 'puissance',
  yoga: 'agres', equitation: 'technique', plongee: 'technique'
};

function GoalForm({ initial, onSave, onClose }) {
  var g = initial || { label: '', sport: '', eventDate: '', effortType: 'mixte', priority: 'majeur' };
  var lblS = useState(g.label); var label = lblS[0], setLabel = lblS[1];
  var sptS = useState(g.sport || ''); var sport = sptS[0], setSport = sptS[1];
  var dtS = useState(g.eventDate); var eventDate = dtS[0], setEventDate = dtS[1];
  var efS = useState(g.effortType); var effortType = efS[0], setEffortType = efS[1];
  var touchedS = useState(false); var effortTouched = touchedS[0], setEffortTouched = touchedS[1];
  var prS = useState(g.priority || 'majeur'); var priority = prS[0], setPriority = prS[1];

  var sports = SPORTS || [];
  var canSave = label.trim() && eventDate;

  function onEffortChange(id) { setEffortType(id); setEffortTouched(true); }
  function onSportChange(id) {
    setSport(id);
    if (!effortTouched && SPORT_EFFORT_HINT[id]) setEffortType(SPORT_EFFORT_HINT[id]);
  }

  function labeledSelect(label2, value, opts, onChange) {
    return React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, label2),
      React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        opts.map(function(o) {
          var active = value === o.id;
          return React.createElement('button', { key: o.id, onClick: function(){ onChange(o.id); }, style: {
            flex: '1 1 auto', minWidth: 90, padding: '12px 10px', borderRadius: `${C.radiusSm}`,
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            border: active ? '1.5px solid ' + PEAK_COLOR : `1.5px solid ${C.line}`,
            background: active ? 'color-mix(in srgb, ' + PEAK_COLOR + ` 8%, ${C.surface})` : `${C.surface}`,
            color: active ? PEAK_COLOR : `${C.ink}`
          } }, o.label);
        })
      )
    );
  }

  return React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 65,
    display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s ease' } },
    React.createElement('div', { style: { width: '100%', maxHeight: '92%', overflowY: 'auto', background: `${C.surface}`,
      borderRadius: '24px 24px 0 0', padding: '22px 22px calc(24px + env(safe-area-inset-bottom))', animation: 'sheetUp .3s ease' } },
      React.createElement('div', { style: { fontFamily: `${C.font}`, fontWeight: 700, fontSize: 19, marginBottom: 18 } },
        initial ? 'Modifier l\u2019objectif' : 'Nouvel objectif'),

      React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Objectif'),
        React.createElement('input', { value: label, onChange: function(e){ setLabel(e.target.value); }, maxLength: 60,
          placeholder: 'Ex : Marathon de Paris, remise en forme été...', autoFocus: true,
          style: { width: '100%', padding: '13px 15px', borderRadius: `${C.radiusSm}`, border: `1.5px solid ${C.line}`,
            background: `${C.bg}`, color: `${C.ink}`, fontSize: 15.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })
      ),

      React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Date de l\u2019objectif'),
        React.createElement('input', { type: 'date', value: eventDate, onChange: function(e){ setEventDate(e.target.value); },
          style: { width: '100%', padding: '13px 15px', borderRadius: `${C.radiusSm}`, border: `1.5px solid ${C.line}`,
            background: `${C.bg}`, color: `${C.ink}`, fontSize: 15.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } })
      ),

      sports.length ? React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Sport (optionnel)'),
        React.createElement('select', { value: sport, onChange: function(e){ onSportChange(e.target.value); },
          style: { width: '100%', padding: '13px 15px', borderRadius: `${C.radiusSm}`, border: `1.5px solid ${C.line}`,
            background: `${C.bg}`, color: `${C.ink}`, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' } },
          React.createElement('option', { value: '' }, 'Non précisé'),
          sports.map(function(sp) { return React.createElement('option', { key: sp.id, value: sp.id }, sp.label); })
        )
      ) : null,

      labeledSelect('Type d\u2019effort dominant', effortType, [
        { id: 'endurance', label: 'Endurance longue' },
        { id: 'collectif', label: 'Sport collectif' },
        { id: 'combat', label: 'Sport de combat' },
        { id: 'force', label: 'Force max.' },
        { id: 'puissance', label: 'Puissance / vitesse' },
        { id: 'explosivite', label: 'Explosivité' },
        { id: 'hypertrophie', label: 'Musculation' },
        { id: 'technique', label: 'Technique / précision' },
        { id: 'agres', label: 'Souplesse / Agrès' }
      ], onEffortChange),

      labeledSelect('Priorité', priority, [
        { id: 'majeur', label: 'Objectif majeur' },
        { id: 'secondaire', label: 'Objectif secondaire' }
      ], setPriority),

      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 6 } },
        React.createElement('button', { onClick: onClose, style: { flex: 1, padding: 15, borderRadius: 999, background: `${C.surface}`,
          border: `1px solid ${C.line}`, color: `${C.ink}`, fontSize: 15, fontWeight: 700, cursor: 'pointer' } }, 'Annuler'),
        React.createElement('button', { disabled: !canSave, onClick: function() {
          onSave({ label: label.trim(), sport: sport, eventDate: eventDate, effortType: effortType, priority: priority });
        }, style: { flex: 1, padding: 15, borderRadius: 999, background: PEAK_COLOR, border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.45 } }, 'Enregistrer')
      )
    )
  );
}

function PhaseTimeline(plan) {
  var order = ['base', 'build', 'taper'];
  return React.createElement('div', { style: { display: 'flex', gap: 4, margin: '18px 0 10px' } },
    order.map(function(ph) {
      var isCurrent = plan.phase === ph;
      var isPast = order.indexOf(plan.phase) > order.indexOf(ph) || plan.phase === 'today' || plan.phase === 'past';
      return React.createElement('div', { key: ph, style: { flex: 1 } },
        React.createElement('div', { style: { height: 6, borderRadius: 999,
          background: isCurrent ? PHASE_COLORS[ph] : isPast ? 'color-mix(in srgb, ' + PHASE_COLORS[ph] + ` 40%, ${C.surface2})` : `${C.surface2}` } }),
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: isCurrent ? PHASE_COLORS[ph] : `${C.ink3}`, marginTop: 5, textAlign: 'center' } },
          PHASE_LABELS[ph])
      );
    })
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   INTÉGRATIONS CROISÉES — lecture des données des autres modules du store
   (aucune duplication de logique : simple lecture de db.mobility,
   db.sleepLog, db.physTests, db.cycle déjà maintenus par leurs écrans
   respectifs) + écriture ciblée vers db.goals.weeklySessions.
   ═══════════════════════════════════════════════════════════════════════ */

function QuickLinksRow(plan, h) {
  var items = [];
  if (h.onNutrition) items.push({ id: 'nutrition', label: 'Nutrition', icon: 'apple', on: h.onNutrition });
  if (h.onRecovery) items.push({ id: 'recovery', label: 'Récupération', icon: 'leaf', on: h.onRecovery });
  if (h.onMobility) items.push({ id: 'mobility', label: 'Mobilité', icon: 'target', on: h.onMobility });
  if (h.onTests) items.push({ id: 'tests', label: 'Tests physiques', icon: 'chart', on: h.onTests });
  if (h.onProgram) items.push({ id: 'program', label: 'Programme', icon: 'route', on: h.onProgram });
  if (h.cycleEnabled && h.onCycle) items.push({ id: 'cycle', label: 'Cycle', icon: 'moon', on: h.onCycle });
  if (!items.length) return null;
  return React.createElement('div', { style: { marginBottom: 18 } },
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 } }, 'Liens rapides'),
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      items.map(function(it) {
        return React.createElement('button', { key: it.id, onClick: it.on, style: {
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 999,
          background: `${C.surface}`, border: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 700, color: `${C.ink}`, cursor: 'pointer'
        } }, React.createElement(Icon, { name: it.icon, size: 14, color: `${C.primary}` }), it.label);
      })
    )
  );
}

function avgSleep7(sleepLog) {
  if (!sleepLog) return null;
  var dates = Object.keys(sleepLog).sort().slice(-7);
  if (!dates.length) return null;
  var sum = 0, n = 0;
  dates.forEach(function(d) { var e = sleepLog[d]; if (e && typeof e.hours === 'number') { sum += e.hours; n++; } });
  if (!n) return null;
  return Math.round(sum / n * 10) / 10;
}

function SignalsBlock(db, plan) {
  if (!db) return null;
  var rows = [];
  if (db.mobility) rows.push({ label: 'Mobilité', value: db.mobility.score + '/100', sub: 'test du ' + fmtDate(db.mobility.date) });
  var sleepAvg = avgSleep7(db.sleepLog);
  if (sleepAvg !== null) rows.push({ label: 'Sommeil', value: sleepAvg + ' h', sub: 'moyenne des 7 derniers jours enregistrés' });
  var tests = db.physTests || [];
  if (tests.length) {
    var lastDate = tests.map(function(t){ return t.date; }).sort().slice(-1)[0];
    rows.push({ label: 'Tests physiques', value: tests.length, sub: 'dernier test le ' + fmtDate(lastDate) });
  }
  var cycleEnabled = false; // intégration cycle non portée (cycleInfo n'est pas partagé hors du module Cycle)
  if (!rows.length) return null;
  return React.createElement('div', { style: { marginBottom: 18 } },
    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 } }, 'Signaux actuels'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      rows.map(function(r, i) {
        return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px',
          borderRadius: `${C.radiusXs}`, background: `${C.surface}`, border: `1px solid ${C.line}` } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink}` } }, r.label),
            React.createElement('div', { style: { fontSize: 11, color: `${C.ink3}`, marginTop: 1 } }, r.sub)
          ),
          React.createElement('div', { className: 'num-display', style: { fontSize: 15, fontWeight: 800, color: `${C.primary}` } }, r.value)
        );
      })
    ),
    cycleEnabled && React.createElement('p', { style: { fontSize: 11, color: `${C.ink3}`, marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' } },
      'Le lien entre phase du cycle menstruel et performance est un sujet de recherche actif aux résultats encore mixtes — à considérer comme repère personnel, pas comme règle générale.')
  );
}

var FLAG_COLOR = { alert: '#c4503a', warn: '#c4a03a', info: PEAK_COLOR };

// Analyse concrète, pas juste un compte à rebours : croise le plan
// d'affûtage avec la charge réelle (ACWR), le respect effectif de la
// réduction de volume, la mobilité et le sommeil pour un vrai score de
// préparation à l'objectif.
function ReadinessCard(db, plan) {
  if (!db || plan.phase === 'past' || plan.phase === 'today') return null;
  var r = peakReadiness(db, plan);
  var scoreColor = r.score >= 75 ? '#4a8a6a' : r.score >= 50 ? '#c4a03a' : '#c4503a';
  return React.createElement('div', { style: { padding: 18, borderRadius: `${C.radiusSm}`, background: `${C.surface}`, border: `1px solid ${C.line}`, marginBottom: 18 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r.flags.length ? 12 : 0 } },
      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: `${C.ink}` } }, 'Prêt pour le jour J ?'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 3 } },
        React.createElement('span', { className: 'num-display', style: { fontSize: 21, fontWeight: 800, color: scoreColor } }, r.score),
        React.createElement('span', { style: { fontSize: 12, color: `${C.ink3}` } }, '/100'))),
    r.flags.length === 0 && React.createElement('p', { style: { fontSize: 12.5, color: `${C.ink2}`, lineHeight: 1.45 } }, 'Rien à signaler pour l’instant sur charge, affûtage, mobilité ou sommeil — continue comme ça.'),
    r.flags.map(function(f, i) {
      return React.createElement('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i ? 8 : 0 } },
        React.createElement('div', { style: { width: 6, height: 6, borderRadius: 999, background: FLAG_COLOR[f.level] || PEAK_COLOR, flex: '0 0 auto', marginTop: 5 } }),
        React.createElement('p', { style: { fontSize: 12.5, color: `${C.ink2}`, lineHeight: 1.45, margin: 0 } }, f.text));
    }));
}

/* Cible indicative de séances/semaine par catégorie × phase, utilisée
   uniquement pour proposer une synchronisation en un tap avec l\u2019objectif
   hebdomadaire global de l\u2019app (db.goals.weeklySessions). */
var SESSIONS_NUM = {
  endurance: { base: 4, build: 5, taper: 4 },
  force: { base: 3, build: 3, taper: 3 },
  puissance: { base: 3, build: 4, taper: 3 },
  collectif: { base: 4, build: 5, taper: 4 },
  hypertrophie: { base: 4, build: 5, taper: 4 },
  technique: { base: 3, build: 4, taper: 2 },
  explosivite: { base: 4, build: 4, taper: 3 },
  combat: { base: 5, build: 6, taper: 4 },
  agres: { base: 5, build: 5, taper: 4 },
  mixte: { base: 4, build: 4, taper: 3 }
};

function WeeklySyncRow(goal, plan, db, store) {
  if (!store || !db || plan.phase === 'past' || plan.phase === 'today') return null;
  var group = SESSIONS_NUM[goal.effortType] || SESSIONS_NUM.mixte;
  var target = group[plan.phase];
  if (!target) return null;
  var current = (db.goals && db.goals.weeklySessions) || null;
  if (current === target) return null;
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '12px 14px', borderRadius: `${C.radiusSm}`, background: `${C.surface}`, border: `1px dashed ${C.line}`, marginBottom: 18 } },
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: `${C.ink}` } }, 'Objectif hebdo actuel : ' + (current || '\u2014') + ' séances/semaine'),
      React.createElement('div', { style: { fontSize: 11.5, color: `${C.ink3}`, marginTop: 2 } }, 'Recommandé pour cette phase : ' + target + ' séances/semaine')
    ),
    React.createElement('button', { onClick: function(){ store.setGoal('weeklySessions', target); }, style: {
      flex: '0 0 auto', padding: '9px 14px', borderRadius: 999, background: PEAK_COLOR, color: '#fff',
      fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer'
    } }, 'Appliquer')
  );
}

function GoalDetail({ goal, db, store, onEdit, onDelete, onBack, onNutrition, onRecovery, onMobility, onTests, onProgram, onCycle }) {
  var plan = computePeakPlan(goal);
  var sportLabel = (SPORTS || []).find(function(sp){ return sp.id === goal.sport; });

  return React.createElement('div', { style: FLOW_STYLE },
    React.createElement('div', { style: SCROLL_STYLE },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
        React.createElement('button', { onClick: onBack, style: { width: 40, height: 40, borderRadius: 999, cursor: 'pointer',
          background: `${C.surface}`, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement(Icon, { name: 'back', size: 18 })
        ),
        React.createElement('div', { style: { fontFamily: `${C.font}`, fontWeight: 700, fontSize: 14 } }, 'Objectif'),
        React.createElement('button', { onClick: onEdit, style: { padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
          background: `${C.surface}`, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 700, color: `${C.primary}` } },
          'Modifier'
        )
      ),

      React.createElement('div', { style: { padding: 20, borderRadius: `${C.radius}`, background: PEAK_COLOR, color: '#fff', marginBottom: 18 } },
        React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 } },
          sportLabel ? sportLabel.label : 'Objectif', goal.priority === 'secondaire' ? ' \u00B7 secondaire' : ''),
        React.createElement('div', { style: { fontFamily: `${C.font}`, fontWeight: 700, fontSize: 21, lineHeight: 1.2 } }, goal.label),
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 } },
          React.createElement('span', { className: 'num-display', style: { fontSize: 30, fontWeight: 700 } }, countdownLabel(plan.daysRemaining)),
          React.createElement('span', { style: { fontSize: 13.5, opacity: .9 } }, fmtDate(goal.eventDate))
        )
      ),

      QuickLinksRow(plan, { onNutrition: onNutrition, onRecovery: onRecovery, onMobility: onMobility, onTests: onTests, onProgram: onProgram, onCycle: onCycle, cycleEnabled: !!(db && db.cycle && db.cycle.enabled) }),

      ReadinessCard(db, plan),

      SignalsBlock(db, plan),

      WeeklySyncRow(goal, plan, db, store),

      plan.phase === 'past' ? React.createElement('div', { style: { padding: 16, borderRadius: `${C.radiusSm}`, background: `${C.surface}`, border: `1px solid ${C.line}`, color: `${C.ink2}`, fontSize: 14, marginBottom: 16 } },
        'Cet objectif est passé. Tu peux modifier la date ou le supprimer.')
      : plan.phase === 'today' ? React.createElement('div', { style: { padding: 16, borderRadius: `${C.radiusSm}`, background: 'color-mix(in srgb, ' + PHASE_COLORS.today + ` 10%, ${C.surface})`, border: '1px solid color-mix(in srgb, ' + PHASE_COLORS.today + ` 30%, ${C.line})`, color: `${C.ink}`, fontSize: 14, lineHeight: 1.5, marginBottom: 16 } },
        'C\u2019est le jour J. Garde ton échauffement habituel, hydrate-toi normalement et fais confiance au travail effectué.')
      : React.createElement(React.Fragment, null,
          PhaseTimeline(plan),
          React.createElement('div', { style: { padding: 18, borderRadius: `${C.radiusSm}`, background: `${C.surface}`, border: `1px solid ${C.line}`, marginTop: 12, marginBottom: 14 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
              PhaseBadge(plan.phase),
              plan.targetVolumePct !== null ? React.createElement('span', { style: { fontSize: 12.5, color: `${C.ink3}`, fontWeight: 600 } },
                '\u2248 ' + plan.targetVolumePct + ' % du volume habituel aujourd\u2019hui') : null
            ),
            PhaseDetailRows(plan.phase),
            PhasePrescriptionBlock(goal.effortType, plan.phase),
            plan.phase === 'taper' && React.createElement('div', { style: { marginTop: 12, padding: '12px 14px', borderRadius: `${C.radiusXs}`, background: 'color-mix(in srgb, ' + PHASE_COLORS.taper + ` 8%, ${C.surface})` } },
              React.createElement('p', { style: { fontSize: 13, color: `${C.ink}`, lineHeight: 1.5, fontWeight: 600 } }, plan.profile.note))
          ),

          plan.daysRemaining <= 10 && React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 } }, 'Modèle indicatif \u2014 derniers jours'),
            React.createElement('p', { style: { fontSize: 12, color: `${C.ink3}`, lineHeight: 1.5, marginBottom: 10 } },
              'Gabarit pratique à ajuster selon tes sensations (pas issu d\u2019une méta-analyse jour par jour) — il traduit les principes validés : volume en forte baisse, intensité maintenue via des efforts courts, repos rapproché du jour J.'),
            FinalWeekList(goal, plan)
          ),

          React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 } }, 'Plan semaine par semaine'),
            WeeklyOutlineList(goal)
          )
        ),

      React.createElement('div', { style: { padding: '14px 16px', borderRadius: `${C.radiusSm}`, background: `${C.surface2}`, fontSize: 12.5, color: `${C.ink3}`, lineHeight: 1.6, marginBottom: 18 } },
        React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Niveau de preuve \u00B7 '),
          'catégorie \u00AB ' + plan.profile.label + ' \u00BB \u2014 ' + (PREUVE_LABELS[plan.profile.preuve] || plan.profile.preuve) + '.'
        ),
        React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Affûtage \u00B7 '),
          AFFUTAGE_CITATIONS[goal.effortType] || AFFUTAGE_CITATIONS.mixte
        ),
        goal.effortType === 'force' && React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Prescription force \u00B7 '),
          'ACSM 2026 (Currier et al., synthèse de 137 revues, >30 000 participants, Medicine & Science in Sports & Exercise) : force \u2265 80 % 1RM, amplitude complète, 2-3 séries, exercices clés en premier, \u2265 2 séances/semaine.'
        ),
        goal.effortType === 'hypertrophie' && React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Prescription hypertrophie \u00B7 '),
          'ACSM 2026 : \u2265 10 séries/groupe musculaire/semaine, charge large (30-100 % 1RM) si l\u2019effort est suffisant (\u22482-3 répétitions en réserve — pas besoin d\u2019aller à l\u2019échec), emphase excentrique favorable.'
        ),
        goal.effortType === 'endurance' && React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Répartition d\u2019intensité \u00B7 '),
          'le modèle polarisé (\u2248 80 % du volume en endurance facile, \u2248 20 % en haute intensité, peu à l\u2019allure seuil) montre un léger avantage par rapport au modèle au seuil dans la méta-analyse de Rosenblat et al. 2019 — niveau de preuve modéré, effet de petite taille.'
        ),
        (goal.effortType === 'collectif' || goal.effortType === 'technique' || goal.effortType === 'agres' || goal.effortType === 'explosivite') && React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Attention \u00B7 '),
          'contrairement à l\u2019endurance ou à la force, je n\u2019ai pas trouvé de méta-analyse dédiée à l\u2019affûtage pour cette catégorie. Les chiffres proposés sont des repères prudents extrapolés des principes généraux (baisser le volume, garder l\u2019intensité), pas une prescription validée par des essais contrôlés.'
        ),
        React.createElement('div', { style: { marginBottom: 8 } },
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Structure Base \u2192 Développement \u2192 Affûtage \u00B7 '),
          'cadre pratique cohérent avec la littérature sur l\u2019affûtage. La position ACSM 2026 (Currier et al.) nuance l\u2019intérêt d\u2019une périodisation complexe pour une population générale (la simple progression continue de charge suffit souvent), mais confirme que la périodisation garde un intérêt réel pour un athlète qui vise un pic de forme pour une compétition précise — exactement le cas d\u2019usage de cet écran.'
        ),
        React.createElement('div', null,
          React.createElement('strong', { style: { color: `${C.ink2}` } }, 'Limite \u00B7 '),
          'ces seuils viennent d\u2019études sur sportifs entraînés ; assouplis-les si tu es débutant ou si tu t\u2019entraînes pour le plaisir plus que la performance. Le modèle jour par jour ci-dessus est indicatif, pas une prescription individualisée.'
        )
      ),

      React.createElement('button', { onClick: onDelete, style: { width: '100%', padding: 14, borderRadius: 999, background: 'transparent',
        border: `1px solid ${C.line}`, color: '#b3402e', fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Supprimer cet objectif')
    )
  );
}

function DetailRow(label, value) {
  return React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 9, alignItems: 'flex-start' } },
    React.createElement('div', { style: { flex: '0 0 96px', fontSize: 11.5, fontWeight: 700, color: `${C.ink3}`, textTransform: 'uppercase', letterSpacing: '.03em', paddingTop: 1 } }, label),
    React.createElement('div', { style: { flex: 1, fontSize: 13.5, color: `${C.ink2}`, lineHeight: 1.5 } }, value)
  );
}

function PhaseDetailRows(phase) {
  var d = PHASE_DETAILS[phase];
  if (!d) return null;
  return React.createElement('div', null,
    DetailRow('Objectif', d.objectif),
    DetailRow('Volume', d.volume),
    DetailRow('Intensité', d.intensite),
    DetailRow('Récup.', d.recuperation),
    DetailRow('Attention', d.attention)
  );
}

function PhasePrescriptionBlock(effortType, phase) {
  var group = PHASE_PRESCRIPTIONS[effortType] || PHASE_PRESCRIPTIONS.mixte;
  var pres = group[phase];
  if (!pres) return null;
  return React.createElement('div', { style: { marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.line}` } },
    DetailRow('Fréquence', pres.sessions),
    DetailRow('Répartition', pres.repartition),
    DetailRow('Clé', pres.cle)
  );
}

function FinalWeekList(goal, plan) {
  var rows = buildFinalWeekPlan(goal);
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    rows.map(function(r, i) {
      var isToday = plan.phase !== 'past' && r.daysBefore === plan.daysRemaining;
      return React.createElement('div', { key: i, style: { display: 'flex', gap: 12, padding: '11px 13px',
        borderRadius: `${C.radiusXs}`, background: isToday ? 'color-mix(in srgb, ' + PEAK_COLOR + ` 10%, ${C.surface})` : `${C.surface}`,
        border: isToday ? '1.5px solid ' + PEAK_COLOR : `1px solid ${C.line}` } },
        React.createElement('div', { style: { flex: '0 0 46px', textAlign: 'center' } },
          React.createElement('div', { className: 'num-display', style: { fontSize: 13, fontWeight: 800, color: isToday ? PEAK_COLOR : `${C.ink3}` } },
            r.daysBefore === 0 ? 'J' : 'J-' + r.daysBefore)
        ),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: `${C.ink}` } }, r.type, isToday ? '  \u00B7 aujourd\u2019hui' : ''),
          React.createElement('div', { style: { fontSize: 11.5, color: `${C.ink3}`, marginTop: 2, lineHeight: 1.4 } }, r.detail)
        )
      );
    })
  );
}

function WeeklyOutlineList(goal) {
  var rows = buildWeeklyOutline(goal);
  if (!rows.length) return null;
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    rows.map(function(r, i) {
      var isGroup = r.type === 'group';
      var label = isGroup
        ? (r.count > 1 ? fmtDate(r.startISO) + ' \u2192 ' + fmtDate(r.endISO) + '  (' + r.count + ' semaines)' : fmtDate(r.startISO))
        : 'Semaine du ' + fmtDate(r.startISO) + (r.phase === 'today' ? '' : '  \u00B7  ' + countdownLabel(r.daysRemaining));
      var sub = isGroup
        ? (r.phase === 'base' ? 'Volume progressif \u00B7 intensité modérée' : 'Volume élevé \u00B7 intensité croissante')
        : (r.targetVolumePct !== null ? '\u2248 ' + r.targetVolumePct + ' % du volume habituel en fin de semaine' : 'Dernière ligne droite');
      return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
        borderRadius: `${C.radiusXs}`, background: `${C.surface}`, border: `1px solid ${C.line}` } },
        React.createElement('div', { style: { width: 8, height: 8, borderRadius: 999, flex: '0 0 auto', background: PHASE_COLORS[r.phase] } }),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: `${C.ink}` } }, label),
          React.createElement('div', { style: { fontSize: 11.5, color: `${C.ink3}`, marginTop: 1 } }, sub)
        ),
        PhaseBadge(r.phase)
      );
    })
  );
}

function GoalCard({ goal, onOpen }) {
  var plan = computePeakPlan(goal);
  var sportLabel = (SPORTS || []).find(function(sp){ return sp.id === goal.sport; });
  return React.createElement('button', { onClick: onOpen, style: { display: 'flex', alignItems: 'center', gap: 13, width: '100%',
    textAlign: 'left', padding: 15, borderRadius: `${C.radiusSm}`, background: `${C.surface}`,
    border: `1px solid ${C.line}`, marginBottom: 10, cursor: 'pointer' } },
    React.createElement('div', { style: { width: 50, height: 50, borderRadius: 14, flex: '0 0 auto',
      background: 'color-mix(in srgb, ' + PHASE_COLORS[plan.phase] + ` 14%, ${C.surface})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
      React.createElement('div', { className: 'num-display', style: { fontSize: 13, fontWeight: 800, color: PHASE_COLORS[plan.phase] } },
        countdownLabel(plan.daysRemaining))
    ),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, goal.label),
      React.createElement('div', { style: { fontSize: 12, color: `${C.ink3}`, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 } },
        fmtDate(goal.eventDate), sportLabel ? ' \u00B7 ' + sportLabel.label : '')
    ),
    PhaseBadge(plan.phase),
    React.createElement(Icon, { name: 'arrow', size: 17, color: `${C.ink3}` })
  );
}

function PeakSpace({ db, store, onClose, onNutrition, onRecovery, onMobility, onTests, onProgram, onCycle }) {
  var goals = db.peakGoals || [];
  var selS = useState(null); var selId = selS[0], setSelId = selS[1];
  var formS = useState(null); var formMode = formS[0], setFormMode = formS[1]; // null | 'new' | goal object (edit)

  var sorted = goals.slice().sort(function(a, b) { return (a.eventDate || '').localeCompare(b.eventDate || ''); });
  var selGoal = selId ? goals.find(function(g){ return g.id === selId; }) : null;

  function saveGoal(vals) {
    if (formMode && formMode !== 'new' && formMode.id) {
      store.updatePeakGoal(formMode.id, vals);
    } else {
      store.addPeakGoal(vals);
    }
    setFormMode(null);
  }
  function deleteGoal(id) {
    store.removePeakGoal(id);
    setSelId(null);
  }

  if (selGoal) {
    return React.createElement(React.Fragment, null,
      React.createElement(GoalDetail, {
        goal: selGoal, db: db, store: store,
        onBack: function(){ setSelId(null); },
        onEdit: function(){ setFormMode(selGoal); },
        onDelete: function(){ deleteGoal(selGoal.id); },
        onNutrition: onNutrition, onRecovery: onRecovery, onMobility: onMobility,
        onTests: onTests, onProgram: onProgram, onCycle: onCycle
      }),
      formMode && React.createElement(GoalForm, { initial: formMode === 'new' ? null : formMode, onSave: saveGoal, onClose: function(){ setFormMode(null); } })
    );
  }

  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: FLOW_STYLE },
      React.createElement('div', { style: SCROLL_STYLE },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
          React.createElement('div', { style: { fontFamily: `${C.font}`, fontWeight: 700, fontSize: 22, letterSpacing: '-.01em' } }, 'Pic de forme'),
          React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 40, height: 40, borderRadius: 999, cursor: 'pointer',
            background: `${C.surface}`, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: C.shadowSm } },
            React.createElement(Icon, { name: 'close', size: 18 })
          )
        ),
        React.createElement('p', { style: { fontSize: 13.5, color: `${C.ink3}`, lineHeight: 1.5, marginBottom: 18 } },
          'Programme un objectif dat\u00e9 (comp\u00e9tition, remise en forme...) : l\u2019app calcule automatiquement ta phase actuelle et te guide jusqu\u2019au jour J.'),

        sorted.length === 0 ? React.createElement('div', { style: { textAlign: 'center', padding: '40px 10px' } },
          React.createElement('div', { style: { width: 72, height: 72, borderRadius: 999, background: 'color-mix(in srgb, ' + PEAK_COLOR + ` 14%, ${C.surface})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' } },
            React.createElement(Icon, { name: 'target', size: 32, color: PEAK_COLOR })
          ),
          React.createElement('div', { style: { fontFamily: `${C.font}`, fontWeight: 700, fontSize: 17, marginBottom: 8 } }, 'Aucun objectif programmé'),
          React.createElement('p', { style: { fontSize: 13.5, color: `${C.ink3}`, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' } },
            'Ajoute une date cible pour obtenir un plan d\u2019affûtage basé sur les données scientifiques.')
        ) : sorted.map(function(g) { return React.createElement(GoalCard, { key: g.id, goal: g, onOpen: function(){ setSelId(g.id); } }); }),

        React.createElement('button', { onClick: function(){ setFormMode('new'); }, style: { display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, width: '100%', padding: 15, borderRadius: 999, marginTop: 6,
          background: PEAK_COLOR, color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' } },
          React.createElement('span', { style: { fontSize: 18, fontWeight: 700, lineHeight: 1 } }, '+'), 'Ajouter un objectif')
      )
    ),
    formMode && React.createElement(GoalForm, { initial: formMode === 'new' ? null : formMode, onSave: saveGoal, onClose: function(){ setFormMode(null); } })
  );
}

export default PeakSpace
