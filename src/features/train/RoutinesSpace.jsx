import React, { useState } from 'react'
import { C, Icon, FlowSpace, Card } from '../health/kit'
import { suggestions, SESSIONS_TO_UNLOCK } from './routineTemplates'
import { ROUTINE_KINDS, DOW_SHORT, DOW_LABELS, kindOf, movementsFor, makeRoutine,
  routineValid, routineMins, routineList, routineStreak, lastDone, daysSince,
  fitToDuration, durationOptions, DURATION_CHOICES } from './routines'

const h = React.createElement

// ============================================================
// Routines de mobilité et de pliométrie.
//
// L'application proposait des séances toutes faites et un programme
// généré. Rien ne permettait de composer la sienne — celle de dix minutes
// qu'on refait trois fois par semaine et qu'on connaît par cœur.
//
// Une routine a la forme d'une séance : le lecteur la joue sans rien
// savoir de plus, et l'accueil la rappelle les jours retenus.
// ============================================================

function MovePicker({ kind, selected, onToggle, onClose }) {
  const [q, setQ] = useState('')
  const all = movementsFor(kind)
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const list = q.trim() ? all.filter((m) => norm(m.name).includes(norm(q.trim()))) : all
  return h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }, onClick: onClose },
    h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxHeight: '84vh', overflowY: 'auto', background: C.surface, borderRadius: `${C.radius}px ${C.radius}px 0 0`, padding: 16 } },
      h('div', { style: { width: 38, height: 4, borderRadius: 999, background: C.line, margin: '0 auto 14px' } }),
      h('div', { style: { fontFamily: C.font, fontWeight: 700, fontSize: 16, marginBottom: 4 } }, 'Choisis tes mouvements'),
      h('div', { style: { fontSize: 12, color: C.ink3, marginBottom: 10 } }, all.length, ' mouvements de ', kindOf(kind).label.toLowerCase(), ' · ', selected.length, ' retenu', selected.length > 1 ? 's' : ''),
      h('input', {
        type: 'text', value: q, placeholder: 'Chercher…', onChange: (e) => setQ(e.target.value),
        style: { width: '100%', padding: '10px 12px', borderRadius: C.radiusXs, border: `1.5px solid ${C.line}`, background: C.surface2, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 },
      }),
      list.map((m) => {
        const on = selected.includes(m.key)
        return h('button', {
          key: m.key, onClick: () => onToggle(m.key),
          style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: C.radiusXs, border: `1px solid ${on ? C.primary : C.line}`, background: on ? `color-mix(in srgb, ${C.primary} 10%, ${C.surface})` : 'transparent', cursor: 'pointer' },
        },
          h('div', { style: { width: 20, height: 20, borderRadius: 6, flex: '0 0 auto', border: `1.5px solid ${on ? C.primary : C.line}`, background: on ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            on ? h(Icon, { name: 'check', size: 12, color: '#fff' }) : null),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 600, color: C.ink } }, m.name),
            h('div', { style: { fontSize: 11.5, color: C.ink3 } }, m.type === 'hold' ? `${m.secs || 30} s de maintien` : `${m.reps || 10} répétitions`)))
      }),
      h('button', { onClick: onClose, style: { width: '100%', marginTop: 8, padding: 13, borderRadius: C.radiusSm, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Terminé')))
}

function Editor({ initial, startKind, onSave, onCancel }) {
  const [kind, setKind] = useState(initial ? initial.kind : (startKind || 'mobilite'))
  const [name, setName] = useState(initial ? initial.name : '')
  const [keys, setKeys] = useState(initial ? initial.keys.slice() : [])
  const [sets, setSets] = useState(initial ? initial.sets : kindOf(startKind || 'mobilite').defaultSets)
  const [rest, setRest] = useState(initial ? initial.restSecs : kindOf(startKind || 'mobilite').defaultRest)
  const [dows, setDows] = useState(initial ? initial.dows.slice() : [])
  const [picker, setPicker] = useState(false)

  const draft = makeRoutine({ kind, name, keys, sets, restSecs: rest, dows, id: initial ? initial.id : undefined })
  const mins = routineMins(draft)
  const chip = (on) => ({ padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? C.primary : C.line}`, background: on ? C.primary : 'transparent', color: on ? '#fff' : C.ink2 })
  const moves = movementsFor(kind)

  return h('div', null,
    picker ? h(MovePicker, {
      kind, selected: keys, onClose: () => setPicker(false),
      onToggle: (k) => setKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])),
    }) : null,

    h(Card, { style: { marginBottom: 12 } },
      h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 7 } }, 'Type'),
      h('div', { style: { display: 'flex', gap: 7, marginBottom: 14 } },
        ROUTINE_KINDS.map((k) => h('button', {
          key: k.id,
          onClick: () => { setKind(k.id); setKeys([]); setSets(k.defaultSets); setRest(k.defaultRest) },
          style: { ...chip(k.id === kind), flex: 1 },
        }, k.label))),

      h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 7 } }, 'Nom'),
      h('input', {
        type: 'text', value: name, placeholder: `Routine ${kindOf(kind).label.toLowerCase()}`,
        onChange: (e) => setName(e.target.value),
        style: { width: '100%', padding: '10px 12px', borderRadius: C.radiusXs, border: `1.5px solid ${C.line}`, background: C.surface2, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
      }),

      // Les jours retenus font la différence avec une simple liste : une
      // routine sans jour ne se rappelle à personne.
      h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 3 } }, 'Quels jours ?'),
      h('div', { style: { fontSize: 11.5, color: C.ink3, marginBottom: 8, lineHeight: 1.45 } }, 'Elle apparaîtra à l’accueil ces jours-là, comme une séance planifiée.'),
      h('div', { style: { display: 'flex', gap: 5, marginBottom: 14 } },
        DOW_SHORT.map((lab, i) => h('button', {
          key: i, 'aria-label': DOW_LABELS[i],
          onClick: () => setDows((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])),
          style: { ...chip(dows.includes(i)), flex: 1, padding: '9px 0' },
        }, lab))),

      h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        h('label', { style: { flex: 1 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 5 } }, 'Tours'),
          h('input', { type: 'number', min: 1, max: 10, value: sets, onChange: (e) => setSets(Number(e.target.value) || 1), style: { width: '100%', padding: '10px 12px', borderRadius: C.radiusXs, border: `1.5px solid ${C.line}`, background: C.surface2, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box' } })),
        h('label', { style: { flex: 1 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 5 } }, 'Récup. (s)'),
          h('input', { type: 'number', min: 0, max: 180, value: rest, onChange: (e) => setRest(Number(e.target.value) || 0), style: { width: '100%', padding: '10px 12px', borderRadius: C.radiusXs, border: `1.5px solid ${C.line}`, background: C.surface2, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box' } }))),

      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3 } }, 'Mouvements'),
        h('div', { style: { fontSize: 12, color: C.ink3 } }, keys.length, ' sur ', moves.length, mins ? ` · ~${mins} min` : '')),
      keys.length
        ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
          keys.map((k) => {
            const m = moves.find((x) => x.key === k)
            return h('button', {
              key: k, onClick: () => setKeys((prev) => prev.filter((x) => x !== k)),
              style: { padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1px solid ${C.line}`, background: C.surface2, color: C.ink2, cursor: 'pointer' },
            }, m ? m.name : k, ' ×')
          }))
        : h('div', { style: { fontSize: 12.5, color: C.ink3, marginBottom: 10, lineHeight: 1.45 } }, 'Aucun mouvement pour l’instant.'),
      h('button', { onClick: () => setPicker(true), style: { width: '100%', padding: 11, borderRadius: 999, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' } }, 'Ajouter des mouvements')),

    h('div', { style: { display: 'flex', gap: 9 } },
      h('button', { onClick: onCancel, style: { flex: 1, padding: 13, borderRadius: C.radiusSm, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Annuler'),
      h('button', {
        onClick: () => routineValid(draft) && onSave(draft), disabled: !routineValid(draft),
        style: { flex: 2, padding: 13, borderRadius: C.radiusSm, border: 'none', background: routineValid(draft) ? C.primary : C.surface2, color: routineValid(draft) ? '#fff' : C.ink3, fontSize: 14, fontWeight: 700, cursor: routineValid(draft) ? 'pointer' : 'default' },
      }, initial ? 'Enregistrer' : 'Créer la routine')))
}

export default function RoutinesSpace({ db, store, onClose, onPlay }) {
  // « J'ai dix minutes » est la question qu'on se pose avant celle des
  // mouvements. Une routine qui ne tient pas dans le temps disponible ne se
  // fait pas — la durée choisie ici s'applique à ce qu'on lance.
  const [mins, setMins] = useState(null)
  const [edit, setEdit] = useState(null) // null | 'new' | routine
  const list = routineList(db)

  function save(r) {
    const prev = routineList(db)
    const next = prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r]
    store.set({ routines: next })
    setEdit(null)
  }
  function remove(id) {
    store.set({ routines: routineList(db).filter((x) => x.id !== id) })
  }

  // La durée demandée ajuste tours et mouvements ; sans durée choisie, la
  // routine part telle qu'elle a été composée.
  const play = (r) => onPlay && onPlay(mins ? fitToDuration(r, mins) : r)

  function routineCard(r) {
            const k = kindOf(r.kind)
            const st = routineStreak(db, r.id)
            const last = lastDone(db, r.id)
            const since = last ? daysSince(last, undefined) : null
            return h(Card, { key: r.id, style: { marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 11 } },
                h('div', { style: { width: 38, height: 38, borderRadius: 12, flex: '0 0 auto', background: `color-mix(in srgb, ${C.primary} 13%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                  h(Icon, { name: k.icon, size: 18, color: C.primary })),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 14.5, fontWeight: 700 } }, r.name),
                  h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 2 } },
                    k.label, ' · ', r.keys.length, ' mouvement', r.keys.length > 1 ? 's' : '', ' · ~', routineMins(r), ' min',
                    r.sets > 1 ? ` · ${r.sets} tours` : ''),
                  r.dows.length
                    ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, r.dows.slice().sort().map((d) => DOW_LABELS[d]).join(', '))
                    : h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, 'Aucun jour retenu — elle ne se rappellera pas'),
                  st.count
                    ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 3 } }, st.count, ' fois sur 28 jours', since != null ? ` · la dernière il y a ${since} j` : '')
                    : null)),
              h('div', { style: { display: 'flex', gap: 7, marginTop: 11 } },
                h('button', { onClick: () => play(r), style: { flex: 2, padding: 10, borderRadius: 999, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, 'Lancer'),
                h('button', { onClick: () => setEdit(r), style: { flex: 1, padding: 10, borderRadius: 999, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, 'Modifier'),
                h('button', { onClick: () => remove(r.id), 'aria-label': 'Supprimer', style: { padding: '10px 13px', borderRadius: 999, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink3, fontSize: 13, cursor: 'pointer' } }, '×')))
  }

  return h(FlowSpace, { title: 'Mes routines', onClose, fixed: false, bg: 'entrainer' },
    edit
      ? h(Editor, { initial: edit && edit.id ? edit : null, startKind: edit && edit.newKind ? edit.newKind : 'mobilite', onSave: save, onCancel: () => setEdit(null) })
      : h('div', null,
        h('p', { style: { fontSize: 12.5, color: C.ink3, lineHeight: 1.55, padding: '0 4px 10px' } },
          'Compose tes propres enchaînements de mobilité ou de pliométrie. Ceux dont tu retiens des jours apparaîtront à l’accueil, comme tes séances planifiées.'),

        h(Card, { style: { marginBottom: 16 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink3, marginBottom: 3 } }, 'Combien de temps as-tu ?'),
          h('div', { style: { fontSize: 11.5, color: C.ink3, lineHeight: 1.45 } },
            mins
              ? `Ce que tu lances sera ajusté à ${mins} minutes : moins de tours, ou moins de mouvements — les derniers de la liste tombent en premier.`
              : 'Les routines partent telles qu’elles sont composées. Choisis une durée pour les ajuster.'),
          h('div', { style: { display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' } },
            h('button', {
              onClick: () => setMins(null),
              style: { padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${mins == null ? C.primary : C.line}`, background: mins == null ? C.primary : 'transparent', color: mins == null ? '#fff' : C.ink2 },
            }, 'Complète'),
            DURATION_CHOICES.map((t) => h('button', {
              key: t, onClick: () => setMins(t),
              style: { padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${mins === t ? C.primary : C.line}`, background: mins === t ? C.primary : 'transparent', color: mins === t ? '#fff' : C.ink2 },
            }, t, ' min')))),

        // Mobilité et pliométrie ne se rangent pas ensemble : l'une prépare et
        // entretient, l'autre sollicite, et elles ne se placent pas aux mêmes
        // moments de la semaine. Mêlées dans une seule liste, on cherchait la
        // sienne au lieu de la voir.
        ROUTINE_KINDS.map((k) => {
          const ofKind = list.filter((r) => r.kind === k.id)
          const sugg = suggestions(db, { kind: k.id })
          return h('div', { key: k.id, style: { marginBottom: 18 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 9px' } },
              h(Icon, { name: k.icon, size: 15, color: C.primary }),
              h('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em' } },
                k.label, ofKind.length ? ` · ${ofKind.length}` : ''),
              h('div', { style: { flex: 1 } }),
              h('button', { onClick: () => setEdit({ newKind: k.id }), style: { fontSize: 12.5, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer' } }, 'Ajouter')),
            ofKind.length ? ofKind.map((r) => routineCard(r)) : null,

            // Toutes faites, et qui se durcissent à mesure. Composer suppose
            // de savoir quoi mettre dedans ; une échelle donne un point de
            // départ et surtout une suite.
            sugg.map((sg) => h(Card, { key: sg.family.id, style: { marginBottom: 10, borderStyle: 'dashed' } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
                h('div', { style: { flex: 1, fontSize: 14, fontWeight: 700 } }, sg.family.label, ' — ', sg.levelLabel),
                h('div', { style: { fontSize: 11.5, color: C.ink3, fontWeight: 700 } }, 'Niveau ', sg.levelNumber, '/', sg.levelCount)),
              sg.justUnlocked
                ? h('div', { style: { fontSize: 11.5, color: C.success, fontWeight: 700, marginTop: 4 } }, sg.note)
                : null,
              h('div', { style: { fontSize: 12, color: C.ink2, marginTop: 5, lineHeight: 1.5 } }, sg.routine.why),
              h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 5 } },
                sg.routine.keys.length, ' mouvements · ', sg.routine.sets, ' tour', sg.routine.sets > 1 ? 's' : '', ' · ~', routineMins(sg.routine), ' min',
                sg.progress.levels[sg.progress.current].done
                  ? ` · faite ${sg.progress.levels[sg.progress.current].done} fois sur ${SESSIONS_TO_UNLOCK}`
                  : ''),
              !sg.justUnlocked && sg.note
                ? h('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 4, lineHeight: 1.45 } }, sg.note)
                : null,
              h('div', { style: { display: 'flex', gap: 7, marginTop: 10 } },
                h('button', { onClick: () => play(sg.routine), style: { flex: 2, padding: 10, borderRadius: 999, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, 'Lancer'),
                h('button', {
                  onClick: () => save({ ...sg.routine, id: 'rt_' + Date.now().toString(36), custom: true, template: false, name: sg.routine.name, dows: [] }),
                  style: { flex: 1, padding: 10, borderRadius: 999, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
                }, 'Copier')))))
        }),

        !list.length ? h(Card, { style: { marginBottom: 12, textAlign: 'center', padding: '22px 16px' } },
            h('div', { style: { fontSize: 13.5, color: C.ink2, lineHeight: 1.55 } }, 'Aucune routine pour l’instant.'),
            h('div', { style: { fontSize: 12, color: C.ink3, marginTop: 6, lineHeight: 1.5 } }, 'Une routine, c’est l’enchaînement de dix minutes que tu refais trois fois par semaine.')) : null,

        h('button', { onClick: () => setEdit({ newKind: 'mobilite' }), style: { width: '100%', marginTop: 4, padding: 13, borderRadius: C.radiusSm, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' } }, 'Créer une routine')))
}
