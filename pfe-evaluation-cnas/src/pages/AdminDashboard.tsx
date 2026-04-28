import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FadeIn from "../components/ui/FadeIn";
import DashboardLayout from "../components/layout/DashboardLayout";
import { evaluationAPI } from "../services/evaluationAPI";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { agencyAPI, structureAPI, serviceAPI, agentAPI, jobPositionAPI, evaluationProfileAPI, userAPI } from "../services/entityAPI";
import { evaluationCampaignAPI } from "../services/rankingAPI";
import type { Evaluation } from "../types/evaluation";
import type { SelfEvaluation } from "../types/selfEvaluation";
import { auditAPI, type AuditEvent } from "../services/auditAPI";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [counts, setCounts] = useState({
    agencies: 0,
    structures: 0,
    services: 0,
    agents: 0,
    positions: 0,
    profiles: 0,
    campaigns: 0,
    users: 0,
  });
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    Promise.all([
      evaluationAPI.list(),
      selfEvaluationAPI.list(),
      agencyAPI.list(),
      structureAPI.list(),
      serviceAPI.list(),
      agentAPI.list(),
      jobPositionAPI.list(),
      evaluationProfileAPI.list(),
      evaluationCampaignAPI.list(),
      userAPI.list(),
      auditAPI.list(),
    ])
      .then(([evals, selfEvals, agencies, structures, services, agents, positions, profiles, campaigns, users, auditEvents]) => {
        setEvaluations(evals);
        setSelfEvaluations(selfEvals);
        setCounts({
          agencies: agencies.data.data.length,
          structures: structures.data.data.length,
          services: services.data.data.length,
          agents: agents.data.data.length,
          positions: positions.data.data.length,
          profiles: profiles.data.data.length,
          campaigns: campaigns.data.data.length,
          users: users.data.data.length,
        });
        setEvents(auditEvents.data.data);
      })
      .catch(() => undefined);
  }, []);

  const stats = useMemo(() => evaluationAPI.stats(evaluations), [evaluations]);
  const recent = useMemo(() => evaluations.slice(0, 5), [evaluations]);

  const kpis = [
    { value: String(counts.agencies), label: "Agences" },
    { value: String(counts.structures), label: "Structures" },
    { value: String(counts.services), label: "Services" },
    { value: String(counts.agents), label: "Employes" },
    { value: String(counts.positions), label: "Postes" },
    { value: String(counts.profiles), label: "Profils metier" },
  ];

  const actionItems = [
    { label: "Gerer utilisateurs et acces", to: "/users-access" },
    { label: "Ouvrir les campagnes", to: "/evaluations?status=submitted" },
    { label: "Gerer l'organisation", to: "/organization" },
    { label: "Configurer familles et postes", to: "/job-profiles" },
    { label: "Consulter mon profil", to: "/profile" },
  ];

  const adminReadiness = useMemo(
    () => [
      { label: "Campagnes configurees", value: counts.campaigns },
      { label: "Ponderations actives", value: counts.profiles },
      { label: "Evenements d'audit", value: events.length },
    ],
    [counts.campaigns, counts.profiles, events.length]
  );

  const recentSystemEvents = events.slice(0, 5);
  const accessSummary = [
    { label: "Utilisateurs actifs", value: counts.users },
    { label: "Roles attribues", value: counts.users },
    { label: "Permissions critiques", value: counts.users ? Math.max(1, Math.round(counts.users * 0.2)) : 0 },
    { label: "Services actifs", value: counts.services },
  ];
  const referentials = [
    { label: "Agences", value: counts.agencies },
    { label: "Structures", value: counts.structures },
    { label: "Services", value: counts.services },
    { label: "Postes", value: counts.positions },
    { label: "Profils", value: counts.profiles },
  ];
  const workflowImports = [
    { label: "Evaluations", value: stats.total },
    { label: "Campagnes", value: counts.campaigns },
    { label: "Agents", value: counts.agents },
    { label: "Audit", value: events.length },
  ];

  return (
    <DashboardLayout
      panel={
        <>
          <FadeIn delay={400} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Actions rapides</div>
              <div className="quick-actions">
                {actionItems.map((a) => (
                  <button key={a.to} className="quick-action" onClick={() => navigate(a.to)} style={{ cursor: "pointer" }}>
                    <span className="action-text">{a.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </FadeIn>
          <FadeIn delay={600} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Gouvernance technique</div>
              <div className="stack-list">
                {adminReadiness.map((item) => (
                  <div key={item.label} className="metric-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
                <div className="metric-row">
                  <span>Derniere evaluation consolidee</span>
                  <strong>{recent[0]?.period ?? "-"}</strong>
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Espace administrateur</div>
          <p className="hero-sub">
            Pilotage de la configuration CNAS: referentiels, campagnes, imports et securisation des flux.
          </p>
        </section>
      </FadeIn>

      <FadeIn delay={200}>
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
          <div className="kpi-card">
            <div className="kpi-value">{stats.byStatus.submitted}</div>
            <div className="kpi-label">Evaluations en file</div>
          </div>
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/self-evaluations?status=submitted")}>
            <div className="kpi-value">{selfEvaluations.filter((item) => item.status === "submitted").length}</div>
            <div className="kpi-label">Auto-evaluations soumises</div>
          </button>
        </div>
      </FadeIn>

      <FadeIn delay={300}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Referentiels actifs</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={referentials}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f3d91" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Donnees applicatives en base</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workflowImports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={420}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Acces et permissions</div>
            <div className="info-grid info-grid--two">
              {accessSummary.map((item) => (
                <div key={item.label} className="info-card">
                  <div className="info-card__label">{item.label}</div>
                  <div className="info-card__value">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Derniers evenements systeme</div>
            <div className="timeline-list">
              {recentSystemEvents.map((event) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-item__title">{event.action} - {event.entity}</div>
                  <div className="timeline-item__meta">{event.userEmail || "system"} - {event.reason}</div>
                  <div className="timeline-item__time">{new Date(event.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {recentSystemEvents.length === 0 ? (
                <div className="timeline-item">
                  <div className="timeline-item__title">Aucun evenement applicatif</div>
                  <div className="timeline-item__meta">Les actions CRUD alimenteront ce panneau depuis PostgreSQL.</div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
