from django.contrib.auth import login, logout
from django.utils import timezone
from django.shortcuts import get_object_or_404, render
from django.db.models import Q, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import (
    Workplace,
    Role,
    Scenario,
    ScenarioOption,
    SimulationSession,
    StageResponse,
    StudentReflection,
)
from .serializers import (
    WorkplaceListSerializer,
    WorkplaceDetailSerializer,
    RoleSerializer,
    ScenarioSerializer,
    ScenarioPublicSerializer,
    ScenarioOptionFeedbackSerializer,
    SimulationSessionCreateSerializer,
    SimulationSessionDetailSerializer,
    StageSubmissionSerializer,
    StudentReflectionSerializer,
    UserRegisterSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserSimulationHistorySerializer,
)


def check_session_ownership(session, request):
    """
    Object-level authorization check.
    If a session is associated with a registered user, ensures that only
    that user (or an administrator/staff member) can access or alter it.
    Anonymous/guest sessions (session.user is None) are accessible to guest users.
    Returns None if permitted, or a 403 Response if unauthorized.
    """
    if session.user:
        if not request.user or not request.user.is_authenticated or (request.user != session.user and not request.user.is_staff):
            return Response(
                {'error': 'You do not have permission to access or modify this simulation session.'},
                status=status.HTTP_403_FORBIDDEN
            )
    return None


def index_view(request):
    """Renders the main single-page interface for Task Compass."""
    return render(request, 'index.html')


class WorkplaceListAPIView(APIView):
    """Lists all available workplaces."""
    def get(self, request):
        workplaces = Workplace.objects.all().order_by('order')
        serializer = WorkplaceListSerializer(workplaces, many=True)
        return Response(serializer.data)


class WorkplaceDetailAPIView(APIView):
    """Retrieves full workplace detail with all roles."""
    def get(self, request, identifier):
        if identifier.isdigit():
            workplace = get_object_or_404(Workplace.objects.prefetch_related('roles'), pk=int(identifier))
        else:
            workplace = get_object_or_404(Workplace.objects.prefetch_related('roles'), slug=identifier)
        serializer = WorkplaceDetailSerializer(workplace)
        return Response(serializer.data)


class SessionCreateAPIView(APIView):
    """Initializes a new simulation session for a student."""
    def post(self, request):
        serializer = SimulationSessionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = request.user if request.user and request.user.is_authenticated else None
        student_name = data['student_name']
        if user and not student_name:
            student_name = user.first_name or user.username

        session = SimulationSession.objects.create(
            user=user,
            student_name=student_name,
            workplace=data['workplace'],
            selected_role=data['role'],
            current_stage=1,
            status='in_progress',
        )

        detail_serializer = SimulationSessionDetailSerializer(session)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class SessionDetailAPIView(APIView):
    """Retrieves current session state, scores, and stage progress."""
    def get(self, request, session_id):
        session = get_object_or_404(
            SimulationSession.objects.select_related('user', 'workplace', 'selected_role', 'reflection').prefetch_related(
                'responses__selected_option__recommended_role',
                'responses__scenario__primary_owner',
                'responses__scenario__supporting_roles'
            ),
            pk=session_id
        )
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp
        serializer = SimulationSessionDetailSerializer(session)
        data = serializer.data

        # Efficiently compute total scenarios per stage in a single grouped query
        scenario_counts = dict(
            Scenario.objects.filter(workplace=session.workplace)
            .values_list('stage')
            .annotate(cnt=Count('id'))
        )
        total_s1 = scenario_counts.get(1, 0)
        total_s2 = scenario_counts.get(2, 0)
        total_s3 = scenario_counts.get(3, 0)

        # In-memory partitioning of prefetched responses (eliminates N+1 queries)
        all_responses = list(session.responses.all())
        s1_responses = [r for r in all_responses if r.stage == 1]
        s2_responses = [r for r in all_responses if r.stage == 2]
        s3_responses = [r for r in all_responses if r.stage == 3]

        s1_completed = len(s1_responses)
        s1_correct = sum(
            1 for r in s1_responses
            if r.scenario.primary_owner_id and r.selected_option and r.selected_option.recommended_role_id == r.scenario.primary_owner_id
        )
        s1_percentage = round((s1_correct / total_s1) * 100, 2) if total_s1 else 0.0

        answered_scenarios = {}
        for r in s1_responses:
            rec_role = r.selected_option.recommended_role if r.selected_option else None
            po = r.scenario.primary_owner
            is_corr = bool(po and rec_role and po.id == rec_role.id)
            answered_scenarios[r.scenario_id] = {
                'selected_role_id': rec_role.id if rec_role else None,
                'selected_role_name': rec_role.name if rec_role else '',
                'selected_role_slug': rec_role.slug if rec_role else '',
                'is_correct': is_corr,
                'primary_owner_name': po.name if po else '',
                'explanation': r.scenario.explanation,
                'supporting_roles': [sr.name for sr in r.scenario.supporting_roles.all()],
            }

        data['stage_1_progress'] = {
            'total_scenarios': total_s1,
            'scenarios_completed': s1_completed,
            'correct_answers': s1_correct,
            'stage_score_percentage': s1_percentage,
            'is_stage_complete': s1_completed >= total_s1,
            'answered_scenarios': answered_scenarios,
        }

        s2_completed = len(s2_responses)
        s2_correct = sum(
            1 for r in s2_responses
            if r.selected_option and r.selected_option.is_optimal
        )
        s2_percentage = round((s2_correct / total_s2) * 100, 2) if total_s2 else 0.0

        answered_s2 = {}
        for r in s2_responses:
            answered_s2[r.scenario_id] = {
                'is_correct': r.selected_option.is_optimal if r.selected_option else False,
                'student_notes': r.student_notes,
                'explanation': r.scenario.explanation,
                'workflow_route': r.scenario.workflow_route,
            }

        data['stage_2_progress'] = {
            'total_scenarios': total_s2,
            'scenarios_completed': s2_completed,
            'correct_answers': s2_correct,
            'stage_score_percentage': s2_percentage,
            'is_stage_complete': s2_completed >= total_s2,
            'answered_scenarios': answered_s2,
        }

        s3_completed = len(s3_responses)
        s3_correct = sum(
            1 for r in s3_responses
            if r.selected_option and r.selected_option.is_optimal
        )
        s3_percentage = round((s3_correct / total_s3) * 100, 2) if total_s3 else 0.0

        answered_s3 = {}
        for r in s3_responses:
            answered_s3[r.scenario_id] = {
                'is_correct': r.selected_option.is_optimal if r.selected_option else False,
                'student_notes': r.student_notes,
                'explanation': r.scenario.explanation,
                'workflow_route': r.scenario.workflow_route,
            }

        data['stage_3_progress'] = {
            'total_scenarios': total_s3,
            'scenarios_completed': s3_completed,
            'correct_answers': s3_correct,
            'stage_score_percentage': s3_percentage,
            'is_stage_complete': s3_completed >= total_s3,
            'answered_scenarios': answered_s3,
        }

        # Authoritative overall calculations across all 3 stages (3 questions each = 9 max)
        total_correct_all = s1_correct + s2_correct + s3_correct
        total_questions_all = total_s1 + total_s2 + total_s3
        overall_percentage = round((total_correct_all / total_questions_all) * 100, 2) if total_questions_all else 0.0

        is_s1_done = s1_completed >= total_s1 and total_s1 > 0
        is_s2_done = s2_completed >= total_s2 and total_s2 > 0
        is_s3_done = s3_completed >= total_s3 and total_s3 > 0
        is_completed = bool(is_s1_done and is_s2_done and is_s3_done)

        data['session_id'] = str(session.id)
        data['workplace_name'] = session.workplace.name
        data['workplace'] = session.workplace.name
        data['stage_1'] = {
            'correct': s1_correct,
            'total': total_s1,
            'percentage': s1_percentage,
        }
        data['stage_2'] = {
            'correct': s2_correct,
            'total': total_s2,
            'percentage': s2_percentage,
        }
        data['stage_3'] = {
            'correct': s3_correct,
            'total': total_s3,
            'percentage': s3_percentage,
        }
        data['overall'] = {
            'correct': total_correct_all,
            'total': total_questions_all,
            'percentage': overall_percentage,
        }
        data['completed'] = is_completed

        return Response(data)



class SessionAnswerAPIView(APIView):
    """
    Authoritative server-side answer submission and evaluation for simulation scenarios.
    Supports Stage 1 (single primary owner selection) and Stage 2 (task routing sequence).
    Validates session, stage, scenario, and selected roles.
    Prevents duplicate submissions, scores the decision (1 for correct, 0 for incorrect),
    records the StageResponse, and provides rich educational feedback.
    """
    def post(self, request, session_id):
        try:
            session = SimulationSession.objects.select_related('workplace', 'selected_role').get(pk=session_id)
        except (SimulationSession.DoesNotExist, ValueError):
            return Response(
                {'error': 'Simulation session not found. Please start a valid session.'},
                status=status.HTTP_404_NOT_FOUND
            )

        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        data = request.data or {}
        scenario_id = data.get('scenario_id')
        student_notes = str(data.get('student_notes', ''))[:1000]

        if not scenario_id:
            return Response(
                {'error': 'scenario_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            stage_num = int(data.get('stage', 0))
        except (ValueError, TypeError):
            stage_num = 0

        if not stage_num:
            sc_stage = Scenario.objects.filter(pk=scenario_id).values_list('stage', flat=True).first()
            stage_num = sc_stage if sc_stage else 1

        # =====================================================================
        # STAGE 2: TASK ROUTING (ORDERED SEQUENCE OF ROLES)
        # =====================================================================
        if stage_num == 2:
            role_order = data.get('role_order')
            if role_order is None or not isinstance(role_order, list):
                return Response(
                    {'error': 'role_order (list of role IDs in routing sequence) is required for Stage 2.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 1. Validate Scenario belongs to current session workplace and Stage 2
            try:
                scenario = Scenario.objects.prefetch_related('options').get(
                    pk=scenario_id,
                    workplace=session.workplace,
                    stage=2
                )
            except Scenario.DoesNotExist:
                return Response(
                    {'error': 'Scenario does not belong to this simulation workplace or Stage 2.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Prevent duplicate submissions for the same scenario
            existing_response = StageResponse.objects.filter(session=session, scenario=scenario).first()
            if existing_response:
                return Response(
                    {
                        'error': 'An answer has already been submitted for this scenario.',
                        'already_submitted': True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Check for duplicate roles within the submitted route
            if len(role_order) != len(set(role_order)):
                return Response(
                    {'error': 'Duplicate roles detected. Each role may only appear once in a route.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 4. Check route length
            expected_length = len(scenario.workflow_route) if scenario.workflow_route else 5
            if len(role_order) != expected_length:
                return Response(
                    {'error': f'Route must contain exactly {expected_length} roles.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 5. Validate that all roles exist and belong to the session workplace
            try:
                role_ids_clean = [int(rid) for rid in role_order]
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid role ID format in role_order.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            roles_found = Role.objects.filter(id__in=role_ids_clean, workplace=session.workplace)
            roles_by_id = {r.id: r for r in roles_found}
            if len(roles_by_id) != len(role_ids_clean):
                return Response(
                    {'error': 'One or more roles do not belong to the active workplace.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            submitted_names = [roles_by_id[rid].name for rid in role_ids_clean]

            # 6. Authoritative comparison against stored workflow_route
            correct_names = scenario.workflow_route or []
            is_correct = bool(submitted_names == correct_names)
            points_awarded = 1 if is_correct else 0

            # Match or create ScenarioOption for scorecard tracking & foreign key integrity
            option = scenario.options.filter(route_sequence=submitted_names).first()
            if not option:
                option, _ = ScenarioOption.objects.get_or_create(
                    scenario=scenario,
                    option_text=' → '.join(submitted_names),
                    defaults={
                        'route_sequence': submitted_names,
                        'is_optimal': is_correct,
                        'score_ownership': 20 if is_correct else 5,
                        'score_delegation': 25 if is_correct else 5,
                        'score_collaboration': 25 if is_correct else 5,
                        'score_workflow': 25 if is_correct else 0,
                        'feedback_rationale': scenario.explanation if is_correct else 'Suboptimal task routing sequence.',
                        'order': 99,
                    }
                )

            # 7. Persist StageResponse
            StageResponse.objects.create(
                session=session,
                scenario=scenario,
                selected_option=option,
                stage=2,
                student_notes=student_notes or f"Submitted Route: {' -> '.join(submitted_names)}"
            )

            session.update_totals()

            # 8. Scoring & Progress Tracking
            total_scenarios = Scenario.objects.filter(workplace=session.workplace, stage=2).count()
            responses = StageResponse.objects.filter(session=session, stage=2).select_related(
                'scenario',
                'selected_option'
            )
            scenarios_completed = responses.count()

            correct_answers = sum(
                1 for r in responses
                if r.selected_option and r.selected_option.is_optimal
            )

            percentage = round((correct_answers / total_scenarios) * 100, 2) if total_scenarios else 0.0
            is_stage_complete = (scenarios_completed >= total_scenarios)

            # Build structured route objects for UI
            wp_roles_by_name = {r.name: r for r in Role.objects.filter(workplace=session.workplace)}
            correct_route = [
                {
                    'position': idx + 1,
                    'name': name,
                    'slug': wp_roles_by_name[name].slug if name in wp_roles_by_name else '',
                    'id': wp_roles_by_name[name].id if name in wp_roles_by_name else None,
                }
                for idx, name in enumerate(correct_names)
            ]

            submitted_route = [
                {
                    'position': idx + 1,
                    'name': roles_by_id[rid].name,
                    'slug': roles_by_id[rid].slug,
                    'id': roles_by_id[rid].id,
                }
                for idx, rid in enumerate(role_ids_clean)
            ]

            return Response({
                'is_correct': is_correct,
                'points_awarded': points_awarded,
                'submitted_route': submitted_route,
                'correct_route': correct_route,
                'explanation': scenario.explanation,
                'stage_progress': {
                    'stage': 2,
                    'scenario_number': scenario.question_number,
                    'total_scenarios': total_scenarios,
                    'scenarios_completed': scenarios_completed,
                    'correct_answers': correct_answers,
                    'stage_score_percentage': percentage,
                    'is_stage_complete': is_stage_complete,
                }
            })

        # =====================================================================
        # STAGE 3: COLLABORATION CHALLENGE (PRIMARY ROLE + SUPPORTING ROLES + WORKFLOW)
        # =====================================================================
        if stage_num == 3:
            primary_role_input = data.get('primary_role') if data.get('primary_role') is not None else data.get('primary_role_id')
            supporting_roles_input = data.get('supporting_roles') if data.get('supporting_roles') is not None else data.get('supporting_role_ids')
            workflow_input = data.get('workflow') if data.get('workflow') is not None else (data.get('workflow_role_ids') or data.get('role_order'))

            if primary_role_input is None:
                return Response(
                    {'error': 'primary_role (ID of primary owner role) is required for Stage 3.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if supporting_roles_input is None or not isinstance(supporting_roles_input, list):
                return Response(
                    {'error': 'supporting_roles (list of role IDs in supporting team) is required for Stage 3.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if workflow_input is None or not isinstance(workflow_input, list):
                return Response(
                    {'error': 'workflow (ordered list of role IDs in collaboration sequence) is required for Stage 3.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 1. Validate Scenario belongs to current session workplace and Stage 3
            try:
                scenario = Scenario.objects.select_related('primary_owner').prefetch_related('supporting_roles', 'options').get(
                    pk=scenario_id,
                    workplace=session.workplace,
                    stage=3
                )
            except Scenario.DoesNotExist:
                return Response(
                    {'error': 'Scenario does not belong to this simulation workplace or Stage 3.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Prevent duplicate submissions for the same scenario
            existing_response = StageResponse.objects.filter(session=session, scenario=scenario).first()
            if existing_response:
                return Response(
                    {
                        'error': 'An answer has already been submitted for this scenario.',
                        'already_submitted': True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Clean and parse role IDs
            try:
                primary_role_id = int(primary_role_input)
                supporting_role_ids = [int(rid) for rid in supporting_roles_input]
                workflow_role_ids = [int(rid) for rid in workflow_input]
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid role ID format provided in submission.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 4. Check for duplicates in supporting roles
            if len(supporting_role_ids) != len(set(supporting_role_ids)):
                return Response(
                    {'error': 'Duplicate roles detected in supporting team. Each role may only be selected once.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 5. Check primary role is not in supporting roles
            if primary_role_id in supporting_role_ids:
                return Response(
                    {'error': 'Primary role cannot also be selected as a supporting role.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 6. Check workflow length and duplicates
            expected_workflow_length = len(scenario.workflow_route) if scenario.workflow_route else 5
            if len(workflow_role_ids) != expected_workflow_length:
                return Response(
                    {'error': f'Collaboration workflow must contain exactly {expected_workflow_length} roles.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if len(workflow_role_ids) != len(set(workflow_role_ids)):
                return Response(
                    {'error': 'Duplicate roles detected in workflow. Each role may only appear once in sequence.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 7. Validate all roles belong to session workplace
            all_involved_ids = set([primary_role_id] + supporting_role_ids + workflow_role_ids)
            roles_found = Role.objects.filter(id__in=all_involved_ids, workplace=session.workplace)
            roles_by_id = {r.id: r for r in roles_found}

            if len(roles_by_id) != len(all_involved_ids):
                return Response(
                    {'error': 'One or more selected roles do not belong to the active workplace.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            primary_role_obj = roles_by_id[primary_role_id]
            submitted_supp_roles = [roles_by_id[rid] for rid in supporting_role_ids]
            submitted_workflow_names = [roles_by_id[rid].name for rid in workflow_role_ids]

            # 8. Authoritative Evaluation
            # A. Primary role correctness
            is_primary_correct = bool(scenario.primary_owner_id and primary_role_id == scenario.primary_owner_id)

            # B. Supporting roles correctness
            expected_supp_ids = set(scenario.supporting_roles.values_list('id', flat=True))
            is_supporting_correct = bool(set(supporting_role_ids) == expected_supp_ids)

            # C. Workflow correctness
            correct_workflow_names = scenario.workflow_route or []
            is_workflow_correct = bool(submitted_workflow_names == correct_workflow_names)

            # Overall scenario correctness (1 point if all 3 match, 0 otherwise)
            is_correct = bool(is_primary_correct and is_supporting_correct and is_workflow_correct)
            points_awarded = 1 if is_correct else 0

            # Match or create ScenarioOption for scorecard tracking & foreign key integrity
            option_summary = f"Primary: {primary_role_obj.name} | Support: {', '.join(r.name for r in submitted_supp_roles)} | Flow: {' -> '.join(submitted_workflow_names)}"
            option = scenario.options.filter(route_sequence=submitted_workflow_names, is_optimal=is_correct).first()
            if not option:
                option, _ = ScenarioOption.objects.get_or_create(
                    scenario=scenario,
                    option_text=option_summary[:490],
                    defaults={
                        'route_sequence': submitted_workflow_names,
                        'is_optimal': is_correct,
                        'score_ownership': 25 if is_primary_correct else 0,
                        'score_delegation': 25 if is_supporting_correct else 5,
                        'score_collaboration': 25 if is_correct else (15 if (is_primary_correct or is_supporting_correct) else 0),
                        'score_workflow': 25 if is_workflow_correct else 0,
                        'feedback_rationale': scenario.explanation if is_correct else 'Suboptimal collaboration plan.',
                        'order': 99,
                    }
                )

            # 9. Persist StageResponse
            StageResponse.objects.create(
                session=session,
                scenario=scenario,
                selected_option=option,
                stage=3,
                student_notes=student_notes or option_summary
            )

            session.update_totals()

            # 10. Scoring & Progress Tracking
            total_scenarios = Scenario.objects.filter(workplace=session.workplace, stage=3).count()
            responses = StageResponse.objects.filter(session=session, stage=3).select_related(
                'scenario',
                'selected_option'
            )
            scenarios_completed = responses.count()
            correct_answers = sum(
                1 for r in responses
                if r.selected_option and r.selected_option.is_optimal
            )
            percentage = round((correct_answers / total_scenarios) * 100, 2) if total_scenarios else 0.0
            is_stage_complete = (scenarios_completed >= total_scenarios)

            # Build structured route objects for UI
            wp_roles_by_name = {r.name: r for r in Role.objects.filter(workplace=session.workplace)}
            correct_workflow = [
                {
                    'position': idx + 1,
                    'name': name,
                    'slug': wp_roles_by_name[name].slug if name in wp_roles_by_name else '',
                    'id': wp_roles_by_name[name].id if name in wp_roles_by_name else None,
                }
                for idx, name in enumerate(correct_workflow_names)
            ]

            submitted_workflow = [
                {
                    'position': idx + 1,
                    'name': roles_by_id[rid].name,
                    'slug': roles_by_id[rid].slug,
                    'id': roles_by_id[rid].id,
                }
                for idx, rid in enumerate(workflow_role_ids)
            ]

            correct_supporting = [
                {
                    'id': r.id,
                    'name': r.name,
                    'slug': r.slug,
                }
                for r in scenario.supporting_roles.all()
            ]

            submitted_supporting = [
                {
                    'id': r.id,
                    'name': r.name,
                    'slug': r.slug,
                }
                for r in submitted_supp_roles
            ]

            return Response({
                'is_correct': is_correct,
                'points_awarded': points_awarded,
                'is_primary_correct': is_primary_correct,
                'is_supporting_correct': is_supporting_correct,
                'is_workflow_correct': is_workflow_correct,
                'primary_role': {
                    'id': primary_role_obj.id,
                    'name': primary_role_obj.name,
                    'slug': primary_role_obj.slug,
                },
                'correct_primary_role': {
                    'id': scenario.primary_owner.id if scenario.primary_owner else None,
                    'name': scenario.primary_owner.name if scenario.primary_owner else 'Unassigned',
                    'slug': scenario.primary_owner.slug if scenario.primary_owner else '',
                },
                'supporting_roles': submitted_supporting,
                'correct_supporting_roles': correct_supporting,
                'workflow': submitted_workflow,
                'correct_workflow': correct_workflow,
                'explanation': scenario.explanation,
                'stage_progress': {
                    'stage': 3,
                    'scenario_number': scenario.question_number,
                    'total_scenarios': total_scenarios,
                    'scenarios_completed': scenarios_completed,
                    'correct_answers': correct_answers,
                    'stage_score_percentage': percentage,
                    'is_stage_complete': is_stage_complete,
                }
            })

        # =====================================================================
        # STAGE 1: WHO OWNS THIS? (SINGLE PRIMARY OWNER SELECTION)
        # =====================================================================
        role_id = data.get('selected_role_id') or data.get('role_id')
        if not role_id:
            return Response(
                {'error': 'selected_role_id is required for Stage 1.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Validate Scenario belongs to current session workplace and Stage 1
        try:
            scenario = Scenario.objects.select_related('primary_owner').prefetch_related('supporting_roles').get(
                pk=scenario_id,
                workplace=session.workplace,
                stage=stage_num
            )
        except Scenario.DoesNotExist:
            return Response(
                {'error': 'Scenario does not belong to this simulation workplace or stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validate Selected Role exists and belongs to the session workplace
        try:
            role = Role.objects.get(pk=role_id, workplace=session.workplace)
        except Role.DoesNotExist:
            return Response(
                {'error': 'Selected role does not belong to the active workplace.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Prevent duplicate submissions for the same scenario
        existing_response = StageResponse.objects.filter(session=session, scenario=scenario).first()
        if existing_response:
            return Response(
                {
                    'error': 'An answer has already been submitted for this scenario.',
                    'already_submitted': True
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Authoritative Server-side evaluation
        primary_owner = scenario.primary_owner
        is_correct = bool(primary_owner and primary_owner.id == role.id)
        points_awarded = 1 if is_correct else 0

        # Match or create ScenarioOption for foreign key relation and scorecard tracking
        option = scenario.options.filter(recommended_role=role).first()
        if not option:
            option, _ = ScenarioOption.objects.get_or_create(
                scenario=scenario,
                recommended_role=role,
                defaults={
                    'option_text': f'{role.name} — Assigned as Primary Owner',
                    'is_optimal': is_correct,
                    'score_ownership': 25 if is_correct else 0,
                    'score_delegation': 20 if is_correct else 5,
                    'score_collaboration': 20 if is_correct else 5,
                    'score_workflow': 25 if is_correct else 5,
                    'feedback_rationale': scenario.explanation if is_correct else f'{role.name} is not the primary owner for this situation.',
                    'order': 99,
                }
            )

        # 5. Persist StageResponse
        StageResponse.objects.create(
            session=session,
            scenario=scenario,
            selected_option=option,
            stage=stage_num,
            student_notes=student_notes or f'Assigned {role.name} as Primary Owner'
        )

        session.update_totals()

        # 6. Authoritative Scoring & Progress Tracking
        total_scenarios = Scenario.objects.filter(workplace=session.workplace, stage=stage_num).count()
        responses = StageResponse.objects.filter(session=session, stage=stage_num).select_related(
            'scenario__primary_owner',
            'selected_option__recommended_role'
        )
        scenarios_completed = responses.count()

        correct_answers = sum(
            1 for r in responses
            if r.scenario.primary_owner_id and r.selected_option.recommended_role_id == r.scenario.primary_owner_id
        )

        percentage = round((correct_answers / total_scenarios) * 100, 2) if total_scenarios else 0.0
        is_stage_complete = (scenarios_completed >= total_scenarios)

        supporting_roles = [r.name for r in scenario.supporting_roles.all()]

        return Response({
            'is_correct': is_correct,
            'points_awarded': points_awarded,
            'selected_role': {
                'id': role.id,
                'name': role.name,
                'slug': role.slug,
            },
            'primary_owner': {
                'id': primary_owner.id if primary_owner else None,
                'name': primary_owner.name if primary_owner else 'Unassigned',
                'slug': primary_owner.slug if primary_owner else '',
            },
            'supporting_roles': supporting_roles,
            'explanation': scenario.explanation,
            'stage_progress': {
                'stage': stage_num,
                'scenario_number': scenario.question_number,
                'total_scenarios': total_scenarios,
                'scenarios_completed': scenarios_completed,
                'correct_answers': correct_answers,
                'stage_score_percentage': percentage,
                'is_stage_complete': is_stage_complete,
            }
        })


class StageScenariosAPIView(APIView):
    """Fetches scenarios and options for a specific simulation stage."""
    def get(self, request, session_id, stage_number):
        session = get_object_or_404(SimulationSession, pk=session_id)
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        stage_num = int(stage_number)

        # Scenarios tailored to selected role or general to workplace
        scenarios = Scenario.objects.filter(
            workplace=session.workplace,
            stage=stage_num
        ).filter(
            Q(target_role=session.selected_role) | Q(target_role__isnull=True)
        ).prefetch_related('options', 'supporting_roles').select_related('primary_owner').order_by('question_number', 'order', 'id')

        serializer = ScenarioPublicSerializer(scenarios, many=True)
        return Response({
            'session_id': str(session.id),
            'stage': stage_num,
            'workplace': session.workplace.name,
            'role': session.selected_role.name,
            'scenarios': serializer.data,
        })


class StageSubmitAPIView(APIView):
    """Validates student submissions for a stage, calculates scores, and produces immediate feedback."""
    def post(self, request, session_id, stage_number):
        session = get_object_or_404(SimulationSession, pk=session_id)
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        stage_num = int(stage_number)

        submission_serializer = StageSubmissionSerializer(data=request.data)
        if not submission_serializer.is_valid():
            return Response(submission_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        answers = submission_serializer.validated_data['answers']
        feedback_list = []

        for answer in answers:
            scenario = get_object_or_404(Scenario, pk=answer['scenario_id'], stage=stage_num)
            selected_option = get_object_or_404(ScenarioOption, pk=answer['selected_option_id'], scenario=scenario)

            # Record or update response
            StageResponse.objects.update_or_create(
                session=session,
                scenario=scenario,
                defaults={
                    'selected_option': selected_option,
                    'stage': stage_num,
                    'student_notes': answer.get('student_notes', ''),
                }
            )

            feedback_list.append({
                'scenario_id': scenario.id,
                'scenario_title': scenario.title,
                'selected_option_id': selected_option.id,
                'is_optimal': selected_option.is_optimal,
                'recommended_role': selected_option.recommended_role.name if selected_option.recommended_role else None,
                'score_delta': {
                    'ownership': selected_option.score_ownership,
                    'delegation': selected_option.score_delegation,
                    'collaboration': selected_option.score_collaboration,
                    'workflow': selected_option.score_workflow,
                },
                'feedback_rationale': selected_option.feedback_rationale,
            })

        # Recalculate and persist totals
        session.update_totals()

        # Advance stage
        next_stage = stage_num + 1
        if next_stage > 3:
            session.current_stage = 4  # Stage 4 is results
        else:
            session.current_stage = max(session.current_stage, next_stage)
        session.save(update_fields=['current_stage', 'updated_at'])

        return Response({
            'session_id': str(session.id),
            'stage_completed': stage_num,
            'next_stage': session.current_stage,
            'feedback': feedback_list,
            'current_scores': {
                'ownership': session.score_ownership,
                'delegation': session.score_delegation,
                'collaboration': session.score_collaboration,
                'workflow': session.score_workflow,
                'total': session.total_score,
            }
        })


class ResultsAPIView(APIView):
    """Calculates and returns complete authoritative results, scorecard, strengths, areas to practice, and learning takeaways."""
    def get(self, request, session_id):
        session = get_object_or_404(
            SimulationSession.objects.select_related('user', 'workplace', 'selected_role').prefetch_related(
                'responses__scenario__primary_owner',
                'responses__selected_option__recommended_role'
            ),
            pk=session_id
        )
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        # Efficiently compute total scenarios per stage in a single grouped query
        scenario_counts = dict(
            Scenario.objects.filter(workplace=session.workplace)
            .values_list('stage')
            .annotate(cnt=Count('id'))
        )
        total_s1 = scenario_counts.get(1, 0)
        total_s2 = scenario_counts.get(2, 0)
        total_s3 = scenario_counts.get(3, 0)

        # In-memory partitioning of prefetched responses (eliminates N+1 queries)
        all_responses = list(session.responses.all())
        s1_responses = [r for r in all_responses if r.stage == 1]
        s2_responses = [r for r in all_responses if r.stage == 2]
        s3_responses = [r for r in all_responses if r.stage == 3]

        s1_completed = len(s1_responses)
        s1_correct = sum(
            1 for r in s1_responses
            if r.scenario.primary_owner_id and r.selected_option and r.selected_option.recommended_role_id == r.scenario.primary_owner_id
        )
        s1_percentage = round((s1_correct / total_s1) * 100, 2) if total_s1 else 0.0

        s2_completed = len(s2_responses)
        s2_correct = sum(
            1 for r in s2_responses
            if r.selected_option and r.selected_option.is_optimal
        )
        s2_percentage = round((s2_correct / total_s2) * 100, 2) if total_s2 else 0.0

        s3_completed = len(s3_responses)
        s3_correct = sum(
            1 for r in s3_responses
            if r.selected_option and r.selected_option.is_optimal
        )
        s3_percentage = round((s3_correct / total_s3) * 100, 2) if total_s3 else 0.0

        # Overall Authoritative Score (9 questions / points total)
        total_correct = s1_correct + s2_correct + s3_correct
        total_questions = total_s1 + total_s2 + total_s3
        overall_percentage = round((total_correct / total_questions) * 100, 2) if total_questions else 0.0

        is_completed = bool(
            s1_completed >= total_s1 and total_s1 > 0 and
            s2_completed >= total_s2 and total_s2 > 0 and
            s3_completed >= total_s3 and total_s3 > 0
        )

        # STRENGTHS: Only show strengths supported by student's actual results
        strengths = []
        if s1_correct >= 2:
            strengths.append({
                'title': 'Ownership Identification',
                'description': 'You accurately identified the role carrying primary responsibility during technical and operational incidents.'
            })
        if s2_correct >= 2:
            strengths.append({
                'title': 'Workflow Sequencing',
                'description': 'You correctly determined the order in which tasks and incident response activities transition across technical teams.'
            })
        if s3_correct >= 2:
            strengths.append({
                'title': 'Cross-Team Collaboration',
                'description': 'You effectively coordinated multi-disciplinary teams and aligned technical roles to resolve complex workplace crises.'
            })

        if not strengths:
            best_score = max(s1_correct, s2_correct, s3_correct)
            if best_score > 0:
                if s1_correct == best_score:
                    strengths.append({
                        'title': 'Ownership Awareness',
                        'description': 'You demonstrated developing awareness in distinguishing role ownership during workplace tasks.'
                    })
                elif s2_correct == best_score:
                    strengths.append({
                        'title': 'Workflow Awareness',
                        'description': 'You demonstrated developing understanding of how tasks move through team pipelines.'
                    })
                elif s3_correct == best_score:
                    strengths.append({
                        'title': 'Collaboration Awareness',
                        'description': 'You demonstrated developing understanding of multi-role crisis response coordination.'
                    })
            else:
                strengths.append({
                    'title': 'Foundational Awareness',
                    'description': 'You completed initial exploration into technical role boundaries, incident routing, and team workflows.'
                })

        # AREAS TO PRACTICE: Use actual stage results, encouraging and constructive
        areas_to_practice = []
        if s1_correct == s2_correct == s3_correct:
            if s1_correct == 3:
                areas_to_practice.append({
                    'stage': 'All Stages Mastered',
                    'recommendation': 'Continue practicing ownership, workflow thinking and collaboration across diverse workplace scenarios.'
                })
            else:
                areas_to_practice.append({
                    'stage': 'Balanced Practice',
                    'recommendation': 'Continue practicing ownership, workflow thinking and collaboration.'
                })
        else:
            min_score = min(s1_correct, s2_correct, s3_correct)
            if s1_correct == min_score:
                areas_to_practice.append({
                    'stage': 'Stage 1: Ownership',
                    'recommendation': 'Practice identifying the primary owner of workplace incidents.'
                })
            if s2_correct == min_score:
                areas_to_practice.append({
                    'stage': 'Stage 2: Task Routing',
                    'recommendation': 'Practice understanding how tasks move between technical teams.'
                })
            if s3_correct == min_score:
                areas_to_practice.append({
                    'stage': 'Stage 3: Collaboration',
                    'recommendation': 'Practice identifying supporting roles and coordinating complex workflows.'
                })

        # ROLE INSIGHTS (Educational, grounded in completed scenarios)
        role_insights = [
            'Security-focused scenarios required coordination between SOC, Cybersecurity and Network roles.',
            'Application security scenarios required collaboration between Cybersecurity, Backend, DevOps and QA.',
            'Complex incidents often require multiple teams rather than a single role.'
        ]

        # WHAT YOU PRACTICED (Learning Summary)
        learning_summary = [
            {
                'stage': 1,
                'title': 'Ownership',
                'description': 'You practiced identifying which role should take primary responsibility for a workplace situation.'
            },
            {
                'stage': 2,
                'title': 'Workflow Thinking',
                'description': 'You practiced routing tasks and incidents through the right sequence of roles.'
            },
            {
                'stage': 3,
                'title': 'Collaboration',
                'description': 'You practiced building a team and coordinating multiple roles to solve a complex situation.'
            }
        ]

        # Response details history
        response_details = []
        for resp in all_responses:
            opt = resp.selected_option
            response_details.append({
                'stage': resp.stage,
                'scenario_title': resp.scenario.title,
                'selected_option': opt.option_text if opt else '',
                'is_optimal': opt.is_optimal if opt else False,
                'recommended_role': opt.recommended_role.name if opt and opt.recommended_role else None,
                'feedback_rationale': opt.feedback_rationale if opt else '',
                'student_notes': resp.student_notes,
            })

        # Student reflection if already submitted
        reflection_data = None
        if hasattr(session, 'reflection'):
            reflection_data = StudentReflectionSerializer(session.reflection).data

        # Competency scores for backward compatibility
        max_possible_per_comp = 75
        competencies = {
            'ownership': {
                'score': session.score_ownership,
                'percentage': min(100, round((session.score_ownership / max_possible_per_comp) * 100)) if max_possible_per_comp else 0,
                'level': 'Proficient' if session.score_ownership >= 55 else ('Developing' if session.score_ownership >= 35 else 'Needs Practice'),
            },
            'delegation': {
                'score': session.score_delegation,
                'percentage': min(100, round((session.score_delegation / max_possible_per_comp) * 100)) if max_possible_per_comp else 0,
                'level': 'Proficient' if session.score_delegation >= 55 else ('Developing' if session.score_delegation >= 35 else 'Needs Practice'),
            },
            'collaboration': {
                'score': session.score_collaboration,
                'percentage': min(100, round((session.score_collaboration / max_possible_per_comp) * 100)) if max_possible_per_comp else 0,
                'level': 'Proficient' if session.score_collaboration >= 55 else ('Developing' if session.score_collaboration >= 35 else 'Needs Practice'),
            },
            'workflow': {
                'score': session.score_workflow,
                'percentage': min(100, round((session.score_workflow / max_possible_per_comp) * 100)) if max_possible_per_comp else 0,
                'level': 'Proficient' if session.score_workflow >= 55 else ('Developing' if session.score_workflow >= 35 else 'Needs Practice'),
            },
        }

        return Response({
            'session_id': str(session.id),
            'student_name': session.student_name,
            'workplace': session.workplace.name,
            'selected_role': session.selected_role.name,
            'total_score': session.total_score,
            'status': session.status,
            'competencies': competencies,
            'has_reflection': hasattr(session, 'reflection'),
            'stage_1': {
                'correct': s1_correct,
                'total': total_s1,
                'percentage': s1_percentage,
            },
            'stage_2': {
                'correct': s2_correct,
                'total': total_s2,
                'percentage': s2_percentage,
            },
            'stage_3': {
                'correct': s3_correct,
                'total': total_s3,
                'percentage': s3_percentage,
            },
            'overall': {
                'correct': total_correct,
                'total': total_questions,
                'percentage': overall_percentage,
            },
            'completed': is_completed,
            'strengths': strengths,
            'areas_to_practice': areas_to_practice,
            'role_insights': role_insights,
            'learning_summary': learning_summary,
            'history': response_details,
            'reflection': reflection_data,
        })


class ReflectionAPIView(APIView):
    """Submits student reflection and closes the simulation session."""
    def get(self, request, session_id):
        session = get_object_or_404(SimulationSession, pk=session_id)
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp
        if hasattr(session, 'reflection'):
            return Response(StudentReflectionSerializer(session.reflection).data)
        return Response({'reflection': None})

    def post(self, request, session_id):
        try:
            session = SimulationSession.objects.get(pk=session_id)
        except (SimulationSession.DoesNotExist, ValueError):
            return Response(
                {'error': 'Simulation session not found. Please start a valid session.'},
                status=status.HTTP_404_NOT_FOUND
            )

        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        data = request.data or {}
        q1 = str(data.get('ownership_reflection', data.get('ownership_takeaway', ''))).strip()[:2000]
        q2 = str(data.get('collaboration_reflection', data.get('collaboration_takeaway', ''))).strip()[:2000]
        q3 = str(data.get('improvement_reflection', data.get('workflow_takeaway', ''))).strip()[:2000]
        delegation_takeaway = str(data.get('delegation_takeaway', '')).strip()[:2000]

        reflection, created = StudentReflection.objects.update_or_create(
            session=session,
            defaults={
                'ownership_reflection': q1,
                'collaboration_reflection': q2,
                'improvement_reflection': q3,
                'ownership_takeaway': q1,
                'delegation_takeaway': delegation_takeaway or q2,
                'collaboration_takeaway': q2,
                'workflow_takeaway': q3,
            }
        )

        # Close and complete session upon reflection submission
        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save(update_fields=['status', 'completed_at', 'updated_at'])

        resp_dict = StudentReflectionSerializer(reflection).data
        resp_dict['saved'] = True
        resp_dict['message'] = 'Your learning reflection has been saved.'
        resp_dict['reflection'] = StudentReflectionSerializer(reflection).data

        return Response(resp_dict, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SessionCompleteAPIView(APIView):
    """Marks a simulation session as completed."""
    def post(self, request, session_id):
        try:
            session = SimulationSession.objects.get(pk=session_id)
        except (SimulationSession.DoesNotExist, ValueError):
            return Response(
                {'error': 'Simulation session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        session.status = 'completed'
        session.completed_at = timezone.now()
        session.current_stage = 4
        session.save(update_fields=['status', 'completed_at', 'current_stage', 'updated_at'])

        return Response({
            'session_id': str(session.id),
            'status': session.status,
            'completed': True,
            'completed_at': session.completed_at
        }, status=status.HTTP_200_OK)


class RegisterAPIView(APIView):
    """Registers a new student user and establishes session."""
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        login(request, user)
        profile_data = UserProfileSerializer(user).data
        return Response({
            'message': 'Account registered successfully.',
            'authenticated': True,
            'is_authenticated': True,
            'user': profile_data
        }, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    """Authenticates student user and creates session."""
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.validated_data['user']
        login(request, user)
        profile_data = UserProfileSerializer(user).data
        return Response({
            'message': 'Signed in successfully.',
            'authenticated': True,
            'is_authenticated': True,
            'user': profile_data
        }, status=status.HTTP_200_OK)


class LogoutAPIView(APIView):
    """Logs out current user session."""
    def post(self, request):
        logout(request)
        return Response({
            'message': 'Signed out successfully.',
            'authenticated': False,
            'is_authenticated': False,
            'user': None
        }, status=status.HTTP_200_OK)


class CurrentUserAPIView(APIView):
    """Returns current authenticated student user profile and stats."""
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({
                'authenticated': False,
                'is_authenticated': False,
                'user': None
            }, status=status.HTTP_200_OK)
        profile_data = UserProfileSerializer(request.user).data
        return Response({
            'authenticated': True,
            'is_authenticated': True,
            'user': profile_data
        }, status=status.HTTP_200_OK)


class UserHistoryAPIView(APIView):
    """Returns past simulation history and portfolio statistics for the authenticated student user."""
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required to view simulation history.'
            }, status=status.HTTP_401_UNAUTHORIZED)

        sessions = request.user.simulation_sessions.select_related(
            'workplace', 'selected_role'
        ).prefetch_related('responses__selected_option').order_by('-created_at')

        total_count = sessions.count()
        completed_sessions = [s for s in sessions if s.status == 'completed']
        completed_count = len(completed_sessions)

        scores_pct = []
        simulations_data = []

        for s in sessions:
            optimal_count = sum(
                1 for r in s.responses.all()
                if r.selected_option and r.selected_option.is_optimal
            )
            pct = round((optimal_count / 9.0) * 100) if optimal_count else 0
            if s.status == 'completed':
                scores_pct.append(pct)

            simulations_data.append({
                'id': str(s.id),
                'workplace_name': s.workplace.name,
                'workplace_slug': s.workplace.slug,
                'role_name': s.selected_role.name,
                'role_slug': s.selected_role.slug,
                'completed': s.status == 'completed',
                'final_score': optimal_count,
                'percentage': pct,
                'current_stage': s.current_stage,
                'created_at': s.created_at.isoformat(),
                'completed_at': s.completed_at.isoformat() if s.completed_at else None,
            })

        avg_pct = round(sum(scores_pct) / len(scores_pct)) if scores_pct else 0
        top_pct = max(scores_pct) if scores_pct else 0

        return Response({
            'user': UserProfileSerializer(request.user).data,
            'stats': {
                'total_simulations': total_count,
                'completed_simulations': completed_count,
                'avg_score_pct': avg_pct,
                'highest_score_pct': top_pct,
            },
            'simulations': simulations_data
        }, status=status.HTTP_200_OK)


class StudentDashboardAPIView(APIView):
    """
    Returns comprehensive student learning analytics, multi-competency breakdown,
    role experience distribution, and historical simulation portfolio.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({
                'authenticated': False,
                'message': 'Sign in to access your personalized student dashboard, historical session reviews, and verified certificates.'
            }, status=status.HTTP_200_OK)

        user = request.user
        sessions = user.simulation_sessions.select_related(
            'workplace', 'selected_role'
        ).prefetch_related(
            'responses__selected_option',
            'responses__scenario__primary_owner',
            'reflection'
        ).order_by('-created_at')

        total_simulations = sessions.count()
        completed_sessions = [s for s in sessions if s.status == 'completed']
        completed_count = len(completed_sessions)

        s1_scores, s2_scores, s3_scores = [], [], []
        overall_scores_pct = []
        roles_practiced = {}
        simulations_data = []

        for s in sessions:
            s1_correct = sum(
                1 for r in s.responses.all()
                if r.stage == 1 and r.scenario.primary_owner_id and r.selected_option.recommended_role_id == r.scenario.primary_owner_id
            )
            s2_correct = sum(
                1 for r in s.responses.all()
                if r.stage == 2 and r.selected_option and r.selected_option.is_optimal
            )
            s3_correct = sum(
                1 for r in s.responses.all()
                if r.stage == 3 and r.selected_option and r.selected_option.is_optimal
            )
            total_correct = s1_correct + s2_correct + s3_correct
            pct = round((total_correct / 9.0) * 100, 1)

            if s.status == 'completed':
                s1_scores.append((s1_correct / 3.0) * 100)
                s2_scores.append((s2_correct / 3.0) * 100)
                s3_scores.append((s3_correct / 3.0) * 100)
                overall_scores_pct.append(pct)

            r_name = s.selected_role.name
            if r_name not in roles_practiced:
                roles_practiced[r_name] = {
                    'role_name': r_name,
                    'role_slug': s.selected_role.slug,
                    'attempts': 0,
                    'best_score': 0,
                    'best_pct': 0,
                }
            roles_practiced[r_name]['attempts'] += 1
            if total_correct > roles_practiced[r_name]['best_score']:
                roles_practiced[r_name]['best_score'] = total_correct
                roles_practiced[r_name]['best_pct'] = pct

            simulations_data.append({
                'id': str(s.id),
                'workplace_name': s.workplace.name,
                'workplace_slug': s.workplace.slug,
                'role_name': s.selected_role.name,
                'role_slug': s.selected_role.slug,
                'completed': s.status == 'completed',
                'status': s.status,
                'current_stage': s.current_stage,
                'score_correct': total_correct,
                'score_total': 9,
                'percentage': pct,
                'stage_1_correct': s1_correct,
                'stage_2_correct': s2_correct,
                'stage_3_correct': s3_correct,
                'has_reflection': hasattr(s, 'reflection') and bool(getattr(s.reflection, 'ownership_reflection', '') or getattr(s.reflection, 'collaboration_reflection', '')),
                'certificate_eligible': s.status == 'completed' and pct >= 70.0,
                'certificate_code': f"TC-{s.workplace.slug[:4].upper()}-{str(s.id)[:8].upper()}",
                'created_at': s.created_at.isoformat(),
                'completed_at': s.completed_at.isoformat() if s.completed_at else None,
            })

        avg_s1 = round(sum(s1_scores) / len(s1_scores)) if s1_scores else 0
        avg_s2 = round(sum(s2_scores) / len(s2_scores)) if s2_scores else 0
        avg_s3 = round(sum(s3_scores) / len(s3_scores)) if s3_scores else 0
        overall_avg = round(sum(overall_scores_pct) / len(overall_scores_pct), 1) if overall_scores_pct else 0.0
        top_score = max(overall_scores_pct) if overall_scores_pct else 0.0

        def get_proficiency_tier(pct):
            if pct >= 85: return 'Mastered'
            if pct >= 65: return 'Proficient'
            if pct >= 40: return 'Developing'
            return 'Introductory'

        competencies = {
            'ownership': {
                'name': 'Incident Ownership & Triage',
                'score_percentage': avg_s1,
                'tier': get_proficiency_tier(avg_s1),
                'description': 'Accuracy in discerning the single primary owner responsible for incidents and technical tasks.'
            },
            'routing': {
                'name': 'Workflow Routing & Sequencing',
                'score_percentage': avg_s2,
                'tier': get_proficiency_tier(avg_s2),
                'description': 'Precision in building multi-team operational pipelines from intake through deployment.'
            },
            'collaboration': {
                'name': 'Cross-Team Incident Coordination',
                'score_percentage': avg_s3,
                'tier': get_proficiency_tier(avg_s3),
                'description': 'Mastery of supporting functional teams and crisis communication flows during outages.'
            }
        }

        return Response({
            'authenticated': True,
            'user': UserProfileSerializer(user).data,
            'summary': {
                'total_simulations': total_simulations,
                'completed_simulations': completed_count,
                'in_progress_simulations': total_simulations - completed_count,
                'overall_average_score': overall_avg,
                'top_score_percentage': top_score,
                'certificates_earned': sum(1 for s in simulations_data if s['certificate_eligible']),
            },
            'competencies': competencies,
            'role_experience': list(roles_practiced.values()),
            'simulations': simulations_data,
        }, status=status.HTTP_200_OK)


class SessionReviewAPIView(APIView):
    """
    Returns full question-by-question audit, submitted answers, optimal answers,
    pedagogical rationale, and reflection for past simulation inspection.
    """
    def get(self, request, session_id):
        session = get_object_or_404(
            SimulationSession.objects.select_related('workplace', 'selected_role').prefetch_related(
                'responses__scenario__primary_owner',
                'responses__selected_option__recommended_role',
                'reflection'
            ),
            pk=session_id
        )

        # Authorization: if session belongs to a user, must be that user or admin
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        responses_data = []
        for r in session.responses.all().order_by('stage', 'scenario__question_number'):
            opt = r.selected_option
            sc = r.scenario
            is_correct = opt.is_optimal if opt else False
            if r.stage == 1 and sc.primary_owner_id:
                is_correct = (opt.recommended_role_id == sc.primary_owner_id)

            responses_data.append({
                'stage': r.stage,
                'question_number': sc.question_number,
                'scenario_title': sc.title,
                'scenario_situation': sc.situation or sc.description,
                'primary_owner_name': sc.primary_owner.name if sc.primary_owner else 'N/A',
                'selected_option_text': opt.option_text if opt else 'No answer recorded',
                'selected_role_name': opt.recommended_role.name if opt and opt.recommended_role else None,
                'is_correct': is_correct,
                'feedback_rationale': opt.feedback_rationale if opt else sc.explanation,
                'pedagogical_explanation': sc.explanation,
                'student_notes': r.student_notes,
            })

        reflection_data = None
        if hasattr(session, 'reflection'):
            refl = session.reflection
            reflection_data = {
                'ownership_reflection': refl.ownership_reflection,
                'collaboration_reflection': refl.collaboration_reflection,
                'improvement_reflection': refl.improvement_reflection,
                'submitted_at': refl.created_at.isoformat(),
            }

        optimal_count = sum(1 for r in responses_data if r['is_correct'])
        pct = round((optimal_count / 9.0) * 100, 1)

        return Response({
            'session_id': str(session.id),
            'student_name': session.student_name,
            'workplace_name': session.workplace.name,
            'role_name': session.selected_role.name,
            'status': session.status,
            'created_at': session.created_at.isoformat(),
            'completed_at': session.completed_at.isoformat() if session.completed_at else None,
            'score': {
                'correct': optimal_count,
                'total': 9,
                'percentage': pct,
            },
            'responses': responses_data,
            'reflection': reflection_data,
        }, status=status.HTTP_200_OK)


class SessionCertificateAPIView(APIView):
    """
    Generates verified career readiness certificate payload for completed simulations with passing score.
    """
    def get(self, request, session_id):
        session = get_object_or_404(
            SimulationSession.objects.select_related('workplace', 'selected_role').prefetch_related(
                'responses__selected_option',
                'responses__scenario__primary_owner'
            ),
            pk=session_id
        )

        # Authorization: if session belongs to a user, must be that user or admin
        forbidden_resp = check_session_ownership(session, request)
        if forbidden_resp:
            return forbidden_resp

        optimal_count = sum(
            1 for r in session.responses.all()
            if (r.selected_option and r.selected_option.is_optimal) or
               (r.stage == 1 and r.scenario.primary_owner_id and r.selected_option.recommended_role_id == r.scenario.primary_owner_id)
        )
        pct = round((optimal_count / 9.0) * 100, 1)

        if session.status != 'completed' or pct < 70.0:
            return Response({
                'error': f'Certificate unavailable. Requires a completed simulation with at least 70% mastery (Current: {pct}%).',
                'eligible': False,
                'score_pct': pct
            }, status=status.HTTP_400_BAD_REQUEST)

        distinction = 'Verified Workplace Proficiency'
        if pct == 100.0:
            distinction = 'Mastery with Distinction — Perfect 100% Score'
        elif pct >= 85.0:
            distinction = 'Proficiency with Honors'

        certificate_code = f"TC-VERIFIED-{session.workplace.slug[:4].upper()}-{str(session.id)[:8].upper()}"

        return Response({
            'eligible': True,
            'certificate_id': certificate_code,
            'student_name': session.student_name or (request.user.first_name if request.user and request.user.is_authenticated else 'Student Learner'),
            'workplace_name': session.workplace.name,
            'role_name': session.selected_role.name,
            'score_correct': optimal_count,
            'score_total': 9,
            'percentage': pct,
            'distinction': distinction,
            'competencies_certified': [
                'Incident Ownership & Triage',
                'Cross-Functional Workflow Routing',
                'Multi-Role Incident Response Collaboration'
            ],
            'issued_at': (session.completed_at or session.created_at).strftime('%B %d, %Y'),
            'verification_url': f"/api/sessions/{session.id}/certificate/",
        }, status=status.HTTP_200_OK)



