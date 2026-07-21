import React, { useState } from 'react'
import { C, Icon, Ring, FlowSpace, isoToday } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { trainingStats, trainingTotals, hydroDay, hydricTargetMl, nutritionDay } from '../train/renfoIntel'
import TrainSpace from '../train/TrainSpace'
import PhysicalTestsSpace, { TESTS_DEF } from '../physical-tests/PhysicalTests'
import SleepSpace from '../health/Sleep'
import { HealthScoreCard, PeakHomeCard } from './cards'

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const h = React.createElement

function sectionTitle(txt, action) {
  return h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 2px 12px' } },
    h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 18, letterSpacing: '-.01em' } }, txt),
    action || null)
}

function iconBadge(name, color) {
  return h('div', { style: { width: 46, height: 46, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${color} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    h(Icon, { name, size: 23, color }))
}

function tile(opts) {
  return h(opts.onClick ? 'button' : 'div', {
    onClick: opts.onClick,
    style: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: C.surface, marginBottom: 10, cursor: opts.onClick ? 'pointer' : 'default' },
  },
    opts.left,
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 16 } }, opts.title),
      opts.sub ? h('div', { style: { fontSize: 13, color: C.ink3, marginTop: 2 } }, opts.sub) : null),
    opts.right || (opts.onClick ? h(Icon, { name: 'arrow', size: 20, color: C.ink3, style: { flex: '0 0 auto' } }) : null))
}

// ============================================================
// "Progrès" — porté depuis l'écran Progress de l'ancienne app :
// série en cours, score santé (5 piliers), objectifs personnels,
// stats d'entraînement (sports/records/tendance course), tests
// physiques, mobilité (score + historique), programme correctif,
// observance compléments et aperçu nutrition/hydratation du jour.
// ============================================================
export default function ProgressSpace({ userId, onClose }) {
  const { db, store, loading } = useNutritionStore(userId)
  const [flow, setFlow] = useState(null)

  if (loading) {
    return h('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  if (flow === 'mobility' || flow === 'program' || flow === 'planner' || flow === 'peak') {
    return h(TrainSpace, { userId, initialTile: flow, embedded: true, onClose: () => setFlow(null) })
  }
  if (flow === 'tests') {
    return h(PhysicalTestsSpace, { userId, onClose: () => setFlow(null) })
  }
  if (flow === 'sleep') {
    return h(SleepSpace, { userId, onClose: () => setFlow(null) })
  }

  const today = isoToday()
  const totals = trainingTotals(db)
  const streak = totals.streak
  const totalMins = totals.week.reduce((a, b) => a + b, 0)
  const maxM = Math.max(...totals.week, 1)
  const doneCount = totals.week.filter((m) => m > 0).length
  const weeklyGoal = db.goals.weeklySessions
  const goalPct = Math.min(100, Math.round((doneCount / weeklyGoal) * 100))
  const hrs = Math.floor(totals.minutesTotal / 60)
  const mins = totals.minutesTotal % 60
  const hoursLabel = mins ? `${hrs}h${String(mins).padStart(2, '0')}` : `${hrs}h`

  // ── Aujourd'hui : hydratation + nutrition ──
  const hyd = hydroDay(db, today)
  const hydTarget = hydricTargetMl(db)
  const nut = nutritionDay(db, today)
  const ft = db.foodTargets || {}
  const kcalTarget = ft.kcal || ft.k || 0
  const protTarget = ft.prot || ft.p || 0
  const hasHyd = hyd.entries > 0
  const hasNut = nut.entries > 0
  const miniBar = (label, val, target, unit, color, extra) => {
    const pct = target > 0 ? Math.min(100, Math.round(val / target * 100)) : 0
    return h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 } },
        h('span', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3 } }, label),
        h('span', { style: { fontSize: 12.5, fontWeight: 700, color } }, target > 0 ? `${val}/${target}` : `${val}`, h('span', { style: { fontSize: 10.5, color: C.ink3, marginLeft: 2 } }, unit))),
      h('div', { style: { height: 7, borderRadius: 999, background: C.surface2, overflow: 'hidden' } },
        h('div', { style: { height: '100%', width: pct + '%', borderRadius: 999, background: color, transition: 'width .4s ease' } })),
      extra ? h('div', { style: { fontSize: 11, color: C.ink3, marginTop: 4 } }, extra) : null)
  }
  let todayBlock = null
  if (hasHyd || hasNut) {
    todayBlock = h('div', null,
      sectionTitle("Aujourd'hui"),
      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: 16, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 10 } },
        hasHyd ? miniBar('Hydratation', hyd.ml, hydTarget, 'ml', '#4a8aa5', hyd.caf ? `Caféine : ${hyd.caf} mg${hyd.caf >= 400 ? ' — limite atteinte' : ''}` : null) : null,
        hasNut && kcalTarget ? miniBar('Calories', Math.round(nut.k), Math.round(kcalTarget), 'kcal', C.primary) : null,
        hasNut && protTarget ? miniBar('Protéines', Math.round(nut.p), Math.round(protTarget), 'g', '#6f8a3a') : null,
        hasNut && !kcalTarget ? h('div', { style: { fontSize: 12.5, color: C.ink3 } }, 'Définis tes objectifs caloriques pour suivre la nutrition.') : null))
  }

  // ── Mes objectifs ──
  const goals = db.customGoals || []
  const goalsDone = goals.filter((g) => g.done).length
  const goalsBlock = goals.length > 0 ? h('div', null,
    sectionTitle('Mes objectifs', h('span', { style: { fontSize: 13.5, color: C.ink3, fontWeight: 600 } }, `${goalsDone}/${goals.length}`)),
    h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden' } },
      goals.map((g, i) => h('button', {
        key: g.id, onClick: () => store.updateGoal(g.id, { done: !g.done }),
        style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 15px', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${C.line}` : 'none', cursor: 'pointer' },
      },
        h('div', { style: { width: 22, height: 22, borderRadius: 7, flex: '0 0 auto', border: g.done ? 'none' : `2px solid ${C.line}`, background: g.done ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          g.done ? h(Icon, { name: 'check', size: 14, color: '#fff' }) : null),
        h('span', { style: { fontSize: 14.5, color: g.done ? C.ink3 : C.ink, textDecoration: g.done ? 'line-through' : 'none', lineHeight: 1.3 } }, g.label))))) : null

  // ── Mobilité ──
  const mob = db.mobility
  const weakZones = mob && mob.zones ? mob.zones.filter((z) => z.val > 0 && z.val < 2).map((z) => z.label) : []
  const mobBlock = h('div', null,
    sectionTitle('Mobilité'),
    tile({
      onClick: () => setFlow('mobility'),
      left: iconBadge('target', C.primary),
      title: mob ? `Score mobilité : ${mob.score}/100` : 'Test de mobilité',
      sub: mob ? (mob.level || 'Refaire le test') : '9 questions · génère ton profil',
      right: mob ? h(Ring, { size: 44, stroke: 6, progress: Math.min(1, mob.score / 100), color: C.primary, track: C.surface2 },
        h('div', { style: { fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.primary } }, mob.score)) : undefined,
    }),
    weakZones.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7, margin: '2px 2px 10px' } },
      h('span', { style: { fontSize: 12.5, color: C.ink3, fontWeight: 600, alignSelf: 'center' } }, 'À travailler :'),
      weakZones.map((z, i) => h('span', { key: i, style: { fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'color-mix(in srgb, #c4a03a 14%, ' + C.surface + ')', color: '#9a7a1a', border: '1px solid color-mix(in srgb, #c4a03a 30%, ' + C.line + ')' } }, z))) : null)

  // ── Évolution mobilité ──
  const mobHist = (db.mobilityHistory || []).slice().sort((a, b) => a.date.localeCompare(b.date))
  let mobEvoBlock = null
  if (mobHist.length >= 2) {
    const mhMax = Math.max(...mobHist.map((e) => e.score), 100)
    const mhLast = mobHist[mobHist.length - 1]
    const mhPrev = mobHist[mobHist.length - 2]
    const mhDelta = mhLast.score - mhPrev.score
    const mhRecent = mobHist.slice(-8)
    const mhBarW = 22, mhGap = 8, mhH = 64
    const mhW = mhRecent.length * (mhBarW + mhGap) - mhGap
    const mhFmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    mobEvoBlock = h('div', null,
      sectionTitle('Évolution mobilité'),
      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: 16, marginBottom: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 } },
          h('div', { style: { fontFamily: C.font, fontSize: 26, fontWeight: 800, color: C.primary } }, mhLast.score),
          h('span', { style: { fontSize: 13, color: C.ink3 } }, '/100'),
          h('span', { style: { fontSize: 12.5, fontWeight: 700, marginLeft: 4, color: mhDelta >= 0 ? '#4a8a6a' : '#c4503a' } }, (mhDelta >= 0 ? '▲+' : '▼') + mhDelta + ' vs précédent')),
        h('svg', { width: '100%', height: mhH + 22, viewBox: `0 0 ${mhW} ${mhH + 22}`, preserveAspectRatio: 'xMidYMax meet' },
          mhRecent.map((e, i) => {
            const bh = Math.max(4, Math.round(e.score / mhMax * mhH))
            const bx = i * (mhBarW + mhGap)
            const isLast = i === mhRecent.length - 1
            return h('g', { key: e.date },
              h('rect', { x: bx, y: mhH - bh, width: mhBarW, height: bh, rx: 4, fill: isLast ? C.primary : `color-mix(in srgb, ${C.primary} 35%, ${C.surface2})` }),
              h('text', { x: bx + mhBarW / 2, y: mhH + 16, textAnchor: 'middle', fontSize: 9.5, fill: C.ink3, fontWeight: 600 }, mhFmtDate(e.date)))
          })),
        h('p', { style: { fontSize: 12, color: C.ink3, marginTop: 10, lineHeight: 1.4 } }, mobHist.length + " test·s enregistré" + (mobHist.length > 1 ? 's' : '') + ' · score auto-évalué, indicatif')))
  }

  // ── Programme correctif ──
  let progBlock = null
  if (db.program && db.program.sessions && db.program.sessions.length) {
    const sess = db.program.sessions
    const dn = db.program.done || {}
    const done = sess.filter((s) => dn[s.id]).length
    const pct = Math.round(done / sess.length * 100)
    progBlock = h('div', null,
      sectionTitle('Programme correctif'),
      tile({
        onClick: () => setFlow('program'),
        left: iconBadge('route', '#6f8a3a'),
        title: `${done}/${sess.length} séances réalisées`,
        sub: db.program.weak && db.program.weak.length ? `Cible : ${db.program.weak.join(', ')}` : 'Programme personnalisé',
        right: h(Ring, { size: 44, stroke: 6, progress: pct / 100, color: '#6f8a3a', track: C.surface2 },
          h('div', { style: { fontFamily: C.font, fontSize: 11, fontWeight: 700, color: '#6f8a3a' } }, pct + '%')),
      }))
  }

  // ── Compléments ──
  let suppBlock = null
  const plan = db.suppPlan || []
  if (plan.length) {
    const taken = ((db.suppTaken || {})[today] || []).filter((id) => plan.includes(id))
    const pct = Math.round(taken.length / plan.length * 100)
    suppBlock = h('div', null,
      sectionTitle('Compléments', h('span', { style: { fontSize: 12, color: C.ink3, fontWeight: 600 } }, 'hors score santé')),
      tile({
        left: h(Ring, { size: 46, stroke: 6, progress: pct / 100, color: '#6f8a3a', track: C.surface2 },
          h('div', { style: { fontFamily: C.font, fontSize: 13, fontWeight: 700, color: '#6f8a3a' } }, taken.length + '/' + plan.length)),
        title: "Pris aujourd'hui",
        sub: pct === 100 ? 'Plan du jour complété' : "Suivi d'observance",
      }))
  }

  // ── Entraînement + Records ──
  const ts = trainingStats(db)
  let trainBlock = null, recordsBlock = null
  if (ts.hasData) {
    const statMini = (big, lab, unit) => h('div', { style: { background: C.surface, borderRadius: C.radiusSm, padding: '16px 12px', border: `1px solid ${C.line}`, textAlign: 'center' } },
      h('div', { style: { fontFamily: C.font, fontSize: 22, fontWeight: 700, lineHeight: 1 } }, big, unit ? h('span', { style: { fontSize: 13, fontWeight: 600, color: C.ink3, marginLeft: 2 } }, unit) : null),
      h('div', { style: { fontSize: 11, color: C.ink3, marginTop: 5, fontWeight: 600 } }, lab))
    const tm = ts.courseTrendMax || 1
    trainBlock = h('div', null,
      sectionTitle('Entraînement', h('button', { onClick: () => setFlow('planner'), style: { fontSize: 13, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' } }, 'Planning')),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 } },
        statMini(ts.weekSessions, 'séances (sem.)'), statMini(ts.weekKm, 'km (sem.)'), statMini(ts.monthSessions, 'séances (mois)'), statMini(ts.monthKm, 'km (mois)')),
      ts.sports.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: 16, marginBottom: 12 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Répartition des sports'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ts.sports.map((sp) => h('div', { key: sp.id, style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('div', { style: { width: 82, fontSize: 13, fontWeight: 600, flex: '0 0 auto' } }, sp.label),
            h('div', { style: { flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: sp.pct + '%', borderRadius: 999, background: sp.color } })),
            h('div', { style: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700, flex: '0 0 auto' } }, sp.count))))) : null,
      tm > 0 ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: 16, marginBottom: 12 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Course · 8 dernières semaines'),
        h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 5, height: 64 } },
          ts.courseTrend.map((km, i) => h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } },
            h('div', { style: { width: '100%', height: 48, display: 'flex', alignItems: 'flex-end' } },
              h('div', { style: { width: '100%', height: `${km > 0 ? Math.max(km / tm * 100, 6) : 0}%`, borderRadius: '5px 5px 0 0', background: i === ts.courseTrend.length - 1 ? '#e07b54' : `color-mix(in srgb,#e07b54 55%,${C.surface2})` } })),
            h('div', { style: { fontSize: 9.5, color: C.ink3, fontWeight: 600 } }, km > 0 ? Math.round(km) : ''))))) : null)

    if (ts.records.length || ts.perche) {
      recordsBlock = h('div', null,
        sectionTitle('Records personnels'),
        h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 10 } },
          ts.perche ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: ts.records.length ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: 'color-mix(in srgb,#7a6fa5 14%,' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'bolt', size: 17, color: '#7a6fa5' })),
            h('div', { style: { flex: 1, fontSize: 14, fontWeight: 600 } }, 'Saut à la perche'),
            h('div', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800, color: '#7a6fa5' } }, ts.perche, h('span', { style: { fontSize: 12, fontWeight: 600, marginLeft: 1 } }, 'm'))) : null,
          ts.records.map((r, i) => h('div', { key: r.name, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderTop: i || ts.perche ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb,${C.primary} 14%,${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'dumbbell', size: 16, color: C.primary })),
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
            h('div', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800, color: C.primary, flex: '0 0 auto' } }, r.charge, h('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 1 } }, 'kg'))))))
    }
  }

  // ── Tests physiques ──
  const TC = '#5b6fa5'
  const allTests = db.physTests || []
  const LABEL = { cooper: 'Cooper 12min', gai_max: 'Gainage max', squat30: 'Squats 30s', souplesse: 'Sit & Reach', push30: 'Pompes 30s' }
  const pp = db.profilePhys || {}
  const sexe = pp.sexe === 'f' ? 'f' : 'h'
  const age = Number(pp.age) || 30
  let testsBlock = null
  if (allTests.length > 0) {
    const byId = {}
    allTests.forEach((t) => { if (!byId[t.testId] || t.date > byId[t.testId].date) byId[t.testId] = t })
    const tids = Object.keys(byId)
    testsBlock = h('div', null,
      sectionTitle('Tests physiques', h('button', { onClick: () => setFlow('tests'), style: { fontSize: 13, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' } }, 'Voir tout')),
      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 10 } },
        tids.map((tid, i) => {
          const e = byId[tid]
          const def = TESTS_DEF.find((d) => d.id === tid)
          const interp = def ? def.interpret(e.value, sexe, age) : { level: 'Acceptable', color: '#c4a03a' }
          return h('div', { key: tid, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderTop: i ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb,${TC} 14%,${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'chart', size: 16, color: TC })),
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, LABEL[tid] || tid),
            h('div', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800, color: interp.color, flex: '0 0 auto' } }, e.value, h('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 1, color: C.ink3 } }, (def && def.unit) || '')))
        })))
  } else {
    testsBlock = h('div', null,
      sectionTitle('Tests physiques'),
      tile({ onClick: () => setFlow('tests'), left: iconBadge('chart', TC), title: 'Passer un test physique', sub: 'Cooper · Gainage · Souplesse · Pompes · Squats' }))
  }

  return h(FlowSpace, { title: 'Tes progrès', onClose, fixed: false },
    h('div', { style: { position: 'relative', minHeight: 150, padding: 22, borderRadius: C.radius, background: C.primary, marginBottom: 18, boxShadow: `0 18px 40px -22px ${C.primary}` } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        h(Ring, { size: 92, stroke: 9, progress: Math.min(1, streak / 14), color: '#fff', track: 'rgba(255,255,255,.25)' },
          h(Icon, { name: 'flame', size: 30, color: '#fff' })),
        h('div', null,
          h('div', { style: { fontFamily: C.font, fontSize: 40, fontWeight: 700, color: '#fff', lineHeight: 1 } }, streak),
          h('div', { style: { color: 'rgba(255,255,255,.88)', fontSize: 15, fontWeight: 600 } }, 'jours de suite 🔥'),
          h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 2 } }, 'Record : ', db.record, ' jours')))),

    h(PeakHomeCard, { db, onPeak: () => setFlow('peak') }),
    h(HealthScoreCard, { db, onSleep: () => setFlow('sleep') }),

    h('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: 20, marginBottom: 14 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 } },
        h('div', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 17 } }, 'Cette semaine'),
        h('div', { style: { fontSize: 13.5, color: C.ink3, fontWeight: 600 } }, doneCount, '/', weeklyGoal, ' séances · ', totalMins, ' min')),
      h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 96 } },
        totals.week.map((m, k) => {
          const done = m > 0
          return h('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 } },
            h('div', { style: { width: '100%', height: 70, display: 'flex', alignItems: 'flex-end' } },
              h('div', { style: { width: '100%', height: `${Math.max(m / maxM * 100, 6)}%`, borderRadius: 7, background: done ? C.primary : C.surface2 } })),
            h('span', { style: { fontSize: 12, fontWeight: 600, color: done ? C.ink : C.ink3 } }, WEEK_DAYS[k]))
        }))),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } },
      [
        { big: totals.sessionsTotal, lab: 'séances au total' },
        { big: hoursLabel, lab: 'temps cumulé' },
        { big: goalPct + '%', lab: 'objectif hebdo' },
      ].map((s, i) => h('div', { key: i, style: { background: C.surface, borderRadius: C.radiusSm, padding: '16px 12px', border: `1px solid ${C.line}`, textAlign: 'center' } },
        h('div', { style: { fontFamily: C.font, fontSize: 24, fontWeight: 700, lineHeight: 1 } }, s.big),
        h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5, fontWeight: 600 } }, s.lab)))),

    todayBlock, goalsBlock, trainBlock, recordsBlock, testsBlock, mobBlock, mobEvoBlock, progBlock, suppBlock,
    h('div', { style: { height: 8 } }))
}
