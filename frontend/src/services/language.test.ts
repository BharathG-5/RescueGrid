import { describe, expect, it } from 'vitest'

import { detectIncidentCategory, detectLanguage } from './language'

describe('language detection and categorization', () => {
  it('keeps Tamil text intact', () => {
    const text = 'வெள்ளம் வீட்டுக்குள் வருகிறது. எங்களுக்கு குடிநீர் தேவை.'
    expect(detectLanguage(text)).toBe('Tamil')
  })

  it('categorizes Tanglish water requests correctly', () => {
    const text = 'Vellam veetukulla varuthu. Engalukku kudikka thanni venum.'
    expect(detectLanguage(text)).toBe('Tanglish')
    expect(detectIncidentCategory(text).category).toBe('Flooding')
  })

  it('recognizes drinking water shortages without misclassifying as flooding', () => {
    const text = 'Kudikka thanni venum, no clean water in the area.'
    expect(detectIncidentCategory(text).category).toBe('Drinking water shortage')
  })
})
