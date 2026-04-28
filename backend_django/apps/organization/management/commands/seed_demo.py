from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.evaluations.models import EvaluationCampaign, EvaluationCriterion, Evaluation, RankingSnapshot
from apps.organization.models import (
    Agency,
    Structure,
    Service,
    JobFamily,
    JobPosition,
    EvaluationProfile,
    Agent,
    AttendanceRecord,
    DailyFollowUp,
)


class Command(BaseCommand):
    help = "Injecte des donnees de demonstration CNAS"

    def handle(self, *args, **options):
        def ensure_user(email, password, full_name, role):
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={"username": email, "full_name": full_name, "role": role},
            )
            user.username = email
            user.full_name = full_name
            user.role = role
            user.set_password(password)
            user.save()
            return user

        def ensure_agency(code, name, address, city):
            agency, _ = Agency.objects.get_or_create(
                code=code,
                defaults={"name": name, "address": address, "city": city},
            )
            agency.name = name
            agency.address = address
            agency.city = city
            agency.save()
            return agency

        def ensure_structure(code, agency, name, head_of_structure):
            structure, _ = Structure.objects.get_or_create(
                code=code,
                defaults={
                    "agency": agency,
                    "name": name,
                    "head_of_structure": head_of_structure,
                },
            )
            structure.agency = agency
            structure.name = name
            structure.head_of_structure = head_of_structure
            structure.save()
            return structure

        def ensure_service(code, structure, name, service_head):
            service, _ = Service.objects.get_or_create(
                code=code,
                defaults={
                    "structure": structure,
                    "name": name,
                    "service_head": service_head,
                },
            )
            service.structure = structure
            service.name = name
            service.service_head = service_head
            service.save()
            return service

        def ensure_job_position(code, title, category, hierarchy_level, is_quantitative, is_managerial, description=""):
            position, _ = JobPosition.objects.get_or_create(
                code=code,
                defaults={
                    "title": title,
                    "category": category,
                    "hierarchy_level": hierarchy_level,
                    "is_quantitative": is_quantitative,
                    "is_managerial": is_managerial,
                    "description": description,
                },
            )
            position.title = title
            position.category = category
            position.hierarchy_level = hierarchy_level
            position.is_quantitative = is_quantitative
            position.is_managerial = is_managerial
            position.description = description
            position.save()
            return position

        def ensure_job_family(code, name, performance_weight, competency_weight, description=""):
            family, _ = JobFamily.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "performance_weight": performance_weight,
                    "competency_weight": competency_weight,
                    "description": description,
                },
            )
            family.name = name
            family.performance_weight = performance_weight
            family.competency_weight = competency_weight
            family.description = description
            family.save()
            return family

        def ensure_profile(name, target_category, quantitative_weight, qualitative_weight, attendance_weight, self_weight, managerial_weight, description="", job_family=None):
            profile, _ = EvaluationProfile.objects.get_or_create(
                name=name,
                defaults={
                    "job_family": job_family,
                    "target_category": target_category,
                    "quantitative_weight": quantitative_weight,
                    "qualitative_weight": qualitative_weight,
                    "attendance_weight": attendance_weight,
                    "self_weight": self_weight,
                    "managerial_weight": managerial_weight,
                    "description": description,
                },
            )
            profile.job_family = job_family
            profile.target_category = target_category
            profile.quantitative_weight = quantitative_weight
            profile.qualitative_weight = qualitative_weight
            profile.attendance_weight = attendance_weight
            profile.self_weight = self_weight
            profile.managerial_weight = managerial_weight
            profile.description = description
            profile.active = True
            profile.save()
            return profile

        def ensure_agent(
            matricule,
            service,
            full_name,
            position,
            email,
            phone,
            hire_date,
            status="active",
            user=None,
            manager=None,
            job_position=None,
            evaluation_profile=None,
            job_family=None,
        ):
            agent, _ = Agent.objects.get_or_create(
                matricule=matricule,
                defaults={
                    "service": service,
                    "user": user,
                    "manager": manager,
                    "job_position": job_position,
                    "evaluation_profile": evaluation_profile,
                    "job_family": job_family,
                    "full_name": full_name,
                    "position": position,
                    "email": email,
                    "phone": phone,
                    "hire_date": hire_date,
                    "status": status,
                },
            )
            agent.service = service
            agent.user = user
            agent.manager = manager
            agent.job_position = job_position
            agent.evaluation_profile = evaluation_profile
            agent.job_family = job_family or getattr(job_position, "job_family", None) or getattr(evaluation_profile, "job_family", None)
            agent.full_name = full_name
            agent.position = position
            agent.email = email
            agent.phone = phone
            agent.hire_date = hire_date
            agent.status = status
            agent.save()
            return agent

        def ensure_campaign(name, period_type, start_date, end_date, status, description=""):
            campaign, _ = EvaluationCampaign.objects.get_or_create(
                name=name,
                defaults={
                    "period_type": period_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "status": status,
                    "description": description,
                },
            )
            campaign.period_type = period_type
            campaign.start_date = start_date
            campaign.end_date = end_date
            campaign.status = status
            campaign.description = description
            campaign.save()
            return campaign

        def ensure_criterion(profile, name, category, weight, score_type="rating", max_score=5, description=""):
            criterion, _ = EvaluationCriterion.objects.get_or_create(
                profile=profile,
                name=name,
                defaults={
                    "category": category,
                    "weight": weight,
                    "score_type": score_type,
                    "max_score": max_score,
                    "description": description,
                },
            )
            criterion.category = category
            criterion.weight = weight
            criterion.score_type = score_type
            criterion.max_score = max_score
            criterion.description = description
            criterion.save()
            return criterion

        def ensure_evaluation(agent, period, score, status, evaluator, evaluator_name, comments, campaign=None):
            evaluation, _ = Evaluation.objects.get_or_create(
                agent=agent,
                period=period,
                defaults={
                    "campaign": campaign,
                    "score": score,
                    "quantitative_score": score,
                    "qualitative_score": score,
                    "attendance_score": 80,
                    "self_score": 75,
                    "managerial_score": score,
                    "final_score": score,
                    "status": status,
                    "evaluator": evaluator,
                    "evaluator_name": evaluator_name,
                    "comments": comments,
                },
            )
            evaluation.campaign = campaign
            evaluation.score = score
            evaluation.quantitative_score = score
            evaluation.qualitative_score = score
            evaluation.attendance_score = 80
            evaluation.self_score = 75
            evaluation.managerial_score = score
            evaluation.final_score = score
            evaluation.status = status
            evaluation.evaluator = evaluator
            evaluation.evaluator_name = evaluator_name
            evaluation.comments = comments
            evaluation.save()
            return evaluation

        def ensure_attendance(agent, date, status, minutes_late=0, remark="", recorded_by=None):
            record, _ = AttendanceRecord.objects.get_or_create(
                agent=agent,
                date=date,
                defaults={
                    "status": status,
                    "minutes_late": minutes_late,
                    "remark": remark,
                    "recorded_by": recorded_by,
                },
            )
            record.status = status
            record.minutes_late = minutes_late
            record.remark = remark
            record.recorded_by = recorded_by
            record.save()
            return record

        def ensure_followup(agent, manager, date, presence_status, quality_note, discipline_note, remark=""):
            followup, _ = DailyFollowUp.objects.get_or_create(
                agent=agent,
                date=date,
                defaults={
                    "manager": manager,
                    "presence_status": presence_status,
                    "quality_note": quality_note,
                    "discipline_note": discipline_note,
                    "remark": remark,
                },
            )
            followup.manager = manager
            followup.presence_status = presence_status
            followup.quality_note = quality_note
            followup.discipline_note = discipline_note
            followup.remark = remark
            followup.save()
            return followup

        superadmin = ensure_user("superadmin@cnas.dz", "superadmin123", "SuperAdmin CNAS", "superadmin")
        admin = ensure_user("admin@cnas.dz", "admin123", "Admin CNAS", "admin")
        hr_user = ensure_user("rh.alger@cnas.dz", "rh123456", "Nadia Rahal", "hr")
        manager_user = ensure_user("manager.oran@cnas.dz", "manager123", "Karim Boudina", "manager")
        agent_user = ensure_user("agent@cnas.dz", "agent123", "KACI Mohamed Amine", "agent")
        ensure_user("agent.constantine@cnas.dz", "agent123456", "TOUATI Samira", "agent")

        agencies = {
            "alger": ensure_agency(
                "AG-ALG-001",
                "Agence Principale Alger",
                "Boulevard Ernesto Che Guevara, Alger",
                "Alger",
            ),
            "oran": ensure_agency(
                "AG-ORA-002",
                "Agence Oran Centre",
                "Avenue de l'Independance, Oran",
                "Oran",
            ),
            "constantine": ensure_agency(
                "AG-CST-003",
                "Agence Constantine",
                "Rue Larbi Ben M'hidi, Constantine",
                "Constantine",
            ),
            "annaba": ensure_agency(
                "AG-ANN-004",
                "Agence Annaba",
                "Cours de la Revolution, Annaba",
                "Annaba",
            ),
        }

        structures = {
            "rh_alger": ensure_structure(
                "ST-DRH-001",
                agencies["alger"],
                "Direction des Ressources Humaines",
                "Mme Fatima Zahra",
            ),
            "it_alger": ensure_structure(
                "ST-DIT-001",
                agencies["alger"],
                "Direction Informatique",
                "M. Ahmed Said",
            ),
            "ops_oran": ensure_structure(
                "ST-OPS-002",
                agencies["oran"],
                "Direction Operations",
                "M. Karim Boudina",
            ),
            "fin_oran": ensure_structure(
                "ST-FIN-003",
                agencies["oran"],
                "Direction Financiere",
                "Mme Yasmine Benaissa",
            ),
            "rh_constantine": ensure_structure(
                "ST-RHC-004",
                agencies["constantine"],
                "Pole RH Regional",
                "M. Mourad Bekkouche",
            ),
            "acc_annaba": ensure_structure(
                "ST-ACC-005",
                agencies["annaba"],
                "Direction Accueil et Prestations",
                "Mme Lina Benyoucef",
            ),
        }

        services = {
            "recrutement": ensure_service(
                "SV-REC-001",
                structures["rh_alger"],
                "Service Recrutement",
                "Mlle Nadia",
            ),
            "paie": ensure_service(
                "SV-PAY-001",
                structures["rh_alger"],
                "Service Paie",
                "M. Hassan",
            ),
            "systemes": ensure_service(
                "SV-SYS-001",
                structures["it_alger"],
                "Service Systemes",
                "Mlle Leila",
            ),
            "support": ensure_service(
                "SV-SUP-002",
                structures["it_alger"],
                "Service Support",
                "M. Sofiane Ait Ali",
            ),
            "controle": ensure_service(
                "SV-CTL-003",
                structures["ops_oran"],
                "Service Controle Dossiers",
                "Mme Asma Cherif",
            ),
            "comptabilite": ensure_service(
                "SV-CPT-004",
                structures["fin_oran"],
                "Service Comptabilite",
                "M. Nabil Benhamou",
            ),
            "formation": ensure_service(
                "SV-FOR-005",
                structures["rh_constantine"],
                "Service Formation",
                "Mme Samira Touati",
            ),
            "accueil": ensure_service(
                "SV-ACC-006",
                structures["acc_annaba"],
                "Service Accueil",
                "M. Riad Benarous",
            ),
        }

        job_families = {
            "operations": ensure_job_family(
                "JF-OPS",
                "Metiers operationnels",
                65,
                35,
                "Profils orientes volume, delais, conformite et tracabilite.",
            ),
            "support": ensure_job_family(
                "JF-SUP",
                "Fonctions support",
                40,
                60,
                "Profils support davantage evalues sur la qualite, l'analyse et la coordination.",
            ),
            "management": ensure_job_family(
                "JF-MGT",
                "Encadrement et management",
                35,
                65,
                "Profils hierarchiques evalues sur leadership, pilotage et coherence manageriale.",
            ),
        }

        positions = {
            "recruiter": ensure_job_position("POS-REC", "Charge de Recrutement", "support", 2, False, False),
            "hr_assistant": ensure_job_position("POS-HRA", "Assistante RH", "support", 2, False, False),
            "sys_admin": ensure_job_position("POS-SYS", "Administratrice Systemes", "support", 3, True, False),
            "support_tech": ensure_job_position("POS-SUP", "Technicien Support", "execution", 1, True, False),
            "controller": ensure_job_position("POS-CTL", "Controleuse Dossiers", "execution", 1, True, False),
            "accountant": ensure_job_position("POS-CPT", "Comptable Principal", "support", 2, True, False),
            "training_officer": ensure_job_position("POS-FOR", "Chargee de Formation", "support", 2, False, False),
            "reception": ensure_job_position("POS-ACC", "Agent d'Accueil", "execution", 1, True, False),
            "manager": ensure_job_position("POS-MGR", "Responsable de Service", "management", 4, False, True),
        }

        positions["recruiter"].job_family = job_families["support"]
        positions["recruiter"].save(update_fields=["job_family"])
        positions["hr_assistant"].job_family = job_families["support"]
        positions["hr_assistant"].save(update_fields=["job_family"])
        positions["sys_admin"].job_family = job_families["support"]
        positions["sys_admin"].save(update_fields=["job_family"])
        positions["support_tech"].job_family = job_families["operations"]
        positions["support_tech"].save(update_fields=["job_family"])
        positions["controller"].job_family = job_families["operations"]
        positions["controller"].save(update_fields=["job_family"])
        positions["accountant"].job_family = job_families["support"]
        positions["accountant"].save(update_fields=["job_family"])
        positions["training_officer"].job_family = job_families["support"]
        positions["training_officer"].save(update_fields=["job_family"])
        positions["reception"].job_family = job_families["operations"]
        positions["reception"].save(update_fields=["job_family"])
        positions["manager"].job_family = job_families["management"]
        positions["manager"].save(update_fields=["job_family"])

        profiles = {
            "execution": ensure_profile("Profil Execution", "execution", 50, 20, 20, 10, 0, job_family=job_families["operations"]),
            "support": ensure_profile("Profil Support", "support", 25, 45, 15, 15, 0, job_family=job_families["support"]),
            "management": ensure_profile("Profil Management", "management", 15, 35, 15, 10, 25, job_family=job_families["management"]),
        }

        ensure_criterion(profiles["execution"], "Volume traite", "quantitative", 30)
        ensure_criterion(profiles["execution"], "Respect des delais", "quantitative", 20)
        ensure_criterion(profiles["execution"], "Rigueur", "qualitative", 20)
        ensure_criterion(profiles["support"], "Qualite du travail", "qualitative", 25)
        ensure_criterion(profiles["support"], "Communication", "qualitative", 20)
        ensure_criterion(profiles["management"], "Leadership", "managerial", 20)
        ensure_criterion(profiles["management"], "Organisation", "managerial", 20)

        campaign_s2 = ensure_campaign("Campagne S2 2025", "semester", "2025-07-01", "2025-12-31", "closed")
        campaign_s1_2026 = ensure_campaign("Campagne S1 2026", "semester", "2026-01-01", "2026-06-30", "open")

        agents = {
            "karim_manager": ensure_agent(
                "M-10001",
                services["controle"],
                "Karim Boudina",
                "Responsable de Service",
                "manager.oran@cnas.dz",
                "+213660000001",
                "2016-01-05",
                user=manager_user,
                job_position=positions["manager"],
                evaluation_profile=profiles["management"],
                job_family=job_families["management"],
            ),
            "amine": ensure_agent(
                "A-10293",
                services["recrutement"],
                "KACI Mohamed Amine",
                "Charge de Recrutement",
                "kaci.amine@cnas.dz",
                "+213661234567",
                "2020-03-15",
                user=agent_user,
                job_position=positions["recruiter"],
                evaluation_profile=profiles["support"],
                job_family=job_families["support"],
            ),
            "sarrah": ensure_agent(
                "E-55102",
                services["paie"],
                "BENALI Sarrah",
                "Assistante RH",
                "benali.sarrah@cnas.dz",
                "+213662345678",
                "2021-07-20",
                job_position=positions["hr_assistant"],
                evaluation_profile=profiles["support"],
                job_family=job_families["support"],
            ),
            "leila": ensure_agent(
                "I-20814",
                services["systemes"],
                "BOUZIDI Leila",
                "Administratrice Systemes",
                "bouzidi.leila@cnas.dz",
                "+213663456789",
                "2019-11-04",
                job_position=positions["sys_admin"],
                evaluation_profile=profiles["support"],
                job_family=job_families["support"],
            ),
            "sofiane": ensure_agent(
                "I-20815",
                services["support"],
                "AIT ALI Sofiane",
                "Technicien Support",
                "aitali.sofiane@cnas.dz",
                "+213664567890",
                "2022-02-14",
                job_position=positions["support_tech"],
                evaluation_profile=profiles["execution"],
                job_family=job_families["operations"],
            ),
            "asma": ensure_agent(
                "O-33021",
                services["controle"],
                "CHERIF Asma",
                "Controleuse Dossiers",
                "cherif.asma@cnas.dz",
                "+213665678901",
                "2018-09-30",
                job_position=positions["controller"],
                evaluation_profile=profiles["execution"],
                job_family=job_families["operations"],
            ),
            "nabil": ensure_agent(
                "F-44991",
                services["comptabilite"],
                "BENHAMOU Nabil",
                "Comptable Principal",
                "benhamou.nabil@cnas.dz",
                "+213666789012",
                "2017-05-09",
                job_position=positions["accountant"],
                evaluation_profile=profiles["support"],
                job_family=job_families["support"],
            ),
            "samira": ensure_agent(
                "R-77210",
                services["formation"],
                "TOUATI Samira",
                "Chargee de Formation",
                "touati.samira@cnas.dz",
                "+213667890123",
                "2023-01-11",
                user=User.objects.filter(email="agent.constantine@cnas.dz").first(),
                job_position=positions["training_officer"],
                evaluation_profile=profiles["support"],
                job_family=job_families["support"],
            ),
            "riad": ensure_agent(
                "P-88007",
                services["accueil"],
                "BENAROUS Riad",
                "Agent d'Accueil",
                "benarous.riad@cnas.dz",
                "+213668901234",
                "2022-06-01",
                job_position=positions["reception"],
                evaluation_profile=profiles["execution"],
                job_family=job_families["operations"],
            ),
        }

        agents["amine"].manager = agents["karim_manager"]
        agents["amine"].save(update_fields=["manager"])
        agents["sarrah"].manager = agents["karim_manager"]
        agents["sarrah"].save(update_fields=["manager"])
        agents["sofiane"].manager = agents["karim_manager"]
        agents["sofiane"].save(update_fields=["manager"])
        agents["asma"].manager = agents["karim_manager"]
        agents["asma"].save(update_fields=["manager"])
        agents["riad"].manager = agents["karim_manager"]
        agents["riad"].save(update_fields=["manager"])

        ensure_evaluation(
            agents["amine"],
            "2025-S1",
            79,
            "hr_validated",
            admin,
            "Admin CNAS",
            "Bonne maitrise des procedures et bon accompagnement des candidats.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["amine"],
            "2025-S2",
            84,
            "hr_validated",
            admin,
            "Admin CNAS",
            "Tres bon respect des delais. Bonne communication.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["sarrah"],
            "2025-S2",
            62,
            "submitted",
            superadmin,
            "SuperAdmin CNAS",
            "Objectifs partiellement atteints.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["leila"],
            "2025-S2",
            91,
            "hr_validated",
            superadmin,
            "SuperAdmin CNAS",
            "Excellente disponibilite des systemes et pilotage fiable des incidents.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["sofiane"],
            "2025-S2",
            74,
            "submitted",
            admin,
            "Admin CNAS",
            "Support efficace, encore perfectible sur la documentation.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["asma"],
            "2025-S2",
            88,
            "hr_validated",
            admin,
            "Admin CNAS",
            "Tres bon niveau de rigueur dans le traitement et le suivi des dossiers.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["nabil"],
            "2025-S2",
            81,
            "hr_validated",
            superadmin,
            "SuperAdmin CNAS",
            "Bonne tenue comptable et excellent respect des echeances mensuelles.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["samira"],
            "2025-S2",
            69,
            "draft",
            hr_user,
            "Nadia Rahal",
            "Plan de formation bien engage, bilan final en attente.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["riad"],
            "2025-S2",
            76,
            "hr_validated",
            agent_user,
            "KACI Mohamed Amine",
            "Accueil professionnel et retours positifs des assures.",
            campaign=campaign_s2,
        )
        ensure_evaluation(
            agents["asma"],
            "2026-S1",
            86,
            "submitted",
            manager_user,
            "Karim Boudina",
            "Tres bonne tenue des objectifs du debut d'annee, validation manager en attente RH.",
            campaign=campaign_s1_2026,
        )

        ensure_attendance(agents["amine"], "2026-03-29", "present", 0, "RAS", manager_user)
        ensure_attendance(agents["sofiane"], "2026-03-29", "late", 18, "Arrive en retard", manager_user)
        ensure_attendance(agents["riad"], "2026-03-29", "sick_leave", 0, "Conge maladie", manager_user)

        ensure_followup(agents["amine"], manager_user, "2026-03-29", "present", 4, 5, "Bon niveau de coordination.")
        ensure_followup(agents["sofiane"], manager_user, "2026-03-29", "late", 3, 2, "Retard note mais travail correct.")

        ranking_source = [
            ("leila", 91),
            ("asma", 88),
            ("nabil", 81),
            ("amine", 79),
            ("sarrah", 62),
        ]
        family_buckets = {}
        for key, score in ranking_source:
            family_key = agents[key].job_family.code if agents[key].job_family else "unassigned"
            family_buckets.setdefault(family_key, []).append((key, score))

        for family_entries in family_buckets.values():
            family_entries.sort(key=lambda item: item[1], reverse=True)

        for rank, (key, score) in enumerate(ranking_source, start=1):
            family_entries = family_buckets[agents[key].job_family.code]
            family_rank = next(index for index, entry in enumerate(family_entries, start=1) if entry[0] == key)
            best_in_family = family_rank == 1
            worst_in_family = family_rank == len(family_entries)
            RankingSnapshot.objects.update_or_create(
                campaign=campaign_s2,
                employee=agents[key],
                defaults={
                    "service_name": agents[key].service.name,
                    "job_family_name": agents[key].job_family.name if agents[key].job_family else "",
                    "comparison_scope": "Classement intra-famille metier",
                    "rank_global": rank,
                    "rank_service": 1,
                    "rank_job_family": family_rank,
                    "performance_score": max(score - 6, 0),
                    "competency_score": min(score + 3, 100),
                    "final_score": score,
                    "is_best_employee": best_in_family,
                    "is_worst_employee": worst_in_family,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Donnees de demonstration injectees avec succes avec postes, profils, suivi quotidien et classements."
            )
        )
