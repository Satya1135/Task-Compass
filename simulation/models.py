import uuid
from django.conf import settings
from django.db import models


class Competency(models.TextChoices):
    OWNERSHIP = 'ownership', 'Ownership'
    DELEGATION = 'delegation', 'Delegation'
    COLLABORATION = 'collaboration', 'Collaboration'
    WORKFLOW = 'workflow', 'Workflow Thinking'


class Workplace(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    key = models.CharField(max_length=100, unique=True, blank=True)
    category = models.CharField(max_length=100, blank=True, default='General')
    tagline = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='building')
    theme_color = models.CharField(max_length=30, default='#3b82f6')
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Role(models.Model):
    workplace = models.ForeignKey(Workplace, related_name='roles', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    category = models.CharField(max_length=100, blank=True, default='General')
    tagline = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    responsibilities = models.JSONField(default=list, blank=True)
    key_collaborators = models.JSONField(default=list, blank=True)
    is_cybersecurity = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'name']
        unique_together = ('workplace', 'slug')

    def __str__(self):
        return f"{self.name} ({self.workplace.name})"


class Scenario(models.Model):
    STAGE_CHOICES = (
        (1, 'Stage 1: Who Owns This?'),
        (2, 'Stage 2: Task Routing'),
        (3, 'Stage 3: Collaboration Challenge'),
    )

    workplace = models.ForeignKey(Workplace, related_name='scenarios', on_delete=models.CASCADE)
    stage = models.PositiveSmallIntegerField(choices=STAGE_CHOICES)
    question_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=255)
    task = models.TextField(blank=True, default='', help_text="Actionable assignment or objective for this stage")
    situation = models.TextField(blank=True, default='', help_text="Detailed situation narrative / context")
    description = models.TextField(blank=True, default='', help_text="Overview or summary description")

    primary_owner = models.ForeignKey(
        Role,
        related_name='owned_scenarios',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Primary role responsible for this scenario"
    )
    supporting_roles = models.ManyToManyField(
        Role,
        related_name='supporting_in_scenarios',
        blank=True,
        help_text="Roles that assist the primary owner"
    )
    workflow_route = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered list of role names in the correct workflow route"
    )
    ideal_roles = models.JSONField(
        default=list,
        blank=True,
        help_text="Names of optimal roles for solving or owning this task"
    )
    supporting_teams = models.JSONField(
        default=list,
        blank=True,
        help_text="Supporting functional teams / roles"
    )
    communication_flow = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered communication flow across roles / teams"
    )
    explanation = models.TextField(
        blank=True,
        default='',
        help_text="Pedagogical explanation of ownership, routing, or collaboration mechanics"
    )

    incident_type = models.CharField(max_length=100, blank=True, help_text="e.g. Phishing Attack, Vulnerability, Network Outage")
    urgency_level = models.CharField(
        max_length=20,
        choices=(('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High'), ('Critical', 'Critical')),
        default='Medium'
    )
    context_data = models.JSONField(default=dict, blank=True, help_text="Extra ticket details, logs, or metrics")
    target_role = models.ForeignKey(
        Role,
        related_name='targeted_scenarios',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="If this scenario is specific to a role. Null means general."
    )
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['stage', 'question_number', 'order', 'id']

    def save(self, *args, **kwargs):
        if not self.order:
            self.order = self.question_number
        if not self.situation and self.description:
            self.situation = self.description
        if not self.description and self.situation:
            self.description = self.situation
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[Stage {self.stage} Q{self.question_number}] {self.title} ({self.workplace.name})"


class ScenarioOption(models.Model):
    scenario = models.ForeignKey(Scenario, related_name='options', on_delete=models.CASCADE)
    option_text = models.CharField(max_length=500)
    recommended_role = models.ForeignKey(
        Role,
        related_name='recommended_in_options',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    route_sequence = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional workflow sequence for routing/collaboration choices"
    )
    is_optimal = models.BooleanField(default=False)
    score_ownership = models.IntegerField(default=0)
    score_delegation = models.IntegerField(default=0)
    score_collaboration = models.IntegerField(default=0)
    score_workflow = models.IntegerField(default=0)
    feedback_rationale = models.TextField(help_text="Explanation shown to the student upon completing the stage.")
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        status = "OPTIMAL" if self.is_optimal else "SUBOPTIMAL"
        return f"[{status}] {self.option_text[:60]}"


class SimulationSession(models.Model):
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='simulation_sessions',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    student_name = models.CharField(max_length=120)
    workplace = models.ForeignKey(Workplace, on_delete=models.CASCADE)
    selected_role = models.ForeignKey(Role, on_delete=models.CASCADE)
    current_stage = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')

    score_ownership = models.IntegerField(default=0)
    score_delegation = models.IntegerField(default=0)
    score_collaboration = models.IntegerField(default=0)
    score_workflow = models.IntegerField(default=0)
    total_score = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def update_totals(self):
        responses = self.responses.select_related('selected_option').all()
        o = sum(r.selected_option.score_ownership for r in responses if r.selected_option)
        d = sum(r.selected_option.score_delegation for r in responses if r.selected_option)
        c = sum(r.selected_option.score_collaboration for r in responses if r.selected_option)
        w = sum(r.selected_option.score_workflow for r in responses if r.selected_option)
        self.score_ownership = max(0, o)
        self.score_delegation = max(0, d)
        self.score_collaboration = max(0, c)
        self.score_workflow = max(0, w)
        self.total_score = self.score_ownership + self.score_delegation + self.score_collaboration + self.score_workflow
        self.save(update_fields=[
            'score_ownership', 'score_delegation', 'score_collaboration',
            'score_workflow', 'total_score', 'updated_at'
        ])

    def __str__(self):
        return f"{self.student_name} - {self.selected_role.name} ({self.workplace.name})"


class StageResponse(models.Model):
    session = models.ForeignKey(SimulationSession, related_name='responses', on_delete=models.CASCADE)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(ScenarioOption, on_delete=models.CASCADE)
    stage = models.PositiveSmallIntegerField()
    student_notes = models.TextField(blank=True, help_text="Optional student reasoning")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'scenario')
        ordering = ['stage', 'created_at']

    def __str__(self):
        return f"Session {self.session.id} - Stage {self.stage} - Scenario {self.scenario_id}"


class StudentReflection(models.Model):
    session = models.OneToOneField(SimulationSession, related_name='reflection', on_delete=models.CASCADE)
    ownership_reflection = models.TextField(blank=True, default='', help_text="Which role or responsibility became clearer to you during the simulation?")
    collaboration_reflection = models.TextField(blank=True, default='', help_text="What did you learn about how different teams depend on each other?")
    improvement_reflection = models.TextField(blank=True, default='', help_text="Which skill would you like to improve further?")
    # Legacy fields preserved for backward compatibility
    ownership_takeaway = models.TextField(blank=True, default='', help_text="What did you learn about ownership?")
    delegation_takeaway = models.TextField(blank=True, default='', help_text="What did you learn about task routing and delegation?")
    collaboration_takeaway = models.TextField(blank=True, default='', help_text="What did you learn about cross-functional collaboration?")
    workflow_takeaway = models.TextField(blank=True, default='', help_text="How did your perspective on end-to-end workflow change?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reflection for {self.session.student_name} ({self.session.id})"

