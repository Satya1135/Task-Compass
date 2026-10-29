from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    Workplace,
    Role,
    Scenario,
    ScenarioOption,
    SimulationSession,
    StageResponse,
    StudentReflection,
)


class SimulationBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Workplace
        self.tech_wp = Workplace.objects.create(
            name='Tech Company',
            slug='tech-company',
            description='Test Tech Company',
            icon='terminal',
            theme_color='#3b82f6',
            order=1,
        )

        # 12 Roles for Tech Company
        self.roles = []
        role_names = [
            ('Product Manager', 'product-manager', False),
            ('UX / UI Designer', 'ux-ui-designer', False),
            ('Frontend Developer', 'frontend-developer', False),
            ('Backend Developer', 'backend-developer', False),
            ('QA / Test Engineer', 'qa-test-engineer', False),
            ('DevOps / Cloud Engineer', 'devops-cloud-engineer', False),
            ('Network Engineer', 'network-engineer', True),
            ('Cybersecurity Engineer', 'cybersecurity-engineer', True),
            ('SOC Analyst', 'soc-analyst', True),
            ('Security Analyst', 'security-analyst', True),
            ('Engineering Manager', 'engineering-manager', False),
            ('Customer Support / IT', 'customer-support-it', False),
        ]
        for idx, (name, slug, is_sec) in enumerate(role_names, start=1):
            role = Role.objects.create(
                workplace=self.tech_wp,
                name=name,
                slug=slug,
                order=idx,
                is_cybersecurity=is_sec,
                description=f"{name} role",
            )
            self.roles.append(role)

        # Scenario Stage 1
        self.scen1 = Scenario.objects.create(
            workplace=self.tech_wp,
            stage=1,
            title='Critical Auth Vulnerability',
            description='A vulnerability in JWT was discovered.',
            order=1,
        )
        self.opt1_optimal = ScenarioOption.objects.create(
            scenario=self.scen1,
            option_text='Backend Developer owns the patch.',
            recommended_role=self.roles[3],  # Backend Developer
            is_optimal=True,
            score_ownership=25,
            score_delegation=20,
            score_collaboration=20,
            score_workflow=25,
            feedback_rationale='Correct backend ownership.',
            order=1,
        )
        self.opt1_suboptimal = ScenarioOption.objects.create(
            scenario=self.scen1,
            option_text='Tell customer support to warn users.',
            is_optimal=False,
            score_ownership=5,
            score_delegation=5,
            score_collaboration=5,
            score_workflow=5,
            feedback_rationale='Incorrect assignment.',
            order=2,
        )

    def test_tech_company_has_12_roles_in_exact_order(self):
        """Verify that Tech Company has exactly 12 roles properly ordered."""
        db_roles = Role.objects.filter(workplace=self.tech_wp).order_by('order')
        self.assertEqual(db_roles.count(), 12)
        expected_names = [
            'Product Manager',
            'UX / UI Designer',
            'Frontend Developer',
            'Backend Developer',
            'QA / Test Engineer',
            'DevOps / Cloud Engineer',
            'Network Engineer',
            'Cybersecurity Engineer',
            'SOC Analyst',
            'Security Analyst',
            'Engineering Manager',
            'Customer Support / IT',
        ]
        actual_names = [r.name for r in db_roles]
        self.assertEqual(actual_names, expected_names)

    def test_workplaces_api(self):
        """Test listing workplaces and retrieving detail with nested roles."""
        response = self.client.get(reverse('workplace-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        detail_response = self.client.get(reverse('workplace-detail', kwargs={'identifier': 'tech-company'}))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_response.data['roles']), 12)

    def test_simulation_session_flow(self):
        """Test full session lifecycle: creation -> stage fetch -> submit -> results -> reflection."""
        # 1. Create Session
        create_payload = {
            'student_name': 'Alex Rivera',
            'workplace_id': self.tech_wp.id,
            'role_id': self.roles[7].id,  # Cybersecurity Engineer
        }
        res_session = self.client.post(reverse('session-create'), data=create_payload, format='json')
        self.assertEqual(res_session.status_code, status.HTTP_201_CREATED)
        session_id = res_session.data['id']

        # 2. Fetch Stage 1 Scenarios
        res_stage1 = self.client.get(reverse('stage-scenarios', kwargs={'session_id': session_id, 'stage_number': 1}))
        self.assertEqual(res_stage1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_stage1.data['scenarios']), 1)
        self.assertEqual(len(res_stage1.data['scenarios'][0]['options']), 2)

        # 3. Submit Stage 1 Answer
        submit_payload = {
            'stage': 1,
            'answers': [
                {
                    'scenario_id': self.scen1.id,
                    'selected_option_id': self.opt1_optimal.id,
                    'student_notes': 'Backend needs to test and patch the auth logic.',
                }
            ]
        }
        res_submit = self.client.post(
            reverse('stage-submit', kwargs={'session_id': session_id, 'stage_number': 1}),
            data=submit_payload,
            format='json'
        )
        self.assertEqual(res_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_submit.data['next_stage'], 2)
        self.assertEqual(res_submit.data['current_scores']['ownership'], 25)
        self.assertEqual(res_submit.data['current_scores']['total'], 90)

        # 4. View Results
        res_results = self.client.get(reverse('session-results', kwargs={'session_id': session_id}))
        self.assertEqual(res_results.status_code, status.HTTP_200_OK)
        self.assertEqual(res_results.data['student_name'], 'Alex Rivera')
        self.assertEqual(res_results.data['total_score'], 90)
        self.assertIn('ownership', res_results.data['competencies'])

        # 5. Submit Reflection
        reflection_payload = {
            'ownership_takeaway': 'Ownership means knowing who carries the ultimate code accountability.',
            'delegation_takeaway': 'Delegating to wrong departments causes confusion and delays.',
            'collaboration_takeaway': 'Engineering and security must sync continuously.',
            'workflow_takeaway': 'Security is not a blocker, but an essential part of the release lifecycle.',
        }
        res_refl = self.client.post(
            reverse('session-reflection', kwargs={'session_id': session_id}),
            data=reflection_payload,
            format='json'
        )
        self.assertEqual(res_refl.status_code, status.HTTP_201_CREATED)

        # Verify session is marked completed
        session = SimulationSession.objects.get(pk=session_id)
        self.assertEqual(session.status, 'completed')
        self.assertIsNotNone(session.completed_at)
