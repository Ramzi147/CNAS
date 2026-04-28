import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FadeIn from "../components/ui/FadeIn";
import DashboardLayout from "../components/layout/DashboardLayout";
import { evaluationAPI } from "../services/evaluationAPI";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { agentAPI, evaluationProfileAPI } from "../services/entityAPI";
import { evaluationCampaignAPI } from "../services/rankingAPI";
import type { Evaluation } from "../types/evaluation";
import type { SelfEvaluation } from "../types/selfEvaluation";
import type { Agent } from "../types/entities";
import { auditAPI, type AuditEvent } from "../services/auditAPI";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profilesCount, setProfilesCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    Promise.all([
      evaluationAPI.list(),
      selfEvaluationAPI.list(),
      agentAPI.list(),
      evaluationProfileAPI.list(),
      evaluationCampaignAPI.list(),
      auditAPI.list(),
    ])
      .then(([evals, selfEvals, agentRes, profileRes, campaignRes, auditRes]) => {
        setEvaluations(evals);
        setSelfEvaluations(selfEvals);
        setAgents(agentRes.data.data);
        setProfilesCount(profileRes.data.data.length);
        setCampaignsCount(campaignRes.data.data.length);
        setAuditEvents(auditRes.data.data);
      })
      .catch(() => undefined);
  }, []);

  const stats = useMemo(() => evaluationAPI.stats(evaluations), [evaluations]);
  const workflowData = useMemo(
    () => [
      { step: "Brouillon", value: stats.byStatus.draft },
      { step: "En cours", value: stats.byStatus.in_progress },
      { step: "Manager", value: stats.byStatus.submitted + stats.byStatus.manager_validated },
      { step: "DRH valide", value: stats.byStatus.hr_validated },
      { step: "A corriger", value: stats.byStatus.rejected },
    ],
    [stats.byStatus.draft, stats.byStatus.hr_validated, stats.byStatus.in_progress, stats.byStatus.manager_validated, stats.byStatus.rejected, stats.byStatus.submitted]
  );
  const axisData = useMemo(
    () => [
      { axis: "Performance", score: averageOf(evaluations, "performanceScore") },
      { axis: "Competences", score: averageOf(evaluations, "competencyScore") },
      { axis: "Quantitatif", score: averageOf(evaluations, "quantitativeScore") },
      { axis: "Qualitatif", score: averageOf(evaluations, "qualitativeScore") },
      { axis: "Conformite", score: averageOf(evaluations, "attendanceScore") },
    ],
    [evaluations]
  );
  const cards = [
    { title: "Evaluations en attente", value: String(stats.byStatus.submitted + stats.byStatus.manager_validated), hint: "A valider ou corriger", to: "/evaluations?status=manager_validated" },
    { title: "Brouillons", value: String(stats.byStatus.draft + stats.byStatus.in_progress), hint: "En cours de preparation", to: "/evaluations?status=in_progress" },
    { title: "Validees", value: String(stats.byStatus.hr_validated), hint: "Cycle cloture", to: "/evaluations?status=hr_validated" },
    { title: "Auto-eval. soumises", value: String(selfEvaluations.filter((item) => item.status === "submitted").length), hint: "Contexte employe disponible", to: "/self-evaluations?status=submitted" },
    { title: "Agents suivis", value: String(agents.length), hint: "Base RH actuelle", to: "/organization" },
    { title: "Profils metier", value: String(profilesCount), hint: "Grilles d'evaluation", to: "/job-profiles" },
    { title: "Campagnes", value: String(campaignsCount), hint: "Periodes pilotees", to: "/rankings" },
  ];

  const rows = useMemo(
    () =>
      evaluations.slice(0, 6).map((item) => ({
        id: item.id,
        name: item.employeeName,
        unit: item.employeeMatricule,
        status: item.status,
        due: item.period,
      })),
    [evaluations]
  );

  const events24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return auditEvents.filter((item) => +new Date(item.createdAt) >= since).length;
  }, [auditEvents]);
  const complianceRows = [
    { label: "Registre des traitements", value: `${profilesCount + campaignsCount} fiches` },
    { label: "Demandes personnes", value: `${auditEvents.filter((item) => ["export", "rectification", "contestation"].includes(item.action)).length} ouvertes` },
    { label: "Controles de profilage", value: `${stats.byStatus.submitted + stats.byStatus.manager_validated + stats.byStatus.rejected} a revue humaine` },
    { label: "Evenements d'audit 24h", value: String(events24h) },
  ];

  const pieColors = ["#0f3d91", "#1d9bf0", "#14b8a6", "#cbd5e1"];
  const validationFeed = evaluations.filter((item) => item.status === "submitted" || item.status === "manager_validated" || item.status === "hr_validated").slice(0, 5);
  const alerts = [
    { label: "Evaluations a valider", value: stats.byStatus.submitted + stats.byStatus.manager_validated },
    { label: "Retours a corriger", value: stats.byStatus.rejected },
    { label: "Campagnes ouvertes", value: campaignsCount },
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
                  <span className="action-text">Valider les evaluations en attente</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/self-evaluations")}>
                  <span className="action-text">Consulter les auto-evaluations</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/organization")}>
                  <span className="action-text">Consulter l'organisation</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/job-profiles")}>
                  <span className="action-text">Profils et criteres metier</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/profile")}>
                  <span className="action-text">Ouvrir les controles de conformite</span>
                </button>
                <button className="quick-action" onClick={() => navigate("/profile")}>
                  <span className="action-text">Voir mon profil RH</span>
                </button>
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={600} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Consolidation RH et compliance</div>
              <div className="stack-list">
                {complianceRows.map((item) => (
                  <div key={item.label} className="metric-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
                <div className="metric-row">
                  <span>Comparaison limitee</span>
                  <strong>Par famille uniquement</strong>
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Tableau de bord RH</div>
          <p className="hero-sub">
            Pilotage des campagnes, validation RH, controles de profilage et suivi des droits des personnes.
          </p>
        </section>
      </FadeIn>

      <FadeIn delay={200}>
        <div className="kpi-grid">
          {cards.map((c) => (
            <button key={c.title} type="button" className="kpi-card clickable-surface" onClick={() => navigate(c.to)}>
              <div className="kpi-top">
                <div>{c.title}</div>
              </div>
              <div className="kpi-value">{c.value}</div>
              <div className="kpi-label">{c.hint}</div>
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={300}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Scores moyens par axe RH</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={axisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="axis" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0f3d91" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Etat du workflow</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={workflowData} dataKey="value" nameKey="step" outerRadius={92}>
                    {workflowData.map((entry, index) => (
                      <Cell key={entry.step} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={420}>
        <section className="panel panel--analytics">
          <div className="panel-title">Dernieres evaluations a consolider</div>
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Matricule</th>
                <th>Statut</th>
                <th>Periode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="clickable-row" onClick={() => navigate(`/evaluations/${row.id}`)}>
                  <td>{row.name}</td>
                  <td>{row.unit}</td>
                  <td>{row.status}</td>
                  <td>{row.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </FadeIn>

      <FadeIn delay={520}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Alertes RH prioritaires</div>
            <div className="info-grid">
              {alerts.map((item) => (
                <button key={item.label} type="button" className="info-card clickable-surface" onClick={() => navigate(item.label.includes("Campagnes") ? "/rankings" : "/evaluations")}>
                  <div className="info-card__label">{item.label}</div>
                  <div className="info-card__value">{item.value}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Dernieres validations</div>
            <div className="timeline-list">
              {validationFeed.map((item) => (
                <button key={item.id} type="button" className="timeline-item clickable-surface" onClick={() => navigate(`/evaluations/${item.id}`)}>
                  <div className="timeline-item__title">{item.employeeName}</div>
                  <div className="timeline-item__meta">{item.status} - {item.period}</div>
                  <div className="timeline-item__time">{new Date(item.updatedAt).toLocaleDateString()}</div>
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
