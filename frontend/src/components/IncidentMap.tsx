import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import type { Incident } from '../types'

export const OSM_TILE_URL =
  import.meta.env.VITE_OSM_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const mapCenter: L.LatLngExpression = [13.0827, 80.2707]

export function hasValidCoordinates(incident: Incident): incident is Incident & {
  latitude: number
  longitude: number
} {
  return (
    typeof incident.latitude === 'number' &&
    Number.isFinite(incident.latitude) &&
    incident.latitude >= -90 &&
    incident.latitude <= 90 &&
    typeof incident.longitude === 'number' &&
    Number.isFinite(incident.longitude) &&
    incident.longitude >= -180 &&
    incident.longitude <= 180
  )
}

export function incidentMarkerColor(incident: Incident) {
  if (incident.status === 'Resolved') return '#16a34a'
  if (incident.status === 'Awaiting verification') return '#d97706'
  if (incident.urgency === 'critical') return '#dc2626'
  if (incident.urgency === 'high') return '#ea580c'
  return '#2563eb'
}

function markerIcon(incident: Incident) {
  return L.divIcon({
    className: 'incident-marker-wrapper',
    html: `<span class="incident-marker" style="--marker-color:${incidentMarkerColor(incident)}" aria-hidden="true"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function MapViewport({ incidents }: { incidents: (Incident & { latitude: number; longitude: number })[] }) {
  const map = useMap()

  useEffect(() => {
    if (incidents.length === 1) {
      map.setView([incidents[0].latitude, incidents[0].longitude], Math.max(map.getZoom(), 13))
    } else if (incidents.length > 1) {
      const bounds = L.latLngBounds(incidents.map((incident) => [incident.latitude, incident.longitude]))
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 })
    }
  }, [incidents, map])

  return null
}

function SelectLocationOnMap({
  onLocationSelect,
}: {
  onLocationSelect?: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      onLocationSelect?.(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

export interface IncidentMapProps {
  incidents: Incident[]
  onSelectIncident?: (incident: Incident) => void
  onLocationSelect?: (latitude: number, longitude: number) => void
}

export function IncidentMap({ incidents, onSelectIncident, onLocationSelect }: IncidentMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const mappableIncidents = useMemo(() => incidents.filter(hasValidCoordinates), [incidents])

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) setTilesFailed(false)
    }
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  return (
    <>
      {(!online || tilesFailed) && (
        <div className="map-tile-warning" role="status">
          {online
            ? 'Map tiles could not be loaded. Your saved reports and coordinates remain available below.'
            : 'Offline: map tiles need an internet connection. Locally saved reports and coordinates remain available below.'}
        </div>
      )}
      {mappableIncidents.length === 0 && (
        <div className="map-tile-warning" role="status">
          No reports with valid coordinates are available to plot. Incidents without coordinates remain listed below.
        </div>
      )}
      <div className="leaflet-map" aria-label="Interactive OpenStreetMap showing incident locations">
        <MapContainer center={mapCenter} zoom={11} scrollWheelZoom className="leaflet-map-canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={OSM_TILE_URL}
            eventHandlers={{
              tileerror: () => setTilesFailed(true),
            }}
          />
          <MapViewport incidents={mappableIncidents} />
          <SelectLocationOnMap onLocationSelect={onLocationSelect} />
          {mappableIncidents.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.latitude, incident.longitude]}
              icon={markerIcon(incident)}
              eventHandlers={{
                click: () => onSelectIncident?.(incident),
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{incident.title}</strong>
                  <span>ID: {incident.id}</span>
                  <span>Category: {incident.category}</span>
                  <span>Urgency: {incident.urgency}</span>
                  <span>Status: {incident.status}</span>
                  <span>Reported: {formatReportTime(incident.created_at)}</span>
                  {incident.id.startsWith('demo-') && <em>Simulated demo incident — not a live emergency</em>}
                  <button type="button" onClick={() => onSelectIncident?.(incident)}>
                    Open incident details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  )
}

function formatReportTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}
