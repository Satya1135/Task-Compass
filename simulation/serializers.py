import re
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, Max, Q
from rest_framework import serializers
from .models import (
    Workplace,
    Role,
    Scenario,
    ScenarioOption,
    SimulationSession,
    StageResponse,
    StudentReflection,
)


class RoleSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'tagline',
            'description',
            'responsibilities',
            'key_collaborators',
            'is_cybersecurity',
            'order',
            'image',
        ]

    def get_image(self, obj):
        return f"/static/images/roles/{obj.slug}.jpg"


class WorkplaceListSerializer(serializers.ModelSerializer):
    roles_count = serializers.IntegerField(source='roles.count', read_only=True)

    class Meta:
        model = Workplace
        fields = [
            'id',
            'key',
            'name',
            'slug',
            'category',
            'tagline',
            'description',
            'icon',
            'theme_color',
            'order',
            'roles_count',
        ]


class WorkplaceDetailSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    scenarios_count = serializers.IntegerField(source='scenarios.count', read_only=True)

    class Meta:
        model = Workplace
        fields = [
            'id',
            'key',
            'name',
            'slug',
            'category',
            'tagline',
            'description',
            'icon',
            'theme_color',
            'order',
            'roles',
            'scenarios_count',
        ]


class ScenarioOptionPublicSerializer(serializers.ModelSerializer):
    recommended_role_name = serializers.CharField(source='recommended_role.name', read_only=True)

    class Meta:
        model = ScenarioOption
        fields = [
            'id',
            'option_text',
            'recommended_role',
            'recommended_role_name',
            'route_sequence',
            'order',
        ]


class ScenarioOptionFeedbackSerializer(serializers.ModelSerializer):
    recommended_role_name = serializers.CharField(source='recommended_role.name', read_only=True)

    class Meta:
        model = ScenarioOption
        fields = [
            'id',
            'option_text',
            'recommended_role',
            'recommended_role_name',
            'route_sequence',
            'is_optimal',
            'score_ownership',
            'score_delegation',
            'score_collaboration',
            'score_workflow',
            'feedback_rationale',
            'order',
        ]


class ScenarioPublicSerializer(serializers.ModelSerializer):
    """
    Sanitized scenario serializer for student assessment stages.
    Excludes authoritative answer keys, primary owner IDs, workflow routes,
    and explanations to prevent client-side inspection / answer leakage.
    """
    options = ScenarioOptionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Scenario
        fields = [
            'id',
            'stage',
            'question_number',
            'title',
            'task',
            'situation',
            'description',
            'incident_type',
            'urgency_level',
            'context_data',
            'target_role',
            'order',
            'options',
        ]


class ScenarioSerializer(serializers.ModelSerializer):
    options = ScenarioOptionPublicSerializer(many=True, read_only=True)
    primary_owner_name = serializers.CharField(source='primary_owner.name', read_only=True)
    supporting_role_names = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            'id',
            'stage',
            'question_number',
            'title',
            'task',
            'situation',
            'description',
            'primary_owner',
            'primary_owner_name',
            'supporting_roles',
            'supporting_role_names',
            'workflow_route',
            'ideal_roles',
            'supporting_teams',
            'communication_flow',
            'explanation',
            'incident_type',
            'urgency_level',
            'context_data',
            'target_role',
            'order',
            'options',
        ]

    def get_supporting_role_names(self, obj):
        return [r.name for r in obj.supporting_roles.all()]


class StageResponseItemSerializer(serializers.Serializer):
    scenario_id = serializers.IntegerField()
    selected_option_id = serializers.IntegerField()
    student_notes = serializers.CharField(required=False, allow_blank=True, default='')


class StageSubmissionSerializer(serializers.Serializer):
    stage = serializers.IntegerField(min_value=1, max_value=3)
    answers = StageResponseItemSerializer(many=True)


class StudentReflectionSerializer(serializers.ModelSerializer):
    ownership_reflection = serializers.CharField(required=False, allow_blank=True, default='')
    collaboration_reflection = serializers.CharField(required=False, allow_blank=True, default='')
    improvement_reflection = serializers.CharField(required=False, allow_blank=True, default='')
    ownership_takeaway = serializers.CharField(required=False, allow_blank=True, default='')
    delegation_takeaway = serializers.CharField(required=False, allow_blank=True, default='')
    collaboration_takeaway = serializers.CharField(required=False, allow_blank=True, default='')
    workflow_takeaway = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = StudentReflection
        fields = [
            'id',
            'ownership_reflection',
            'collaboration_reflection',
            'improvement_reflection',
            'ownership_takeaway',
            'delegation_takeaway',
            'collaboration_takeaway',
            'workflow_takeaway',
            'created_at',
            'updated_at',
        ]



class StageResponseDetailSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)
    scenario_stage = serializers.IntegerField(source='scenario.stage', read_only=True)
    selected_option = ScenarioOptionFeedbackSerializer(read_only=True)

    class Meta:
        model = StageResponse
        fields = [
            'id',
            'scenario',
            'scenario_title',
            'scenario_stage',
            'selected_option',
            'stage',
            'student_notes',
            'created_at',
        ]


class SimulationSessionCreateSerializer(serializers.Serializer):
    student_name = serializers.CharField(max_length=120, trim_whitespace=True)
    workplace_id = serializers.IntegerField()
    role_id = serializers.IntegerField()

    def validate_student_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Student name cannot be blank.")
        return cleaned

    def validate(self, attrs):
        try:
            workplace = Workplace.objects.get(pk=attrs['workplace_id'])
        except Workplace.DoesNotExist:
            raise serializers.ValidationError({"workplace_id": "Invalid workplace ID."})

        try:
            role = Role.objects.get(pk=attrs['role_id'], workplace=workplace)
        except Role.DoesNotExist:
            raise serializers.ValidationError({"role_id": "Invalid role ID for this workplace."})

        attrs['workplace'] = workplace
        attrs['role'] = role
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    simulations_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    best_score = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'student_name',
            'date_joined',
            'simulations_count',
            'completed_count',
            'best_score',
        ]

    def _get_stats(self, obj):
        if not hasattr(obj, '_cached_simulation_stats'):
            stats = obj.simulation_sessions.aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                best=Max('total_score', filter=Q(status='completed'))
            )
            obj._cached_simulation_stats = {
                'total': stats['total'] or 0,
                'completed': stats['completed'] or 0,
                'best': stats['best'] or 0,
            }
        return obj._cached_simulation_stats

    def get_student_name(self, obj):
        return obj.first_name or obj.username

    def get_simulations_count(self, obj):
        return self._get_stats(obj)['total']

    def get_completed_count(self, obj):
        return self._get_stats(obj)['completed']

    def get_best_score(self, obj):
        return self._get_stats(obj)['best']


class SimulationSessionDetailSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    workplace = WorkplaceListSerializer(read_only=True)
    selected_role = RoleSerializer(read_only=True)
    responses = StageResponseDetailSerializer(many=True, read_only=True)
    reflection = StudentReflectionSerializer(read_only=True)

    class Meta:
        model = SimulationSession
        fields = [
            'id',
            'user',
            'student_name',
            'workplace',
            'selected_role',
            'current_stage',
            'status',
            'score_ownership',
            'score_delegation',
            'score_collaboration',
            'score_workflow',
            'total_score',
            'created_at',
            'updated_at',
            'completed_at',
            'responses',
            'reflection',
        ]


class UserRegisterSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(max_length=120, required=False, allow_blank=True, trim_whitespace=True)
    first_name = serializers.CharField(max_length=120, required=False, allow_blank=True, trim_whitespace=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6, max_length=128)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'student_name']

    def validate_username(self, value):
        val = value.strip()
        if len(val) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if len(val) > 30:
            raise serializers.ValidationError("Username cannot exceed 30 characters.")
        if not re.match(r'^[a-zA-Z0-9_.-]+$', val):
            raise serializers.ValidationError("Username may only contain letters, numbers, dots, underscores, and dashes.")
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if not val:
            raise serializers.ValidationError("A valid email address is required.")
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return val

    def validate(self, attrs):
        pw = attrs.get('password')
        pw_confirm = attrs.get('password_confirm')
        if pw_confirm and pw != pw_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        first_name = (validated_data.pop('first_name', '') or validated_data.pop('student_name', '')).strip()
        validated_data.pop('student_name', None)
        user = User.objects.create_user(
            username=validated_data['username'].strip(),
            email=validated_data['email'].strip().lower(),
            password=validated_data['password'],
            first_name=first_name
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username_or_email = attrs.get('username')
        password = attrs.get('password')

        # Allow logging in with either username or email
        user = authenticate(username=username_or_email, password=password)
        if not user and '@' in username_or_email:
            user_obj = User.objects.filter(email__iexact=username_or_email).first()
            if user_obj:
                user = authenticate(username=user_obj.username, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials. Please check your username/email and password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs['user'] = user
        return attrs


class UserSimulationHistorySerializer(serializers.ModelSerializer):
    workplace_name = serializers.CharField(source='workplace.name', read_only=True)
    workplace_slug = serializers.CharField(source='workplace.slug', read_only=True)
    selected_role_name = serializers.CharField(source='selected_role.name', read_only=True)
    selected_role_slug = serializers.CharField(source='selected_role.slug', read_only=True)

    class Meta:
        model = SimulationSession
        fields = [
            'id',
            'workplace_name',
            'workplace_slug',
            'selected_role_name',
            'selected_role_slug',
            'status',
            'current_stage',
            'score_ownership',
            'score_delegation',
            'score_collaboration',
            'score_workflow',
            'total_score',
            'created_at',
            'completed_at',
        ]
