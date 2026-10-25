import Dexie, { type Table } from 'dexie'

import type { DraftIncident, Incident } from '../types'

class RescueGridDatabase extends Dexie {
  incidents!: Table<Incident, string>
  drafts!: Table<DraftIncident, string>

  constructor() {
    super('rescuegrid-db')
    this.version(1).stores({
      incidents: 'id, status, category, urgency, sync_status, created_at, updated_at',
      drafts: 'id, updated_at',
    })
  }
}

export const db = new RescueGridDatabase()

export async function initializeStorage() {
  await db.open()
}

export async function listIncidents() {
  return db.incidents.orderBy('created_at').reverse().toArray()
}

export async function saveIncident(incident: Incident) {
  await db.incidents.put(incident)
}

export async function saveDraft(draft: DraftIncident) {
  await db.drafts.put(draft)
}

export async function listDrafts() {
  return db.drafts.orderBy('updated_at').reverse().toArray()
}

export async function clearAllData() {
  await db.incidents.clear()
  await db.drafts.clear()
}

export async function seedIfEmpty(seed: Incident[]) {
  const count = await db.incidents.count()
  if (count === 0) {
    await db.incidents.bulkPut(seed)
  }
}
