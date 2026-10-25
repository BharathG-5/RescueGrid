import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Cloud, FileText, Flame, MapPinned, Mic, ShieldAlert, Siren, Users, Wrench } from 'lucide-react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'

import { demoIncidents } from './data/demo'
import { detectIncidentCategory, detectLanguage, speechRecognitionSupported } from './services/language'
import { clearAllData, initializeStorage, listDrafts, listIncidents, saveDraft, saveIncident, seedIfEmpty } from './services/storage'
import type { DraftIncident, Incident, IncidentCategory, IncidentStatus, IncidentUrgency } from './types'

const IncidentMap = lazy(() =>
  import('./components/IncidentMap').then((module) => ({ default: module.IncidentMap })),
)

const navItems = [
  { to: '/', label: 'Overview', icon: <FileText size={18} /> },
  { to: '/report', label: 'Report emergency', icon: <Siren size={18} /> },
  { to: '/incidents', label: 'Incidents', icon: <ShieldAlert size={18} /> },
  { to: '/map', label: 'Need map', icon: <MapPinned size={18} /> },
  { to: '/resources', label: 'Resources', icon: <Wrench size={18} /> },
  { to: '/responders', label: 'Responders', icon: <Users size={18} /> },
  { to: '/settings', label: 'Settings', icon: <Cloud size={18} /> },
]

const statusOrder: IncidentStatus[] = [
  'Reported',
  'Awaiting verification',
  'Confirmed',
  'Assistance assigned',
  'Resolved',
  'False alarm',
]

const priorityColors: Record<IncidentUrgency, string> = {
  low: 'bg-slate-100 text-slate-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

type ReportForm = {
  title: string
  description: string
  input_language: 'Tamil' | 'English' | 'Tanglish' | 'Mixed'
  category: IncidentCategory
  urgency: IncidentUrgency
  people_affected: string
  requested_resources: string
  location_description: string
  reporter_contact: string
}

const defaultForm: ReportForm = {
  title: '',
  description: '',
  input_language: 'English',
  category: 'Other',
  urgency: 'moderate',
  people_affected: '',
  requested_resources: '',
  location_description: '',
  reporter_contact: '',
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [drafts, setDrafts] = useState<DraftIncident[]>([])
  const [online, setOnline] = useState(() => navigator.onLine)
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('rescuegrid-last-sync') ?? 'No successful sync yet'
  })

  const refreshIncidents = async () => {
    const next = await listIncidents()
    setIncidents(next)
  }

  const refreshDrafts = async () => {
    const next = await listDrafts()
    setDrafts(next)
  }

  useEffect(() => {
    const bootstrap = async () => {
      await initializeStorage()
      await seedIfEmpty(demoIncidents)
      await refreshIncidents()
      await refreshDrafts()
    }

    bootstrap().catch(() => {
      setIncidents(demoIncidents)
    })
  }, [])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    const current = incidents.find((item) => item.id === id)
    if (!current) return

    const next = { ...current, ...updates, updated_at: new Date().toISOString() }
    await saveIncident(next)
    await refreshIncidents()
  }

  const handleClearData = async () => {
    const confirmed = window.confirm('Clear all local report data and drafts?')
    if (!confirmed) return
    await clearAllData()
    await refreshIncidents()
    await refreshDrafts()
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">R</div>
            <div>
              <div className="brand-name">RescueGrid</div>
              <div className="brand-subtitle">Emergency operations</div>
            </div>
          </div>

          <nav className="nav-list" aria-label="Main navigation">
            {navItems.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="status-card">
            <div className="status-row">
              <span className="status-label">Connectivity</span>
              <span className={`status-pill ${online ? 'status-online' : 'status-offline'}`}>
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Pending sync</span>
              <strong>{incidents.filter((item) => item.sync_status === 'pending').length}</strong>
            </div>
            <div className="status-row">
              <span className="status-label">Local reports</span>
              <strong>{incidents.length}</strong>
            </div>
          </div>
        </aside>

        <main className="content-area">
          <header className="topbar">
            <div>
              <p className="eyebrow">Disaster coordination platform</p>
              <h1>RescueGrid dashboard</h1>
            </div>
            <div className="topbar-actions">
              <button type="button" className="primary-button">
                <Siren size={16} />
                Report emergency
              </button>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<DashboardPage incidents={incidents} />} />
            <Route
              path="/report"
              element={
                <ReportPage
                  incidents={incidents}
                  drafts={drafts}
                  refresh={async () => {
                    await refreshIncidents();
                    await refreshDrafts();
                  }}
                />
              }
            />
            <Route
              path="/incidents"
              element={<IncidentPage incidents={incidents} onUpdate={updateIncident} />}
            />
            <Route path="/map" element={<MapPage incidents={incidents} onUpdate={updateIncident} />} />
            <Route path="/resources" element={<ResourcePage incidents={incidents} />} />
            <Route
              path="/responders"
              element={<ResponderPage incidents={incidents} onUpdate={updateIncident} />}
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  online={online}
                  incidents={incidents}
                  onClear={handleClearData}
                  lastSyncTime={lastSyncTime}
                  setLastSyncTime={setLastSyncTime}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function DashboardPage({ incidents }: { incidents: Incident[] }) {
  const critical = incidents.filter((item) => item.urgency === 'critical').length
  const unverified = incidents.filter((item) => item.status === 'Reported' || item.status === 'Awaiting verification').length
  const unresolved = incidents.filter((item) => item.status !== 'Resolved' && item.status !== 'False alarm').length
  const resolved = incidents.filter((item) => item.status === 'Resolved').length
  const resourceShortages = incidents.filter((item) => item.requested_resources.some((resource) => /water|food|medicine|shelter/i.test(resource))).length
  const communicationAlerts = incidents.filter(
    (item) => item.status === 'Awaiting verification' && ['high', 'critical'].includes(item.urgency),
  ).length

  const recent = [...incidents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  return (
    <div className="page-grid">
      <section className="stats-grid">
        <MetricCard title="Total incidents" value={String(incidents.length)} detail="All reports" tone="blue" />
        <MetricCard title="Critical incidents" value={String(critical)} detail="Life safety risk" tone="red" />
        <MetricCard title="Unverified reports" value={String(unverified)} detail="Awaiting review" tone="amber" />
        <MetricCard title="Unresolved requests" value={String(unresolved)} detail="Still active" tone="violet" />
        <MetricCard title="Resolved incidents" value={String(resolved)} detail="Closed" tone="green" />
        <MetricCard title="Resource shortages" value={String(resourceShortages)} detail="Need monitoring" tone="blue" />
        <MetricCard title="Communication-gap alerts" value={String(communicationAlerts)} detail="Possible verification gaps" tone="amber" />
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <h2>Recent incidents</h2>
          <span>Updated from local records</span>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="No incidents recorded yet. Report an emergency to populate the dashboard." />
        ) : (
          <div className="incident-list">
            {recent.map((incident) => (
              <div key={incident.id} className="incident-item">
                <div>
                  <div className="incident-heading-row">
                    <h3>{incident.title}</h3>
                    <span className={`priority-badge ${priorityColors[incident.urgency]}`}>{incident.urgency}</span>
                  </div>
                  <p>{incident.description}</p>
                  <div className="inline-meta">
                    <span>{incident.category}</span>
                    <span>{incident.location_description || 'Location not provided'}</span>
                    <span>{formatTime(incident.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ReportPage({ incidents, drafts, refresh }: { incidents: Incident[]; drafts: DraftIncident[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const localIncidentCount = incidents.length

  const suggestedCategory = useMemo(() => detectIncidentCategory(form.description), [form.description])

  const handleChange = <K extends keyof ReportForm>(field: K, value: ReportForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleVoice = () => {
    if (!speechRecognitionSupported()) {
      setStatusMessage('Voice recognition is unavailable in this browser or mode. Manual text entry remains available.')
      return
    }

    const SpeechRecognitionConstructor =
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ??
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition

    const recognition = new SpeechRecognitionConstructor()
    recognition.lang = form.input_language === 'Tamil' ? 'ta-IN' : 'en-US'
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setForm((current) => ({ ...current, description: `${current.description} ${transcript}`.trim() }))
      setStatusMessage('Voice transcription captured. Please review the text before saving.')
    }

    recognition.onerror = () => {
      setStatusMessage('Speech recognition returned an error. Please proceed with manual entry.')
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }

  const handleSaveDraft = async () => {
    const draft: DraftIncident = {
      id: `draft-${Date.now()}`,
      title: form.title || 'Untitled draft',
      description: form.description,
      input_language: form.input_language,
      category: form.category || suggestedCategory.category,
      urgency: form.urgency,
      people_affected: Number(form.people_affected) || undefined,
      requested_resources: form.requested_resources.split(',').map((item) => item.trim()).filter(Boolean),
      location_description: form.location_description,
      reporter_contact: form.reporter_contact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveDraft(draft)
    await refresh()
    setStatusMessage('Saved draft on this device.')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.title || !form.description) {
      setError('Title and description are required for an emergency report.')
      return
    }

    const detected = detectIncidentCategory(form.description)
    const incident: Incident = {
      id: `incident-${Date.now()}`,
      title: form.title,
      description: form.description,
      description_original: form.description,
      input_language: form.input_language,
      detected_language: detectLanguage(form.description),
      category: (form.category === 'Other' ? detected.category : form.category) as IncidentCategory,
      urgency: form.urgency,
      evidence_confidence: detected.confidence,
      people_affected: Number(form.people_affected) || undefined,
      requested_resources: form.requested_resources.split(',').map((item) => item.trim()).filter(Boolean),
      latitude: undefined,
      longitude: undefined,
      location_description: form.location_description,
      reporter_contact: form.reporter_contact || undefined,
      status: 'Reported',
      verification_state: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
      priority_explanation: `High priority: ${detected.category.toLowerCase()} signal detected, recent report, not yet verified.`,
    }

    await saveIncident(incident)
    await refresh()
    setStatusMessage('Saved on this device. Awaiting synchronization. This report has not been delivered to rescue teams.')
    setError('')
    setForm(defaultForm)
  }

  return (
    <div className="page-grid">
      <section className="content-panel form-panel">
        <div className="panel-header">
          <h2>Report an emergency</h2>
          <span>{localIncidentCount} local incidents</span>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="field-grid two-col">
            <label>
              Incident title
              <input value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
            </label>
            <label>
              Input language
              <select value={form.input_language} onChange={(e) => handleChange('input_language', e.target.value as ReportForm['input_language'])}>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
                <option value="Tanglish">Tanglish</option>
                <option value="Mixed">Mixed</option>
              </select>
            </label>
          </div>

          <div className="field-grid two-col">
            <label>
              Incident category
              <select value={form.category} onChange={(e) => handleChange('category', e.target.value as ReportForm['category'])}>
                {['Other', 'Flooding', 'Trapped people', 'Medical emergency', 'Injury', 'Food shortage', 'Drinking water shortage', 'Medicine shortage', 'Shelter requirement', 'Missing person', 'Infrastructure damage'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Urgency
              <select value={form.urgency} onChange={(e) => handleChange('urgency', e.target.value as IncidentUrgency)}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>

          <label>
            Incident description
            <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={5} />
          </label>

          <div className="detected-box">
            <strong>Detected category:</strong> {suggestedCategory.category}
            <span>Confidence {suggestedCategory.confidence.toFixed(2)}</span>
          </div>

          <div className="field-grid two-col">
            <label>
              People affected
              <input type="number" value={form.people_affected} onChange={(e) => handleChange('people_affected', e.target.value)} />
            </label>
            <label>
              Resource requirements
              <input value={form.requested_resources} onChange={(e) => handleChange('requested_resources', e.target.value)} />
            </label>
          </div>

          <div className="field-grid two-col">
            <label>
              Location
              <input value={form.location_description} onChange={(e) => handleChange('location_description', e.target.value)} />
            </label>
            <label>
              Reporter contact
              <input value={form.reporter_contact} onChange={(e) => handleChange('reporter_contact', e.target.value)} />
            </label>
          </div>

          <div className="action-row">
            <button type="button" className="ghost-button" onClick={() => navigator.geolocation?.getCurrentPosition?.((position) => {
              setForm((current) => ({
                ...current,
                location_description: `Lat ${position.coords.latitude.toFixed(4)}, Long ${position.coords.longitude.toFixed(4)}`,
              }))
            }, () => { setStatusMessage('GPS permission unavailable. Please add location manually.') })}>
              Use GPS
            </button>
            <button type="button" className="ghost-button" onClick={handleVoice}>
              <Mic size={15} /> {isListening ? 'Listening...' : 'Voice input'}
            </button>
            <button type="button" className="ghost-button" onClick={handleSaveDraft}>Save draft</button>
            <button type="submit" className="primary-button">Submit report</button>
          </div>

          {error ? <p className="error-message">{error}</p> : null}
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
        </form>
      </section>

      <aside className="content-panel note-panel">
        <div className="panel-header">
          <h2>Drafts</h2>
        </div>
        {drafts.length === 0 ? (
          <EmptyState message="No saved drafts yet." />
        ) : (
          <div className="incident-list compact">
            {drafts.map((draft) => (
              <div key={draft.id} className="incident-item small">
                <h3>{draft.title}</h3>
                <p>{draft.description}</p>
                <small>{draft.location_description || 'No location provided'}</small>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function IncidentPage({ incidents, onUpdate }: { incidents: Incident[]; onUpdate: (id: string, updates: Partial<Incident>) => Promise<void> }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [urgency, setUrgency] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [syncFilter, setSyncFilter] = useState('All')
  const [sortBy, setSortBy] = useState('latest')

  const filteredIncidents = useMemo(() => {
    const normalized = incidents.filter((incident) => {
      const query = search.toLowerCase()
      const matchesText = query.length === 0 || incident.title.toLowerCase().includes(query) || incident.description.toLowerCase().includes(query) || incident.id.toLowerCase().includes(query)
      const matchesCategory = category === 'All' || incident.category === category
      const matchesUrgency = urgency === 'All' || incident.urgency === urgency
      const matchesStatus = statusFilter === 'All' || incident.status === statusFilter
      const matchesSync = syncFilter === 'All' || incident.sync_status === syncFilter
      return matchesText && matchesCategory && matchesUrgency && matchesStatus && matchesSync
    })

    return [...normalized].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'priority') return getPriorityScore(b) - getPriorityScore(a)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [incidents, search, category, urgency, statusFilter, syncFilter, sortBy])

  return (
    <div className="page-grid">
      <section className="content-panel">
        <div className="panel-header">
          <h2>Incidents and reports</h2>
          <span>{filteredIncidents.length} visible results</span>
        </div>

        <div className="toolbar-grid">
          <input placeholder="Search title or description" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All categories</option>
            {['Flooding', 'Trapped people', 'Medical emergency', 'Food shortage', 'Drinking water shortage', 'Medicine shortage', 'Shelter requirement', 'Infrastructure damage', 'Other'].map((option) => (
              <option value={option} key={option}>{option}</option>
            ))}
          </select>
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="All">All urgencies</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            {statusOrder.map((status) => (
              <option value={status} key={status}>{status}</option>
            ))}
          </select>
          <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)}>
            <option value="All">All sync states</option>
            <option value="pending">Pending</option>
            <option value="synced">Synced</option>
            <option value="failed">Failed</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest unresolved</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {filteredIncidents.length === 0 ? (
          <EmptyState message="No incidents match your filters." />
        ) : (
          <div className="incident-list">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="incident-item">
                <div className="incident-heading-row">
                  <h3>{incident.title}</h3>
                  <span className={`priority-badge ${priorityColors[incident.urgency]}`}>{incident.urgency}</span>
                </div>
                <p>{incident.description}</p>
                <div className="inline-meta">
                  <span>{incident.id}</span>
                  <span>{incident.category}</span>
                  <span>{incident.status}</span>
                  <span>{incident.sync_status}</span>
                </div>
                <div className="list-actions">
                  <select value={incident.status} onChange={(e) => onUpdate(incident.id, { status: e.target.value as IncidentStatus })}>
                    {statusOrder.map((status) => (
                      <option value={status} key={status}>{status}</option>
                    ))}
                  </select>
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { verification_state: 'Verified' })}>Mark verified</button>
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { responder_notes: 'Follow-up note recorded by responder' })}>Add note</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MapPage({
  incidents,
  onUpdate,
}: {
  incidents: Incident[]
  onUpdate: (id: string, updates: Partial<Incident>) => Promise<void>
}) {
  const [category, setCategory] = useState('All')
  const [urgency, setUrgency] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const filtered = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          (category === 'All' || incident.category === category) &&
          (urgency === 'All' || incident.urgency === urgency) &&
          (statusFilter === 'All' || incident.status === statusFilter),
      ),
    [incidents, category, urgency, statusFilter],
  )
  const unresolved = filtered.filter((incident) => !['Resolved', 'False alarm'].includes(incident.status))
  const stale = unresolved.filter(
    (incident) => Date.now() - new Date(incident.updated_at).getTime() > 24 * 60 * 60 * 1000,
  )
  const resourceRequests = unresolved.filter((incident) =>
    incident.requested_resources.some((resource) => /water|food|medicine|shelter/i.test(resource)),
  )
  const communicationGaps = unresolved.filter(
    (incident) =>
      incident.status === 'Awaiting verification' &&
      ['high', 'critical'].includes(incident.urgency),
  )

  return (
    <div className="page-grid">
      <section className="content-panel map-panel">
        <div className="panel-header">
          <h2>Unresolved need map</h2>
          <span>{filtered.length} incidents · online tiles when available</span>
        </div>

        <div className="toolbar-grid map-filters">
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="All">All categories</option>
              {[...new Set(incidents.map((incident) => incident.category))].sort().map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Urgency
            <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
              <option value="All">All urgencies</option>
              {['critical', 'high', 'moderate', 'low'].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              {statusOrder.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        <Suspense fallback={<div className="leaflet-map map-loading">Loading interactive map…</div>}>
          <IncidentMap incidents={filtered} onSelectIncident={setSelectedIncident} />
        </Suspense>

        <div className="map-legend" aria-label="Map marker legend">
          <span><i className="legend-dot critical" /> Critical</span>
          <span><i className="legend-dot high" /> High</span>
          <span><i className="legend-dot unverified" /> Awaiting verification</span>
          <span><i className="legend-dot resolved" /> Resolved</span>
        </div>

        <div className="map-note">
          OpenStreetMap tiles are provided by the public OSM tile service and require internet access. Offline map tiles are not downloaded or cached. When tiles are unavailable, this page keeps locally stored reports visible below. Location absence does not mean an area is safe.
        </div>

        {selectedIncident && (
          <section className="selected-incident" aria-live="polite">
            <div className="incident-heading-row">
              <h3>Incident details · {selectedIncident.id}</h3>
              <button type="button" className="ghost-button" onClick={() => setSelectedIncident(null)}>Close</button>
            </div>
            <p><strong>{selectedIncident.title}</strong></p>
            <p>{selectedIncident.description}</p>
            <div className="inline-meta">
              <span>{selectedIncident.category}</span>
              <span>{selectedIncident.urgency}</span>
              <span>{selectedIncident.status}</span>
              <span>{selectedIncident.location_description || 'Location description unavailable'}</span>
            </div>
            {selectedIncident.id.startsWith('demo-') && (
              <p className="demo-warning">Simulated demo incident — not a live emergency.</p>
            )}
            <div className="list-actions">
              <button type="button" className="ghost-button" onClick={() => onUpdate(selectedIncident.id, { status: 'Confirmed', verification_state: 'Verified' })}>Confirm report</button>
              <button type="button" className="ghost-button" onClick={() => onUpdate(selectedIncident.id, { status: 'Awaiting verification', verification_state: 'Needs follow-up' })}>Needs verification</button>
              <button type="button" className="ghost-button" onClick={() => onUpdate(selectedIncident.id, { status: 'Resolved' })}>Mark resolved</button>
            </div>
          </section>
        )}

        {(stale.length > 0 || resourceRequests.length > 0 || communicationGaps.length > 0) && (
          <div className="map-alerts">
            {stale.length > 0 && <p><strong>Stale unresolved:</strong> {stale.length} report(s) have no update for over 24 hours; field verification recommended.</p>}
            {resourceRequests.length > 0 && <p><strong>Resource requests:</strong> {resourceRequests.length} unresolved incident(s) request water, food, medicine, or shelter.</p>}
            {communicationGaps.length > 0 && <p><strong>Possible communication gap:</strong> {communicationGaps.length} high-priority unverified report(s) need field verification. This is not an area-wide safety assessment.</p>}
          </div>
        )}

        <div className="incident-list">
          {filtered.map((incident) => (
            <button key={incident.id} type="button" className="incident-item map-list-item" onClick={() => setSelectedIncident(incident)}>
              <div className="incident-heading-row">
                <h3>{incident.title}</h3>
                <span className={`priority-badge ${priorityColors[incident.urgency]}`}>{incident.urgency}</span>
              </div>
              <p>{incident.priority_explanation}</p>
              <div className="inline-meta">
                <span>{incident.location_description || 'Location description not provided'}</span>
                {typeof incident.latitude === 'number' && typeof incident.longitude === 'number' && (
                  <span>{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</span>
                )}
                <span>{incident.category}</span>
                <span>{incident.status}</span>
                {incident.id.startsWith('demo-') && <strong className="demo-tag">SIMULATED DEMO</strong>}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function ResourcePage({ incidents }: { incidents: Incident[] }) {
  const resources = useMemo(() => {
    const map = new Map<string, { count: number; items: Incident[] }>()

    for (const incident of incidents) {
      for (const resource of incident.requested_resources) {
        const current = map.get(resource) ?? { count: 0, items: [] }
        current.count += 1
        current.items.push(incident)
        map.set(resource, current)
      }
    }

    return [...map.entries()].map(([resource, data]) => ({ resource, count: data.count, items: data.items }))
  }, [incidents])

  return (
    <div className="page-grid">
      <section className="content-panel">
        <div className="panel-header">
          <h2>Resource needs</h2>
          <span>{resources.length} tracked resource types</span>
        </div>

        <div className="resource-table">
          {resources.map(({ resource, count }) => (
            <div className="resource-row" key={resource}>
              <span>{resource}</span>
              <span>{count}</span>
              <span>Requested</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ResponderPage({ incidents, onUpdate }: { incidents: Incident[]; onUpdate: (id: string, updates: Partial<Incident>) => Promise<void> }) {
  return (
    <div className="page-grid">
      <section className="content-panel">
        <div className="panel-header">
          <h2>Responder dashboard</h2>
          <span>Demo responder actions</span>
        </div>

        {incidents.length === 0 ? (
          <EmptyState message="No incidents are currently ready for responder review." />
        ) : (
          <div className="incident-list">
            {incidents.map((incident) => (
              <div key={incident.id} className="incident-item">
                <div className="incident-heading-row">
                  <h3>{incident.title}</h3>
                  <span className={`priority-badge ${priorityColors[incident.urgency]}`}>{incident.urgency}</span>
                </div>
                <p>{incident.priority_explanation}</p>
                <div className="inline-meta">
                  <span>{incident.status}</span>
                  <span>{incident.verification_state}</span>
                  <span>{incident.location_description}</span>
                </div>
                <div className="list-actions">
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { status: 'Confirmed' })}>Confirm</button>
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { verification_state: 'Needs follow-up' })}>Needs verification</button>
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { status: 'Assistance assigned' })}>Assign assistance</button>
                  <button type="button" className="ghost-button" onClick={() => onUpdate(incident.id, { status: 'Resolved' })}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SettingsPage({
  online,
  incidents,
  onClear,
  lastSyncTime,
  setLastSyncTime,
}: {
  online: boolean
  incidents: Incident[]
  onClear: () => Promise<void>
  lastSyncTime: string
  setLastSyncTime: React.Dispatch<React.SetStateAction<string>>
}) {
  const pendingSync = incidents.filter((item) => item.sync_status === 'pending').length
  const voiceAvailable = speechRecognitionSupported()

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'rescuegrid-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleSync = () => {
    const next = new Date().toISOString()
    localStorage.setItem('rescuegrid-last-sync', next)
    setLastSyncTime(next)
    incidents.forEach((incident) => {
      if (incident.sync_status === 'pending') {
        incident.sync_status = 'synced'
      }
    })
  }

  return (
    <div className="page-grid">
      <section className="content-panel">
        <div className="panel-header">
          <h2>Settings and offline status</h2>
          <span>Prototype demo configuration</span>
        </div>

        <div className="settings-grid">
          <div className="setting-item"><strong>Connectivity:</strong> {online ? 'Connected' : 'Offline'}</div>
          <div className="setting-item"><strong>Pending sync:</strong> {pendingSync}</div>
          <div className="setting-item"><strong>Reports saved locally:</strong> {incidents.length}</div>
          <div className="setting-item"><strong>Last successful sync:</strong> {lastSyncTime}</div>
          <div className="setting-item"><strong>Voice input available:</strong> {voiceAvailable ? 'Yes' : 'No (manual typing remains available)'}</div>
          <div className="setting-item"><strong>Language preference:</strong> English</div>
          <div className="setting-item">
            <strong>Offline feature info:</strong> Reports are stored locally in IndexedDB and remain visible until synced.
          </div>
        </div>

        <div className="action-row wrap">
          <button type="button" className="ghost-button" onClick={handleExport}>Export data</button>
          <button type="button" className="ghost-button" onClick={handleSync}>Manual sync check</button>
          <button type="button" className="danger-button" onClick={onClear}>Clear local demo data</button>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ title, value, detail, tone }: { title: string; value: string; detail: string; tone: 'blue' | 'red' | 'amber' | 'violet' | 'green' }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Flame size={18} />
      <p>{message}</p>
    </div>
  )
}

function getPriorityScore(item: Incident) {
  const urgencyScore = { low: 1, moderate: 2, high: 4, critical: 6 }[item.urgency]
  const statusScore = item.status === 'Awaiting verification' ? 2 : item.status === 'Resolved' ? -3 : 0
  return urgencyScore + statusScore
}

function formatTime(dateString: string) {
  try {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(dateString))
  } catch {
    return 'Recent'
  }
}

export default App
