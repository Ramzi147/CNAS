/**
 * Vue d'ensemble du fichier : Evaluations.tsx
 * Role : page liste des evaluations avec filtres, recherche et actions par role.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { evaluationAPI } from "../services/evaluationAPI";
import { agentAPI } from "../services/entityAPI";
import { evaluationCampaignAPI } from "../services/rankingAPI";
import { reportAPI, type Report } from "../services/reportAPI";
import type { Agent } from "../types/entities";
import type {
  Evaluation,
  CriterionCategory,
  EvaluationCriterionScore,
  EvaluationStatus,
} from "../types/evaluation";

const statusLabel: Record<EvaluationStatus, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  submitted: "Soumise",
  manager_validated: "Validee manager",
  hr_validated: "Validee RH",
  rejected: "Retour / rejet",
};

const categoryMeta = {
  quantitative: { label: "Performance / objectifs", short: "Performance", weight: 30, tone: "#0f3d91" },
  qualitative: { label: "Competences comportementales", short: "Comportement", weight: 30, tone: "#14b8a6" },
  attendance: { label: "Rigueur et conformite", short: "Conformite", weight: 10, tone: "#7c3aed" },
  self: { label: "Auto-evaluation", short: "Auto-eval.", weight: 15, tone: "#d97706" },
  managerial: { label: "Competences manageriales", short: "Managerial", weight: 15, tone: "#be123c" },
} satisfies Record<CriterionCategory, { label: string; short: string; weight: number; tone: string }>;

const workflowSteps = [
  { key: "draft", label: "Brouillon", detail: "Preparation de la fiche" },
  { key: "self", label: "Auto-evaluation", detail: "Regard employe et faits observes" },
  { key: "manager", label: "Evaluation manager", detail: "Notation, commentaires et ecarts" },
  { key: "interview", label: "Entretien", detail: "Points forts, ecarts, objectifs futurs" },
  { key: "hr", label: "Validation RH", detail: "Controle de coherence et consolidation" },
  { key: "published", label: "Publication", detail: "Restitution et plan d'action" },
];

function Badge({ status }: { status: EvaluationStatus }) {
  const palette: Record<EvaluationStatus, { bg: string; color: string }> = {
    draft: { bg: "rgba(148,163,184,.16)", color: "#475569" },
    in_progress: { bg: "rgba(217,119,6,.12)", color: "#b45309" },
    submitted: { bg: "rgba(37,99,235,.12)", color: "#1d4ed8" },
    manager_validated: { bg: "rgba(20,184,166,.12)", color: "#0f766e" },
    hr_validated: { bg: "rgba(34,197,94,.12)", color: "#15803d" },
    rejected: { bg: "rgba(239,68,68,.12)", color: "#dc2626" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: palette[status].bg,
        color: palette[status].color,
      }}
    >
      {statusLabel[status]}
    </span>
  );
}

function computePreview(criteriaScores: EvaluationCriterionScore[]) {
  const valid = criteriaScores.filter((item) => item.criterion && item.criterion.weight > 0);
  if (!valid.length) return 0;
  const weighted = valid.reduce((sum, item) => {
    const maxScore = item.criterion?.maxScore || 100;
    const normalized = maxScore > 0 ? (Number(item.score) / maxScore) * 100 : Number(item.score);
    return sum + normalized * (item.criterion?.weight ?? 0);
  }, 0);
  const weights = valid.reduce((sum, item) => sum + (item.criterion?.weight ?? 0), 0);
  return weights ? Math.round(weighted / weights) : 0;
}

function scoreLevel(score: number) {
  if (score < 50) return "Insuffisant";
  if (score < 65) return "A renforcer";
  if (score < 80) return "Satisfaisant";
  if (score < 90) return "Tres bon";
  return "Excellent";
}

export default function Evaluations() {
  const { user } = useAuth();
  const role = user?.role ?? "agent";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Evaluation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<EvaluationStatus | "all">((searchParams.get("status") as EvaluationStatus | "all") ?? "all");
  const [period, setPeriod] = useState<string>(searchParams.get("period") ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evaluationRows, agentRes, campaignRes] = await Promise.all([
        evaluationAPI.list(),
        agentAPI.list(),
        evaluationCampaignAPI.list(),
      ]);
      setItems(evaluationRows);
      setAgents(agentRes.data.data);
      setCampaigns(campaignRes.data.data.map((item) => ({ id: item.id, name: item.name, status: item.status })));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Impossible de charger les evaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (q.trim()) next.set("q", q);
    else next.delete("q");
    if (status !== "all") next.set("status", status);
    else next.delete("status");
    if (period !== "all") next.set("period", period);
    else next.delete("period");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [period, q, searchParams, setSearchParams, status]);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canCreate(role) && !open) {
      setEditing(null);
      setOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [open, role, searchParams, setSearchParams]);

  const closeEvaluationModal = () => {
    setOpen(false);
    setEditing(null);
    if (searchParams.has("action")) {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  };

  const openCreateEvaluationModal = () => {
    setEditing(null);
    setOpen(true);
    if (searchParams.has("action")) {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  };

  const periods = useMemo(() => ["all", ...Array.from(new Set(items.map((item) => item.period))).sort()], [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const haystack = `${item.employeeName} ${item.employeeMatricule} ${item.evaluatorName} ${item.jobFamilyName ?? ""} ${item.period}`.toLowerCase();
      const matchesQ = q.trim() ? haystack.includes(q.trim().toLowerCase()) : true;
      const matchesStatus = status === "all" ? true : item.status === status;
      const matchesPeriod = period === "all" ? true : item.period === period;
      return matchesQ && matchesStatus && matchesPeriod;
    });
  }, [items, period, q, status]);

  const stats = useMemo(() => evaluationAPI.stats(filtered), [filtered]);
  const topPerformers = useMemo(() => [...filtered].sort((a, b) => b.finalScore - a.finalScore).slice(0, 3), [filtered]);
  const activeCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status === "open").length, [campaigns]);
  const axisScores = useMemo(() => {
    const rows = [
      { key: "quantitative" as CriterionCategory, value: averageOf(filtered, "quantitativeScore") },
      { key: "qualitative" as CriterionCategory, value: averageOf(filtered, "qualitativeScore") },
      { key: "attendance" as CriterionCategory, value: averageOf(filtered, "attendanceScore") },
      { key: "self" as CriterionCategory, value: averageOf(filtered, "selfScore") },
      { key: "managerial" as CriterionCategory, value: averageOf(filtered, "managerialScore") },
    ];
    return rows.map((row) => ({ ...row, ...categoryMeta[row.key] }));
  }, [filtered]);
  const completionRate = stats.total ? Math.round(((stats.byStatus.submitted + stats.byStatus.manager_validated + stats.byStatus.hr_validated) / stats.total) * 100) : 0;
  const developmentNeeds = useMemo(() => filtered.filter((item) => item.finalScore > 0 && item.finalScore < 70).length, [filtered]);

  const exportFromBackend = async (format: Extract<Report["format"], "csv" | "pdf">) => {
    try {
      const reportRes = await reportAPI.create({
        title: `Export ${format.toUpperCase()} des evaluations`,
        reportType: "campaign",
        format,
        filters: {
          generatedFrom: "evaluations-ui",
          format,
          q,
          status,
          period,
          rows: filtered.length,
        },
      });
      const downloadRes = await reportAPI.download(reportRes.data.data.id);
      const blob = new Blob([downloadRes.data], { type: format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = reportRes.data.data.fileName || `evaluations-cnas.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Export backend impossible.");
    }
  };

  const onSave = async (payload: {
    agentId: string;
    campaignId?: string;
    period: string;
    status: EvaluationStatus;
    comments?: string;
    criteriaScores: EvaluationCriterionScore[];
  }) => {
    setSaving(true);
    setError(null);
    try {
      const score = computePreview(payload.criteriaScores);
      const body = {
        ...payload,
        score,
        evaluatorId: user?.id,
        evaluatorName: user?.fullName ?? "-",
      };

      if (editing) {
        await evaluationAPI.update(editing.id, body);
      } else {
        await evaluationAPI.create(body);
      }
      closeEvaluationModal();
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.response?.data?.status?.[0] ?? err?.message ?? "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item: Evaluation, next: EvaluationStatus) => {
    try {
      if (next === "submitted") {
        await evaluationAPI.submit(item.id, {});
      } else if (next === "manager_validated" || next === "hr_validated") {
        await evaluationAPI.validate(item.id, true);
      } else if (next === "rejected") {
        await evaluationAPI.validate(item.id, false);
      } else {
        await evaluationAPI.update(item.id, { status: next });
      }
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.status?.[0] ?? err?.message ?? "Transition non autorisee.");
    }
  };

  const removeItem = async (item: Evaluation) => {
    if (!confirm("Supprimer cette evaluation ?")) return;
    try {
      await evaluationAPI.remove(item.id);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Suppression impossible.");
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.h1}>Evaluations et workflow</div>
          <div style={styles.p}>Questionnaire structure, calcul automatique et validation Responsable puis DRH.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.ghostBtn} onClick={() => void exportFromBackend("pdf")}>
            Export PDF
          </button>
          <button style={styles.ghostBtn} onClick={() => void exportFromBackend("csv")}>
            Export Excel/CSV
          </button>
          {canCreate(role) ? (
            <button style={styles.primaryBtn} onClick={openCreateEvaluationModal}>
              Nouvelle evaluation
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.kpis}>
        <KpiCard label="Evaluations visibles" value={String(stats.total)} onClick={() => setStatus("all")} />
        <KpiCard label="Score moyen" value={`${stats.avgScore} / 100`} onClick={() => setStatus("all")} />
        <KpiCard label="Validation manager" value={String(stats.byStatus.submitted)} onClick={() => setStatus("submitted")} />
        <KpiCard label="Validation DRH" value={String(stats.byStatus.manager_validated)} onClick={() => setStatus("manager_validated")} />
        <KpiCard label="Campagnes ouvertes" value={String(activeCampaigns)} onClick={() => setPeriod("all")} />
        <KpiCard label="Retours / rejets" value={String(stats.byStatus.rejected)} onClick={() => setStatus("rejected")} />
      </div>

      <section style={styles.analyticsShell}>
        <div style={styles.analyticsHeader}>
          <div>
            <div style={styles.panelTitle}>Analytics RH de la campagne</div>
            <div style={styles.muted}>Lecture par axes, workflow de validation et besoins de developpement.</div>
          </div>
          <div style={styles.analyticsScore}>
            <span>{scoreLevel(stats.avgScore)}</span>
            <strong>{stats.avgScore}/100</strong>
          </div>
        </div>
        <div style={styles.analyticsGrid}>
          <div style={styles.largeMetric}>
            <div style={styles.metricLabel}>Taux d'avancement workflow</div>
            <div style={styles.bigNumber}>{completionRate}%</div>
            <ProgressMeter value={completionRate} />
            <div style={styles.muted}>{stats.byStatus.submitted + stats.byStatus.manager_validated + stats.byStatus.hr_validated} evaluations entre validation manager et DRH.</div>
          </div>
          <div style={styles.axisGrid}>
            {axisScores.map((axis) => (
              <button
                key={axis.key}
                type="button"
                className="clickable-surface"
                style={{ ...styles.axisCard, ...styles.resetButton, textAlign: "left" }}
                onClick={() => axis.key === "self" ? navigate("/self-evaluations") : setStatus("all")}
                title={axis.key === "self" ? "Ouvrir les auto-evaluations" : `Filtrer l'axe ${axis.short}`}
              >
                <div style={styles.axisTop}>
                  <span>{axis.short}</span>
                  <strong>{axis.value}/100</strong>
                </div>
                <ProgressMeter value={axis.value} />
                <div style={styles.axisMeta}>Poids cible {axis.weight}% - {scoreLevel(axis.value)}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={styles.workflowStrip}>
          {workflowSteps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className="clickable-surface"
              style={{ ...styles.workflowStep, ...styles.resetButton, textAlign: "left" }}
              onClick={() => navigate(workflowTarget(step.key))}
              title={`Ouvrir ${step.label}`}
            >
              <div style={styles.workflowIndex}>{index + 1}</div>
              <div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div style={styles.summaryGrid}>
        <section style={styles.panel}>
          <div style={styles.panelTitle}>Filtres</div>
          <div style={styles.filters}>
            <input style={styles.input} placeholder="Recherche employe, matricule, famille..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value as EvaluationStatus | "all")}>
              <option value="all">Tous statuts</option>
              <option value="draft">Brouillon</option>
              <option value="in_progress">En cours</option>
              <option value="submitted">Soumise manager</option>
              <option value="manager_validated">Validee manager</option>
              <option value="hr_validated">Validee RH</option>
              <option value="rejected">Rejetee</option>
            </select>
            <select style={styles.input} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Toutes periodes" : item}
                </option>
              ))}
            </select>
            <button style={styles.ghostBtn} onClick={() => (setQ(""), setStatus("all"), setPeriod("all"))}>
              Reinitialiser
            </button>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Top performers</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topPerformers.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className="clickable-surface"
                style={{ ...styles.rankRow, ...styles.resetButton }}
                onClick={() => navigate(`/evaluations/${item.id}`)}
                title={`Ouvrir le questionnaire de ${item.employeeName}`}
              >
                <strong>#{index + 1}</strong>
                <span>{item.employeeName}</span>
                <strong>{item.finalScore}/100</strong>
              </button>
            ))}
            {topPerformers.length === 0 ? <div style={styles.empty}>Aucune evaluation disponible.</div> : null}
          </div>
        </section>
      </div>

      <div style={styles.summaryGrid}>
        <section style={styles.panel}>
          <div style={styles.panelTitle}>Restitution RH exploitable</div>
          <div className="info-grid info-grid--two">
            <div className="info-card">
              <div className="info-card__label">Periode filtree</div>
              <div className="info-card__value">{period === "all" ? "Toutes" : period}</div>
            </div>
            <div className="info-card">
              <div className="info-card__label">Campagnes ouvertes</div>
              <div className="info-card__value">{activeCampaigns}</div>
            </div>
            <div className="info-card">
              <div className="info-card__label">Plans d'action a prevoir</div>
              <div className="info-card__value">{developmentNeeds}</div>
            </div>
            <div className="info-card">
              <div className="info-card__label">Niveau global</div>
              <div className="info-card__value">{scoreLevel(stats.avgScore)}</div>
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Legende de validation</div>
          <div className="timeline-list">
            <div className="timeline-item">
              <div className="timeline-item__title">Brouillon</div>
              <div className="timeline-item__meta">Preparation de l'evaluation et saisie des criteres</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-item__title">Soumis / Manager</div>
              <div className="timeline-item__meta">Relecture, commentaire et validation hierarchique</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-item__title">RH / Valide</div>
              <div className="timeline-item__meta">Consolidation, controle metier et publication finale</div>
            </div>
          </div>
        </section>
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loading}>Chargement des evaluations...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employe</th>
                <th style={styles.th}>Campagne / periode</th>
                <th style={styles.th}>Scores</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Evaluateur</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="clickable-row"
                  onClick={() => navigate(`/evaluations/${item.id}`)}
                  title={`Ouvrir le questionnaire de ${item.employeeName}`}
                >
                  <td style={styles.td}>
                    <div style={{ fontWeight: 800 }}>{item.employeeName}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{item.employeeMatricule}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{item.jobFamilyName || "Famille non renseignee"}</div>
                  </td>
                  <td style={styles.td}>
                    <div>{campaigns.find((campaign) => campaign.id === item.campaignId)?.name ?? "Sans campagne"}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{item.period}</div>
                  </td>
                  <td style={styles.td}>
                    <div>Global: <strong>{item.finalScore}</strong></div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Perf. {item.performanceScore} | Comp. {item.competencyScore}</div>
                  </td>
                  <td style={styles.td}>
                    <Badge status={item.status} />
                  </td>
                  <td style={styles.td}>
                    <div>{item.evaluatorName}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{new Date(item.updatedAt).toLocaleString()}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
                      <button style={styles.smallBtn} onClick={() => navigate(`/evaluations/${item.id}`)}>
                        Ouvrir
                      </button>
                      {canEdit(role, item) ? (
                        <button style={styles.smallBtn} onClick={() => {
                          setEditing(item);
                          setOpen(true);
                        }}>
                          Modifier
                        </button>
                      ) : null}
                      {canSubmit(role, item) ? (
                        <button style={styles.smallBtn} onClick={() => void changeStatus(item, "submitted")}>
                          Soumettre
                        </button>
                      ) : null}
                      {canApprove(role, item) ? (
                        <button style={styles.smallBtn} onClick={() => void changeStatus(item, role === "manager" ? "manager_validated" : "hr_validated")}>
                          {role === "manager" ? "Valider manager" : "Valider RH"}
                        </button>
                      ) : null}
                      {canReject(role, item) ? (
                        <button style={{ ...styles.smallBtn, borderColor: "rgba(220,38,38,.25)" }} onClick={() => void changeStatus(item, "rejected")}>
                          Rejeter
                        </button>
                      ) : null}
                      {canDispute(role, item) ? (
                        <button style={{ ...styles.smallBtn, borderColor: "rgba(217,119,6,.35)" }} onClick={() => navigate(`/compliance?evaluationId=${item.id}&type=contestation`)}>
                          Contester
                        </button>
                      ) : null}
                      {canDelete(role) ? (
                        <button style={{ ...styles.smallBtn, borderColor: "rgba(220,38,38,.25)" }} onClick={() => void removeItem(item)}>
                          Supprimer
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    <div style={styles.empty}>Aucune evaluation pour ce filtre.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {open ? (
        <EvaluationModal
          agents={agents}
          campaigns={campaigns}
          editing={editing}
          role={role}
          saving={saving}
          onClose={closeEvaluationModal}
          onSave={onSave}
        />
      ) : null}
    </div>
  );
}

function averageOf(items: Evaluation[], field: keyof Pick<Evaluation, "quantitativeScore" | "qualitativeScore" | "attendanceScore" | "selfScore" | "managerialScore">) {
  const scored = items.map((item) => Number(item[field] || 0)).filter((value) => Number.isFinite(value) && value > 0);
  return scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : 0;
}

function KpiCard({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="clickable-surface"
      style={{ ...styles.kpiCard, ...styles.resetButton, textAlign: "left" }}
      onClick={onClick}
      title={`${label}: cliquer pour filtrer`}
    >
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
    </button>
  );
}

function ProgressMeter({ value }: { value: number }) {
  const tone = value >= 80 ? "#059669" : value >= 60 ? "#0f3d91" : value >= 40 ? "#d97706" : "#dc2626";

  return (
    <div style={styles.progressTrack} aria-hidden="true">
      <div style={{ ...styles.progressBar, width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} />
    </div>
  );
}

function EvaluationModal({
  agents,
  campaigns,
  editing,
  role,
  saving,
  onClose,
  onSave,
}: {
  agents: Agent[];
  campaigns: Array<{ id: string; name: string; status: string }>;
  editing: Evaluation | null;
  role: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    agentId: string;
    campaignId?: string;
    period: string;
    status: EvaluationStatus;
    comments?: string;
    criteriaScores: EvaluationCriterionScore[];
  }) => Promise<void>;
}) {
  const [agentId, setAgentId] = useState(editing?.agentId ?? agents[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(editing?.campaignId ?? campaigns.find((item) => item.status === "open")?.id ?? "");
  const [period, setPeriod] = useState(editing?.period ?? "2026-S1");
  const [status, setStatus] = useState<EvaluationStatus>(editing?.status ?? (role === "hr" || role === "admin" || role === "superadmin" ? "submitted" : "in_progress"));
  const [comments, setComments] = useState(editing?.comments ?? "");
  const [criteriaScores, setCriteriaScores] = useState<EvaluationCriterionScore[]>(editing?.criteriaScores ?? []);
  const [criteriaLoading, setCriteriaLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId) ?? null, [agentId, agents]);
  const profileId = selectedAgent?.evaluationProfileId ?? null;

  useEffect(() => {
    if (!profileId) {
      setCriteriaScores([]);
      return;
    }
    setCriteriaLoading(true);
    evaluationAPI
      .listCriteria(profileId)
      .then((rows) => {
        setCriteriaScores((current) =>
          rows.map((criterion) => {
            const existing = editing?.criteriaScores.find((item) => item.criterionId === criterion.id) ?? current.find((item) => item.criterionId === criterion.id);
            return {
              criterionId: criterion.id,
              score: existing?.score ?? criterion.minScore,
              comment: existing?.comment ?? "",
              criterion,
            };
          })
        );
      })
      .finally(() => setCriteriaLoading(false));
  }, [editing?.criteriaScores, profileId]);

  const previewScore = useMemo(() => computePreview(criteriaScores), [criteriaScores]);
  const groupedCriteria = useMemo(() => {
    const groups = new Map<CriterionCategory, EvaluationCriterionScore[]>();
    criteriaScores.forEach((item) => {
      const category = item.criterion?.category ?? "qualitative";
      groups.set(category, [...(groups.get(category) ?? []), item]);
    });
    return (Object.keys(categoryMeta) as CriterionCategory[])
      .map((category) => ({
        category,
        meta: categoryMeta[category],
        items: groups.get(category) ?? [],
        score: computePreview(groups.get(category) ?? []),
      }))
      .filter((group) => group.items.length > 0);
  }, [criteriaScores]);

  const updateCriterion = (criterionId: string, field: "score" | "comment", value: number | string) => {
    setCriteriaScores((current) =>
      current.map((item) => (item.criterionId === criterionId ? { ...item, [field]: value } : item))
    );
  };

  const submit = async () => {
    if (!agentId) {
      alert("Selectionnez un employe.");
      return;
    }
    await onSave({
      agentId,
      campaignId: campaignId || undefined,
      period,
      status,
      comments,
      criteriaScores,
    });
  };

  const modal = (
    <div
      style={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="evaluation-modal-title">
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle} id="evaluation-modal-title">{editing ? "Modifier l'evaluation" : "Nouvelle evaluation"}</div>
          <button type="button" style={styles.modalCloseBtn} onClick={onClose} aria-label="Fermer la fenetre">
            Fermer
          </button>
        </div>
        <div style={styles.grid3}>
          <label style={styles.label}>
            Employe
            <select style={styles.input} value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={!!editing}>
              <option value="">Choisir</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName} - {agent.matricule}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Campagne
            <select style={styles.input} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Sans campagne</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Periode
            <input style={styles.input} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-S1" />
          </label>
        </div>

        <div style={styles.scorePreview}>
          <div>
            <strong>Score global previsionnel</strong>
            <div style={{ color: "#64748b", marginTop: 4 }}>Score pondere normalise sur 100, par axe et par critere</div>
            <div style={{ marginTop: 12 }}>
              <ProgressMeter value={previewScore} />
            </div>
          </div>
          <div style={styles.scorePreviewResult}>
            <div style={styles.scorePreviewValue}>{previewScore}/100</div>
            <div style={styles.scorePreviewLevel}>{scoreLevel(previewScore)}</div>
          </div>
        </div>

        <div style={styles.modalSectionTitle}>Questionnaire structure</div>
        {criteriaLoading ? <div style={styles.loading}>Chargement des criteres...</div> : null}
        <div style={styles.modalCriteriaList}>
          {groupedCriteria.map((group) => (
            <section key={group.category} style={styles.criteriaSection}>
              <div style={styles.criteriaSectionHead}>
                <div>
                  <div style={styles.criteriaSectionTitle}>{group.meta.label}</div>
                  <div style={styles.muted}>Poids cible {group.meta.weight}% - score axe {group.score}/100</div>
                </div>
                <div style={{ ...styles.axisPill, borderColor: group.meta.tone, color: group.meta.tone }}>{group.score}/100</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {group.items.map((item) => (
                  <div key={item.criterionId} style={styles.criterionCard}>
                    <div style={styles.criterionHeader}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.criterion?.name}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {item.criterion?.description || "Critere d'evaluation"} | poids {item.criterion?.weight}% | note {item.criterion?.minScore} a {item.criterion?.maxScore}
                        </div>
                      </div>
                      <input
                        style={{ ...styles.input, width: 110 }}
                        type="number"
                        min={item.criterion?.minScore ?? 0}
                        max={item.criterion?.maxScore ?? 5}
                        value={item.score}
                        onChange={(e) => updateCriterion(item.criterionId, "score", Number(e.target.value))}
                      />
                    </div>
                    <ProgressMeter
                      value={
                        item.criterion?.maxScore
                          ? Math.round((Number(item.score) / item.criterion.maxScore) * 100)
                          : 0
                      }
                    />
                    <textarea
                      style={{ ...styles.input, ...styles.textarea, minHeight: 84, resize: "vertical", marginTop: 12 }}
                      placeholder="Commentaire manager, fait observe ou justification de l'ecart"
                      value={item.comment}
                      onChange={(e) => updateCriterion(item.criterionId, "comment", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!criteriaLoading && criteriaScores.length === 0 ? (
            <div style={styles.empty}>Aucun critere disponible pour ce profil. Configure d'abord les profils et criteres.</div>
          ) : null}
        </div>

        <div style={{ ...styles.grid3, marginTop: 16 }}>
          <label style={styles.label}>
            Statut
            <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value as EvaluationStatus)}>
              {statusOptionsForRole(role, editing?.status).map((option) => (
                <option key={option} value={option}>
                  {statusLabel[option]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ ...styles.label, gridColumn: "span 2" }}>
            Synthese qualitative et plan d'action
            <textarea
              style={{ ...styles.input, ...styles.textarea, minHeight: 118, resize: "vertical" }}
              placeholder={"Points forts:\nAxes a ameliorer:\nPlan d'action / formation:\nEcheance de suivi:"}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </label>
        </div>

        <div style={styles.modalActions}>
          <button type="button" style={styles.ghostBtn} onClick={onClose}>
            Annuler
          </button>
          <button type="button" style={styles.primaryBtn} onClick={() => void submit()} disabled={saving || criteriaScores.length === 0}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function statusOptionsForRole(role: string, current?: EvaluationStatus) {
  const unique = new Set<EvaluationStatus>();
  if (current) unique.add(current);
  if (role === "superadmin" || role === "admin" || role === "hr") {
    unique.add("draft");
    unique.add("in_progress");
    unique.add("submitted");
    unique.add("manager_validated");
    unique.add("hr_validated");
    unique.add("rejected");
  } else if (role === "manager") {
    unique.add("draft");
    unique.add("in_progress");
    unique.add("submitted");
    if (current === "submitted" || current === "manager_validated") {
      unique.add("manager_validated");
    }
    unique.add("rejected");
  }
  return Array.from(unique);
}

function canCreate(role: string) {
  return ["superadmin", "admin", "hr", "manager"].includes(role);
}

function canEdit(role: string, item: Evaluation) {
  if (["superadmin", "admin", "hr"].includes(role)) return true;
  if (role === "manager") return item.status !== "hr_validated";
  return false;
}

function canSubmit(role: string, item: Evaluation) {
  return role === "manager" && (item.status === "draft" || item.status === "in_progress" || item.status === "rejected");
}

function canApprove(role: string, item: Evaluation) {
  if (role === "manager") return item.status === "submitted";
  return ["superadmin", "admin", "hr"].includes(role) && (item.status === "submitted" || item.status === "manager_validated");
}

function canReject(role: string, item: Evaluation) {
  if (role === "manager") return item.status === "submitted";
  return ["superadmin", "admin", "hr"].includes(role) && (item.status === "submitted" || item.status === "manager_validated");
}

function canDispute(role: string, item: Evaluation) {
  return ["employee", "agent"].includes(role) && ["manager_validated", "hr_validated", "rejected"].includes(item.status);
}

function canDelete(role: string) {
  return ["superadmin", "admin"].includes(role);
}

function workflowTarget(stepKey: string) {
  if (stepKey === "self") return "/self-evaluations";
  if (stepKey === "manager" || stepKey === "draft") return "/evaluations";
  if (stepKey === "hr") return "/evaluations?status=manager_validated";
  if (stepKey === "published") return "/evaluations?status=hr_validated";
  return "/evaluations";
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  h1: { fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.08 },
  p: { color: "#64748b", marginTop: 6, lineHeight: 1.55, maxWidth: 720 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "stretch" },
  kpiCard: {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 20,
    padding: 18,
    minHeight: 128,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 14px 30px rgba(15,23,42,.06)",
  },
  kpiLabel: { fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.45 },
  kpiValue: { fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 10, lineHeight: 1.05 },
  analyticsShell: {
    background: "linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.96))",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 18px 42px rgba(15,23,42,.08)",
    display: "grid",
    gap: 20,
  },
  analyticsHeader: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" },
  muted: { color: "#64748b", lineHeight: 1.55, fontSize: 13 },
  analyticsScore: {
    minWidth: 190,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(15,61,145,.08)",
    border: "1px solid rgba(15,61,145,.14)",
    display: "grid",
    gap: 5,
    textAlign: "right",
    color: "#0f3d91",
  },
  analyticsGrid: { display: "grid", gridTemplateColumns: "minmax(320px, .75fr) minmax(0, 1.25fr)", gap: 18, alignItems: "stretch" },
  largeMetric: {
    minHeight: 260,
    padding: 22,
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(15,61,145,.95), rgba(20,184,166,.82))",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 18px 36px rgba(15,61,145,.18)",
  },
  metricLabel: { fontSize: 13, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.86 },
  bigNumber: { fontSize: 58, fontWeight: 950, lineHeight: 1 },
  axisGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 14 },
  axisCard: {
    minHeight: 122,
    padding: 17,
    borderRadius: 18,
    background: "white",
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
    display: "grid",
    gap: 12,
  },
  axisTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: "#0f172a", fontWeight: 850 },
  axisMeta: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  workflowStrip: { display: "grid", gridTemplateColumns: "repeat(6, minmax(130px, 1fr))", gap: 10 },
  workflowStep: {
    minHeight: 96,
    padding: 13,
    borderRadius: 16,
    background: "rgba(248,250,252,.9)",
    border: "1px solid rgba(226,232,240,.9)",
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: 10,
    alignItems: "start",
  },
  workflowIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#0f3d91",
    color: "white",
    fontSize: 12,
    fontWeight: 900,
  },
  summaryGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, .85fr)", gap: 16, alignItems: "stretch" },
  panel: {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 14px 30px rgba(15,23,42,.05)",
  },
  panelTitle: { fontWeight: 850, color: "#0f172a", marginBottom: 14, fontSize: 16, lineHeight: 1.3 },
  filters: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 12, alignItems: "center" },
  rankRow: {
    display: "grid",
    gridTemplateColumns: "48px 1fr auto",
    gap: 10,
    alignItems: "center",
    padding: "13px 14px",
    borderRadius: 16,
    background: "rgba(248,250,252,.9)",
    border: "1px solid rgba(226,232,240,.8)",
  },
  resetButton: { appearance: "none", font: "inherit", color: "inherit", width: "100%", border: "inherit" },
  tableCard: {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(15,23,42,.06)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "15px 14px", color: "#64748b", fontSize: 12, borderBottom: "1px solid rgba(15,23,42,.08)", background: "rgba(248,250,252,.9)", letterSpacing: 0.35, textTransform: "uppercase" },
  td: { padding: "15px 14px", borderBottom: "1px solid rgba(15,23,42,.06)", verticalAlign: "top", color: "#0f172a", lineHeight: 1.5 },
  input: { padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", width: "100%", boxShadow: "inset 0 1px 2px rgba(15,23,42,.03)" },
  textarea: { fontFamily: "inherit", lineHeight: 1.5 },
  primaryBtn: { padding: "12px 16px", borderRadius: 12, border: "none", background: "#0f3d91", color: "white", fontWeight: 700, cursor: "pointer", boxShadow: "0 12px 24px rgba(15,61,145,.18)" },
  ghostBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(15,23,42,.04)" },
  smallBtn: { padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "white", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px rgba(15,23,42,.04)" },
  errorBox: { padding: 14, borderRadius: 12, background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.16)", color: "#b91c1c", fontWeight: 700 },
  loading: { padding: 24, textAlign: "center", color: "#64748b" },
  empty: { padding: 12, color: "#64748b" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.58)", display: "grid", placeItems: "center", zIndex: 5000, padding: 16 },
  modal: { width: "min(1120px, 96vw)", maxHeight: "calc(100dvh - 32px)", overflow: "auto", background: "white", borderRadius: 8, padding: 0, boxShadow: "0 24px 50px rgba(15,23,42,.28)", border: "1px solid rgba(148,163,184,.35)" },
  modalHeader: { position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18, padding: "14px 18px", borderBottom: "1px solid rgba(226,232,240,.95)", background: "#fff" },
  modalTitle: { fontSize: 18, fontWeight: 850, color: "#0f172a", lineHeight: 1.15 },
  modalCloseBtn: { padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(148,163,184,.45)", background: "#f8fafc", color: "#334155", cursor: "pointer", fontWeight: 750 },
  modalSectionTitle: { fontWeight: 850, color: "#0f172a", margin: "0 20px 14px", fontSize: 16, lineHeight: 1.3 },
  modalCriteriaList: { display: "grid", gap: 12, padding: "0 20px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "start", padding: "0 20px" },
  label: { display: "grid", gap: 8, color: "#0f172a", fontWeight: 700, fontSize: 13 },
  scorePreview: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    margin: "18px 20px 20px",
    padding: "18px 20px",
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(15,61,145,.08), rgba(20,184,166,.08))",
    border: "1px solid rgba(148,163,184,.16)",
  },
  scorePreviewValue: { fontSize: 30, fontWeight: 900, color: "#0f3d91" },
  scorePreviewResult: { textAlign: "right", minWidth: 140 },
  scorePreviewLevel: { marginTop: 4, color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase" },
  progressTrack: { width: "100%", height: 9, borderRadius: 999, background: "rgba(203,213,225,.6)", overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 999, transition: "width .2s ease" },
  criteriaSection: {
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.86)",
    boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  },
  criteriaSectionHead: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 14 },
  criteriaSectionTitle: { fontSize: 16, fontWeight: 900, color: "#0f172a" },
  axisPill: { padding: "8px 12px", borderRadius: 999, border: "1px solid", background: "white", fontWeight: 900 },
  criterionCard: {
    border: "1px solid rgba(148,163,184,.25)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(248,250,252,.7)",
    boxShadow: "0 8px 18px rgba(15,23,42,.04)",
  },
  criterionHeader: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 12 },
  modalActions: { position: "sticky", bottom: 0, zIndex: 2, display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, padding: "12px 20px", borderTop: "1px solid rgba(226,232,240,.95)", background: "#fff" },
};


