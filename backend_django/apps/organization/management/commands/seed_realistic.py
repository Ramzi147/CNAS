from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.evaluations.models import (
    AuditEvent,
    CampaignAssignment,
    ComplianceRequest,
    Evaluation,
    EvaluationCampaign,
    EvaluationCriterion,
    EvaluationFormVersion,
    EvaluationScore,
    ProcessingRegister,
    RankingSnapshot,
    Report,
    Notification,
    SelfEvaluation,
    SelfEvaluationAnswer,
)
from apps.organization.models import (
    Agency,
    Agent,
    AttendanceRecord,
    DailyFollowUp,
    EvaluationProfile,
    JobFamily,
    JobPosition,
    Service,
    Structure,
)


PASSWORD = "Password123!"


class Command(BaseCommand):
    help = "Seed PostgreSQL with a realistic CNAS HR evaluation dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete seeded app data before inserting the realistic dataset.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._reset()

        users = self._seed_users()
        services = self._seed_organization()
        families, positions, profiles = self._seed_jobs()
        criteria = self._seed_criteria(profiles)
        agents = self._seed_agents(users, services, positions, profiles, families)
        campaigns = self._seed_campaigns()
        evaluations = self._seed_evaluations(users, agents, campaigns, criteria)
        self._seed_attendance(users, agents)
        self._seed_rankings(campaigns, evaluations)
        self._seed_assignments(users, agents, campaigns, evaluations)
        self._seed_compliance(users, agents, profiles, evaluations)
        self._seed_reports_and_notifications(users, campaigns)
        self._seed_audit(users, evaluations)

        self.stdout.write(self.style.SUCCESS("Users seeded: 18"))
        self.stdout.write(self.style.SUCCESS("Employees/agents seeded: 15"))
        self.stdout.write(self.style.SUCCESS("Campaigns seeded: 2"))
        self.stdout.write(self.style.SUCCESS(f"Evaluations seeded: {len(evaluations)}"))
        self.stdout.write(self.style.SUCCESS("Criteria scores and self-evaluations seeded"))
        self.stdout.write(self.style.SUCCESS("Database is ready for frontend testing"))
        self.stdout.write("")
        self.stdout.write("Demo credentials:")
        self.stdout.write(f"  superadmin@cnas.dz / {PASSWORD}")
        self.stdout.write(f"  rh.alger@cnas.dz / {PASSWORD}")
        self.stdout.write(f"  manager.it@cnas.dz / {PASSWORD}")
        self.stdout.write(f"  employee.amine@cnas.dz / {PASSWORD}")

    def _reset(self):
        AuditEvent.objects.all().delete()
        Notification.objects.all().delete()
        Report.objects.all().delete()
        ComplianceRequest.objects.all().delete()
        ProcessingRegister.objects.all().delete()
        EvaluationFormVersion.objects.all().delete()
        CampaignAssignment.objects.all().delete()
        RankingSnapshot.objects.all().delete()
        SelfEvaluationAnswer.objects.all().delete()
        SelfEvaluation.objects.all().delete()
        EvaluationScore.objects.all().delete()
        Evaluation.objects.all().delete()
        EvaluationCriterion.objects.all().delete()
        EvaluationCampaign.objects.all().delete()
        DailyFollowUp.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        Agent.objects.all().delete()
        EvaluationProfile.objects.all().delete()
        JobPosition.objects.all().delete()
        JobFamily.objects.all().delete()
        Service.objects.all().delete()
        Structure.objects.all().delete()
        Agency.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write(self.style.WARNING("Existing app data reset"))

    def _user(self, email, full_name, role, is_staff=False, is_superuser=False):
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "full_name": full_name,
                "role": role,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
            },
        )
        user.username = email
        user.full_name = full_name
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(PASSWORD)
        user.save()
        return user

    def _seed_users(self):
        users = {
            "superadmin": self._user("superadmin@cnas.dz", "Super Admin CNAS", User.Role.SUPERADMIN, True, True),
            "hr1": self._user("rh.alger@cnas.dz", "Nadia Rahal", User.Role.HR, True),
            "hr2": self._user("rh.oran@cnas.dz", "Yasmine Benaissa", User.Role.HR, True),
            "manager_it": self._user("manager.it@cnas.dz", "Ahmed Saidi", User.Role.MANAGER),
            "manager_ops": self._user("manager.ops@cnas.dz", "Karim Boudina", User.Role.MANAGER),
            "manager_fin": self._user("manager.fin@cnas.dz", "Mourad Bekkouche", User.Role.MANAGER),
        }
        employee_rows = [
            ("employee.amine@cnas.dz", "Kaci Mohamed Amine"),
            ("employee.sarah@cnas.dz", "Benali Sarah"),
            ("employee.leila@cnas.dz", "Bouzidi Leila"),
            ("employee.sofiane@cnas.dz", "Ait Ali Sofiane"),
            ("employee.asma@cnas.dz", "Cherif Asma"),
            ("employee.nabil@cnas.dz", "Benhamou Nabil"),
            ("employee.samira@cnas.dz", "Touati Samira"),
            ("employee.riad@cnas.dz", "Benarous Riad"),
            ("employee.hind@cnas.dz", "Mansouri Hind"),
            ("employee.ilyes@cnas.dz", "Meziane Ilyes"),
            ("employee.meriem@cnas.dz", "Derradji Meriem"),
            ("employee.yacine@cnas.dz", "Hamdi Yacine"),
        ]
        for index, (email, name) in enumerate(employee_rows, start=1):
            users[f"emp{index}"] = self._user(email, name, User.Role.AGENT)
        return users

    def _seed_organization(self):
        agency, _ = Agency.objects.update_or_create(
            code="AG-ALG-001",
            defaults={"name": "Agence Principale Alger", "address": "Boulevard Ernesto Che Guevara", "city": "Alger"},
        )
        oran, _ = Agency.objects.update_or_create(
            code="AG-ORA-002",
            defaults={"name": "Agence Oran Centre", "address": "Avenue de l'Independance", "city": "Oran"},
        )

        structures = {}
        for code, ag, name, head in [
            ("ST-DRH-001", agency, "Direction des Ressources Humaines", "Nadia Rahal"),
            ("ST-DIT-001", agency, "Direction Informatique", "Ahmed Saidi"),
            ("ST-OPS-001", oran, "Direction Operations", "Karim Boudina"),
            ("ST-FIN-001", oran, "Direction Finance", "Mourad Bekkouche"),
        ]:
            structures[code], _ = Structure.objects.update_or_create(
                code=code,
                defaults={"agency": ag, "name": name, "head_of_structure": head},
            )

        services = {}
        for code, structure_code, name, head in [
            ("SV-RH-REC", "ST-DRH-001", "Service Recrutement", "Nadia Rahal"),
            ("SV-RH-FOR", "ST-DRH-001", "Service Formation", "Samira Touati"),
            ("SV-IT-DEV", "ST-DIT-001", "Service Developpement", "Ahmed Saidi"),
            ("SV-IT-SUP", "ST-DIT-001", "Service Support IT", "Ahmed Saidi"),
            ("SV-OPS-DOS", "ST-OPS-001", "Service Controle Dossiers", "Karim Boudina"),
            ("SV-OPS-ACC", "ST-OPS-001", "Service Accueil Assures", "Karim Boudina"),
            ("SV-FIN-CPT", "ST-FIN-001", "Service Comptabilite", "Mourad Bekkouche"),
            ("SV-FIN-BUD", "ST-FIN-001", "Service Budget", "Mourad Bekkouche"),
        ]:
            services[code], _ = Service.objects.update_or_create(
                code=code,
                defaults={"structure": structures[structure_code], "name": name, "service_head": head},
            )
        return services

    def _seed_jobs(self):
        families = {}
        for code, name, perf, comp, description in [
            ("JF-RH", "Ressources humaines", 40, 60, "Recrutement, formation, accompagnement et administration RH."),
            ("JF-IT", "Systemes d'information", 55, 45, "Developpement, support, exploitation et qualite de service."),
            ("JF-OPS", "Operations et prestations", 65, 35, "Traitement des dossiers, accueil, conformite et delais."),
            ("JF-FIN", "Finance et comptabilite", 50, 50, "Comptabilite, budget, controle et fiabilite des donnees."),
            ("JF-MGT", "Management", 35, 65, "Pilotage, animation, arbitrage et developpement d'equipe."),
        ]:
            families[code], _ = JobFamily.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "performance_weight": perf,
                    "competency_weight": comp,
                    "description": description,
                },
            )

        positions = {}
        for code, family, title, category, level, quantitative, managerial in [
            ("POS-MGR", "JF-MGT", "Responsable de Service", JobPosition.Category.MANAGEMENT, 4, False, True),
            ("POS-RH", "JF-RH", "Charge RH", JobPosition.Category.SUPPORT, 2, False, False),
            ("POS-FOR", "JF-RH", "Charge de Formation", JobPosition.Category.SUPPORT, 2, False, False),
            ("POS-DEV", "JF-IT", "Developpeur Applications", JobPosition.Category.SUPPORT, 3, True, False),
            ("POS-SUP", "JF-IT", "Technicien Support", JobPosition.Category.EXECUTION, 1, True, False),
            ("POS-CTL", "JF-OPS", "Controleur Dossiers", JobPosition.Category.EXECUTION, 1, True, False),
            ("POS-ACC", "JF-OPS", "Agent d'Accueil", JobPosition.Category.EXECUTION, 1, True, False),
            ("POS-CPT", "JF-FIN", "Comptable", JobPosition.Category.SUPPORT, 2, True, False),
            ("POS-BUD", "JF-FIN", "Charge Budget", JobPosition.Category.SUPPORT, 2, True, False),
        ]:
            positions[code], _ = JobPosition.objects.update_or_create(
                code=code,
                defaults={
                    "job_family": families[family],
                    "title": title,
                    "category": category,
                    "hierarchy_level": level,
                    "is_quantitative": quantitative,
                    "is_managerial": managerial,
                },
            )

        profiles = {}
        for key, family, name, category, weights in [
            ("rh", "JF-RH", "Profil RH", JobPosition.Category.SUPPORT, (25, 45, 10, 20, 0)),
            ("it", "JF-IT", "Profil IT", JobPosition.Category.SUPPORT, (45, 30, 10, 15, 0)),
            ("ops", "JF-OPS", "Profil Operations", JobPosition.Category.EXECUTION, (50, 25, 15, 10, 0)),
            ("fin", "JF-FIN", "Profil Finance", JobPosition.Category.SUPPORT, (40, 35, 10, 15, 0)),
            ("mgt", "JF-MGT", "Profil Management", JobPosition.Category.MANAGEMENT, (20, 30, 10, 10, 30)),
        ]:
            quantitative, qualitative, attendance, self_weight, managerial = weights
            profiles[key], _ = EvaluationProfile.objects.update_or_create(
                name=name,
                defaults={
                    "job_family": families[family],
                    "target_category": category,
                    "quantitative_weight": quantitative,
                    "qualitative_weight": qualitative,
                    "attendance_weight": attendance,
                    "self_weight": self_weight,
                    "managerial_weight": managerial,
                    "active": True,
                    "description": f"Grille d'evaluation {name}.",
                },
            )
        return families, positions, profiles

    def _criterion(self, profile, name, category, weight, description):
        criterion, _ = EvaluationCriterion.objects.update_or_create(
            profile=profile,
            name=name,
            defaults={
                "description": description,
                "category": category,
                "score_type": EvaluationCriterion.ScoreType.RATING,
                "weight": weight,
                "min_score": 1,
                "max_score": 5,
                "is_required": True,
            },
        )
        return criterion

    def _seed_criteria(self, profiles):
        criteria = {}
        template = [
            ("Maitrise metier", "quantitative", 20, "Capacite a appliquer les outils et procedures du poste."),
            ("Qualite d'execution", "quantitative", 20, "Fiabilite, precision et respect des standards attendus."),
            ("Respect des delais", "attendance", 15, "Ponctualite operationnelle et tenue des engagements."),
            ("Rigueur", "qualitative", 15, "Organisation personnelle, controle et fiabilite."),
            ("Communication", "qualitative", 15, "Clarte des echanges et cooperation avec les parties prenantes."),
            ("Auto-analyse", "self", 10, "Capacite a identifier ses forces, difficultes et besoins."),
            ("Initiative", "qualitative", 5, "Proposition d'ameliorations utiles au service."),
        ]
        management_extra = [
            ("Leadership", "managerial", 20, "Animation de l'equipe et mobilisation autour des objectifs."),
            ("Pilotage", "managerial", 20, "Suivi des priorites, arbitrage et reporting."),
        ]
        for key, profile in profiles.items():
            rows = template + (management_extra if key == "mgt" else [])
            criteria[key] = [self._criterion(profile, *row) for row in rows]
        return criteria

    def _seed_agents(self, users, services, positions, profiles, families):
        manager_rows = [
            ("MGR-IT", users["manager_it"], "Ahmed Saidi", services["SV-IT-DEV"], "POS-MGR", "mgt", "JF-MGT"),
            ("MGR-OPS", users["manager_ops"], "Karim Boudina", services["SV-OPS-DOS"], "POS-MGR", "mgt", "JF-MGT"),
            ("MGR-FIN", users["manager_fin"], "Mourad Bekkouche", services["SV-FIN-CPT"], "POS-MGR", "mgt", "JF-MGT"),
        ]
        agents = {}
        for matricule, user, name, service, pos, profile, family in manager_rows:
            agents[matricule], _ = Agent.objects.update_or_create(
                matricule=matricule,
                defaults={
                    "service": service,
                    "user": user,
                    "full_name": name,
                    "email": user.email,
                    "position": positions[pos].title,
                    "job_position": positions[pos],
                    "evaluation_profile": profiles[profile],
                    "job_family": families[family],
                    "hire_date": date(2015, 1, 10),
                    "status": Agent.Status.ACTIVE,
                },
            )

        employee_rows = [
            ("EMP-001", "emp1", "SV-RH-REC", "POS-RH", "rh", "JF-RH", "MGR-OPS"),
            ("EMP-002", "emp2", "SV-RH-FOR", "POS-FOR", "rh", "JF-RH", "MGR-OPS"),
            ("EMP-003", "emp3", "SV-IT-DEV", "POS-DEV", "it", "JF-IT", "MGR-IT"),
            ("EMP-004", "emp4", "SV-IT-SUP", "POS-SUP", "it", "JF-IT", "MGR-IT"),
            ("EMP-005", "emp5", "SV-OPS-DOS", "POS-CTL", "ops", "JF-OPS", "MGR-OPS"),
            ("EMP-006", "emp6", "SV-FIN-CPT", "POS-CPT", "fin", "JF-FIN", "MGR-FIN"),
            ("EMP-007", "emp7", "SV-RH-FOR", "POS-FOR", "rh", "JF-RH", "MGR-OPS"),
            ("EMP-008", "emp8", "SV-OPS-ACC", "POS-ACC", "ops", "JF-OPS", "MGR-OPS"),
            ("EMP-009", "emp9", "SV-FIN-BUD", "POS-BUD", "fin", "JF-FIN", "MGR-FIN"),
            ("EMP-010", "emp10", "SV-IT-DEV", "POS-DEV", "it", "JF-IT", "MGR-IT"),
            ("EMP-011", "emp11", "SV-OPS-DOS", "POS-CTL", "ops", "JF-OPS", "MGR-OPS"),
            ("EMP-012", "emp12", "SV-IT-SUP", "POS-SUP", "it", "JF-IT", "MGR-IT"),
        ]
        for index, (matricule, user_key, service, pos, profile, family, manager) in enumerate(employee_rows, start=1):
            user = users[user_key]
            agents[matricule], _ = Agent.objects.update_or_create(
                matricule=matricule,
                defaults={
                    "service": services[service],
                    "user": user,
                    "manager": agents[manager],
                    "full_name": user.full_name,
                    "email": user.email,
                    "phone": f"+21366000{index:04d}",
                    "position": positions[pos].title,
                    "job_position": positions[pos],
                    "evaluation_profile": profiles[profile],
                    "job_family": families[family],
                    "hire_date": date(2018 + (index % 5), (index % 12) + 1, 10),
                    "status": Agent.Status.ACTIVE,
                },
            )
        return agents

    def _seed_campaigns(self):
        c1, _ = EvaluationCampaign.objects.update_or_create(
            name="2025-S1",
            defaults={
                "period_type": EvaluationCampaign.PeriodType.SEMESTER,
                "start_date": date(2025, 1, 1),
                "end_date": date(2025, 6, 30),
                "status": EvaluationCampaign.Status.CLOSED,
                "description": "Campagne semestrielle cloturee.",
            },
        )
        c2, _ = EvaluationCampaign.objects.update_or_create(
            name="2025-S2",
            defaults={
                "period_type": EvaluationCampaign.PeriodType.SEMESTER,
                "start_date": date(2025, 7, 1),
                "end_date": date(2025, 12, 31),
                "status": EvaluationCampaign.Status.OPEN,
                "description": "Campagne active de consolidation DRH.",
            },
        )
        return {"2025-S1": c1, "2025-S2": c2}

    def _scores_for(self, base):
        offsets = [0, -1, 1, 0, -1, 1, 0, 1, -1]
        scores = []
        for offset in offsets:
            scores.append(max(2, min(5, base + offset)))
        return scores

    def _seed_evaluations(self, users, agents, campaigns, criteria_by_profile):
        statuses = [
            Evaluation.Status.HR_VALIDATED,
            Evaluation.Status.SUBMITTED,
            Evaluation.Status.DRAFT,
            Evaluation.Status.REJECTED,
        ]
        employee_agents = [agent for key, agent in agents.items() if key.startswith("EMP-")]
        evaluations = []
        comments = {
            Evaluation.Status.HR_VALIDATED: "Evaluation consolidee. Niveau satisfaisant et plan de developpement suivi.",
            Evaluation.Status.SUBMITTED: "Evaluation soumise par le manager, en attente de consolidation RH.",
            Evaluation.Status.DRAFT: "Saisie en cours. Les commentaires doivent encore etre completes.",
            Evaluation.Status.REJECTED: "Retour RH demande: justification des ecarts et plan d'action a preciser.",
        }

        for index, agent in enumerate(employee_agents):
            for campaign_index, period in enumerate(["2025-S1", "2025-S2"]):
                status = Evaluation.Status.HR_VALIDATED if period == "2025-S1" else statuses[index % len(statuses)]
                evaluator = agent.manager.user if agent.manager and agent.manager.user else users["hr1"]
                evaluation, _ = Evaluation.objects.update_or_create(
                    agent=agent,
                    period=period,
                    defaults={
                        "campaign": campaigns[period],
                        "evaluator": evaluator,
                        "evaluator_name": evaluator.full_name,
                        "status": status,
                        "comments": comments[status],
                    },
                )

                profile_key = {
                    "Profil RH": "rh",
                    "Profil IT": "it",
                    "Profil Operations": "ops",
                    "Profil Finance": "fin",
                    "Profil Management": "mgt",
                }.get(agent.evaluation_profile.name, "ops")

                base = 3 + ((index + campaign_index) % 3)
                criteria = criteria_by_profile[profile_key]
                for criterion, score in zip(criteria, self._scores_for(base)):
                    EvaluationScore.objects.update_or_create(
                        evaluation=evaluation,
                        criterion=criterion,
                        defaults={
                            "score": Decimal(str(score)),
                            "comment": self._criterion_comment(criterion.category, score),
                        },
                    )

                self_eval, _ = SelfEvaluation.objects.update_or_create(
                    evaluation=evaluation,
                    defaults={
                        "employee": agent,
                        "overall_comment": "J'ai atteint mes objectifs principaux et je souhaite renforcer mes competences sur les priorites du prochain semestre.",
                        "submitted_at": None if status == Evaluation.Status.DRAFT else timezone.now(),
                    },
                )
                for criterion, score in zip(criteria, self._scores_for(base)):
                    question_key = f"criterion_{criterion.id}"
                    SelfEvaluationAnswer.objects.update_or_create(
                        self_evaluation=self_eval,
                        question_key=question_key,
                        criterion=criterion,
                        defaults={
                            "section_key": criterion.category,
                            "section_title": criterion.get_category_display(),
                            "question_text": f"Auto-evaluation du critere: {criterion.name}",
                            "answer_type": SelfEvaluationAnswer.AnswerType.RATING,
                            "score": Decimal(str(min(5, score + 1))),
                            "comment": "Auto-appreciation basee sur les realisations du semestre.",
                            "is_required": criterion.is_required,
                        },
                    )

                evaluation.save()
                evaluations.append(evaluation)
        return evaluations

    def _criterion_comment(self, category, score):
        if score >= 5:
            return "Tres bon niveau, impact positif observe sur le service."
        if score == 4:
            return "Niveau satisfaisant, objectifs globalement atteints."
        if score == 3:
            return "Niveau correct avec points d'amelioration identifies."
        return "Accompagnement recommande et suivi rapproche necessaire."

    def _seed_attendance(self, users, agents):
        employee_agents = [agent for key, agent in agents.items() if key.startswith("EMP-")]
        for index, agent in enumerate(employee_agents):
            for offset in range(5):
                day = date(2026, 3, 25) + timedelta(days=offset)
                status = AttendanceRecord.Status.PRESENT
                minutes = 0
                remark = "RAS"
                if index % 5 == 0 and offset == 2:
                    status = AttendanceRecord.Status.LATE
                    minutes = 15 + index
                    remark = "Retard justifie par contrainte de transport."
                if index % 7 == 0 and offset == 4:
                    status = AttendanceRecord.Status.ABSENT
                    remark = "Absence a verifier."
                AttendanceRecord.objects.update_or_create(
                    agent=agent,
                    date=day,
                    defaults={
                        "status": status,
                        "minutes_late": minutes,
                        "remark": remark,
                        "recorded_by": users["hr1"],
                    },
                )
            DailyFollowUp.objects.update_or_create(
                agent=agent,
                date=date(2026, 3, 31),
                defaults={
                    "manager": agent.manager.user if agent.manager and agent.manager.user else users["hr1"],
                    "presence_status": AttendanceRecord.Status.PRESENT,
                    "quality_note": 3 + (index % 3),
                    "discipline_note": 3 + ((index + 1) % 3),
                    "remark": "Suivi quotidien alimente depuis les donnees seed.",
                },
            )

    def _seed_rankings(self, campaigns, evaluations):
        latest = [evaluation for evaluation in evaluations if evaluation.period == "2025-S2"]
        latest.sort(key=lambda item: item.final_score, reverse=True)
        family_groups = {}
        for evaluation in latest:
            code = evaluation.agent.job_family.code if evaluation.agent.job_family else "NA"
            family_groups.setdefault(code, []).append(evaluation)
        for group in family_groups.values():
            group.sort(key=lambda item: item.final_score, reverse=True)

        for rank, evaluation in enumerate(latest, start=1):
            group = family_groups[evaluation.agent.job_family.code]
            family_rank = group.index(evaluation) + 1
            RankingSnapshot.objects.update_or_create(
                campaign=campaigns["2025-S2"],
                employee=evaluation.agent,
                defaults={
                    "service_name": evaluation.agent.service.name,
                    "job_family_name": evaluation.agent.job_family.name if evaluation.agent.job_family else "",
                    "comparison_scope": "Intra-famille metier",
                    "rank_global": rank,
                    "rank_service": 1,
                    "rank_job_family": family_rank,
                    "performance_score": evaluation.performance_score,
                    "competency_score": evaluation.competency_score,
                    "final_score": evaluation.final_score,
                    "is_best_employee": family_rank == 1,
                    "is_worst_employee": family_rank == len(group),
                },
            )

    def _seed_audit(self, users, evaluations):
        rows = [
            ("creation", users["hr1"], "evaluation", evaluations[0].id, "Creation initiale de la campagne"),
            ("modification", users["manager_it"], "evaluation", evaluations[3].id, "Ajustement des commentaires manager"),
            ("validation", users["hr2"], "evaluation", evaluations[5].id, "Validation RH de la fiche"),
            ("rectification", users["hr1"], "evaluation", evaluations[7].id, "Demande de precision sur un ecart"),
            ("export", users["superadmin"], "audit", "EXP-2025-S2", "Export de controle pour la DRH"),
        ]
        for index, (action, user, entity, entity_id, reason) in enumerate(rows):
            AuditEvent.objects.update_or_create(
                action=action,
                entity=entity,
                entity_id=str(entity_id),
                defaults={
                    "user": user,
                    "user_email": user.email,
                    "ip_address": f"127.0.0.{index + 1}",
                    "reason": reason,
                    "metadata": {"seeded": True},
                },
            )

    def _seed_assignments(self, users, agents, campaigns, evaluations):
        by_agent_campaign = {(evaluation.agent_id, evaluation.campaign_id): evaluation for evaluation in evaluations if evaluation.campaign_id}
        for agent_key, agent in agents.items():
            if not agent_key.startswith("EMP-"):
                continue
            for campaign in campaigns.values():
                evaluation = by_agent_campaign.get((agent.id, campaign.id))
                CampaignAssignment.objects.update_or_create(
                    campaign=campaign,
                    employee=agent,
                    defaults={
                        "manager": agent.manager,
                        "evaluation": evaluation,
                        "status": CampaignAssignment.Status.COMPLETED if evaluation and evaluation.status == Evaluation.Status.HR_VALIDATED else CampaignAssignment.Status.ASSIGNED,
                        "due_date": campaign.end_date,
                        "assigned_by": users["hr1"],
                    },
                )

    def _seed_compliance(self, users, agents, profiles, evaluations):
        ProcessingRegister.objects.update_or_create(
            name="Evaluation des competences et performances",
            defaults={
                "purpose": "Organiser les campagnes d'evaluation, consolider les scores et suivre les plans d'action RH.",
                "legal_basis": "Mission d'interet public / gestion des ressources humaines",
                "data_categories": "Identite professionnelle, poste, service, notes, commentaires, statuts de validation.",
                "recipients": "DRH, responsables hierarchiques, administration autorisee",
                "retention_period": "Duree parametrable selon la politique RH CNAS",
                "security_measures": "Authentification JWT, controle d'acces par role, journal d'audit",
                "dpd_contact": "dpd@cnas.dz",
                "status": ProcessingRegister.Status.ACTIVE,
                "created_by": users["superadmin"],
            },
        )
        ProcessingRegister.objects.update_or_create(
            name="Gestion des demandes de droits des personnes",
            defaults={
                "purpose": "Suivre les demandes d'export, rectification, contestation et correction.",
                "legal_basis": "Obligation de transparence et controle humain",
                "data_categories": "Demandeur, evaluation concernee, motif, reponse DRH, historique de traitement.",
                "recipients": "DRH, administrateurs autorises, DPD",
                "retention_period": "Duree parametrable selon la politique de conformite",
                "security_measures": "Journalisation des traitements et restriction par role",
                "dpd_contact": "dpd@cnas.dz",
                "status": ProcessingRegister.Status.ACTIVE,
                "created_by": users["hr1"],
            },
        )

        for profile in profiles.values():
            criteria = list(profile.criteria.all())
            EvaluationFormVersion.objects.update_or_create(
                profile=profile,
                version=1,
                defaults={
                    "status": EvaluationFormVersion.Status.ACTIVE,
                    "title": f"Formulaire {profile.name}",
                    "description": "Version initiale du questionnaire d'evaluation.",
                    "schema": {
                        "criteria": [
                            {
                                "id": criterion.id,
                                "name": criterion.name,
                                "category": criterion.category,
                                "weight": criterion.weight,
                            }
                            for criterion in criteria
                        ]
                    },
                    "activated_at": timezone.now(),
                    "created_by": users["hr1"],
                },
            )

        request_rows = [
            (
                ComplianceRequest.RequestType.CONTESTATION,
                agents["EMP-001"],
                evaluations[0],
                "Contestation du score global",
                "L'employe demande une revue des commentaires lies aux objectifs.",
            ),
            (
                ComplianceRequest.RequestType.RECTIFICATION,
                agents["EMP-002"],
                evaluations[1],
                "Correction du commentaire manager",
                "Une precision doit etre ajoutee concernant la periode d'absence justifiee.",
            ),
            (
                ComplianceRequest.RequestType.EXPORT,
                agents["MGR-OPS"],
                evaluations[2],
                "Export individuel de la fiche",
                "Demande d'export controle de la fiche d'evaluation.",
            ),
        ]
        for request_type, agent, evaluation, subject, reason in request_rows:
            ComplianceRequest.objects.update_or_create(
                request_type=request_type,
                evaluation=evaluation,
                subject=subject,
                defaults={
                    "status": ComplianceRequest.Status.OPEN,
                    "requester": agent.user or users["hr1"],
                    "requester_email": (agent.user.email if agent.user else users["hr1"].email),
                    "employee": agent,
                    "assigned_manager": agent.manager,
                    "reason": reason,
                    "metadata": {"seeded": True},
                },
            )

    def _seed_reports_and_notifications(self, users, campaigns):
        report, _ = Report.objects.update_or_create(
            title="Rapport RH Campagne S2 2025",
            defaults={
                "report_type": Report.ReportType.CAMPAIGN,
                "format": Report.Format.SUMMARY,
                "campaign": campaigns["2025-S2"],
                "generated_by": users["hr1"],
                "summary": {
                    "evaluations": Evaluation.objects.filter(campaign=campaigns["2025-S2"]).count(),
                    "averageScore": 78,
                    "validated": Evaluation.objects.filter(campaign=campaigns["2025-S2"], status=Evaluation.Status.HR_VALIDATED).count(),
                    "pending": Evaluation.objects.filter(campaign=campaigns["2025-S2"], status__in=[Evaluation.Status.SUBMITTED, Evaluation.Status.MANAGER_VALIDATED]).count(),
                },
                "file_name": "rapport-rh-campagne-s2-2025.summary",
            },
        )
        Notification.objects.update_or_create(
            recipient=users["hr1"],
            title="Rapport disponible",
            defaults={
                "message": f"{report.title} a ete genere et historise.",
                "level": Notification.Level.SUCCESS,
                "link": "/reports",
            },
        )
        Notification.objects.update_or_create(
            role=User.Role.HR,
            title="Demandes de conformite ouvertes",
            defaults={
                "message": "Des demandes de rectification, contestation ou export attendent un traitement.",
                "level": Notification.Level.WARNING,
                "link": "/compliance",
            },
        )
        Notification.objects.update_or_create(
            recipient=users["manager_ops"],
            title="Nouvelle contestation equipe",
            defaults={
                "message": "Une contestation employee attend votre avis hierarchique.",
                "level": Notification.Level.WARNING,
                "link": "/compliance?requestType=contestation",
            },
        )
