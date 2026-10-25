from __future__ import annotations

from datetime import datetime
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Incident, ResponderNote, ResourceRequest, SyncMetadata, VerificationRecord
from .schemas import DashboardSummary, IncidentCreate, IncidentUpdate, NoteCreate, ResourceRequestCreate, SyncRequest, VerificationCreate

app = FastAPI(title='RescueGrid API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

Base.metadata.create_all(bind=engine)


@app.get('/health')
def health_check():
    return {'status': 'ok', 'service': 'rescuegrid-api'}


@app.post('/incidents', status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    existing = db.query(Incident).filter(Incident.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=409, detail='Incident with this client ID already exists')

    incident = Incident(
        **payload.model_dump(exclude_none=True),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@app.get('/incidents')
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.created_at.desc()).all()


@app.get('/incidents/{incident_id}')
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail='Incident not found')
    return incident


@app.patch('/incidents/{incident_id}')
def update_incident(incident_id: str, payload: IncidentUpdate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail='Incident not found')

    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(incident, key, value)

    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident


@app.post('/incidents/{incident_id}/status')
def update_status(incident_id: str, status_value: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail='Incident not found')
    incident.status = status_value
    incident.updated_at = datetime.utcnow()
    db.commit()
    return incident


@app.post('/incidents/{incident_id}/verify')
def add_verification(incident_id: str, payload: VerificationCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail='Incident not found')

    record = VerificationRecord(incident_id=incident_id, action=payload.action, notes=payload.notes)
    db.add(record)
    incident.verification_state = payload.action
    incident.updated_at = datetime.utcnow()
    db.commit()
    return {'status': 'recorded', 'incident_id': incident_id}


@app.post('/incidents/{incident_id}/notes')
def add_note(incident_id: str, payload: NoteCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail='Incident not found')

    note = ResponderNote(incident_id=incident_id, note=payload.note)
    db.add(note)
    incident.responder_notes = payload.note
    incident.updated_at = datetime.utcnow()
    db.commit()
    return {'status': 'saved'}


@app.get('/resources')
def list_resources(db: Session = Depends(get_db)):
    return db.query(ResourceRequest).order_by(ResourceRequest.updated_at.desc()).all()


@app.post('/resources')
def create_resource(payload: ResourceRequestCreate, db: Session = Depends(get_db)):
    resource = ResourceRequest(
        incident_id=payload.resource_name,
        resource_name=payload.resource_name,
        quantity=payload.quantity,
        status=payload.status,
        location=payload.location,
        urgency=payload.urgency,
        assigned_responder=payload.assigned_responder,
    )
    db.add(resource)
    db.commit()
    return resource


@app.post('/sync')
def synchronize(payload: SyncRequest, db: Session = Depends(get_db)):
    metadata = db.query(SyncMetadata).filter(SyncMetadata.client_id == payload.client_id).first()
    if not metadata:
        metadata = SyncMetadata(client_id=payload.client_id, status='pending')
        db.add(metadata)

    for item in payload.incidents:
        existing = db.query(Incident).filter(Incident.id == item.id).first()
        if not existing:
            db.add(Incident(**item.model_dump(exclude_none=True), created_at=datetime.utcnow(), updated_at=datetime.utcnow()))

    metadata.status = 'synced'
    metadata.last_sync_at = datetime.utcnow()
    db.commit()
    return {'status': 'ok', 'synced': len(payload.incidents)}


@app.get('/dashboard')
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    incidents = db.query(Incident).all()
    total = len(incidents)
    critical = sum(1 for i in incidents if i.urgency == 'critical')
    unverified = sum(1 for i in incidents if i.status in {'Reported', 'Awaiting verification'})
    unresolved = sum(1 for i in incidents if i.status not in {'Resolved', 'False alarm'})
    resolved = sum(1 for i in incidents if i.status == 'Resolved')
    resource_shortages = sum(1 for i in incidents if any(term in ' '.join(i.requested_resources).lower() for term in ['water', 'food', 'medicine', 'shelter']))
    communication_gap_alerts = sum(1 for i in incidents if i.status in {'Awaiting verification'} and i.urgency in {'high', 'critical'})

    return DashboardSummary(
        total_incidents=total,
        critical_incidents=critical,
        unverified_reports=unverified,
        unresolved_requests=unresolved,
        resolved_incidents=resolved,
        resource_shortages=resource_shortages,
        communication_gap_alerts=communication_gap_alerts,
    )


@app.get('/')
def root():
    return {'message': 'RescueGrid API active'}
