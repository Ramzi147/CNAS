import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import DashboardLayout from "../components/layout/DashboardLayout";
import FadeIn from "../components/ui/FadeIn";
import { auditAPI, type AuditEvent } from "../services/auditAPI";
import { evaluationAPI } from "../services/evaluationAPI";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { agencyAPI, agentAPI, evaluationProfileAPI, serviceAPI, structureAPI, userAPI } from "../services/entityAPI";
import { evaluationCampaignAPI } from "../services/rankingAPI";
import type { Evaluation } from "../types/evaluation";
import type { SelfEvaluation } from "../types/selfEvaluation";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [counts, setCounts] = useState({
    users: 0,
    agencies: 0,
    structures: 0,
    services: 0,
    agents: 0,
    profiles: 0,
    campaigns: 0,
  });

  useEffect(() => {
    Promise.all([
      auditAPI.list(),
      evaluationAPI.list(),
      selfEvaluationAPI.list(),
      userAPI.list(),
      agencyAPI.list(),
      structureAPI.list(),
      serviceAPI.list(),
      agentAPI.list(),
      evaluationProfileAPI.list(),
      evaluationCampaignAPI.list(),
    ])
      .then(([auditRes, evals, selfEvals, userRes, agencyRes, structureRes, serviceRes, agentRes, profileRes, campaignRes]) => {
        setEvents(auditRes.data.data);
        setEvaluations(evals);
        setSelfEvaluations(selfEvals);
        setCounts({
          users: userRes.data.data.length,
          agencies: agencyRes.data.data.length,
          structures: structureRes.data.data.length,
          services: serviceRes.data.data.length,
          agents: agentRes.data.data.length,
          profiles: profileRes.data.data.length,
          campaigns: campaignRes.data.data.length,
        });
      })
      .catch(() => undefined);
  }, []);

  const stats = useMemo(() => evaluationAPI.stats(evaluations), [evaluations]);
  const events24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return events.filter((item) => +new Date(item.createdAt) >= since).length;
  }, [events]);
  const governanceTrend = useMemo(() => buildAuditTrend(events), [events]);
  const controls = [
    { label: "Profils actifs", value: counts.profiles, to: "/job-profiles" },
    { label: "Campagnes", value: counts.campaigns, to: "/rankings" },
    { label: "Services", value: counts.services, to: "/organization" },
    { label: "Evaluations", value: stats.total, to: "/evaluations" },
  ];
  const quickChecks = useMemo(
    () => [
      { label: "Profilage sous controle humain", value: "Oui" },
      { label: "Transfert hors pays", value: "Non autorise" },
      { label: "DPD de reference", value: "dpd@cnas.dz" },
      { label: "Derniere revue globale", value: events[0] ? new Date(events[0].createdAt).toLocaleDateString() : "-" },
    ],
    [events]
  );

  return (
    <DashboardLayout
      panel={
        <>
          <FadeIn delay={360} direction="right">
            <section className="panel panel--secondary">
              <div className="panel-title">Controles prioritaires</div>
              <div className="quick-actions quick-actions--compact" style={{ marginBottom: 14 }}>
                <button className="quick-action" type="button" onClick={() => navigate("/self-evaluations")}>
                  <span className="action-text">Consulter les auto-evaluations</span>
                </button>
                <button className="quick-action" type="button" onClick={() => navigate("/evaluations")}>
                  <span className="action-text">Ouvrir les evaluations</span>
                </button>
                <button className="quick-action" type="button" onClick={() => navigate("/audit-log")}>
                  <span className="action-text">Analyser l'audit log</span>
                </button>
              </div>
              <div className="stack-list">
                {quickChecks.map((item) => (
                  <div key={item.label} className="metric-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Espace super administrateur</div>
          <p className="hero-sub">
            Gouvernance transverse, supervision des audits, conformite globale et controle des politiques sensibles.
          </p>
        </section>
      </FadeIn>

      <FadeIn delay={180}>
        <div className="kpi-grid">
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/audit-log")}>
            <div className="kpi-value">{events.length}</div>
            <div className="kpi-label">Evenements d'audit sur 5 jours</div>
          </button>
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/users-access")}>
            <div className="kpi-value">{counts.users}</div>
            <div className="kpi-label">Roles a privileges</div>
          </button>
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/evaluations?status=rejected")}>
            <div className="kpi-value">{stats.byStatus.rejected}</div>
            <div className="kpi-label">Alertes critiques ouvertes</div>
          </button>
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/self-evaluations?status=submitted")}>
            <div className="kpi-value">{selfEvaluations.filter((item) => item.status === "submitted").length}</div>
            <div className="kpi-label">Auto-evaluations soumises</div>
          </button>
          <button type="button" className="kpi-card clickable-surface" onClick={() => navigate("/audit-log")}>
            <div className="kpi-value">{events24h}</div>
            <div className="kpi-label">Actions sensibles 24h</div>
          </button>
        </div>
      </FadeIn>

      <FadeIn delay={280}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Volume d'audit et alertes</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={governanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="logs" stroke="#0f3d91" fill="rgba(15,61,145,0.18)" strokeWidth={3} />
                  <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="rgba(239,68,68,0.16)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Perimetre de gouvernance</div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={controls}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f3d91" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="quick-actions quick-actions--compact">
              {controls.map((item) => (
                <button key={item.label} className="quick-action" type="button" onClick={() => navigate(item.to)}>
                  <span className="action-text">Ouvrir {item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={380}>
        <div className="dashboard-grid dashboard-grid--wide">
          <section className="panel panel--analytics">
            <div className="panel-title">Resume des acces sensibles</div>
            <div className="info-grid info-grid--two">
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/users-access")}>
                <div className="info-card__label">Utilisateurs actifs</div>
                <div className="info-card__value">{counts.users}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/rankings")}>
                <div className="info-card__label">Campagnes ouvertes</div>
                <div className="info-card__value">{counts.campaigns}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/organization")}>
                <div className="info-card__label">Structures actives</div>
                <div className="info-card__value">{counts.structures}</div>
              </button>
              <button type="button" className="info-card clickable-surface" onClick={() => navigate("/audit-log")}>
                <div className="info-card__label">Actions sensibles 24h</div>
                <div className="info-card__value">{events24h}</div>
              </button>
            </div>
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Dernieres actions sensibles</div>
            <div className="timeline-list">
              {events.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="timeline-item clickable-surface"
                  onClick={() => navigate(targetForAuditEvent(item))}
                  title="Ouvrir le contexte de cette action"
                >
                  <div className="timeline-item__title">{item.action} - {item.entity}</div>
                  <div className="timeline-item__meta">{item.userEmail || "system"} - {item.reason}</div>
                  <div className="timeline-item__time">{new Date(item.createdAt).toLocaleString()}</div>
                </button>
              ))}
              {events.length === 0 ? (
                <div className="timeline-item">
                  <div className="timeline-item__title">Aucun evenement</div>
                  <div className="timeline-item__meta">Le journal se remplira avec les actions applicatives.</div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}

function targetForAuditEvent(event: AuditEvent) {
  if (event.entity === "evaluation" && event.entityId) {
    return `/evaluations/${event.entityId}`;
  }
  if (event.entity === "self_evaluation" && event.entityId) {
    return `/self-evaluations?selfEvaluationId=${event.entityId}`;
  }
  if (event.entity === "user") {
    return "/users-access";
  }
  return `/audit-log?entity=${encodeURIComponent(event.entity)}`;
}

function buildAuditTrend(events: AuditEvent[]) {
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (4 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, day: date.toLocaleDateString("fr-FR", { weekday: "short" }), logs: 0, alerts: 0 };
  });

  for (const event of events) {
    const key = new Date(event.createdAt).toISOString().slice(0, 10);
    const bucket = days.find((item) => item.key === key);
    if (!bucket) continue;
    bucket.logs += 1;
    if (["suppression", "modification", "rejected"].includes(event.action)) {
      bucket.alerts += 1;
    }
  }

  return days;
}
