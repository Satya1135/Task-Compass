import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_compass.settings')

import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from simulation.models import SimulationSession, Workplace, Role, Scenario, StageResponse, StudentReflection

User = get_user_model()

def test_step15_auth_system():
    print("==================================================")
    print("TASK COMPASS — STEP 15 AUTHENTICATION TEST SUITE")
    print("==================================================")

    # Clean up test users
    User.objects.filter(username__in=['teststudent', 'alex_portfolio', 'dup_user']).delete()

    client = Client()

    # 1. Test GET /api/auth/me/ unauthenticated
    resp = client.get('/api/auth/me/')
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data['authenticated'] is False, "Expected authenticated=False for guest"
    assert data['user'] is None, "Expected user=None for guest"
    print("PASS: /api/auth/me/ unauthenticated returns guest state")

    # 2. Test User Registration Validation
    # 2a. Missing fields
    resp = client.post('/api/auth/register/', json.dumps({
        'username': '',
        'email': 'bad',
        'password': '123'
    }), content_type='application/json')
    assert resp.status_code == 400, f"Expected 400 for empty username, got {resp.status_code}"
    print("PASS: Registration rejected empty username")

    # 2b. Password mismatch
    resp = client.post('/api/auth/register/', json.dumps({
        'username': 'teststudent',
        'email': 'student@example.edu',
        'password': 'SecretPassword123',
        'password_confirm': 'DifferentPassword456'
    }), content_type='application/json')
    assert resp.status_code == 400, f"Expected 400 for password mismatch, got {resp.status_code}"
    assert 'match' in str(resp.json()).lower(), "Expected mismatch message"
    print("PASS: Registration rejected password mismatch")

    # 2c. Successful registration
    resp = client.post('/api/auth/register/', json.dumps({
        'username': 'teststudent',
        'email': 'student@example.edu',
        'first_name': 'Alex Student',
        'password': 'SecretPassword123',
        'password_confirm': 'SecretPassword123'
    }), content_type='application/json')
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.json()}"
    reg_data = resp.json()
    assert reg_data['authenticated'] is True, "Expected auto-login on registration"
    assert reg_data['user']['username'] == 'teststudent', "Expected correct username"
    assert reg_data['user']['first_name'] == 'Alex Student', "Expected correct first name"
    print("PASS: User registration succeeded and auto-logged in")

    # 2d. Duplicate username rejected
    client2 = Client()
    resp = client2.post('/api/auth/register/', json.dumps({
        'username': 'teststudent',
        'email': 'other@example.edu',
        'password': 'SecretPassword123',
        'password_confirm': 'SecretPassword123'
    }), content_type='application/json')
    assert resp.status_code == 400, f"Expected 400 for duplicate username, got {resp.status_code}"
    print("PASS: Duplicate username rejected")

    # 3. Test /api/auth/me/ with active session
    resp = client.get('/api/auth/me/')
    assert resp.status_code == 200
    data = resp.json()
    assert data['authenticated'] is True
    assert data['user']['username'] == 'teststudent'
    print("PASS: /api/auth/me/ returns authenticated user profile")

    # 4. Test User Logout
    resp = client.post('/api/auth/logout/')
    assert resp.status_code == 200
    assert resp.json()['authenticated'] is False
    # Check /me is now unauthenticated
    resp = client.get('/api/auth/me/')
    assert resp.json()['authenticated'] is False
    print("PASS: User logout successfully clears session")

    # 5. Test User Login
    # 5a. Bad credentials
    resp = client.post('/api/auth/login/', json.dumps({
        'username': 'teststudent',
        'password': 'WrongPassword!'
    }), content_type='application/json')
    assert resp.status_code == 400
    print("PASS: Invalid login credentials rejected")

    # 5b. Good credentials
    resp = client.post('/api/auth/login/', json.dumps({
        'username': 'teststudent',
        'password': 'SecretPassword123'
    }), content_type='application/json')
    assert resp.status_code == 200
    assert resp.json()['authenticated'] is True
    assert resp.json()['user']['username'] == 'teststudent'
    print("PASS: Valid login succeeded and authenticated session")

    # 6. Test User-Linked Simulation Creation
    wp = Workplace.objects.filter(slug='tech-company').first()
    role = Role.objects.filter(slug='cybersecurity-engineer').first()
    assert wp and role, "Expected Tech Company and Cybersecurity Engineer"

    resp = client.post('/api/sessions/', json.dumps({
        'student_name': 'Alex Student',
        'workplace_id': wp.id,
        'role_id': role.id
    }), content_type='application/json')
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.json()}"
    sim_data = resp.json()
    session_id = sim_data['id']
    assert sim_data['user'] is not None, "Expected user field in session data"
    assert sim_data['user']['username'] == 'teststudent', "Expected user linked to session"

    # Verify directly in DB
    db_session = SimulationSession.objects.get(id=session_id)
    assert db_session.user is not None, "Expected DB session.user to be set"
    assert db_session.user.username == 'teststudent', "Expected DB session.user to match teststudent"
    print("PASS: SimulationSession created with user ForeignKey linkage")

    # 7. Complete all 3 stages and verify user history updates
    roles_by_name = {r.name: r.id for r in Role.objects.filter(workplace=wp)}

    # Stage 1 Answers
    st1_resp = client.get(f'/api/sessions/{session_id}/stage/1/')
    assert st1_resp.status_code == 200
    st1_scenarios = st1_resp.json().get('scenarios', [])
    st1_expected = {
        1: roles_by_name["SOC Analyst"],
        2: roles_by_name["Cybersecurity Engineer"],
        3: roles_by_name["SOC Analyst"]
    }
    for sc in st1_scenarios:
        sc_num = sc.get("question_number", 1)
        client.post(f'/api/sessions/{session_id}/answers/', json.dumps({
            'stage': 1,
            'scenario_id': sc['id'],
            'selected_role_id': st1_expected[sc_num]
        }), content_type='application/json')

    # Stage 2 Answers
    st2_resp = client.get(f'/api/sessions/{session_id}/stage/2/')
    assert st2_resp.status_code == 200
    st2_scenarios = st2_resp.json().get('scenarios', [])
    st2_expected_routes = {
        1: [roles_by_name["Customer Support / IT"], roles_by_name["SOC Analyst"], roles_by_name["Cybersecurity Engineer"], roles_by_name["Network Engineer"], roles_by_name["Engineering Manager"]],
        2: [roles_by_name["Cybersecurity Engineer"], roles_by_name["Backend Developer"], roles_by_name["DevOps / Cloud Engineer"], roles_by_name["QA / Test Engineer"], roles_by_name["Engineering Manager"]],
        3: [roles_by_name["SOC Analyst"], roles_by_name["Cybersecurity Engineer"], roles_by_name["Network Engineer"], roles_by_name["DevOps / Cloud Engineer"], roles_by_name["Engineering Manager"]]
    }
    for sc in st2_scenarios:
        sc_num = sc.get("question_number", 1)
        client.post(f'/api/sessions/{session_id}/answers/', json.dumps({
            'stage': 2,
            'scenario_id': sc['id'],
            'role_order': st2_expected_routes[sc_num]
        }), content_type='application/json')

    # Stage 3 Answers
    st3_resp = client.get(f'/api/sessions/{session_id}/stage/3/')
    assert st3_resp.status_code == 200
    st3_scenarios = st3_resp.json().get('scenarios', [])
    st3_expected_collab = {
        1: {
            "primary": roles_by_name["SOC Analyst"],
            "supporting": [roles_by_name["Cybersecurity Engineer"], roles_by_name["Network Engineer"], roles_by_name["DevOps / Cloud Engineer"]],
            "workflow": [roles_by_name["SOC Analyst"], roles_by_name["Cybersecurity Engineer"], roles_by_name["Network Engineer"], roles_by_name["DevOps / Cloud Engineer"], roles_by_name["Engineering Manager"]]
        },
        2: {
            "primary": roles_by_name["Cybersecurity Engineer"],
            "supporting": [roles_by_name["Backend Developer"], roles_by_name["DevOps / Cloud Engineer"], roles_by_name["QA / Test Engineer"], roles_by_name["Engineering Manager"]],
            "workflow": [roles_by_name["Cybersecurity Engineer"], roles_by_name["Backend Developer"], roles_by_name["DevOps / Cloud Engineer"], roles_by_name["QA / Test Engineer"], roles_by_name["Engineering Manager"]]
        },
        3: {
            "primary": roles_by_name["Cybersecurity Engineer"],
            "supporting": [roles_by_name["SOC Analyst"], roles_by_name["Backend Developer"], roles_by_name["Network Engineer"], roles_by_name["Engineering Manager"]],
            "workflow": [roles_by_name["SOC Analyst"], roles_by_name["Cybersecurity Engineer"], roles_by_name["Backend Developer"], roles_by_name["Network Engineer"], roles_by_name["Engineering Manager"]]
        }
    }
    for sc in st3_scenarios:
        sc_num = sc.get("question_number", 1)
        collab = st3_expected_collab[sc_num]
        client.post(f'/api/sessions/{session_id}/answers/', json.dumps({
            'stage': 3,
            'scenario_id': sc['id'],
            'primary_role_id': collab["primary"],
            'supporting_role_ids': collab["supporting"],
            'workflow_role_ids': collab["workflow"]
        }), content_type='application/json')

    # Final Results
    results_resp = client.get(f'/api/sessions/{session_id}/results/')
    assert results_resp.status_code == 200
    res_data = results_resp.json()
    assert res_data['overall']['correct'] == 9, f"Expected 9, got {res_data['overall']['correct']}"
    assert res_data['overall']['percentage'] == 100

    # Reflection
    client.post(f'/api/sessions/{session_id}/reflection/', json.dumps({
        'ownership_reflection': 'Learned task triage thoroughly.',
        'collaboration_reflection': 'Coordinated with Incident Commander.',
        'improvement_reflection': 'Improve on faster initial routing.'
    }), content_type='application/json')
    print("PASS: Completed 3 stages, results (9/9, 100%), and reflection for authenticated user")

    # 8. Test /api/auth/history/
    hist_resp = client.get('/api/auth/history/')
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert hist['stats']['total_simulations'] >= 1
    assert hist['stats']['completed_simulations'] >= 1
    assert hist['stats']['avg_score_pct'] == 100
    assert hist['stats']['highest_score_pct'] == 100
    assert len(hist['simulations']) >= 1
    assert hist['simulations'][0]['role_name'] == 'Cybersecurity Engineer'
    assert hist['simulations'][0]['final_score'] == 9
    assert hist['simulations'][0]['completed'] is True
    print(f"PASS: /api/auth/history/ returns portfolio stats and simulation entries: {hist['stats']}")

    # 9. Test Guest/Anonymous Simulation Backward Compatibility
    guest_client = Client()
    guest_resp = guest_client.post('/api/sessions/', json.dumps({
        'student_name': 'Guest Learner',
        'workplace_id': wp.id,
        'role_id': role.id
    }), content_type='application/json')
    assert guest_resp.status_code == 201
    guest_sim = guest_resp.json()
    assert guest_sim['user'] is None, "Expected user=None for guest session"
    guest_db_session = SimulationSession.objects.get(id=guest_sim['id'])
    assert guest_db_session.user is None, "Expected DB user=None for guest session"
    print("PASS: Guest simulation session created without user requirement (backward compatible)")

    # 10. Clean up test user
    User.objects.filter(username='teststudent').delete()
    print("PASS: Cleaned up test user")

    print("\n==================================================")
    print("ALL STEP 15 AUTHENTICATION TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == '__main__':
    test_step15_auth_system()
