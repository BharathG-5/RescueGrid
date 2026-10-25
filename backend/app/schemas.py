from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    id: str
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=5)
    input_language: str = 'English'
    category: str = 'Other'
    urgency: str = 'moderate'
    evidence_confidence: float = 0.5
    people_affected: Optional[int] = None
    requested_resources: list[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_description: str = ''
    reporter_contact: Optional[str] = None
    status: str = 'Reported'
    verification_state: str = 'Pending'
    sync_status: str = 'pending'
    priority_explanation: str = ''
    client_id: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[str] = None
    status: Optional[str] = None
    verification_state: Optional[str] = None
    status_notes: Optional[str] = None
    assigned_responder: Optional[str] = None
    reporter_contact: Optional[str] = None
    sync_status: Optional[str] = None


class VerificationCreate(BaseModel):
    action: str
    notes: Optional[str] = None


class NoteCreate(BaseModel):
    note: str


class ResourceRequestCreate(BaseModel):
    resource_name: str
    quantity: Optional[str] = None
    status: str = 'requested'
    location: Optional[str] = None
    urgency: str = 'moderate'
    assigned_responder: Optional[str] = None


class DashboardSummary(BaseModel):
    total_incidents: int
    critical_incidents: int
    unverified_reports: int
    unresolved_requests: int
    resolved_incidents: int
    resource_shortages: int
    communication_gap_alerts: int


class SyncRequest(BaseModel):
    client_id: str
    incidents: list[IncidentCreate]
