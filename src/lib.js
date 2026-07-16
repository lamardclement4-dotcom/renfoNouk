import { createClient } from '@supabase/supabase-js'
import Dexie from 'dexie'

// --- Client Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Variables d\'environnement manquantes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// --- Base locale (Dexie / IndexedDB) : source de vérité offline ---
export const db = new Dexie('renfo')

db.version(1).stores({
  profile: 'id, updatedAt, synced',
  sessions: 'id, date, updatedAt, synced',
  nutritionLogs: 'id, date, updatedAt, synced',
  sleepLogs: 'id, date, updatedAt, synced',
  mobilityTests: 'id, date, updatedAt, synced',
  syncQueue: '++localId, table, recordId, operation, createdAt',
})

export async function putLocal(table, record) {
  const now = Date.now()
  const entry = { ...record, updatedAt: now, synced: 0 }
  await db.table(table).put(entry)
  await db.syncQueue.add({ table, recordId: entry.id, operation: 'upsert', createdAt: now })
  return entry
}

export async function markSynced(table, id) {
  await db.table(table).update(id, { synced: 1 })
}
