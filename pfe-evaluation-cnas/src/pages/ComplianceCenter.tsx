/**
 * Vue d'ensemble du fichier : ComplianceCenter.tsx
 * Role : page de gestion des demandes de conformite, contestations et suivi.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  complianceAPI,
  type ComplianceRequest,
  type ComplianceRequestStatus,
  type ComplianceRequestType,
  type ProcessingRegister,
} from "../services/complianceAPI";
import { useAuth } from "../context/AuthContext";
import { evaluationAPI } from "../services/evaluationAPI";
import type { Evaluation } from "../types/evaluation";

const requestTypeLabel: Record<ComplianceRequestType, string> = {
  export: "Export",
  rectification: "Rectification",
  contestation: "Contestation",
  correction: "Correction",
};

const statusLabel: Record<ComplianceRequestStatus, string> = {
  open: "Ouverte",
  in_review: "En revue",
  approved: "Approuvee",
  rejected: "Rejetee",
  closed: "Cloturee",
};

const colors = ["#0f3d91", "#14b8a6", "#f59e0b", "#be123c"];

export default function ComplianceCenter() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEmployeeView = user?.role === "employee" || user?.role === "agent";
  const isManagerView = user?.role === "manager";
  const canTreatRequests = ["superadmin", "admin", "hr"].includes(user?.role ?? "");
  const [requests, setRequests] = useState<ComplianceRequest[]>([]);
  const [registers, setRegisters] = useState<ProcessingRegister[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<ComplianceRequestType>("contestation");
  const [evaluationId, setEvaluationId] = useState("");
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [treatment, setTreatment] = useState<{
    mode: "resolve" | "manager";
    item: ComplianceRequest;
    status?: "approved" | "rejected" | "closed";
    response: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestRes, registerRes, evaluationRows] = await Promise.all([
        complianceAPI.listRequests(),
        complianceAPI.listRegisters(),
        evaluationAPI.list(),
      ]);
      setRequests(requestRes.data.data);
      setRegisters(registerRes.data.data);
      setEvaluations(evaluationRows);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Impossible de charger la conformite.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const linkedEvaluation = searchParams.get("evaluationId");
    const linkedType = searchParams.get("type") as ComplianceRequestType | null;
    if (linkedEvaluation) {
      setEvaluationId(linkedEvaluation);
      setSubject((current) => current || "Contestation de l'evaluation");
    }
    if (linkedType && linkedType in requestTypeLabel) {
      setRequestType(linkedType);
    }
  }, [searchParams]);

  const requestData = useMemo(
    () =>
      (Object.keys(requestTypeLabel) as ComplianceRequestType[]).map((type) => ({
        name: requestTypeLabel[type],
        value: requests.filter((item) => item.requestType === type).length,
      })),
    [requests]
  );

  const openRequests = requests.filter((item) => item.status === "open" || item.status === "in_review").length;
  const profilingReviews = evaluations.filter((item) => item.status === "submitted" || item.status === "rejected").length;

  const submitRequest = async () => {
    if (!subject.trim() || !reason.trim()) {
      setError("Le sujet et le motif sont obligatoires.");
      return;
    }
    setError(null);
    try {
      const evaluation = evaluations.find((item) => item.id === evaluationId);
      await complianceAPI.createRequest({
        requestType,
        evaluationId: evaluationId || undefined,
        employeeId: evaluation?.agentId,
        subject,
        reason,
      });
      setSubject("");
      setReason("");
      setEvaluationId("");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Demande non enregistree.");
    }
  };

  const resolveRequest = async (item: ComplianceRequest, status: "approved" | "rejected" | "closed") => {
    setTreatment({ mode: "resolve", item, status, response: item.response ?? "" });
  };

  const confirmTreatment = async () => {
    if (!treatment) return;
    if (!treatment.response.trim()) {
      setError("La justification est obligatoire.");
      return;
    }
    try {
      if (treatment.mode === "resolve") {
        await complianceAPI.resolveRequest(treatment.item.id, { status: treatment.status ?? "closed", response: treatment.response });
      } else {
        await complianceAPI.managerReview(treatment.item.id, { managerResponse: treatment.response });
      }
      setTreatment(null);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Traitement impossible.");
    }
  };

  const submitManagerReview = async (item: ComplianceRequest) => {
    setTreatment({ mode: "manager", item, response: item.managerResponse ?? "" });
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.kicker}>{isEmployeeView ? "Mes droits" : isManagerView ? "Equipe" : "Conformite"}</div>
          <div style={styles.title}>
            {isEmployeeView
              ? "Mes demandes personnelles"
              : isManagerView
              ? "Contestations de mon equipe"
              : "Centre de conformite et droits des personnes"}
          </div>
          <div style={styles.sub}>
            {isEmployeeView
              ? "Demande d'export, rectification, contestation ou correction liee a vos evaluations."
              : isManagerView
              ? "Consultez les contestations de vos employes et ajoutez un avis avant decision RH."
              : "Registre des traitements, exports controles, rectifications, contestations et corrections auditees."}
          </div>
        </div>
        <div style={styles.heroBadge}>Controle humain obligatoire</div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.metrics}>
        <MetricCard label="Demandes ouvertes" value={String(openRequests)} />
        {!isEmployeeView && !isManagerView ? <MetricCard label="Registres actifs" value={String(registers.filter((item) => item.status === "active").length)} /> : null}
        <MetricCard label="Profilages sous revue" value={String(profilingReviews)} />
        <MetricCard label="Demandes totales" value={String(requests.length)} />
      </div>

      {!isManagerView ? <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardTitle}>Nouvelle demande</div>
          <div style={styles.formGrid}>
            <label style={styles.label}>
              Type
              <select style={styles.input} value={requestType} onChange={(e) => setRequestType(e.target.value as ComplianceRequestType)}>
                {Object.entries(requestTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Evaluation liee
              <select style={styles.input} value={evaluationId} onChange={(e) => setEvaluationId(e.target.value)}>
                <option value="">Sans evaluation precise</option>
                {evaluations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.employeeName} - {item.period} - {item.finalScore}/100
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Sujet
              <input style={styles.input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Exemple: contestation du score S1 2026" />
            </label>
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Motif
              <textarea style={{ ...styles.input, minHeight: 110, resize: "vertical" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification, correction demandee, documents ou faits observes." />
            </label>
          </div>
          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={() => void submitRequest()}>
              Enregistrer la demande
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Demandes par type</div>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={requestData} dataKey="value" nameKey="name" outerRadius={90}>
                  {requestData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div> : null}

      <section style={styles.card}>
        <div style={styles.cardTitle}>Suivi des demandes</div>
        {loading ? <div style={styles.empty}>Chargement...</div> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Sujet</th>
                {!isEmployeeView ? <th style={styles.th}>Employe</th> : null}
                {!isEmployeeView ? <th style={styles.th}>Responsable</th> : null}
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Avis manager</th>
                <th style={styles.th}>Traitement</th>
                {canTreatRequests || isManagerView ? <th style={styles.th}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{requestTypeLabel[item.requestType]}</td>
                  <td style={styles.td}>
                    <strong>{item.subject}</strong>
                    <div style={styles.muted}>{item.reason}</div>
                  </td>
                  {!isEmployeeView ? <td style={styles.td}>{item.employeeName || "-"}</td> : null}
                  {!isEmployeeView ? <td style={styles.td}>{item.assignedManagerName || "-"}</td> : null}
                  <td style={styles.td}>{statusLabel[item.status]}</td>
                  <td style={styles.td}>{item.managerResponse || "-"}</td>
                  <td style={styles.td}>{item.response || "-"}</td>
                  {canTreatRequests ? (
                    <td style={styles.td}>
                      {item.status === "open" || item.status === "in_review" ? (
                        <div style={styles.actionGroup}>
                          <button style={styles.smallBtn} onClick={() => void resolveRequest(item, "approved")}>Approuver</button>
                          <button style={styles.smallBtn} onClick={() => void resolveRequest(item, "rejected")}>Rejeter</button>
                          <button style={styles.smallBtn} onClick={() => void resolveRequest(item, "closed")}>Cloturer</button>
                        </div>
                      ) : (
                        <span style={styles.muted}>Traitee</span>
                      )}
                    </td>
                  ) : isManagerView ? (
                    <td style={styles.td}>
                      {item.requestType === "contestation" && (item.status === "open" || item.status === "in_review") ? (
                        <button style={styles.smallBtn} onClick={() => void submitManagerReview(item)}>Ajouter avis</button>
                      ) : (
                        <span style={styles.muted}>Lecture</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {!loading && requests.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={canTreatRequests ? 8 : isEmployeeView ? 5 : 7}>Aucune demande enregistree.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {!isEmployeeView && !isManagerView ? <section style={styles.card}>
        <div style={styles.cardTitle}>Registre des traitements</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Traitement</th>
                <th style={styles.th}>Finalite</th>
                <th style={styles.th}>Base legale</th>
                <th style={styles.th}>Destinataires</th>
                <th style={styles.th}>Retention</th>
              </tr>
            </thead>
            <tbody>
              {registers.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.name}</td>
                  <td style={styles.td}>{row.purpose}</td>
                  <td style={styles.td}>{row.legalBasis}</td>
                  <td style={styles.td}>{row.recipients}</td>
                  <td style={styles.td}>{row.retentionPeriod}</td>
                </tr>
              ))}
              {!loading && registers.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={5}>Aucun traitement declare dans le registre.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section> : null}

      {treatment ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>
              {treatment.mode === "manager" ? "Avis du responsable hierarchique" : `Traitement DRH : ${statusLabel[treatment.status ?? "closed"]}`}
            </div>
            <div style={styles.modalMeta}>
              <strong>{treatment.item.subject}</strong>
              <span>{requestTypeLabel[treatment.item.requestType]} - {statusLabel[treatment.item.status]}</span>
            </div>
            <label style={styles.label}>
              Justification obligatoire
              <textarea
                style={{ ...styles.input, minHeight: 130, resize: "vertical" }}
                value={treatment.response}
                onChange={(e) => setTreatment({ ...treatment, response: e.target.value })}
                placeholder={treatment.mode === "manager" ? "Avis argumente du responsable..." : "Decision, justification et suite donnee..."}
              />
            </label>
            <div style={styles.modalActions}>
              <button style={styles.smallBtn} onClick={() => setTreatment(null)}>Annuler</button>
              <button style={styles.primaryBtn} onClick={() => void confirmTreatment()}>Valider</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    padding: 24,
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(15,61,145,0.96), rgba(20,184,166,0.84))",
    color: "#fff",
  },
  kicker: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.86 },
  title: { fontSize: 28, fontWeight: 950, marginTop: 8 },
  sub: { marginTop: 8, maxWidth: 720, lineHeight: 1.6, color: "rgba(255,255,255,.86)" },
  heroBadge: { padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.16)", fontWeight: 800 },
  errorBox: { padding: 14, borderRadius: 12, background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.16)", color: "#b91c1c", fontWeight: 700 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 },
  metricCard: { padding: 18, borderRadius: 16, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)" },
  metricValue: { fontSize: 24, fontWeight: 950, color: "#0f172a" },
  metricLabel: { marginTop: 6, color: "#64748b", fontWeight: 700, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, .8fr)", gap: 18 },
  card: { padding: 20, borderRadius: 18, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 14px 30px rgba(15,23,42,.05)" },
  cardTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 16 },
  chartWrap: { minHeight: 260 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 },
  label: { display: "grid", gap: 8, color: "#0f172a", fontWeight: 750, fontSize: 13 },
  input: { padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", width: "100%", fontFamily: "inherit" },
  actions: { marginTop: 16, display: "flex", justifyContent: "flex-end" },
  primaryBtn: { padding: "12px 16px", borderRadius: 12, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  smallBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "white", cursor: "pointer", fontWeight: 700 },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid rgba(15,23,42,.08)" },
  td: { padding: "12px 10px", color: "#0f172a", borderBottom: "1px solid rgba(15,23,42,.06)", verticalAlign: "top", lineHeight: 1.5 },
  muted: { color: "#64748b", fontSize: 12, marginTop: 4, lineHeight: 1.45 },
  empty: { padding: 12, color: "#64748b" },
  modalOverlay: { position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(15,23,42,.45)", zIndex: 50, padding: 20 },
  modal: { width: "min(560px, 100%)", display: "grid", gap: 14, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 24px 70px rgba(15,23,42,.25)" },
  modalTitle: { fontSize: 20, fontWeight: 900, color: "#0f172a" },
  modalMeta: { display: "grid", gap: 4, padding: 12, borderRadius: 12, background: "#f8fafc", color: "#334155" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
};


