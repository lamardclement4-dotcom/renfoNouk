// ============================================================
// Lecture d'une capture d'écran de sommeil.
//
// Santé, Garmin, Fitbit, Samsung Health, Oura, Withings, Sleep Cycle :
// chaque application a sa mise en page, mais toutes écrivent les mêmes
// choses — une durée de sommeil, des heures de coucher et de lever, des
// phases, souvent un score, parfois la fréquence cardiaque au repos et la
// variabilité cardiaque. Le texte vient de l'OCR (ocr.js, sur l'appareil) :
// on cherche ici chaque étiquette connue, en français et en anglais, et la
// valeur posée à côté, dessous ou dessus.
//
// Ce qui est lu de travers ne doit pas entrer : chaque valeur est bornée,
// les phases ne dépassent pas la nuit, et des heures qui contredisent la
// durée sont écartées plutôt que devinées. Rien ici ne touche au DOM.
// ============================================================

const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function lignesDe(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map((l) => sansAccents(l).toLowerCase()
      .replace(/[|·•]/g, ' ')
      // Confusions fréquentes de l'OCR dans les nombres : « O » pour 0,
      // « l » ou « I » pour 1, quand ils sont collés à des chiffres.
      // (sans « lookbehind » : Safari ne le lit qu'à partir d'iOS 16.4).
      .replace(/(\d)o(?=[\d\s:%hm]|$)/g, (_, d) => d + '0').replace(/(\d)[il](?=\d)/g, (_, d) => d + '1')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// ─── Étiquettes ───
// L'ordre compte : la première qui reconnaît un morceau de ligne le prend.
const ETIQUETTES = [
  ['lit', /(temps au lit|duree au lit|au lit|time in bed|in bed)/],
  ['coucher', /(heure du cou\w*|coucher|bedtime|went to bed|fell asleep|endormi a|endormissement a)/],
  // « Hours de révai » : l'OCR abîme les petites étiquettes grises.
  ['lever', /((?:heures?|hours?) (?:du |de |d')?rev\w*|reveil a|reveille a|\blever\b|woke up|wake up|\bwoke\b|\bwake\b|\breveil\b)/],
  ['total', /(temps de somm\w*|sommeil total|duree (?:du |de )?somm\w*|temps endormi|time asleep|total sleep|sleep time|sleep duration|asleep|duree totale|tu as dormi|vous avez dormi|\bdormi)/],
  ['profond', /(pro[ft]ond|prof\w?nd|deep)/],
  ['paradoxal', /(paradoxal|\brem\b|rapid eye)/],
  ['leger', /(leger|light|\bcore\b|principal)/],
  ['reveils', /(nombre de reveils|reveils|awakenings|interruptions|times awake)/],
  ['eveille', /((?:^|[^r])eveill?e?s?\b|\beval\b|\bawake\b|temps eveille)/],
  ['score', /(score de sommeil|sleep score|score|qualite du sommeil|qualite de sommeil|sleep quality|note du sommeil)/],
  ['efficacite', /(efficacite|efficiency)/],
  ['fc', /(fc au repos|fc repos|frequence cardiaque au repos|resting heart rate|resting hr|\brhr\b|fc la plus basse|lowest heart rate|fc min|frequence cardiaque|heart rate|\bfc\b)/],
  ['vfc', /(\bv[fe]c\b|\bhrv\b|variabilite)/],
]

// Découpe une ligne en morceaux « étiquette + ce qui suit », pour les mises
// en page en colonnes que l'OCR met bout à bout (« Profond 58 min Paradoxal
// 1 h 35 »).
function morceaux(ligne) {
  const pris = []
  for (const [id, re] of ETIQUETTES) {
    const g = new RegExp(re.source, 'g')
    let m
    while ((m = g.exec(ligne))) {
      const debut = m.index + (m[0].length - m[0].trimStart().length)
      if (!pris.some((p) => debut < p.fin && debut + m[0].length > p.debut)) pris.push({ id, debut, fin: debut + m[0].length })
    }
  }
  pris.sort((a, b) => a.debut - b.debut)
  return pris.map((p, i) => ({ id: p.id, texte: ligne.slice(p.fin, i + 1 < pris.length ? pris[i + 1].debut : undefined), avant: i === 0 ? ligne.slice(0, p.debut) : '' }))
}

// ─── Valeurs ───
// Durée en minutes : « 7 h 32 min », « 7h32 », « 7 hr 32 min », « 7h 32m »,
// « 58 min ». « 7:32 » seulement quand l'étiquette dit une durée.
export function dureeMinutes(s, { deuxPoints = false } = {}) {
  const t = String(s || '')
    // Le petit « h » gris des applications est souvent lu « + », « k »,
    // « n » ou « b » : « 7 + 32 min ». Ou fondu en « 1 » : « 8105 min ».
    .replace(/(\d{1,2})\s*[+knb]\s*(\d{2})\s*(min|mn|m)\b/g, '$1 h $2 $3')
    .replace(/\b(\d)1([0-5]\d)\s*(min|mn)\b/g, (x, h, mi, u) => (Number(h + '1' + mi) >= 600 ? `${h} h ${mi} ${u}` : x))
  let m = /(\d{1,2})\s*(?:h|hr|hrs|heures?|hours?)\b\.?\s*(?:(\d{1,2})\s*(?:min|mn|m|minutes?)?\b)?/.exec(t)
  if (!m) m = /(\d{1,2})\s*h\s*(\d{2})/.exec(t)
  if (m) {
    const h = Number(m[1]), mi = m[2] != null ? Number(m[2]) : 0
    if (h <= 16 && mi < 60) return h * 60 + mi
  }
  m = /(\d{1,3})\s*(?:min|mn|minutes?|m)\b/.exec(t)
  if (m && Number(m[1]) < 600) return Number(m[1])
  if (deuxPoints) {
    m = /(?:^|[^\d])(\d{1,2}):([0-5]\d)(?!\s*(?:am|pm|a\.m|p\.m))/.exec(t)
    if (m && Number(m[1]) <= 16) return Number(m[1]) * 60 + Number(m[2])
  }
  return null
}

const deuxChiffres = (n) => String(n).padStart(2, '0')
// Heure d'horloge : « 23:14 », « 23 h 14 », « 11:14 pm ».
const RE_HEURE = /(?:^|[^\d])([01]?\d|2[0-3])\s*(?::|h(?!\s*\d{0,2}\s*(?:min|mn)))\s*([0-5]\d)(?!\s*(?:min|mn|m\b))\s*(am|pm|a\.m\.?|p\.m\.?)?/g
export function heuresDe(s) {
  const out = []
  const t = String(s || '')
  RE_HEURE.lastIndex = 0
  let m
  while ((m = RE_HEURE.exec(t))) {
    let h = Number(m[1])
    const mer = m[3] ? m[3][0] : null
    if (mer === 'p' && h < 12) h += 12
    if (mer === 'a' && h === 12) h = 0
    if (h < 24) out.push(deuxChiffres(h) + ':' + m[2])
  }
  return out
}

function nombre(s, lo, hi, { pourcent = false } = {}) {
  const re = pourcent ? /(\d{1,3})\s*%/ : /(?:^|[^\d:])(\d{1,3})(?!\s*(?:h\b|hr|min|mn|m\b|:|\d))/
  const m = re.exec(String(s || ''))
  if (!m) return null
  const n = Number(m[1])
  return n >= lo && n <= hi ? n : null
}

const minutesHorloge = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

// Plage horaire dont l'OCR a mangé les deux-points : « 2314-07119 » pour
// « 23:14 – 07:19 » (deux-points lus « 1 », « i » ou rien du tout).
function heureAbimee(tok) {
  const t = tok.replace(/[^\d:.,;il]/g, '')
  let m = /^([01]?\d|2[0-3])[:.,;il1]?([0-5]\d)$/.exec(t)
  if (!m) return null
  return deuxChiffres(Number(m[1])) + ':' + m[2]
}
export function plageAbimee(ligne) {
  const m = /(\d[\d:.,;il]{2,5})\s*(am|pm)?\s*[-–—~]\s*(\d[\d:.,;il]{2,5})\s*(am|pm)?/.exec(ligne)
  if (!m) return null
  const a = heureAbimee(m[1]), b = heureAbimee(m[3])
  if (!a || !b) return null
  const conv = (h, mer) => { if (!mer) return h; let n = Number(h.slice(0, 2)); if (mer === 'pm' && n < 12) n += 12; if (mer === 'am' && n === 12) n = 0; return deuxChiffres(n) + h.slice(2) }
  return [conv(a, m[2]), conv(b, m[4])]
}

// Les valeurs d'une ligne, dans l'ordre : pour les mises en page en
// colonnes, où l'OCR lit « Profond Léger » puis « 1h 18m 4h 01m ».
const RE_VALEUR = /(\d{1,2}\s*h\s*\d{0,2}\s*(?:min|mn|m)?\b|\d{1,3}\s*(?:min|mn|m)\b|\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,3}\s*(?:bpm|ms|%)|\d{1,3})/g
export function valeursDe(ligne) {
  return (String(ligne || '').match(RE_VALEUR) || []).map((v) => v.trim())
}

// ─── Lecture ───
export function lireCaptureSommeil(raw) {
  const ls = lignesDe(raw)
  if (!ls.length) return null
  const segs = ls.map(morceaux)
  const aEtiquette = (i) => i >= 0 && i < segs.length && segs[i].length > 0
  const etiquettesSeules = (i) => aEtiquette(i) && segs[i].every((x) => !/\d/.test(x.texte))
  const valeursSeules = (i) => !aEtiquette(i) && valeursDe(ls[i]).length > 0

  // Lecture « texte épars » : l'OCR rend les étiquettes d'une rangée, puis
  // leurs valeurs (« Profond », « Léger », « 1h 18m », « 4h 01m »). Une
  // suite d'étiquettes seules suivie d'autant de valeurs : on les apparie
  // dans l'ordre. Les lignes sans étiquette ni chiffre (« Bon ») passent.
  const apparie = new Map()
  for (let i = 0; i < ls.length;) {
    if (!etiquettesSeules(i)) { i++; continue }
    const places = []
    let j = i
    while (j < ls.length && (etiquettesSeules(j) || (!aEtiquette(j) && !/\d/.test(ls[j])))) {
      if (aEtiquette(j)) segs[j].forEach((sg, n) => places.push(j + ':' + n))
      j++
    }
    const vals = []
    while (j < ls.length && (valeursSeules(j) || (!aEtiquette(j) && !/\d/.test(ls[j])))) { vals.push(...valeursDe(ls[j])); j++ }
    if (places.length >= 2 && vals.length === places.length) places.forEach((p, n) => apparie.set(p, vals[n]))
    i = Math.max(j, i + 1)
  }

  // Valeur d'une étiquette : dans son morceau, sinon sur la ligne d'après
  // (valeur sous l'étiquette), sinon sur celle d'avant (valeur au-dessus),
  // pourvu que ces lignes n'aient pas leur propre étiquette.
  const manques = new Set()
  const chercher = (id, lire, { sauf } = {}) => {
    let vue = false
    for (let i = 0; i < segs.length; i++) {
      if (sauf && sauf.test(ls[i])) continue
      for (let n = 0; n < segs[i].length; n++) {
        const sg = segs[i][n]
        if (sg.id !== id) continue
        vue = true
        const v = lire(sg.texte)
        if (v != null) return v
        if (apparie.has(i + ':' + n)) { const w = lire(apparie.get(i + ':' + n)); if (w != null) return w; continue }
        // Ligne d'étiquettes seules, ligne de valeurs dessous, autant de
        // chaque côté : la n-ième valeur va à la n-ième étiquette.
        const k = segs[i].length
        if (k >= 2 && i + 1 < ls.length && !aEtiquette(i + 1) && etiquettesSeules(i)) {
          const vals = valeursDe(ls[i + 1])
          if (vals.length === k) { const w = lire(vals[n]); if (w != null) return w; continue }
        }
        if (i + 1 < ls.length && !aEtiquette(i + 1)) { const w = lire(ls[i + 1]); if (w != null) return w }
        if (sg.avant.trim()) { const w = lire(sg.avant); if (w != null) return w }
        if (i > 0 && !aEtiquette(i - 1)) { const w = lire(ls[i - 1]); if (w != null) return w }
      }
    }
    if (vue) manques.add(id)
    return null
  }

  // Une durée de nuit : entre 2 et 16 heures, et jamais lue dans une plage
  // horaire (« 00:10 - 08:20 » n'est pas une durée de dix minutes).
  const duree = (s) => {
    if (heuresDe(s).length >= 2) return null
    const v = dureeMinutes(s, { deuxPoints: true })
    return v != null && v >= 120 && v <= 960 ? v : null
  }
  const res = {
    total: chercher('total', duree),
    lit: chercher('lit', (s) => { const v = dureeMinutes(s); return v != null && v >= 120 ? v : null }),
    phases: {
      profond: chercher('profond', dureeMinutes),
      paradoxal: chercher('paradoxal', dureeMinutes),
      leger: chercher('leger', dureeMinutes),
      eveille: chercher('eveille', dureeMinutes),
    },
    // Le score de sommeil, pas celui de forme ou de récupération que
    // certaines applications affichent sur le même écran.
    score: chercher('score', (s) => nombre(s, 1, 100, { pourcent: /%/.test(s) }) ?? nombre(s, 1, 100), { sauf: /readiness|disponibilite|body battery|preparation|recuperation|stress/ }),
    efficacite: chercher('efficacite', (s) => nombre(s, 50, 100, { pourcent: true }) ?? nombre(s, 50, 100)),
    fcRepos: chercher('fc', (s) => nombre(s, 30, 120)),
    vfc: chercher('vfc', (s) => nombre(s, 5, 300)),
    reveils: chercher('reveils', (s) => nombre(s, 0, 30)),
  }

  // Heures : étiquetées d'abord, sinon la première plage « 23:14 – 06:58 ».
  res.coucher = chercher('coucher', (s) => heuresDe(s)[0] || null)
    // « Au lit 23:40 » (Sleep Cycle) : une heure, pas une durée.
    || chercher('lit', (s) => (dureeMinutes(s) == null && heuresDe(s).length === 1 ? heuresDe(s)[0] : null))
  res.lever = chercher('lever', (s) => heuresDe(s)[0] || null)
  if (!res.coucher || !res.lever) {
    for (const l of ls) {
      if (!/[-–—~]|\ba\b|\bto\b/.test(l)) continue
      const hs = heuresDe(l)
      const p = hs.length >= 2 ? hs : plageAbimee(l)
      if (p && p.length >= 2) { res.coucher = res.coucher || p[0]; res.lever = res.lever || p[1]; break }
    }
  }
  if (res.coucher) manques.delete('coucher')
  if (res.lever) manques.delete('lever')
  manques.delete('lit')

  // Sans durée étiquetée : la plus longue durée plausible lue hors temps
  // au lit (finaliser essaie d'abord la somme des phases).
  if (res.total == null && !(res.phases.profond != null && res.phases.paradoxal != null && res.phases.leger != null)) {
    const toutes = ls.filter((l, i) => !segs[i].some((x) => x.id === 'lit')).map((l) => dureeMinutes(l)).filter((v) => v != null && v >= 180 && v <= 780)
    if (toutes.length) res.total = Math.max(...toutes)
  }
  return finaliser(res, [...manques])
}

// Déductions et garde-fous, après une lecture ou la fusion de deux.
function finaliser(entree, manques = []) {
  const res = { ...entree, phases: { ...entree.phases } }
  const ph = res.phases
  // Sans durée : la somme des phases, ou le temps au lit moins l'éveil.
  if (res.total == null && ph.profond != null && ph.paradoxal != null && ph.leger != null) res.total = ph.profond + ph.paradoxal + ph.leger
  if (res.total == null && res.lit != null && ph.eveille != null) res.total = res.lit - ph.eveille
  if (res.total != null && (res.total < 120 || res.total > 960)) res.total = null
  // Une phase plus longue que la nuit est une lecture fautive ; des heures
  // qui laissent moins de temps au lit que de sommeil aussi.
  for (const k of Object.keys(ph)) if (ph[k] != null && res.total != null && ph[k] > res.total) ph[k] = null
  const alertes = []
  if (res.coucher && res.lever) {
    let lit = minutesHorloge(res.lever) - minutesHorloge(res.coucher)
    if (lit <= 0) lit += 1440
    if (lit > 16 * 60 || (res.total != null && res.total > lit + 15)) {
      alertes.push('Heures de coucher et de lever écartées : elles ne collaient pas avec la durée lue.')
      res.coucher = null; res.lever = null
    }
  }
  const trouves = [res.total, res.coucher, res.lever, res.score, res.fcRepos, res.vfc, ph.profond, ph.paradoxal, ph.leger, ph.eveille].filter((v) => v != null).length
  if (!trouves) return null
  return { ...res, heures: res.total != null ? Math.round(res.total) / 60 : null, alertes, trouves, manques: manques.filter((m) => res[m] == null && ph[m] == null) }
}

// Faut-il une seconde lecture, plus fine ? Quand la durée ou les heures
// manquent, ou qu'une étiquette a été vue sans sa valeur.
export function lectureIncomplete(r) {
  return !r || r.total == null || !(r.coucher && r.lever) || r.manques.length > 0
}

// Deux lectures de la même capture : la première fait foi, la seconde
// comble ses trous. Les garde-fous repassent sur le résultat.
export function fusionnerCaptures(a, b) {
  if (!a) return b
  if (!b) return a
  const champs = ['total', 'lit', 'score', 'efficacite', 'fcRepos', 'vfc', 'reveils']
  const m = { ...a, phases: { ...a.phases } }
  for (const c of champs) if (m[c] == null && b[c] != null) m[c] = b[c]
  // Les heures vont par paire : jamais un coucher d'une lecture et un lever
  // de l'autre.
  if (!(a.coucher && a.lever) && b.coucher && b.lever) { m.coucher = b.coucher; m.lever = b.lever }
  for (const k of Object.keys(m.phases)) if (m.phases[k] == null && b.phases[k] != null) m.phases[k] = b.phases[k]
  const r = finaliser(m, a.manques.filter((x) => b.manques.includes(x)))
  return r && { ...r, alertes: [...new Set([...a.alertes, ...b.alertes, ...r.alertes])] }
}

// Score de l'application (sur 100) → qualité sur 5, pour préremplir.
export function qualiteDuScore(score) {
  if (!(score >= 1 && score <= 100)) return null
  return score >= 85 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : score >= 40 ? 2 : 1
}
