from django.contrib import admin

from apps.evaluations.models import (
    EvaluationCampaign,
    CampaignAssignment,
    Evaluation,
    EvaluationCriterion,
    EvaluationFormVersion,
    EvaluationScore,
    SelfEvaluation,
    SelfEvaluationAnswer,
    RankingSnapshot,
    AuditEvent,
    ProcessingRegister,
    ComplianceRequest,
    Report,
    Notification,
)

admin.site.register(EvaluationCampaign)
admin.site.register(CampaignAssignment)
admin.site.register(Evaluation)
admin.site.register(EvaluationCriterion)
admin.site.register(EvaluationFormVersion)
admin.site.register(EvaluationScore)
admin.site.register(SelfEvaluation)
admin.site.register(SelfEvaluationAnswer)
admin.site.register(RankingSnapshot)
admin.site.register(AuditEvent)
admin.site.register(ProcessingRegister)
admin.site.register(ComplianceRequest)
admin.site.register(Report)
admin.site.register(Notification)
