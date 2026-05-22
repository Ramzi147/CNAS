"""Vue d'ensemble du fichier : tests.py
Role : scenarios de tests destines a verrouiller les comportements critiques du module.
Module : module evaluations.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.evaluations.models import ComplianceRequest, Evaluation, EvaluationCampaign, EvaluationCriterion, EvaluationFormVersion, Notification, SelfEvaluation
from apps.organization.models import Agency, Agent, EvaluationProfile, JobFamily, JobPosition, Service, Structure


class CoreWorkflowAPITests(APITestCase):
    def setUp(self):
        self.password = "Password123!"
        self.hr = User.objects.create_user(
            email="hr.test@cnas.dz",
            password=self.password,
            full_name="RH Test",
            role="hr",
        )
        self.manager_user = User.objects.create_user(
            email="manager.test@cnas.dz",
            password=self.password,
            full_name="Manager Test",
            role="manager",
        )
        self.employee_user = User.objects.create_user(
            email="employee.test@cnas.dz",
            password=self.password,
            full_name="Employee Test",
            role="agent",
        )

        agency = Agency.objects.create(name="Agence Test", code="AGT", city="Alger")
        structure = Structure.objects.create(agency=agency, name="Structure Test", code="STT")
        service = Service.objects.create(structure=structure, name="Service Test", code="SVT")
        family = JobFamily.objects.create(name="Famille Test", code="FT", performance_weight=50, competency_weight=50)
        position = JobPosition.objects.create(title="Charge Test", code="PST", job_family=family)
        self.profile = EvaluationProfile.objects.create(
            name="Profil Test",
            job_family=family,
            quantitative_weight=50,
            qualitative_weight=30,
            attendance_weight=10,
            self_weight=5,
            managerial_weight=5,
        )
        self.manager = Agent.objects.create(
            service=service,
            user=self.manager_user,
            job_position=position,
            evaluation_profile=self.profile,
            full_name="Manager Test",
            matricule="M001",
            email="manager.test@cnas.dz",
        )
        self.employee = Agent.objects.create(
            service=service,
            user=self.employee_user,
            manager=self.manager,
            job_position=position,
            evaluation_profile=self.profile,
            full_name="Employee Test",
            matricule="E001",
            email="employee.test@cnas.dz",
        )
        self.criterion = EvaluationCriterion.objects.create(
            profile=self.profile,
            name="Respect des delais",
            category="quantitative",
            weight=100,
            min_score=0,
            max_score=5,
            is_active=True,
        )

    def test_login_returns_token_and_user(self):
        response = self.client.post(
            "/api/auth/login",
            {"email": self.hr.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], self.hr.email)

    def test_hr_can_create_open_and_assign_campaign(self):
        self.client.force_authenticate(self.hr)
        create_response = self.client.post(
            "/api/evaluation-campaigns",
            {
                "name": "Campagne Test",
                "periodType": "yearly",
                "startDate": "2026-01-01",
                "endDate": "2026-12-31",
                "status": "draft",
                "description": "Campagne test.",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        campaign_id = create_response.data["data"]["id"]

        open_response = self.client.post(f"/api/evaluation-campaigns/{campaign_id}/open", {}, format="json")
        self.assertEqual(open_response.status_code, status.HTTP_200_OK)
        self.assertEqual(open_response.data["data"]["status"], EvaluationCampaign.Status.OPEN)

        assign_response = self.client.post(
            f"/api/evaluation-campaigns/{campaign_id}/assign",
            {"agentIds": [str(self.employee.id)]},
            format="json",
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(assign_response.data["data"]), 1)
        self.assertTrue(Evaluation.objects.filter(campaign_id=campaign_id, agent=self.employee).exists())

    def test_hr_can_delete_campaign_after_assignment(self):
        self.client.force_authenticate(self.hr)
        campaign = EvaluationCampaign.objects.create(
            name="Campagne Suppression",
            period_type="yearly",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=EvaluationCampaign.Status.DRAFT,
        )
        Evaluation.objects.create(
            agent=self.employee,
            campaign=campaign,
            evaluator=self.hr,
            evaluator_name=self.hr.full_name,
            period="2026",
            status=Evaluation.Status.DRAFT,
        )

        assign_response = self.client.post(
            f"/api/evaluation-campaigns/{campaign.id}/assign",
            {"agentIds": [str(self.employee.id)]},
            format="json",
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(f"/api/evaluation-campaigns/{campaign.id}")
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertFalse(EvaluationCampaign.objects.filter(id=campaign.id).exists())
        self.assertEqual(Evaluation.objects.filter(agent=self.employee, period="2026", campaign__isnull=False).count(), 0)

    def test_manager_can_submit_evaluation_for_own_team(self):
        campaign = EvaluationCampaign.objects.create(
            name="Campagne Eval",
            period_type="yearly",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=EvaluationCampaign.Status.OPEN,
        )
        self.client.force_authenticate(self.manager_user)

        create_response = self.client.post(
            "/api/evaluations",
            {
                "agentId": str(self.employee.id),
                "campaignId": str(campaign.id),
                "period": "2026",
                "score": 0,
                "status": "draft",
                "evaluatorName": "Manager Test",
                "criteriaScores": [
                    {"criterionId": self.criterion.id, "score": 4, "comment": "Bon niveau."}
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        evaluation_id = create_response.data["data"]["id"]
        submit_response = self.client.post(f"/api/evaluations/{evaluation_id}/submit", {}, format="json")
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data["data"]["status"], Evaluation.Status.SUBMITTED)

    def test_manager_validation_persists_latest_form_changes(self):
        campaign = EvaluationCampaign.objects.create(
            name="Campagne Validation",
            period_type="yearly",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=EvaluationCampaign.Status.OPEN,
        )
        evaluation = Evaluation.objects.create(
            agent=self.employee,
            campaign=campaign,
            evaluator=self.manager_user,
            evaluator_name=self.manager_user.full_name,
            period="2026",
            status=Evaluation.Status.SUBMITTED,
            comments="Ancien commentaire",
        )
        evaluation.criteria_scores.create(criterion=self.criterion, score=2, comment="Ancienne note")

        self.client.force_authenticate(self.manager_user)
        response = self.client.post(
            f"/api/evaluations/{evaluation.id}/validate",
            {
                "approved": True,
                "feedback": "Validation finale",
                "period": "2026-S2",
                "comments": "Nouveau commentaire manager",
                "criteriaScores": [
                    {"criterionId": self.criterion.id, "score": 5, "comment": "Note mise a jour"}
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], Evaluation.Status.MANAGER_VALIDATED)
        self.assertEqual(response.data["data"]["period"], "2026-S2")
        self.assertIn("Nouveau commentaire manager", response.data["data"]["comments"])
        self.assertEqual(response.data["data"]["criteriaScores"][0]["score"], "5.00")
        evaluation.refresh_from_db()
        self.assertEqual(evaluation.period, "2026-S2")
        self.assertEqual(str(evaluation.criteria_scores.get(criterion=self.criterion).score), "5.00")

    def test_campaign_assignments_expose_latest_evaluation_state(self):
        campaign = EvaluationCampaign.objects.create(
            name="Campagne Suivi",
            period_type="yearly",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=EvaluationCampaign.Status.OPEN,
        )
        evaluation = Evaluation.objects.create(
            agent=self.employee,
            campaign=campaign,
            evaluator=self.manager_user,
            evaluator_name=self.manager_user.full_name,
            period="2026",
            status=Evaluation.Status.DRAFT,
            final_score=68,
        )
        self.client.force_authenticate(self.hr)
        assign_response = self.client.post(
            f"/api/evaluation-campaigns/{campaign.id}/assign",
            {"agentIds": [str(self.employee.id)]},
            format="json",
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.manager_user)
        validate_response = self.client.post(
            f"/api/evaluations/{evaluation.id}/validate",
            {
                "approved": True,
                "feedback": "Validation manager",
                "comments": "Version finale manager",
                "criteriaScores": [
                    {"criterionId": self.criterion.id, "score": 4, "comment": "Mis a jour"}
                ],
            },
            format="json",
        )
        self.assertEqual(validate_response.status_code, status.HTTP_400_BAD_REQUEST)

        submit_response = self.client.post(
            f"/api/evaluations/{evaluation.id}/submit",
            {
                "comments": "Soumise apres mise a jour",
                "criteriaScores": [
                    {"criterionId": self.criterion.id, "score": 4, "comment": "Mis a jour"}
                ],
            },
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)

        validate_response = self.client.post(
            f"/api/evaluations/{evaluation.id}/validate",
            {
                "approved": True,
                "feedback": "Validation manager",
                "comments": "Version finale manager",
                "criteriaScores": [
                    {"criterionId": self.criterion.id, "score": 5, "comment": "Final"}
                ],
            },
            format="json",
        )
        self.assertEqual(validate_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.hr)
        assignment_response = self.client.get("/api/campaign-assignments", {"campaignId": str(campaign.id)})
        self.assertEqual(assignment_response.status_code, status.HTTP_200_OK)
        row = assignment_response.data["data"][0]
        evaluation.refresh_from_db()
        self.assertEqual(row["evaluationStatus"], Evaluation.Status.MANAGER_VALIDATED)
        self.assertEqual(row["status"], "in_progress")
        self.assertEqual(row["evaluationFinalScore"], evaluation.final_score)
        self.assertEqual(row["evaluationDisplayScore"], 100)

    def test_employee_can_create_and_submit_self_evaluation(self):
        self.client.force_authenticate(self.employee_user)
        create_response = self.client.post(
            "/api/self-evaluations",
            {
                "period": "2026",
                "overallComment": "Bilan positif.",
                "answers": [
                    {
                        "questionKey": "q1",
                        "sectionKey": "skills",
                        "sectionTitle": "Competences",
                        "questionText": "Auto-positionnement",
                        "answerType": "rating",
                        "score": 4,
                        "comment": "Bonne progression.",
                        "isRequired": True,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        self_eval_id = create_response.data["data"]["id"]
        submit_response = self.client.post(f"/api/self-evaluations/{self_eval_id}/submit", {}, format="json")
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data["data"]["status"], SelfEvaluation.Status.SUBMITTED)

    def test_manager_can_reject_self_evaluation_and_employee_can_edit_again(self):
        self.client.force_authenticate(self.employee_user)
        create_response = self.client.post(
            "/api/self-evaluations",
            {
                "period": "2026",
                "overallComment": "Premiere version.",
                "answers": [
                    {
                        "questionKey": "q1",
                        "sectionKey": "skills",
                        "sectionTitle": "Competences",
                        "questionText": "Auto-positionnement",
                        "answerType": "rating",
                        "score": 3,
                        "comment": "Version initiale.",
                        "isRequired": True,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self_eval_id = create_response.data["data"]["id"]

        submit_response = self.client.post(
            f"/api/self-evaluations/{self_eval_id}/submit",
            {"overallComment": "Version soumise."},
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data["data"]["status"], SelfEvaluation.Status.SUBMITTED)

        self.client.force_authenticate(self.manager_user)
        reject_response = self.client.post(
            f"/api/self-evaluations/{self_eval_id}/review",
            {"approved": False, "feedback": "A completer avant validation."},
            format="json",
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_response.data["data"]["status"], SelfEvaluation.Status.REJECTED)

        self.client.force_authenticate(self.employee_user)
        draft_response = self.client.post(
            f"/api/self-evaluations/{self_eval_id}/draft",
            {
                "overallComment": "Version corrigee apres rejet.",
                "answers": [
                    {
                        "questionKey": "q1",
                        "sectionKey": "skills",
                        "sectionTitle": "Competences",
                        "questionText": "Auto-positionnement",
                        "answerType": "rating",
                        "score": 4,
                        "comment": "Version corrigee.",
                        "isRequired": True,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(draft_response.status_code, status.HTTP_200_OK)
        self.assertEqual(draft_response.data["data"]["status"], SelfEvaluation.Status.DRAFT)
        self.assertEqual(draft_response.data["data"]["overallComment"], "Version corrigee apres rejet.")

    def test_employee_sees_compliance_request_created_by_hr_for_that_employee(self):
        self.client.force_authenticate(self.hr)
        create_response = self.client.post(
            "/api/compliance-requests",
            {
                "requestType": "contestation",
                "employeeId": str(self.employee.id),
                "subject": "Contestation creee par la RH",
                "reason": "Creation depuis le profil RH pour l'employe.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        request_id = create_response.data["data"]["id"]

        request_obj = ComplianceRequest.objects.get(id=request_id)
        self.assertEqual(request_obj.requester, self.hr)
        self.assertEqual(request_obj.employee, self.employee)

        self.client.force_authenticate(self.employee_user)
        list_response = self.client.get("/api/compliance-requests")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]), 1)
        self.assertEqual(str(list_response.data["data"][0]["id"]), str(request_id))
        self.assertEqual(list_response.data["data"][0]["employeeId"], str(self.employee.id))
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.employee_user,
                title="Nouvelle demande de conformite",
                link="/compliance",
            ).exists()
        )

    def test_active_form_version_is_not_modified_and_can_spawn_draft(self):
        self.client.force_authenticate(self.hr)
        active_version = EvaluationFormVersion.objects.create(
            profile=self.profile,
            version=1,
            status=EvaluationFormVersion.Status.ACTIVE,
            title="Formulaire actif",
            description="Version active",
            schema={
                "criteria": [
                    {"id": 1, "name": "Respect des delais", "weight": 100, "category": "quantitative"}
                ]
            },
            created_by=self.hr,
        )

        patch_response = self.client.patch(
            f"/api/evaluation-form-versions/{active_version.id}",
            {"title": "Modification interdite"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST)

        create_response = self.client.post(
            "/api/evaluation-form-versions",
            {
                "profileId": str(self.profile.id),
                "version": 2,
                "status": "draft",
                "title": "Formulaire actif - v2",
                "description": "Nouvelle version brouillon",
                "schema": {
                    "criteria": [
                        {"id": 1, "name": "Respect des delais", "weight": 100, "category": "quantitative"}
                    ]
                },
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["data"]["status"], EvaluationFormVersion.Status.DRAFT)
        self.assertTrue(
            EvaluationFormVersion.objects.filter(
                profile=self.profile,
                version=2,
                status=EvaluationFormVersion.Status.DRAFT,
            ).exists()
        )

    def test_hr_can_update_draft_form_version(self):
        self.client.force_authenticate(self.hr)
        draft_version = EvaluationFormVersion.objects.create(
            profile=self.profile,
            version=1,
            status=EvaluationFormVersion.Status.DRAFT,
            title="Formulaire brouillon",
            description="Version brouillon",
            schema={
                "criteria": [
                    {"id": 1, "name": "Respect des delais", "weight": 100, "category": "quantitative"}
                ]
            },
            created_by=self.hr,
        )

        patch_response = self.client.patch(
            f"/api/evaluation-form-versions/{draft_version.id}",
            {
                "title": "Formulaire brouillon modifie",
                "description": "Version brouillon mise a jour",
                "schema": {
                    "criteria": [
                        {"id": 1, "name": "Respect des delais", "weight": 60, "category": "quantitative"},
                        {"id": 2, "name": "Communication", "weight": 40, "category": "qualitative"},
                    ]
                },
            },
            format="json",
        )

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["data"]["title"], "Formulaire brouillon modifie")
        draft_version.refresh_from_db()
        self.assertEqual(draft_version.description, "Version brouillon mise a jour")


