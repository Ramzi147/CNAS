from django.contrib import admin

from apps.organization.models import (
    Agency,
    Structure,
    Service,
    JobFamily,
    JobPosition,
    EvaluationProfile,
    Agent,
    AttendanceRecord,
    LeaveRecord,
    DailyFollowUp,
)


admin.site.register(Agency)
admin.site.register(Structure)
admin.site.register(Service)
admin.site.register(JobFamily)
admin.site.register(JobPosition)
admin.site.register(EvaluationProfile)
admin.site.register(Agent)
admin.site.register(AttendanceRecord)
admin.site.register(LeaveRecord)
admin.site.register(DailyFollowUp)
