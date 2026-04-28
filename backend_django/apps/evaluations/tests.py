from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.evaluations.models import Evaluation, EvaluationCampaign, EvaluationCriterion, EvaluationFormVersion, SelfEvaluation
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
