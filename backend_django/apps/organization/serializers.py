"""Vue d'ensemble du fichier : serializers.py
Role : adaptation entre les objets Django et le JSON echange avec le frontend.
Module : module organisation.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from rest_framework import serializers

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


class AgencySerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Agency
        fields = ("id", "name", "code", "address", "city", "createdAt")


class StructureSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Structure
        fields = ("id", "agency", "name", "code", "head_of_structure", "createdAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["agencyId"] = str(instance.agency_id)
        data["headOfStructure"] = data.pop("head_of_structure", "")
        data.pop("agency", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "agencyId" in mutable:
            mutable["agency"] = mutable.pop("agencyId")
        if "headOfStructure" in mutable:
            mutable["head_of_structure"] = mutable.pop("headOfStructure")
        return super().to_internal_value(mutable)


class ServiceSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Service
        fields = ("id", "structure", "name", "code", "service_head", "createdAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["structureId"] = str(instance.structure_id)
        data["serviceHead"] = data.pop("service_head", "")
        data.pop("structure", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "structureId" in mutable:
            mutable["structure"] = mutable.pop("structureId")
        if "serviceHead" in mutable:
            mutable["service_head"] = mutable.pop("serviceHead")
        return super().to_internal_value(mutable)


class JobFamilySerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = JobFamily
        fields = (
            "id",
            "name",
            "code",
            "description",
            "performance_weight",
            "competency_weight",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["performanceWeight"] = data.pop("performance_weight")
        data["competencyWeight"] = data.pop("competency_weight")
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "performanceWeight" in mutable:
            mutable["performance_weight"] = mutable.pop("performanceWeight")
        if "competencyWeight" in mutable:
            mutable["competency_weight"] = mutable.pop("competencyWeight")
        return super().to_internal_value(mutable)


class AgentSerializer(serializers.ModelSerializer):
    hireDate = serializers.DateField(source="hire_date", required=False, allow_null=True)

    class Meta:
        model = Agent
        fields = (
            "id",
            "service",
            "user",
            "manager",
            "job_position",
            "evaluation_profile",
            "job_family",
            "full_name",
            "matricule",
            "position",
            "email",
            "phone",
            "hireDate",
            "status",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["serviceId"] = str(instance.service_id)
        data["fullName"] = data.pop("full_name")
        data["userId"] = str(instance.user_id) if instance.user_id else None
        data["managerId"] = str(instance.manager_id) if instance.manager_id else None
        data["jobPositionId"] = str(instance.job_position_id) if instance.job_position_id else None
        data["evaluationProfileId"] = str(instance.evaluation_profile_id) if instance.evaluation_profile_id else None
        data["jobFamilyId"] = str(instance.job_family_id) if instance.job_family_id else None
        data["managerName"] = instance.manager.full_name if instance.manager else ""
        data["jobPositionTitle"] = instance.job_position.title if instance.job_position else instance.position
        data["evaluationProfileName"] = instance.evaluation_profile.name if instance.evaluation_profile else ""
        data["jobFamilyName"] = instance.job_family.name if instance.job_family else ""
        data.pop("service", None)
        data.pop("user", None)
        data.pop("manager", None)
        data.pop("job_position", None)
        data.pop("evaluation_profile", None)
        data.pop("job_family", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "serviceId" in mutable:
            mutable["service"] = mutable.pop("serviceId")
        if "userId" in mutable:
            mutable["user"] = mutable.pop("userId")
        if "managerId" in mutable:
            mutable["manager"] = mutable.pop("managerId")
        if "jobPositionId" in mutable:
            mutable["job_position"] = mutable.pop("jobPositionId")
        if "evaluationProfileId" in mutable:
            mutable["evaluation_profile"] = mutable.pop("evaluationProfileId")
        if "jobFamilyId" in mutable:
            mutable["job_family"] = mutable.pop("jobFamilyId")
        if "fullName" in mutable:
            mutable["full_name"] = mutable.pop("fullName")
        return super().to_internal_value(mutable)


class JobPositionSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = JobPosition
        fields = (
            "id",
            "title",
            "code",
            "job_family",
            "category",
            "hierarchy_level",
            "is_quantitative",
            "is_managerial",
            "description",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["jobFamilyId"] = str(instance.job_family_id) if instance.job_family_id else None
        data["jobFamilyName"] = instance.job_family.name if instance.job_family else ""
        data["hierarchyLevel"] = data.pop("hierarchy_level")
        data["isQuantitative"] = data.pop("is_quantitative")
        data["isManagerial"] = data.pop("is_managerial")
        data.pop("job_family", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "jobFamilyId" in mutable:
            mutable["job_family"] = mutable.pop("jobFamilyId")
        if "hierarchyLevel" in mutable:
            mutable["hierarchy_level"] = mutable.pop("hierarchyLevel")
        if "isQuantitative" in mutable:
            mutable["is_quantitative"] = mutable.pop("isQuantitative")
        if "isManagerial" in mutable:
            mutable["is_managerial"] = mutable.pop("isManagerial")
        return super().to_internal_value(mutable)


class EvaluationProfileSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = EvaluationProfile
        fields = (
            "id",
            "name",
            "job_family",
            "description",
            "target_category",
            "quantitative_weight",
            "qualitative_weight",
            "attendance_weight",
            "self_weight",
            "managerial_weight",
            "active",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["jobFamilyId"] = str(instance.job_family_id) if instance.job_family_id else None
        data["jobFamilyName"] = instance.job_family.name if instance.job_family else ""
        data["targetCategory"] = data.pop("target_category")
        data["quantitativeWeight"] = data.pop("quantitative_weight")
        data["qualitativeWeight"] = data.pop("qualitative_weight")
        data["attendanceWeight"] = data.pop("attendance_weight")
        data["selfWeight"] = data.pop("self_weight")
        data["managerialWeight"] = data.pop("managerial_weight")
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "jobFamilyId": "job_family",
            "targetCategory": "target_category",
            "quantitativeWeight": "quantitative_weight",
            "qualitativeWeight": "qualitative_weight",
            "attendanceWeight": "attendance_weight",
            "selfWeight": "self_weight",
            "managerialWeight": "managerial_weight",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ("id", "agent", "date", "status", "minutes_late", "remark", "recorded_by", "createdAt", "updatedAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["agentId"] = str(instance.agent_id)
        data["recordedById"] = str(instance.recorded_by_id) if instance.recorded_by_id else None
        data["agentName"] = instance.agent.full_name
        data["minutesLate"] = data.pop("minutes_late")
        data.pop("agent", None)
        data.pop("recorded_by", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "agentId" in mutable:
            mutable["agent"] = mutable.pop("agentId")
        if "recordedById" in mutable:
            mutable["recorded_by"] = mutable.pop("recordedById")
        if "minutesLate" in mutable:
            mutable["minutes_late"] = mutable.pop("minutesLate")
        return super().to_internal_value(mutable)


class LeaveRecordSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = LeaveRecord
        fields = (
            "id",
            "agent",
            "leave_type",
            "start_date",
            "end_date",
            "justified",
            "medical_certificate",
            "comment",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["agentId"] = str(instance.agent_id)
        data["agentName"] = instance.agent.full_name
        data["leaveType"] = data.pop("leave_type")
        data["startDate"] = data.pop("start_date")
        data["endDate"] = data.pop("end_date")
        data["medicalCertificate"] = data.pop("medical_certificate")
        data.pop("agent", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "agentId": "agent",
            "leaveType": "leave_type",
            "startDate": "start_date",
            "endDate": "end_date",
            "medicalCertificate": "medical_certificate",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class DailyFollowUpSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = DailyFollowUp
        fields = (
            "id",
            "agent",
            "manager",
            "date",
            "presence_status",
            "quality_note",
            "discipline_note",
            "remark",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["agentId"] = str(instance.agent_id)
        data["managerId"] = str(instance.manager_id) if instance.manager_id else None
        data["agentName"] = instance.agent.full_name
        data["managerName"] = instance.manager.full_name if instance.manager else ""
        data["presenceStatus"] = data.pop("presence_status")
        data["qualityNote"] = data.pop("quality_note")
        data["disciplineNote"] = data.pop("discipline_note")
        data.pop("agent", None)
        data.pop("manager", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "agentId": "agent",
            "managerId": "manager",
            "presenceStatus": "presence_status",
            "qualityNote": "quality_note",
            "disciplineNote": "discipline_note",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


