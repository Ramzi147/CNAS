import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FadeIn from "../components/ui/FadeIn";
import DashboardLayout from "../components/layout/DashboardLayout";
import { evaluationAPI } from "../services/evaluationAPI";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { agentAPI, attendanceRecordAPI, dailyFollowupAPI } from "../services/entityAPI";
import type { Evaluation } from "../types/evaluation";
import type { SelfEvaluation } from "../types/selfEvaluation";
import type { Agent, AttendanceRecord, DailyFollowUp } from "../types/entities";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [team, setTeam] = useState<Agent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [followups, setFollowups] = useState<DailyFollowUp[]>([]);

  useEffect(() => {
    Promise.all([
      evaluationAPI.list(),
      selfEvaluationAPI.list(),
      agentAPI.list(),
      attendanceRecordAPI.list(),
      dailyFollowupAPI.list(undefined, user?.id),
    ])
      .then(([evals, selfEvals, teamRes, attendanceRes, followupRes]) => {
        const allAgents = teamRes.data.data;
        const selfAgent =
          allAgents.find(
            (agent) =>
              agent.userId === user?.id ||
              agent.email?.toLowerCase() === user?.email?.toLowerCase() ||
              agent.fullName?.toLowerCase() === user?.fullName?.toLowerCase()
          ) ?? null;
        const teamAgents = selfAgent
          ? allAgents.filter((agent) => agent.managerId === selfAgent.id)
          : [];

        setEvaluations(evals);
        setSelfEvaluations(selfEvals);
        setTeam(teamAgents);
        setAttendance(
          selfAgent
            ? attendanceRes.data.data.filter((item) => teamAgents.some((agent) => agent.id === item.agentId))
            : []
        );
        setFollowups(followupRes.data.data);
      })
      .catch(() => undefined);
  }, [user?.email, user?.fullName, user?.id]);

  const stats = useMemo(() => evaluationAPI.stats(evaluations), [evaluations]);
  const lateCount = useMemo(() => attendance.filter((item) => item.status === "late").length, [attendance]);
  const absentCount = useMemo(() => attendance.filter((item) => item.status === "absent").length, [attendance]);
  const todo = [
    { label: `${stats.byStatus.draft + stats.byStatus.in_progress} fiches a finaliser`, to: "/evaluations?status=in_progress" },
    { label: `${stats.byStatus.submitted} validations a suivre`, to: "/evaluations?status=submitted" },
    { label: "Consulter les auto-evaluations de l'equipe", to: "/self-evaluations" },
    { label: "Ouvrir une evaluation manager", to: "/evaluations?action=create" },
    { label: "Saisir le suivi quotidien de l'equipe", to: "/daily-followup" },
    { label: "Mettre a jour mon profil manager", to: "/profile" },
  ];

  const kpis = [
    { value: String(team.length), label: "Membres d'equipe" },
    { value: String(stats.byStatus.draft + stats.byStatus.in_progress), label: "En cours" },
    { value: String(stats.byStatus.submitted), label: "Soumises" },
    { value: String(selfEvaluations.filter((item) => item.status === "submitted").length), label: "Auto-eval. soumises" },
    { value: String(lateCount + absentCount), label: "Alertes discipline" },
    { value: `${stats.avgScore} / 100`, label: "Score moyen" },
  ];

  const recent = evaluations.slice(0, 5);
  const notStarted = Math.max(team.length - (stats.byStatus.draft + stats.byStatus.in_progress + stats.byStatus.submitted + stats.byStatus.manager_validated + stats.byStatus.hr_validated), 0);
  const teamAxisData = useMemo(
    () => [
      { name: "Performance", score: averageOf(evaluations, "performanceScore") },
      { name: "Competences", score: averageOf(evaluations, "competencyScore") },
      { name: "Quantitatif", score: averageOf(evaluations, "quantitativeScore") },
      { name: "Qualitatif", score: averageOf(evaluations, "qualitativeScore") },
      { name: "Conformite", score: averageOf(evaluations, "attendanceScore") },
    ],
    [evaluations]
  );
  const managerActions = [
    { label: "Commentaires saisis", value: evaluations.filter((item) => item.comments?.trim()).length },
    { label: "Validations effectuees", value: stats.byStatus.manager_validated + stats.byStatus.hr_validated },
    { label: "Fiches quotidiennes", value: followups.length },
  ];
  const managerAlerts = [
    ...attendance
      .filter((item) => item.status === "late" || item.status === "absent")
      .slice(0, 4)
      .map((item) => ({
        employee: item.agentName ?? item.agentId,
        issue: item.status === "late" ? `${item.minutesLate} min de retard` : "Absence enregistree",
        level: item.date,
      })),
    ...evaluations
      .filter((item) => item.status === "rejected")
      .slice(0, 3)
      .map((item) => ({ employee: item.employeeName, issue: "Evaluation retournee pour correction", level: item.period })),
  ];

  return (
    <DashboardLayout
      panel={
        <>
          <FadeIn delay={400} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">A faire</div>
              <div className="quick-actions quick-actions--compact">
                {todo.map((item, i) => (
                  <button key={i} className="quick-action" onClick={() => navigate(item.to)} style={{ cursor: "pointer" }}>
                    <span className="action-text">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={600} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Controle hierarchique</div>
              <div className="stack-list">
                <div className="metric-row">
                  <span>Validation manager</span>
                  <strong>Obligatoire</strong>
                </div>
                <div className="metric-row">
                  <span>Fiches quotidiennes</span>
                  <strong>{followups.length}</strong>
                </div>
                <div className="metric-row">
                  <span>Alertes presence</span>
                  <strong>{lateCount + absentCount}</strong>
                </div>
                <div className="metric-row">
                  <span>Derniere evaluation</span>
                  <strong>{recent[0] ? `${recent[0].employeeName} - ${recent[0].status}` : "Aucune"}</strong>
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Tableau de bord manager</div>
          <p className="hero-sub">
            Bienvenue {user?.fullName || "Manager"} - validation hierarchique, suivi de l'equipe et alertes de campagne.
          </p>
        </section>
      </FadeIn>

      <FadeIn delay={200}>
        <div className="kpi-grid">
          {kpis.map((k) => (
            <button
              key={k.label}
              type="button"
              className="kpi-card clickable-surface"
              onClick={() => navigate(k.label === "Membres d'equipe" ? "/organization" : "/evaluations")}
              title={`Ouvrir ${k.label}`}
            >
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={320}>
        <section className="panel panel--analytics">
          <div className="panel-title">Profil d'evaluation de mon equipe</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={teamAxisData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#0f3d91" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={420}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Equipe a suivre</div>
            <div className="info-grid info-grid--two">
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/evaluations?action=create")}>
                <div className="info-card__label">Employes non evalues</div>
                <div className="info-card__value">{notStarted}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/daily-followup")}>
                <div className="info-card__label">Objectifs en retard</div>
                <div className="info-card__value">4</div>
              </button>
              {managerActions.map((item) => (
                <button key={item.label} type="button" className="info-card clickable-surface" onClick={() => navigate(item.label === "Fiches quotidiennes" ? "/daily-followup" : "/evaluations")}>
                  <div className="info-card__label">{item.label}</div>
                  <div className="info-card__value">{item.value}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Alertes et derniers signaux</div>
            <div className="timeline-list">
              {managerAlerts.map((item) => (
                <div key={`${item.employee}-${item.issue}`} className="timeline-item">
                  <div className="timeline-item__title">{item.employee}</div>
                  <div className="timeline-item__meta">{item.issue}</div>
                  <div className="timeline-item__time">{item.level}</div>
                </div>
              ))}
              {recent.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="timeline-item clickable-surface"
                  onClick={() => navigate(`/evaluations/${item.id}`)}
                  title={`Ouvrir le questionnaire de ${item.employeeName}`}
                >
                  <div className="timeline-item__title">{item.employeeName}</div>
                  <div className="timeline-item__meta">{item.period} - {item.status}</div>
                  <div className="timeline-item__time">{item.finalScore}/100</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}

function averageOf(items: Evaluation[], field: keyof Pick<Evaluation, "performanceScore" | "competencyScore" | "quantitativeScore" | "qualitativeScore" | "attendanceScore">) {
  const values = items.map((item) => Number(item[field] || 0)).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}
