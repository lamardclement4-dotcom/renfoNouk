// ============================================================
// Catalogue des boissons, avec leurs macros.
//
// Deux catalogues coexistaient : celui de l'hydratation, qui ne retenait
// que le volume, la caféine et le sucre, et un `BOISSONS` de vingt-cinq
// entrées que plus personne n'importait. Aucun des deux ne portait de
// calories : une bière, un latte ou un smoothie comptaient donc pour zéro
// dans les macros du jour. C'est beaucoup pour qui suit ses apports — une
// pinte pèse autant qu'une part de gâteau.
//
// Celui-ci les remplace tous les deux et porte l'apport complet.
//
// Pour l'alcool, les valeurs ne sont pas recopiées mais calculées : masse
// d'éthanol = volume × degré × densité, puis sept kilocalories par gramme,
// auxquelles s'ajoutent les glucides résiduels. Une bière à 5° dans un
// demi et la même en pinte restent ainsi cohérentes entre elles.
// ============================================================

export const ALCOHOL_KCAL_PER_G = 7
export const ETHANOL_DENSITY = 0.789
export const CARB_KCAL_PER_G = 4
export const PROT_KCAL_PER_G = 4
export const FAT_KCAL_PER_G = 9

export function alcoholGrams(ml, abvPct) {
  const v = Number(ml)
  const a = Number(abvPct)
  if (!Number.isFinite(v) || !Number.isFinite(a) || v <= 0 || a <= 0) return 0
  return Math.round(v * (a / 100) * ETHANOL_DENSITY * 10) / 10
}

// Le facteur d'hydratation dit ce qu'un verre apporte réellement en eau.
// L'alcool est diurétique : au-delà d'un certain degré, un verre retire
// plus d'eau qu'il n'en donne, d'où un facteur qui peut passer sous zéro.
export function hydrationFactor(abvPct) {
  const a = Number(abvPct) || 0
  if (a <= 0) return 1
  if (a < 6) return 0.7
  if (a < 15) return 0.4
  if (a < 25) return 0
  return -0.5
}

// Boisson alcoolisée : tout se déduit du volume, du degré et des glucides.
function booze(n, ml, abv, carb, sugar) {
  const alc = alcoholGrams(ml, abv)
  const c = carb || 0
  return {
    n, ml, abv, alc,
    kcal: Math.round(alc * ALCOHOL_KCAL_PER_G + c * CARB_KCAL_PER_G),
    prot: 0, carb: c, fat: 0,
    sugar: sugar == null ? c : sugar,
    caf: 0, hyd: hydrationFactor(abv),
  }
}

// Boisson sans alcool : [nom, ml, kcal, prot, glucides, lipides, sucre, caféine, hydratation]
function soft(n, ml, kcal, prot, carb, fat, sugar, caf, hyd) {
  return { n, ml, abv: 0, alc: 0, kcal, prot, carb, fat, sugar, caf, hyd: hyd == null ? 1 : hyd }
}

export const DRINK_CATEGORIES = [
  {
    id: 'eaux', label: 'Eaux', icon: 'drop', items: [
      soft('Eau plate', 250, 0, 0, 0, 0, 0, 0),
      soft('Grand verre d’eau', 500, 0, 0, 0, 0, 0, 0),
      soft('Bouteille d’eau', 1000, 0, 0, 0, 0, 0, 0),
      soft('Eau gazeuse', 250, 0, 0, 0, 0, 0, 0),
      soft('Eau minérale', 500, 0, 0, 0, 0, 0, 0),
      soft('Eau aromatisée', 330, 15, 0, 4, 0, 4, 0),
      soft('Eau de coco', 330, 62, 0.7, 15, 0, 9, 0),
      soft('Eau tonique', 250, 85, 0, 21, 0, 21, 0),
      soft('Eau pétillante aromatisée zéro', 330, 2, 0, 0, 0, 0, 0),
      soft('Eau citronnée', 250, 8, 0, 2, 0, 1, 0),
    ],
  },
  {
    id: 'cafes', label: 'Cafés', icon: 'cup', items: [
      soft('Expresso', 30, 2, 0.1, 0, 0, 0, 75, 1),
      soft('Double expresso', 60, 4, 0.2, 0, 0, 0, 150, 1),
      soft('Ristretto', 20, 1, 0.1, 0, 0, 0, 65, 1),
      soft('Lungo', 90, 3, 0.1, 0, 0, 0, 85, 1),
      soft('Café filtre', 200, 4, 0.3, 0, 0, 0, 95, 1),
      soft('Café allongé / americano', 200, 3, 0.2, 0, 0, 0, 65, 1),
      soft('Café décaféiné', 200, 3, 0.2, 0, 0, 0, 3, 1),
      soft('Café soluble', 200, 4, 0.2, 0, 0, 0, 60, 1),
      soft('Café turc', 80, 10, 0.2, 2, 0, 2, 100, 1),
      soft('Cold brew', 300, 5, 0.3, 0, 0, 0, 200, 1),
      soft('Noisette', 40, 12, 0.7, 1, 0.6, 1, 75, 1),
      soft('Café crème', 150, 60, 3, 4.5, 3.2, 4.5, 75, 1),
      soft('Cappuccino', 180, 90, 5, 8, 4.5, 8, 75, 1),
      soft('Latte / café au lait', 250, 130, 7, 12, 6, 12, 75, 1),
      soft('Flat white', 200, 110, 6.5, 9, 5.5, 9, 130, 1),
      soft('Macchiato', 60, 20, 1.2, 1.6, 1, 1.6, 75, 1),
      soft('Mocha', 300, 220, 8, 30, 8, 28, 90, 1),
      soft('Latte au lait d’avoine', 250, 120, 3, 18, 3.5, 10, 75, 1),
      soft('Latte au lait d’amande', 250, 80, 2, 9, 3, 7, 75, 1),
      soft('Frappuccino', 350, 280, 5, 48, 8, 45, 95, 1),
      soft('Café frappé', 300, 130, 4, 20, 4, 19, 90, 1),
      soft('Café glacé non sucré', 300, 6, 0.3, 0, 0, 0, 95, 1),
      soft('Irish coffee (sans alcool)', 200, 150, 2, 18, 7, 17, 75, 1),
      soft('Café + 1 sucre', 200, 24, 0.3, 5, 0, 5, 95, 1),
      soft('Chicorée', 200, 10, 0.3, 2, 0, 1, 0, 1),
    ],
  },
  {
    id: 'thes', label: 'Thés & infusions', icon: 'leaf', items: [
      soft('Thé vert', 200, 2, 0, 0, 0, 0, 25),
      soft('Thé noir', 200, 2, 0, 0, 0, 0, 45),
      soft('Thé blanc', 200, 2, 0, 0, 0, 0, 15),
      soft('Thé oolong', 200, 2, 0, 0, 0, 0, 38),
      soft('Thé matcha', 200, 6, 0.5, 1, 0, 0, 60),
      soft('Matcha latte', 250, 120, 6, 16, 4, 14, 60),
      soft('Chai latte', 250, 160, 6, 25, 4, 22, 40),
      soft('Thé glacé', 330, 90, 0, 23, 0, 23, 25),
      soft('Thé glacé sans sucre', 330, 3, 0, 0, 0, 0, 25),
      soft('Yerba maté', 200, 3, 0, 0, 0, 0, 65),
      soft('Rooibos', 200, 2, 0, 0, 0, 0, 0),
      soft('Infusion verveine / camomille', 200, 2, 0, 0, 0, 0, 0),
      soft('Infusion menthe', 200, 2, 0, 0, 0, 0, 0),
      soft('Infusion gingembre-citron', 200, 12, 0, 3, 0, 2, 0),
      soft('Thé à la menthe sucré', 200, 55, 0, 14, 0, 14, 30),
      soft('Kombucha', 250, 60, 0, 14, 0, 12, 15),
      soft('Thé au lait (bubble tea)', 400, 300, 4, 60, 5, 50, 40),
      soft('Chocolat chaud', 250, 190, 8, 27, 6, 24, 5),
      soft('Chocolat chaud allégé', 250, 90, 7, 12, 1.5, 11, 5),
      soft('Lait doré (curcuma)', 250, 130, 7, 14, 5, 12, 0),
    ],
  },
  {
    id: 'jus', label: 'Jus & smoothies', icon: 'glass', items: [
      soft('Jus d’orange pressé', 250, 112, 1.7, 26, 0.2, 21, 0),
      soft('Jus d’orange (brique)', 250, 110, 1.5, 25, 0.2, 23, 0),
      soft('Jus de pomme', 250, 115, 0.2, 28, 0.3, 25, 0),
      soft('Jus de raisin', 250, 152, 0.7, 37, 0.3, 36, 0),
      soft('Jus d’ananas', 250, 132, 0.9, 32, 0.3, 25, 0),
      soft('Jus de pamplemousse', 250, 96, 1.2, 22, 0.2, 20, 0),
      soft('Jus de tomate', 250, 42, 1.9, 9, 0.2, 7, 0),
      soft('Jus de carotte', 250, 95, 2.2, 22, 0.4, 9, 0),
      soft('Jus multifruits', 250, 120, 0.7, 28, 0.2, 26, 0),
      soft('Jus de cranberry', 250, 116, 0.3, 30, 0.1, 29, 0),
      soft('Jus de citron (pur)', 30, 6, 0.1, 2, 0, 0.7, 0),
      soft('Jus de betterave', 250, 100, 2.5, 22, 0.2, 18, 0),
      soft('Jus de grenade', 250, 134, 0.4, 33, 0.7, 31, 0),
      soft('Jus de mangue', 250, 130, 0.5, 32, 0.3, 30, 0),
      soft('Nectar de pêche', 250, 135, 0.5, 33, 0.1, 31, 0),
      soft('Nectar d’abricot', 250, 140, 0.7, 34, 0.2, 32, 0),
      soft('Limonade maison', 250, 100, 0.1, 26, 0, 25, 0),
      soft('Citronnade sans sucre', 250, 10, 0.1, 2, 0, 1, 0),
      soft('Smoothie fruits rouges', 250, 140, 2, 30, 0.8, 24, 0),
      soft('Smoothie banane-lait', 300, 230, 8, 40, 4, 32, 0),
      soft('Smoothie vert (épinard-pomme)', 300, 150, 3, 30, 1, 22, 0),
      soft('Smoothie mangue-passion', 250, 160, 1.5, 37, 0.5, 33, 0),
      soft('Smoothie protéiné', 350, 300, 25, 35, 6, 25, 0),
      soft('Jus vert détox', 300, 110, 3, 22, 0.5, 15, 0),
      soft('Gaspacho à boire', 250, 70, 2, 12, 2, 8, 0),
      soft('Jus de pruneau', 200, 145, 1.3, 35, 0.1, 32, 0),
      soft('Sirop à l’eau (menthe, grenadine)', 250, 90, 0, 22, 0, 22, 0),
      soft('Sirop sans sucre à l’eau', 250, 5, 0, 1, 0, 0, 0),
      soft('Diabolo (limonade + sirop)', 330, 160, 0, 40, 0, 39, 0),
      soft('Milkshake vanille', 350, 380, 10, 60, 11, 55, 0),
    ],
  },
  {
    id: 'sodas', label: 'Sodas', icon: 'glass', items: [
      soft('Coca-Cola (canette 330 ml)', 330, 139, 0, 35, 0, 35, 32),
      soft('Coca-Cola Zero (330 ml)', 330, 1, 0, 0, 0, 0, 32),
      soft('Coca-Cola Light (330 ml)', 330, 1, 0, 0, 0, 0, 42),
      soft('Pepsi (330 ml)', 330, 142, 0, 36, 0, 36, 32),
      soft('Pepsi Max (330 ml)', 330, 1, 0, 0, 0, 0, 43),
      soft('Orangina (330 ml)', 330, 145, 0, 35, 0, 35, 0),
      soft('Fanta orange (330 ml)', 330, 125, 0, 30, 0, 30, 0),
      soft('Sprite (330 ml)', 330, 122, 0, 30, 0, 30, 0),
      soft('Seven Up (330 ml)', 330, 125, 0, 31, 0, 31, 0),
      soft('Schweppes agrumes (330 ml)', 330, 115, 0, 28, 0, 28, 0),
      soft('Ice Tea pêche (330 ml)', 330, 92, 0, 23, 0, 23, 20),
      soft('Limonade (330 ml)', 330, 120, 0, 30, 0, 29, 0),
      soft('Cream soda (330 ml)', 330, 150, 0, 38, 0, 38, 0),
      soft('Root beer (330 ml)', 330, 145, 0, 37, 0, 37, 0),
      soft('Ginger ale (330 ml)', 330, 110, 0, 27, 0, 27, 0),
      soft('Ginger beer (330 ml)', 330, 130, 0, 32, 0, 32, 0),
      soft('Cola artisanal (330 ml)', 330, 140, 0, 34, 0, 34, 25),
      soft('Soda au citron (330 ml)', 330, 120, 0, 30, 0, 30, 0),
      soft('Bitter sans alcool (200 ml)', 200, 90, 0, 22, 0, 21, 0),
      soft('Cidre doux sans alcool (250 ml)', 250, 105, 0, 26, 0, 24, 0),
      soft('Soda light générique (330 ml)', 330, 3, 0, 0, 0, 0, 0),
      soft('Cocktail sans alcool sucré (250 ml)', 250, 160, 0.3, 39, 0, 36, 0),
      soft('Boisson au thé pétillante (330 ml)', 330, 85, 0, 21, 0, 21, 18),
      soft('Soda au gingembre allégé (330 ml)', 330, 8, 0, 2, 0, 2, 0),
      soft('Cola cerise (330 ml)', 330, 145, 0, 36, 0, 36, 30),
    ],
  },
  {
    id: 'energisantes', label: 'Énergisantes', icon: 'spark', items: [
      soft('Red Bull (250 ml)', 250, 115, 0, 27, 0, 27, 80),
      soft('Red Bull sans sucre (250 ml)', 250, 8, 0, 1, 0, 0, 80),
      soft('Monster (500 ml)', 500, 210, 0, 54, 0, 54, 160),
      soft('Monster Ultra (500 ml)', 500, 10, 0, 2, 0, 0, 150),
      soft('Celsius (355 ml)', 355, 10, 0, 2, 0, 0, 200),
      soft('Burn (250 ml)', 250, 118, 0, 28, 0, 28, 80),
      soft('Rockstar (500 ml)', 500, 240, 0, 62, 0, 61, 160),
      soft('Prime Energy (355 ml)', 355, 20, 0, 5, 0, 0, 200),
      soft('Café énergisant en canette (250 ml)', 250, 90, 3, 14, 2, 13, 150),
      soft('Guarana (250 ml)', 250, 110, 0, 27, 0, 27, 90),
      soft('Shot énergétique (60 ml)', 60, 12, 0, 2, 0, 0, 200),
      soft('Pré-workout (300 ml)', 300, 15, 1, 3, 0, 0, 250),
    ],
  },
  {
    id: 'sport', label: 'Boissons sport', icon: 'bottle', items: [
      soft('Boisson isotonique (500 ml)', 500, 130, 0, 32, 0, 30, 0),
      soft('Boisson d’effort maison (500 ml)', 500, 110, 0, 28, 0, 26, 0),
      soft('Gatorade (500 ml)', 500, 130, 0, 34, 0, 34, 0),
      soft('Powerade (500 ml)', 500, 120, 0, 31, 0, 31, 0),
      soft('Boisson de récupération (500 ml)', 500, 280, 20, 40, 4, 30, 0),
      soft('Eau + électrolytes (500 ml)', 500, 10, 0, 2, 0, 0, 0),
      soft('Maltodextrine (500 ml)', 500, 200, 0, 50, 0, 2, 0),
      soft('Shaker whey (300 ml)', 300, 130, 25, 3, 2, 2, 0),
      soft('Shaker whey + lait (350 ml)', 350, 250, 32, 18, 6, 16, 0),
      soft('Gainer (400 ml)', 400, 600, 40, 90, 8, 30, 0),
      soft('Boisson BCAA (500 ml)', 500, 20, 4, 1, 0, 0, 0),
      soft('Gel énergétique + eau (200 ml)', 200, 100, 0, 25, 0, 12, 25),
    ],
  },
  {
    id: 'laits', label: 'Laits & végétaux', icon: 'glass', items: [
      soft('Lait entier', 200, 128, 6.6, 9.4, 7.2, 9.4, 0),
      soft('Lait demi-écrémé', 200, 92, 6.6, 9.6, 3.2, 9.6, 0),
      soft('Lait écrémé', 200, 68, 6.8, 9.8, 0.2, 9.8, 0),
      soft('Lait ribot / fermenté', 200, 80, 6.6, 9.4, 1.8, 9.4, 0),
      soft('Lait de brebis', 200, 216, 11, 10, 14, 10, 0),
      soft('Lait de chèvre', 200, 138, 7, 9, 8, 9, 0),
      soft('Boisson d’avoine', 200, 96, 2, 16, 3, 7, 0),
      soft('Boisson d’avoine sans sucre', 200, 60, 2, 8, 3, 1, 0),
      soft('Boisson d’amande', 200, 30, 1, 1, 2.5, 0.5, 0),
      soft('Boisson d’amande sucrée', 200, 70, 1, 12, 2.5, 11, 0),
      soft('Boisson de soja', 200, 88, 6.6, 5, 4.2, 4, 0),
      soft('Boisson de soja vanille', 200, 110, 6, 12, 4, 10, 0),
      soft('Boisson de riz', 200, 94, 0.2, 20, 1.4, 12, 0),
      soft('Boisson de coco', 200, 40, 0.4, 3, 3, 3, 0),
      soft('Boisson de noisette', 200, 60, 0.8, 8, 3, 6, 0),
      soft('Kéfir de lait', 200, 84, 6, 8, 3, 8, 0),
      soft('Yaourt à boire', 250, 180, 8, 30, 3, 28, 0),
      soft('Lassi', 250, 200, 7, 32, 4, 30, 0),
      soft('Milk-shake protéiné', 350, 280, 30, 25, 6, 20, 0),
      soft('Lait concentré sucré (30 ml)', 30, 100, 2.4, 17, 2.6, 17, 0),
    ],
  },
  {
    id: 'bieres', label: 'Bières & cidres', icon: 'glass', items: [
      booze('Bière blonde, demi (250 ml)', 250, 5, 8),
      booze('Bière blonde, pinte (500 ml)', 500, 5, 16),
      booze('Bière blonde, canette (330 ml)', 330, 5, 10.5),
      booze('Bière légère (330 ml)', 330, 3.5, 7),
      booze('Bière blanche (330 ml)', 330, 5, 11),
      booze('Bière ambrée (330 ml)', 330, 6.5, 12),
      booze('Bière brune (330 ml)', 330, 6, 13),
      booze('Stout (500 ml)', 500, 4.2, 15),
      booze('IPA (330 ml)', 330, 6.5, 12),
      booze('Triple belge (330 ml)', 330, 9, 14),
      booze('Bière de garde (750 ml)', 750, 6.5, 28),
      booze('Bière sans alcool (330 ml)', 330, 0.4, 12),
      booze('Panaché (330 ml)', 330, 2.5, 20),
      booze('Cidre brut (250 ml)', 250, 5, 5),
      booze('Cidre doux (250 ml)', 250, 3, 15),
      booze('Poiré (250 ml)', 250, 4, 13),
      booze('Radler (500 ml)', 500, 2, 30),
      booze('Michelada (330 ml)', 330, 4.5, 12),
    ],
  },
  {
    id: 'vins', label: 'Vins & effervescents', icon: 'glass', items: [
      booze('Vin rouge, verre (125 ml)', 125, 13, 0.5),
      booze('Vin rouge, verre généreux (175 ml)', 175, 13, 0.7),
      booze('Vin blanc sec, verre (125 ml)', 125, 12, 0.8),
      booze('Vin blanc moelleux (125 ml)', 125, 11, 8),
      booze('Vin rosé, verre (125 ml)', 125, 12, 1.5),
      booze('Champagne, flûte (125 ml)', 125, 12, 1.5),
      booze('Crémant (125 ml)', 125, 12, 2),
      booze('Prosecco (125 ml)', 125, 11, 3),
      booze('Vin doux naturel (75 ml)', 75, 16, 10),
      booze('Porto (75 ml)', 75, 20, 8),
      booze('Vermouth (75 ml)', 75, 16, 12),
      booze('Sangria (200 ml)', 200, 8, 22),
      booze('Vin chaud (200 ml)', 200, 9, 24),
      booze('Kir (125 ml)', 125, 12, 12),
    ],
  },
  {
    id: 'spiritueux', label: 'Spiritueux', icon: 'glass', items: [
      booze('Whisky sec (40 ml)', 40, 40, 0),
      booze('Vodka (40 ml)', 40, 40, 0),
      booze('Gin (40 ml)', 40, 40, 0),
      booze('Rhum blanc (40 ml)', 40, 40, 0),
      booze('Rhum ambré (40 ml)', 40, 40, 0),
      booze('Tequila (40 ml)', 40, 38, 0),
      booze('Cognac (40 ml)', 40, 40, 0),
      booze('Armagnac (40 ml)', 40, 40, 0),
      booze('Pastis + eau (200 ml)', 200, 9, 0),
      booze('Liqueur de café (40 ml)', 40, 20, 13),
      booze('Limoncello (40 ml)', 40, 28, 15),
      booze('Amaretto (40 ml)', 40, 28, 17),
      booze('Get 27 (40 ml)', 40, 21, 14),
      booze('Génépi (40 ml)', 40, 40, 12),
    ],
  },
  {
    id: 'cocktails', label: 'Cocktails', icon: 'glass', items: [
      booze('Mojito (250 ml)', 250, 10, 20),
      booze('Piña colada (250 ml)', 250, 9, 32),
      booze('Margarita (150 ml)', 150, 20, 12),
      booze('Daiquiri (150 ml)', 150, 18, 14),
      booze('Cosmopolitan (150 ml)', 150, 20, 10),
      booze('Gin tonic (250 ml)', 250, 8, 16),
      booze('Cuba libre (250 ml)', 250, 8, 22),
      booze('Vodka-orange (250 ml)', 250, 8, 22),
      booze('Whisky-coca (250 ml)', 250, 9, 22),
      booze('Spritz (200 ml)', 200, 8, 14),
      booze('Negroni (100 ml)', 100, 24, 10),
      booze('Bloody Mary (250 ml)', 250, 8, 8),
      booze('Caipirinha (200 ml)', 200, 15, 18),
      booze('Punch (200 ml)', 200, 12, 25),
      booze('Sex on the beach (250 ml)', 250, 9, 24),
      booze('Tequila sunrise (250 ml)', 250, 9, 24),
      booze('Espresso martini (120 ml)', 120, 20, 12),
      booze('Irish coffee (200 ml)', 200, 8, 14),
    ],
  },
  {
    id: 'autres', label: 'Autres', icon: 'cup', items: [
      soft('Bouillon de légumes', 250, 15, 1, 2, 0.3, 1, 0),
      soft('Bouillon de volaille', 250, 30, 2.5, 2, 1, 1, 0),
      soft('Soupe à boire', 300, 90, 3, 14, 2.5, 6, 0),
      soft('Kéfir de fruits', 250, 45, 0.2, 10, 0, 9, 0),
      soft('Vinaigre de cidre dilué', 250, 8, 0, 1, 0, 0, 0),
      soft('Eau de source aromatisée zéro', 500, 3, 0, 0, 0, 0, 0),
      soft('Boisson probiotique (100 ml)', 100, 70, 1.5, 14, 0.5, 13, 0),
      soft('Jus de légumes lacto-fermenté', 200, 40, 1.5, 7, 0.2, 4, 0),
      soft('Horchata', 250, 160, 1, 32, 3, 28, 0),
      soft('Boisson au malt', 330, 190, 1.5, 44, 0, 40, 0),
      soft('Thé kombucha au gingembre', 250, 55, 0, 13, 0, 11, 12),
      soft('Sirop d’érable dans l’eau', 250, 105, 0, 27, 0, 24, 0),
    ],
  },
]

// Liste à plat, avec l'identifiant de catégorie porté par chaque boisson :
// la recherche et le journal en ont besoin, l'affichage garde les groupes.
export const DRINKS = DRINK_CATEGORIES.flatMap((c) =>
  c.items.map((d, i) => ({ ...d, id: `${c.id}_${i}`, cat: c.id, catLabel: c.label, icon: c.icon })))

export function drinkById(id) {
  return DRINKS.find((d) => d.id === id) || null
}

// Recherche insensible aux accents et à la casse : « biere » doit trouver
// « Bière », et « the » ne doit pas remonter toutes les boissons contenant
// « thé » au milieu d'un mot.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function searchDrinks(query, limit = 30) {
  const q = norm(query).trim()
  if (!q) return []
  const scored = []
  for (const d of DRINKS) {
    const n = norm(d.n)
    const idx = n.indexOf(q)
    if (idx === -1) {
      if (norm(d.catLabel).indexOf(q) === 0) scored.push({ d, s: 3 })
      continue
    }
    scored.push({ d, s: idx === 0 ? 0 : n[idx - 1] === ' ' ? 1 : 2 })
  }
  return scored.sort((a, b) => a.s - b.s || a.d.n.length - b.d.n.length).slice(0, limit).map((x) => x.d)
}

// Une quantité multiplie tout sauf le degré : deux pintes font deux fois
// l'alcool, pas deux fois le degré.
export function scaleDrink(drink, qty) {
  const q = Number(qty)
  const f = Number.isFinite(q) && q > 0 ? q : 1
  const r2 = (v) => Math.round((v || 0) * f * 10) / 10
  return {
    ...drink,
    qty: f,
    ml: Math.round((drink.ml || 0) * f),
    kcal: Math.round((drink.kcal || 0) * f),
    prot: r2(drink.prot), carb: r2(drink.carb), fat: r2(drink.fat),
    sugar: r2(drink.sugar), alc: r2(drink.alc),
    caf: Math.round((drink.caf || 0) * f),
  }
}
