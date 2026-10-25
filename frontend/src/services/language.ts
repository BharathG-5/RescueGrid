export type LanguageLabel = 'Tamil' | 'English' | 'Tanglish' | 'Mixed'

const categoryKeywords: Record<string, string[]> = {
  Flooding: ['flood', 'flooding', 'vellam', 'வெள்ளம்', 'thanni', 'தண்ணீர்', 'water entering'],
  'Trapped people': ['trapped', 'stuck', 'rescue', 'sikki', 'மாட்டிக்கொண்டோம்', 'blocked', 'people stuck'],
  'Medical emergency': ['medical', 'doctor', 'hospital', 'marundhu', 'மருந்து', 'kaayam', 'காயம்', 'injury'],
  Injury: ['injured', 'injury', 'kaayam', 'காயம்', 'hurt', 'bleeding'],
  'Food shortage': ['food', 'hungry', 'saapadu', 'உணவு', 'hunger', 'ration'],
  'Drinking water shortage': ['drinking water', 'kudikka thanni', 'kudineer', 'குடிநீர்', 'water shortage', 'no water'],
  'Medicine shortage': ['medicine', 'medication', 'marundhu', 'மருந்து', 'pharmacy', 'doctor prescription'],
  'Shelter requirement': ['shelter', 'camp', 'temporary shelter', 'அடைக்கல', 'மஞ்சள்'],
  'Missing person': ['missing', 'lost', 'missing person', 'மறைந்த', 'காணாமல்'],
  'Infrastructure damage': ['bridge', 'road blocked', 'power cut', 'electricity', 'damage', 'collapsed'],
}

const tanglishWords = ['vellam', 'kudikka thanni', 'venum', 'marundhu', 'saapadu', 'veetukulla', 'sikki', 'thanni']

export function detectLanguage(text: string): LanguageLabel {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return 'English'

  const hasTamil = /[\u0B80-\u0BFF]/.test(text)
  const hasLatin = /[a-z]/i.test(text)

  if (hasTamil && hasLatin) return 'Mixed'
  if (hasTamil) return 'Tamil'
  if (normalized.includes('vellam') || normalized.includes('venum') || tanglishWords.some((w) => normalized.includes(w))) {
    return 'Tanglish'
  }
  return 'English'
}

export function detectIncidentCategory(text: string) {
  const normalized = text.toLowerCase().trim()
  if (!normalized) {
    return { category: 'Other', confidence: 0, reasons: ['No incident keywords detected.'] }
  }

  const matches = Object.entries(categoryKeywords)
    .map(([category, keywords]) => ({
      category,
      matches: keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())),
    }))
    .filter(({ matches }) => matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length)

  if (matches.length === 0) {
    return { category: 'Other', confidence: 0.15, reasons: ['No strong category signal detected.'] }
  }

  const waterShortageIndicators = ['kudikka thanni', 'drinking water', 'water shortage', 'no water', 'need water', 'need drinking water']
  if (waterShortageIndicators.some((indicator) => normalized.includes(indicator))) {
    const hasFloodingContext = normalized.includes('flood') || normalized.includes('vellam') || normalized.includes('water entering')
    if (!hasFloodingContext) {
      return { category: 'Drinking water shortage', confidence: 0.8, reasons: ['Detected a drinking-water request.'] }
    }
  }

  const top = matches[0]
  const reasons = top.matches.slice(0, 3)
  const score = Math.min(0.9, 0.35 + top.matches.length * 0.2)

  if (top.category === 'Flooding' && normalized.includes('vellam') && normalized.includes('veetukulla')) {
    return { category: 'Flooding', confidence: 0.82, reasons: ['Detected floodwater entering a residence.'] }
  }

  return {
    category: top.category,
    confidence: score,
    reasons: reasons.length ? reasons : ['Matches key category terms.'],
  }
}

export function speechRecognitionSupported() {
  const speechRecognition = (
    window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }
  ).SpeechRecognition
  const webkitSpeechRecognition = (
    window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }
  ).webkitSpeechRecognition

  return Boolean(speechRecognition || webkitSpeechRecognition)
}
