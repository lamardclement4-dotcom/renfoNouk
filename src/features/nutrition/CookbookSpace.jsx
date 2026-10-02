import React, { useState, useRef, useEffect } from 'react'
import { C, Icon, FlowSpace, SecLab, NoteBox, MODULE_TINTS } from '../health/kit'
import { useNutritionStore } from './useNutritionStore'
import { imageTooLarge } from '../health/fileGuard'
import {
  parseRecipeText, detectTimers, scaleIngredient, makeCookRecipe, cookIssue, cookbookRoom,
  upsertCook, removeCook, toggleCookFav, sortedCookbook, cookSummary,
} from './cookbook'

const h = React.createElement
const TINT = MODULE_TINTS.nutrition

// ============================================================
// Cuisine : le carnet de recettes à suivre en cuisinant.
//
// Pensé pour le téléphone posé sur le plan de travail : ingrédients à
// cocher, une étape à la fois en grands caractères, l'écran qui ne s'éteint
// pas, et les durées des étapes transformées en minuteurs d'un appui.
//
// Les recettes viennent de l'utilisateur : texte collé, page photographiée
// ou saisie. Tout import passe par un écran de vérification — un texte de
// site est bruyant, une page lue par OCR a ses lignes coupées.
// ============================================================

const champ = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: `1px solid ${C.line}`, background: C.surface, color: C.ink, fontSize: 15, fontFamily: 'inherit',
}
const btnPlein = {
  width: '100%', padding: '13px 18px', borderRadius: C.radiusSm, border: 'none', background: TINT,
  color: '#fff', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit',
}
const btnContour = {
  width: '100%', padding: '12px 16px', borderRadius: C.radiusSm, border: `1.5px solid ${C.line}`,
  background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}

function mmss(s) {
  const t = Math.max(0, Math.round(s))
  const hh = Math.floor(t / 3600)
  const mm = Math.floor((t % 3600) / 60)
  const ss = String(t % 60).padStart(2, '0')
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}

// Le signal de fin. Sur iPhone, un son ne peut naître que d'un geste : le
// contexte audio est donc créé au lancement du minuteur, et réutilisé à la
// fin. L'alerte visuelle, elle, fonctionne partout.
function bip(ctx) {
  try {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume()
      for (const debut of [0, 0.35, 0.7]) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = 880
        g.gain.value = 0.18
        o.connect(g); g.connect(ctx.destination)
        o.start(ctx.currentTime + debut)
        o.stop(ctx.currentTime + debut + 0.22)
      }
    }
  } catch { /* son indisponible : l'alerte visuelle suffit */ }
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([300, 150, 300]) } catch { /* pas de vibreur */ }
}

const versBrouillon = (r) => ({
  id: r.id, title: r.title, servings: r.servings || '', prepMins: r.prepMins || '', cookMins: r.cookMins || '',
  ingrText: (r.ingredients || []).join('\n'), etapesText: (r.steps || []).join('\n'),
  notes: r.notes || '', fav: !!r.fav, source: r.source || 'texte',
})

export default function CookbookSpace({ userId, onClose }) {
  const { db, store } = useNutritionStore(userId)
  // Ordre des états figé et documenté : les tests en forcent par rang.
  const [mode, setMode] = useState('liste')        // 0 liste | import | edition | recette | cuisine
  const [q, setQ] = useState('')                    // 1
  const [draft, setDraft] = useState(null)          // 2
  const [texte, setTexte] = useState('')            // 3
  const [lecture, setLecture] = useState({ phase: 'idle', progress: 0, error: null, raw: '' }) // 4
  const [courante, setCourante] = useState(null)    // 5 identifiant de la recette ouverte
  const [parts, setParts] = useState(1)             // 6 parts visées, ou multiplicateur
  const [coches, setCoches] = useState({})          // 7
  const [etape, setEtape] = useState(0)             // 8
  const [minuteurs, setMinuteurs] = useState([])    // 9
  const [maintenant, setMaintenant] = useState(Date.now()) // 10
  const [veille, setVeille] = useState('inconnu')   // 11
  const [voirIngr, setVoirIngr] = useState(false)   // 12
  const [voirBrut, setVoirBrut] = useState(false)   // 13
  const [erreur, setErreur] = useState(null)        // 14
  const audioRef = useRef(null)
  const minuteursRef = useRef([])
  minuteursRef.current = minuteurs

  const carnet = (db && db.cookbook) || []
  const recette = carnet.find((r) => r.id === courante) || null
  // Facteur de quantités : parts visées sur parts de la recette, ou
  // multiplicateur direct quand la recette ne dit pas pour combien elle est.
  const facteur = recette ? (recette.servings ? parts / recette.servings : parts) : 1

  // L'écran reste allumé en mode cuisine. L'autorisation tombe quand on
  // change d'application : on la redemande au retour.
  useEffect(() => {
    if (mode !== 'cuisine') return undefined
    let verrou = null
    let actif = true
    const demander = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.wakeLock && navigator.wakeLock.request) {
          verrou = await navigator.wakeLock.request('screen')
          if (actif) setVeille('active')
        } else if (actif) setVeille('indispo')
      } catch { if (actif) setVeille('refus') }
    }
    demander()
    const auRetour = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible' && actif) demander() }
    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', auRetour)
    return () => {
      actif = false
      if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', auRetour)
      if (verrou && verrou.release) verrou.release().catch(() => {})
    }
  }, [mode])

  // Les minuteurs se calculent sur une heure de fin, pas en décomptant : un
  // onglet en arrière-plan ralentit les intervalles, l'heure, elle, reste
  // juste.
  const enCours = minuteurs.some((m) => !m.sonne)
  useEffect(() => {
    if (!enCours) return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setMaintenant(t)
      const finis = minuteursRef.current.filter((m) => !m.sonne && m.fin <= t)
      if (finis.length) {
        bip(audioRef.current)
        setMinuteurs((liste) => liste.map((m) => (finis.some((f) => f.id === m.id) ? { ...m, sonne: true } : m)))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [enCours])

  const lancerMinuteur = (tm, nEtape) => {
    try {
      if (!audioRef.current && typeof window !== 'undefined') {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC) audioRef.current = new AC()
      } else if (audioRef.current && audioRef.current.state === 'suspended') audioRef.current.resume()
    } catch { /* son indisponible */ }
    const t = Date.now()
    setMaintenant(t)
    setMinuteurs((l) => [...l, { id: 'm' + t, label: tm.label, etape: nEtape, fin: t + tm.secs * 1000, sonne: false }])
  }
  const retirerMinuteur = (id) => setMinuteurs((l) => l.filter((m) => m.id !== id))

  // ─── écriture ───
  const enregistrer = () => {
    const r = makeCookRecipe({ ...draft, ingredients: draft.ingrText, steps: draft.etapesText })
    const bloque = cookIssue(r) || cookbookRoom(carnet, r)
    if (bloque) { setErreur(bloque); return }
    store.set({ cookbook: upsertCook(carnet, r) })
    setErreur(null); setDraft(null); setCourante(r.id); setParts(r.servings || 1); setCoches({}); setMode('recette')
  }
  const supprimer = () => {
    store.set({ cookbook: removeCook(carnet, draft.id) })
    setDraft(null); setCourante(null); setMode('liste')
  }
  const basculerFav = (id) => store.set({ cookbook: toggleCookFav(carnet, id) })

  const ouvrir = (r) => { setCourante(r.id); setParts(r.servings || 1); setCoches({}); setEtape(0); setMode('recette') }

  const depuisTexte = (txt, source, raw) => {
    const p = parseRecipeText(txt)
    setDraft({
      title: p.title || '', servings: p.servings || '', prepMins: p.prepMins || '', cookMins: p.cookMins || '',
      ingrText: p.ingredients.join('\n'), etapesText: p.steps.join('\n'), notes: p.notes.join('\n'),
      fav: false, source, detecte: { ingr: p.ingredients.length, etapes: p.steps.length, ok: p.ok },
    })
    setLecture((l) => ({ ...l, raw: raw || '' }))
    setVoirBrut(false); setErreur(null); setMode('edition')
  }

  async function lirePhoto(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setLecture({ phase: 'idle', progress: 0, error: "Ce fichier n'est pas une image.", raw: '' }); return }
    const tropGros = imageTooLarge(file)
    if (tropGros) { setLecture({ phase: 'idle', progress: 0, error: tropGros, raw: '' }); return }
    setLecture({ phase: 'reading', progress: 0, error: null, raw: '' })
    let url
    try {
      // Moteur chargé seulement ici. L'image ne quitte pas l'appareil.
      const { default: Tesseract } = await import('tesseract.js')
      url = URL.createObjectURL(file)
      const res = await Tesseract.recognize(url, 'fra+eng', {
        logger: (m) => { if (m.status === 'recognizing text') setLecture((l) => ({ ...l, progress: Math.round(m.progress * 100) })) },
      })
      const txt = (res && res.data && res.data.text) || ''
      setLecture({ phase: 'idle', progress: 0, error: null, raw: txt })
      depuisTexte(txt, 'photo', txt)
    } catch (e) {
      setLecture({ phase: 'idle', progress: 0, error: 'La lecture a échoué (' + ((e && e.message) || 'erreur inconnue') + '). Une connexion est nécessaire au premier import, le temps de télécharger le moteur de lecture.', raw: '' })
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  // ─── Mode cuisine ───
  if (mode === 'cuisine' && recette) {
    const etapes = recette.steps || []
    const n = Math.min(etape, Math.max(0, etapes.length - 1))
    const txt = etapes[n] || 'Cette recette n’a pas d’étapes.'
    const ici = detectTimers(txt)
    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 70, background: C.bg, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 6px' } },
        h('button', { onClick: () => setMode('recette'), 'aria-label': 'Quitter le mode cuisine', style: { width: 40, height: 40, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h(Icon, { name: 'close', size: 18 })),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 12, color: C.ink3, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' } }, 'Étape ', n + 1, ' / ', Math.max(1, etapes.length)),
          h('div', { style: { fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, recette.title)),
        h('button', { onClick: () => setVoirIngr((v) => !v), style: { padding: '8px 12px', borderRadius: 999, border: `1.5px solid ${voirIngr ? TINT : C.line}`, background: 'transparent', color: voirIngr ? TINT : C.ink2, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' } }, 'Ingrédients')),
      h('div', { style: { padding: '0 16px', fontSize: 11.5, color: veille === 'active' ? C.success : C.ink3 } },
        veille === 'active' ? 'L’écran reste allumé pendant que tu cuisines.'
          : veille === 'inconnu' ? '' : 'Ce navigateur ne peut pas garder l’écran allumé : touche-le de temps en temps.'),
      h('div', { style: { height: 4, margin: '10px 16px 0', borderRadius: 999, background: C.surface2 || C.line, overflow: 'hidden' } },
        h('div', { style: { height: '100%', width: (etapes.length ? (n + 1) / etapes.length * 100 : 0) + '%', background: TINT, transition: 'width .3s ease' } })),

      h('div', { style: { flex: 1, overflowY: 'auto', padding: '18px 18px 12px' } },
        voirIngr && h('div', { style: { padding: '10px 12px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 16 } },
          (recette.ingredients || []).map((x, i) => h('button', { key: i, onClick: () => setCoches((c) => ({ ...c, [i]: !c[i] })), style: { display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '7px 0', background: 'transparent', border: 'none', cursor: 'pointer', color: coches[i] ? C.ink3 : C.ink, textDecoration: coches[i] ? 'line-through' : 'none', fontSize: 14.5, fontFamily: 'inherit' } },
            h('span', { style: { flex: '0 0 auto', color: coches[i] ? C.success : C.ink3 } }, coches[i] ? '✓' : '○'),
            scaleIngredient(x, facteur)))),
        h('p', { style: { fontSize: 23, lineHeight: 1.45, fontWeight: 500, margin: 0, color: C.ink, textWrap: 'pretty' } }, txt),
        ici.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 } },
          ici.map((tm) => h('button', { key: tm.secs, onClick: () => lancerMinuteur(tm, n), style: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 999, border: 'none', background: TINT, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' } },
            h(Icon, { name: 'play', size: 15, color: '#fff' }), 'Minuteur ', tm.label))),

        minuteurs.length > 0 && h('div', { style: { marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 } },
          minuteurs.map((m) => {
            const reste = (m.fin - maintenant) / 1000
            const fini = m.sonne || reste <= 0
            return h('div', { key: m.id, role: fini ? 'alert' : undefined, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: C.radiusSm, background: fini ? `color-mix(in srgb, ${C.danger} 14%, ${C.surface})` : C.surface, border: `1.5px solid ${fini ? C.danger : C.line}` } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 12, color: C.ink3 } }, 'Étape ', m.etape + 1, ' · ', m.label),
                h('div', { style: { fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: fini ? C.danger : C.ink } }, fini ? 'Terminé' : mmss(reste))),
              h('button', { onClick: () => retirerMinuteur(m.id), 'aria-label': 'Arrêter ce minuteur', style: { padding: '8px 12px', borderRadius: 999, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontWeight: 700, cursor: 'pointer' } }, fini ? 'OK' : 'Arrêter'))
          }))),

      h('div', { style: { display: 'flex', gap: 10, padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.line}` } },
        h('button', { onClick: () => setEtape(Math.max(0, n - 1)), disabled: n === 0, style: { ...btnContour, flex: 1, opacity: n === 0 ? 0.4 : 1, fontSize: 16, padding: 16 } }, '← Précédente'),
        n < etapes.length - 1
          ? h('button', { onClick: () => setEtape(n + 1), style: { ...btnPlein, flex: 1.4, fontSize: 16, padding: 16 } }, 'Suivante →')
          : h('button', { onClick: () => setMode('recette'), style: { ...btnPlein, flex: 1.4, fontSize: 16, padding: 16, background: C.success } }, 'Terminé')))
  }

  // ─── Fiche recette ───
  if (mode === 'recette' && recette) {
    const etapes = recette.steps || []
    const pas = recette.servings ? 1 : 0.5
    return h(FlowSpace, {
      title: recette.title, subtitle: cookSummary(recette), tint: TINT, fixed: false,
      onClose: () => { setCourante(null); setMode('liste') },
      action: h('div', { style: { display: 'flex', gap: 8 } },
        h('button', { onClick: () => basculerFav(recette.id), 'aria-label': 'Favori', style: { width: 38, height: 38, borderRadius: 999, border: `1px solid ${C.line}`, background: C.surface, fontSize: 18, color: recette.fav ? '#d9a441' : C.ink3, cursor: 'pointer' } }, recette.fav ? '★' : '☆'),
        h('button', { onClick: () => { setDraft(versBrouillon(recette)); setErreur(null); setMode('edition') }, style: { padding: '8px 14px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, 'Modifier')),
    },
      etapes.length > 0 && h('button', { onClick: () => { setEtape(0); setVoirIngr(false); setMode('cuisine') }, style: { ...btnPlein, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 } },
        h(Icon, { name: 'play', size: 16, color: '#fff' }), 'Cuisiner pas à pas'),
      etapes.length > 0 && h('div', { style: { fontSize: 12, color: C.ink3, textAlign: 'center', marginBottom: 4 } }, 'Une étape à la fois, en grand, l’écran allumé.'),

      h(SecLab, null, 'Quantités'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        h('button', { onClick: () => setParts((p) => Math.max(pas, Math.round((p - pas) * 2) / 2)), 'aria-label': 'Moins', style: { width: 42, height: 42, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 20, cursor: 'pointer', color: C.ink } }, '−'),
        h('div', { style: { flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 } },
          recette.servings ? `Pour ${String(parts).replace('.', ',')} part${parts > 1 ? 's' : ''}` : `Quantités ×${String(parts).replace('.', ',')}`),
        h('button', { onClick: () => setParts((p) => Math.min(50, p + pas)), 'aria-label': 'Plus', style: { width: 42, height: 42, borderRadius: 999, border: `1.5px solid ${C.line}`, background: C.surface, fontSize: 20, cursor: 'pointer', color: C.ink } }, '+')),

      (recette.ingredients || []).length > 0 && h(SecLab, null, 'Ingrédients'),
      (recette.ingredients || []).length > 0 && h('div', { style: { borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, overflow: 'hidden' } },
        recette.ingredients.map((x, i) => h('button', { key: i, onClick: () => setCoches((c) => ({ ...c, [i]: !c[i] })), style: { display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', borderTop: i ? `1px solid ${C.line}` : 'none', background: 'transparent', cursor: 'pointer', fontSize: 14.5, fontFamily: 'inherit', color: coches[i] ? C.ink3 : C.ink, textDecoration: coches[i] ? 'line-through' : 'none' } },
          h('span', { style: { flex: '0 0 auto', width: 18, color: coches[i] ? C.success : C.ink3, fontWeight: 800 } }, coches[i] ? '✓' : '○'),
          h('span', null, scaleIngredient(x, facteur))))),

      etapes.length > 0 && h(SecLab, null, 'Étapes'),
      etapes.map((s, i) => {
        const tms = detectTimers(s)
        return h('div', { key: i, style: { display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${C.line}` : 'none' } },
          h('div', { style: { flex: '0 0 auto', width: 26, height: 26, borderRadius: 999, background: `color-mix(in srgb, ${TINT} 15%, ${C.surface})`, color: TINT, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, i + 1),
          h('div', { style: { flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.55 } }, s,
            tms.length > 0 && h('div', { style: { fontSize: 12, color: TINT, fontWeight: 700, marginTop: 4 } }, '⏱ ', tms.map((t) => t.label).join(' · '))))
      }),
      recette.notes && h(NoteBox, { tint: TINT }, recette.notes))
  }

  // ─── Vérification avant enregistrement ───
  if (mode === 'edition' && draft) {
    const existe = carnet.some((r) => r.id === draft.id)
    const set = (k) => (ev) => { setDraft({ ...draft, [k]: ev.target.value }); setErreur(null) }
    const nombre = (k, lab, unite) => h('label', { style: { flex: 1, display: 'block' } },
      h('span', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3 } }, lab),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } },
        h('input', { type: 'number', inputMode: 'numeric', min: 0, value: draft[k], onChange: set(k), style: champ }),
        unite && h('span', { style: { fontSize: 12.5, color: C.ink3 } }, unite)))
    return h(FlowSpace, {
      title: existe ? 'Modifier' : 'Vérifier la recette', tint: TINT, fixed: false,
      subtitle: existe ? null : 'Rien n’est enregistré avant ta validation : corrige ce qui a été mal lu.',
      onClose: () => { setDraft(null); setErreur(null); setMode(existe ? 'recette' : 'import') },
    },
      draft.detecte && h('div', { style: { padding: '11px 13px', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${draft.detecte.ok ? C.line : C.warn}`, fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginBottom: 6 } },
        draft.detecte.ok
          ? `${draft.detecte.ingr} ingrédient${draft.detecte.ingr > 1 ? 's' : ''} et ${draft.detecte.etapes} étape${draft.detecte.etapes > 1 ? 's' : ''} reconnus${draft.source === 'photo' ? ' sur la photo' : ''}. Vérifie chaque ligne : une ligne mal coupée se corrige directement ci-dessous.`
          : 'Rien de structuré n’a été reconnu. Complète la recette à la main ci-dessous.',
        draft.source === 'photo' && lecture.raw && h('button', { onClick: () => setVoirBrut((v) => !v), style: { display: 'block', marginTop: 6, padding: 0, background: 'transparent', border: 'none', color: C.ink3, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' } },
          voirBrut ? '▾ Masquer le texte lu' : '▸ Voir le texte lu par l’appareil'),
        voirBrut && lecture.raw && h('pre', { style: { fontSize: 10.5, color: C.ink3, background: C.bg, padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 150, overflowY: 'auto', margin: '8px 0 0' } }, lecture.raw)),

      h(SecLab, null, 'Titre'),
      h('input', { value: draft.title, onChange: set('title'), placeholder: 'Gâteau au yaourt…', style: champ }),
      h('div', { style: { display: 'flex', gap: 10, marginTop: 14 } },
        nombre('servings', 'Parts', null), nombre('prepMins', 'Préparation', 'min'), nombre('cookMins', 'Cuisson', 'min')),

      h(SecLab, null, 'Ingrédients'),
      h('textarea', { value: draft.ingrText, onChange: set('ingrText'), rows: 7, placeholder: '200 g de farine\n3 œufs\n…', style: { ...champ, resize: 'vertical', lineHeight: 1.5 } }),
      h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4 } }, 'Un ingrédient par ligne. Les quantités en tête de ligne s’ajusteront au nombre de parts.'),

      h(SecLab, null, 'Étapes'),
      h('textarea', { value: draft.etapesText, onChange: set('etapesText'), rows: 9, placeholder: 'Préchauffer le four à 180 °C.\nMélanger…', style: { ...champ, resize: 'vertical', lineHeight: 1.5 } }),
      h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4 } }, 'Une étape par ligne. Les durées citées (« 35 minutes ») deviendront des minuteurs.'),

      h(SecLab, null, 'Notes'),
      h('textarea', { value: draft.notes, onChange: set('notes'), rows: 2, placeholder: 'Astuces, variantes… (facultatif)', style: { ...champ, resize: 'vertical' } }),

      erreur && h('div', { role: 'alert', style: { fontSize: 13, color: C.warn, marginTop: 14, lineHeight: 1.45 } }, erreur),
      h('button', { onClick: enregistrer, style: { ...btnPlein, marginTop: 18 } }, existe ? 'Enregistrer les modifications' : 'Enregistrer dans mon carnet'),
      existe && h('button', { onClick: supprimer, style: { width: '100%', marginTop: 10, padding: 12, fontSize: 14, fontWeight: 700, color: C.danger, background: 'transparent', border: 'none', cursor: 'pointer' } }, 'Supprimer la recette'))
  }

  // ─── Import ───
  if (mode === 'import') {
    return h(FlowSpace, { title: 'Importer une recette', tint: TINT, fixed: false, onClose: () => { setLecture({ phase: 'idle', progress: 0, error: null, raw: '' }); setMode('liste') } },
      h(SecLab, { style: { marginTop: 0 } }, 'Coller un texte'),
      h('textarea', { value: texte, onChange: (ev) => setTexte(ev.target.value), rows: 8, placeholder: 'Colle ici une recette copiée depuis un site, un e-mail ou une note…', style: { ...champ, resize: 'vertical', lineHeight: 1.5 } }),
      h('button', { onClick: () => depuisTexte(texte, 'texte'), disabled: !texte.trim(), style: { ...btnPlein, marginTop: 10, opacity: texte.trim() ? 1 : 0.45, cursor: texte.trim() ? 'pointer' : 'default' } }, 'Lire ce texte'),
      h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.45 } },
        'L’adresse d’un site ne peut pas être lue directement : ouvre la recette, copie son texte et colle-le ici.'),

      h(SecLab, null, 'Photographier une page'),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: C.radiusSm, border: `1.5px dashed ${TINT}`, cursor: lecture.phase === 'reading' ? 'default' : 'pointer' } },
        h(Icon, { name: 'plus', size: 20, color: TINT }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontWeight: 700, fontSize: 14.5, color: TINT } }, lecture.phase === 'reading' ? `Lecture… ${lecture.progress} %` : 'Livre, fiche, capture d’écran'),
          h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2, lineHeight: 1.4 } }, 'La lecture se fait sur l’appareil : la photo n’est envoyée nulle part.')),
        h('input', { type: 'file', accept: 'image/*', disabled: lecture.phase === 'reading', onChange: (ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; lirePhoto(f) }, style: { display: 'none' } })),
      lecture.error && h('div', { role: 'alert', style: { fontSize: 12.5, color: C.danger, marginTop: 8, lineHeight: 1.45 } }, lecture.error),

      h(SecLab, null, 'Ou à la main'),
      h('button', { onClick: () => { setDraft({ title: '', servings: '', prepMins: '', cookMins: '', ingrText: '', etapesText: '', notes: '', fav: false, source: 'texte' }); setErreur(null); setMode('edition') }, style: btnContour }, 'Écrire une recette'))
  }

  // ─── Liste ───
  const liste = sortedCookbook(carnet, q)
  return h(FlowSpace, { title: 'Cuisine', subtitle: 'Tes recettes, à suivre pas à pas depuis ton téléphone.', tint: TINT, fixed: false, onClose },
    h('button', { onClick: () => { setTexte(''); setMode('import') }, style: { ...btnPlein, marginBottom: 14 } }, '+ Importer une recette'),
    carnet.length > 5 && h('input', { value: q, onChange: (ev) => setQ(ev.target.value), placeholder: 'Chercher une recette ou un ingrédient…', style: { ...champ, marginBottom: 12 } }),
    carnet.length === 0
      ? h('div', { style: { textAlign: 'center', color: C.ink3, fontSize: 13.5, padding: '22px 10px', lineHeight: 1.6 } },
        'Ton carnet est vide. Colle le texte d’une recette, photographie une page de livre, ou écris-la : elle s’affichera ensuite étape par étape, avec ses minuteurs.')
      : liste.length === 0
        ? h('div', { style: { textAlign: 'center', color: C.ink3, fontSize: 13.5, padding: '18px 0' } }, 'Aucune recette ne correspond.')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          liste.map((r) => h('div', { key: r.id, style: { display: 'flex', alignItems: 'center', borderRadius: C.radiusSm, background: C.surface, border: `1px solid ${C.line}`, overflow: 'hidden' } },
            h('button', { onClick: () => basculerFav(r.id), 'aria-label': 'Favori', style: { flex: '0 0 auto', padding: '12px 4px 12px 12px', background: 'transparent', border: 'none', fontSize: 18, color: r.fav ? '#d9a441' : C.ink3, cursor: 'pointer' } }, r.fav ? '★' : '☆'),
            h('button', { onClick: () => ouvrir(r), style: { flex: 1, minWidth: 0, textAlign: 'left', padding: '12px 14px 12px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' } },
              h('div', { style: { fontWeight: 700, fontSize: 15, color: C.ink } }, r.title),
              h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } }, cookSummary(r))),
            h(Icon, { name: 'arrow', size: 16, color: C.ink3, style: { marginRight: 12 } })))))
}
