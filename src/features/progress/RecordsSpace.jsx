import React, { useState } from 'react'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { C, Icon, FlowSpace, SegTabs } from '../health/kit'
import { enduranceAnalysis } from '../train/enduranceIntel'
import { genericAnalysis, fmtValue } from '../train/genericIntel'
import { RUN_SPORTS, BIKE_SPORTS, SWIM_SPORTS } from '../train/enduranceIntel'
import { sprintAnalysis, fmtSprintTime, windLabel } from '../train/sprintIntel'
import { climbAnalysis } from '../train/climbIntel'
import { muscuAnalysis, exerciseProgress } from '../train/muscuIntel'
import { testsAnalysis } from '../physical-tests/testsIntel'
import { weightAnalysis } from '../profil/weightIntel'

// ============================================================
// Mes records.
//
// L'application calculait déjà des records partout — allures de course,
// puissance seuil, allure critique en natation, meilleure croix par
// style, force estimée en musculation, et jusqu'aux buts marqués ou au
// score de golf sur cent quatorze champs déclarés. Rien de tout cela
// n'était consultable : ces chiffres ne sortaient que par une
// recommandation occasionnelle, quand une règle se déclenchait.
//
// Or c'est exactement ce qu'on vient chercher dans une application de
// sport. Cet écran ne calcule rien de nouveau : il rassemble ce qui
// existait déjà et n'avait nulle part où s'afficher.
// ============================================================

const card = (children, key) => React.createElement('div', {
  key,
  style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 12 },
}, children)

const heading = (txt, sub) => React.createElement('div', { style: { padding: '12px 15px 10px', borderBottom: `1px solid ${C.line}` } },
  React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em' } }, txt),
  sub ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3, lineHeight: 1.4 } }, sub) : null)

// Une ligne de record : ce qu'on a fait, quand, et le détail qui donne
// sa valeur — le vent d'un sprint, le style d'une croix, la date.
function Row({ label, value, unit, detail, date, flag, i }) {
  return React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', borderTop: i ? `1px solid ${C.line}` : 'none' },
  },
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
      detail || date ? React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        [detail, date ? date.split('-').reverse().join('/') : null].filter(Boolean).join(' · ')) : null),
    flag ? React.createElement('span', { style: { fontSize: 10, fontWeight: 700, color: C.warn, flex: '0 0 auto' } }, flag) : null,
    React.createElement('div', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800, color: C.primary, flex: '0 0 auto' } },
      value,
      unit ? React.createElement('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 2, color: C.ink3 } }, unit) : null))
}

const empty = (txt) => React.createElement('div', { style: { textAlign: 'center', padding: '36px 18px', color: C.ink3, fontSize: 13.5, lineHeight: 1.5 } },
  React.createElement(Icon, { name: 'chart', size: 26, color: C.line, style: { marginBottom: 10 } }),
  React.createElement('div', null, txt))

// ─── Endurance ───────────────────────────────────────────────
function EnduranceTab({ db }) {
  const weightKg = db.profilePhys && Number(db.profilePhys.poids) > 0 ? Number(db.profilePhys.poids) : null
  const e = enduranceAnalysis(db, { days: 730, weightKg })
  const blocks = []
  // Les valeurs brutes saisies séance par séance viennent compléter les
  // métriques déduites, sous la discipline qu'elles concernent.
  const generic = new Map(genericAnalysis(db, { days: 730 }).bySport
    .filter((g) => g.records.length).map((g) => [g.sport, g]))
  const pushDetail = (ids) => {
    for (const id of ids) { const g = generic.get(id); if (g) blocks.push(sportCard(g, true)) }
  }

  if (e.run.records.length) {
    blocks.push(card([
      heading('Course à pied', 'Meilleur temps par distance, sur parcours peu vallonné.'),
      ...e.run.records.map((r, i) => React.createElement(Row, {
        key: r.id, i, label: r.label, value: r.time, detail: `${r.paceLabel}/km`, date: r.date,
      })),
    ], 'run'))
  }
  pushDetail(RUN_SPORTS.filter((id) => id !== 'sprint'))
  if (e.run.predictions.length) {
    const raced = new Set(e.run.records.map((r) => r.id))
    const unraced = e.run.predictions.filter((p) => !raced.has(p.id))
    if (unraced.length) {
      blocks.push(card([
        heading('Projections', `D'après ton ${unraced[0].from.label} en ${unraced[0].from.time}. Une projection suppose un volume adapté à la distance — ce n'est pas une promesse.`),
        ...unraced.map((p, i) => React.createElement(Row, {
          key: p.id, i, label: p.label, value: p.time, detail: `${p.paceLabel}/km`,
        })),
      ], 'pred'))
    }
  }
  if (e.bike.ftp) {
    blocks.push(card([
      heading('Vélo', e.bike.ftp.text),
      React.createElement(Row, { key: 'ftp', i: 0, label: 'Puissance seuil estimée', value: e.bike.ftp.ftp, unit: 'W', date: e.bike.ftp.from.date }),
      e.bike.ftp.wPerKg ? React.createElement(Row, { key: 'wkg', i: 1, label: 'Rapport poids/puissance', value: String(e.bike.ftp.wPerKg).replace('.', ','), unit: 'W/kg' }) : null,
      e.bike.bestSpeed ? React.createElement(Row, { key: 'sp', i: 2, label: 'Vitesse moyenne la plus haute', value: String(e.bike.bestSpeed.speed).replace('.', ','), unit: 'km/h', date: e.bike.bestSpeed.date }) : null,
    ], 'bike'))
  }
  pushDetail(BIKE_SPORTS)
  if (e.swim.bestPace || e.swim.css) {
    blocks.push(card([
      heading('Natation'),
      e.swim.bestPace ? React.createElement(Row, { key: 'bp', i: 0, label: 'Meilleure allure', value: e.swim.bestPace.label, unit: '/100 m', detail: `sur ${e.swim.bestPace.meters} m`, date: e.swim.bestPace.date }) : null,
      e.swim.css ? React.createElement(Row, { key: 'css', i: 1, label: 'Allure critique', value: e.swim.css.paceLabel, unit: '/100 m', detail: `déduite de ${e.swim.css.from.short} et ${e.swim.css.from.long} m` }) : null,
    ], 'swim'))
  }
  pushDetail(SWIM_SPORTS)
  return blocks.length ? React.createElement('div', null, blocks)
    : empty('Aucune sortie chronométrée. Noter distance et temps suffit à obtenir records, allures de référence et projections.')
}

// Vélo et natation ont leur section dans l'onglet Endurance ; leurs records
// bruts — dénivelé, puissance, distance — apparaissaient en plus sous
// « Autres », comme s'il s'agissait de disciplines non couvertes. Ils sont
// désormais rendus dans leur propre onglet, et retirés d'« Autres ».
const ENDURANCE_SPORTS = new Set([...RUN_SPORTS, ...BIKE_SPORTS, ...SWIM_SPORTS].filter((id) => id !== 'sprint'))

function sportCard(s, asDetail) {
  return card([
    asDetail
      ? heading(`${s.label} — données saisies`, 'Meilleure valeur pour chaque donnée enregistrée, séance par séance.')
      : heading(`${s.icon} ${s.label}`, `${s.sessions} séance${s.sessions > 1 ? 's' : ''}`),
    ...s.records.map((r, i) => React.createElement(Row, {
      key: r.key, i, label: r.label, value: fmtValue(r, r.best.value), unit: r.unit,
      detail: r.count > 1 ? `${r.count} séances comparées` : null,
      date: r.best.date,
      flag: r.isRecent ? 'nouveau' : null,
    })),
  ], s.sport)
}

// ─── Sprint et escalade ──────────────────────────────────────
function PerfTab({ db }) {
  const sp = sprintAnalysis(db, { days: 730 })
  const cl = climbAnalysis(db, { days: 365 })
  const blocks = []

  const withRec = sp.records.filter((r) => r.legal || r.any)
  if (withRec.length) {
    blocks.push(card([
      heading('Sprint', 'Au-delà de +2,0 m/s, une performance n’est pas homologable : elle est affichée à part.'),
      ...withRec.map((r, i) => React.createElement(Row, {
        key: r.event, i,
        label: r.label,
        value: fmtSprintTime((r.legal || r.any).sec),
        detail: [windLabel((r.legal || r.any).wind), `${r.count} tentative${r.count > 1 ? 's' : ''}`].filter(Boolean).join(' · '),
        date: (r.legal || r.any).date,
        flag: !r.legal ? 'venté' : null,
      })),
    ], 'sprint'))
    const assisted = sp.records.filter((r) => r.windAssisted)
    if (assisted.length) {
      blocks.push(card([
        heading('Meilleurs temps avec vent favorable', 'Non homologables : conservés parce qu’ils ont été courus, tenus à part parce qu’ils ne se comparent pas.'),
        ...assisted.map((r, i) => React.createElement(Row, {
          key: r.event, i, label: r.label, value: fmtSprintTime(r.windAssisted.sec),
          detail: windLabel(r.windAssisted.wind), date: r.windAssisted.date, flag: 'venté',
        })),
      ], 'windy'))
    }
  }

  for (const [best, scale, title] of [[cl.bestVoie, 'voie', 'Escalade — voie'], [cl.bestBloc, 'bloc', 'Escalade — bloc']]) {
    const items = Object.values(best || {})
    if (!items.length) continue
    blocks.push(card([
      heading(title, 'Le niveau se lit par style : à vue et après travail ne racontent pas la même chose.'),
      ...items.sort((a, b) => b.index - a.index).map((b, i) => React.createElement(Row, {
        key: b.style, i, label: b.label, value: b.grade, detail: `${b.count} croix`, date: b.date,
      })),
    ], 'climb-' + scale))
  }

  if (cl.openProjects && cl.openProjects.length) {
    blocks.push(card([
      heading('Projets en cours', 'Voies essayées sans être enchaînées.'),
      ...cl.openProjects.slice(0, 6).map((p, i) => React.createElement(Row, {
        key: p.name, i, label: p.name, value: p.grade,
        detail: `${p.tries} essais sur ${p.sessions} séances`,
        flag: p.stale ? 'en suspens' : null,
      })),
    ], 'projects'))
  }

  return blocks.length ? React.createElement('div', null, blocks)
    : empty('Aucune performance de sprint ni croix d’escalade enregistrée.')
}

// ─── Force et condition ──────────────────────────────────────
function StrengthTab({ db }) {
  const mus = muscuAnalysis(db, { days: 180 })
  const tests = testsAnalysis(db, {
    sexe: db.profilePhys && db.profilePhys.sexe === 'f' ? 'f' : 'h',
    age: Number(db.profilePhys && db.profilePhys.age) || 30,
  })
  const w = weightAnalysis(db.weightLog, { goal: db.weightGoal, heightCm: db.profilePhys && db.profilePhys.taille })
  const blocks = []

  const lifts = mus.tracked.slice(0, 8)
    .map((t) => exerciseProgress(db, t.name, { days: 365 }))
    .filter((p) => p && p.best && p.best.best1RM != null)
  if (lifts.length) {
    blocks.push(card([
      heading('Musculation', 'Force estimée sur la série la plus lourde rapportée à ses répétitions — 90 kg × 10 vaut plus que 100 kg × 1.'),
      ...lifts.sort((a, b) => b.best.best1RM - a.best.best1RM).map((p, i) => React.createElement(Row, {
        key: p.name, i, label: p.name, value: String(p.best.best1RM).replace('.', ','), unit: 'kg',
        detail: `${p.best.topCharge} kg × ${p.best.topReps}`, date: p.best.date,
        flag: p.stalled ? 'plafonne' : null,
      })),
    ], 'lifts'))
  }

  if (tests.profile) {
    blocks.push(card([
      heading('Tests physiques', `Profil ${tests.profile.score}/100 sur ${tests.profile.tested} test${tests.profile.tested > 1 ? 's' : ''} passé${tests.profile.tested > 1 ? 's' : ''}.`),
      ...tests.profile.items.map((t, i) => React.createElement(Row, {
        key: t.testId, i, label: t.label, value: t.best.value, unit: t.unit,
        detail: t.level ? t.level.level : null, date: t.best.date,
        flag: t.freshness.level === 'stale' ? 'à refaire' : null,
      })),
    ], 'tests'))
  }

  if (w.count) {
    blocks.push(card([
      heading('Poids', `${w.count} pesée${w.count > 1 ? 's' : ''} enregistrée${w.count > 1 ? 's' : ''}.`),
      React.createElement(Row, { key: 'min', i: 0, label: 'Poids le plus bas', value: String(w.min).replace('.', ','), unit: 'kg' }),
      React.createElement(Row, { key: 'max', i: 1, label: 'Poids le plus haut', value: String(w.max).replace('.', ','), unit: 'kg' }),
      React.createElement(Row, { key: 'cur', i: 2, label: 'Tendance actuelle', value: String(w.smoothed).replace('.', ','), unit: 'kg', detail: w.verdict ? w.verdict.text : null }),
    ], 'weight'))
  }

  return blocks.length ? React.createElement('div', null, blocks)
    : empty('Aucune donnée de force, de test physique ou de poids.')
}

// ─── Tous les autres sports ──────────────────────────────────
function OtherTab({ db }) {
  const gen = genericAnalysis(db, { days: 730 })
  const withRecords = gen.bySport.filter((s) => s.records.length && !ENDURANCE_SPORTS.has(s.sport))
  if (!withRecords.length) {
    return empty('Aucun record sur les autres sports. Chaque chiffre saisi — buts, plaquages, dénivelé, score — devient un record dès la deuxième séance.')
  }
  return React.createElement('div', null, withRecords.map(sportCard))
}

export default function RecordsSpace({ userId, onClose }) {
  const { db, loading } = useNutritionStore(userId)
  const [tab, setTab] = useState('endurance')

  if (loading) {
    return React.createElement(FlowSpace, { bg: 'progres', title: 'Mes records', onClose },
      React.createElement('div', { style: { padding: 40, textAlign: 'center', color: C.ink3 } }, 'Chargement...'))
  }

  return React.createElement(FlowSpace, { bg: 'progres', title: 'Mes records', onClose },
    React.createElement(SegTabs, {
      value: tab, onChange: setTab,
      tabs: [
        { id: 'endurance', lab: 'Endurance' },
        { id: 'perf', lab: 'Sprint & bloc' },
        { id: 'force', lab: 'Force' },
        { id: 'autres', lab: 'Autres' },
      ],
    }),
    tab === 'endurance' && React.createElement(EnduranceTab, { db }),
    tab === 'perf' && React.createElement(PerfTab, { db }),
    tab === 'force' && React.createElement(StrengthTab, { db }),
    tab === 'autres' && React.createElement(OtherTab, { db }))
}
