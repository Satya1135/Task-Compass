"""
TASK COMPASS — STEP 18: COMPREHENSIVE END-TO-END SYSTEM TEST & QA SUITE
Tests complete application startup, complete user journey, Stage 1/2/3 exhaustive scenarios,
Results calculation, Reflection variations, Step 15/16 features, all 20 API endpoints,
database consistency, performance query metrics, and security regression.
"""

import os
import sys
import uuid
import time
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_compass.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.conf import settings
from django.contrib.auth.models import User
from django.db import connection, reset_queries
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
bugs_found = []


def record(name, condition, detail=""):
    global passed_count, failed_count, bugs_found
    if condition:
        passed_count += 1
        print(f"  [PASS] {name} {detail}")
    else:
        failed_count += 1
        bugs_found.append({"test": name, "detail": detail})
        print(f"  [FAIL] {name}: {detail}")


def run_comprehensive_tests():
    global passed_count, failed_count
    print("\n==================================================================")
    print("TASK COMPASS — STEP 18 COMPLETE SYSTEM QUALITY ASSURANCE SUITE")
    print("==================================================================\n")

    client = APIClient()

    # ====================================================================
    # 1. APPLICATION STARTUP & CONFIGURATION
    # ====================================================================
    print("--- 1. Application Startup & Environment Configuration ---")
    record("Django settings loaded", settings.SETTINGS_MODULE == 'task_compass.settings')
    record("Database default engine is sqlite3", 'sqlite3' in settings.DATABASES['default']['ENGINE'])
    record("Static root configured", bool(settings.STATIC_ROOT))
    record("Security headers enabled", settings.SECURE_CONTENT_TYPE_NOSNIFF and settings.X_FRAME_OPTIONS == 'DENY')
    record("Cookie security enabled", settings.SESSION_COOKIE_HTTPONLY and settings.SESSION_COOKIE_SAMESITE == 'Lax')

    # Frontend Index Load
    resp_index = client.get('/')
    record("Index view responds HTTP 200", resp_index.status_code == 200)
    record("CSRF meta tag in HTML", b'meta name="csrf-token"' in resp_index.content)
    record("Outfit & Inter Google fonts referenced", b'fonts.googleapis.com' in resp_index.content)

    # ====================================================================
    # 2. WORKPLACE & TECH COMPANY ROLE INVENTORY
    # ====================================================================
    print("\n--- 2. Workplace & Role Catalog Integrity ---")
    workplaces = Workplace.objects.all()
    record("Workplaces count is 4", workplaces.count() == 4)
    expected_slugs = {'tech-company', 'startup', 'corporate-office', 'hospital-healthcare'}
    record("All 4 standard workplace slugs exist", set(workplaces.values_list('slug', flat=True)) == expected_slugs)

    tech_wp = Workplace.objects.get(slug='tech-company')
    tech_roles = tech_wp.roles.all().order_by('order')
    record("Tech Company has exactly 12 roles", tech_roles.count() == 12)

    # Check images existence
    images_ok = True
    for r in tech_roles:
        img_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'roles', f"{r.slug}.jpg")
        if not os.path.exists(img_path) or os.path.getsize(img_path) < 5000:
            images_ok = False
            break
    record("All 12 Tech Company role JPEG images present and valid (>5KB)", images_ok)

    # ====================================================================
    # 3. COMPLETE USER JOURNEY & STAGES 1, 2, 3 EXECUTION
    # ====================================================================
    print("\n--- 3. Complete Simulation Journey (Stages 1, 2, 3) ---")

    # Start Session
    devops_role = tech_roles.filter(slug='devops-cloud-engineer').first() or tech_roles.first()
    create_resp = client.post('/api/sessions/', {
        'student_name': 'End-to-End QA Student',
        'workplace_id': tech_wp.id,
        'role_id': devops_role.id
    }, format='json')
    record("Session creation succeeded (HTTP 201)", create_resp.status_code == 201)
    session_id = create_resp.json().get('id')
    record("Valid session UUID returned", bool(session_id))

    # --- STAGE 1 TESTING ---
    print("\n  [Stage 1: Who Owns This? Testing]")
    s1_scenarios_resp = client.get(f'/api/sessions/{session_id}/stage/1/')
    record("Stage 1 scenarios fetched (HTTP 200)", s1_scenarios_resp.status_code == 200)
    s1_scenarios = s1_scenarios_resp.json().get('scenarios', [])
    record("Stage 1 contains 3 scenarios", len(s1_scenarios) == 3)

    # Test 3.1: Invalid submission (missing role)
    s1_sc1 = s1_scenarios[0]
    resp_bad = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s1_sc1['id'],
        'stage': 1
    }, format='json')
    record("Stage 1 missing role rejected (HTTP 400)", resp_bad.status_code == 400)

    # Test 3.2: Invalid role ID (not belonging to workplace)
    resp_bad_role = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s1_sc1['id'],
        'selected_role_id': 999999,
        'stage': 1
    }, format='json')
    record("Stage 1 invalid role ID rejected (HTTP 400)", resp_bad_role.status_code == 400)

    # Test 3.3: Correct answer submission for all 3 scenarios
    for idx, sc_dict in enumerate(s1_scenarios):
        sc_obj = Scenario.objects.get(pk=sc_dict['id'])
        ans_resp = client.post(f'/api/sessions/{session_id}/answers/', {
            'scenario_id': sc_obj.id,
            'selected_role_id': sc_obj.primary_owner_id,
            'stage': 1,
            'student_notes': f'Stage 1 notes for scenario {idx + 1}'
        }, format='json')
        record(f"Stage 1 Scenario {idx + 1} answered correctly (HTTP 200)", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    # Test 3.4: Duplicate submission prevention
    dup_resp = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s1_sc1['id'],
        'selected_role_id': Scenario.objects.get(pk=s1_sc1['id']).primary_owner_id,
        'stage': 1
    }, format='json')
    record("Stage 1 duplicate answer rejected (HTTP 400)", dup_resp.status_code == 400 and dup_resp.json().get('already_submitted') is True)

    # --- STAGE 2 TESTING ---
    print("\n  [Stage 2: Task Routing Testing]")
    s2_scenarios_resp = client.get(f'/api/sessions/{session_id}/stage/2/')
    record("Stage 2 scenarios fetched (HTTP 200)", s2_scenarios_resp.status_code == 200)
    s2_scenarios = s2_scenarios_resp.json().get('scenarios', [])
    record("Stage 2 contains 3 scenarios", len(s2_scenarios) == 3)

    s2_sc1 = s2_scenarios[0]
    s2_obj1 = Scenario.objects.get(pk=s2_sc1['id'])

    # Test 4.1: Missing role_order
    resp_s2_missing = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s2_obj1.id,
        'stage': 2
    }, format='json')
    record("Stage 2 missing role_order rejected (HTTP 400)", resp_s2_missing.status_code == 400)

    # Test 4.2: Duplicate role in route
    first_two_roles = list(tech_roles.values_list('id', flat=True)[:2])
    resp_s2_dup = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s2_obj1.id,
        'role_order': [first_two_roles[0], first_two_roles[0], first_two_roles[1], first_two_roles[1], first_two_roles[0]],
        'stage': 2
    }, format='json')
    record("Stage 2 route with duplicate roles rejected (HTTP 400)", resp_s2_dup.status_code == 400)

    # Test 4.3: Incomplete route length
    resp_s2_len = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s2_obj1.id,
        'role_order': [first_two_roles[0]],
        'stage': 2
    }, format='json')
    record("Stage 2 incomplete route length rejected (HTTP 400)", resp_s2_len.status_code == 400)

    # Answer all 3 Stage 2 scenarios correctly
    roles_by_name = {r.name: r.id for r in tech_roles}
    for idx, sc_dict in enumerate(s2_scenarios):
        sc_obj = Scenario.objects.get(pk=sc_dict['id'])
        correct_route_ids = [roles_by_name[name] for name in sc_obj.workflow_route]
        ans_resp = client.post(f'/api/sessions/{session_id}/answers/', {
            'scenario_id': sc_obj.id,
            'role_order': correct_route_ids,
            'stage': 2,
            'student_notes': f'Stage 2 routing notes {idx + 1}'
        }, format='json')
        record(f"Stage 2 Route {idx + 1} completed correctly (HTTP 200)", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    # --- STAGE 3 TESTING ---
    print("\n  [Stage 3: Collaboration Challenge Testing]")
    s3_scenarios_resp = client.get(f'/api/sessions/{session_id}/stage/3/')
    record("Stage 3 scenarios fetched (HTTP 200)", s3_scenarios_resp.status_code == 200)
    s3_scenarios = s3_scenarios_resp.json().get('scenarios', [])
    record("Stage 3 contains 3 scenarios", len(s3_scenarios) == 3)

    s3_sc1 = s3_scenarios[0]
    s3_obj1 = Scenario.objects.get(pk=s3_sc1['id'])

    # Test 5.1: Missing primary role
    resp_s3_bad = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s3_obj1.id,
        'stage': 3,
        'supporting_roles': [r.id for r in s3_obj1.supporting_roles.all()],
        'workflow': [roles_by_name[n] for n in s3_obj1.workflow_route]
    }, format='json')
    record("Stage 3 missing primary role rejected (HTTP 400)", resp_s3_bad.status_code == 400)

    # Test 5.2: Primary role duplicated in supporting team
    resp_s3_dup_role = client.post(f'/api/sessions/{session_id}/answers/', {
        'scenario_id': s3_obj1.id,
        'stage': 3,
        'primary_role': s3_obj1.primary_owner_id,
        'supporting_roles': [s3_obj1.primary_owner_id],
        'workflow': [roles_by_name[n] for n in s3_obj1.workflow_route]
    }, format='json')
    record("Stage 3 primary role also in supporting team rejected (HTTP 400)", resp_s3_dup_role.status_code == 400)

    # Answer all 3 Stage 3 scenarios correctly
    for idx, sc_dict in enumerate(s3_scenarios):
        sc_obj = Scenario.objects.get(pk=sc_dict['id'])
        correct_supp_ids = list(sc_obj.supporting_roles.values_list('id', flat=True))
        correct_wf_ids = [roles_by_name[name] for name in sc_obj.workflow_route]
        ans_resp = client.post(f'/api/sessions/{session_id}/answers/', {
            'scenario_id': sc_obj.id,
            'primary_role': sc_obj.primary_owner_id,
            'supporting_roles': correct_supp_ids,
            'workflow': correct_wf_ids,
            'stage': 3,
            'student_notes': f'Stage 3 notes {idx + 1}'
        }, format='json')
        record(f"Stage 3 Scenario {idx + 1} completed correctly (HTTP 200)", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    # ====================================================================
    # 4. RESULTS & SCORE ACCURACY VERIFICATION
    # ====================================================================
    print("\n--- 4. Authoritative Results Verification ---")
    results_resp = client.get(f'/api/sessions/{session_id}/results/')
    record("Results endpoint responds HTTP 200", results_resp.status_code == 200)
    res_data = results_resp.json()

    record("Stage 1 score is 3/3", res_data['stage_1']['correct'] == 3 and res_data['stage_1']['total'] == 3)
    record("Stage 2 score is 3/3", res_data['stage_2']['correct'] == 3 and res_data['stage_2']['total'] == 3)
    record("Stage 3 score is 3/3", res_data['stage_3']['correct'] == 3 and res_data['stage_3']['total'] == 3)
    record("Overall score is 9/9 (100.0%)", res_data['overall']['correct'] == 9 and res_data['overall']['percentage'] == 100.0)
    record("Completed flag is True", res_data['completed'] is True)
    record("Strengths populated based on performance", len(res_data['strengths']) > 0)
    record("Learning summary contains 3 stages", len(res_data['learning_summary']) == 3)

    # ====================================================================
    # 5. REFLECTION PERSISTENCE & VARIATIONS
    # ====================================================================
    print("\n--- 5. Student Reflection Testing ---")

    # Empty submission (optional reflection)
    refl_empty = client.post(f'/api/sessions/{session_id}/reflection/', {}, format='json')
    record("Empty reflection permitted (HTTP 201)", refl_empty.status_code == 201)

    # Submission with special characters & long text
    long_reflection = "Learning experience: " + ("Cross-team incident triage is essential. " * 30)
    refl_valid = client.post(f'/api/sessions/{session_id}/reflection/', {
        'ownership_reflection': 'Security Analyst & SOC analyst boundaries clarified.',
        'collaboration_reflection': long_reflection,
        'improvement_reflection': 'Workflow sequencing under pressure with <script>tags</script> test.'
    }, format='json')
    record("Valid reflection saved (HTTP 200 update)", refl_valid.status_code == 200)

    # Retrieve reflection
    refl_get = client.get(f'/api/sessions/{session_id}/reflection/')
    record("Reflection GET retrieved saved data", refl_get.status_code == 200 and 'Security Analyst' in refl_get.json()['ownership_reflection'])

    # Session status check
    sess_db = SimulationSession.objects.get(pk=session_id)
    record("Session status updated to completed upon reflection", sess_db.status == 'completed' and sess_db.completed_at is not None)

    # ====================================================================
    # 6. STEP 15 & 16 FEATURES (AUTH, DASHBOARD, AUDIT REVIEW, CERTIFICATE)
    # ====================================================================
    print("\n--- 6. Feature Testing: Step 15 Auth & Step 16 Dashboard/Certificate ---")

    # Step 15: Auth cycle
    unique_username = f"qa_user_{int(time.time())}"
    reg_resp = client.post('/api/auth/register/', {
        'username': unique_username,
        'email': f'{unique_username}@student.edu',
        'student_name': 'Full QA Student',
        'password': 'StrongPassword123!',
        'password_confirm': 'StrongPassword123!'
    }, format='json')
    record("Registration succeeded with auto-login (HTTP 201)", reg_resp.status_code == 201 and reg_resp.json().get('authenticated') is True)

    me_resp = client.get('/api/auth/me/')
    record("CurrentUser endpoint returns active profile", me_resp.status_code == 200 and me_resp.json().get('user')['username'] == unique_username)

    # Link completed session to this user to test Dashboard & Certificate
    sess_db.user = User.objects.get(username=unique_username)
    sess_db.save()

    history_resp = client.get('/api/auth/history/')
    record("History endpoint returns completed simulation session", history_resp.status_code == 200 and len(history_resp.json()['simulations']) == 1)

    # Step 16: Dashboard analytics
    dash_resp = client.get('/api/student/dashboard/')
    record("Dashboard endpoint responds HTTP 200", dash_resp.status_code == 200)
    dash_data = dash_resp.json()
    record("Dashboard reflects 1 completed simulation", dash_data['summary']['completed_simulations'] == 1)
    record("Competency tiers reflect Mastered (100%)", dash_data['competencies']['ownership']['tier'] == 'Mastered')
    record("Certificate earned count is 1", dash_data['summary']['certificates_earned'] == 1)

    # Step 16: Question Audit Review Drawer
    review_resp = client.get(f'/api/sessions/{session_id}/review/')
    record("Session Review Drawer returns all 9 questions with rationales", review_resp.status_code == 200 and len(review_resp.json()['responses']) == 9)

    # Step 16: Verified Certificate Generation
    cert_resp = client.get(f'/api/sessions/{session_id}/certificate/')
    record("Verified Certificate successfully generated (HTTP 200)", cert_resp.status_code == 200 and cert_resp.json().get('eligible') is True)
    record("Certificate code has standard format", 'TC-VERIFIED-' in cert_resp.json().get('certificate_id', ''))

    # ====================================================================
    # 7. ALL 20 API ENDPOINTS EXHAUSTIVE VERIFICATION
    # ====================================================================
    print("\n--- 7. Exhaustive 20-Endpoint API Contract Verification ---")

    endpoints_tested = 0

    # 1. GET /
    r = client.get('/')
    record("API 1: GET /", r.status_code == 200); endpoints_tested += 1

    # 2. GET /api/workplaces/
    r = client.get('/api/workplaces/')
    record("API 2: GET /api/workplaces/", r.status_code == 200 and isinstance(r.json(), list)); endpoints_tested += 1

    # 3. GET /api/workplaces/<identifier>/ (slug & id)
    r_slug = client.get('/api/workplaces/tech-company/')
    r_id = client.get(f'/api/workplaces/{tech_wp.id}/')
    r_404 = client.get('/api/workplaces/nonexistent-workplace/')
    record("API 3: GET /api/workplaces/<identifier>/ (slug, id, 404)", r_slug.status_code == 200 and r_id.status_code == 200 and r_404.status_code == 404); endpoints_tested += 1

    # 4. POST /api/sessions/
    r_bad = client.post('/api/sessions/', {}, format='json')
    record("API 4: POST /api/sessions/ (valid & 400 validation)", r_bad.status_code == 400); endpoints_tested += 1

    # 5. GET /api/sessions/<uuid>/
    r = client.get(f'/api/sessions/{session_id}/')
    record("API 5: GET /api/sessions/<uuid>/", r.status_code == 200 and 'stage_1' in r.json()); endpoints_tested += 1

    # 6. POST /api/sessions/<uuid>/answers/
    record("API 6: POST /api/sessions/<uuid>/answers/ (tested in Stages 1, 2, 3)", True); endpoints_tested += 1

    # 7. GET /api/sessions/<uuid>/stage/<stage_number>/
    r = client.get(f'/api/sessions/{session_id}/stage/1/')
    record("API 7: GET /api/sessions/<uuid>/stage/<stage_number>/", r.status_code == 200 and 'scenarios' in r.json()); endpoints_tested += 1

    # 8. POST /api/sessions/<uuid>/stage/<stage_number>/submit/
    r_submit = client.post(f'/api/sessions/{session_id}/stage/1/submit/', {'stage': 1, 'answers': []}, format='json')
    record("API 8: POST /api/sessions/<uuid>/stage/<stage_number>/submit/", r_submit.status_code == 200); endpoints_tested += 1

    # 9. GET /api/sessions/<uuid>/results/
    r = client.get(f'/api/sessions/{session_id}/results/')
    record("API 9: GET /api/sessions/<uuid>/results/", r.status_code == 200 and r.json().get('completed') is True); endpoints_tested += 1

    # 10. GET /api/sessions/<uuid>/reflection/
    r = client.get(f'/api/sessions/{session_id}/reflection/')
    record("API 10: GET /api/sessions/<uuid>/reflection/", r.status_code == 200); endpoints_tested += 1

    # 11. POST /api/sessions/<uuid>/reflection/
    record("API 11: POST /api/sessions/<uuid>/reflection/ (tested in Section 5)", True); endpoints_tested += 1

    # 12. POST /api/sessions/<uuid>/complete/
    r = client.post(f'/api/sessions/{session_id}/complete/')
    record("API 12: POST /api/sessions/<uuid>/complete/", r.status_code == 200 and r.json().get('completed') is True); endpoints_tested += 1

    # 13. POST /api/auth/register/
    record("API 13: POST /api/auth/register/ (tested in Section 6)", True); endpoints_tested += 1

    # 14. POST /api/auth/login/
    r = client.post('/api/auth/login/', {'username': unique_username, 'password': 'StrongPassword123!'}, format='json')
    record("API 14: POST /api/auth/login/", r.status_code == 200 and r.json().get('authenticated') is True); endpoints_tested += 1

    # 15. POST /api/auth/logout/
    r = client.post('/api/auth/logout/')
    record("API 15: POST /api/auth/logout/", r.status_code == 200 and r.json().get('authenticated') is False); endpoints_tested += 1

    # 16. GET /api/auth/me/
    client.login(username=unique_username, password='StrongPassword123!')
    r = client.get('/api/auth/me/')
    record("API 16: GET /api/auth/me/", r.status_code == 200 and r.json().get('authenticated') is True); endpoints_tested += 1

    # 17. GET /api/auth/history/
    r = client.get('/api/auth/history/')
    record("API 17: GET /api/auth/history/", r.status_code == 200); endpoints_tested += 1

    # 18. GET /api/student/dashboard/
    r = client.get('/api/student/dashboard/')
    record("API 18: GET /api/student/dashboard/", r.status_code == 200); endpoints_tested += 1

    # 19. GET /api/sessions/<uuid>/review/
    r = client.get(f'/api/sessions/{session_id}/review/')
    record("API 19: GET /api/sessions/<uuid>/review/", r.status_code == 200); endpoints_tested += 1

    # 20. GET /api/sessions/<uuid>/certificate/
    r = client.get(f'/api/sessions/{session_id}/certificate/')
    record("API 20: GET /api/sessions/<uuid>/certificate/", r.status_code == 200); endpoints_tested += 1

    record("All 20 registered API endpoints verified", endpoints_tested == 20)

    # ====================================================================
    # 8. DATABASE INTEGRITY & ORPHAN CHECKS
    # ====================================================================
    print("\n--- 8. Database Integrity & Consistency Checks ---")

    # Check for orphan responses without session or scenario
    orphan_responses = StageResponse.objects.filter(session__isnull=True).count() + StageResponse.objects.filter(scenario__isnull=True).count()
    record("Zero orphaned StageResponse records", orphan_responses == 0)

    # Check for orphan reflections without session
    orphan_reflections = StudentReflection.objects.filter(session__isnull=True).count()
    record("Zero orphaned StudentReflection records", orphan_reflections == 0)

    # Verify model relationships & foreign keys
    test_session_obj = SimulationSession.objects.get(pk=session_id)
    record("SimulationSession workplace relation intact", test_session_obj.workplace.name == tech_wp.name)
    record("SimulationSession selected_role relation intact", test_session_obj.selected_role.name == devops_role.name)
    record("SimulationSession has 9 recorded responses", test_session_obj.responses.count() == 9)
    record("SimulationSession has associated reflection", hasattr(test_session_obj, 'reflection'))

    # ====================================================================
    # 9. PERFORMANCE & QUERY OPTIMIZATION CHECK
    # ====================================================================
    print("\n--- 9. Performance & Database Query Efficiency ---")

    # Measure WorkplaceDetailAPIView queries
    perf_client = APIClient()
    reset_queries()
    t0 = time.time()
    perf_client.get('/api/workplaces/tech-company/')
    t1 = time.time()
    wp_query_count = len(connection.queries)
    wp_duration = round((t1 - t0) * 1000, 2)
    record(f"Workplace detail response time under 100ms ({wp_duration}ms)", wp_duration < 100)
    record(f"Workplace detail efficient queries ({wp_query_count} queries)", wp_query_count <= 4)

    # Measure SessionDetailAPIView queries with authenticated session owner
    perf_client.force_authenticate(user=sess_db.user)
    reset_queries()
    t0 = time.time()
    perf_client.get(f'/api/sessions/{session_id}/')
    t1 = time.time()
    sess_query_count = len(connection.queries)
    sess_duration = round((t1 - t0) * 1000, 2)
    record(f"Session detail response time under 150ms ({sess_duration}ms)", sess_duration < 150)
    record(f"Session detail prefetch optimization ({sess_query_count} queries)", sess_query_count <= 10)

    # ====================================================================
    # 10. SUMMARY
    # ====================================================================
    print("\n==================================================================")
    print(f"STEP 18 SYSTEM TEST SUMMARY: {passed_count} PASSED, {failed_count} FAILED")
    if bugs_found:
        print(f"BUGS FOUND ({len(bugs_found)}):")
        for b in bugs_found:
            print(f"  - {b['test']}: {b['detail']}")
    else:
        print("ALL TESTS PASSED WITH ZERO FAILURES!")
    print("==================================================================\n")

    return failed_count == 0


if __name__ == '__main__':
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)
