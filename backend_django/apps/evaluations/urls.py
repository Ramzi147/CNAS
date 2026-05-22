"""Vue d'ensemble du fichier : urls.py
Role : declaration des routes backend pour exposer les endpoints du module.
Module : module evaluations.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.evaluations.views import (
    EvaluationCampaignViewSet,
    CampaignAssignmentViewSet,
    EvaluationViewSet,
    EvaluationCriterionViewSet,
    EvaluationFormVersionViewSet,
    EvaluationScoreViewSet,
    SelfEvaluationViewSet,
    SelfEvaluationAnswerViewSet,
    RankingSnapshotViewSet,
    AuditEventViewSet,
    ProcessingRegisterViewSet,
    ComplianceRequestViewSet,
    ReportViewSet,
    NotificationViewSet,
)


router = DefaultRouter(trailing_slash=False)
router.register("evaluation-campaigns", EvaluationCampaignViewSet, basename="evaluation-campaigns")
router.register("campaign-assignments", CampaignAssignmentViewSet, basename="campaign-assignments")
router.register("evaluations", EvaluationViewSet, basename="evaluations")
router.register("evaluation-criteria", EvaluationCriterionViewSet, basename="evaluation-criteria")
router.register("evaluation-form-versions", EvaluationFormVersionViewSet, basename="evaluation-form-versions")
router.register("evaluation-scores", EvaluationScoreViewSet, basename="evaluation-scores")
router.register("self-evaluations", SelfEvaluationViewSet, basename="self-evaluations")
router.register("self-evaluation-answers", SelfEvaluationAnswerViewSet, basename="self-evaluation-answers")
router.register("ranking-snapshots", RankingSnapshotViewSet, basename="ranking-snapshots")
router.register("audit-events", AuditEventViewSet, basename="audit-events")
router.register("processing-registers", ProcessingRegisterViewSet, basename="processing-registers")
router.register("compliance-requests", ComplianceRequestViewSet, basename="compliance-requests")
router.register("reports", ReportViewSet, basename="reports")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("", include(router.urls)),
]


