from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrBetter, is_admin_or_hr, user_agent
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
from apps.organization.serializers import (
    AgencySerializer,
    StructureSerializer,
    ServiceSerializer,
    JobFamilySerializer,
    JobPositionSerializer,
    EvaluationProfileSerializer,
    AgentSerializer,
    AttendanceRecordSerializer,
    LeaveRecordSerializer,
    DailyFollowUpSerializer,
)


class SuccessModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [permissions.IsAuthenticated(), IsAdminOrBetter()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.filter_queryset(self.get_queryset()), many=True)
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
        self.perform_destroy(instance)
        return Response({"success": True, "data": serializer.data})


def scoped_agents_for_user(user):
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


class AgencyViewSet(SuccessModelViewSet):
    serializer_class = AgencySerializer

    def get_queryset(self):
        queryset = Agency.objects.all()
        if is_admin_or_hr(self.request.user):
            return queryset
        scoped_agents = scoped_agents_for_user(self.request.user)
        return queryset.filter(structures__services__agents__in=scoped_agents).distinct()


class StructureViewSet(SuccessModelViewSet):
    serializer_class = StructureSerializer

    def get_queryset(self):
        queryset = Structure.objects.select_related("agency").all()
        if not is_admin_or_hr(self.request.user):
            scoped_agents = scoped_agents_for_user(self.request.user)
            queryset = queryset.filter(services__agents__in=scoped_agents).distinct()
        agency_id = self.request.query_params.get("agencyId")
        if agency_id:
            queryset = queryset.filter(agency_id=agency_id)
        return queryset


class ServiceViewSet(SuccessModelViewSet):
    serializer_class = ServiceSerializer

    def get_queryset(self):
        queryset = Service.objects.select_related("structure").all()
        if not is_admin_or_hr(self.request.user):
            scoped_agents = scoped_agents_for_user(self.request.user)
            queryset = queryset.filter(agents__in=scoped_agents).distinct()
        structure_id = self.request.query_params.get("structureId")
        if structure_id:
            queryset = queryset.filter(structure_id=structure_id)
        return queryset


class AgentViewSet(SuccessModelViewSet):
    serializer_class = AgentSerializer

    def get_queryset(self):
        queryset = Agent.objects.select_related(
            "service",
            "user",
            "manager",
            "job_position",
            "job_family",
            "evaluation_profile",
        ).all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(id__in=scoped_agents_for_user(self.request.user))
        service_id = self.request.query_params.get("serviceId")
        manager_id = self.request.query_params.get("managerId")
        job_family_id = self.request.query_params.get("jobFamilyId")
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        if manager_id:
            queryset = queryset.filter(manager_id=manager_id)
        if job_family_id:
            queryset = queryset.filter(job_family_id=job_family_id)
        return queryset


class JobFamilyViewSet(SuccessModelViewSet):
    serializer_class = JobFamilySerializer

    def get_queryset(self):
        queryset = JobFamily.objects.all()
        if is_admin_or_hr(self.request.user):
            return queryset
        scoped_agents = scoped_agents_for_user(self.request.user)
        return queryset.filter(agents__in=scoped_agents).distinct()


class JobPositionViewSet(SuccessModelViewSet):
    serializer_class = JobPositionSerializer

    def get_queryset(self):
        queryset = JobPosition.objects.select_related("job_family").all()
        if is_admin_or_hr(self.request.user):
            return queryset
        scoped_agents = scoped_agents_for_user(self.request.user)
        return queryset.filter(agents__in=scoped_agents).distinct()


class EvaluationProfileViewSet(SuccessModelViewSet):
    serializer_class = EvaluationProfileSerializer

    def get_queryset(self):
        queryset = EvaluationProfile.objects.select_related("job_family").all()
        if is_admin_or_hr(self.request.user):
            return queryset
        scoped_agents = scoped_agents_for_user(self.request.user)
        return queryset.filter(agents__in=scoped_agents).distinct()


class AttendanceRecordViewSet(SuccessModelViewSet):
    serializer_class = AttendanceRecordSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related("agent", "recorded_by").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(agent__in=scoped_agents_for_user(self.request.user))
        agent_id = self.request.query_params.get("agentId")
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        return queryset

    def perform_create(self, serializer):
        agent = serializer.validated_data["agent"]
        user = self.request.user
        if not is_admin_or_hr(user):
            current_agent = user_agent(user)
            if getattr(user, "role", None) != "manager" or not current_agent or agent.manager_id != current_agent.id:
                raise PermissionDenied("Vous ne pouvez saisir la presence que pour votre equipe.")
        serializer.save(recorded_by=user)


class LeaveRecordViewSet(SuccessModelViewSet):
    serializer_class = LeaveRecordSerializer

    def get_queryset(self):
        queryset = LeaveRecord.objects.select_related("agent").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(agent__in=scoped_agents_for_user(self.request.user))
        agent_id = self.request.query_params.get("agentId")
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        return queryset


class DailyFollowUpViewSet(SuccessModelViewSet):
    serializer_class = DailyFollowUpSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = DailyFollowUp.objects.select_related("agent", "manager").all()
        if not is_admin_or_hr(self.request.user):
            queryset = queryset.filter(agent__in=scoped_agents_for_user(self.request.user))
        agent_id = self.request.query_params.get("agentId")
        manager_id = self.request.query_params.get("managerId")
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        if manager_id:
            queryset = queryset.filter(manager_id=manager_id)
        return queryset

    def perform_create(self, serializer):
        agent = serializer.validated_data["agent"]
        user = self.request.user
        if not is_admin_or_hr(user):
            current_agent = user_agent(user)
            if getattr(user, "role", None) != "manager" or not current_agent or agent.manager_id != current_agent.id:
                raise PermissionDenied("Vous ne pouvez saisir un suivi que pour votre equipe.")
        serializer.save(manager=user)

    @action(detail=False, methods=["post"], url_path="complete")
    def complete(self, request):
        agent_id = request.data.get("agentId") or request.data.get("agent")
        if not agent_id:
            return Response({"success": False, "detail": "agentId est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            agent = Agent.objects.get(id=agent_id)
        except Agent.DoesNotExist:
            return Response({"success": False, "detail": "Agent introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not is_admin_or_hr(user):
            current_agent = user_agent(user)
            if getattr(user, "role", None) != "manager" or not current_agent or agent.manager_id != current_agent.id:
                raise PermissionDenied("Vous ne pouvez saisir un suivi que pour votre equipe.")

        record_date = request.data.get("date")
        presence_status = request.data.get("presenceStatus") or request.data.get("presence_status") or AttendanceRecord.Status.PRESENT
        minutes_late = request.data.get("minutesLate", request.data.get("minutes_late", 0)) or 0
        remark = request.data.get("remark", "")
        quality_note = request.data.get("qualityNote", request.data.get("quality_note", 3)) or 3
        discipline_note = request.data.get("disciplineNote", request.data.get("discipline_note", 3)) or 3

        with transaction.atomic():
            attendance, _ = AttendanceRecord.objects.update_or_create(
                agent=agent,
                date=record_date,
                defaults={
                    "status": presence_status,
                    "minutes_late": minutes_late,
                    "remark": remark,
                    "recorded_by": user,
                },
            )
            followup, _ = DailyFollowUp.objects.update_or_create(
                agent=agent,
                date=record_date,
                defaults={
                    "manager": user,
                    "presence_status": presence_status,
                    "quality_note": quality_note,
                    "discipline_note": discipline_note,
                    "remark": remark,
                },
            )

        return Response(
            {
                "success": True,
                "data": {
                    "attendance": AttendanceRecordSerializer(attendance).data,
                    "followup": DailyFollowUpSerializer(followup).data,
                },
            },
            status=status.HTTP_201_CREATED,
        )
