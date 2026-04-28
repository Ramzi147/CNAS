import api from "./api";
import type {
  ManagerEvaluationSummary,
  SelfEvaluation,
  SelfEvaluationAnswer,
  SelfEvaluationSection,
} from "../types/selfEvaluation";

type SelfEvaluationPayload = Partial<{
  campaignId: string | null;
  evaluationId: string | null;
  period: string;
  overallComment: string;
  positivePoints: string;
  difficulties: string;
  supportNeeds: string;
  improvementSuggestions: string;
  collaborationComment: string;
  answers: SelfEvaluationAnswer[];
}>;

type SelfEvaluationFilters = Partial<{
  employeeId: string;
  campaignId: string;
  serviceId: string;
  status: string;
}>;

type SelfEvaluationRow = Omit<SelfEvaluation, "answers" | "managerEvaluation"> & {
  answers?: SelfEvaluationAnswer[];
  managerEvaluation?: ManagerEvaluationSummary | null;
};

function normalizeAnswer(answer: SelfEvaluationAnswer): SelfEvaluationAnswer {
  return {
    ...answer,
    score: answer.score === undefined || answer.score === null ? null : Number(answer.score),
    selectedValue: answer.selectedValue ?? "",
    comment: answer.comment ?? "",
  };
}

function normalizeSelfEvaluation(row: SelfEvaluationRow): SelfEvaluation {
  return {
    id: String(row.id),
    evaluationId: row.evaluationId ? String(row.evaluationId) : null,
    employeeId: String(row.employeeId),
    employeeName: row.employeeName ?? "Employe inconnu",
    employeeMatricule: row.employeeMatricule ?? "-",
    serviceId: row.serviceId ? String(row.serviceId) : "",
    serviceName: row.serviceName ?? "",
    campaignId: row.campaignId ? String(row.campaignId) : null,
    campaignName: row.campaignName ?? "",
    period: row.period ?? "",
    status: row.status ?? "draft",
    overallComment: row.overallComment ?? "",
    positivePoints: row.positivePoints ?? "",
    difficulties: row.difficulties ?? "",
    supportNeeds: row.supportNeeds ?? "",
    improvementSuggestions: row.improvementSuggestions ?? "",
    collaborationComment: row.collaborationComment ?? "",
    submittedAt: row.submittedAt ?? null,
    reviewedById: row.reviewedById ? String(row.reviewedById) : null,
    reviewedByName: row.reviewedByName ?? "",
    reviewedAt: row.reviewedAt ?? null,
    integratedAt: row.integratedAt ?? null,
    averageScore: Number(row.averageScore ?? 0),
    answers: (row.answers ?? []).map((answer) => normalizeAnswer(answer)),
    managerEvaluation: row.managerEvaluation
      ? {
          id: String(row.managerEvaluation.id),
          status: row.managerEvaluation.status,
          finalScore: Number(row.managerEvaluation.finalScore ?? 0),
          selfScore: Number(row.managerEvaluation.selfScore ?? 0),
          managerialScore: Number(row.managerEvaluation.managerialScore ?? 0),
          period: row.managerEvaluation.period ?? "",
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildParams(filters?: SelfEvaluationFilters) {
  const params = new URLSearchParams();
  if (filters?.employeeId) params.set("employeeId", filters.employeeId);
  if (filters?.campaignId) params.set("campaignId", filters.campaignId);
  if (filters?.serviceId) params.set("serviceId", filters.serviceId);
  if (filters?.status) params.set("status", filters.status);
  return params.toString();
}

export const selfEvaluationAPI = {
  async questionnaire(): Promise<SelfEvaluationSection[]> {
    const res = await api.get<{ success: boolean; data: SelfEvaluationSection[] }>("/self-evaluations/questionnaire");
    return res.data.data;
  },

  async list(filters?: SelfEvaluationFilters): Promise<SelfEvaluation[]> {
    const query = buildParams(filters);
    const res = await api.get<{ success: boolean; data: SelfEvaluationRow[] }>(query ? `/self-evaluations?${query}` : "/self-evaluations");
    return res.data.data.map(normalizeSelfEvaluation);
  },

  async create(payload: SelfEvaluationPayload): Promise<SelfEvaluation> {
    const res = await api.post<{ success: boolean; data: SelfEvaluationRow }>("/self-evaluations", payload);
    return normalizeSelfEvaluation(res.data.data);
  },

  async saveDraft(id: string, payload: SelfEvaluationPayload): Promise<SelfEvaluation> {
    const res = await api.post<{ success: boolean; data: SelfEvaluationRow }>(`/self-evaluations/${id}/draft`, payload);
    return normalizeSelfEvaluation(res.data.data);
  },

  async submit(id: string, payload: SelfEvaluationPayload): Promise<SelfEvaluation> {
    const res = await api.post<{ success: boolean; data: SelfEvaluationRow }>(`/self-evaluations/${id}/submit`, payload);
    return normalizeSelfEvaluation(res.data.data);
  },

  async review(id: string, approved = true, feedback?: string): Promise<SelfEvaluation> {
    const res = await api.post<{ success: boolean; data: SelfEvaluationRow }>(`/self-evaluations/${id}/review`, {
      approved,
      feedback: feedback ?? "",
    });
    return normalizeSelfEvaluation(res.data.data);
  },

  async integrate(id: string): Promise<SelfEvaluation> {
    const res = await api.post<{ success: boolean; data: SelfEvaluationRow }>(`/self-evaluations/${id}/integrate`);
    return normalizeSelfEvaluation(res.data.data);
  },
};
