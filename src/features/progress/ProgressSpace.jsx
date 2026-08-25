import React, { useState } from 'react'
import { C, Icon, Ring, FlowSpace, isoToday, SegPills } from '../health/kit'
import { muscuAnalysis, groupVerdict, exerciseProgress, SERIES_LOW, SERIES_HIGH } from '../train/muscuIntel'
import { testsAnalysis } from '../physical-tests/testsIntel'
import { retroAnalysis, proposalToSessions, proposalStatus } from '../train/retroIntel'
import RecordsSpace from './RecordsSpace'
import { sportMeta } from '../train/renfoIntel'
import { mobilityAnalysis } from '../train/mobilityIntel'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { trainingStats, trainingTotals, weekRetro, weeksTrend, mondayOf, hydroDay, hydricTargetMl, nutritionDay } from '../train/renfoIntel'
import TrainSpace from '../train/TrainSpace'
import PhysicalTestsSpace from '../physical-tests/PhysicalTests'
import SleepSpace from '../health/Sleep'
import HealthHome from '../health/HealthHome'
import { HealthScoreCard, PeakHomeCard } from './cards'
import WeightSpace from '../profil/WeightSpace'
import { weightAnalysis } from '../profil/weightIntel'

// Pilliers/recos renvoient soit un id pilier générique (hydration, load…)
// soit déjà l'id d'espace Santé en français (hydratation, sommeil…) — le
// dispatcher traduit le premier cas et route tout le reste tel quel, vers
// les flows internes existants (mobility/program/planner/peak/tests/sleep)
// ou vers HealthHome pour les autres (hydratation/nutrition/prevention…).
const OWN_FLOWS = new Set(['mobility', 'program', 'planner', 'peak', 'tests', 'recovery'])
const ACTION_DEST = { hydration: 'hydratation', load: 'planner', sleep: 'sleep', sommeil: 'sleep' }

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const h = React.createElement

// Semaines listées dans la rétrospective : la semaine en cours (offset 0)
// et les 11 précédentes — assez pour couvrir un trimestre de recul.
const WEEK_OPTIONS = 12
function fmtWeekLabel(monday) {
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const d = (dt) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${d(monday)} – ${d(sunday)}`
}

// Menu déroulant pour naviguer entre la semaine en cours et les
// précédentes — évite d'avoir à cliquer ‹ › une à une pour retrouver
// une vieille semaine.
function WeekPicker({ offset, setOffset }) {
  const [open, setOpen] = useState(false)
  const thisMonday = mondayOf(new Date())
  const weeks = Array.from({ length: WEEK_OPTIONS }, (_, i) => -i)
  const label = offset === 0 ? 'Cette semaine' : fmtWeekLabel(new Date(thisMonday.getTime() + offset * 7 * 86400000))
  return h('div', { style: { position: 'relative' } },
    h('button', { onClick: () => setOpen(!open), style: { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 } },
      h('span', { style: { fontFamily: C.font, fontWeight: 600, fontSize: 17 } }, label),
      h(Icon, { name: 'next', size: 15, color: C.ink3, style: { transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s ease' } })),
    open && h(React.Fragment, null,
      h('div', { onClick: () => setOpen(false), style: { position: 'fixed', inset: 0, zIndex: 9 } }),
      h('div', { style: { position: 'absolute', top: '100%', left: 0, marginTop: 6, background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, boxShadow: C.shadowLg, zIndex: 10, maxHeight: 260, overflowY: 'auto', minWidth: 190 } },
        weeks.map((wk) => h('button', {
          key: wk,
          onClick: () => { setOffset(wk); setOpen(false) },
          style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: wk === offset ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: wk === offset ? 700 : 500, color: wk === offset ? C.primary : C.ink },
        }, wk === 0 ? 'Cette semaine' : fmtWeekLabel(new Date(thisMonday.getTime() + wk * 7 * 86400000)))))))
}

// Raccourci du suivi de poids sur Progrès : tendance lissée, rythme
// hebdomadaire et avancement vers l'objectif. Invite à démarrer quand
// aucune pesée n'existe, plutôt que de rester une carte vide.
function WeightCard({ db, onOpen }) {
  const a = weightAnalysis(db.weightLog, { goal: Number(db.weightGoal) || 0, heightCm: Number((db.profilePhys || {}).taille) || 0 })
  const goal = Number(db.weightGoal) || 0
  const col = a.rate == null || Math.abs(a.rate) < 0.05 ? C.ink2 : a.rate < 0 ? C.success : C.calorie
  return h('button', {
    onClick: onOpen,
    style: { display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: 16, borderRadius: C.radius, background: C.surface, border: `1px solid ${C.line}`, boxShadow: C.shadowSm, marginBottom: 14, cursor: 'pointer', font: 'inherit', color: 'inherit' },
  },
    h('div', { style: { width: 44, height: 44, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Icon, { name: 'chart', size: 21, color: C.primary })),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3 } }, 'Suivi du poids'),
      a.count
        ? h(React.Fragment, null,
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 } },
            h('span', { style: { fontFamily: C.font, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' } }, a.smoothed.toFixed(1)),
            h('span', { style: { fontSize: 12, color: C.ink3, fontWeight: 700 } }, 'kg'),
            a.rate != null && h('span', { style: { fontSize: 12, fontWeight: 700, color: col, marginLeft: 4 } },
              (a.rate > 0 ? '+' : a.rate < 0 ? '−' : '') + Math.abs(a.rate).toFixed(2) + ' kg/sem.')),
          h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } },
            a.progress != null ? `${a.progress} % de l’objectif (${goal.toFixed(1)} kg)` : `${a.count} pesée${a.count > 1 ? 's' : ''} enregistrée${a.count > 1 ? 's' : ''}`))
        : h('div', { style: { fontSize: 13, color: C.ink3, marginTop: 3 } }, 'Enregistre ta première pesée')),
    h(Icon, { name: 'arrow', size: 18, color: C.ink3, style: { flex: '0 0 auto' } }))
}

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
  const [healthTile, setHealthTile] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  // Profondeur de la courbe de tendance, en semaines.
  const [trendRange, setTrendRange] = useState(8)

  function handleAction(action) {
    if (!action) return
    const dest = ACTION_DEST[action] || action
    if (OWN_FLOWS.has(dest)) { setFlow(dest); return }
    if (dest === 'sleep') { setFlow('sleep'); return }
    setHealthTile(dest)
  }

  if (loading) {
    return h('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  if (healthTile) return h(HealthHome, { userId, initialSpace: healthTile, embedded: true, onClose: () => setHealthTile(null) })

  if (flow === 'mobility' || flow === 'program' || flow === 'planner' || flow === 'peak' || flow === 'recovery') {
    return h(TrainSpace, { userId, initialTile: flow, embedded: true, onClose: () => setFlow(null) })
  }
  if (flow === 'weight') {
    return h(WeightSpace, { db, store, onClose: () => setFlow(null) })
  }
  if (flow === 'records') {
    return h(RecordsSpace, { userId, onClose: () => setFlow(null) })
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
  // Rétrospective : week/items/bySport viennent tous de la même source
  // (weekRetro, planning + sessionLog datés) pour que le graphe, la
  // répartition par sport et la liste des séances restent cohérents
  // entre eux, quelle que soit la semaine affichée.
  const thisMonday = mondayOf(new Date())
  const selectedMonday = new Date(thisMonday.getTime() + weekOffset * 7 * 86400000)
  const retro = weekRetro(db, selectedMonday)
  const prevRetro = weekRetro(db, new Date(selectedMonday.getTime() - 7 * 86400000))
  const trend = weeksTrend(db, trendRange)
  // La rétrospective ne comptait que des minutes : une heure de
  // récupération et une heure de match pesaient pareil, l'écart au plan
  // n'apparaissait pas, et rien ne disait ce qu'on avait fait de mieux.
  const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const story = retroAnalysis(db, { weekOf: isoOf(selectedMonday), sportMeta })
  const selectedWeek = retro.week
  const totalMins = retro.total
  const maxM = Math.max(...selectedWeek, 1)
  // Nombre de séances réellement réalisées, pas de jours actifs : deux
  // séances le même jour comptent pour deux (l'objectif hebdo du profil
  // est bien exprimé en séances).
  const doneCount = retro.count
  const weeklyGoal = db.goals.weeklySessions
  const goalPct = weeklyGoal ? Math.min(100, Math.round((doneCount / weeklyGoal) * 100)) : 0
  const vsPrevDelta = retro.total - prevRetro.total
  const vsPrevPct = prevRetro.total ? Math.round(vsPrevDelta / prevRetro.total * 100) : null
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
        hasNut && protTarget ? miniBar('Protéines', Math.round(nut.p), Math.round(protTarget), 'g', C.carb) : null,
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
  // Seul le score global était tracé. Il peut rester plat pendant qu'une
  // zone progresse et qu'une autre se dégrade — c'est ce détail qui dit
  // où porter le travail.
  const mAna = mobilityAnalysis(db)
  const mobHist = mAna.history
  let mobEvoBlock = null
  if (mobHist.length >= 1) {
    const ZC = { up: C.success, down: '#c4503a', flat: C.ink3 }
    const VCOL = (v) => (v <= 1 ? '#c4503a' : v === 2 ? C.warn : C.success)
    const mhLast = mobHist[mobHist.length - 1]
    const g = mAna.trend
    mobEvoBlock = h('div', null,
      sectionTitle('Mobilité par zone'),
      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: 16, marginBottom: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 } },
          h('div', { style: { fontFamily: C.font, fontSize: 26, fontWeight: 800, color: C.primary } }, mhLast.score),
          h('span', { style: { fontSize: 13, color: C.ink3 } }, '/100'),
          g ? h('span', { style: { fontSize: 12.5, fontWeight: 700, marginLeft: 4, color: g.delta >= 0 ? C.success : '#c4503a' } },
            (g.delta >= 0 ? '▲+' : '▼') + g.delta + ' vs précédent') : null),
        h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 14 } }, mAna.freshness.text),
        mAna.zones.map((z, i) => h('div', { key: z.id, style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 } },
          h('div', { style: { fontSize: 12, color: C.ink2, fontWeight: 600, flex: '0 0 108px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, z.label),
          h('div', { style: { flex: 1, display: 'flex', gap: 3 } },
            [1, 2, 3].map((n) => h('div', { key: n, style: { flex: 1, height: 8, borderRadius: 999, background: z.last.val >= n ? VCOL(z.last.val) : C.surface2 } }))),
          z.count > 1 && z.dir !== 'flat'
            ? h('span', { style: { fontSize: 11, fontWeight: 800, color: ZC[z.dir], flex: '0 0 auto' } }, z.dir === 'up' ? '▲' : '▼')
            : h('span', { style: { flex: '0 0 auto', width: 8 } }),
          z.stuck ? h('span', { style: { fontSize: 10, fontWeight: 700, color: '#c4503a', flex: '0 0 auto' } }, 'bloquée') : null))),

      mAna.corroboration.length ? h('div', { style: { background: `color-mix(in srgb, #c4503a 8%, ${C.surface})`, border: '1px solid color-mix(in srgb, #c4503a 26%, ' + C.line + ')', borderRadius: C.radiusSm, padding: '14px 15px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 } }, 'Confirmé par plusieurs sources'),
        mAna.corroboration.map((c) => h('div', { key: c.id, style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 4 } },
          h('strong', null, c.label), ' — ', c.sources.join(', ')))) : null,

      mAna.program ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '14px 15px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 } }, 'Programme ciblé'),
        h('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } },
          `${mAna.program.done} séance sur ${mAna.program.sessions} réalisée`
          + (mAna.program.ageDays != null ? ` · créé il y a ${mAna.program.ageDays} jours` : '')
          + (mAna.program.stillRelevant ? '' : ' · ne cible plus tes zones les plus raides'))) : null,

      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 9 } }, 'Ce qu’on en retient'),
        mAna.tips.map((t, i) => h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: i ? 8 : 0 } },
          h('span', { style: { color: C.primary, fontWeight: 800, flex: '0 0 auto' } }, '•'),
          h('span', null, t)))))
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
        left: iconBadge('route', C.carb),
        title: `${done}/${sess.length} séances réalisées`,
        sub: db.program.weak && db.program.weak.length ? `Cible : ${db.program.weak.join(', ')}` : 'Programme personnalisé',
        right: h(Ring, { size: 44, stroke: 6, progress: pct / 100, color: C.carb, track: C.surface2 },
          h('div', { style: { fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.carb } }, pct + '%')),
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
        left: h(Ring, { size: 46, stroke: 6, progress: pct / 100, color: C.carb, track: C.surface2 },
          h('div', { style: { fontFamily: C.font, fontSize: 13, fontWeight: 700, color: C.carb } }, taken.length + '/' + plan.length)),
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
        h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Répartition des sports · depuis le début'),
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

    const voirTout = h('button', {
      onClick: () => setFlow('records'),
      style: { fontSize: 13, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' },
    }, 'Tout voir')
    if (ts.records.length || ts.perche) {
      recordsBlock = h('div', null,
        sectionTitle('Records personnels', voirTout),
        h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 10 } },
          ts.perche ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: ts.records.length ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: 'color-mix(in srgb,#7a6fa5 14%,' + C.surface + ')', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'bolt', size: 17, color: '#7a6fa5' })),
            h('div', { style: { flex: 1, fontSize: 14, fontWeight: 600 } }, 'Saut à la perche'),
            h('div', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800, color: '#7a6fa5' } }, ts.perche, h('span', { style: { fontSize: 12, fontWeight: 600, marginLeft: 1 } }, 'm'))) : null,
          ts.records.map((r, i) => h('div', { key: r.name, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderTop: i || ts.perche ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb,${C.primary} 14%,${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'dumbbell', size: 16, color: C.primary })),
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
            h('div', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800, color: C.primary, flex: '0 0 auto' } }, r.charge, h('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 1 } }, 'kg'))))))
    } else {
      recordsBlock = h('div', null,
        sectionTitle('Records personnels', voirTout),
        tile({
          onClick: () => setFlow('records'),
          left: iconBadge('trophy', C.primary),
          title: 'Mes records',
          sub: 'Course, sprint, escalade, force, tests',
        }))
    }
  }

  // ── Musculation : volume par muscle, équilibre, progression ──
  // Tout était enregistré série par série sans jamais être relu : ni le
  // volume par groupe, ni la répartition poussée/tirage, ni la
  // progression réelle d'un exercice.
  let muscuBlock = null
  const mus = muscuAnalysis(db, { days: 28 })
  if (mus.sessions > 0) {
    const maxSeries = Math.max(...mus.volumes.map((v) => v.seriesPerWeek), SERIES_LOW)
    const VCOL = { low: C.warn, ok: C.success, high: '#c4503a' }
    // Les trois exercices les plus travaillés, avec leur progression réelle
    // en force estimée — la seule façon de comparer 90 kg × 10 et 100 kg × 1.
    const tops = mus.tracked.slice(0, 3)
      .map((t) => exerciseProgress(db, t.name, { days: 180 }))
      .filter((x) => x && x.sessions >= 2)

    muscuBlock = h('div', null,
      sectionTitle('Musculation · 28 jours'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 } },
        [
          { big: String(mus.sessions), lab: 'séances' },
          { big: String(mus.totalSeries), lab: 'séries' },
          { big: mus.tonnage >= 1000 ? Math.round(mus.tonnage / 1000) + ' t' : mus.tonnage + ' kg', lab: 'tonnage' },
        ].map((x, i) => h('div', { key: i, style: { background: C.surface, borderRadius: C.radiusSm, padding: '14px 10px', border: `1px solid ${C.line}`, textAlign: 'center' } },
          h('div', { style: { fontFamily: C.font, fontSize: 21, fontWeight: 800, lineHeight: 1 } }, x.big),
          h('div', { style: { fontSize: 11, color: C.ink3, marginTop: 5, fontWeight: 600 } }, x.lab)))),

      mus.volumes.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Séries par semaine et par muscle'),
        h('div', { style: { fontSize: 11.5, color: C.ink3, margin: '4px 0 11px', lineHeight: 1.45 } }, `Repère d’usage courant : ${SERIES_LOW} à ${SERIES_HIGH} séries hebdomadaires par groupe.`),
        mus.volumes.map((v) => {
          const vd = groupVerdict(v.seriesPerWeek)
          return h('div', { key: v.group, style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 } },
            h('div', { style: { fontSize: 12, color: C.ink2, fontWeight: 600, flex: '0 0 94px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, v.group),
            h('div', { style: { flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: 'hidden' } },
              h('div', { style: { width: Math.round(v.seriesPerWeek / maxSeries * 100) + '%', height: '100%', borderRadius: 999, background: VCOL[vd.level] } })),
            h('div', { style: { fontSize: 12, fontWeight: 700, color: VCOL[vd.level], flex: '0 0 34px', textAlign: 'right' } }, String(v.seriesPerWeek).replace('.', ',')))
        })) : null,

      mus.balance && (mus.balance.push + mus.balance.pull > 0 || mus.balance.lower > 0) ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 } }, 'Équilibre'),
        [
          { a: mus.balance.push, b: mus.balance.pull, la: 'Poussée', lb: 'Tirage' },
          { a: mus.balance.upper, b: mus.balance.lower, la: 'Haut', lb: 'Bas' },
        ].map((r, i) => {
          const tot = r.a + r.b
          return h('div', { key: i, style: { marginBottom: i ? 0 : 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.ink2, fontWeight: 600, marginBottom: 5 } },
              h('span', null, r.la + ' ' + r.a), h('span', null, r.b + ' ' + r.lb)),
            h('div', { style: { display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: C.surface2 } },
              h('div', { style: { width: (tot ? r.a / tot * 100 : 50) + '%', background: C.primary } }),
              h('div', { style: { flex: 1, background: `color-mix(in srgb, ${C.primary} 32%, ${C.surface2})` } })))
        }),
        (mus.balance.flags || []).map((f, i) => h('div', { key: f.id, style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.45, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` } }, f.text))) : null,

      tops.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Force estimée'),
        h('div', { style: { fontSize: 11.5, color: C.ink3, margin: '4px 0 10px', lineHeight: 1.45 } }, 'Calculée sur la série la plus lourde rapportée à ses répétitions, pour comparer ce qui est comparable.'),
        tops.map((t, i) => h('div', { key: t.name, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.name),
            h('div', { style: { fontSize: 11.5, color: t.stalled ? C.warn : C.ink3, marginTop: 2 } },
              t.stalled ? 'plafonne sur les dernières séances' : `${t.gain >= 0 ? '+' : '−'}${String(Math.abs(t.gain)).replace('.', ',')} kg sur ${t.sessions} séances`)),
          h('div', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800, color: t.stalled ? C.warn : C.primary, flex: '0 0 auto' } },
            String(t.last.best1RM).replace('.', ','), h('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 1 } }, 'kg'))))) : null,

      mus.tips.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 9 } }, 'Ce qu’on en retient'),
        mus.tips.map((t, i) => h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: i ? 8 : 0 } },
          h('span', { style: { color: C.primary, fontWeight: 800, flex: '0 0 auto' } }, '•'),
          h('span', null, t)))) : null)
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
    // Seule la valeur la plus récente était relue : « Cooper 2400 m,
    // Bien », sans dire si c'était mieux ou moins bien qu'avant, ni depuis
    // quand la mesure datait. Un test d'il y a huit mois s'affichait
    // exactement comme celui d'hier.
    const tAna = testsAnalysis(db, { sexe, age })
    const DIR_COL = { up: C.success, down: '#c4503a', flat: C.ink3 }
    const FRESH_COL = { fresh: C.ink3, due: C.warn, stale: '#c4503a', absent: C.ink3 }
    testsBlock = h('div', null,
      sectionTitle('Tests physiques', h('button', { onClick: () => setFlow('tests'), style: { fontSize: 13, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' } }, 'Voir tout')),
      tAna.profile ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h(Ring, { size: 62, stroke: 7, progress: tAna.profile.score / 100, color: TC },
          h('span', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800, color: TC } }, tAna.profile.score)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 13.5, fontWeight: 700, color: C.ink } }, 'Profil physique'),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3, lineHeight: 1.45 } },
            `${tAna.profile.tested}/${tAna.profile.total} tests passés`
            + (tAna.profile.spread >= 2 ? ` · ${tAna.profile.strongest.label.toLowerCase()} devant ${tAna.profile.weakest.label.toLowerCase()}` : '')))) : null,
      h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 10 } },
        (tAna.profile ? tAna.profile.items : []).map((it, i) => {
          const ch = it.change
          const fr = it.freshness
          return h('div', { key: it.testId, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderTop: i ? `1px solid ${C.line}` : 'none' } },
            h('div', { style: { width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb,${TC} 14%,${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h(Icon, { name: 'chart', size: 16, color: TC })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, it.label),
              h('div', { style: { fontSize: 11, color: FRESH_COL[fr.level], marginTop: 2 } },
                (ch && ch.dir !== 'flat'
                  ? `${ch.delta > 0 ? '+' : '−'}${Math.abs(ch.delta)} ${it.unit} vs précédent · `
                  : it.count > 1 ? 'stable · ' : '')
                + (fr.level === 'due' || fr.level === 'stale' ? `à refaire (${fr.days} j)` : `il y a ${fr.days} j`))),
            ch && ch.dir !== 'flat' ? h('span', { style: { fontSize: 12, fontWeight: 800, color: DIR_COL[ch.dir], flex: '0 0 auto' } }, ch.dir === 'up' ? '▲' : '▼') : null,
            h('div', { style: { fontFamily: C.font, fontSize: 16, fontWeight: 800, color: it.level ? it.level.color : C.ink, flex: '0 0 auto' } },
              it.last.value, h('span', { style: { fontSize: 11.5, fontWeight: 600, marginLeft: 2 } }, it.unit)))
        })),
      tAna.tips.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '15px 16px', marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 9 } }, 'Ce qu’on en retient'),
        tAna.tips.map((x, i) => h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: i ? 8 : 0 } },
          h('span', { style: { color: TC, fontWeight: 800, flex: '0 0 auto' } }, '•'),
          h('span', null, x)))) : null)
  } else {
    testsBlock = h('div', null,
      sectionTitle('Tests physiques'),
      tile({ onClick: () => setFlow('tests'), left: iconBadge('chart', TC), title: 'Passer un test physique', sub: 'Cooper · Gainage · Souplesse · Pompes · Squats' }))
  }

  // Le grand titre est rendu par FlowSpace : on enchaîne directement sur
  // les deux cartes de tête (volume de la semaine, série en cours).
  return h(FlowSpace, { title: 'Tes progrès', onClose, fixed: false, bg: 'progres' },
    // Carte d'en-tête d'origine : l'anneau de série sur aplat terracotta,
    // le compte de jours en grand et le record dessous. Le volume de la
    // semaine et l'objectif de séances restent lisibles juste en dessous,
    // sur la ligne du sélecteur de semaine.
    h('div', { style: { position: 'relative', minHeight: 150, padding: 22, borderRadius: C.radius, background: C.primary, marginBottom: 18, boxShadow: `0 18px 40px -22px ${C.primary}` } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        h(Ring, { size: 92, stroke: 9, progress: Math.min(1, streak / 14), color: '#fff', track: 'rgba(255,255,255,.25)' },
          h(Icon, { name: 'flame', size: 30, color: '#fff' })),
        h('div', null,
          h('div', { style: { fontFamily: C.font, fontSize: 40, fontWeight: 700, color: '#fff', lineHeight: 1 } }, streak),
          h('div', { style: { color: 'rgba(255,255,255,.88)', fontSize: 15, fontWeight: 600 } }, 'jours de suite 🔥'),
          h('div', { style: { color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 2 } }, 'Record : ', db.record, ' jours')))),

    h(WeightCard, { db, onOpen: () => setFlow('weight') }),
    h(PeakHomeCard, { db, onPeak: () => setFlow('peak') }),
    h(HealthScoreCard, { db, onAction: handleAction }),

    h('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: 20, marginBottom: 14 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 } },
        h(WeekPicker, { offset: weekOffset, setOffset: setWeekOffset }),
        h('div', { style: { fontSize: 13.5, color: C.ink3, fontWeight: 600 } }, doneCount, '/', weeklyGoal, ' séances · ', totalMins, ' min')),

      // Le récit de la semaine : ce qu'on vient chercher en ouvrant une
      // rétrospective, et qui ne s'y trouvait pas.
      story.story.length ? h('div', { style: { background: C.surface2, borderRadius: C.radiusSm, padding: '13px 15px', marginBottom: 14 } },
        story.story.map((line, i) => h('div', {
          key: i,
          style: {
            fontSize: i === 0 ? 13.5 : 12.5,
            fontWeight: i === 0 ? 700 : 400,
            color: i === 0 ? C.ink : C.ink2,
            lineHeight: 1.5, marginTop: i ? 6 : 0,
          },
        }, line))) : null,

      // La semaine proposée, jour par jour. Une fourchette de charge ne se
      // planifie pas : il faut le jour, le sport, les minutes et l'intensité.
      story.proposal ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 14 } },
        h('div', { style: { padding: '12px 14px 8px' } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Ta semaine proposée'),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3, lineHeight: 1.45 } },
            story.proposal.total, ' points visés · ', story.proposal.basedOn, '.'),
          story.proposal.taper ? h('div', { style: { fontSize: 11.5, color: C.warn, marginTop: 5, lineHeight: 1.45, fontWeight: 600 } }, story.proposal.taper.text) : null),
        story.proposal.days.map((d, i) => h('div', {
          key: d.date,
          style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 14px', borderTop: `1px solid ${C.line}`, background: d.session && d.session.hard ? `color-mix(in srgb, ${C.primary} 5%, transparent)` : 'transparent' },
        },
          h('div', { style: { width: 62, flex: '0 0 auto', fontSize: 12, fontWeight: 700, color: d.session ? C.ink : C.ink3 } }, d.label),
          h('div', { style: { flex: 1, minWidth: 0 } },
            d.session
              ? h('div', { style: { fontSize: 12.5, color: C.ink, lineHeight: 1.45, fontWeight: d.session.hard ? 700 : 400 } },
                sportMeta(d.session.sport).label, ' · ', d.session.mins, ' min · RPE ', d.session.rpe,
                d.session.hard ? h('span', { style: { color: C.primary, fontWeight: 700 } }, ' · la dure') : null)
              : h('div', { style: { fontSize: 12.5, color: C.ink3 } }, 'Repos'),
            d.kcal ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2 } },
              d.kcal, ' kcal · ', d.gluc, ' g de glucides') : null))),
        story.proposal.shortText ? h('div', { style: { padding: '10px 14px', borderTop: `1px solid ${C.line}`, fontSize: 11.5, color: C.ink3, lineHeight: 1.5 } }, story.proposal.shortText) : null,
        story.proposal.sleep ? h('div', { style: { padding: '10px 14px', borderTop: `1px solid ${C.line}`, fontSize: 11.5, color: C.ink3, lineHeight: 1.5 } },
          'Sommeil à viser : ', String(story.proposal.sleep.target).replace('.', ','), ' h par nuit, contre ',
          String(story.proposal.sleep.mean).replace('.', ','), ' h la semaine écoulée.') : null,

        // Une semaine proposée qu'il faut retaper ne sert pas à grand-chose.
        (() => {
          const st = proposalStatus(db, story.proposal)
          if (st.can) {
            return h('div', { style: { padding: '12px 14px', borderTop: `1px solid ${C.line}` } },
              h('button', {
                onClick: () => {
                  const add = proposalToSessions(story.proposal)
                  if (!add.length) return
                  store.set((prev) => ({ planningSessions: [...(prev.planningSessions || []), ...add] }))
                  setFlow('planner')
                },
                style: { width: '100%', padding: '12px', borderRadius: C.radiusSm, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
              }, 'Inscrire ces ', st.count, ' séances au planning'))
          }
          return st.reason && st.existing
            ? h('div', { style: { padding: '10px 14px', borderTop: `1px solid ${C.line}`, fontSize: 11.5, color: C.ink3, lineHeight: 1.5 } }, st.reason)
            : null
        })()) : null,

      // Les consignes chiffrées de la semaine qui vient. Une rétrospective
      // qui s'arrête au constat laisse le travail à faire.
      story.prescription && story.prescription.length ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 14 } },
        h('div', { style: { padding: '12px 14px 8px' } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'Pour la semaine qui vient'),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3, lineHeight: 1.45 } }, 'Chaque consigne est tirée de la semaine écoulée, et dit d’où elle sort.')),
        story.prescription.map((p, i) => {
          const col = p.level === 'warn' ? C.warn : p.level === 'ok' ? C.success : C.primary
          return h('div', { key: p.id, style: { padding: '11px 14px', borderTop: `1px solid ${C.line}` } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 } },
              h('span', { style: { flex: 1, fontSize: 13, fontWeight: 700 } }, p.label),
              h('span', { style: { fontFamily: C.font, fontSize: 15, fontWeight: 800, color: col } }, p.value),
              p.unit ? h('span', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 600 } }, p.unit) : null),
            p.detail ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 4 } }, p.detail) : null,
            h('div', { style: { fontSize: 12, color: C.ink2, lineHeight: 1.5 } }, p.why))
        })) : null,

      // Ce qu'il faut retenir, en une phrase : une rétrospective qui
      // n'aboutit à rien se lit une fois.
      story.takeaway && story.takeaway.text ? (() => {
        const col = story.takeaway.level === 'warn' ? C.warn : story.takeaway.level === 'ok' ? C.success : C.primary
        return h('div', { style: { padding: '12px 14px', borderRadius: C.radiusSm, marginBottom: 14, background: `color-mix(in srgb, ${col} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${col} 28%, ${C.line})` } },
          h('div', { style: { fontSize: 11.5, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 } }, 'À retenir'),
          h('div', { style: { fontSize: 12.5, color: C.ink2, lineHeight: 1.5 } }, story.takeaway.text))
      })() : null,

      // La semaine jour par jour : on veut la retrouver telle qu'elle s'est
      // passée, pas seulement son total.
      story.detail && story.detail.some((d) => d.active || d.sleep || d.kcal) ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, overflow: 'hidden', marginBottom: 14 } },
        h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', padding: '12px 14px 8px' } }, 'Jour par jour'),
        story.detail.map((d, i) => {
          const jour = new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
          const bits = []
          if (d.sleep != null) bits.push(String(d.sleep).replace('.', ',') + ' h')
          if (d.kcal) bits.push(d.kcal + ' kcal')
          if (d.feels != null) bits.push(Math.round(d.feels) + ' °C')
          if (d.steps) bits.push(Math.round(d.steps / 100) / 10 + ' k pas')
          return h('div', { key: d.date, style: { padding: '9px 14px', borderTop: i ? `1px solid ${C.line}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' } },
            h('div', { style: { width: 54, flex: '0 0 auto', fontSize: 12, fontWeight: 700, color: d.active ? C.ink : C.ink3, textTransform: 'capitalize' } }, jour),
            h('div', { style: { flex: 1, minWidth: 0 } },
              d.sessions.length
                ? d.sessions.map((sx) => h('div', { key: sx.id, style: { fontSize: 12.5, color: C.ink, lineHeight: 1.45 } },
                  sx.label, ' · ', sx.mins, ' min', sx.rpe ? ` · RPE ${sx.rpe}` : ''))
                : h('div', { style: { fontSize: 12.5, color: C.ink3 } }, d.missed ? `${d.missed} prévue${d.missed > 1 ? 's' : ''}, non faite${d.missed > 1 ? 's' : ''}` : 'Repos'),
              bits.length ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2 } }, bits.join(' · ')) : null))
        })) : null,

      // Chaque dimension comparée à l'habitude : la charge seule ne dit pas
      // qu'on a moins dormi et moins mangé pour le même travail.
      story.dimensions && story.dimensions.some((d) => d.pct != null) ? h('div', { style: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '12px 14px', marginBottom: 14 } },
        h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } },
          'Contre tes ', 4, ' dernières semaines'),
        story.dimensions.filter((d) => d.pct != null).map((d, i) => {
          const good = d.dir === 'up' ? d.pct > 0 : null
          const col = d.level === 'ok' ? C.ink3 : good === null ? C.ink : good ? C.success : C.warn
          return h('div', { key: d.key, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
            h('span', { style: { flex: 1, fontSize: 12.5, fontWeight: 600 } }, d.label),
            h('span', { style: { fontSize: 12.5, color: C.ink2 } }, String(d.value).replace('.', ','), d.unit ? ' ' + d.unit : ''),
            h('span', { style: { width: 54, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: col } }, (d.pct > 0 ? '+' : '') + d.pct, ' %'))
        })) : null,

      // Charge et écart à l'habitude, que le total de minutes ne dit pas.
      story.compare.meanBase ? h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        [
          { v: String(story.consistency.total), l: 'charge' },
          { v: story.compare.basePct == null ? '—' : (story.compare.basePct > 0 ? '+' : '') + story.compare.basePct + ' %', l: 'vs habituel',
            c: story.compare.basePct == null ? C.ink3 : Math.abs(story.compare.basePct) < 20 ? C.ink : story.compare.basePct > 0 ? C.warn : C.ink3 },
          { v: story.planFit.pct == null ? '—' : story.planFit.pct + ' %', l: 'plan tenu',
            c: story.planFit.pct == null ? C.ink3 : story.planFit.pct >= 80 ? C.success : C.warn },
          { v: String(story.consistency.rest), l: 'jours off' },
        ].map((x, i) => h('div', { key: i, style: { flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: C.radiusSm, padding: '11px 8px', textAlign: 'center' } },
          h('div', { style: { fontFamily: C.font, fontSize: 17, fontWeight: 800, color: x.c || C.ink } }, x.v),
          h('div', { style: { fontSize: 10, color: C.ink3, marginTop: 2, fontWeight: 600 } }, x.l)))) : null,
      h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 96, marginBottom: 14 } },
        selectedWeek.map((m, k) => {
          const done = m > 0
          return h('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 } },
            h('div', { style: { width: '100%', height: 70, display: 'flex', alignItems: 'flex-end' } },
              h('div', { style: { width: '100%', height: `${Math.max(m / maxM * 100, 6)}%`, borderRadius: 8, background: done ? `linear-gradient(180deg, ${C.success} 0%, color-mix(in srgb, ${C.success} 72%, #fff) 100%)` : C.surface2, transition: 'height .4s ease' } })),
            h('span', { style: { fontSize: 12, fontWeight: 600, color: done ? C.ink : C.ink3 } }, WEEK_DAYS[k]))
        })),

      // Comparaison vs la semaine précédente.
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: C.radiusXs, background: C.surface2, marginBottom: 14 } },
        h(Icon, { name: 'chart', size: 14, color: vsPrevPct == null ? C.ink3 : vsPrevDelta >= 0 ? C.success : C.danger, style: vsPrevPct != null && vsPrevDelta < 0 ? { transform: 'scaleY(-1)' } : undefined }),
        h('span', { style: { fontSize: 12.5, color: C.ink2 } },
          vsPrevPct == null
            ? (prevRetro.total === 0 ? 'Pas de séance la semaine précédente pour comparer.' : `${prevRetro.total} min la semaine précédente.`)
            : h(React.Fragment, null,
              // Un delta non nul qui s'arrondit à 0 % afficherait "0 %" à côté
              // d'une flèche de baisse : on bascule sur les minutes dans ce cas.
              h('strong', { style: { color: vsPrevDelta >= 0 ? C.success : C.danger } },
                vsPrevPct === 0 && vsPrevDelta !== 0
                  ? `${vsPrevDelta > 0 ? '+' : '−'}${Math.abs(vsPrevDelta)} min`
                  : `${vsPrevDelta >= 0 ? '+' : '−'}${Math.abs(vsPrevPct)}%`),
              ` vs semaine précédente (${prevRetro.total} min).`))),

      // Répartition par sport / type de séance.
      retro.bySport.length > 0 && h('div', { style: { marginBottom: 14 } },
        h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Répartition'),
        h('div', { style: { display: 'flex', borderRadius: 999, overflow: 'hidden', height: 8, marginBottom: 8 } },
          retro.bySport.map((s, i) => h('div', { key: i, style: { width: `${s.pct}%`, background: s.color } }))),
        retro.bySport.map((s, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' } },
          h('div', { style: { width: 8, height: 8, borderRadius: 999, background: s.color, flex: '0 0 auto' } }),
          h('span', { style: { flex: 1, fontSize: 13, color: C.ink } }, s.label),
          h('span', { style: { fontSize: 12.5, color: C.ink3, fontWeight: 600 } }, s.mins, ' min · ', s.pct, '%')))),

      // Détail des séances de la semaine sélectionnée.
      retro.items.length > 0 && h('div', null,
        h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 } }, 'Séances'),
        retro.items.map((it, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
          h('div', { style: { width: 8, height: 8, borderRadius: 999, background: it.color, flex: '0 0 auto' } }),
          h('span', { style: { fontSize: 12.5, color: C.ink3, width: 68, flex: '0 0 auto' } }, new Date(it.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })),
          h('span', { style: { flex: 1, fontSize: 13.5, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, it.label),
          h('span', { style: { fontSize: 12.5, color: C.ink3, fontWeight: 600 } }, it.mins, ' min'))))),

    // Tendance sur 8 semaines — pour voir la progression d'un coup d'œil.
    h('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, padding: 20, marginBottom: 14 } },
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 12 } }, 'Tendance'),
      h(SegPills, {
        options: [{ id: 4, label: '1 mois' }, { id: 8, label: '2 mois' }, { id: 12, label: '3 mois' }, { id: 26, label: '6 mois' }],
        value: trendRange,
        // Ne touche pas à weekOffset : changer la profondeur du graphe ne
        // doit pas changer la semaine détaillée affichée au-dessus.
        onChange: setTrendRange,
        tint: C.success,
        style: { marginBottom: 14 },
      }),
      // Au-delà de 12 semaines les barres deviennent trop fines pour porter
      // une étiquette lisible : on resserre l'écart et on n'étiquette plus
      // qu'une barre sur quatre.
      h('div', { style: { display: 'flex', gap: trend.length > 12 ? 2 : 6, alignItems: 'flex-end', height: 60 } },
        (() => {
          const maxT = Math.max(...trend.map((w) => w.total), 1)
          const dense = trend.length > 12
          return trend.map((w, i) => h('button', {
            key: i,
            onClick: () => setWeekOffset(w.offset),
            title: `${w.total} min`,
            style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
          },
            h('div', { style: { width: '100%', height: 44, display: 'flex', alignItems: 'flex-end' } },
              h('div', { style: { width: '100%', height: `${Math.max(w.total / maxT * 100, w.total > 0 ? 8 : 3)}%`, borderRadius: 4, background: w.offset === weekOffset ? C.success : (w.total > 0 ? `color-mix(in srgb, ${C.success} 35%, ${C.surface2})` : C.surface2), transition: 'height .4s ease' } })),
            h('span', { style: { fontSize: 10, fontWeight: w.offset === weekOffset ? 700 : 500, color: w.offset === weekOffset ? C.success : C.ink3, whiteSpace: 'nowrap' } },
              w.offset === weekOffset || !dense || i % 4 === 0 ? (w.offset === 0 ? 'auj.' : `${w.offset}s`) : ' '))
          )
        })())),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } },
      [
        { big: totals.sessionsTotal, lab: 'séances au total' },
        { big: hoursLabel, lab: 'temps cumulé' },
        { big: goalPct + '%', lab: 'objectif hebdo' },
      ].map((s, i) => h('div', { key: i, style: { background: C.surface, borderRadius: C.radiusSm, padding: '16px 12px', border: `1px solid ${C.line}`, textAlign: 'center' } },
        h('div', { style: { fontFamily: C.font, fontSize: 24, fontWeight: 700, lineHeight: 1 } }, s.big),
        h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5, fontWeight: 600 } }, s.lab)))),

    todayBlock, goalsBlock, trainBlock, recordsBlock, muscuBlock, testsBlock, mobBlock, mobEvoBlock, progBlock, suppBlock,
    h('div', { style: { height: 8 } }))
}
