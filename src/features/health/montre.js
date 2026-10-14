// ============================================================
// Apple Watch : les mesures du matin, déposées par un Raccourci iOS.
//
// Safari ne parle pas en Bluetooth à une montre, et Santé n'a pas d'API
// web. Reste le Raccourci : chaque matin, une automatisation de l'iPhone
// lit dans Santé la nuit (segments et phases), la fréquence cardiaque au
// repos et la variabilité cardiaque, et les dépose dans une boîte du
// serveur avec une clé personnelle (migration 0005). L'app relève la boîte
// à l'ouverture et range les mesures comme un import Santé.
//
// Le Raccourci envoie du texte, une mesure par ligne :
//   sommeil;<début>;<fin>;<valeur>   (Au lit, Principal, Profond, …)
//   fc;<date>;<valeur>               (bpm)
//   vfc;<date>;<valeur>              (ms)
// Les dates arrivent au format ISO 8601 si on l'a choisi dans le
// Raccourci, sinon au format affiché par l'iPhone (« 14 oct. 2026 à
// 23:14 ») : les deux sont lus. Rien ici ne touche au réseau.
// ============================================================
import { createHealthReader, SLEEP_TYPE, RESTING_HR_TYPE, HRV_TYPE } from '../train/healthImport'

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const p2 = (n) => String(n).padStart(2, '0')
const MOIS = { janv: 1, jan: 1, fevr: 2, fev: 2, feb: 2, mars: 3, mar: 3, avr: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, jul: 7, aout: 8, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12 }

// Décalage horaire local d'un instant donné, au format « +0200 ».
function decalageLocal(y, mo, d, h, mi) {
  const off = -new Date(y, mo - 1, d, h, mi).getTimezoneOffset()
  const s = off >= 0 ? '+' : '-'
  return s + p2(Math.floor(Math.abs(off) / 60)) + p2(Math.abs(off) % 60)
}

// Date du Raccourci → « 2026-10-14 23:14:00 +0200 », la forme de l'export
// Santé, que healthImport sait lire. Null si illisible.
export function dateRaccourci(raw) {
  const s = sansAccents(raw).toLowerCase().trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})[ t](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(z|[+-]\d{2}:?\d{2})?$/.exec(s)
  if (m) {
    const [, y, mo, d, h, mi, se] = m
    let off = m[7]
    if (!off) off = decalageLocal(+y, +mo, +d, +h, +mi)
    else if (off === 'z') off = '+0000'
    else off = off.replace(':', '')
    return `${y}-${mo}-${d} ${h}:${mi}:${se || '00'} ${off}`
  }
  // « Oct 14, 2026 at 11:14 PM » (iPhone réglé en anglais)
  m = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s*(?:at|,))?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/.exec(s)
  if (m && (MOIS[m[1].slice(0, 4)] || MOIS[m[1].slice(0, 3)])) {
    const mo = MOIS[m[1].slice(0, 4)] || MOIS[m[1].slice(0, 3)], d = +m[2], y = +m[3]
    let h = +m[4]
    if (m[6] === 'pm' && h < 12) h += 12
    if (m[6] === 'am' && h === 12) h = 0
    if (d >= 1 && d <= 31 && h <= 23) return `${y}-${p2(mo)}-${p2(d)} ${p2(h)}:${m[5]}:00 ${decalageLocal(y, mo, d, h, +m[5])}`
  }
  // « 14 oct. 2026 à 23:14 », « 14 octobre 2026 23:14 », « 14/10/2026 23:14 »
  m = /^(\d{1,2})[\s/.-]+([a-z]+\.?|\d{1,2})[\s/.-]+(\d{4})(?:\s*(?:a|,|at))?\s+(\d{1,2})[:h](\d{2})(?:\s*(am|pm))?/.exec(s)
  if (m) {
    const d = +m[1], y = +m[3]
    const mo = /^\d/.test(m[2]) ? +m[2] : MOIS[m[2].replace('.', '').slice(0, 4)] || MOIS[m[2].replace('.', '').slice(0, 3)]
    let h = +m[4]
    if (m[6] === 'pm' && h < 12) h += 12
    if (m[6] === 'am' && h === 12) h = 0
    if (!mo || mo > 12 || d < 1 || d > 31 || h > 23) return null
    return `${y}-${p2(mo)}-${p2(d)} ${p2(h)}:${m[5]}:00 ${decalageLocal(y, mo, d, h, +m[5])}`
  }
  return null
}

// Valeur d'un segment de sommeil telle que l'iPhone l'écrit (« Au lit »,
// « Principal », « Profond », « Paradoxal », « Éveillé », « Endormi »), en
// français ou en anglais → valeur de l'export Santé.
// Valeur brute de Santé, si l'iPhone l'écrit en chiffre (0 au lit,
// 1 endormi, 2 éveillé, 3 principal, 4 profond, 5 paradoxal).
const VALEURS_BRUTES = ['InBed', 'AsleepUnspecified', 'Awake', 'AsleepCore', 'AsleepDeep', 'AsleepREM']
export function valeurSommeil(raw) {
  const v = sansAccents(raw).toLowerCase()
  if (/^\s*[0-5]\s*$/.test(v)) return 'HKCategoryValueSleepAnalysis' + VALEURS_BRUTES[Number(v)]
  if (/lit|bed/.test(v)) return 'HKCategoryValueSleepAnalysisInBed'
  if (/eveill|awake|reveil/.test(v)) return 'HKCategoryValueSleepAnalysisAwake'
  if (/profond|deep/.test(v)) return 'HKCategoryValueSleepAnalysisAsleepDeep'
  if (/paradox|\brem\b|rem /.test(v) || v.trim() === 'rem') return 'HKCategoryValueSleepAnalysisAsleepREM'
  if (/principal|core|leger|light/.test(v)) return 'HKCategoryValueSleepAnalysisAsleepCore'
  if (/endormi|asleep|sommeil|unspecified|non spec/.test(v)) return 'HKCategoryValueSleepAnalysisAsleepUnspecified'
  return null
}

const echapper = (s) => String(s).replace(/[<>"&]/g, '')
const nombre = (raw) => { const m = /(\d+(?:[.,]\d+)?)/.exec(String(raw || '')); return m ? Number(m[1].replace(',', '.')) : null }

// Le texte d'un ou plusieurs dépôts → le résultat d'un import Santé
// (sommeil par nuit avec phases et heures, FC au repos, VFC), plus le
// compte des lignes écartées.
export function lireDepot(texte) {
  const lecteur = createHealthReader()
  let lues = 0, ecartees = 0
  for (const brute of String(texte || '').split(/\r?\n/)) {
    const ligne = brute.trim()
    if (!ligne) continue
    const champs = ligne.split(/\s*[;\t|]\s*/)
    const type = sansAccents(champs[0]).toLowerCase()
    let xml = null
    if (/^(sommeil|sleep)$/.test(type) && champs.length >= 4) {
      const a = dateRaccourci(champs[1]), b = dateRaccourci(champs[2]), v = valeurSommeil(champs.slice(3).join(' '))
      if (a && b && v) xml = `<Record type="${SLEEP_TYPE}" value="${v}" startDate="${echapper(a)}" endDate="${echapper(b)}"/>`
    } else if (/^(fc|rhr|frequence|hr)$/.test(type) && champs.length >= 3) {
      const d = dateRaccourci(champs[1]), v = nombre(champs[champs.length - 1])
      if (d && v != null && v >= 25 && v <= 150) xml = `<Record type="${RESTING_HR_TYPE}" value="${v}" startDate="${echapper(d)}" endDate="${echapper(d)}"/>`
    } else if (/^(vfc|hrv)$/.test(type) && champs.length >= 3) {
      const d = dateRaccourci(champs[1]), v = nombre(champs[champs.length - 1])
      if (d && v != null && v >= 3 && v <= 400) xml = `<Record type="${HRV_TYPE}" value="${v}" startDate="${echapper(d)}" endDate="${echapper(d)}"/>`
    }
    if (xml) { lecteur.line(xml); lues++ } else ecartees++
  }
  return { ...lecteur.result(), lues, ecartees }
}

// ─── Clé personnelle ───
// 32 octets aléatoires, écrits en base64 « URL » (43 caractères). Le
// serveur n'en garde que l'empreinte SHA-256 : la clé ne se relit pas,
// elle se remplace.
export function genererCle(alea = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const o = alea(32)
  let b = ''
  for (const x of o) b += String.fromCharCode(x)
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function empreinteCle(cle) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cle))
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// Ce qu'un relevé a rangé, dit en une phrase.
export function resumeReleve(summary) {
  const morceaux = []
  if (summary.sleepAdded) morceaux.push(summary.sleepAdded + ' nuit' + (summary.sleepAdded > 1 ? 's' : '') + ' ajoutée' + (summary.sleepAdded > 1 ? 's' : ''))
  if (summary.sleepTimes) morceaux.push(summary.sleepTimes + ' complétée' + (summary.sleepTimes > 1 ? 's' : ''))
  if (summary.sleepUpdated) morceaux.push(summary.sleepUpdated + ' nuit' + (summary.sleepUpdated > 1 ? 's' : '') + ' mise' + (summary.sleepUpdated > 1 ? 's' : '') + ' à jour')
  if (summary.vitalsAdded) morceaux.push('FC et VFC de ' + summary.vitalsAdded + ' jour' + (summary.vitalsAdded > 1 ? 's' : ''))
  return morceaux.length ? 'Montre : ' + morceaux.join(', ') : null
}
