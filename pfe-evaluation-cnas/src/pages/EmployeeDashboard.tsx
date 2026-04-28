import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FadeIn from "../components/ui/FadeIn";
import DashboardLayout from "../components/layout/DashboardLayout";
import { evaluationAPI } from "../services/evaluationAPI";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { useAuth } from "../context/AuthContext";
import { attendanceRecordAPI, dailyFollowupAPI, agentAPI } from "../services/entityAPI";
import type { Evaluation } from "../types/evaluation";
import type { SelfEvaluation } from "../types/selfEvaluation";
import type { AttendanceRecord, DailyFollowUp, Agent } from "../types/entities";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [followups, setFollowups] = useState<DailyFollowUp[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    Promise.all([evaluationAPI.list(), selfEvaluationAPI.list(), attendanceRecordAPI.list(), dailyFollowupAPI.list(), agentAPI.list()])
      .then(([items, selfEvals, attendanceRes, followupRes, agentRes]) => {
        const mine = user?.fullName ? items.filter((item) => item.employeeName === user.fullName) : items;
        const currentAgent =
          agentRes.data.data.find(
            (item) =>
              item.email?.toLowerCase() === user?.email?.toLowerCase() ||
              item.fullName?.toLowerCase() === user?.fullName?.toLowerCase()
          ) ?? null;

        setEvaluations(mine);
        setSelfEvaluations(selfEvals);
        setAgent(currentAgent);
        setAttendance(
          currentAgent
            ? attendanceRes.data.data.filter((item) => item.agentId === currentAgent.id)
            : []
        );
        setFollowups(
          currentAgent
            ? followupRes.data.data.filter((item) => item.agentId === currentAgent.id)
            : []
        );
      })
      .catch(() => undefined);
  }, [user?.fullName]);

  const stats = useMemo(() => evaluationAPI.stats(evaluations), [evaluations]);
  const latestFollowup = followups[0];
  const latestAttendance = attendance[0];
  const latestEvaluation = evaluations[0];
  const latestPlan = latestEvaluation?.comments?.trim() || "Aucun plan d'action publie pour le moment.";
  const trendData = useMemo(
    () =>
      [...evaluations]
        .reverse()
        .slice(-6)
        .map((item) => ({
          period: item.period,
          performance: item.performanceScore,
          competencies: item.competencyScore,
          global: item.finalScore,
        })),
    [evaluations]
  );
  const skillsData = useMemo(
    () =>
      latestEvaluation
        ? [
            { label: "Performance", score: latestEvaluation.performanceScore, trend: `${latestEvaluation.performanceScore}/100` },
            { label: "Competences", score: latestEvaluation.competencyScore, trend: `${latestEvaluation.competencyScore}/100` },
            { label: "Qualitatif", score: latestEvaluation.qualitativeScore, trend: `${latestEvaluation.qualitativeScore}/100` },
            { label: "Conformite", score: latestEvaluation.attendanceScore, trend: `${latestEvaluation.attendanceScore}/100` },
          ]
        : [],
    [latestEvaluation]
  );

  const kpis = [
    { value: String(stats.byStatus.draft + stats.byStatus.in_progress + stats.byStatus.submitted), label: "Cycle en cours" },
    { value: String(stats.byStatus.hr_validated), label: "Evaluations validees" },
    { value: String(stats.byStatus.rejected), label: "Evaluations rejetees" },
    { value: String(selfEvaluations.filter((item) => item.status === "draft").length), label: "Auto-eval. brouillon" },
    { value: String(attendance.length), label: "Suivis de presence" },
    { value: `${stats.avgScore} / 100`, label: "Score moyen" },
  ];

  return (
    <DashboardLayout
      panel={
        <>
          <FadeIn delay={400} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Actions rapides</div>
              <div className="quick-actions">
                <button className="quick-action" onClick={() => navigate("/evaluations?status=submitted")}>
                  <span className="action-text">Mon cycle d'evaluation</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/self-evaluations")}>
                  <span className="action-text">Remplir mon auto-evaluation</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/evaluations?status=hr_validated")}>
                  <span className="action-text">Mes evaluations validees</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/profile")}>
                  <span className="action-text">Mes competences et mon poste</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/profile")}>
                  <span className="action-text">Mon profil</span>
                </button>
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={600} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Mon suivi personnel</div>
              <div className="stack-list">
                <div className="metric-row">
                  <span>Poste</span>
                  <strong>{agent?.jobPositionTitle || agent?.position || "-"}</strong>
                </div>
                <div className="metric-row">
                  <span>Manager</span>
                  <strong>{agent?.managerName || "-"}</strong>
                </div>
                <div className="metric-row">
                  <span>Derniere presence</span>
                  <strong>{latestAttendance ? `${latestAttendance.date} - ${latestAttendance.status}` : "Aucune donnee"}</strong>
                </div>
                <div className="metric-row">
                  <span>Dernier suivi manager</span>
                  <strong>{latestFollowup ? `${latestFollowup.date} - qualite ${latestFollowup.qualityNote}/5` : "Aucun suivi"}</strong>
                </div>
                <div className="metric-row">
                  <span>Droits disponibles</span>
                  <strong>Export / rectification / contestation</strong>
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Espace employe</div>
          <p className="hero-sub">
            Bienvenue {user?.fullName || "collegue"} - suivez vos evaluations, vos validations et votre score explicable.
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
              onClick={() => navigate("/evaluations")}
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
          <div className="panel-title">Evolution de mes scores</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="performance" stroke="#0f3d91" strokeWidth={3} />
                <Line type="monotone" dataKey="competencies" stroke="#14b8a6" strokeWidth={3} />
                <Line type="monotone" dataKey="global" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-note">
            Le score global est secondaire: la lecture utile reste le profil par axe, les commentaires et le plan de developpement.
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={420}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Mes competences principales</div>
            <div className="timeline-list">
              {skillsData.map((skill) => (
                <button
                  key={skill.label}
                  type="button"
                  className="timeline-item clickable-surface"
                  onClick={() => latestEvaluation && navigate(`/evaluations/${latestEvaluation.id}`)}
                  title="Ouvrir ma derniere evaluation"
                >
                  <div className="timeline-item__title">{skill.label}</div>
                  <div className="timeline-item__meta">Progression recente {skill.trend}</div>
                  <div className="timeline-item__time">{skill.score}/100</div>
                </button>
              ))}
              {skillsData.length === 0 ? (
                <div className="timeline-item">
                  <div className="timeline-item__title">Aucune evaluation publiee</div>
                  <div className="timeline-item__meta">Les competences apparaitront apres une evaluation en base.</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Ma derniere campagne et mon plan d'action</div>
            <div className="info-grid">
              <button type="button" className="info-card clickable-surface" onClick={() => latestEvaluation ? navigate(`/evaluations/${latestEvaluation.id}`) : navigate("/evaluations")}>
                <div className="info-card__label">Statut de campagne</div>
                <div className="info-card__value">{latestEvaluation?.status ?? "Aucune"}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => latestEvaluation ? navigate(`/evaluations/${latestEvaluation.id}`) : navigate("/evaluations")}>
                <div className="info-card__label">Score global</div>
                <div className="info-card__value">{latestEvaluation ? `${latestEvaluation.finalScore}/100` : "-"}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => latestEvaluation ? navigate(`/evaluations/${latestEvaluation.id}`) : navigate("/evaluations")}>
                <div className="info-card__label">Performance</div>
                <div className="info-card__value">{latestEvaluation ? latestEvaluation.performanceScore : "-"}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => latestEvaluation ? navigate(`/evaluations/${latestEvaluation.id}`) : navigate("/evaluations")}>
                <div className="info-card__label">Competences</div>
                <div className="info-card__value">{latestEvaluation ? latestEvaluation.competencyScore : "-"}</div>
              </button>
            </div>
            <div className="dashboard-note">{latestPlan}</div>
          </section>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
