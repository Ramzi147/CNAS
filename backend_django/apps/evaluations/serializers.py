from rest_framework import serializers

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


class EvaluationCriterionCompactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriterion
        fields = (
            "id",
            "name",
            "description",
            "category",
            "score_type",
            "weight",
            "min_score",
            "max_score",
            "is_required",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["scoreType"] = data.pop("score_type")
        data["minScore"] = data.pop("min_score")
        data["maxScore"] = data.pop("max_score")
        data["isRequired"] = data.pop("is_required")
        return data


class EvaluationScoreWriteSerializer(serializers.Serializer):
    criterionId = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=6, decimal_places=2)
    comment = serializers.CharField(required=False, allow_blank=True)


class EvaluationScoreDetailSerializer(serializers.ModelSerializer):
    criterion = EvaluationCriterionCompactSerializer(read_only=True)

    class Meta:
        model = EvaluationScore
        fields = ("id", "score", "comment", "criterion")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["criterionId"] = str(instance.criterion_id)
        return data


class EvaluationCampaignSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    assignmentsCount = serializers.IntegerField(source="assignments.count", read_only=True)

    class Meta:
        model = EvaluationCampaign
        fields = (
            "id",
            "name",
            "period_type",
            "start_date",
            "end_date",
            "status",
            "description",
            "assignmentsCount",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["periodType"] = data.pop("period_type")
        data["startDate"] = data.pop("start_date")
        data["endDate"] = data.pop("end_date")
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {"periodType": "period_type", "startDate": "start_date", "endDate": "end_date"}
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class CampaignAssignmentSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CampaignAssignment
        fields = (
            "id",
            "campaign",
            "employee",
            "manager",
            "evaluation",
            "status",
            "due_date",
            "assigned_by",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("assigned_by",)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        evaluation = instance.evaluation
        data["campaignId"] = str(instance.campaign_id)
        data["campaignName"] = instance.campaign.name
        data["employeeId"] = str(instance.employee_id)
        data["employeeName"] = instance.employee.full_name
        data["employeeMatricule"] = instance.employee.matricule
        data["managerId"] = str(instance.manager_id) if instance.manager_id else None
        data["managerName"] = instance.manager.full_name if instance.manager_id else ""
        data["evaluationId"] = str(instance.evaluation_id) if instance.evaluation_id else None
        data["evaluationStatus"] = evaluation.status if evaluation else None
        data["evaluationDisplayScore"] = self._display_score(evaluation) if evaluation else None
        data["evaluationFinalScore"] = evaluation.final_score if evaluation else None
        data["evaluationUpdatedAt"] = evaluation.updated_at if evaluation else None
        data["evaluationComments"] = evaluation.comments if evaluation else ""
        data["dueDate"] = data.pop("due_date")
        data["assignedById"] = str(instance.assigned_by_id) if instance.assigned_by_id else None
        data.pop("campaign", None)
        data.pop("employee", None)
        data.pop("manager", None)
        data.pop("evaluation", None)
        data.pop("assigned_by", None)
        return data

    def _display_score(self, evaluation):
        if not evaluation:
            return None
        criteria_scores = list(evaluation.criteria_scores.select_related("criterion").all())
        valid = [item for item in criteria_scores if item.criterion and (item.criterion.weight or 0) > 0]
        if not valid:
            return evaluation.final_score
        weighted = 0
        weights = 0
        for item in valid:
            criterion = item.criterion
            max_score = float(criterion.max_score or 100)
            normalized = (float(item.score or 0) / max_score) * 100 if max_score > 0 else float(item.score or 0)
            weight = float(criterion.weight or 0)
            weighted += normalized * weight
            weights += weight
        return round(weighted / weights) if weights else evaluation.final_score

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "campaignId": "campaign",
            "employeeId": "employee",
            "managerId": "manager",
            "evaluationId": "evaluation",
            "dueDate": "due_date",
            "assignedById": "assigned_by",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class EvaluationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    employeeName = serializers.CharField(source="agent.full_name", read_only=True)
    employeeMatricule = serializers.CharField(source="agent.matricule", read_only=True)
    criteriaScores = EvaluationScoreDetailSerializer(source="criteria_scores", many=True, read_only=True)
    criteriaPayload = EvaluationScoreWriteSerializer(many=True, write_only=True, required=False)
    managerValidated = serializers.BooleanField(source="manager_validation_complete", read_only=True)
    hrValidated = serializers.BooleanField(source="hr_validation_complete", read_only=True)
    selfEvaluation = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = (
            "id",
            "agent",
            "campaign",
            "evaluator",
            "period",
            "score",
            "performance_score",
            "competency_score",
            "quantitative_score",
            "qualitative_score",
            "attendance_score",
            "self_score",
            "managerial_score",
            "final_score",
            "status",
            "comments",
            "evaluator_name",
            "createdAt",
            "updatedAt",
            "employeeName",
            "employeeMatricule",
            "criteriaScores",
            "criteriaPayload",
            "managerValidated",
            "hrValidated",
            "selfEvaluation",
        )

    def get_selfEvaluation(self, instance):
        self_eval = getattr(instance, "self_evaluation", None)
        if not self_eval:
            return None
        return {
            "id": str(self_eval.id),
            "status": self_eval.status,
            "averageScore": self_eval.average_score,
            "overallComment": self_eval.overall_comment,
            "positivePoints": self_eval.positive_points,
            "difficulties": self_eval.difficulties,
            "supportNeeds": self_eval.support_needs,
            "improvementSuggestions": self_eval.improvement_suggestions,
            "collaborationComment": self_eval.collaboration_comment,
            "submittedAt": self_eval.submitted_at,
            "reviewedAt": self_eval.reviewed_at,
            "integratedAt": self_eval.integrated_at,
            "answers": [
                {
                    "id": str(answer.id),
                    "questionKey": answer.question_key,
                    "sectionKey": answer.section_key,
                    "sectionTitle": answer.section_title,
                    "questionText": answer.question_text,
                    "answerType": answer.answer_type,
                    "score": float(answer.score) if answer.score is not None else None,
                    "selectedValue": answer.selected_value,
                    "comment": answer.comment,
                    "isRequired": answer.is_required,
                }
                for answer in self_eval.answers.all()
            ],
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["agentId"] = str(instance.agent_id)
        data["campaignId"] = str(instance.campaign_id) if instance.campaign_id else None
        data["evaluatorId"] = str(instance.evaluator_id) if instance.evaluator_id else None
        data["jobFamilyId"] = str(instance.agent.job_family_id) if instance.agent.job_family_id else None
        data["jobFamilyName"] = instance.agent.job_family.name if instance.agent.job_family else ""
        data["evaluatorName"] = data.pop("evaluator_name")
        data["performanceScore"] = data.pop("performance_score")
        data["competencyScore"] = data.pop("competency_score")
        data["quantitativeScore"] = data.pop("quantitative_score")
        data["qualitativeScore"] = data.pop("qualitative_score")
        data["attendanceScore"] = data.pop("attendance_score")
        data["selfScore"] = data.pop("self_score")
        data["managerialScore"] = data.pop("managerial_score")
        data["finalScore"] = data.pop("final_score")
        data.pop("agent", None)
        data.pop("campaign", None)
        data.pop("evaluator", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "agentId": "agent",
            "campaignId": "campaign",
            "evaluatorId": "evaluator",
            "performanceScore": "performance_score",
            "competencyScore": "competency_score",
            "quantitativeScore": "quantitative_score",
            "qualitativeScore": "qualitative_score",
            "attendanceScore": "attendance_score",
            "selfScore": "self_score",
            "managerialScore": "managerial_score",
            "finalScore": "final_score",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        if "evaluatorName" in mutable:
            mutable["evaluator_name"] = mutable.pop("evaluatorName")
        if "criteriaScores" in mutable:
            mutable["criteriaPayload"] = mutable.pop("criteriaScores")
        return super().to_internal_value(mutable)

    def _sync_criteria_scores(self, evaluation, criteria_payload):
        if criteria_payload is None:
            return

        existing_criteria_ids = set(
            evaluation.criteria_scores.values_list("criterion_id", flat=True)
        )
        valid_criteria_ids = set(
            EvaluationCriterion.objects.filter(
                profile=evaluation.agent.evaluation_profile,
                is_active=True,
            ).values_list("id", flat=True)
        )
        valid_criteria_ids.update(existing_criteria_ids)

        kept_ids = set()
        for item in criteria_payload:
            criterion_id = item["criterionId"]
            if criterion_id not in valid_criteria_ids:
                raise serializers.ValidationError(
                    {"criteriaScores": f"Le critere {criterion_id} n'est pas autorise pour ce profil d'evaluation."}
                )

            score_obj, _ = EvaluationScore.objects.update_or_create(
                evaluation=evaluation,
                criterion_id=criterion_id,
                defaults={
                    "score": item["score"],
                    "comment": item.get("comment", ""),
                },
            )
            kept_ids.add(score_obj.criterion_id)

        EvaluationScore.objects.filter(evaluation=evaluation).exclude(criterion_id__in=kept_ids).delete()
        if hasattr(evaluation, "_prefetched_objects_cache"):
            evaluation._prefetched_objects_cache.pop("criteria_scores", None)
        evaluation.save()

    def create(self, validated_data):
        criteria_payload = validated_data.pop("criteriaPayload", None)
        evaluation = super().create(validated_data)
        self._sync_criteria_scores(evaluation, criteria_payload)
        return evaluation

    def update(self, instance, validated_data):
        criteria_payload = validated_data.pop("criteriaPayload", None)
        evaluation = super().update(instance, validated_data)
        self._sync_criteria_scores(evaluation, criteria_payload)
        return evaluation


class EvaluationCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriterion
        fields = (
            "id",
            "profile",
            "form_version",
            "name",
            "description",
            "category",
            "score_type",
            "weight",
            "min_score",
            "max_score",
            "is_required",
            "is_active",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["profileId"] = str(instance.profile_id)
        data["formVersionId"] = str(instance.form_version_id) if instance.form_version_id else None
        data["scoreType"] = data.pop("score_type")
        data["minScore"] = data.pop("min_score")
        data["maxScore"] = data.pop("max_score")
        data["isRequired"] = data.pop("is_required")
        data["isActive"] = data.pop("is_active")
        data.pop("profile", None)
        data.pop("form_version", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "profileId": "profile",
            "formVersionId": "form_version",
            "scoreType": "score_type",
            "minScore": "min_score",
            "maxScore": "max_score",
            "isRequired": "is_required",
            "isActive": "is_active",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class EvaluationFormVersionSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    activatedAt = serializers.DateTimeField(source="activated_at", read_only=True)
    archivedAt = serializers.DateTimeField(source="archived_at", read_only=True)
    createdByName = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = EvaluationFormVersion
        fields = (
            "id",
            "profile",
            "version",
            "status",
            "title",
            "description",
            "schema",
            "activatedAt",
            "archivedAt",
            "created_by",
            "createdAt",
            "updatedAt",
            "createdByName",
        )
        read_only_fields = ("created_by", "activatedAt", "archivedAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["profileId"] = str(instance.profile_id)
        data["profileName"] = instance.profile.name
        data["createdById"] = str(instance.created_by_id) if instance.created_by_id else None
        data.pop("profile", None)
        data.pop("created_by", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "profileId" in mutable:
            mutable["profile"] = mutable.pop("profileId")
        if "createdById" in mutable:
            mutable["created_by"] = mutable.pop("createdById")
        return super().to_internal_value(mutable)


class EvaluationScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationScore
        fields = ("id", "evaluation", "criterion", "score", "comment")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["evaluationId"] = str(instance.evaluation_id)
        data["criterionId"] = str(instance.criterion_id)
        data["criterionName"] = instance.criterion.name
        data.pop("evaluation", None)
        data.pop("criterion", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "evaluationId" in mutable:
            mutable["evaluation"] = mutable.pop("evaluationId")
        if "criterionId" in mutable:
            mutable["criterion"] = mutable.pop("criterionId")
        return super().to_internal_value(mutable)


class SelfEvaluationAnswerSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = SelfEvaluationAnswer
        fields = (
            "id",
            "self_evaluation",
            "criterion",
            "question_key",
            "section_key",
            "section_title",
            "question_text",
            "answer_type",
            "score",
            "selected_value",
            "comment",
            "is_required",
            "createdAt",
            "updatedAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["selfEvaluationId"] = str(instance.self_evaluation_id)
        data["criterionId"] = str(instance.criterion_id) if instance.criterion_id else None
        data["criterionName"] = instance.criterion.name if instance.criterion_id else ""
        data["questionKey"] = data.pop("question_key")
        data["sectionKey"] = data.pop("section_key")
        data["sectionTitle"] = data.pop("section_title")
        data["questionText"] = data.pop("question_text")
        data["answerType"] = data.pop("answer_type")
        data["selectedValue"] = data.pop("selected_value")
        data["isRequired"] = data.pop("is_required")
        data.pop("self_evaluation", None)
        data.pop("criterion", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        if "selfEvaluationId" in mutable:
            mutable["self_evaluation"] = mutable.pop("selfEvaluationId")
        if "criterionId" in mutable:
            mutable["criterion"] = mutable.pop("criterionId")
        mapping = {
            "questionKey": "question_key",
            "sectionKey": "section_key",
            "sectionTitle": "section_title",
            "questionText": "question_text",
            "answerType": "answer_type",
            "selectedValue": "selected_value",
            "isRequired": "is_required",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class SelfEvaluationAnswerWriteSerializer(serializers.Serializer):
    questionKey = serializers.CharField(max_length=80)
    sectionKey = serializers.CharField(max_length=80)
    sectionTitle = serializers.CharField(max_length=255)
    questionText = serializers.CharField()
    answerType = serializers.ChoiceField(choices=SelfEvaluationAnswer.AnswerType.choices)
    score = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    selectedValue = serializers.CharField(required=False, allow_blank=True, max_length=120)
    comment = serializers.CharField(required=False, allow_blank=True)
    isRequired = serializers.BooleanField(required=False, default=True)
    criterionId = serializers.IntegerField(required=False, allow_null=True)


class SelfEvaluationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    answers = SelfEvaluationAnswerSerializer(many=True, read_only=True)
    answersPayload = SelfEvaluationAnswerWriteSerializer(many=True, write_only=True, required=False)
    reviewedByName = serializers.CharField(source="reviewed_by.full_name", read_only=True)

    class Meta:
        model = SelfEvaluation
        fields = (
            "id",
            "evaluation",
            "employee",
            "campaign",
            "period",
            "status",
            "overall_comment",
            "positive_points",
            "difficulties",
            "support_needs",
            "improvement_suggestions",
            "collaboration_comment",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "integrated_at",
            "createdAt",
            "updatedAt",
            "answers",
            "answersPayload",
            "reviewedByName",
        )
        read_only_fields = ("reviewed_by", "reviewed_at", "integrated_at")
        extra_kwargs = {
            "employee": {"required": False},
            "evaluation": {"required": False, "allow_null": True},
            "campaign": {"required": False, "allow_null": True},
            "status": {"required": False},
            "submitted_at": {"required": False, "allow_null": True},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        linked_evaluation = instance.evaluation
        if not linked_evaluation:
            linked_evaluation = (
                Evaluation.objects.filter(agent=instance.employee)
                .filter(campaign=instance.campaign if instance.campaign_id else None)
                .first()
                if instance.campaign_id
                else Evaluation.objects.filter(agent=instance.employee, period=instance.period).first()
            )

        data["evaluationId"] = str(instance.evaluation_id) if instance.evaluation_id else None
        data["managerEvaluation"] = (
            {
                "id": str(linked_evaluation.id),
                "status": linked_evaluation.status,
                "finalScore": linked_evaluation.final_score,
                "selfScore": linked_evaluation.self_score,
                "managerialScore": linked_evaluation.managerial_score,
                "period": linked_evaluation.period,
            }
            if linked_evaluation
            else None
        )
        data["employeeId"] = str(instance.employee_id)
        data["employeeName"] = instance.employee.full_name
        data["employeeMatricule"] = instance.employee.matricule
        data["serviceId"] = str(instance.employee.service_id)
        data["serviceName"] = instance.employee.service.name if instance.employee.service_id else ""
        data["campaignId"] = str(instance.campaign_id) if instance.campaign_id else None
        data["campaignName"] = instance.campaign.name if instance.campaign_id else ""
        data["overallComment"] = data.pop("overall_comment")
        data["positivePoints"] = data.pop("positive_points")
        data["supportNeeds"] = data.pop("support_needs")
        data["improvementSuggestions"] = data.pop("improvement_suggestions")
        data["collaborationComment"] = data.pop("collaboration_comment")
        data["submittedAt"] = data.pop("submitted_at")
        data["reviewedById"] = str(data.pop("reviewed_by")) if instance.reviewed_by_id else None
        data["reviewedAt"] = data.pop("reviewed_at")
        data["integratedAt"] = data.pop("integrated_at")
        data["averageScore"] = instance.average_score
        data.pop("evaluation", None)
        data.pop("employee", None)
        data.pop("campaign", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "evaluationId": "evaluation",
            "employeeId": "employee",
            "campaignId": "campaign",
            "overallComment": "overall_comment",
            "positivePoints": "positive_points",
            "supportNeeds": "support_needs",
            "improvementSuggestions": "improvement_suggestions",
            "collaborationComment": "collaboration_comment",
            "submittedAt": "submitted_at",
            "answers": "answersPayload",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)

    def _sync_answers(self, self_evaluation, answers_payload):
        if answers_payload is None:
            return

        kept_keys = set()
        for item in answers_payload:
            question_key = item["questionKey"]
            criterion_id = item.get("criterionId")
            if criterion_id and not EvaluationCriterion.objects.filter(id=criterion_id).exists():
                raise serializers.ValidationError({"answers": f"Le critere {criterion_id} est introuvable."})

            answer, _ = SelfEvaluationAnswer.objects.update_or_create(
                self_evaluation=self_evaluation,
                question_key=question_key,
                defaults={
                    "criterion_id": criterion_id,
                    "section_key": item["sectionKey"],
                    "section_title": item["sectionTitle"],
                    "question_text": item["questionText"],
                    "answer_type": item["answerType"],
                    "score": item.get("score"),
                    "selected_value": item.get("selectedValue", ""),
                    "comment": item.get("comment", ""),
                    "is_required": item.get("isRequired", True),
                },
            )
            kept_keys.add(answer.question_key)

        SelfEvaluationAnswer.objects.filter(self_evaluation=self_evaluation).exclude(question_key__in=kept_keys).delete()

    def create(self, validated_data):
        answers_payload = validated_data.pop("answersPayload", None)
        self_evaluation = super().create(validated_data)
        self._sync_answers(self_evaluation, answers_payload)
        return self_evaluation

    def update(self, instance, validated_data):
        answers_payload = validated_data.pop("answersPayload", None)
        self_evaluation = super().update(instance, validated_data)
        self._sync_answers(self_evaluation, answers_payload)
        return self_evaluation


class RankingSnapshotSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = RankingSnapshot
        fields = (
            "id",
            "campaign",
            "employee",
            "service_name",
            "job_family_name",
            "comparison_scope",
            "rank_global",
            "rank_service",
            "rank_job_family",
            "performance_score",
            "competency_score",
            "final_score",
            "is_best_employee",
            "is_worst_employee",
            "createdAt",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["campaignId"] = str(instance.campaign_id) if instance.campaign_id else None
        data["employeeId"] = str(instance.employee_id)
        data["employeeName"] = instance.employee.full_name
        data["serviceName"] = data.pop("service_name")
        data["jobFamilyName"] = data.pop("job_family_name")
        data["comparisonScope"] = data.pop("comparison_scope")
        data["rankGlobal"] = data.pop("rank_global")
        data["rankService"] = data.pop("rank_service")
        data["rankJobFamily"] = data.pop("rank_job_family")
        data["performanceScore"] = data.pop("performance_score")
        data["competencyScore"] = data.pop("competency_score")
        data["finalScore"] = data.pop("final_score")
        data["isBestEmployee"] = data.pop("is_best_employee")
        data["isWorstEmployee"] = data.pop("is_worst_employee")
        data.pop("campaign", None)
        data.pop("employee", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "campaignId": "campaign",
            "employeeId": "employee",
            "serviceName": "service_name",
            "jobFamilyName": "job_family_name",
            "comparisonScope": "comparison_scope",
            "rankGlobal": "rank_global",
            "rankService": "rank_service",
            "rankJobFamily": "rank_job_family",
            "performanceScore": "performance_score",
            "competencyScore": "competency_score",
            "finalScore": "final_score",
            "isBestEmployee": "is_best_employee",
            "isWorstEmployee": "is_worst_employee",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class AuditEventSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AuditEvent
        fields = (
            "id",
            "action",
            "user",
            "user_email",
            "entity",
            "entity_id",
            "ip_address",
            "reason",
            "metadata",
            "createdAt",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["userEmail"] = data.pop("user_email") or (instance.user.email if instance.user else "")
        data["entityId"] = data.pop("entity_id")
        data["ipAddress"] = data.pop("ip_address")
        data.pop("user", None)
        return data


class ProcessingRegisterSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    createdByName = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = ProcessingRegister
        fields = (
            "id",
            "name",
            "purpose",
            "legal_basis",
            "data_categories",
            "recipients",
            "retention_period",
            "security_measures",
            "dpd_contact",
            "status",
            "created_by",
            "createdAt",
            "updatedAt",
            "createdByName",
        )
        read_only_fields = ("created_by",)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["legalBasis"] = data.pop("legal_basis")
        data["dataCategories"] = data.pop("data_categories")
        data["retentionPeriod"] = data.pop("retention_period")
        data["securityMeasures"] = data.pop("security_measures")
        data["dpdContact"] = data.pop("dpd_contact")
        data["createdById"] = str(instance.created_by_id) if instance.created_by_id else None
        data.pop("created_by", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "legalBasis": "legal_basis",
            "dataCategories": "data_categories",
            "retentionPeriod": "retention_period",
            "securityMeasures": "security_measures",
            "dpdContact": "dpd_contact",
            "createdById": "created_by",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class ComplianceRequestSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    resolvedAt = serializers.DateTimeField(source="resolved_at", read_only=True)
    managerReviewedAt = serializers.DateTimeField(source="manager_reviewed_at", read_only=True)

    class Meta:
        model = ComplianceRequest
        fields = (
            "id",
            "request_type",
            "status",
            "requester",
            "requester_email",
            "employee",
            "evaluation",
            "assigned_manager",
            "subject",
            "reason",
            "manager_response",
            "managerReviewedAt",
            "response",
            "resolved_by",
            "resolvedAt",
            "metadata",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("requester", "requester_email", "resolved_by", "resolvedAt", "managerReviewedAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["requestType"] = data.pop("request_type")
        data["requesterId"] = str(instance.requester_id) if instance.requester_id else None
        data["requesterEmail"] = data.pop("requester_email")
        data["employeeId"] = str(instance.employee_id) if instance.employee_id else None
        data["employeeName"] = instance.employee.full_name if instance.employee_id else ""
        data["evaluationId"] = str(instance.evaluation_id) if instance.evaluation_id else None
        data["assignedManagerId"] = str(instance.assigned_manager_id) if instance.assigned_manager_id else None
        data["assignedManagerName"] = instance.assigned_manager.full_name if instance.assigned_manager_id else ""
        data["managerResponse"] = data.pop("manager_response")
        data["resolvedById"] = str(instance.resolved_by_id) if instance.resolved_by_id else None
        data["resolvedByName"] = instance.resolved_by.full_name if instance.resolved_by_id else ""
        data.pop("requester", None)
        data.pop("employee", None)
        data.pop("evaluation", None)
        data.pop("assigned_manager", None)
        data.pop("resolved_by", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "requestType": "request_type",
            "employeeId": "employee",
            "evaluationId": "evaluation",
            "assignedManagerId": "assigned_manager",
            "requesterId": "requester",
            "requesterEmail": "requester_email",
            "managerResponse": "manager_response",
            "resolvedById": "resolved_by",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class ReportSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    generatedByName = serializers.CharField(source="generated_by.full_name", read_only=True)

    class Meta:
        model = Report
        fields = (
            "id",
            "title",
            "report_type",
            "format",
            "campaign",
            "generated_by",
            "filters",
            "summary",
            "file_name",
            "createdAt",
            "generatedByName",
        )
        read_only_fields = ("generated_by", "summary", "file_name")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["reportType"] = data.pop("report_type")
        data["campaignId"] = str(instance.campaign_id) if instance.campaign_id else None
        data["campaignName"] = instance.campaign.name if instance.campaign_id else ""
        data["generatedById"] = str(instance.generated_by_id) if instance.generated_by_id else None
        data["fileName"] = data.pop("file_name")
        data.pop("campaign", None)
        data.pop("generated_by", None)
        return data

    def to_internal_value(self, data):
        mutable = dict(data)
        mapping = {
            "reportType": "report_type",
            "campaignId": "campaign",
            "generatedById": "generated_by",
            "fileName": "file_name",
        }
        for src, dest in mapping.items():
            if src in mutable:
                mutable[dest] = mutable.pop(src)
        return super().to_internal_value(mutable)


class NotificationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    readAt = serializers.DateTimeField(source="read_at", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "recipient",
            "role",
            "title",
            "message",
            "level",
            "link",
            "readAt",
            "createdAt",
        )
        read_only_fields = ("recipient", "readAt")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["recipientId"] = str(instance.recipient_id) if instance.recipient_id else None
        data["isRead"] = bool(instance.read_at)
        data.pop("recipient", None)
        return data
