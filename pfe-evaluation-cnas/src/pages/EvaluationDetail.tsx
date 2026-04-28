import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentAPI } from "../services/entityAPI";
import { evaluationAPI } from "../services/evaluationAPI";
import type { Agent } from "../types/entities";
import type { CriterionCategory, Evaluation, EvaluationCriterionScore, EvaluationStatus } from "../types/evaluation";

const statusLabel: Record<EvaluationStatus, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  submitted: "Soumis manager",
  manager_validated: "Valide manager",
  hr_validated: "Valide RH",
  rejected: "Rejete",
};

const categoryMeta = {
  quantitative: { label: "Objectifs / performance", hint: "Resultats, delais, qualite de service" },
  qualitative: { label: "Competences comportementales", hint: "Rigueur, communication, autonomie" },
  attendance: { label: "Conformite / assiduite", hint: "Respect procedures, presence, discipline" },
  self: { label: "Auto-evaluation", hint: "Regard employe et realisations" },
  managerial: { label: "Competences manageriales", hint: "Pilotage, coordination, decision" },
} satisfies Record<CriterionCategory, { label: string; hint: string }>;

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

export default function EvaluationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "agent";
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [period, setPeriod] = useState("");
  const [comments, setComments] = useState("");
  const [criteriaScores, setCriteriaScores] = useState<EvaluationCriterionScore[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = !!evaluation && (["superadmin", "admin", "hr"].includes(role) || (role === "manager" && !["manager_validated", "hr_validated"].includes(evaluation.status)));
  const canSaveDraft = canEdit && (evaluation?.status === "draft" || evaluation?.status === "in_progress" || evaluation?.status === "rejected");
  const canSubmit = canEdit && (evaluation?.status === "draft" || evaluation?.status === "in_progress" || evaluation?.status === "rejected");
  const canValidate =
    !!evaluation &&
    ((role === "manager" && evaluation.status === "submitted") ||
      (["superadmin", "admin", "hr"].includes(role) && ["submitted", "manager_validated"].includes(evaluation.status)));

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await evaluationAPI.get(id);
      setEvaluation(row);
      setPeriod(row.period);
      setComments(row.comments ?? "");

      let currentAgent: Agent | null = null;
      if (row.agentId) {
        const res = await agentAPI.get(row.agentId);
        currentAgent = res.data.data;
        setAgent(currentAgent);
      }

      if (currentAgent?.evaluationProfileId) {
        const criteria = await evaluationAPI.listCriteria(currentAgent.evaluationProfileId);
        setCriteriaScores(
          criteria.map((criterion) => {
            const existing = row.criteriaScores.find((item) => item.criterionId === criterion.id);
            return {
              id: existing?.id,
              criterionId: criterion.id,
              score: existing?.score ?? criterion.minScore,
              comment: existing?.comment ?? "",
              criterion,
            };
          })
        );
      } else {
        setCriteriaScores(row.criteriaScores);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Impossible de charger cette evaluation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const previewScore = useMemo(() => computePreview(criteriaScores), [criteriaScores]);
  const groupedCriteria = useMemo(() => {
    const groups = new Map<CriterionCategory, EvaluationCriterionScore[]>();
    criteriaScores.forEach((item) => {
      const category = item.criterion?.category ?? "qualitative";
      groups.set(category, [...(groups.get(category) ?? []), item]);
    });
    return (Object.keys(categoryMeta) as CriterionCategory[])
      .map((category) => ({ category, meta: categoryMeta[category], items: groups.get(category) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [criteriaScores]);

  const updateCriterion = (criterionId: string, field: "score" | "comment", value: number | string) => {
    setCriteriaScores((current) => current.map((item) => (item.criterionId === criterionId ? { ...item, [field]: value } : item)));
  };

  const payload = () => ({
    period,
    comments,
    score: previewScore,
    criteriaScores,
  });

  const saveDraft = async () => {
    if (!evaluation) return;
    setSaving(true);
    setError(null);
    try {
      const row = await evaluationAPI.saveDraft(evaluation.id, payload());
      setEvaluation(row);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.status?.[0] ?? err?.response?.data?.detail ?? err?.message ?? "Brouillon non enregistre.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!evaluation) return;
    setSaving(true);
    setError(null);
    try {
      const row = await evaluationAPI.submit(evaluation.id, payload());
      setEvaluation(row);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.status?.[0] ?? err?.response?.data?.detail ?? err?.message ?? "Soumission impossible.");
    } finally {
      setSaving(false);
    }
  };

  const validate = async (approved: boolean) => {
    if (!evaluation) return;
    setSaving(true);
    setError(null);
    try {
      const row = await evaluationAPI.validate(evaluation.id, approved, feedback);
      setEvaluation(row);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.status?.[0] ?? err?.response?.data?.detail ?? err?.message ?? "Validation impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.panel}>Chargement du questionnaire...</div>;
  if (!evaluation) return <div style={styles.error}>Evaluation introuvable.</div>;

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate("/evaluations")}>Retour aux evaluations</button>

      <section style={styles.hero}>
        <div>
          <div style={styles.kicker}>Questionnaire dynamique</div>
          <h1 style={styles.title}>{evaluation.employeeName}</h1>
          <div style={styles.subtitle}>
            {agent?.jobPositionTitle || agent?.position || "Poste non renseigne"} - {agent?.evaluationProfileName || "profil d'evaluation"}
          </div>
        </div>
        <div style={styles.scoreBox}>
          <span>{scoreLevel(previewScore)}</span>
          <strong>{previewScore}/100</strong>
          <small>{statusLabel[evaluation.status]}</small>
        </div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.panel}>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Periode
            <input style={styles.input} value={period} disabled={!canEdit} onChange={(event) => setPeriod(event.target.value)} />
          </label>
          <label style={{ ...styles.label, gridColumn: "span 2" }}>
            Synthese qualitative / plan d'action
            <textarea
              style={{ ...styles.input, minHeight: 96, resize: "vertical" }}
              value={comments}
              disabled={!canEdit}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Points forts, axes a ameliorer, formation, echeance de suivi..."
            />
          </label>
        </div>
      </section>

      {groupedCriteria.map((group) => (
        <section key={group.category} style={styles.panel}>
          <div style={styles.sectionHead}>
            <div>
              <h2 style={styles.sectionTitle}>{group.meta.label}</h2>
              <p style={styles.sectionHint}>{group.meta.hint}</p>
            </div>
            <strong>{computePreview(group.items)}/100</strong>
          </div>
          <div style={styles.criteriaGrid}>
            {group.items.map((item) => (
              <article key={item.criterionId} style={styles.criterionCard}>
                <div style={styles.criterionTop}>
                  <div>
                    <strong>{item.criterion?.name}</strong>
                    <p>{item.criterion?.description || "Critere d'evaluation"}</p>
                    <small>Poids {item.criterion?.weight}% - note {item.criterion?.minScore} a {item.criterion?.maxScore}</small>
                  </div>
                  <input
                    type="number"
                    style={{ ...styles.input, width: 104 }}
                    min={item.criterion?.minScore ?? 0}
                    max={item.criterion?.maxScore ?? 5}
                    value={item.score}
                    disabled={!canEdit}
                    onChange={(event) => updateCriterion(item.criterionId, "score", Number(event.target.value))}
                  />
                </div>
                <ProgressMeter value={item.criterion?.maxScore ? Math.round((Number(item.score) / item.criterion.maxScore) * 100) : 0} />
                <textarea
                  style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                  value={item.comment}
                  disabled={!canEdit}
                  onChange={(event) => updateCriterion(item.criterionId, "comment", event.target.value)}
                  placeholder="Commentaire, justification ou fait observe..."
                />
              </article>
            ))}
          </div>
        </section>
      ))}

      {evaluation.selfEvaluation ? (
        <section style={styles.panel}>
          <div style={styles.sectionHead}>
            <div>
              <h2 style={styles.sectionTitle}>Auto-evaluation rattachee</h2>
              <p style={styles.sectionHint}>Reponses soumises par l'employe et visibles dans le dossier d'evaluation.</p>
            </div>
            <strong>{evaluation.selfEvaluation.averageScore}/5</strong>
          </div>
          <div style={styles.selfGrid}>
            <InfoBlock label="Statut" value={evaluation.selfEvaluation.status} />
            <InfoBlock label="Points positifs" value={evaluation.selfEvaluation.positivePoints || "-"} />
            <InfoBlock label="Difficultes" value={evaluation.selfEvaluation.difficulties || "-"} />
            <InfoBlock label="Besoins de soutien" value={evaluation.selfEvaluation.supportNeeds || "-"} />
            <InfoBlock label="Suggestions" value={evaluation.selfEvaluation.improvementSuggestions || "-"} />
            <InfoBlock label="Commentaire global" value={evaluation.selfEvaluation.overallComment || "-"} />
          </div>
          <div style={styles.answerList}>
            {evaluation.selfEvaluation.answers.map((answer) => (
              <div key={answer.id} style={styles.answerRow}>
                <div>
                  <strong>{answer.questionText}</strong>
                  <small>{answer.sectionTitle}</small>
                </div>
                <span>{answer.score !== null && answer.score !== undefined ? `${answer.score}/5` : answer.selectedValue || "-"}</span>
                <p>{answer.comment || "-"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={styles.actionBar}>
        <div>
          <strong>Workflow reel</strong>
          <p>Les actions ci-dessous mettent a jour PostgreSQL via l'API Django.</p>
        </div>
        <div style={styles.actions}>
          {canSaveDraft ? <button style={styles.ghostBtn} disabled={saving} onClick={() => void saveDraft()}>Enregistrer brouillon</button> : null}
          {canSubmit ? <button style={styles.primaryBtn} disabled={saving} onClick={() => void submit()}>Soumettre</button> : null}
          {canValidate ? (
            <>
              <input style={{ ...styles.input, width: 260 }} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={role === "manager" ? "Commentaire manager" : "Commentaire RH"} />
              <button style={styles.primaryBtn} disabled={saving} onClick={() => void validate(true)}>{role === "manager" ? "Valider manager" : "Valider RH"}</button>
              <button style={styles.dangerBtn} disabled={saving} onClick={() => void validate(false)}>Rejeter</button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProgressMeter({ value }: { value: number }) {
  const tone = value >= 80 ? "#059669" : value >= 60 ? "#0f3d91" : value >= 40 ? "#d97706" : "#dc2626";
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressBar, width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoBlock}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 16 },
  backBtn: { justifySelf: "start", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", cursor: "pointer", fontWeight: 800 },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: 24, borderRadius: 22, background: "linear-gradient(135deg, rgba(15,61,145,.96), rgba(20,184,166,.82))", color: "white", boxShadow: "0 18px 36px rgba(15,61,145,.18)" },
  kicker: { textTransform: "uppercase", letterSpacing: ".08em", fontSize: 12, fontWeight: 900, opacity: .82 },
  title: { margin: "6px 0", fontSize: 30, lineHeight: 1.1 },
  subtitle: { opacity: .86, fontWeight: 700 },
  scoreBox: { display: "grid", gap: 4, minWidth: 150, padding: 16, borderRadius: 18, background: "rgba(255,255,255,.14)", textAlign: "right" },
  panel: { padding: 20, borderRadius: 20, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 14px 30px rgba(15,23,42,.06)" },
  formGrid: { display: "grid", gridTemplateColumns: "minmax(180px,.45fr) minmax(0,1fr) minmax(0,1fr)", gap: 14 },
  label: { display: "grid", gap: 8, fontSize: 13, fontWeight: 800, color: "#0f172a" },
  input: { padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", width: "100%", font: "inherit" },
  sectionHead: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 20, color: "#0f172a" },
  sectionHint: { margin: "5px 0 0", color: "#64748b" },
  criteriaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 },
  selfGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  infoBlock: { display: "grid", gap: 6, padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid rgba(148,163,184,.22)" },
  answerList: { display: "grid", gap: 10, marginTop: 14 },
  answerRow: { display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, padding: 12, borderRadius: 14, background: "white", border: "1px solid rgba(148,163,184,.22)" },
  criterionCard: { display: "grid", gap: 12, padding: 16, borderRadius: 18, border: "1px solid rgba(148,163,184,.25)", background: "rgba(248,250,252,.78)" },
  criterionTop: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" },
  progressTrack: { width: "100%", height: 9, borderRadius: 999, background: "rgba(203,213,225,.65)", overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 999, transition: "width .2s ease" },
  actionBar: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", padding: 18, borderRadius: 20, background: "white", border: "1px solid rgba(15,23,42,.08)" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  primaryBtn: { padding: "12px 16px", borderRadius: 12, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  ghostBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", fontWeight: 800, cursor: "pointer" },
  dangerBtn: { padding: "12px 16px", borderRadius: 12, border: "none", background: "#dc2626", color: "white", fontWeight: 800, cursor: "pointer" },
  error: { padding: 14, borderRadius: 12, background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.16)", color: "#b91c1c", fontWeight: 800 },
};
