import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentAPI } from "../services/entityAPI";
import { campaignAssignmentAPI, evaluationCampaignAPI, type CampaignAssignment, type EvaluationCampaign } from "../services/rankingAPI";
import type { Agent } from "../types/entities";

const statusLabel = { draft: "Brouillon", open: "Ouverte", closed: "Cloturee" };
const evaluationStatusLabel = {
  draft: "Brouillon",
  in_progress: "En cours",
  submitted: "Soumise",
  manager_validated: "Validee manager",
  hr_validated: "Validee RH",
  rejected: "Rejetee",
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<EvaluationCampaign[]>([]);
  const [assignments, setAssignments] = useState<CampaignAssignment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "Campagne annuelle 2026",
    periodType: "yearly" as EvaluationCampaign["periodType"],
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    description: "Campagne annuelle d'evaluation des competences et performances.",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<EvaluationCampaign | null>(null);

  const load = async () => {
    try {
      const [campaignRes, assignmentRes, agentRes] = await Promise.all([
        evaluationCampaignAPI.list(),
        campaignAssignmentAPI.list(),
        agentAPI.list(),
      ]);
      setCampaigns(campaignRes.data.data);
      setAssignments(assignmentRes.data.data);
      setAgents(agentRes.data.data);
      setSelectedId((current) => current || String(campaignRes.data.data[0]?.id || ""));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedCampaign = campaigns.find((item) => String(item.id) === selectedId);
  const canManageCampaigns = ["superadmin", "admin", "hr"].includes(user?.role ?? "");
  const isManagerView = user?.role === "manager";
  const canOpenCampaign = canManageCampaigns && !!selectedCampaign && selectedCampaign.status !== "open";
  const canCloseCampaign = canManageCampaigns && !!selectedCampaign && selectedCampaign.status !== "closed";
  const selectedAssignments = useMemo(
    () => assignments.filter((item) => String(item.campaignId) === selectedId),
    [assignments, selectedId]
  );
  const selectedAgentCount = selectedAgents.length;

  const changeStatus = async (action: "open" | "close") => {
    if (!selectedCampaign || !canManageCampaigns) return;
    setError(null);
    setNotice(null);
    setBusyAction(action);
    try {
      if (action === "open") await evaluationCampaignAPI.open(selectedCampaign.id);
      else await evaluationCampaignAPI.close(selectedCampaign.id);
      setNotice(action === "open" ? "Campagne ouverte." : "Campagne cloturee.");
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Changement de statut impossible."));
    } finally {
      setBusyAction(null);
    }
  };

  const openEditCampaign = (campaign: EvaluationCampaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      periodType: campaign.periodType,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      description: campaign.description,
    });
  };

  const saveCampaign = async () => {
    if (!canManageCampaigns) {
      setError("Action reservee a l'administration et a la DRH.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAction("save-campaign");
    try {
      if (editingCampaign) {
        await evaluationCampaignAPI.update(editingCampaign.id, form);
        setEditingCampaign(null);
        setNotice("Campagne mise a jour.");
      } else {
        const res = await evaluationCampaignAPI.create({ ...form, status: "draft" });
        setSelectedId(String(res.data.data.id));
        setNotice("Campagne creee.");
      }
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Enregistrement impossible."));
    } finally {
      setBusyAction(null);
    }
  };

  const assign = async () => {
    if (!selectedCampaign || selectedAgents.length === 0 || !canManageCampaigns) return;
    setError(null);
    setNotice(null);
    setBusyAction("assign");
    try {
      const response = await evaluationCampaignAPI.assign(selectedCampaign.id, selectedAgents);
      setSelectedAgents([]);
      setNotice(`${response.data.data.length} affectation(s) disponible(s) pour cette campagne.`);
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Affectation impossible."));
    } finally {
      setBusyAction(null);
    }
  };

  const cancelAssignment = async (assignment: CampaignAssignment) => {
    if (!canManageCampaigns) {
      setError("Action reservee a l'administration et a la DRH.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAction(`cancel-assignment-${assignment.id}`);
    try {
      await campaignAssignmentAPI.update(assignment.id, { status: "cancelled" });
      setNotice("Affectation annulee.");
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Annulation impossible."));
    } finally {
      setBusyAction(null);
    }
  };

  const removeCampaign = async (campaign: EvaluationCampaign) => {
    if (!canManageCampaigns) {
      setError("Action reservee a l'administration et a la DRH.");
      return;
    }
    const confirmed = window.confirm(`Supprimer la campagne "${campaign.name}" ? Les affectations associees seront supprimees.`);
    if (!confirmed) return;
    setError(null);
    setNotice(null);
    setBusyAction(`delete-campaign-${campaign.id}`);
    try {
      await evaluationCampaignAPI.remove(campaign.id);
      setNotice("Campagne supprimee.");
      setSelectedId((current) => (current === String(campaign.id) ? "" : current));
      if (editingCampaign?.id === campaign.id) setEditingCampaign(null);
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Suppression impossible."));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.kicker}>Pilotage RH</div>
          <div style={styles.title}>Campagnes d'evaluation</div>
          <div style={styles.sub}>Creation, ouverture, cloture et affectation explicite des evaluations aux responsables hierarchiques.</div>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}
      {!canManageCampaigns ? (
        <div style={styles.info}>
          {isManagerView
            ? "Cette page vous montre les campagnes contenant des employes de votre equipe. Vous ne pouvez pas les administrer ici, mais vous pouvez ouvrir les fiches d'evaluation deja affectees."
            : "Cette page est visible en lecture seule pour votre role. La creation, la suppression, l'ouverture, la cloture et l'affectation des campagnes sont reservees a la DRH et a l'administration."}
        </div>
      ) : null}

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardTitle}>{editingCampaign ? "Modifier la campagne" : "Nouvelle campagne"}</div>
          <div style={styles.formGrid}>
            <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select style={styles.input} value={form.periodType} onChange={(e) => setForm({ ...form, periodType: e.target.value as EvaluationCampaign["periodType"] })}>
              <option value="monthly">Mensuelle</option>
              <option value="quarterly">Trimestrielle</option>
              <option value="semester">Semestrielle</option>
              <option value="yearly">Annuelle</option>
            </select>
            <input style={styles.input} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <input style={styles.input} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <textarea style={{ ...styles.input, gridColumn: "1 / -1" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={styles.actions}>
            <button
              style={busyAction === "save-campaign" || !canManageCampaigns ? styles.disabledBtn : styles.primaryBtn}
              onClick={() => void saveCampaign()}
              disabled={busyAction === "save-campaign" || !canManageCampaigns}
              title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : undefined}
            >
              {busyAction === "save-campaign" ? "Enregistrement..." : editingCampaign ? "Enregistrer" : "Creer la campagne"}
            </button>
            {editingCampaign ? <button style={styles.smallBtn} onClick={() => setEditingCampaign(null)}>Annuler</button> : null}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Campagnes existantes</div>
          <div style={styles.stack}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} style={{ ...styles.rowButton, ...(selectedId === String(campaign.id) ? styles.active : {}) }} onClick={() => setSelectedId(String(campaign.id))} role="button" tabIndex={0}>
                <strong>{campaign.name}</strong>
                <span>{statusLabel[campaign.status]} | {campaign.assignmentsCount ?? 0} affectations</span>
                <span style={styles.rowActions} onClick={(event) => event.stopPropagation()}>
                  <button
                    style={canManageCampaigns ? styles.smallBtn : styles.disabledMiniBtn}
                    onClick={() => openEditCampaign(campaign)}
                    disabled={!canManageCampaigns}
                    title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : undefined}
                  >
                    Modifier
                  </button>
                  <button
                    style={canManageCampaigns ? styles.dangerBtn : styles.disabledMiniBtn}
                    onClick={() => void removeCampaign(campaign)}
                    disabled={busyAction === `delete-campaign-${campaign.id}` || !canManageCampaigns}
                    title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : undefined}
                  >
                    Supprimer
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={styles.card}>
        <div style={styles.cardTitle}>Population et affectations</div>
        {selectedCampaign ? (
          <>
            <div style={styles.toolbar}>
              <strong>{selectedCampaign.name}</strong>
              <div style={styles.actions}>
                <button
                  style={canOpenCampaign && busyAction !== "open" ? styles.smallBtn : styles.disabledMiniBtn}
                  onClick={() => void changeStatus("open")}
                  disabled={busyAction === "open" || !canOpenCampaign}
                  title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : selectedCampaign.status === "open" ? "La campagne est deja ouverte." : undefined}
                >
                  Ouvrir
                </button>
                <button
                  style={canCloseCampaign && busyAction !== "close" ? styles.smallBtn : styles.disabledMiniBtn}
                  onClick={() => void changeStatus("close")}
                  disabled={busyAction === "close" || !canCloseCampaign}
                  title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : selectedCampaign.status === "closed" ? "La campagne est deja cloturee." : undefined}
                >
                  Cloturer
                </button>
                <button
                  style={busyAction === "assign" || selectedAgents.length === 0 || !canManageCampaigns ? styles.disabledBtn : styles.primaryBtn}
                  onClick={() => void assign()}
                  disabled={busyAction === "assign" || selectedAgents.length === 0 || !canManageCampaigns}
                  title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : selectedAgents.length === 0 ? "Selectionnez au moins un employe." : undefined}
                >
                  {busyAction === "assign" ? "Affectation..." : `Affecter la selection${selectedAgents.length ? ` (${selectedAgents.length})` : ""}`}
                </button>
              </div>
            </div>
            <div style={styles.inlineHelp}>
              <span>{selectedAgentCount} employe(s) selectionne(s)</span>
              <span style={styles.inlineActions}>
                <button style={styles.textBtn} onClick={() => setSelectedAgents(agents.map((agent) => String(agent.id)))} disabled={!canManageCampaigns || agents.length === 0}>Tout selectionner</button>
                <button style={styles.textBtn} onClick={() => setSelectedAgents([])} disabled={selectedAgentCount === 0}>Vider</button>
              </span>
            </div>
            <div style={styles.agentGrid}>
              {agents.map((agent) => (
                <label key={agent.id} style={styles.agentCard}>
                  <input
                    type="checkbox"
                    disabled={!canManageCampaigns}
                    checked={selectedAgents.includes(String(agent.id))}
                    onChange={(e) =>
                      setSelectedAgents((current) =>
                        e.target.checked ? [...current, String(agent.id)] : current.filter((id) => id !== String(agent.id))
                      )
                    }
                  />
                  <span>
                    <strong>{agent.fullName}</strong>
                    <small>{agent.matricule} | manager: {agent.managerName || "Non affecte"}</small>
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.empty}>Selectionnez une campagne.</div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.cardTitle}>Affectations creees</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>Employe</th><th style={styles.th}>Responsable</th><th style={styles.th}>Affectation</th><th style={styles.th}>Evaluation</th><th style={styles.th}>Actions</th></tr>
            </thead>
            <tbody>
              {selectedAssignments.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.employeeName}</td>
                  <td style={styles.td}>{item.managerName || "-"}</td>
                  <td style={styles.td}>{item.status}</td>
                  <td style={styles.td}>
                    {item.evaluationId ? (
                      <div style={styles.evalMeta}>
                        <strong>{item.evaluationDisplayScore ?? item.evaluationFinalScore ?? 0}/100</strong>
                        <span>{item.evaluationStatus ? evaluationStatusLabel[item.evaluationStatus] : "-"}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {item.evaluationId ? (
                        <button style={styles.smallBtn} onClick={() => navigate(`/evaluations/${item.evaluationId}`)}>
                          {isManagerView ? "Evaluer" : "Voir"}
                        </button>
                      ) : null}
                      {item.status !== "cancelled" ? (
                        <button
                          style={canManageCampaigns ? styles.smallBtn : styles.disabledMiniBtn}
                          onClick={() => void cancelAssignment(item)}
                          disabled={busyAction === `cancel-assignment-${item.id}` || !canManageCampaigns}
                          title={!canManageCampaigns ? "Action reservee a la DRH et a l'administration." : undefined}
                        >
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {selectedAssignments.length === 0 ? <tr><td style={styles.td} colSpan={5}>Aucune affectation pour cette campagne.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 18 },
  hero: { padding: 24, borderRadius: 18, background: "linear-gradient(135deg,#0f3d91,#14b8a6)", color: "white" },
  kicker: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: 950, marginTop: 6 },
  sub: { marginTop: 8, opacity: 0.88 },
  grid: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 },
  card: { padding: 20, borderRadius: 16, background: "white", border: "1px solid rgba(15,23,42,.08)" },
  cardTitle: { fontSize: 18, fontWeight: 900, marginBottom: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 180px 160px 160px", gap: 10, marginBottom: 12 },
  input: { padding: 12, borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", fontFamily: "inherit" },
  primaryBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  smallBtn: { padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", background: "white", fontWeight: 800, cursor: "pointer" },
  dangerBtn: { padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(220,38,38,.25)", background: "white", color: "#b91c1c", fontWeight: 800, cursor: "pointer" },
  disabledBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#94a3b8", color: "white", fontWeight: 800, cursor: "not-allowed" },
  disabledMiniBtn: { padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.3)", background: "#e2e8f0", color: "#64748b", fontWeight: 800, cursor: "not-allowed" },
  stack: { display: "grid", gap: 10 },
  rowButton: { display: "grid", gap: 4, padding: 14, borderRadius: 12, border: "1px solid rgba(148,163,184,.25)", background: "#f8fafc", textAlign: "left", cursor: "pointer" },
  active: { borderColor: "#0f3d91", background: "rgba(15,61,145,.06)" },
  rowActions: { display: "flex", gap: 8, marginTop: 8 },
  toolbar: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  agentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 },
  agentCard: { display: "flex", gap: 10, padding: 12, borderRadius: 12, border: "1px solid rgba(148,163,184,.25)", background: "#f8fafc" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, borderBottom: "1px solid rgba(15,23,42,.08)", color: "#64748b" },
  td: { padding: 10, borderBottom: "1px solid rgba(15,23,42,.06)" },
  error: { padding: 12, borderRadius: 10, background: "rgba(220,38,38,.08)", color: "#b91c1c" },
  notice: { padding: 12, borderRadius: 10, background: "rgba(34,197,94,.12)", color: "#15803d", fontWeight: 800 },
  info: { padding: 12, borderRadius: 10, background: "rgba(15,61,145,.08)", color: "#1d4ed8", fontWeight: 700 },
  inlineHelp: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, color: "#64748b", fontWeight: 700, flexWrap: "wrap" },
  inlineActions: { display: "flex", gap: 10, alignItems: "center" },
  textBtn: { border: "none", background: "transparent", color: "#0f3d91", fontWeight: 800, cursor: "pointer", padding: 0 },
  empty: { color: "#64748b" },
  evalMeta: { display: "grid", gap: 4 },
};

function readApiError(err: any, fallback: string) {
  const data = err?.response?.data;
  if (!data) return err?.message ?? fallback;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue)) return String(firstValue[0]);
  if (typeof firstValue === "string") return firstValue;
  return fallback;
}
