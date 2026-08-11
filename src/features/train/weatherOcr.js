// ============================================================
// Lecture d'une capture d'écran d'application météo.
//
// Même principe que l'import de balance : OCR sur l'appareil, valeurs
// bornées au plausible, validation avant enregistrement. Les captures
// météo ont une particularité : plusieurs températures y figurent
// (actuelle, ressentie, mini, maxi, prévisions horaires), et le nombre le
// plus gros n'est pas toujours le bon. On privilégie donc la valeur
// explicitement libellée, avec repli sur la plus grande police lorsqu'elle
// est isolée en tête.
// ============================================================

export const WEATHER_FIELDS = [
  { key: 'tempC', label: 'Température', unit: '°C', min: -50, max: 60, decimals: 0,
    patterns: [/temp[ée]rature/, /\btemp\b/] },
  { key: 'humidity', label: 'Humidité', unit: '%', min: 0, max: 100, decimals: 0,
    patterns: [/humidit[ée]/, /humidity/] },
  { key: 'windKmh', label: 'Vent', unit: 'km/h', min: 0, max: 200, decimals: 0,
    patterns: [/\bvent\b/, /\bwind\b/, /rafales?/] },
  { key: 'uv', label: 'Indice UV', unit: '', min: 0, max: 15, decimals: 0,
    patterns: [/indice\s*uv/, /\buv\b/] },
  { key: 'aqi', label: 'Qualité de l’air', unit: '', min: 0, max: 500, decimals: 0,
    patterns: [/qualit[ée]\s*(de\s*l.?)?air/, /\baqi\b/, /air\s*quality/] },
  { key: 'altitudeM', label: 'Altitude', unit: 'm', min: 0, max: 9000, decimals: 0,
    patterns: [/altitude/, /\belevation\b/] },
]

export function normLine(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrait un nombre signé. Le signe compte ici : une température peut être
// négative, contrairement aux mesures de la balance.
export function parseNumber(s) {
  if (!s) return null
  const cleaned = String(s).replace(/[  ]/g, '').replace(/(\d)\s+(\d{3}\b)/g, '$1$2')
  const m = cleaned.match(/-?\d+(?:[.,]\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Températures en Fahrenheit : converties si l'unité est explicite.
function toCelsius(value, line) {
  if (/°\s*f\b|\bfahrenheit\b/.test(line)) return Math.round((value - 32) * 5 / 9)
  return value
}

export function parseWeatherText(raw) {
  const values = {}
  const rejected = []
  if (!raw || typeof raw !== 'string') return { values, rejected }
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const norm = normLine(lines[i])
    for (const f of WEATHER_FIELDS) {
      if (values[f.key] !== undefined) continue
      if (!f.patterns.some((p) => p.test(norm))) continue
      let source = norm
      let v = parseNumber(norm.replace(/[a-z°/%]+/g, ' '))
      if (v == null && lines[i + 1]) {
        source = normLine(lines[i + 1])
        v = parseNumber(source.replace(/[a-z°/%]+/g, ' '))
      }
      if (v == null) { rejected.push({ key: f.key, label: f.label, reason: 'valeur illisible' }); continue }
      if (f.key === 'tempC') v = toCelsius(v, source)
      if (v < f.min || v > f.max) { rejected.push({ key: f.key, label: f.label, reason: `valeur hors plage (${v})` }); continue }
      values[f.key] = Math.round(v)
    }
  }

  // Repli pour la température : beaucoup d'applications l'affichent en très
  // gros, seule sur sa ligne et suivie du symbole degré, sans le mot
  // « température ». On ne l'accepte que si la ligne ne contient rien
  // d'autre, pour ne pas confondre avec une prévision horaire.
  if (values.tempC === undefined) {
    for (const line of lines) {
      const n = normLine(line)
      if (!/^-?\d{1,2}\s*°?\s*[cf]?$/.test(n)) continue
      let v = parseNumber(n)
      if (v == null) continue
      v = toCelsius(v, n)
      if (v >= -50 && v <= 60) { values.tempC = Math.round(v); break }
    }
  }

  return { values, rejected }
}
