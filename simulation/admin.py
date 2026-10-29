from django.contrib import admin
from .models import (
     Workplace,
     Role,
     Scenario,
     ScenarioOption,
     SimulationSession,
     StageResponse,
     StudentReflection,
)


class RoleInline(admin.TabularInline):
    model = Role
    extra = 1
    fields = ('name', 'slug', 'category', 'order', 'is_cybersecurity')


@admin.register(Workplace)
class WorkplaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'slug', 'category', 'order', 'icon', 'theme_color')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'description', 'category')
    inlines = [RoleInline]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'workplace', 'category', 'order', 'is_cybersecurity', 'tagline')
    list_filter = ('workplace', 'category', 'is_cybersecurity')
    search_fields = ('name', 'tagline', 'description', 'category')
    ordering = ('workplace', 'order')


class ScenarioOptionInline(admin.StackedInline):
    model = ScenarioOption
    extra = 2
    fields = (
        'option_text',
        'recommended_role',
        'route_sequence',
        'is_optimal',
        ('score_ownership', 'score_delegation', 'score_collaboration', 'score_workflow'),
        'feedback_rationale',
        'order',
    )


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ('title', 'workplace', 'stage', 'question_number', 'primary_owner', 'urgency_level', 'incident_type')
    list_filter = ('workplace', 'stage', 'urgency_level')
    search_fields = ('title', 'task', 'situation', 'explanation', 'incident_type')
    filter_horizontal = ('supporting_roles',)
    ordering = ('workplace', 'stage', 'question_number')
    inlines = [ScenarioOptionInline]


class StageResponseInline(admin.TabularInline):
    model = StageResponse
    extra = 0
    readonly_fields = ('scenario', 'selected_option', 'stage', 'created_at')


class StudentReflectionInline(admin.StackedInline):
    model = StudentReflection
    extra = 0
    can_delete = False


@admin.register(SimulationSession)
class SimulationSessionAdmin(admin.ModelAdmin):
    list_display = (
        'student_name',
        'user',
        'workplace',
        'selected_role',
        'current_stage',
        'status',
        'total_score',
        'created_at',
    )
    list_filter = ('workplace', 'status', 'current_stage')
    search_fields = ('student_name', 'user__username', 'id')
    readonly_fields = (
        'id',
        'score_ownership',
        'score_delegation',
        'score_collaboration',
        'score_workflow',
        'total_score',
        'created_at',
        'updated_at',
    )
    inlines = [StageResponseInline, StudentReflectionInline]


@admin.register(StudentReflection)
class StudentReflectionAdmin(admin.ModelAdmin):
    list_display = ('session', 'created_at', 'updated_at')
    search_fields = ('session__student_name',)
    readonly_fields = ('created_at', 'updated_at')

