from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Agency(TimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Structure(TimeStampedModel):
    agency = models.ForeignKey(Agency, related_name="structures", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    head_of_structure = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Service(TimeStampedModel):
    structure = models.ForeignKey(Structure, related_name="services", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    service_head = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class JobFamily(TimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    performance_weight = models.PositiveSmallIntegerField(default=50)
    competency_weight = models.PositiveSmallIntegerField(default=50)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class JobPosition(TimeStampedModel):
    class Category(models.TextChoices):
        EXECUTION = "execution", "Execution"
        SUPPORT = "support", "Support"
        MANAGEMENT = "management", "Management"
        STRATEGIC = "strategic", "Strategic"

    title = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    job_family = models.ForeignKey(
        JobFamily,
        related_name="positions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.EXECUTION)
    hierarchy_level = models.PositiveSmallIntegerField(default=1)
    is_quantitative = models.BooleanField(default=True)
    is_managerial = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("hierarchy_level", "title")

    def __str__(self):
        return self.title


class EvaluationProfile(TimeStampedModel):
    name = models.CharField(max_length=255)
    job_family = models.ForeignKey(
        JobFamily,
        related_name="evaluation_profiles",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    description = models.TextField(blank=True)
    target_category = models.CharField(
        max_length=20,
        choices=JobPosition.Category.choices,
        default=JobPosition.Category.EXECUTION,
    )
    quantitative_weight = models.PositiveSmallIntegerField(default=40)
    qualitative_weight = models.PositiveSmallIntegerField(default=30)
    attendance_weight = models.PositiveSmallIntegerField(default=15)
    self_weight = models.PositiveSmallIntegerField(default=10)
    managerial_weight = models.PositiveSmallIntegerField(default=5)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Agent(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    service = models.ForeignKey(Service, related_name="agents", on_delete=models.CASCADE)
    user = models.OneToOneField(
        "accounts.User",
        related_name="agent_profile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    manager = models.ForeignKey(
        "self",
        related_name="team_members",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    job_position = models.ForeignKey(
        JobPosition,
        related_name="agents",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    evaluation_profile = models.ForeignKey(
        EvaluationProfile,
        related_name="agents",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    job_family = models.ForeignKey(
        JobFamily,
        related_name="agents",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    full_name = models.CharField(max_length=255)
    matricule = models.CharField(max_length=100, unique=True)
    position = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ("full_name",)

    def save(self, *args, **kwargs):
        if self.job_position and not self.job_family and self.job_position.job_family_id:
            self.job_family = self.job_position.job_family
        if self.evaluation_profile and not self.job_family and self.evaluation_profile.job_family_id:
            self.job_family = self.evaluation_profile.job_family
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} - {self.matricule}"


class AttendanceRecord(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        SICK_LEAVE = "sick_leave", "Sick leave"

    agent = models.ForeignKey(Agent, related_name="attendance_records", on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    minutes_late = models.PositiveIntegerField(default=0)
    remark = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        related_name="recorded_attendance",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-date", "-created_at")
        unique_together = ("agent", "date")

    def __str__(self):
        return f"{self.agent.full_name} - {self.date} - {self.status}"


class LeaveRecord(TimeStampedModel):
    class LeaveType(models.TextChoices):
        SICK = "sick", "Sick"
        PAID = "paid", "Paid"
        UNPAID = "unpaid", "Unpaid"
        OTHER = "other", "Other"

    agent = models.ForeignKey(Agent, related_name="leave_records", on_delete=models.CASCADE)
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices, default=LeaveType.SICK)
    start_date = models.DateField()
    end_date = models.DateField()
    justified = models.BooleanField(default=True)
    medical_certificate = models.BooleanField(default=False)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ("-start_date", "-created_at")

    def __str__(self):
        return f"{self.agent.full_name} - {self.leave_type}"


class DailyFollowUp(TimeStampedModel):
    agent = models.ForeignKey(Agent, related_name="daily_followups", on_delete=models.CASCADE)
    manager = models.ForeignKey(
        "accounts.User",
        related_name="daily_followups",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    date = models.DateField()
    presence_status = models.CharField(
        max_length=20,
        choices=AttendanceRecord.Status.choices,
        default=AttendanceRecord.Status.PRESENT,
    )
    quality_note = models.PositiveSmallIntegerField(default=3)
    discipline_note = models.PositiveSmallIntegerField(default=3)
    remark = models.TextField(blank=True)

    class Meta:
        ordering = ("-date", "-created_at")
        unique_together = ("agent", "date")

    def __str__(self):
        return f"{self.agent.full_name} - {self.date}"
