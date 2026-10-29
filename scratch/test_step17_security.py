"""
TASK COMPASS — STEP 17: PRODUCTION SECURITY & HARDENING VERIFICATION TEST SUITE
Tests production configuration, security headers, object-level access control (IDOR),
assessment integrity (anti-cheat), score manipulation prevention, input validation,
and guest/authenticated session handling.
"""

import os
import sys
import uuid
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_compass.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.conf import settings
from django.contrib.auth.models import User
from django.test import RequestFactory
from rest_framework.test import APIClient
from simulation.models import (
    Workplace,
    Role,
    Scenario,
    ScenarioOption,
    SimulationSession,
    StageResponse,
    StudentReflection,
)

passed_count = 0
failed_count = 0


def record_result(test_name, passed, detail=""):
    global passed_count, failed_count
    if passed:
        passed_count += 1
        print(f"  [PASS] {test_name} {detail}")
    else:
        failed_count += 1
        print(f"  [FAIL] {test_name}: {detail}")


def run_security_tests():
    print("\n=======================================================")
    print("TASK COMPASS — STEP 17 SECURITY & HARDENING TEST SUITE")
    print("=======================================================\n")

    client = APIClient()

    # -------------------------------------------------------------
    # 1. DJANGO PRODUCTION SETTINGS & HEADERS
    # -------------------------------------------------------------
    print("--- 1. Django Configuration & Security Headers ---")

    record_result(
        "SECURE_CONTENT_TYPE_NOSNIFF is enabled",
        getattr(settings, 'SECURE_CONTENT_TYPE_NOSNIFF', False) is True
    )

    record_result(
        "X_FRAME_OPTIONS is DENY",
        getattr(settings, 'X_FRAME_OPTIONS', '') == 'DENY'
    )

    record_result(
        "SESSION_COOKIE_HTTPONLY is enabled",
        getattr(settings, 'SESSION_COOKIE_HTTPONLY', False) is True
    )

    record_result(
        "SESSION_COOKIE_SAMESITE is Lax",
        getattr(settings, 'SESSION_COOKIE_SAMESITE', '') == 'Lax'
    )

    record_result(
        "CSRF_COOKIE_SAMESITE is Lax",
        getattr(settings, 'CSRF_COOKIE_SAMESITE', '') == 'Lax'
    )

    record_result(
        "STATIC_ROOT is configured for production collectstatic",
        bool(getattr(settings, 'STATIC_ROOT', None))
    )

    record_result(
        "Structured LOGGING dictionary configured",
        isinstance(getattr(settings, 'LOGGING', None), dict) and 'handlers' in settings.LOGGING
    )

    # Verify actual HTTP response headers from Django
    resp = client.get('/')
    record_result(
        "Response includes X-Content-Type-Options: nosniff",
        resp.headers.get('X-Content-Type-Options') == 'nosniff'
    )
    record_result(
        "Response includes X-Frame-Options: DENY",
        resp.headers.get('X-Frame-Options') == 'DENY'
    )

    # -------------------------------------------------------------
    # 2. ASSESSMENT INTEGRITY & ANTI-CHEAT (ANSWER KEY ISOLATION)
    # -------------------------------------------------------------
    print("\n--- 2. Assessment Integrity & Answer Key Isolation ---")

    wp = Workplace.objects.filter(slug='tech-company').first()
    if not wp:
        wp = Workplace.objects.first()
    first_role = wp.roles.first()

    test_session = SimulationSession.objects.create(
        student_name="Security Test Learner",
        workplace=wp,
        selected_role=first_role,
        current_stage=1,
        status='in_progress'
    )

    stage1_resp = client.get(f'/api/sessions/{test_session.id}/stage/1/')
    record_result(
        "Stage scenarios API responds HTTP 200",
        stage1_resp.status_code == 200
    )

    scenarios_data = stage1_resp.json().get('scenarios', [])
    leak_detected = False
    for sc in scenarios_data:
        # Crucial security check: student question endpoint MUST NOT leak answers
        if 'primary_owner_name' in sc or 'workflow_route' in sc or 'explanation' in sc or 'primary_owner' in sc:
            leak_detected = True
            break

    record_result(
        "Stage scenarios DO NOT leak answer keys (primary_owner, workflow_route, explanation)",
        not leak_detected,
        "(Protected by ScenarioPublicSerializer)" if not leak_detected else "(Answer key found in GET response!)"
    )

    # -------------------------------------------------------------
    # 3. OBJECT-LEVEL ACCESS CONTROL & IDOR PROTECTION
    # -------------------------------------------------------------
    print("\n--- 3. Object-Level Access Control (IDOR Prevention) ---")

    user_a, _ = User.objects.get_or_create(username='student_owner_a', defaults={'email': 'owner_a@test.edu'})
    user_a.set_password('Password123!')
    user_a.save()

    user_b, _ = User.objects.get_or_create(username='student_attacker_b', defaults={'email': 'attacker_b@test.edu'})
    user_b.set_password('Password123!')
    user_b.save()

    # Session owned exclusively by User A
    session_a = SimulationSession.objects.create(
        user=user_a,
        student_name="Student Owner A",
        workplace=wp,
        selected_role=first_role,
        current_stage=1,
        status='in_progress'
    )

    # Client B logs in as User B
    client_b = APIClient()
    client_b.force_authenticate(user=user_b)

    # Attempt 1: User B tries to view User A's session detail
    resp_idor_detail = client_b.get(f'/api/sessions/{session_a.id}/')
    record_result(
        "Cross-user Session Detail GET blocked (HTTP 403 Forbidden)",
        resp_idor_detail.status_code == 403
    )

    # Attempt 2: User B tries to view User A's scenarios
    resp_idor_scenarios = client_b.get(f'/api/sessions/{session_a.id}/stage/1/')
    record_result(
        "Cross-user Stage Scenarios GET blocked (HTTP 403 Forbidden)",
        resp_idor_scenarios.status_code == 403
    )

    # Attempt 3: User B tries to submit answers to User A's session
    s1_sc = Scenario.objects.filter(workplace=wp, stage=1).first()
    resp_idor_answer = client_b.post(f'/api/sessions/{session_a.id}/answers/', {
        'scenario_id': s1_sc.id if s1_sc else 1,
        'selected_role_id': first_role.id,
        'stage': 1,
        'student_notes': 'Tampering attempt by User B'
    }, format='json')
    record_result(
        "Cross-user Answer Submission POST blocked (HTTP 403 Forbidden)",
        resp_idor_answer.status_code == 403
    )

    # Attempt 4: User B tries to submit reflection to User A's session
    resp_idor_refl = client_b.post(f'/api/sessions/{session_a.id}/reflection/', {
        'ownership_reflection': 'Tampering attempt'
    }, format='json')
    record_result(
        "Cross-user Reflection Submission POST blocked (HTTP 403 Forbidden)",
        resp_idor_refl.status_code == 403
    )

    # Attempt 5: User B tries to force complete User A's session
    resp_idor_complete = client_b.post(f'/api/sessions/{session_a.id}/complete/')
    record_result(
        "Cross-user Session Completion POST blocked (HTTP 403 Forbidden)",
        resp_idor_complete.status_code == 403
    )

    # Attempt 6: User B tries to access User A's review drawer
    resp_idor_review = client_b.get(f'/api/sessions/{session_a.id}/review/')
    record_result(
        "Cross-user Review Drawer GET blocked (HTTP 403 Forbidden)",
        resp_idor_review.status_code == 403
    )

    # Attempt 7: User B tries to access User A's certificate
    resp_idor_cert = client_b.get(f'/api/sessions/{session_a.id}/certificate/')
    record_result(
        "Cross-user Certificate GET blocked (HTTP 403 Forbidden)",
        resp_idor_cert.status_code == 403
    )

    # Attempt 8: Anonymous unauthenticated client tries to tamper with User A's session
    anon_client = APIClient()
    resp_anon_answer = anon_client.post(f'/api/sessions/{session_a.id}/answers/', {
        'scenario_id': s1_sc.id if s1_sc else 1,
        'selected_role_id': first_role.id,
        'stage': 1
    }, format='json')
    record_result(
        "Anonymous client tampering with registered user session blocked (HTTP 403)",
        resp_anon_answer.status_code == 403
    )

    # Legitimate Owner User A can access and answer their own session
    client_a = APIClient()
    client_a.force_authenticate(user=user_a)
    resp_owner_detail = client_a.get(f'/api/sessions/{session_a.id}/')
    record_result(
        "Legitimate Session Owner can access their own session (HTTP 200)",
        resp_owner_detail.status_code == 200
    )

    # -------------------------------------------------------------
    # 4. ANONYMOUS GUEST SESSION ACCESSIBILITY
    # -------------------------------------------------------------
    print("\n--- 4. Anonymous Guest Session Functionality ---")

    guest_session = SimulationSession.objects.create(
        user=None,
        student_name="Anonymous Guest",
        workplace=wp,
        selected_role=first_role,
        current_stage=1,
        status='in_progress'
    )
    resp_guest_sc = anon_client.get(f'/api/sessions/{guest_session.id}/stage/1/')
    record_result(
        "Guest learner can fetch stage scenarios without registration (HTTP 200)",
        resp_guest_sc.status_code == 200
    )

    # -------------------------------------------------------------
    # 5. SERVER-SIDE SCORING & TAMPERING PREVENTION
    # -------------------------------------------------------------
    print("\n--- 5. Server-Side Scoring & Tampering Prevention ---")

    # Client attempts to send forged 'is_correct: True' with a wrong role
    wrong_role = Role.objects.filter(workplace=wp).exclude(id=s1_sc.primary_owner_id).first()
    resp_score_hack = client_a.post(f'/api/sessions/{session_a.id}/answers/', {
        'scenario_id': s1_sc.id,
        'selected_role_id': wrong_role.id,
        'stage': 1,
        'is_correct': True,       # Hack attempt
        'points_awarded': 100,    # Hack attempt
        'total_score': 999        # Hack attempt
    }, format='json')

    data_hack = resp_score_hack.json()
    record_result(
        "Backend overrides client-side is_correct flag (evaluates to False authoritatively)",
        data_hack.get('is_correct') is False and data_hack.get('points_awarded') == 0
    )

    # Duplicate answer prevention
    resp_duplicate = client_a.post(f'/api/sessions/{session_a.id}/answers/', {
        'scenario_id': s1_sc.id,
        'selected_role_id': s1_sc.primary_owner_id,
        'stage': 1
    }, format='json')
    record_result(
        "Duplicate answer submission rejected with HTTP 400 Bad Request",
        resp_duplicate.status_code == 400 and resp_duplicate.json().get('already_submitted') is True
    )

    # -------------------------------------------------------------
    # 6. INPUT VALIDATION & MALFORMED REQUEST HANDLING
    # -------------------------------------------------------------
    print("\n--- 6. Input Validation & Error Handling ---")

    # Invalid non-UUID session parameter
    resp_bad_uuid = client.get('/api/sessions/invalid-not-a-uuid/answers/')
    record_result(
        "Non-UUID URL parameter rejected cleanly with HTTP 404 (No 500 trace)",
        resp_bad_uuid.status_code == 404
    )

    # Non-existent valid UUID
    fake_uuid = str(uuid.uuid4())
    resp_nonexistent = client.get(f'/api/sessions/{fake_uuid}/')
    record_result(
        "Non-existent UUID returns HTTP 404 without internal error",
        resp_nonexistent.status_code == 404
    )

    # Registration validation: invalid username characters
    resp_bad_username = client.post('/api/auth/register/', {
        'username': 'bad<script>user',
        'email': 'valid@student.edu',
        'password': 'Password123!',
        'password_confirm': 'Password123!'
    }, format='json')
    record_result(
        "Registration with malicious/illegal characters in username rejected (HTTP 400)",
        resp_bad_username.status_code == 400
    )

    # Registration validation: duplicate email
    resp_dup_email = client.post('/api/auth/register/', {
        'username': 'new_unique_user',
        'email': user_a.email,  # duplicate email
        'password': 'Password123!',
        'password_confirm': 'Password123!'
    }, format='json')
    record_result(
        "Registration with duplicate email address rejected (HTTP 400)",
        resp_dup_email.status_code == 400
    )

    # Registration validation: weak password (< 6 chars)
    resp_weak_pw = client.post('/api/auth/register/', {
        'username': 'short_pw_user',
        'email': 'short@student.edu',
        'password': '123',
        'password_confirm': '123'
    }, format='json')
    record_result(
        "Registration with short password (<6 chars) rejected (HTTP 400)",
        resp_weak_pw.status_code == 400
    )

    # Certificate eligibility threshold gate
    resp_cert_gate = client_a.get(f'/api/sessions/{session_a.id}/certificate/')
    record_result(
        "Certificate refused for incomplete session or score < 70% (HTTP 400)",
        resp_cert_gate.status_code == 400 and resp_cert_gate.json().get('eligible') is False
    )

    # -------------------------------------------------------------
    # 7. SUMMARY
    # -------------------------------------------------------------
    print("\n=======================================================")
    print(f"STEP 17 SECURITY TEST RESULTS: {passed_count} PASSED, {failed_count} FAILED")
    print("=======================================================\n")

    return failed_count == 0


if __name__ == '__main__':
    success = run_security_tests()
    sys.exit(0 if success else 1)
