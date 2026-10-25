import { describe, expect, it } from 'vitest'

import { demoIncidents } from '../data/demo'
import { hasValidCoordinates, incidentMarkerColor } from './IncidentMap'

describe('incident map helpers', () => {
  it('accepts only incidents with finite in-range coordinates', () => {
    expect(demoIncidents.filter(hasValidCoordinates)).toHaveLength(5)
    expect(
      hasValidCoordinates({
        ...demoIncidents[0],
        latitude: 91,
      }),
    ).toBe(false)
  })

  it('uses status and urgency to choose marker colors', () => {
    expect(incidentMarkerColor(demoIncidents[0])).toBe('#d97706')
    expect(
      incidentMarkerColor({
        ...demoIncidents[0],
        status: 'Reported',
        urgency: 'critical',
      }),
    ).toBe('#dc2626')
    expect(incidentMarkerColor(demoIncidents[5])).toBe('#16a34a')
  })
})
