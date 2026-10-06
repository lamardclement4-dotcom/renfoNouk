import React, { useState } from 'react'
import { supabase } from '../../lib'
import { C, Icon, FlowSpace, THEMES, THEME_KEY, applyTheme, normalizeTheme, PALETTES, PALETTE_KEY, applyPalette, normalizePalette } from '../health/kit'
import { useNutritionStore } from '../nutrition/useNutritionStore'
import { inferUserLevel, trainingTotals } from '../train/renfoIntel'
import { SPORTS } from '../train/trainData'
import TrainSpace from '../train/TrainSpace'
import WeightSpace from './WeightSpace'
import { exporterDonnees } from './exportDonnees'

const h = React.createElement

// Mêmes zones que l'onboarding (App.jsx ZONES) et le bandeau de précaution
// affiché sur l'écran de séance (Detail.jsx ZONE_LABELS).
const ZONES = [
  { id: 'genoux', label: 'Genoux' },
  { id: 'dos', label: 'Dos / lombaires' },
  { id: 'epaules', label: 'Épaules' },
  { id: 'chevilles', label: 'Chevilles' },
  { id: 'hanches', label: 'Hanches' },
  { id: 'poignets', label: 'Poignets / coudes' },
  { id: 'cou', label: 'Cou / cervicales' },
]

// Avatar : simple galerie d'emoji stockée telle quelle sous phys.avatar
// (comme mobility/prevention/etc., pas de colonne dédiée nécessaire).
// Pas de upload de photo : aucun stockage de fichiers côté app statique.
const AVATARS = ['🏃', '🚴', '🏋️', '🧘', '🥊', '🏊', '⛷️', '🤸', '🏸', '⚽', '🎾', '🧗', '🏀', '🤾', '🚵', '🏄', '😊', '😎', '🔥', '💪']

const LEVEL_OPTS = [
  { id: 'debutant', label: 'Débutant', desc: 'Tu commences ou reprends une activité régulière', tint: 'var(--ch4)' },
  { id: 'intermediaire', label: 'Intermédiaire', desc: "Tu t'entraînes régulièrement depuis plusieurs mois", tint: C.warn },
  { id: 'confirme', label: 'Confirmé', desc: 'Entraînement structuré depuis longtemps, bonne tolérance à la charge', tint: C.success },
]

function sheetWrap(onClose, children) {
  return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,.45)', zIndex: 65, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s ease' } },
    h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', background: C.surface, borderRadius: 0, padding: '22px 22px 28px', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box', animation: 'sheetUp .3s ease' } },
      h('div', { style: { width: 38, height: 4, borderRadius: 'var(--r-pill)', background: C.line, margin: '0 auto 18px' } }),
      children))
}

const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 14.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }
const primaryBtnStyle = { fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', width: '100%', padding: 15, borderRadius: 'var(--r-pill)', background: C.primary, color: 'var(--c-on-fill)', border: 'none', cursor: 'pointer' }

function TextFieldSheet({ title, fields, saveLabel, onSave, onClose }) {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value || ''])))
  const upd = (k, v) => setVals((o) => ({ ...o, [k]: v }))
  const canSave = fields.every((f) => !f.required || (vals[f.key] || '').trim())
  return sheetWrap(onClose,
    h('div', null,
      h('div', { style: { fontFamily: C.display, fontSize: 21, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, textAlign: 'center', marginBottom: 20 } }, title),
      fields.map((f) => h('label', { key: f.key, style: { display: 'block' } },
        h('span', { style: { fontFamily: C.display, fontSize: 15.2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C.ink3 } }, f.label),
        h('input', { value: vals[f.key], onChange: (e) => upd(f.key, e.target.value), placeholder: f.placeholder || '', maxLength: f.maxLength || 40, autoFocus: f.autoFocus, style: { ...inputStyle, marginTop: 6 } }))),
      h('button', { disabled: !canSave, onClick: () => { onSave(vals); onClose() }, style: { ...primaryBtnStyle, opacity: canSave ? 1 : 0.45 } }, saveLabel || 'Enregistrer')))
}

function NumberFieldSheet({ title, value, unit, min, max, step, onSave, onClose }) {
  const [v, setV] = useState(value)
  const dec = () => setV((x) => Math.max(min, x - step))
  const inc = () => setV((x) => Math.min(max, x + step))
  return sheetWrap(onClose,
    h('div', null,
      h('div', { style: { fontFamily: C.display, fontSize: 21, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, textAlign: 'center' } }, title),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, margin: '24px 0 26px' } },
        h('button', { onClick: dec, 'aria-label': 'Diminuer', style: { width: 44, height: 44, borderRadius: 'var(--r-pill)', border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 20, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '–'),
        h('div', { style: { textAlign: 'center', minWidth: 96 } },
          h('span', { style: { fontFamily: C.mono, fontSize: 38, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, color: C.primary } }, v),
          h('div', { style: { fontSize: 13, color: C.ink3, fontWeight: 600, marginTop: 2 } }, unit)),
        h('button', { onClick: inc, 'aria-label': 'Augmenter', style: { width: 44, height: 44, borderRadius: 'var(--r-pill)', border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 20, fontWeight: 700, color: C.ink, cursor: 'pointer' } }, '+')),
      h('button', { onClick: () => { onSave(v); onClose() }, style: primaryBtnStyle }, 'Enregistrer')))
}

function Stat(v, label) {
  return h('div', { style: { textAlign: 'center', flex: 1 } },
    h('div', { style: { fontFamily: C.mono, fontSize: 19, fontWeight: 600, letterSpacing: '-.03em', color: C.ink } }, v),
    h('div', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 600, marginTop: 2 } }, label))
}
function Divider() { return h('div', { style: { width: 1, background: C.line, alignSelf: 'stretch', margin: '0 4px' } }) }
function SecTitle(label) { return h('div', { style: { fontFamily: C.display, fontSize: 14.5, fontWeight: 800, color: C.ink2, textTransform: 'uppercase', letterSpacing: '.07em', margin: '24px 0 10px', paddingBottom: 5, borderBottom: `1px solid ${C.line}` } }, label) }
function LinkRow(ic, label, value, onClick, key) {
  return h('button', { key, onClick, style: { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: `1px solid ${C.line}`, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: C.line } },
    h('div', { style: { width: 36, height: 36, borderRadius: 0, background: 'transparent', border: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' } },
      h(Icon, { name: ic, size: 17, color: C.primary })),
    h('div', { style: { flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14.5 } }, label),
    value && h('span', { style: { fontSize: 13.5, fontWeight: 700, color: C.primary, marginRight: 6 } }, value),
    h(Icon, { name: 'arrow', size: 16, color: C.ink3, style: { flexShrink: 0 } }))
}

// ============================================================
// "Profil" — porté depuis l'ancienne app : identité, niveau, sports,
// zones à ménager, objectifs (temps/jour, séances/semaine, objectifs
// perso), raccourcis. Le nom (prénom/nom) vit sur profiles.first_name/
// last_name (colonnes top-level, pas dans profiles.phys) donc s'édite
// via un update Supabase direct + refreshProfile, pas via store.set.
// L'app n'a plus qu'une identité ; on y choisit seulement l'apparence
// (automatique, claire ou sombre), qui pose data-theme sur <html> (cf.
// applyTheme). Le choix est gardé en local (appliqué avant le premier
// rendu) et dans le profil (pour suivre d'un appareil à l'autre).
// ============================================================
export default function ProfilSpace({ userId, profile, refreshProfile, signOut, onClose }) {
  const { db, store, loading, etatBrut } = useNutritionStore(userId)
  // Export : null, 'encours', ou le résultat affiché sous le bouton.
  const [exportEtat, setExportEtat] = useState(null)
  async function lancerExport() {
    const etat = etatBrut()
    if (!etat) return
    setExportEtat('encours')
    try {
      const r = await exporterDonnees({ supabase, userId, profil: profile, etat, journeesLocales: etat.dayRows })
      const j = `${r.journees} journée${r.journees > 1 ? 's' : ''}`
      setExportEtat(r.complet ? `Fichier enregistré : ${j}, historique complet.` : `Fichier enregistré hors ligne : ${j} récente${r.journees > 1 ? 's' : ''} seulement.`)
    } catch {
      setExportEtat('Export impossible sur cet appareil.')
    }
  }
  const [sheet, setSheet] = useState(null)
  const [editGoal, setEditGoal] = useState(null)
  const [sportOpen, setSportOpen] = useState(false)
  const [sportQuery, setSportQuery] = useState('')
  const [flow, setFlow] = useState(null)
  // L'apparence vit dans le stockage local (appliquée avant le premier
  // rendu) et dans le profil (pour suivre d'un appareil à l'autre). Un
  // ancien thème (« Nuit », « Forêt »…) est ramené à l'apparence la plus
  // proche plutôt que perdu.
  const [theme, setTheme] = useState(() => normalizeTheme(localStorage.getItem(THEME_KEY)))
  // Le profil peut porter une apparence choisie sur un autre appareil : on
  // s'aligne dessus une fois les données chargées.
  React.useEffect(() => {
    if (!db.theme) return
    const choix = normalizeTheme(db.theme)
    if (choix !== theme) {
      applyTheme(choix)
      localStorage.setItem(THEME_KEY, choix)
      setTheme(choix)
    }
  }, [db.theme])
  function changeTheme(id) {
    const applied = applyTheme(id)
    localStorage.setItem(THEME_KEY, applied)
    setTheme(applied)
    store.set({ theme: applied })
  }
  // La palette suit exactement le même chemin que l'apparence.
  const [palette, setPalette] = useState(() => normalizePalette(localStorage.getItem(PALETTE_KEY)))
  React.useEffect(() => {
    if (!db.palette) return
    const choix = normalizePalette(db.palette)
    if (choix !== palette) {
      applyPalette(choix)
      localStorage.setItem(PALETTE_KEY, choix)
      setPalette(choix)
    }
  }, [db.palette])
  function changePalette(id) {
    const applied = applyPalette(id)
    localStorage.setItem(PALETTE_KEY, applied)
    setPalette(applied)
    store.set({ palette: applied })
  }

  if (loading) {
    return h('div', { style: { position: 'fixed', inset: 0, background: C.bg, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontFamily: C.font } }, 'Chargement...')
  }

  if (flow === 'weight') {
    return h(WeightSpace, { db, store, onClose: () => setFlow(null) })
  }
  if (flow === 'mobility' || flow === 'program' || flow === 'recovery') {
    return h(TrainSpace, { userId, initialTile: flow, embedded: true, onClose: () => setFlow(null) })
  }

  const g = db.goals
  const totals = trainingTotals(db)
  const firstName = profile?.first_name || ''
  const lastName = profile?.last_name || ''
  const initial = (firstName || '?').trim().charAt(0).toUpperCase()
  const sports = (db.profilePhys && db.profilePhys.sports) || []
  const sportObjs = SPORTS.filter((sp) => sports.includes(sp.id))

  const ul = inferUserLevel(db)
  const levelLabel = ul.label
  const levelTint = ul.id === 'confirme' ? C.success : ul.id === 'intermediaire' ? C.warn : 'var(--ch4)'
  const isManualLevel = !!ul.manual

  function setLevelOverride(id) {
    const next = { ...db.profilePhys }
    if (id === null) delete next.levelOverride
    else next.levelOverride = id
    store.set({ profilePhys: next })
  }
  function toggleSport(id) {
    const cur = (db.profilePhys && db.profilePhys.sports) || []
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    store.set({ profilePhys: { ...db.profilePhys, sports: next } })
  }
  function toggleZone(id) {
    const cur = db.sensitiveZones || []
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    store.setSensitiveZones(next)
  }
  async function saveName(vals) {
    const fn = vals.firstName.trim(), ln = (vals.lastName || '').trim()
    await supabase.from('profiles').update({ first_name: fn, last_name: ln }).eq('id', userId)
    refreshProfile()
  }

  const filteredSports = SPORTS.filter((sp) => !sportQuery || sp.label.toLowerCase().includes(sportQuery.toLowerCase()))

  return h(FlowSpace, { bg: 'profil', title: 'Profil', onClose, fixed: false },
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8, marginBottom: 20 } },
      h('button', { onClick: () => setSheet('avatar'), 'aria-label': "Changer d'avatar", style: { position: 'relative', marginBottom: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer' } },
        h('div', { style: { width: 80, height: 80, borderRadius: 'var(--r-pill)', background: db.avatar ? `color-mix(in srgb, ${C.primary} 14%, ${C.surface})` : C.ink, color: C.surface, fontFamily: C.font, fontWeight: 700, fontSize: db.avatar ? 38 : 32, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, db.avatar || initial),
        h('div', { style: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 'var(--r-pill)', background: C.primary, border: `2px solid ${C.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(Icon, { name: 'edit', size: 12, color: 'var(--c-on-fill)' }))),
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } },
        h('h1', { onClick: () => setSheet('name'), style: { fontFamily: C.display, fontSize: 27, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, cursor: 'pointer', margin: 0, color: firstName ? C.ink : C.ink3 } }, firstName ? firstName + (lastName ? ' ' + lastName : '') : 'Ajouter ton nom'),
        h('button', { onClick: () => setSheet('level'), style: { fontSize: 12, padding: '2px 8px 2px 10px', borderRadius: 'var(--r-pill)', fontWeight: 700, background: 'transparent', color: levelTint, display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', cursor: 'pointer' } },
          levelLabel, h(Icon, { name: isManualLevel ? 'pin' : 'edit', size: 11, color: levelTint })))),

    h('div', { style: { display: 'flex', alignItems: 'center', padding: '14px 0', background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}` } },
      Stat(totals.streak, 'Jours de série'), Divider(), Stat(totals.sessionsTotal, 'Séances'), Divider(), Stat(g.weeklySessions + '/sem', 'Objectif')),

    SecTitle('Mes sports'),
    h('div', { style: { position: 'relative' } },
      sportOpen && h('div', { onClick: () => { setSportOpen(false); setSportQuery('') }, style: { position: 'fixed', inset: 0, zIndex: 19 } }),
      h('button', { onClick: () => setSportOpen((o) => !o), style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', background: C.surface, borderRadius: C.radiusSm, border: `1.5px solid ${sportOpen ? C.primary : C.line}`, cursor: 'pointer', textAlign: 'left' } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          sportObjs.length === 0
            ? h('span', { style: { fontSize: 14, color: C.ink3 } }, 'Choisir un ou plusieurs sports...')
            : h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5 } },
              sportObjs.map((sp) => h('span', { key: sp.id, style: { fontSize: 12.5, fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-pill)', background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } }, sp.label)))),
        h(Icon, { name: 'arrow', size: 17, color: C.ink3, style: { flexShrink: 0, transition: 'transform .2s', transform: sportOpen ? 'rotate(-90deg)' : 'rotate(90deg)' } })),
      sportOpen && h('div', { style: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, background: C.surface, borderRadius: C.radiusSm, border: `1.5px solid ${C.primary}`, boxShadow: 'none', overflow: 'hidden' } },
        h('div', { style: { padding: '10px 16px', borderBottom: `1px solid ${C.line}` } },
          h('input', { autoFocus: true, placeholder: 'Rechercher...', value: sportQuery, onChange: (e) => setSportQuery(e.target.value), style: { width: '100%', padding: '8px 12px', borderRadius: C.radiusXs, border: `1px solid ${C.line}`, background: C.bg, fontSize: 14, color: C.ink, outline: 'none', boxSizing: 'border-box' } })),
        h('div', { style: { maxHeight: 220, overflowY: 'auto' } },
          filteredSports.map((sp) => {
            const on = sports.includes(sp.id)
            return h('button', { key: sp.id, onClick: () => toggleSport(sp.id), style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '11px 16px', borderBottom: `1px solid ${C.line}`, background: on ? `color-mix(in srgb, ${C.primary} 7%, ${C.surface})` : C.surface, cursor: 'pointer' } },
              h('div', { style: { width: 30, height: 30, borderRadius: C.radiusXs, flexShrink: 0, background: 'transparent', border: `1.5px solid ${on ? C.primary : C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                h(Icon, { name: sp.ic, size: 15, color: on ? C.primary : C.ink3 })),
              h('span', { style: { flex: 1, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? C.primary : C.ink } }, sp.label),
              on && h(Icon, { name: 'check', size: 15, color: C.primary }))
          })))),

    SecTitle('Zones à ménager'),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 } },
      ZONES.map((z) => {
        const cur = db.sensitiveZones || []
        const on = cur.includes(z.id)
        return h('button', { key: z.id, onClick: () => toggleZone(z.id), style: { padding: '8px 13px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 600, border: `1.5px solid ${on ? C.warn : C.line}`, background: on ? 'color-mix(in srgb, var(--ch1) 12%, ' + C.surface + ')' : C.surface, color: on ? 'var(--ch1)' : C.ink2, cursor: 'pointer' } }, z.label)
      })),
    h('p', { style: { fontSize: 12, color: C.ink3, lineHeight: 1.4, marginBottom: 4 } }, "Un rappel de prudence s'affiche sur chaque séance tant qu'une zone est active."),

    SecTitle('Objectifs'),
    h('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, overflow: 'hidden' } },
      LinkRow('clock', 'Temps par jour', g.dailyMin + ' min', () => setSheet('dailyMin'), 'dailyMin'),
      LinkRow('target', 'Séances par semaine', g.weeklySessions + '/sem', () => setSheet('weeklySessions'), 'weeklySessions')),

    db.customGoals.length > 0 && h('div', { style: { marginTop: 10, background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, overflow: 'hidden' } },
      db.customGoals.map((goal) => h('div', { key: goal.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${C.line}` } },
        h('button', { onClick: () => store.updateGoal(goal.id, { done: !goal.done }), style: { width: 24, height: 24, borderRadius: 'var(--r-pill)', flex: '0 0 auto', border: `2px solid ${goal.done ? C.primary : C.line}`, background: goal.done ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } },
          goal.done ? h(Icon, { name: 'check', size: 13, color: 'var(--c-on-fill)' }) : null),
        h('span', { onClick: () => { setEditGoal(goal); setSheet('goal') }, style: { flex: 1, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: goal.done ? C.ink3 : C.ink, textDecoration: goal.done ? 'line-through' : 'none' } }, goal.label),
        h('button', { onClick: () => store.removeGoal(goal.id), style: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' } },
          h(Icon, { name: 'close', size: 15 }))))),
    h('button', { onClick: () => { setEditGoal('new'); setSheet('goal') }, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 0', color: C.primary, fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' } },
      h('span', { style: { width: 24, height: 24, borderRadius: 'var(--r-pill)', border: `2px dashed ${C.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1 } }, '+'),
      'Ajouter un objectif'),

    SecTitle('Accès rapide'),
    h('div', { style: { background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, overflow: 'hidden' } },
      LinkRow('chart', 'Suivi du poids', db.weightLog && db.weightLog.length ? db.weightLog[db.weightLog.length - 1].kg + ' kg' : 'Démarrer', () => setFlow('weight'), 'weight'),
      db.program
        ? LinkRow('route', 'Mon programme', 'Ouvrir', () => setFlow('program'), 'program')
        : LinkRow('route', 'Générer mon programme', 'Faire', () => setFlow('mobility'), 'program'),
      LinkRow('leaf', 'Espace Récupération', '', () => setFlow('recovery'), 'recovery')),

    SecTitle('Apparence'),
    // Sélecteur segmenté d'appareil : trois cases jointives, l'active en
    // aplat. Chaque case montre un échantillon du papier qu'elle donne.
    h('div', { role: 'radiogroup', 'aria-label': 'Apparence', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: `1px solid ${C.line}`, background: C.surface } },
      THEMES.map((t, i) => {
        const on = t.id === theme
        return h('button', {
          key: t.id,
          role: 'radio',
          'aria-checked': on,
          onClick: () => changeTheme(t.id),
          style: { textAlign: 'left', padding: '11px 11px 12px', cursor: 'pointer', background: on ? C.surface : 'transparent', border: 'none', borderLeft: i ? `1px solid ${C.line}` : 'none', borderTop: `2px solid ${on ? C.primary : 'transparent'}`, color: C.ink },
        },
          h('div', { style: { fontFamily: C.display, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1 } }, t.label),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5, lineHeight: 1.35 } }, t.hint))
      })),

    SecTitle('Couleurs'),
    // Chaque palette montre ses encres en clair puis en sombre : la
    // pastille est un aperçu, pas un réglage de la palette en cours.
    h('div', { role: 'radiogroup', 'aria-label': 'Couleurs', className: 'liste', style: { background: C.surface, border: `1px solid ${C.line}` } },
      PALETTES.map((p) => {
        const on = p.id === palette
        return h('button', {
          key: p.id,
          role: 'radio',
          'aria-checked': on,
          onClick: () => changePalette(p.id),
          style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 12px', cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: `4px solid ${on ? C.primary : 'transparent'}`, color: C.ink },
        },
          h('div', { 'aria-hidden': true, style: { display: 'grid', gridTemplateColumns: '14px 14px', gridTemplateRows: '14px 14px', border: `1px solid ${C.line}`, flex: '0 0 auto' } },
            p.swatch.map((c, i) => h('span', { key: i, style: { background: c } }))),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontFamily: C.display, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1 } }, p.label),
            h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4 } }, p.hint)),
          on ? h(Icon, { name: 'check', size: 16, color: C.primary }) : null)
      })),

    SecTitle('Mes données'),
    // La sauvegarde qu'on garde soi-même : tout le profil et toutes les
    // journées, dans un fichier lisible (JSON).
    h('button', { onClick: lancerExport, disabled: exportEtat === 'encours', style: { width: '100%', padding: 13, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.primary}`, color: C.ink, fontFamily: C.display, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'left', cursor: exportEtat === 'encours' ? 'default' : 'pointer' } },
      exportEtat === 'encours' ? 'Export en cours…' : 'Exporter mes données'),
    h('div', { role: 'status', style: { fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.45 } },
      exportEtat && exportEtat !== 'encours' ? exportEtat : 'Profil, historique et journées dans un fichier que tu gardes. Aucun mot de passe ni accès au compte dedans.'),

    h('button', { onClick: signOut, style: { width: '100%', marginTop: 28, padding: 13, background: 'transparent', border: `1px solid ${C.ink3}`, color: C.ink2, fontFamily: C.display, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer' } }, 'Se déconnecter'),

    sheet === 'name' && h(TextFieldSheet, { title: 'Mon nom', fields: [{ key: 'firstName', label: 'Prénom', value: firstName, required: true, autoFocus: true, maxLength: 24 }, { key: 'lastName', label: 'Nom', value: lastName, maxLength: 24 }], onSave: saveName, onClose: () => setSheet(null) }),
    sheet === 'avatar' && sheetWrap(() => setSheet(null),
      h('div', null,
        h('div', { style: { fontFamily: C.display, fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, marginBottom: 16, textAlign: 'center' } }, 'Choisis ton avatar'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 } },
          AVATARS.map((em) => h('button', {
            key: em,
            onClick: () => { store.set({ avatar: em }); setSheet(null) },
            style: { width: '100%', aspectRatio: '1', borderRadius: C.radiusSm, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: db.avatar === em ? C.surface : C.surface2, border: db.avatar === em ? `1.5px solid ${C.primary}` : `1.5px solid transparent`, cursor: 'pointer' },
          }, em))),
        db.avatar && h('button', { onClick: () => { store.set({ avatar: null }); setSheet(null) }, style: { width: '100%', padding: 13, borderRadius: 'var(--r-pill)', background: 'none', border: `1.5px solid ${C.line}`, color: C.ink3, fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Retirer l’avatar'))),
    sheet === 'dailyMin' && h(NumberFieldSheet, { title: 'Temps par jour', unit: 'min / jour', value: g.dailyMin, min: 5, max: 90, step: 5, onSave: (v) => store.setGoal('dailyMin', v), onClose: () => setSheet(null) }),
    sheet === 'weeklySessions' && h(NumberFieldSheet, { title: 'Séances / semaine', unit: 'séances', value: g.weeklySessions, min: 1, max: 14, step: 1, onSave: (v) => store.setGoal('weeklySessions', v), onClose: () => setSheet(null) }),
    sheet === 'goal' && h(TextFieldSheet, {
      title: editGoal === 'new' ? 'Nouvel objectif' : 'Modifier',
      saveLabel: editGoal === 'new' ? 'Ajouter' : 'Enregistrer',
      fields: [{ key: 'label', label: 'Objectif', value: editGoal === 'new' ? '' : editGoal.label, placeholder: 'Ex : tenir 2 min de gainage', required: true, autoFocus: true, maxLength: 60 }],
      onSave: (v) => { const l = v.label.trim(); if (editGoal === 'new') store.addGoal(l); else store.updateGoal(editGoal.id, { label: l }) },
      onClose: () => { setSheet(null); setEditGoal(null) },
    }),
    sheet === 'level' && sheetWrap(() => setSheet(null),
      h('div', null,
        h('div', { style: { fontFamily: C.display, fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, marginBottom: 4, textAlign: 'center' } }, 'Ton niveau'),
        h('div', { style: { fontSize: 13, color: C.ink3, marginBottom: 16, lineHeight: 1.4, textAlign: 'center' } }, "Calculé automatiquement par défaut selon ton historique. Tu peux le fixer toi-même si tu te connais mieux."),
        LEVEL_OPTS.map((opt) => {
          const active = ul.manual && ul.id === opt.id
          return h('button', { key: opt.id, onClick: () => { setLevelOverride(opt.id); setSheet(null) }, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: C.radiusSm, marginBottom: 8, border: `2px solid ${active ? opt.tint : C.line}`, background: C.surface, cursor: 'pointer' } },
            h('div', { style: { width: 12, height: 12, borderRadius: '50%', background: opt.tint, flexShrink: 0 } }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 700, fontSize: 14.5, color: C.ink } }, opt.label),
              h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } }, opt.desc)),
            active && h(Icon, { name: 'check', size: 17, color: opt.tint }))
        }),
        h('button', { onClick: () => { setLevelOverride(null); setSheet(null) }, style: { width: '100%', padding: 12, marginTop: 4, borderRadius: C.radiusSm, border: `1.5px dashed ${C.line}`, background: 'transparent', color: C.ink3, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' } }, 'Revenir au calcul automatique'))))
}
