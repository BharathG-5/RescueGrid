export type IncidentUrgency = 'low' | 'moderate' | 'high' | 'critical';
export type IncidentStatus =
  | 'Reported'
  | 'Awaiting verification'
  | 'Confirmed'
  | 'Assistance assigned'
  | 'Resolved'
  | 'False alarm';
export type VerificationState =
  | 'Pending'
  | 'Verified'
  | 'Needs follow-up'
  | 'Rejected';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export type IncidentCategory =
  | 'Flooding'
  | 'Trapped people'
  | 'Medical emergency'
  | 'Injury'
  | 'Food shortage'
  | 'Drinking water shortage'
  | 'Medicine shortage'
  | 'Shelter requirement'
  | 'Missing person'
  | 'Infrastructure damage'
  | 'Other';

export interface Incident {
  id: string;
  client_id?: string;
  title: string;
  description: string;
  description_original?: string;
  input_language: 'Tamil' | 'English' | 'Tanglish' | 'Mixed';
  detected_language?: string;
  category: IncidentCategory;
  urgency: IncidentUrgency;
  evidence_confidence: number;
  people_affected?: number;
  requested_resources: string[];
  latitude?: number;
  longitude?: number;
  location_description: string;
  reporter_contact?: string;
  status: IncidentStatus;
  verification_state: VerificationState;
  created_at: string;
  updated_at: string;
  last_confirmed_at?: string;
  assigned_responder?: string;
  responder_notes?: string;
  attachment_metadata?: string;
  sync_status: SyncStatus;
  priority_explanation: string;
}

export interface DraftIncident {
  id: string;
  title: string;
  description: string;
  input_language: string;
  category: string;
  urgency: IncidentUrgency;
  people_affected?: number;
  requested_resources: string[];
  location_description: string;
  reporter_contact?: string;
  created_at: string;
  updated_at: string;
}
