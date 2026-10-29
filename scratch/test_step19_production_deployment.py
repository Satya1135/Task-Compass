"""
TASK COMPASS — STEP 19 PRODUCTION DEPLOYMENT & READINESS VERIFICATION SUITE
Tests the application under strict production settings:
- DJANGO_DEBUG=False
- WhiteNoise static file serving & compression
- Security headers & cookie policies
- Complete end-to-end simulation journey
- Results, reflection, dashboard & certificates
- Seed command idempotency
"""
import os
import sys
import json
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Enforce production mode environment before Django setup
os.environ['DJANGO_DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,testserver,.onrender.com,.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_compass.settings')

import django
django.setup()

from django.conf import settings
from django.test import Client
from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework import status
from simulation.models import (
    Workplace,
    Role,
    Scenario,
    SimulationSession,
    StageResponse,
    StudentReflection,
)

passed_count = 0
failed_count = 0
failures = []

def record(test_name, condition, detail=""):
    global passed_count, failed_count
    if condition:
        passed_count += 1
        print(f"  [PASS] {test_name}")
    else:
        failed_count += 1
        failures.append({'test': test_name, 'detail': detail})
        print(f"  [FAIL] {test_name}: {detail}")


def run_production_tests():
    print("\n==================================================================")
    print("TASK COMPASS — STEP 19 PRODUCTION DEPLOYMENT VERIFICATION SUITE")
    print("==================================================================")

    # --------------------------------------------------------------------
    # 1. Production Settings & Security Flags
    # --------------------------------------------------------------------
    print("\n--- 1. Production Environment Configuration ---")
    record("DEBUG is False in production", settings.DEBUG is False)
    record("WhiteNoiseMiddleware installed", 'whitenoise.middleware.WhiteNoiseMiddleware' in settings.MIDDLEWARE)
    record("WhiteNoise storage configured", 'whitenoise' in settings.STORAGES['staticfiles']['BACKEND'].lower())
    record("ALLOWED_HOSTS includes cloud domains", '.onrender.com' in settings.ALLOWED_HOSTS)
    record("SECURE_PROXY_SSL_HEADER set", settings.SECURE_PROXY_SSL_HEADER == ('HTTP_X_FORWARDED_PROTO', 'https'))
    record("STATIC_ROOT exists and configured", bool(settings.STATIC_ROOT))

    # --------------------------------------------------------------------
    # 2. WhiteNoise Static Asset Serving (DEBUG=False)
    # --------------------------------------------------------------------
    print("\n--- 2. WhiteNoise Static Asset Serving Under Production Mode ---")
    client = Client()

    # In production, WhiteNoise serves static files directly through WSGI middleware
    static_css = client.get('/static/css/base.css')
    record("Static CSS served with HTTP 200", static_css.status_code == 200)

    static_js = client.get('/static/js/app.js')
    record("Static JS served with HTTP 200", static_js.status_code == 200)

    role_img = client.get('/static/images/roles/cybersecurity-engineer.jpg')
    record("Role image served with HTTP 200", role_img.status_code == 200)
    role_bytes = b''.join(role_img.streaming_content) if hasattr(role_img, 'streaming_content') else role_img.content
    record("Role image has valid payload", len(role_bytes) > 10000)

    # --------------------------------------------------------------------
    # 3. Seed Command Idempotency
    # --------------------------------------------------------------------
    print("\n--- 3. Database Seeding & Schema Idempotency ---")
    try:
        call_command('seed_task_compass', stdout=open(os.devnull, 'w'))
        record("seed_task_compass runs idempotently without error", True)
    except Exception as e:
        record("seed_task_compass runs idempotently without error", False, str(e))

    record("Workplaces count is 4", Workplace.objects.count() == 4)
    record("Tech Company roles count is 12", Role.objects.filter(workplace__slug='tech-company').count() == 12)

    # --------------------------------------------------------------------
    # 4. Production SPA Shell Serving
    # --------------------------------------------------------------------
    print("\n--- 4. Production SPA HTML Shell & Security Headers ---")
    resp = client.get('/')
    record("Root URL responds HTTP 200", resp.status_code == 200)
    record("X-Frame-Options is DENY", resp.headers.get('X-Frame-Options') == 'DENY')
    record("X-Content-Type-Options is nosniff", resp.headers.get('X-Content-Type-Options') == 'nosniff')
    record("CSRF meta tag in rendered HTML", 'name="csrf-token"' in resp.content.decode())

    # --------------------------------------------------------------------
    # 5. Complete Production User Journey (Stages 1-3, Results, Reflection)
    # --------------------------------------------------------------------
    print("\n--- 5. End-to-End User Journey in Production Mode ---")
    wp = Workplace.objects.get(slug='tech-company')
    role = Role.objects.filter(workplace=wp).first()

    # Session creation
    session_resp = client.post(
        '/api/sessions/',
        data=json.dumps({
            'student_name': 'Production Tester',
            'workplace_id': wp.id,
            'role_id': role.id,
        }),
        content_type='application/json'
    )
    record("Session initialized (HTTP 201)", session_resp.status_code == 201)
    session_id = session_resp.json()['id']

    # Stage 1: Who Owns This?
    s1_resp = client.get(f'/api/sessions/{session_id}/stage/1/')
    record("Stage 1 scenarios retrieved (HTTP 200)", s1_resp.status_code == 200)
    s1_scenarios = s1_resp.json()['scenarios']

    for idx, sc in enumerate(s1_scenarios):
        db_sc = Scenario.objects.get(pk=sc['id'])
        ans_resp = client.post(
            f'/api/sessions/{session_id}/answers/',
            data=json.dumps({
                'scenario_id': db_sc.id,
                'selected_role_id': db_sc.primary_owner_id,
                'stage': 1,
                'student_notes': f'Stage 1 notes {idx + 1}',
            }),
            content_type='application/json'
        )
        record(f"Stage 1 Scenario {idx + 1} submitted", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    tech_roles = Role.objects.filter(workplace=wp)
    roles_by_name = {r.name: r.id for r in tech_roles}

    # Stage 2: Task Routing
    s2_resp = client.get(f'/api/sessions/{session_id}/stage/2/')
    record("Stage 2 scenarios retrieved (HTTP 200)", s2_resp.status_code == 200)
    s2_scenarios = s2_resp.json()['scenarios']

    for idx, sc in enumerate(s2_scenarios):
        sc_obj = Scenario.objects.get(pk=sc['id'])
        correct_route_ids = [roles_by_name[name] for name in sc_obj.workflow_route]
        ans_resp = client.post(
            f'/api/sessions/{session_id}/answers/',
            data=json.dumps({
                'scenario_id': sc_obj.id,
                'role_order': correct_route_ids,
                'stage': 2,
                'student_notes': f'Stage 2 routing notes {idx + 1}'
            }),
            content_type='application/json'
        )
        record(f"Stage 2 Route {idx + 1} submitted", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    # Stage 3: Collaboration Challenge
    s3_resp = client.get(f'/api/sessions/{session_id}/stage/3/')
    record("Stage 3 scenarios retrieved (HTTP 200)", s3_resp.status_code == 200)
    s3_scenarios = s3_resp.json()['scenarios']

    for idx, sc in enumerate(s3_scenarios):
        sc_obj = Scenario.objects.get(pk=sc['id'])
        correct_supp_ids = list(sc_obj.supporting_roles.values_list('id', flat=True))
        correct_wf_ids = [roles_by_name[name] for name in sc_obj.workflow_route]
        ans_resp = client.post(
            f'/api/sessions/{session_id}/answers/',
            data=json.dumps({
                'scenario_id': sc_obj.id,
                'primary_role': sc_obj.primary_owner_id,
                'supporting_roles': correct_supp_ids,
                'workflow': correct_wf_ids,
                'stage': 3,
                'student_notes': f'Stage 3 notes {idx + 1}'
            }),
            content_type='application/json'
        )
        record(f"Stage 3 Challenge {idx + 1} submitted", ans_resp.status_code == 200 and ans_resp.json().get('is_correct') is True)

    # Results
    res_resp = client.get(f'/api/sessions/{session_id}/results/')
    record("Results endpoint responds HTTP 200", res_resp.status_code == 200)
    res_data = res_resp.json()
    record("Total score is 9/9 in production", res_data['overall']['correct'] == 9 and res_data['overall']['total'] == 9)
    record("Score percentage is 100.0%", res_data['overall']['percentage'] == 100.0)

    # Reflection
    ref_resp = client.post(
        f'/api/sessions/{session_id}/reflection/',
        data=json.dumps({
            'ownership_takeaway': 'Mastered clear role boundaries and ownership in production.',
            'delegation_takeaway': 'Route tasks based on expertise and velocity.',
            'collaboration_takeaway': 'Cross-functional alignment reduces incident MTTR.',
            'workflow_takeaway': 'Document handoffs between engineering and security.',
        }),
        content_type='application/json'
    )
    record("Reflection saved successfully (HTTP 200/201)", ref_resp.status_code in (200, 201))

    # Certificate
    cert_resp = client.get(f'/api/sessions/{session_id}/certificate/')
    record("Verified Certificate issued in production", cert_resp.status_code == 200)
    record("Certificate contains valid code", 'TC-VERIFIED-' in cert_resp.json().get('certificate_id', ''))

    # Clean up test session
    SimulationSession.objects.filter(pk=session_id).delete()

    # --------------------------------------------------------------------
    # Summary
    # --------------------------------------------------------------------
    print("\n==================================================================")
    print(f"STEP 19 PRODUCTION TEST SUMMARY: {passed_count} PASSED, {failed_count} FAILED")
    if failures:
        print(f"FAILURES DETECTED ({len(failures)}):")
        for f in failures:
            print(f"  - {f['test']}: {f['detail']}")
    else:
        print("ALL PRODUCTION READINESS TESTS PASSED PERFECTLY!")
    print("==================================================================\n")

    return failed_count == 0


if __name__ == '__main__':
    ok = run_production_tests()
    sys.exit(0 if ok else 1)
