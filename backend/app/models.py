from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text

from .database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    input_language = Column(String, nullable=False)
    category = Column(String, nullable=False)
    urgency = Column(String, nullable=False, default="moderate")
    evidence_confidence = Column(Float, default=0.0)
    people_affected = Column(Integer, nullable=True)
    requested_resources = Column(JSON, default=list)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_description = Column(String, nullable=True)
    reporter_contact = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Reported")
    verification_state = Column(String, nullable=False, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_confirmed_at = Column(DateTime, nullable=True)
    assigned_responder = Column(String, nullable=True)
    responder_notes = Column(Text, nullable=True)
    attachment_metadata = Column(String, nullable=True)
    sync_status = Column(String, nullable=False, default="pending")
    priority_explanation = Column(Text, nullable=True)


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ResourceRequest(Base):
    __tablename__ = "resource_requests"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, nullable=False)
    resource_name = Column(String, nullable=False)
    quantity = Column(String, nullable=True)
    status = Column(String, nullable=False, default="requested")
    location = Column(String, nullable=True)
    urgency = Column(String, nullable=False, default="moderate")
    assigned_responder = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResponderNote(Base):
    __tablename__ = "responder_notes"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncMetadata(Base):
    __tablename__ = "sync_metadata"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, nullable=False, unique=True)
    last_sync_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
