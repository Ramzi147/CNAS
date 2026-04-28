import csv
import io

from django.db.models import Avg, Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import (
    AdminOrHRCanWrite,
    IsPrivilegedUser,
    agent_belongs_to_user_scope,
    is_admin_or_hr,
    user_agent,
)
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


def scoped_agent_queryset_for_user(user):
    queryset = Agent.objects.all()
    role = getattr(user, "role", None)
    if is_admin_or_hr(user):
        return queryset
    current_agent = user_agent(user)
    if not current_agent:
        return queryset.none()
    if role == "manager":
        return queryset.filter(manager=current_agent)
    if role in {"agent", "employee"}:
        return queryset.filter(id=current_agent.id)
    return queryset.none()


def recalculate_ranking_snapshots(campaign=None):
    evaluations = (
        Evaluation.objects.select_related(
            "campaign",
            "agent",
            "agent__service",
            "agent__job_family",
            "agent__job_position__job_family",
        )
        .filter(status=Evaluation.Status.HR_VALIDATED)
        .order_by("-final_score", "agent__full_name")
    )
    if campaign:
        evaluations = evaluations.filter(campaign=campaign)

    if campaign:
        RankingSnapshot.objects.filter(campaign=campaign).delete()
    else:
        RankingSnapshot.objects.all().delete()

    evaluations = list(evaluations)
    family_groups = {}
    service_groups = {}
    for evaluation in evaluations:
        family = evaluation.agent.job_family or getattr(evaluation.agent.job_position, "job_family", None)
        family_key = family.id if family else None
        service_key = evaluation.agent.service_id
        family_groups.setdefault(family_key, []).append(evaluation)
        service_groups.setdefault(service_key, []).append(evaluation)

    family_ranks = {}
    service_ranks = {}
    for group in family_groups.values():
        for index, evaluation in enumerate(sorted(group, key=lambda item: (-item.final_score, item.agent.full_name)), start=1):
            family_ranks[evaluation.id] = index
    for group in service_groups.values():
        for index, evaluation in enumerate(sorted(group, key=lambda item: (-item.final_score, item.agent.full_name)), start=1):
            service_ranks[evaluation.id] = index

    snapshots = []
    for global_rank, evaluation in enumerate(evaluations, start=1):
        family = evaluation.agent.job_family or getattr(evaluation.agent.job_position, "job_family", None)
        family_group = family_groups.get(family.id if family else None, [])
        rank_family = family_ranks.get(evaluation.id, global_rank)
        snapshots.append(
            RankingSnapshot(
                campaign=evaluation.campaign,
                employee=evaluation.agent,
                service_name=evaluation.agent.service.name if evaluation.agent.service_id else "",
                job_family_name=family.name if family else "",
                comparison_scope="Comparaison intra-famille metier",
                rank_global=global_rank,
                rank_service=service_ranks.get(evaluation.id, global_rank),
                rank_job_family=rank_family,
                performance_score=evaluation.performance_score,
                competency_score=evaluation.competency_score,
                final_score=evaluation.final_score,
                is_best_employee=rank_family == 1,
                is_worst_employee=rank_family == len(family_group),
            )
        )

    if snapshots:
        RankingSnapshot.objects.bulk_create(snapshots)
    return len(snapshots)
from apps.evaluations.serializers import (
    EvaluationCampaignSerializer,
    CampaignAssignmentSerializer,
    EvaluationSerializer,
    EvaluationCriterionSerializer,
    EvaluationFormVersionSerializer,
    EvaluationScoreSerializer,
    SelfEvaluationSerializer,
    SelfEvaluationAnswerSerializer,
    RankingSnapshotSerializer,
    AuditEventSerializer,
    ProcessingRegisterSerializer,
    ComplianceRequestSerializer,
    ReportSerializer,
    NotificationSerializer,
)
from apps.organization.models import Agent


SELF_EVALUATION_QUESTIONNAIRE = [
    {
        "key": "presence_organization",
        "title": "Presence et organisation",
        "questions": [
            {
                "key": "attendance",
                "text": "Comment evaluez-vous votre assiduite durant cette periode ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "working_hours_deadlines",
                "text": "Avez-vous respecte les horaires et delais attendus ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "daily_organization",
                "text": "Comment evaluez-vous votre organisation quotidienne du travail ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "presence_difficulties",
                "text": "Avez-vous rencontre des difficultes de ponctualite, disponibilite ou charge de travail ?",
                "type": "text",
                "required": False,
            },
        ],
    },
    {
        "key": "technical_contribution",
        "title": "Maitrise du poste",
        "questions": [
            {
                "key": "task_mastery",
                "text": "Comment evaluez-vous votre maitrise des taches liees a votre poste ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "tools_procedures",
                "text": "Comment evaluez-vous votre maitrise des outils, procedures ou logiciels utilises ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "autonomy",
                "text": "Dans quelle mesure etes-vous autonome dans l'execution de votre travail ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "work_quality",
                "text": "Comment evaluez-vous la qualite du travail que vous avez fourni ?",
                "type": "rating",
                "required": True,
            },
        ],
    },
    {
        "key": "behavioral_skills",
        "title": "Competences comportementales",
        "questions": [
            {
                "key": "communication_hierarchy",
                "text": "Comment evaluez-vous votre communication avec votre hierarchie ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "team_collaboration",
                "text": "Comment evaluez-vous votre collaboration avec vos collegues ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "responsibility",
                "text": "Comment evaluez-vous votre sens des responsabilites ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "rigor_professionalism",
                "text": "Comment evaluez-vous votre rigueur et votre professionnalisme ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "adaptability",
                "text": "Comment evaluez-vous votre capacite d'adaptation ?",
                "type": "rating",
                "required": True,
            },
        ],
    },
    {
        "key": "performance_objectives",
        "title": "Performance et resultats",
        "questions": [
            {
                "key": "objectives_achievement",
                "text": "Dans quelle mesure avez-vous atteint vos objectifs sur cette periode ?",
                "type": "rating",
                "required": True,
            },
            {
                "key": "main_achievements",
                "text": "Quelles sont vos principales realisations ?",
                "type": "text",
                "required": True,
            },
            {
                "key": "performance_obstacles",
                "text": "Quels obstacles ont limite votre performance ?",
                "type": "text",
                "required": False,
            },
            {
                "key": "service_contribution",
                "text": "Pensez-vous avoir contribue efficacement aux resultats de votre service ?",
                "type": "yes_no",
                "required": True,
            },
        ],
    },
    {
        "key": "improvement_support",
        "title": "Besoins et amelioration",
        "questions": [
            {
                "key": "skills_to_improve",
                "text": "Quelles competences souhaitez-vous ameliorer ?",
                "type": "text",
                "required": True,
            },
            {
                "key": "training_support",
                "text": "De quelle formation ou accompagnement auriez-vous besoin ?",
                "type": "select",
                "options": ["formation", "accompagnement", "outils", "organisation"],
                "required": False,
            },
            {
                "key": "efficiency_changes",
                "text": "Quels changements pourraient ameliorer votre efficacite au travail ?",
                "type": "text",
                "required": False,
            },
            {
                "key": "team_suggestions",
                "text": "Avez-vous des suggestions constructives pour ameliorer l'organisation ou la communication dans l'equipe ?",
                "type": "text",
                "required": False,
            },
        ],
    },
]


def client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit_event(request, action, entity, entity_id="", reason="", metadata=None):
    user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
    AuditEvent.objects.create(
        action=action,
        user=user,
        user_email=getattr(user, "email", "") or "",
        entity=entity,
        entity_id=str(entity_id or ""),
        ip_address=client_ip(request),
        reason=reason,
        metadata=metadata or {},
    )


def sync_assignment_from_evaluation(evaluation):
    assignment = getattr(evaluation, "assignment", None)
    if not assignment:
        return

    if evaluation.status == Evaluation.Status.HR_VALIDATED:
        assignment_status = CampaignAssignment.Status.COMPLETED
    elif evaluation.status in {
        Evaluation.Status.IN_PROGRESS,
        Evaluation.Status.SUBMITTED,
        Evaluation.Status.MANAGER_VALIDATED,
        Evaluation.Status.REJECTED,
    }:
        assignment_status = CampaignAssignment.Status.IN_PROGRESS
    else:
        assignment_status = CampaignAssignment.Status.ASSIGNED

    assignment.manager = evaluation.agent.manager
    assignment.status = assignment_status
    assignment.save(update_fields=["manager", "status", "updated_at"])


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.select_related("agent", "agent__job_family", "evaluator").all()
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPrivilegedUser]

    def get_queryset(self):
        queryset = (
            Evaluation.objects.select_related(
                "agent",
                "agent__job_family",
                "agent__manager",
                "agent__evaluation_profile",
                "evaluator",
                "campaign",
            )
            .prefetch_related("criteria_scores__criterion", "self_evaluation__answers")
            .all()
        )
        user = self.request.user
        role = getattr(user, "role", None)

        if role in {"superadmin", "admin", "hr"}:
            return queryset

        agent_profile = Agent.objects.filter(user=user).first()
        if role == "manager":
            if not agent_profile:
                return queryset.none()
            return queryset.filter(agent__manager=agent_profile)

        if role in {"agent", "employee"}:
            if not agent_profile:
                return queryset.none()
            return queryset.filter(agent=agent_profile)

        return queryset.none()

    def _assert_transition_allowed(self, current_status, next_status):
        role = getattr(self.request.user, "role", None)
        allowed = {
            "superadmin": {
                "draft": {"draft", "in_progress", "submitted", "manager_validated", "hr_validated", "rejected"},
                "in_progress": {"in_progress", "submitted", "manager_validated", "hr_validated", "rejected"},
                "submitted": {"submitted", "manager_validated", "hr_validated", "rejected"},
                "manager_validated": {"manager_validated", "hr_validated", "rejected"},
                "hr_validated": {"hr_validated"},
                "rejected": {"rejected", "draft", "in_progress", "submitted"},
            },
            "admin": {
                "draft": {"draft", "in_progress", "submitted", "manager_validated", "hr_validated", "rejected"},
                "in_progress": {"in_progress", "submitted", "manager_validated", "hr_validated", "rejected"},
                "submitted": {"submitted", "manager_validated", "hr_validated", "rejected"},
                "manager_validated": {"manager_validated", "hr_validated", "rejected"},
                "hr_validated": {"hr_validated"},
                "rejected": {"rejected", "draft", "in_progress", "submitted"},
            },
            "hr": {
                "submitted": {"submitted", "manager_validated", "hr_validated", "rejected"},
                "manager_validated": {"manager_validated", "hr_validated", "rejected"},
                "rejected": {"rejected", "draft", "in_progress"},
                "hr_validated": {"hr_validated"},
            },
            "manager": {
                "draft": {"draft", "in_progress", "submitted"},
                "in_progress": {"in_progress", "submitted"},
                "rejected": {"rejected", "draft", "in_progress", "submitted"},
                "submitted": {"submitted", "manager_validated", "rejected"},
                "manager_validated": {"manager_validated"},
            },
            "agent": {
                "draft": {"draft"},
                "in_progress": {"in_progress"},
                "rejected": {"rejected"},
                "submitted": {"submitted"},
                "manager_validated": {"manager_validated"},
                "hr_validated": {"hr_validated"},
            },
        }

        role_rules = allowed.get(role, {})
        allowed_targets = role_rules.get(current_status, {current_status})
        if next_status not in allowed_targets:
            raise ValidationError(
                {"status": "Transition de workflow non autorisee pour votre role."}
            )

    def perform_create(self, serializer):
        user = self.request.user
        role = getattr(user, "role", None)
        agent_id = serializer.validated_data["agent"].id

        if role == "manager":
            manager_agent = Agent.objects.filter(user=user).first()
            if not manager_agent or not Agent.objects.filter(id=agent_id, manager=manager_agent).exists():
                raise PermissionDenied("Vous ne pouvez evaluer que les employes rattaches a votre perimetre.")
            if serializer.validated_data.get("status") not in {
                Evaluation.Status.DRAFT,
                Evaluation.Status.IN_PROGRESS,
                Evaluation.Status.SUBMITTED,
            }:
                raise ValidationError({"status": "Un manager doit creer une evaluation en brouillon, en cours ou soumise."})
        elif role in {"agent", "employee"}:
            raise PermissionDenied("La creation d'evaluation est reservee au management et a la DRH.")

        serializer.save(evaluator=user, evaluator_name=user.full_name)
        sync_assignment_from_evaluation(serializer.instance)

    def perform_update(self, serializer):
        current_status = serializer.instance.status
        next_status = serializer.validated_data.get("status", current_status)
        self._assert_transition_allowed(current_status, next_status)

        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"agent", "employee"}:
            raise PermissionDenied("Un employe ne peut pas modifier directement une evaluation hierarchique.")

        if role == "manager":
            manager_agent = Agent.objects.filter(user=user).first()
            if not manager_agent or serializer.instance.agent.manager_id != manager_agent.id:
                raise PermissionDenied("Vous ne pouvez modifier que les evaluations de votre equipe.")

        serializer.save(evaluator=user, evaluator_name=user.full_name)
        sync_assignment_from_evaluation(serializer.instance)

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({"success": True, "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        write_audit_event(
            request,
            action="creation",
            entity="evaluation",
            entity_id=serializer.data.get("id"),
            reason="Creation d'une evaluation",
            metadata={"status": serializer.data.get("status"), "agentId": serializer.data.get("agentId")},
        )
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        write_audit_event(
            request,
            action="modification",
            entity="evaluation",
            entity_id=serializer.data.get("id"),
            reason="Mise a jour d'une evaluation",
            metadata={"status": serializer.data.get("status"), "finalScore": serializer.data.get("finalScore")},
        )
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        if not is_admin_or_hr(request.user):
            raise PermissionDenied("La suppression d'une evaluation est reservee a l'administration et a la DRH.")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        event_id = instance.id
        self.perform_destroy(instance)
        write_audit_event(
            request,
            action="suppression",
            entity="evaluation",
            entity_id=event_id,
            reason="Suppression d'une evaluation",
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="draft")
    def save_draft(self, request, pk=None):
        instance = self.get_object()
        payload = dict(request.data)
        payload["status"] = Evaluation.Status.IN_PROGRESS if instance.status == Evaluation.Status.IN_PROGRESS else Evaluation.Status.DRAFT
        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        write_audit_event(
            request,
            action="brouillon",
            entity="evaluation",
            entity_id=serializer.data.get("id"),
            reason="Enregistrement du questionnaire en brouillon",
            metadata={"finalScore": serializer.data.get("finalScore")},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        instance = self.get_object()
        payload = dict(request.data)
        payload["status"] = Evaluation.Status.SUBMITTED
        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        write_audit_event(
            request,
            action="soumission",
            entity="evaluation",
            entity_id=serializer.data.get("id"),
            reason="Soumission du questionnaire pour validation",
            metadata={"finalScore": serializer.data.get("finalScore")},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="validate")
    def validate_workflow(self, request, pk=None):
        instance = self.get_object()
        payload = dict(request.data)
        approved = bool(payload.pop("approved", True))
        feedback = payload.pop("feedback", "")
        role = getattr(request.user, "role", None)

        if payload:
            serializer = self.get_serializer(instance, data=payload, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            instance = serializer.instance

        if approved and role == "manager":
            next_status = Evaluation.Status.MANAGER_VALIDATED
            validation_label = "Validation manager"
        elif approved:
            next_status = Evaluation.Status.HR_VALIDATED
            validation_label = "Validation RH"
        else:
            next_status = Evaluation.Status.REJECTED
            validation_label = "Rejet manager" if role == "manager" else "Rejet RH"
        self._assert_transition_allowed(instance.status, next_status)
        if feedback:
            instance.comments = f"{instance.comments}\n\n{validation_label}: {feedback}".strip()
        instance.status = next_status
        instance.evaluator = request.user
        instance.evaluator_name = request.user.full_name
        instance.save()
        sync_assignment_from_evaluation(instance)
        instance.refresh_from_db()
        if next_status == Evaluation.Status.HR_VALIDATED:
            recalculate_ranking_snapshots(instance.campaign)
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="validation" if approved else "rejet",
            entity="evaluation",
            entity_id=serializer.data.get("id"),
            reason=feedback or validation_label,
            metadata={"status": serializer.data.get("status"), "finalScore": serializer.data.get("finalScore")},
        )
        return Response({"success": True, "data": serializer.data})


class BaseSuccessModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsPrivilegedUser]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({"success": True, "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        self.perform_destroy(instance)
        return Response({"success": True, "data": data})


class EvaluationCampaignViewSet(BaseSuccessModelViewSet):
    queryset = EvaluationCampaign.objects.all()
    serializer_class = EvaluationCampaignSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = EvaluationCampaign.objects.all()
        user = self.request.user
        if is_admin_or_hr(user):
            return queryset
        scoped_agents = scoped_agent_queryset_for_user(user)
        return queryset.filter(
            Q(assignments__employee__in=scoped_agents)
            | Q(assignments__manager__in=scoped_agents)
            | Q(evaluations__agent__in=scoped_agents)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save()
        write_audit_event(
            self.request,
            action="creation",
            entity="campaign",
            entity_id=serializer.instance.id,
            reason="Creation d'une campagne d'evaluation",
        )

    @action(detail=True, methods=["post"], url_path="open")
    def open_campaign(self, request, pk=None):
        instance = self.get_object()
        instance.status = EvaluationCampaign.Status.OPEN
        instance.save(update_fields=["status", "updated_at"])
        write_audit_event(request, "ouverture", "campaign", instance.id, "Ouverture de campagne")
        return Response({"success": True, "data": self.get_serializer(instance).data})

    @action(detail=True, methods=["post"], url_path="close")
    def close_campaign(self, request, pk=None):
        instance = self.get_object()
        instance.status = EvaluationCampaign.Status.CLOSED
        instance.save(update_fields=["status", "updated_at"])
        write_audit_event(request, "cloture", "campaign", instance.id, "Cloture de campagne")
        return Response({"success": True, "data": self.get_serializer(instance).data})

    @action(detail=True, methods=["post"], url_path="assign")
    def assign_population(self, request, pk=None):
        campaign = self.get_object()
        agent_ids = request.data.get("agentIds") or request.data.get("employeeIds") or []
        if not isinstance(agent_ids, list):
            raise ValidationError({"agentIds": "La population doit etre une liste d'agents."})
        if not agent_ids:
            raise ValidationError({"agentIds": "Selectionnez au moins un employe a affecter."})
        agents = Agent.objects.select_related("manager").filter(id__in=agent_ids)
        if not agents.exists():
            raise ValidationError({"agentIds": "Aucun employe correspondant a la selection n'a ete trouve."})
        created = 0
        for agent in agents:
            manager = agent.manager
            assignment, was_created = CampaignAssignment.objects.update_or_create(
                campaign=campaign,
                employee=agent,
                defaults={
                    "manager": manager,
                    "status": CampaignAssignment.Status.ASSIGNED,
                    "due_date": campaign.end_date,
                    "assigned_by": request.user,
                },
            )
            evaluation, _ = Evaluation.objects.get_or_create(
                campaign=campaign,
                agent=agent,
                defaults={
                    "period": campaign.name,
                    "status": Evaluation.Status.DRAFT,
                    "evaluator": manager.user if manager and manager.user else request.user,
                    "evaluator_name": (manager.full_name if manager else request.user.full_name),
                    "comments": "Evaluation affectee depuis la campagne.",
                },
            )
            assignment.evaluation = evaluation
            assignment.save(update_fields=["evaluation", "updated_at"])
            created += 1 if was_created else 0
        write_audit_event(
            request,
            "affectation",
            "campaign",
            campaign.id,
            f"Affectation de {agents.count()} employes aux responsables",
            {"created": created, "total": agents.count()},
        )
        serializer = CampaignAssignmentSerializer(
            CampaignAssignment.objects.filter(campaign=campaign).select_related("campaign", "employee", "manager", "evaluation"),
            many=True,
        )
        return Response({"success": True, "data": serializer.data})


class CampaignAssignmentViewSet(BaseSuccessModelViewSet):
    serializer_class = CampaignAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = CampaignAssignment.objects.select_related(
            "campaign",
            "employee",
            "manager",
            "evaluation",
            "assigned_by",
        ).all()
        user = self.request.user
        if not is_admin_or_hr(user):
            scoped_agents = scoped_agent_queryset_for_user(user)
            queryset = queryset.filter(Q(employee__in=scoped_agents) | Q(manager__in=scoped_agents))
        campaign_id = self.request.query_params.get("campaignId")
        manager_id = self.request.query_params.get("managerId")
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        if manager_id:
            queryset = queryset.filter(manager_id=manager_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class EvaluationCriterionViewSet(BaseSuccessModelViewSet):
    serializer_class = EvaluationCriterionSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = EvaluationCriterion.objects.select_related("profile").all()
        user = self.request.user
        include_inactive = self.request.query_params.get("includeInactive") in {"1", "true", "True"}
        if not include_inactive or not is_admin_or_hr(user):
            queryset = queryset.filter(is_active=True)
        profile_id = self.request.query_params.get("profileId")
        if profile_id:
            queryset = queryset.filter(profile_id=profile_id)
        if not is_admin_or_hr(user):
            scoped_profile_ids = scoped_agent_queryset_for_user(user).values_list("evaluation_profile_id", flat=True)
            queryset = queryset.filter(profile_id__in=scoped_profile_ids)
        return queryset


class EvaluationFormVersionViewSet(BaseSuccessModelViewSet):
    serializer_class = EvaluationFormVersionSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = EvaluationFormVersion.objects.select_related("profile", "created_by").all()
        profile_id = self.request.query_params.get("profileId")
        status_filter = self.request.query_params.get("status")
        if profile_id:
            queryset = queryset.filter(profile_id=profile_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        if serializer.validated_data.get("status") == EvaluationFormVersion.Status.ACTIVE:
            raise ValidationError({"status": "Creez la version en brouillon puis utilisez l'action d'activation."})
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status == EvaluationFormVersion.Status.ACTIVE:
            raise ValidationError(
                {"status": "Une version active ne peut pas etre modifiee directement. Creez une nouvelle version."}
            )
        if serializer.validated_data.get("status") == EvaluationFormVersion.Status.ACTIVE:
            raise ValidationError({"status": "Utilisez l'action d'activation pour activer une version."})
        serializer.save()

    def _extract_criteria(self, schema):
        if isinstance(schema, list):
            source = schema
        elif isinstance(schema, dict):
            source = []
            for key in ("criteria", "criteres", "items", "questions"):
                value = schema.get(key)
                if isinstance(value, list):
                    source = value
                    break
            if not source and isinstance(schema.get("sections"), list):
                for section in schema["sections"]:
                    if not isinstance(section, dict):
                        continue
                    for key in ("criteria", "questions", "items"):
                        value = section.get(key)
                        if isinstance(value, list):
                            source.extend(value)
        else:
            source = []

        criteria = []
        allowed_categories = {choice[0] for choice in EvaluationCriterion.Category.choices}
        allowed_score_types = {choice[0] for choice in EvaluationCriterion.ScoreType.choices}

        for index, item in enumerate(source, start=1):
            if not isinstance(item, dict):
                continue
            name = (
                item.get("name")
                or item.get("label")
                or item.get("title")
                or item.get("questionText")
                or ""
            )
            name = str(name).strip()
            if not name:
                continue

            try:
                weight = float(item.get("weight", item.get("poids", item.get("percentage", 0))) or 0)
            except (TypeError, ValueError):
                weight = 0

            category = str(item.get("category") or item.get("type") or EvaluationCriterion.Category.QUALITATIVE)
            if category not in allowed_categories:
                category = EvaluationCriterion.Category.QUALITATIVE

            score_type = str(item.get("scoreType") or item.get("score_type") or EvaluationCriterion.ScoreType.RATING)
            if score_type not in allowed_score_types:
                score_type = EvaluationCriterion.ScoreType.RATING

            criteria.append(
                {
                    "name": name,
                    "description": str(item.get("description", "")),
                    "category": category,
                    "score_type": score_type,
                    "weight": int(round(weight)),
                    "min_score": int(item.get("minScore", item.get("min_score", 0)) or 0),
                    "max_score": int(item.get("maxScore", item.get("max_score", 5)) or 5),
                    "is_required": bool(item.get("isRequired", item.get("is_required", True))),
                    "position": index,
                }
            )
        return criteria

    def _validate_activatable(self, instance):
        criteria = self._extract_criteria(instance.schema)
        if not criteria:
            raise ValidationError({"schema": "La version doit contenir au moins un critere."})
        total_weight = sum(item["weight"] for item in criteria)
        if total_weight != 100:
            raise ValidationError(
                {"schema": f"Activation bloquee : la somme des poids est {total_weight}%. Elle doit etre egale a 100%."}
            )
        return criteria

    def _sync_profile_criteria(self, instance, criteria):
        EvaluationCriterion.objects.filter(profile=instance.profile, is_active=True).update(is_active=False)
        for item in criteria:
            EvaluationCriterion.objects.update_or_create(
                profile=instance.profile,
                form_version=instance,
                name=item["name"],
                defaults={
                    "description": item["description"],
                    "category": item["category"],
                    "score_type": item["score_type"],
                    "weight": item["weight"],
                    "min_score": item["min_score"],
                    "max_score": item["max_score"],
                    "is_required": item["is_required"],
                    "is_active": True,
                },
            )

    def _activate_instance(self, instance):
        criteria = self._validate_activatable(instance)
        EvaluationFormVersion.objects.filter(
            profile=instance.profile,
            status=EvaluationFormVersion.Status.ACTIVE,
        ).exclude(id=instance.id).update(
            status=EvaluationFormVersion.Status.ARCHIVED,
            archived_at=timezone.now(),
        )
        self._sync_profile_criteria(instance, criteria)
        instance.status = EvaluationFormVersion.Status.ACTIVE
        instance.activated_at = timezone.now()
        instance.archived_at = None
        instance.save(update_fields=["status", "activated_at", "archived_at", "updated_at"])

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        instance = self.get_object()
        self._activate_instance(instance)
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="activation",
            entity="evaluation_form_version",
            entity_id=instance.id,
            reason=f"Activation du formulaire {instance.profile.name} v{instance.version}",
            metadata={"profileId": instance.profile_id, "version": instance.version},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        instance = self.get_object()
        if instance.status == EvaluationFormVersion.Status.ACTIVE:
            EvaluationCriterion.objects.filter(form_version=instance).update(is_active=False)
        instance.status = EvaluationFormVersion.Status.ARCHIVED
        instance.archived_at = timezone.now()
        instance.save()
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="archivage",
            entity="evaluation_form_version",
            entity_id=instance.id,
            reason=f"Archivage du formulaire {instance.profile.name} v{instance.version}",
            metadata={"profileId": instance.profile_id, "version": instance.version},
        )
        return Response({"success": True, "data": serializer.data})


class EvaluationScoreViewSet(BaseSuccessModelViewSet):
    serializer_class = EvaluationScoreSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = EvaluationScore.objects.select_related("evaluation", "criterion").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(evaluation__agent__in=scoped_agent_queryset_for_user(self.request.user))
        evaluation_id = self.request.query_params.get("evaluationId")
        if evaluation_id:
            queryset = queryset.filter(evaluation_id=evaluation_id)
        return queryset


class SelfEvaluationViewSet(BaseSuccessModelViewSet):
    serializer_class = SelfEvaluationSerializer

    def get_queryset(self):
        queryset = (
            SelfEvaluation.objects.select_related(
                "evaluation",
                "employee",
                "employee__manager",
                "employee__service",
                "campaign",
                "reviewed_by",
            )
            .prefetch_related("answers")
            .all()
        )
        user = self.request.user
        role = getattr(user, "role", None)

        if role in {"agent", "employee"}:
            agent_profile = Agent.objects.filter(user=user).first()
            queryset = queryset.filter(employee=agent_profile) if agent_profile else queryset.none()
        elif role == "manager":
            manager_agent = Agent.objects.filter(user=user).first()
            queryset = queryset.filter(employee__manager=manager_agent) if manager_agent else queryset.none()
        elif role not in {"superadmin", "admin", "hr"}:
            queryset = queryset.none()

        evaluation_id = self.request.query_params.get("evaluationId")
        employee_id = self.request.query_params.get("employeeId")
        campaign_id = self.request.query_params.get("campaignId")
        service_id = self.request.query_params.get("serviceId")
        status_filter = self.request.query_params.get("status")
        if evaluation_id:
            queryset = queryset.filter(evaluation_id=evaluation_id)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        if service_id:
            queryset = queryset.filter(employee__service_id=service_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def _current_agent(self):
        return Agent.objects.filter(user=self.request.user).first()

    def _assert_employee_can_edit(self, instance=None):
        role = getattr(self.request.user, "role", None)
        agent_profile = self._current_agent()
        if role not in {"agent", "employee"} or not agent_profile:
            raise PermissionDenied("Seul l'employe peut saisir son auto-evaluation.")
        if instance and instance.employee_id != agent_profile.id:
            raise PermissionDenied("Vous ne pouvez modifier que votre propre auto-evaluation.")
        if instance and instance.status not in {SelfEvaluation.Status.DRAFT, SelfEvaluation.Status.REJECTED}:
            raise ValidationError({"status": "Une auto-evaluation soumise n'est plus modifiable par l'employe."})
        return agent_profile

    def _apply_self_score_to_linked_evaluation(self, instance):
        linked_evaluation = instance.evaluation
        if not linked_evaluation:
            linked_evaluation = (
                Evaluation.objects.filter(agent=instance.employee)
                .filter(Q(campaign=instance.campaign) | Q(period=instance.period))
                .order_by("-updated_at")
                .first()
            )
        if linked_evaluation:
            linked_evaluation.self_score = round(float(instance.average_score) * 20)
            linked_evaluation.save()
            if instance.evaluation_id != linked_evaluation.id:
                instance.evaluation = linked_evaluation
                instance.save(update_fields=["evaluation", "updated_at"])

    def perform_create(self, serializer):
        employee = self._assert_employee_can_edit()
        serializer.save(employee=employee, status=SelfEvaluation.Status.DRAFT)

    def perform_update(self, serializer):
        self._assert_employee_can_edit(serializer.instance)
        serializer.save(status=SelfEvaluation.Status.DRAFT)

    def _questionnaire_from_active_profile(self, agent_profile):
        if not agent_profile or not agent_profile.evaluation_profile_id:
            return []

        criteria = (
            EvaluationCriterion.objects.filter(
                profile_id=agent_profile.evaluation_profile_id,
                is_active=True,
            )
            .order_by("category", "name")
        )
        if not criteria.exists():
            return []

        section_titles = {
            EvaluationCriterion.Category.ATTENDANCE: "Presence et organisation",
            EvaluationCriterion.Category.QUANTITATIVE: "Objectifs et resultats",
            EvaluationCriterion.Category.QUALITATIVE: "Competences professionnelles",
            EvaluationCriterion.Category.MANAGERIAL: "Competences manageriales",
            EvaluationCriterion.Category.SELF: "Auto-evaluation",
        }
        sections = {}
        for criterion in criteria:
            section_key = criterion.category
            if section_key not in sections:
                sections[section_key] = {
                    "key": section_key,
                    "title": section_titles.get(section_key, "Criteres d'evaluation"),
                    "questions": [],
                }
            sections[section_key]["questions"].append(
                {
                    "key": f"criterion_{criterion.id}",
                    "criterionId": str(criterion.id),
                    "text": criterion.name,
                    "type": "rating" if criterion.score_type == EvaluationCriterion.ScoreType.RATING else "text",
                    "required": criterion.is_required,
                    "weight": criterion.weight,
                    "category": criterion.category,
                }
            )
        return list(sections.values())

    @action(detail=False, methods=["get"], url_path="questionnaire")
    def questionnaire(self, request):
        questionnaire = self._questionnaire_from_active_profile(self._current_agent())
        return Response({"success": True, "data": questionnaire or SELF_EVALUATION_QUESTIONNAIRE})

    @action(detail=True, methods=["post"], url_path="draft")
    def save_draft(self, request, pk=None):
        instance = self.get_object()
        self._assert_employee_can_edit(instance)
        payload = dict(request.data)
        payload["status"] = SelfEvaluation.Status.DRAFT
        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status=SelfEvaluation.Status.DRAFT)
        write_audit_event(
            request,
            action="brouillon",
            entity="self_evaluation",
            entity_id=serializer.data.get("id"),
            reason="Enregistrement d'une auto-evaluation en brouillon",
            metadata={"status": serializer.data.get("status"), "employeeId": serializer.data.get("employeeId")},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        instance = self.get_object()
        self._assert_employee_can_edit(instance)
        payload = dict(request.data)
        payload["status"] = SelfEvaluation.Status.SUBMITTED
        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status=SelfEvaluation.Status.SUBMITTED, submitted_at=timezone.now())
        self._apply_self_score_to_linked_evaluation(serializer.instance)
        write_audit_event(
            request,
            action="soumission",
            entity="self_evaluation",
            entity_id=serializer.data.get("id"),
            reason="Soumission d'une auto-evaluation",
            metadata={"status": serializer.data.get("status"), "employeeId": serializer.data.get("employeeId")},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        instance = self.get_object()
        role = getattr(request.user, "role", None)
        approved = bool(request.data.get("approved", True))
        if role not in {"superadmin", "admin", "hr", "manager"}:
            raise PermissionDenied("Vous n'avez pas le droit de revoir cette auto-evaluation.")
        if role == "manager":
            manager_agent = self._current_agent()
            if not manager_agent or instance.employee.manager_id != manager_agent.id:
                raise PermissionDenied("Vous ne pouvez revoir que les auto-evaluations de votre equipe.")
        if instance.status not in {SelfEvaluation.Status.SUBMITTED, SelfEvaluation.Status.REVIEWED, SelfEvaluation.Status.REJECTED}:
            raise ValidationError({"status": "Seule une auto-evaluation soumise peut etre marquee comme revue."})
        instance.status = SelfEvaluation.Status.REVIEWED if approved else SelfEvaluation.Status.REJECTED
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="revue" if approved else "rejet",
            entity="self_evaluation",
            entity_id=serializer.data.get("id"),
            reason=request.data.get("feedback", "Auto-evaluation consultee et revue" if approved else "Auto-evaluation rejetee par le management"),
            metadata={"status": serializer.data.get("status"), "employeeId": serializer.data.get("employeeId")},
        )
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="integrate")
    def integrate(self, request, pk=None):
        instance = self.get_object()
        role = getattr(request.user, "role", None)
        if role not in {"superadmin", "admin", "hr"}:
            raise PermissionDenied("Seule la DRH peut integrer l'auto-evaluation au processus.")
        if instance.status not in {SelfEvaluation.Status.SUBMITTED, SelfEvaluation.Status.REVIEWED, SelfEvaluation.Status.INTEGRATED}:
            raise ValidationError({"status": "L'auto-evaluation doit etre soumise avant integration."})
        instance.status = SelfEvaluation.Status.INTEGRATED
        instance.integrated_at = timezone.now()
        instance.reviewed_by = instance.reviewed_by or request.user
        instance.reviewed_at = instance.reviewed_at or timezone.now()
        instance.save()
        self._apply_self_score_to_linked_evaluation(instance)
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="integration",
            entity="self_evaluation",
            entity_id=serializer.data.get("id"),
            reason="Integration de l'auto-evaluation au processus d'evaluation",
            metadata={"status": serializer.data.get("status"), "employeeId": serializer.data.get("employeeId")},
        )
        return Response({"success": True, "data": serializer.data})


class SelfEvaluationAnswerViewSet(BaseSuccessModelViewSet):
    serializer_class = SelfEvaluationAnswerSerializer

    def get_queryset(self):
        queryset = SelfEvaluationAnswer.objects.select_related(
            "self_evaluation",
            "self_evaluation__employee",
            "self_evaluation__employee__manager",
            "criterion",
        ).all()
        user = self.request.user
        role = getattr(user, "role", None)

        if role in {"agent", "employee"}:
            agent_profile = Agent.objects.filter(user=user).first()
            queryset = queryset.filter(self_evaluation__employee=agent_profile) if agent_profile else queryset.none()
        elif role == "manager":
            manager_agent = Agent.objects.filter(user=user).first()
            queryset = (
                queryset.filter(self_evaluation__employee__manager=manager_agent)
                if manager_agent
                else queryset.none()
            )
        elif role not in {"superadmin", "admin", "hr"}:
            queryset = queryset.none()

        self_evaluation_id = self.request.query_params.get("selfEvaluationId")
        if self_evaluation_id:
            queryset = queryset.filter(self_evaluation_id=self_evaluation_id)
        return queryset

    def perform_create(self, serializer):
        self_evaluation = serializer.validated_data["self_evaluation"]
        agent_profile = Agent.objects.filter(user=self.request.user).first()
        if (
            getattr(self.request.user, "role", None) not in {"agent", "employee"}
            or not agent_profile
            or self_evaluation.employee_id != agent_profile.id
            or self_evaluation.status != SelfEvaluation.Status.DRAFT
        ):
            raise PermissionDenied("Les reponses ne peuvent etre modifiees que par l'employe en brouillon.")
        serializer.save()

    def perform_update(self, serializer):
        self_evaluation = serializer.instance.self_evaluation
        agent_profile = Agent.objects.filter(user=self.request.user).first()
        if (
            getattr(self.request.user, "role", None) not in {"agent", "employee"}
            or not agent_profile
            or self_evaluation.employee_id != agent_profile.id
            or self_evaluation.status != SelfEvaluation.Status.DRAFT
        ):
            raise PermissionDenied("Les reponses ne peuvent etre modifiees que par l'employe en brouillon.")
        serializer.save()


class RankingSnapshotViewSet(BaseSuccessModelViewSet):
    serializer_class = RankingSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = RankingSnapshot.objects.select_related("campaign", "employee", "employee__job_family").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(employee__in=scoped_agent_queryset_for_user(self.request.user))
        campaign_id = self.request.query_params.get("campaignId")
        job_family_id = self.request.query_params.get("jobFamilyId")
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        if job_family_id:
            queryset = queryset.filter(employee__job_family_id=job_family_id)
        return queryset

    @action(detail=False, methods=["post"], url_path="recalculate")
    def recalculate(self, request):
        if not is_admin_or_hr(request.user):
            raise PermissionDenied("Le recalcul des classements est reserve a la DRH et a l'administration.")
        campaign_id = request.data.get("campaignId")
        campaign = None
        if campaign_id:
            campaign = EvaluationCampaign.objects.get(id=campaign_id)
        count = recalculate_ranking_snapshots(campaign)
        write_audit_event(
            request,
            action="recalcul_classement",
            entity="ranking_snapshot",
            entity_id=str(campaign.id) if campaign else "",
            reason="Recalcul manuel des classements",
            metadata={"campaignId": str(campaign.id) if campaign else None, "snapshots": count},
        )
        return Response({"success": True, "data": {"snapshots": count}})


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsPrivilegedUser]

    def get_queryset(self):
        queryset = AuditEvent.objects.select_related("user").all()
        if not is_admin_or_hr(self.request.user):
            return queryset.none()
        entity = self.request.query_params.get("entity")
        action = self.request.query_params.get("action")
        if entity:
            queryset = queryset.filter(entity=entity)
        if action:
            queryset = queryset.filter(action=action)
        return queryset[:200]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({"success": True, "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})


class ProcessingRegisterViewSet(BaseSuccessModelViewSet):
    serializer_class = ProcessingRegisterSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOrHRCanWrite]

    def get_queryset(self):
        queryset = ProcessingRegister.objects.select_related("created_by").all()
        if not is_admin_or_hr(self.request.user):
            return queryset.none()
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        write_audit_event(
            self.request,
            action="creation",
            entity="processing_register",
            entity_id=serializer.instance.id,
            reason="Creation d'une fiche du registre des traitements",
        )

    def perform_update(self, serializer):
        serializer.save()
        write_audit_event(
            self.request,
            action="modification",
            entity="processing_register",
            entity_id=serializer.instance.id,
            reason="Mise a jour du registre des traitements",
        )


class ComplianceRequestViewSet(BaseSuccessModelViewSet):
    serializer_class = ComplianceRequestSerializer

    def get_queryset(self):
        queryset = ComplianceRequest.objects.select_related(
            "requester",
            "employee",
            "assigned_manager",
            "evaluation",
            "resolved_by",
        ).all()
        user = self.request.user
        role = getattr(user, "role", None)

        if role in {"superadmin", "admin", "hr"}:
            pass
        elif role == "manager":
            manager_agent = Agent.objects.filter(user=user).first()
            queryset = queryset.filter(assigned_manager=manager_agent) if manager_agent else queryset.none()
        else:
            employee_agent = Agent.objects.filter(user=user).first()
            if employee_agent:
                queryset = queryset.filter(Q(requester=user) | Q(employee=employee_agent))
            else:
                queryset = queryset.filter(requester=user)

        request_type = self.request.query_params.get("requestType")
        status_filter = self.request.query_params.get("status")
        if request_type:
            queryset = queryset.filter(request_type=request_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        employee = serializer.validated_data.get("employee") or Agent.objects.filter(user=user).first()
        if employee and not agent_belongs_to_user_scope(employee, user):
            raise PermissionDenied("Vous ne pouvez creer une demande que dans votre perimetre autorise.")
        assigned_manager = None
        if employee:
            assigned_manager = employee.manager
        evaluation = serializer.validated_data.get("evaluation")
        if evaluation and not agent_belongs_to_user_scope(evaluation.agent, user):
            raise PermissionDenied("Vous ne pouvez lier une evaluation que dans votre perimetre autorise.")
        if evaluation and evaluation.agent and evaluation.agent.manager:
            assigned_manager = evaluation.agent.manager
        instance = serializer.save(
            requester=user,
            requester_email=getattr(user, "email", "") or "",
            employee=employee,
            assigned_manager=assigned_manager,
        )
        if instance.employee and instance.employee.user and instance.employee.user_id != user.id:
            Notification.objects.create(
                recipient=instance.employee.user,
                title="Nouvelle demande de conformite",
                message=f"Une demande {instance.request_type} a ete enregistree pour vous : {instance.subject}",
                level=Notification.Level.INFO,
                link="/compliance",
            )
        if instance.request_type == ComplianceRequest.RequestType.CONTESTATION and assigned_manager and assigned_manager.user:
            Notification.objects.create(
                recipient=assigned_manager.user,
                title="Nouvelle contestation",
                message=f"{instance.employee.full_name if instance.employee else 'Un employe'} a depose une contestation.",
                level=Notification.Level.WARNING,
                link="/compliance?requestType=contestation",
            )
        if instance.request_type == ComplianceRequest.RequestType.CONTESTATION:
            for role in ("hr", "admin", "superadmin"):
                Notification.objects.create(
                    role=role,
                    title="Contestation a suivre",
                    message=f"Une contestation a ete deposee: {instance.subject}",
                    level=Notification.Level.WARNING,
                    link="/compliance?requestType=contestation",
                )
        write_audit_event(
            self.request,
            action=instance.request_type,
            entity="compliance_request",
            entity_id=instance.id,
            reason=instance.reason,
            metadata={"status": instance.status, "evaluationId": instance.evaluation_id},
        )

    @action(detail=True, methods=["post"], url_path="manager-review")
    def manager_review(self, request, pk=None):
        instance = self.get_object()
        role = getattr(request.user, "role", None)
        manager_agent = Agent.objects.filter(user=request.user).first()
        if role != "manager" or not manager_agent or instance.assigned_manager_id != manager_agent.id:
            raise PermissionDenied("Seul le responsable hierarchique affecte peut donner un avis.")
        instance.manager_response = request.data.get("managerResponse", request.data.get("response", "")).strip()
        if not instance.manager_response:
            raise ValidationError({"managerResponse": "L'avis du responsable est obligatoire."})
        instance.manager_reviewed_at = timezone.now()
        if instance.status == ComplianceRequest.Status.OPEN:
            instance.status = ComplianceRequest.Status.IN_REVIEW
        instance.save()
        for role_name in ("hr", "admin", "superadmin"):
            Notification.objects.create(
                role=role_name,
                title="Avis manager ajoute",
                message=f"Avis ajoute sur la contestation: {instance.subject}",
                level=Notification.Level.INFO,
                link="/compliance?requestType=contestation",
            )
        write_audit_event(
            request,
            action="avis_manager",
            entity="compliance_request",
            entity_id=instance.id,
            reason=instance.manager_response,
            metadata={"requestType": instance.request_type, "status": instance.status},
        )
        return Response({"success": True, "data": self.get_serializer(instance).data})

    def perform_update(self, serializer):
        role = getattr(self.request.user, "role", None)
        if role not in {"superadmin", "admin", "hr"}:
            raise PermissionDenied("Seule la DRH ou l'administration peut traiter une demande.")
        instance = serializer.save()
        if instance.status in {
            ComplianceRequest.Status.APPROVED,
            ComplianceRequest.Status.REJECTED,
            ComplianceRequest.Status.CLOSED,
        }:
            instance.resolved_by = self.request.user
            instance.resolved_at = timezone.now()
            instance.save(update_fields=["resolved_by", "resolved_at", "updated_at"])
        write_audit_event(
            self.request,
            action="traitement_demande",
            entity="compliance_request",
            entity_id=instance.id,
            reason=instance.response or "Traitement d'une demande de conformite",
            metadata={"status": instance.status, "requestType": instance.request_type},
        )

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        instance = self.get_object()
        role = getattr(request.user, "role", None)
        if role not in {"superadmin", "admin", "hr"}:
            raise PermissionDenied("Seule la DRH ou l'administration peut traiter une demande.")
        next_status = request.data.get("status", ComplianceRequest.Status.CLOSED)
        if next_status not in {
            ComplianceRequest.Status.APPROVED,
            ComplianceRequest.Status.REJECTED,
            ComplianceRequest.Status.CLOSED,
        }:
            raise ValidationError({"status": "Statut de resolution invalide."})
        instance.status = next_status
        instance.response = request.data.get("response", instance.response)
        instance.resolved_by = request.user
        instance.resolved_at = timezone.now()
        instance.save()
        serializer = self.get_serializer(instance)
        write_audit_event(
            request,
            action="resolution",
            entity="compliance_request",
            entity_id=instance.id,
            reason=instance.response or "Resolution de la demande",
            metadata={"status": instance.status, "requestType": instance.request_type},
        )
        return Response({"success": True, "data": serializer.data})


class ReportViewSet(BaseSuccessModelViewSet):
    serializer_class = ReportSerializer

    def get_queryset(self):
        queryset = Report.objects.select_related("campaign", "generated_by").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(generated_by=self.request.user)
        report_type = self.request.query_params.get("reportType")
        campaign_id = self.request.query_params.get("campaignId")
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        return queryset

    def _build_summary(self, campaign=None):
        evaluations = Evaluation.objects.all()
        if not is_admin_or_hr(self.request.user):
            evaluations = evaluations.filter(agent__in=scoped_agent_queryset_for_user(self.request.user))
        if campaign:
            evaluations = evaluations.filter(campaign=campaign)
        status_counts = dict(evaluations.values_list("status").annotate(total=Count("id")))
        average = evaluations.aggregate(avg=Avg("final_score"))["avg"] or 0
        return {
            "evaluations": evaluations.count(),
            "averageScore": round(float(average), 2),
            "statusCounts": status_counts,
            "validated": evaluations.filter(status=Evaluation.Status.HR_VALIDATED).count(),
            "pending": evaluations.filter(status__in=[Evaluation.Status.SUBMITTED, Evaluation.Status.MANAGER_VALIDATED]).count(),
        }

    def _report_evaluations(self, campaign=None):
        evaluations = Evaluation.objects.select_related("agent", "agent__service", "campaign", "evaluator").all()
        if not is_admin_or_hr(self.request.user):
            evaluations = evaluations.filter(agent__in=scoped_agent_queryset_for_user(self.request.user))
        if campaign:
            evaluations = evaluations.filter(campaign=campaign)
        report = getattr(self, "_current_report", None)
        filters = report.filters if report else {}
        status_filter = filters.get("status")
        period_filter = filters.get("period")
        query = str(filters.get("q", "")).strip().lower()
        if status_filter and status_filter != "all":
            evaluations = evaluations.filter(status=status_filter)
        if period_filter and period_filter != "all":
            evaluations = evaluations.filter(period=period_filter)
        if query:
            evaluations = evaluations.filter(
                Q(agent__full_name__icontains=query)
                | Q(agent__matricule__icontains=query)
                | Q(period__icontains=query)
                | Q(comments__icontains=query)
            )
        return evaluations.order_by("agent__full_name", "-updated_at")

    def _build_csv(self, report):
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Employe", "Matricule", "Service", "Campagne", "Periode", "Statut", "Score final", "Evaluateur"])
        for evaluation in self._report_evaluations(report.campaign):
            writer.writerow([
                evaluation.agent.full_name,
                evaluation.agent.matricule,
                evaluation.agent.service.name if evaluation.agent.service_id else "",
                evaluation.campaign.name if evaluation.campaign_id else "",
                evaluation.period,
                evaluation.status,
                evaluation.final_score,
                evaluation.evaluator_name or (evaluation.evaluator.full_name if evaluation.evaluator_id else ""),
            ])
        return output.getvalue().encode("utf-8-sig")

    def _pdf_text(self, report):
        summary = report.summary or {}
        lines = [
            report.title,
            f"Type: {report.report_type}",
            f"Campagne: {report.campaign.name if report.campaign_id else 'Toutes campagnes'}",
            f"Evaluations: {summary.get('evaluations', 0)}",
            f"Score moyen: {summary.get('averageScore', 0)}/100",
            f"Validees: {summary.get('validated', 0)}",
            f"En attente: {summary.get('pending', 0)}",
            "",
            "Detail des evaluations",
        ]
        for evaluation in self._report_evaluations(report.campaign)[:40]:
            lines.append(
                f"- {evaluation.agent.full_name} | {evaluation.period} | {evaluation.status} | {evaluation.final_score}/100"
            )
        return lines

    def _build_simple_pdf(self, report):
        # Minimal PDF writer to avoid adding a dependency for generated academic reports.
        text_lines = self._pdf_text(report)
        commands = ["BT", "/F1 12 Tf", "50 800 Td"]
        for index, line in enumerate(text_lines):
            escaped = str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            if index:
                commands.append("0 -18 Td")
            commands.append(f"({escaped}) Tj")
        commands.append("ET")
        stream = "\n".join(commands).encode("latin-1", errors="replace")
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        ]
        pdf = io.BytesIO()
        pdf.write(b"%PDF-1.4\n")
        offsets = []
        for number, obj in enumerate(objects, start=1):
            offsets.append(pdf.tell())
            pdf.write(f"{number} 0 obj\n".encode("ascii"))
            pdf.write(obj)
            pdf.write(b"\nendobj\n")
        xref = pdf.tell()
        pdf.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
        pdf.write(b"0000000000 65535 f \n")
        for offset in offsets:
            pdf.write(f"{offset:010d} 00000 n \n".encode("ascii"))
        pdf.write(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
        return pdf.getvalue()

    def perform_create(self, serializer):
        role = getattr(self.request.user, "role", None)
        if role in {"agent", "employee"}:
            raise PermissionDenied("Les rapports sont reserves a la DRH et aux responsables hierarchiques.")
        campaign = serializer.validated_data.get("campaign")
        report_format = serializer.validated_data.get("format", Report.Format.SUMMARY)
        extension = "csv" if report_format == Report.Format.SUMMARY else report_format
        report = serializer.save(
            generated_by=self.request.user,
            summary=self._build_summary(campaign),
            file_name=f"rapport-cnas-{timezone.now():%Y%m%d-%H%M%S}.{extension}",
        )
        write_audit_event(
            self.request,
            action="rapport",
            entity="report",
            entity_id=report.id,
            reason=f"Generation du rapport {report.title}",
            metadata={"reportType": report.report_type, "campaignId": report.campaign_id},
        )
        Notification.objects.create(
            recipient=self.request.user,
            title="Rapport genere",
            message=f"Le rapport {report.title} est disponible.",
            level=Notification.Level.SUCCESS,
            link="/reports",
        )

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        report = self.get_object()
        self._current_report = report
        if report.format == Report.Format.CSV:
            content = self._build_csv(report)
            response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        elif report.format == Report.Format.PDF:
            content = self._build_simple_pdf(report)
            response = HttpResponse(content, content_type="application/pdf")
        else:
            content = self._build_csv(report)
            response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{report.file_name or "rapport-cnas.csv"}"'
        return response


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPrivilegedUser]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(Q(recipient=user) | Q(role=getattr(user, "role", ""))).order_by("-created_at")[:50]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        instance = self.get_object()
        instance.read_at = timezone.now()
        instance.save(update_fields=["read_at"])
        return Response({"success": True, "data": self.get_serializer(instance).data})
