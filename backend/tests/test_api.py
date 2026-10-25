from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_create_incident():
    payload = {
        'id': f'case-{uuid4()}',
        'title': 'Flooded home',
        'description': 'Water entered the house and family needs rescue.',
        'input_language': 'English',
        'category': 'Flooding',
        'urgency': 'critical',
        'sync_status': 'pending',
    }
    response = client.post('/incidents', json=payload)
    assert response.status_code == 201
    assert response.json()['title'] == 'Flooded home'


def test_dashboard_summary():
    response = client.get('/dashboard')
    assert response.status_code == 200
    data = response.json()
    assert 'total_incidents' in data
    assert 'critical_incidents' in data
