from django.conf import settings
from django.db import models

from apps.organization.models import Agent, EvaluationProfile


class EvaluationCampaign(models.Model):
    class PeriodType(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        SEMESTER = "semester", "Semester"
        YEARLY = "yearly", "Yearly"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    name = models.CharField(max_length=255)
    period_type = models.CharField(max_length=20, choices=PeriodType.choices, default=PeriodType.QUARTERLY)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-start_date", "-created_at")

    def __str__(self):
        return self.name


class CampaignAssignment(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    campaign = models.ForeignKey(EvaluationCampaign, related_name="assignments", on_delete=models.CASCADE)
    employee = models.ForeignKey(Agent, related_name="campaign_assignments", on_delete=models.CASCADE)
    manager = models.ForeignKey(
        Agent,
        related_name="managed_campaign_assignments",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    evaluation = models.OneToOneField(
        "Evaluation",
        related_name="assignment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    due_date = models.DateField(null=True, blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_campaign_assignments",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("campaign__start_date", "employee__full_name")
        unique_together = ("campaign", "employee")

    def __str__(self):
        return f"{self.campaign.name} - {self.employee.full_name}"


class Evaluation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In progress"
        SUBMITTED = "submitted", "Submitted"
        MANAGER_VALIDATED = "manager_validated", "Manager validated"
        HR_VALIDATED = "hr_validated", "HR validated"
        REJECTED = "rejected", "Rejected"

    agent = models.ForeignKey(Agent, related_name="evaluations", on_delete=models.CASCADE)
    campaign = models.ForeignKey(
        EvaluationCampaign,
        related_name="evaluations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="evaluations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    period = models.CharField(max_length=50)
    score = models.PositiveIntegerField(default=0)
    performance_score = models.PositiveIntegerField(default=0)
    competency_score = models.PositiveIntegerField(default=0)
    quantitative_score = models.PositiveIntegerField(default=0)
    qualitative_score = models.PositiveIntegerField(default=0)
    attendance_score = models.PositiveIntegerField(default=0)
    self_score = models.PositiveIntegerField(default=0)
    managerial_score = models.PositiveIntegerField(default=0)
    final_score = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    evaluator_name = models.CharField(max_length=255, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    CATEGORY_FIELD_MAP = {
        "quantitative": "quantitative_score",
        "qualitative": "qualitative_score",
        "attendance": "attendance_score",
        "self": "self_score",
        "managerial": "managerial_score",
    }

    @property
    def manager_validation_complete(self):
        return self.status in {self.Status.MANAGER_VALIDATED, self.Status.HR_VALIDATED}

    @property
    def hr_validation_complete(self):
        return self.status == self.Status.HR_VALIDATED

    def compute_scores(self):
        criteria_scores = list(self.criteria_scores.select_related("criterion").all()) if self.pk else []
        if criteria_scores:
            category_totals = {key: {"weighted": 0, "weights": 0} for key in self.CATEGORY_FIELD_MAP}
            global_weighted = 0
            global_weights = 0

            for criterion_score in criteria_scores:
                criterion = criterion_score.criterion
                weight = criterion.weight or 0
                raw_score = float(criterion_score.score or 0)
                max_score = float(criterion.max_score or 100)
                score = (raw_score / max_score) * 100 if max_score > 0 else raw_score
                category = criterion.category

                if category in category_totals and weight > 0:
                    category_totals[category]["weighted"] += score * weight
                    category_totals[category]["weights"] += weight

                if weight > 0:
                    global_weighted += score * weight
                    global_weights += weight

            for category, field_name in self.CATEGORY_FIELD_MAP.items():
                weights = category_totals[category]["weights"]
                if weights:
                    setattr(self, field_name, round(category_totals[category]["weighted"] / weights))

            if global_weights:
                self.score = round(global_weighted / global_weights)

        profile = self.agent.evaluation_profile
        family = self.agent.job_family or getattr(self.agent.job_position, "job_family", None)

        if profile:
            performance_weight_total = profile.quantitative_weight + profile.attendance_weight
            competency_weight_total = profile.qualitative_weight + profile.self_weight + profile.managerial_weight

            if performance_weight_total:
                weighted_performance = (
                    (self.quantitative_score * profile.quantitative_weight)
                    + (self.attendance_score * profile.attendance_weight)
                ) / performance_weight_total
            else:
                weighted_performance = 0

            if competency_weight_total:
                weighted_competency = (
                    (self.qualitative_score * profile.qualitative_weight)
                    + (self.self_score * profile.self_weight)
                    + (self.managerial_score * profile.managerial_weight)
                ) / competency_weight_total
            else:
                weighted_competency = 0
        else:
            weighted_performance = (self.quantitative_score + self.attendance_score) / 2
            weighted_competency = (self.qualitative_score + self.self_score + self.managerial_score) / 3

        self.performance_score = round(weighted_performance)
        self.competency_score = round(weighted_competency)

        family_performance_weight = getattr(family, "performance_weight", 50)
        family_competency_weight = getattr(family, "competency_weight", 50)
        family_weight_total = family_performance_weight + family_competency_weight

        if family_weight_total:
            self.final_score = round(
                (
                    (self.performance_score * family_performance_weight)
                    + (self.competency_score * family_competency_weight)
                )
                / family_weight_total
            )
        else:
            self.final_score = round((self.performance_score + self.competency_score) / 2)

    def save(self, *args, **kwargs):
        self.compute_scores()
        self.score = self.final_score or self.score
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.agent.full_name} - {self.period}"


class EvaluationCriterion(models.Model):
    class Category(models.TextChoices):
        QUANTITATIVE = "quantitative", "Quantitative"
        QUALITATIVE = "qualitative", "Qualitative"
        ATTENDANCE = "attendance", "Attendance"
        SELF = "self", "Self"
        MANAGERIAL = "managerial", "Managerial"

    class ScoreType(models.TextChoices):
        NUMERIC = "numeric", "Numeric"
        RATING = "rating", "Rating"

    profile = models.ForeignKey(EvaluationProfile, related_name="criteria", on_delete=models.CASCADE)
    form_version = models.ForeignKey(
        "EvaluationFormVersion",
        related_name="criteria",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.QUALITATIVE)
    score_type = models.CharField(max_length=20, choices=ScoreType.choices, default=ScoreType.RATING)
    weight = models.PositiveSmallIntegerField(default=10)
    min_score = models.PositiveSmallIntegerField(default=0)
    max_score = models.PositiveSmallIntegerField(default=5)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("profile__name", "category", "name")

    def __str__(self):
        return self.name


class EvaluationFormVersion(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    profile = models.ForeignKey(EvaluationProfile, related_name="form_versions", on_delete=models.CASCADE)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    schema = models.JSONField(default=dict, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_form_versions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("profile__name", "-version")
        unique_together = ("profile", "version")

    def __str__(self):
        return f"{self.profile.name} v{self.version}"


class EvaluationScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, related_name="criteria_scores", on_delete=models.CASCADE)
    criterion = models.ForeignKey(EvaluationCriterion, related_name="scores", on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ("evaluation", "criterion")

    def __str__(self):
        return f"{self.evaluation} - {self.criterion}"


class SelfEvaluation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        REVIEWED = "reviewed", "Reviewed"
        REJECTED = "rejected", "Rejected"
        INTEGRATED = "integrated", "Integrated into evaluation process"

    evaluation = models.OneToOneField(
        Evaluation,
        related_name="self_evaluation",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    employee = models.ForeignKey(Agent, related_name="self_evaluations", on_delete=models.CASCADE)
    campaign = models.ForeignKey(
        EvaluationCampaign,
        related_name="self_evaluations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    period = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    overall_comment = models.TextField(blank=True)
    positive_points = models.TextField(blank=True)
    difficulties = models.TextField(blank=True)
    support_needs = models.TextField(blank=True)
    improvement_suggestions = models.TextField(blank=True)
    collaboration_comment = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviewed_self_evaluations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    integrated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def average_score(self):
        scored_answers = [answer.score for answer in self.answers.all() if answer.score is not None]
        if not scored_answers:
            return 0
        return round(sum(float(score) for score in scored_answers) / len(scored_answers), 2)

    def __str__(self):
        label = self.period or (self.campaign.name if self.campaign else "Sans periode")
        return f"Auto-evaluation {self.employee.full_name} - {label}"


class SelfEvaluationAnswer(models.Model):
    class AnswerType(models.TextChoices):
        RATING = "rating", "Rating"
        SELECT = "select", "Select"
        YES_NO = "yes_no", "Yes/No"
        TEXT = "text", "Text"

    self_evaluation = models.ForeignKey(SelfEvaluation, related_name="answers", on_delete=models.CASCADE)
    criterion = models.ForeignKey(
        EvaluationCriterion,
        related_name="self_answers",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    question_key = models.CharField(max_length=80)
    section_key = models.CharField(max_length=80)
    section_title = models.CharField(max_length=255)
    question_text = models.TextField()
    answer_type = models.CharField(max_length=20, choices=AnswerType.choices, default=AnswerType.RATING)
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    selected_value = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("section_key", "id")
        unique_together = ("self_evaluation", "question_key")

    def __str__(self):
        return f"{self.self_evaluation} - {self.question_key}"


class RankingSnapshot(models.Model):
    campaign = models.ForeignKey(
        EvaluationCampaign,
        related_name="ranking_snapshots",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    employee = models.ForeignKey(Agent, related_name="ranking_snapshots", on_delete=models.CASCADE)
    service_name = models.CharField(max_length=255, blank=True)
    job_family_name = models.CharField(max_length=255, blank=True)
    comparison_scope = models.CharField(max_length=255, default="Famille metier")
    rank_global = models.PositiveIntegerField(default=0)
    rank_service = models.PositiveIntegerField(default=0)
    rank_job_family = models.PositiveIntegerField(default=0)
    performance_score = models.PositiveIntegerField(default=0)
    competency_score = models.PositiveIntegerField(default=0)
    final_score = models.PositiveIntegerField(default=0)
    is_best_employee = models.BooleanField(default=False)
    is_worst_employee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("rank_global", "-created_at")

    def __str__(self):
        return f"{self.employee.full_name} - rank {self.rank_global}"


class AuditEvent(models.Model):
    action = models.CharField(max_length=80)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="audit_events",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    user_email = models.EmailField(blank=True)
    entity = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=120, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.action} - {self.entity} - {self.created_at:%Y-%m-%d %H:%M}"


class ProcessingRegister(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        UNDER_REVIEW = "under_review", "Under review"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=255)
    purpose = models.TextField()
    legal_basis = models.CharField(max_length=255)
    data_categories = models.TextField()
    recipients = models.TextField()
    retention_period = models.CharField(max_length=255)
    security_measures = models.TextField(blank=True)
    dpd_contact = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_processing_registers",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class ComplianceRequest(models.Model):
    class RequestType(models.TextChoices):
        EXPORT = "export", "Export"
        RECTIFICATION = "rectification", "Rectification"
        CONTESTATION = "contestation", "Contestation"
        CORRECTION = "correction", "Correction"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_REVIEW = "in_review", "In review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CLOSED = "closed", "Closed"

    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="compliance_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    requester_email = models.EmailField(blank=True)
    employee = models.ForeignKey(
        Agent,
        related_name="compliance_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    evaluation = models.ForeignKey(
        Evaluation,
        related_name="compliance_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    assigned_manager = models.ForeignKey(
        Agent,
        related_name="assigned_compliance_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    subject = models.CharField(max_length=255)
    reason = models.TextField()
    manager_response = models.TextField(blank=True)
    manager_reviewed_at = models.DateTimeField(null=True, blank=True)
    response = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="resolved_compliance_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.request_type} - {self.subject}"


class Report(models.Model):
    class ReportType(models.TextChoices):
        CAMPAIGN = "campaign", "Campaign"
        TEAM = "team", "Team"
        INDIVIDUAL = "individual", "Individual"
        AUDIT = "audit", "Audit"
        COMPLIANCE = "compliance", "Compliance"

    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        CSV = "csv", "CSV"
        SUMMARY = "summary", "Summary"

    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=20, choices=ReportType.choices, default=ReportType.CAMPAIGN)
    format = models.CharField(max_length=20, choices=Format.choices, default=Format.SUMMARY)
    campaign = models.ForeignKey(
        EvaluationCampaign,
        related_name="reports",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="generated_reports",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    filters = models.JSONField(default=dict, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        SUCCESS = "success", "Success"
        DANGER = "danger", "Danger"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="notifications",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    role = models.CharField(max_length=20, blank=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    link = models.CharField(max_length=255, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title
