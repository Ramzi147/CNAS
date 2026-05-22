"""Vue d'ensemble du fichier : admin.py
Role : configuration d'administration Django pour manipuler les donnees du module.
Module : module organisation.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

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


