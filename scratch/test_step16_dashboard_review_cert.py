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

def test_step16_dashboard_review_and_certificates():
    print("================================================================")
    print("TASK COMPASS — STEP 16 STUDENT DASHBOARD & CERTIFICATES TEST")
    print("================================================================")

    # 1. Clean up test users
    User.objects.filter(username__in=['dash_student', 'other_student']).delete()

    client = Client()

    # 2. Test GET /api/student/dashboard/ unauthenticated
    resp = client.get('/api/student/dashboard/')
    assert resp.status_code == 200
    data = resp.json()
    assert data['authenticated'] is False
    assert 'sign in' in data['message'].lower()
    print("PASS: Unauthenticated dashboard access returns safe guest payload")

    # 3. Register a student user
    reg_resp = client.post('/api/auth/register/', json.dumps({
        'username': 'dash_student',
        'email': 'student@careers.edu',
        'first_name': 'Morgan Freeman',
        'password': 'StrongPassword123!',
        'password_confirm': 'StrongPassword123!'
    }), content_type='application/json')
    assert reg_resp.status_code == 201
    print("PASS: Registered and auto-logged in student 'dash_student'")

    # 4. Check initial dashboard state (0 completed simulations)
    dash_resp = client.get('/api/student/dashboard/')
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data['authenticated'] is True
    assert dash_data['summary']['completed_simulations'] == 0
    assert dash_data['summary']['certificates_earned'] == 0
    assert len(dash_data['simulations']) == 0
    print("PASS: Initial authenticated dashboard reflects clean zero-state")

    # 5. Create a user-linked simulation session
    wp = Workplace.objects.filter(slug='tech-company').first()
    role = Role.objects.filter(slug='cybersecurity-engineer').first()
    assert wp and role

    sess_resp = client.post('/api/sessions/', json.dumps({
        'student_name': 'Morgan Freeman',
        'workplace_id': wp.id,
        'role_id': role.id
    }), content_type='application/json')
    assert sess_resp.status_code == 201
    session_id = sess_resp.json()['id']
    print(f"PASS: Created simulation session {session_id} for user")

    # 6. Verify dashboard shows 1 in-progress simulation
    dash_resp2 = client.get('/api/student/dashboard/')
    dash_data2 = dash_resp2.json()
    assert dash_data2['summary']['total_simulations'] == 1
    assert dash_data2['summary']['in_progress_simulations'] == 1
    assert dash_data2['simulations'][0]['completed'] is False
    print("PASS: Dashboard tracks active in-progress simulation")

    # 7. Complete all 3 stages with 100% accuracy
    roles_by_name = {r.name: r.id for r in Role.objects.filter(workplace=wp)}

    # Stage 1 Answers
    st1_resp = client.get(f'/api/sessions/{session_id}/stage/1/')
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

    # Submit Reflection (which marks session as completed)
    client.post(f'/api/sessions/{session_id}/reflection/', json.dumps({
        'ownership_reflection': 'Primary ownership clarifies containment accountability.',
        'collaboration_reflection': 'Incident Commanders orchestrate security and operations.',
        'improvement_reflection': 'Practice cloud remediation pipelines.'
    }), content_type='application/json')
    print("PASS: Completed all 3 stages (9/9, 100%) and saved reflection")

    # 8. Check Dashboard after completion
    dash_post = client.get('/api/student/dashboard/').json()
    assert dash_post['summary']['completed_simulations'] == 1
    assert dash_post['summary']['overall_average_score'] == 100.0
    assert dash_post['summary']['top_score_percentage'] == 100.0
    assert dash_post['summary']['certificates_earned'] == 1
    assert dash_post['competencies']['ownership']['tier'] == 'Mastered'
    assert dash_post['competencies']['routing']['tier'] == 'Mastered'
    assert dash_post['competencies']['collaboration']['tier'] == 'Mastered'
    assert len(dash_post['role_experience']) >= 1
    assert dash_post['role_experience'][0]['role_name'] == 'Cybersecurity Engineer'
    assert dash_post['simulations'][0]['certificate_eligible'] is True
    print("PASS: Dashboard analytics updated with 100% mastery tiers and certificate qualification")

    # 9. Test Session Review Endpoint GET /api/sessions/<uuid>/review/
    review_resp = client.get(f'/api/sessions/{session_id}/review/')
    assert review_resp.status_code == 200
    rev_data = review_resp.json()
    assert rev_data['role_name'] == 'Cybersecurity Engineer'
    assert rev_data['score']['correct'] == 9
    assert rev_data['score']['percentage'] == 100.0
    assert len(rev_data['responses']) == 9
    assert all(r['is_correct'] is True for r in rev_data['responses'])
    assert rev_data['reflection']['ownership_reflection'] == 'Primary ownership clarifies containment accountability.'
    print("PASS: Session Review endpoint returns full question-by-question audit, feedback rationales, and reflection")

    # 10. Test Session Certificate Endpoint GET /api/sessions/<uuid>/certificate/
    cert_resp = client.get(f'/api/sessions/{session_id}/certificate/')
    assert cert_resp.status_code == 200
    cert_data = cert_resp.json()
    assert cert_data['eligible'] is True
    assert cert_data['student_name'] == 'Morgan Freeman'
    assert cert_data['role_name'] == 'Cybersecurity Engineer'
    assert cert_data['percentage'] == 100.0
    assert 'Distinction' in cert_data['distinction']
    assert 'TC-VERIFIED-' in cert_data['certificate_id']
    assert len(cert_data['competencies_certified']) == 3
    print(f"PASS: Certificate generated with verified ID: {cert_data['certificate_id']}")

    # 11. Test Security / Authorization Isolation
    # Create a second user and try to access Morgan's review and certificate
    client_other = Client()
    client_other.post('/api/auth/register/', json.dumps({
        'username': 'other_student',
        'email': 'other@careers.edu',
        'first_name': 'Other Person',
        'password': 'StrongPassword123!',
        'password_confirm': 'StrongPassword123!'
    }), content_type='application/json')

    unauth_review = client_other.get(f'/api/sessions/{session_id}/review/')
    assert unauth_review.status_code == 403, f"Expected 403, got {unauth_review.status_code}"
    print("PASS: Unauthorized user rejected with HTTP 403 from reviewing another user's session")

    unauth_cert = client_other.get(f'/api/sessions/{session_id}/certificate/')
    assert unauth_cert.status_code == 403, f"Expected 403, got {unauth_cert.status_code}"
    print("PASS: Unauthorized user rejected with HTTP 403 from generating another user's certificate")

    # 12. Clean up test users
    User.objects.filter(username__in=['dash_student', 'other_student']).delete()
    print("PASS: Cleaned up test accounts")

    print("\n================================================================")
    print("ALL STEP 16 STUDENT DASHBOARD & CERTIFICATES TESTS PASSED!")
    print("================================================================")

if __name__ == '__main__':
    test_step16_dashboard_review_and_certificates()
