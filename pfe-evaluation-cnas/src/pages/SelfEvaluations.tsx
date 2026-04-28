import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FadeIn from "../components/ui/FadeIn";
import { useAuth } from "../context/AuthContext";
import { selfEvaluationAPI } from "../services/selfEvaluationAPI";
import { evaluationCampaignAPI } from "../services/rankingAPI";
import { agentAPI, serviceAPI } from "../services/entityAPI";
import type { Agent, Service } from "../types/entities";
import type {
  SelfEvaluation,
  SelfEvaluationAnswer,
  SelfEvaluationSection,
  SelfEvaluationStatus,
} from "../types/selfEvaluation";
import type { EvaluationCampaign } from "../services/rankingAPI";

type FormState = {
  period: string;
  campaignId: string;
  overallComment: string;
  positivePoints: string;
  difficulties: string;
  supportNeeds: string;
  improvementSuggestions: string;
  collaborationComment: string;
  answers: SelfEvaluationAnswer[];
};

const statusLabels: Record<SelfEvaluationStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  reviewed: "Revue",
  integrated: "Integree au processus",
};

const fallbackQuestionnaire: SelfEvaluationSection[] = [
  {
    key: "presence_organization",
    title: "Presence et organisation",
    questions: [
      { key: "attendance", text: "Comment evaluez-vous votre assiduite durant cette periode ?", type: "rating", required: true },
      { key: "working_hours_deadlines", text: "Avez-vous respecte les horaires et delais attendus ?", type: "rating", required: true },
      { key: "daily_organization", text: "Comment evaluez-vous votre organisation quotidienne du travail ?", type: "rating", required: true },
      { key: "presence_difficulties", text: "Avez-vous rencontre des difficultes de ponctualite, disponibilite ou charge de travail ?", type: "text", required: false },
    ],
  },
  {
    key: "technical_contribution",
    title: "Maitrise du poste",
    questions: [
      { key: "task_mastery", text: "Comment evaluez-vous votre maitrise des taches liees a votre poste ?", type: "rating", required: true },
      { key: "tools_procedures", text: "Comment evaluez-vous votre maitrise des outils, procedures ou logiciels utilises ?", type: "rating", required: true },
      { key: "autonomy", text: "Dans quelle mesure etes-vous autonome dans l'execution de votre travail ?", type: "rating", required: true },
      { key: "work_quality", text: "Comment evaluez-vous la qualite du travail que vous avez fourni ?", type: "rating", required: true },
    ],
  },
  {
    key: "behavioral_skills",
    title: "Competences comportementales",
    questions: [
      { key: "communication_hierarchy", text: "Comment evaluez-vous votre communication avec votre hierarchie ?", type: "rating", required: true },
      { key: "team_collaboration", text: "Comment evaluez-vous votre collaboration avec vos collegues ?", type: "rating", required: true },
      { key: "responsibility", text: "Comment evaluez-vous votre sens des responsabilites ?", type: "rating", required: true },
      { key: "rigor_professionalism", text: "Comment evaluez-vous votre rigueur et votre professionnalisme ?", type: "rating", required: true },
      { key: "adaptability", text: "Comment evaluez-vous votre capacite d'adaptation ?", type: "rating", required: true },
    ],
  },
  {
    key: "performance_objectives",
    title: "Performance et resultats",
    questions: [
      { key: "objectives_achievement", text: "Dans quelle mesure avez-vous atteint vos objectifs sur cette periode ?", type: "rating", required: true },
      { key: "main_achievements", text: "Quelles sont vos principales realisations ?", type: "text", required: true },
      { key: "performance_obstacles", text: "Quels obstacles ont limite votre performance ?", type: "text", required: false },
      { key: "service_contribution", text: "Pensez-vous avoir contribue efficacement aux resultats de votre service ?", type: "yes_no", required: true },
    ],
  },
  {
    key: "improvement_support",
    title: "Besoins et amelioration",
    questions: [
      { key: "skills_to_improve", text: "Quelles competences souhaitez-vous ameliorer ?", type: "text", required: true },
      {
        key: "training_support",
        text: "De quelle formation ou accompagnement auriez-vous besoin ?",
        type: "select",
        required: false,
        options: ["formation", "accompagnement", "outils", "organisation"],
      },
      { key: "efficiency_changes", text: "Quels changements pourraient ameliorer votre efficacite au travail ?", type: "text", required: false },
      { key: "team_suggestions", text: "Avez-vous des suggestions constructives pour ameliorer l'organisation ou la communication dans l'equipe ?", type: "text", required: false },
    ],
  },
];

export default function SelfEvaluations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<SelfEvaluation[]>([]);
  const [questionnaire, setQuestionnaire] = useState<SelfEvaluationSection[]>([]);
  const [campaigns, setCampaigns] = useState<EvaluationCampaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    employeeId: searchParams.get("employeeId") ?? "",
    campaignId: searchParams.get("campaignId") ?? "",
    serviceId: searchParams.get("serviceId") ?? "",
    status: searchParams.get("status") ?? "",
  });

  const isEmployee = user?.role === "agent" || user?.role === "employee";
  const isHr = user?.role === "superadmin" || user?.role === "admin" || user?.role === "hr";
  const canReview = user?.role === "manager" || isHr;
  const requestedSelfEvaluationId = searchParams.get("selfEvaluationId");

  const selected = useMemo(
    () => (selectedId ? items.find((item) => item.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const [form, setForm] = useState<FormState>(() => emptyForm());

  async function refresh(preferredId?: string) {
    setLoading(true);
    const query = isEmployee ? undefined : filters;
    const baseRequests = [
      selfEvaluationAPI.list(query),
      selfEvaluationAPI.questionnaire().catch(() => fallbackQuestionnaire),
      evaluationCampaignAPI.list(),
    ] as const;
    const directoryRequests = isEmployee
      ? Promise.resolve<[Agent[], Service[]]>([[], []])
      : Promise.all([agentAPI.list().then((res) => res.data.data), serviceAPI.list().then((res) => res.data.data)]);

    try {
      const [selfEvals, sections, campaignsRes, directoryData] = await Promise.all([...baseRequests, directoryRequests]);
        const [agentRows, serviceRows] = directoryData;
        setItems(selfEvals);
        setQuestionnaire(sections.length ? sections : fallbackQuestionnaire);
        setCampaigns(campaignsRes.data.data);
        setAgents(agentRows);
        setServices(serviceRows);
        setSelectedId((current) => {
          if (preferredId && selfEvals.some((item) => item.id === preferredId)) {
            return preferredId;
          }
          if (requestedSelfEvaluationId && selfEvals.some((item) => item.id === requestedSelfEvaluationId)) {
            return requestedSelfEvaluationId;
          }
          if (current && selfEvals.some((item) => item.id === current)) {
            return current;
          }
          if (isEmployee) {
            return selfEvals.find((item) => item.status === "draft")?.id ?? null;
          }
          return selfEvals[0]?.id ?? null;
        });
    } catch {
      setQuestionnaire(fallbackQuestionnaire);
      setSelectedId(null);
      setNotice("Le chargement serveur a echoue, mais le questionnaire reste disponible en saisie locale.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (requestedSelfEvaluationId && items.some((item) => item.id === requestedSelfEvaluationId)) {
      setSelectedId(requestedSelfEvaluationId);
    }
  }, [items, requestedSelfEvaluationId]);

  useEffect(() => {
    if (selected) {
      setForm(fromEvaluation(selected, questionnaire));
    } else if (questionnaire.length) {
      setForm(emptyForm(questionnaire));
    }
  }, [selected, questionnaire]);

  const activeDraft = useMemo(() => items.find((item) => item.status === "draft") ?? null, [items]);
  const canEditSelected = isEmployee && (!selected || selected.status === "draft");
  const isReadOnlyQuestionnaire = !canEditSelected;
  const readOnlyReason = !isEmployee
    ? "Mode consultation: seuls les employes peuvent saisir ou modifier une auto-evaluation."
    : selected && selected.status !== "draft"
      ? "Cette auto-evaluation est deja soumise ou traitee. Elle reste consultable, mais elle n'est plus modifiable."
      : "";
  const filteredEmployees = useMemo(() => {
    if (user?.role !== "manager") return agents;
    const visibleEmployeeIds = new Set(items.map((item) => item.employeeId));
    return agents.filter((agent) => visibleEmployeeIds.has(agent.id));
  }, [agents, items, user?.role]);

  const completion = useMemo(() => {
    const required = form.answers.filter((answer) => answer.isRequired);
    const done = required.filter((answer) => hasAnswer(answer)).length;
    return { done, required: required.length };
  }, [form.answers]);

  function updateAnswer(questionKey: string, patch: Partial<SelfEvaluationAnswer>) {
    setForm((current) => ({
      ...current,
      answers: current.answers.map((answer) =>
        answer.questionKey === questionKey ? { ...answer, ...patch } : answer
      ),
    }));
  }

  async function persist(mode: "draft" | "submit") {
    if (!canEditSelected) return;
    if (mode === "submit") {
      const missing = form.answers.filter((answer) => answer.isRequired && !hasAnswer(answer));
      if (missing.length) {
        setNotice("Completez les questions obligatoires avant la soumission.");
        return;
      }
    }

    setSaving(true);
    setNotice("");
    const payload = {
      ...form,
      campaignId: form.campaignId || null,
      answers: form.answers,
    };

    try {
      let saved: SelfEvaluation;
      if (selected) {
        saved = mode === "submit"
          ? await selfEvaluationAPI.submit(selected.id, payload)
          : await selfEvaluationAPI.saveDraft(selected.id, payload);
      } else {
        const created = await selfEvaluationAPI.create(payload);
        saved = mode === "submit"
          ? await selfEvaluationAPI.submit(created.id, payload)
          : created;
      }
      setItems((current) => upsert(current, saved));
      setSelectedId(saved.id);
      await refresh(saved.id);
      setNotice(mode === "submit" ? "Auto-evaluation soumise a la hierarchie." : "Brouillon enregistre.");
    } catch {
      setNotice("Enregistrement impossible. Verifiez les champs et vos droits.");
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed(item: SelfEvaluation) {
    setSaving(true);
    try {
      const saved = await selfEvaluationAPI.review(item.id);
      setItems((current) => upsert(current, saved));
      setSelectedId(saved.id);
      await refresh(saved.id);
      setNotice("Auto-evaluation marquee comme revue.");
    } catch {
      setNotice("Action non autorisee ou statut incompatible.");
    } finally {
      setSaving(false);
    }
  }

  async function integrate(item: SelfEvaluation) {
    setSaving(true);
    try {
      const saved = await selfEvaluationAPI.integrate(item.id);
      setItems((current) => upsert(current, saved));
      setSelectedId(saved.id);
      await refresh(saved.id);
      setNotice("Auto-evaluation integree au processus d'evaluation.");
    } catch {
      setNotice("Integration reservee a la DRH ou statut incompatible.");
    } finally {
      setSaving(false);
    }
  }

  function startNewDraft() {
    setSelectedId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("selfEvaluationId");
      return next;
    }, { replace: true });
    setForm(emptyForm(questionnaire));
    setNotice(activeDraft ? "Vous avez deja un brouillon: vous pouvez aussi le continuer." : "");
  }

  function openEditableQuestionnaire() {
    if (activeDraft) {
      setSelectedId(activeDraft.id);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("selfEvaluationId", activeDraft.id);
        return next;
      }, { replace: true });
      setNotice("Brouillon ouvert: vous pouvez modifier le questionnaire.");
      return;
    }
    startNewDraft();
    setNotice("Nouvelle auto-evaluation: le questionnaire est maintenant modifiable.");
  }

  function selectSelfEvaluation(id: string) {
    setSelectedId(id);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("selfEvaluationId", id);
      return next;
    }, { replace: true });
  }

  function openManagerEvaluation(item: SelfEvaluation) {
    if (item.managerEvaluation?.id) {
      navigate(`/evaluations/${item.managerEvaluation.id}`);
      return;
    }

    const query = encodeURIComponent(item.employeeMatricule || item.employeeName);
    navigate(`/evaluations?q=${query}`);
  }

  return (
    <div className="dashboard-main self-eval-page">
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Auto-evaluation</div>
          <p className="hero-sub">
            {isEmployee
              ? "Renseignez votre questionnaire, sauvegardez un brouillon puis soumettez-le a votre hierarchie."
              : "Consultez les auto-evaluations visibles dans votre perimetre et leur statut de workflow."}
          </p>
        </section>
      </FadeIn>

      {notice ? <div className="dashboard-note self-eval-notice">{notice}</div> : null}

      <FadeIn delay={150}>
        <div className="kpi-grid self-eval-kpis">
          {[
            { label: "Brouillons", value: countStatus(items, "draft") },
            { label: "Soumises", value: countStatus(items, "submitted") },
            { label: "Revues", value: countStatus(items, "reviewed") },
            { label: "Integrees", value: countStatus(items, "integrated") },
          ].map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {!isEmployee ? (
        <FadeIn delay={220}>
          <section className="panel panel--analytics self-eval-filters">
            <div className="panel-title">Filtres de consultation</div>
            <div className="self-eval-filter-grid">
              <select value={filters.employeeId} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}>
                <option value="">Tous les employes</option>
                {filteredEmployees.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                ))}
              </select>
              <select value={filters.campaignId} onChange={(event) => setFilters({ ...filters, campaignId: event.target.value })}>
                <option value="">Toutes les campagnes</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
              <select value={filters.serviceId} onChange={(event) => setFilters({ ...filters, serviceId: event.target.value })}>
                <option value="">Tous les services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button className="quick-action self-eval-filter-button" type="button" onClick={() => void refresh()}>Appliquer</button>
            </div>
          </section>
        </FadeIn>
      ) : null}

      <FadeIn delay={280}>
        <div className="dashboard-grid dashboard-grid--wide self-eval-layout">
          <section className="panel panel--analytics">
            <div className="panel-header">
              <div className="panel-title">{isEmployee ? "Mes auto-evaluations" : "Auto-evaluations accessibles"}</div>
              {isEmployee ? (
                <button className="quick-action self-eval-small-button" type="button" onClick={openEditableQuestionnaire}>
                  {activeDraft ? "Continuer le brouillon" : "Nouvelle auto-evaluation"}
                </button>
              ) : null}
            </div>
            {loading ? (
              <div className="dashboard-note">Chargement...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Employe</th>
                    <th>Periode</th>
                    <th>Statut</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="clickable-row" onClick={() => selectSelfEvaluation(item.id)}>
                      <td>{item.employeeName}</td>
                      <td>{item.campaignName || item.period || "-"}</td>
                      <td>{statusLabels[item.status]}</td>
                      <td>{item.averageScore ? `${item.averageScore}/5` : "-"}</td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Aucune auto-evaluation disponible.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel panel--analytics">
            <div className="panel-title">Contexte et workflow</div>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card__label">Statut</div>
                <div className="info-card__value">{selected ? statusLabels[selected.status] : "Brouillon"}</div>
              </div>
              <div className="info-card">
                <div className="info-card__label">Questions obligatoires</div>
                <div className="info-card__value">{completion.done}/{completion.required}</div>
              </div>
              <div className="info-card">
                <div className="info-card__label">Evaluation manager</div>
                <div className="info-card__value">{selected?.managerEvaluation ? `${selected.managerEvaluation.finalScore}/100` : "-"}</div>
              </div>
              <div className="info-card">
                <div className="info-card__label">Score auto</div>
                <div className="info-card__value">{selected?.averageScore ? `${selected.averageScore}/5` : "-"}</div>
              </div>
            </div>
            {selected ? (
              <button className="quick-action self-eval-link-button" type="button" onClick={() => openManagerEvaluation(selected)}>
                {selected.managerEvaluation ? "Ouvrir l'evaluation manager liee" : "Chercher les evaluations de l'employe"}
              </button>
            ) : null}
            {canReview && selected && selected.status === "submitted" ? (
              <button className="quick-action self-eval-link-button" type="button" disabled={saving} onClick={() => markReviewed(selected)}>
                Marquer comme revue
              </button>
            ) : null}
            {isHr && selected && (selected.status === "submitted" || selected.status === "reviewed") ? (
              <button className="quick-action self-eval-link-button" type="button" disabled={saving} onClick={() => integrate(selected)}>
                Integrer au processus
              </button>
            ) : null}
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={360}>
        <section className="panel panel--analytics self-eval-form">
          <div className="panel-header">
            <div>
              <div className="panel-title">Questionnaire structure</div>
              <div className="dashboard-note">
                Les commentaires sont cadres en points positifs, difficultes, besoin d'accompagnement et suggestions.
              </div>
            </div>
            {canEditSelected ? (
              <div className="self-eval-actions">
                <button className="quick-action self-eval-small-button" type="button" disabled={saving} onClick={() => persist("draft")}>
                  Enregistrer brouillon
                </button>
                <button className="quick-action self-eval-small-button self-eval-primary" type="button" disabled={saving} onClick={() => persist("submit")}>
                  Soumettre
                </button>
              </div>
            ) : null}
          </div>

          {isReadOnlyQuestionnaire ? (
            <div className="self-eval-readonly-banner">
              <span>{readOnlyReason}</span>
              {isEmployee ? (
                <button className="quick-action self-eval-small-button" type="button" onClick={openEditableQuestionnaire}>
                  {activeDraft ? "Modifier mon brouillon" : "Nouvelle auto-evaluation modifiable"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="self-eval-meta">
            <label>
              Campagne
              <select disabled={isReadOnlyQuestionnaire} value={form.campaignId} onChange={(event) => setForm({ ...form, campaignId: event.target.value })}>
                <option value="">Sans campagne</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </label>
            <label>
              Periode
              <input disabled={isReadOnlyQuestionnaire} value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} placeholder="Ex: 2026-S1" />
            </label>
          </div>

          {questionnaire.map((section) => (
            <div key={section.key} className="self-eval-section">
              <h2>{section.title}</h2>
              {section.questions.map((question) => {
                const answer = form.answers.find((item) => item.questionKey === question.key);
                if (!answer) return null;
                return (
                  <div key={question.key} className="self-eval-question">
                    <label className="self-eval-question-title">
                      {question.text}
                      {question.required ? <span> *</span> : null}
                    </label>
                    {question.type === "rating" ? (
                      <div className="self-eval-rating">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            disabled={isReadOnlyQuestionnaire}
                            className={answer.score === score ? "active" : ""}
                            onClick={() => updateAnswer(question.key, { score })}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {question.type === "yes_no" ? (
                      <select disabled={isReadOnlyQuestionnaire} value={answer.selectedValue ?? ""} onChange={(event) => updateAnswer(question.key, { selectedValue: event.target.value })}>
                        <option value="">Choisir</option>
                        <option value="yes">Oui</option>
                        <option value="no">Non</option>
                      </select>
                    ) : null}
                    {question.type === "select" ? (
                      <select disabled={isReadOnlyQuestionnaire} value={answer.selectedValue ?? ""} onChange={(event) => updateAnswer(question.key, { selectedValue: event.target.value })}>
                        <option value="">Choisir</option>
                        {(question.options ?? []).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : null}
                    <textarea
                      disabled={isReadOnlyQuestionnaire}
                      value={answer.comment}
                      onChange={(event) => updateAnswer(question.key, { comment: event.target.value })}
                      placeholder={question.type === "rating" ? "Commentaire ou exemple concret" : "Reponse"}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <div className="self-eval-section">
            <h2>Commentaires de l'employe</h2>
            {[
              ["positivePoints", "Points positifs / reussites"],
              ["difficulties", "Difficultes rencontrees"],
              ["supportNeeds", "Besoins d'accompagnement"],
              ["improvementSuggestions", "Suggestions d'amelioration"],
              ["collaborationComment", "Remarques constructives sur la collaboration"],
              ["overallComment", "Synthese generale"],
            ].map(([key, label]) => (
              <label key={key} className="self-eval-comment-field">
                {label}
                <textarea
                  disabled={isReadOnlyQuestionnaire}
                  value={form[key as keyof FormState] as string}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

function emptyForm(sections: SelfEvaluationSection[] = []): FormState {
  return {
    period: "",
    campaignId: "",
    overallComment: "",
    positivePoints: "",
    difficulties: "",
    supportNeeds: "",
    improvementSuggestions: "",
    collaborationComment: "",
    answers: answersFromSections(sections),
  };
}

function fromEvaluation(item: SelfEvaluation, sections: SelfEvaluationSection[]): FormState {
  const defaults = answersFromSections(sections);
  const answerMap = new Map(item.answers.map((answer) => [answer.questionKey, answer]));
  return {
    period: item.period ?? "",
    campaignId: item.campaignId ?? "",
    overallComment: item.overallComment ?? "",
    positivePoints: item.positivePoints ?? "",
    difficulties: item.difficulties ?? "",
    supportNeeds: item.supportNeeds ?? "",
    improvementSuggestions: item.improvementSuggestions ?? "",
    collaborationComment: item.collaborationComment ?? "",
    answers: defaults.map((answer) => ({ ...answer, ...(answerMap.get(answer.questionKey) ?? {}) })),
  };
}

function answersFromSections(sections: SelfEvaluationSection[]): SelfEvaluationAnswer[] {
  return sections.flatMap((section) =>
    section.questions.map((question) => ({
      questionKey: question.key,
      criterionId: question.criterionId ?? null,
      sectionKey: section.key,
      sectionTitle: section.title,
      questionText: question.text,
      answerType: question.type,
      score: null,
      selectedValue: "",
      comment: "",
      isRequired: question.required,
    }))
  );
}

function hasAnswer(answer: SelfEvaluationAnswer) {
  if (answer.answerType === "rating") return Number(answer.score) >= 1;
  if (answer.answerType === "select" || answer.answerType === "yes_no") return !!answer.selectedValue;
  return !!answer.comment.trim();
}

function countStatus(items: SelfEvaluation[], status: SelfEvaluationStatus) {
  return items.filter((item) => item.status === status).length;
}

function upsert(items: SelfEvaluation[], saved: SelfEvaluation) {
  const exists = items.some((item) => item.id === saved.id);
  return exists ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items];
}
