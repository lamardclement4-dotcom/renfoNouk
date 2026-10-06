// ============================================================
// Export de toutes ses données, dans un fichier qu'on garde soi-même.
//
// La sauvegarde qui protège de tout le reste : compte supprimé par erreur,
// projet Supabase perdu, changement d'appareil ou d'application. Le
// fichier contient le profil complet (historique compris) et toutes les
// journées de nutrition lues sur le serveur — pas seulement les dernières
// semaines gardées en mémoire. Jamais de jeton ni de session : rien qui
// permette de se connecter à la place de quelqu'un.
// ============================================================
export const VERSION_EXPORT = 1

export function nomFichier(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `renfo-donnees-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`
}

// Les journées lues sur le serveur, complétées et corrigées par l'état
// local (saisies récentes, éventuellement pas encore parties).
export function construireExport({ profil, etat, journeesServeur, journeesLocales, complet, maintenant = new Date() }) {
  const journees = {}
  for (const r of journeesServeur || []) {
    if (r && typeof r.date === 'string') journees[r.date] = { food: (r.data && r.data.food) || [], hydration: (r.data && r.data.hydration) || [] }
  }
  for (const [date, j] of Object.entries(journeesLocales || {})) {
    journees[date] = { food: (j && j.food) || [], hydration: (j && j.hydration) || [] }
  }
  const dates = Object.keys(journees).sort()
  return {
    application: 'Renfo',
    version: VERSION_EXPORT,
    exporteLe: maintenant.toISOString(),
    // Faux quand le serveur n'a pas répondu : seules les journées en
    // mémoire sont alors présentes.
    journeesCompletes: !!complet,
    compte: { id: profil && profil.id, prenom: (profil && profil.first_name) || null, nom: (profil && profil.last_name) || null },
    profil: etat.phys || {},
    cycle: etat.cycle || {},
    objectifs: etat.goals || {},
    zonesSensibles: etat.sensitiveZones || [],
    journees: Object.fromEntries(dates.map((d) => [d, journees[d]])),
  }
}

export async function exporterDonnees({ supabase, userId, profil, etat, journeesLocales }) {
  let journeesServeur = []
  let complet = false
  try {
    const { data, error } = await supabase.from('nutrition_logs').select('date,data').eq('user_id', userId).order('date')
    if (!error && Array.isArray(data)) { journeesServeur = data; complet = true }
  } catch { /* hors ligne : on exporte ce qu'on a */ }
  const contenu = construireExport({ profil, etat, journeesServeur, journeesLocales, complet })
  const blob = new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(blob)
  lien.download = nomFichier()
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(lien.href), 10000)
  return { complet, journees: Object.keys(contenu.journees).length }
}
