"""Vue d'ensemble du fichier : urls.py
Role : declaration des routes backend pour exposer les endpoints du module.
Module : module organisation.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.organization.views import (
    AgencyViewSet,
    StructureViewSet,
    ServiceViewSet,
    JobFamilyViewSet,
    JobPositionViewSet,
    EvaluationProfileViewSet,
    AgentViewSet,
    AttendanceRecordViewSet,
    LeaveRecordViewSet,
    DailyFollowUpViewSet,
)


router = DefaultRouter(trailing_slash=False)
router.register("agencies", AgencyViewSet, basename="agencies")
router.register("structures", StructureViewSet, basename="structures")
router.register("services", ServiceViewSet, basename="services")
router.register("job-families", JobFamilyViewSet, basename="job-families")
router.register("job-positions", JobPositionViewSet, basename="job-positions")
router.register("evaluation-profiles", EvaluationProfileViewSet, basename="evaluation-profiles")
router.register("agents", AgentViewSet, basename="agents")
router.register("attendance-records", AttendanceRecordViewSet, basename="attendance-records")
router.register("leave-records", LeaveRecordViewSet, basename="leave-records")
router.register("daily-followups", DailyFollowUpViewSet, basename="daily-followups")

urlpatterns = [
    path("", include(router.urls)),
]


