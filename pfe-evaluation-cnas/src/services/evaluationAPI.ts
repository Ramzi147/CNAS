import api from "./api";
import type {
  Evaluation,
  EvaluationCriterion,
  EvaluationCriterionScore,
  EvaluationStatus,
} from "../types/evaluation";

type EvaluationRow = {
  id: number | string;
  agent?: number | string;
  agentId?: number | string;
  employeeName?: string;
  employeeMatricule?: string;
  evaluator?: number | string | {
    id: number | string;
    fullName?: string;
    email?: string;
    role?: string;
  };
  evaluatorId?: number | string;
  period: string;
  score: number;
  campaignId?: number | string | null;
  jobFamilyId?: number | string | null;
  jobFamilyName?: string;
  performanceScore?: number;
  competencyScore?: number;
  quantitativeScore?: number;
  qualitativeScore?: number;
  attendanceScore?: number;
  selfScore?: number;
  managerialScore?: number;
  finalScore?: number;
  managerValidated?: boolean;
  hrValidated?: boolean;
  criteriaScores?: Array<{
    id?: number | string;
    criterionId?: number | string;
    score: number | string;
    comment?: string;
    criterion?: {
      id: number | string;
      name: string;
      description: string;
      category: EvaluationCriterion["category"];
      scoreType: EvaluationCriterion["scoreType"];
      weight: number;
      minScore: number;
      maxScore: number;
      isRequired: boolean;
    };
  }>;
  selfEvaluation?: Evaluation["selfEvaluation"];
  status: EvaluationStatus;
  evaluatorName?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
  Agent?: {
    id: number | string;
    fullName: string;
    matricule: string;
    position?: string;
    email?: string;
    status?: string;
  };
};

function mapEvaluation(row: EvaluationRow): Evaluation {
  const evaluatorId =
    row.evaluatorId ??
    (typeof row.evaluator === "object" && row.evaluator ? row.evaluator.id : row.evaluator);

  const evaluatorName =
    row.evaluatorName ||
    (typeof row.evaluator === "object" && row.evaluator
      ? row.evaluator.fullName || row.evaluator.email
      : undefined) ||
    "-";

  return {
    id: String(row.id),
    agentId: row.agentId ? String(row.agentId) : row.agent ? String(row.agent) : row.Agent?.id ? String(row.Agent.id) : undefined,
    evaluatorId: evaluatorId ? String(evaluatorId) : undefined,
    campaignId: row.campaignId ? String(row.campaignId) : null,
    employeeName: row.employeeName ?? row.Agent?.fullName ?? "Employe inconnu",
    employeeMatricule: row.employeeMatricule ?? row.Agent?.matricule ?? "-",
    jobFamilyId: row.jobFamilyId ? String(row.jobFamilyId) : null,
    jobFamilyName: row.jobFamilyName ?? "",
    period: row.period,
    score: row.score ?? 0,
    performanceScore: row.performanceScore ?? 0,
    competencyScore: row.competencyScore ?? 0,
    quantitativeScore: row.quantitativeScore ?? 0,
    qualitativeScore: row.qualitativeScore ?? 0,
    attendanceScore: row.attendanceScore ?? 0,
    selfScore: row.selfScore ?? 0,
    managerialScore: row.managerialScore ?? 0,
    finalScore: row.finalScore ?? row.score ?? 0,
    status: row.status,
    managerValidated: !!row.managerValidated,
    hrValidated: !!row.hrValidated,
    criteriaScores: (row.criteriaScores ?? []).map(
      (item): EvaluationCriterionScore => ({
        id: item.id ? String(item.id) : undefined,
        criterionId: String(item.criterionId ?? item.criterion?.id ?? ""),
        score: Number(item.score ?? 0),
        comment: item.comment ?? "",
        criterion: item.criterion
          ? {
              id: String(item.criterion.id),
              name: item.criterion.name,
              description: item.criterion.description,
              category: item.criterion.category,
              scoreType: item.criterion.scoreType,
              weight: item.criterion.weight,
              minScore: item.criterion.minScore,
              maxScore: item.criterion.maxScore,
              isRequired: item.criterion.isRequired,
            }
          : undefined,
      })
    ),
    selfEvaluation: row.selfEvaluation
      ? {
          ...row.selfEvaluation,
          id: String(row.selfEvaluation.id),
          averageScore: Number(row.selfEvaluation.averageScore ?? 0),
          answers: (row.selfEvaluation.answers ?? []).map((answer) => ({
            ...answer,
            id: String(answer.id),
            score: answer.score === null || answer.score === undefined ? null : Number(answer.score),
            selectedValue: answer.selectedValue ?? "",
            comment: answer.comment ?? "",
          })),
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    evaluatorName,
    comments: row.comments ?? "",
  };
}

function toBackendPayload(
  payload: Partial<{
    agentId: string;
    campaignId?: string;
    period: string;
    score: number;
    status: EvaluationStatus;
    evaluatorId?: string;
    evaluatorName: string;
    comments?: string;
    criteriaScores?: EvaluationCriterionScore[];
  }>
) {
  const next: Record<string, unknown> = { ...payload };

  if ("agentId" in next) {
    next.agent = next.agentId;
    delete next.agentId;
  }

  if ("evaluatorId" in next) {
    next.evaluator = next.evaluatorId;
    delete next.evaluatorId;
  }

  if ("campaignId" in next) {
    next.campaign = next.campaignId;
    delete next.campaignId;
  }

  if (Array.isArray(next.criteriaScores)) {
    next.criteriaScores = next.criteriaScores.map((item) => ({
      criterionId: item.criterionId,
      score: item.score,
      comment: item.comment ?? "",
    }));
  }

  return next;
}

export const evaluationAPI = {
  async list(): Promise<Evaluation[]> {
    const res = await api.get<{ success: boolean; data: EvaluationRow[] }>("/evaluations");
    return res.data.data.map(mapEvaluation);
  },

  async get(id: string): Promise<Evaluation> {
    const res = await api.get<{ success: boolean; data: EvaluationRow }>(`/evaluations/${id}`);
    return mapEvaluation(res.data.data);
  },

  async create(payload: {
    agentId: string;
    campaignId?: string;
    period: string;
    score: number;
    status: EvaluationStatus;
    evaluatorId?: string;
    evaluatorName: string;
    comments?: string;
    criteriaScores?: EvaluationCriterionScore[];
  }): Promise<Evaluation> {
    const res = await api.post<{ success: boolean; data: EvaluationRow }>("/evaluations", toBackendPayload(payload));
    return mapEvaluation(res.data.data);
  },

  async update(
    id: string,
      payload: Partial<{
        agentId: string;
        campaignId?: string;
        period: string;
        score: number;
        status: EvaluationStatus;
        evaluatorId?: string;
        evaluatorName: string;
        comments?: string;
        criteriaScores?: EvaluationCriterionScore[];
      }>
  ): Promise<Evaluation> {
    const res = await api.patch<{ success: boolean; data: EvaluationRow }>(`/evaluations/${id}`, toBackendPayload(payload));
    return mapEvaluation(res.data.data);
  },

  async saveDraft(
    id: string,
    payload: Partial<{
      agentId: string;
      campaignId?: string;
      period: string;
      score: number;
      comments?: string;
      criteriaScores?: EvaluationCriterionScore[];
    }>
  ): Promise<Evaluation> {
    const res = await api.post<{ success: boolean; data: EvaluationRow }>(`/evaluations/${id}/draft`, toBackendPayload(payload));
    return mapEvaluation(res.data.data);
  },

  async submit(
    id: string,
    payload: Partial<{
      agentId: string;
      campaignId?: string;
      period: string;
      score: number;
      comments?: string;
      criteriaScores?: EvaluationCriterionScore[];
    }>
  ): Promise<Evaluation> {
    const res = await api.post<{ success: boolean; data: EvaluationRow }>(`/evaluations/${id}/submit`, toBackendPayload(payload));
    return mapEvaluation(res.data.data);
  },

  async validate(id: string, approved: boolean, feedback?: string): Promise<Evaluation> {
    const res = await api.post<{ success: boolean; data: EvaluationRow }>(`/evaluations/${id}/validate`, {
      approved,
      feedback: feedback ?? "",
    });
    return mapEvaluation(res.data.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/evaluations/${id}`);
  },

  async listCriteria(profileId?: string): Promise<EvaluationCriterion[]> {
    const res = await api.get<{ success: boolean; data: any[] }>("/evaluation-criteria", {
      params: profileId ? { profileId } : undefined,
    });
    return res.data.data.map((item) => ({
      id: String(item.id),
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      scoreType: item.scoreType,
      weight: Number(item.weight ?? 0),
      minScore: Number(item.minScore ?? 0),
      maxScore: Number(item.maxScore ?? 5),
      isRequired: !!item.isRequired,
    }));
  },

  stats(items: Evaluation[]) {
    const byStatus: Record<EvaluationStatus, number> = {
      draft: 0,
      in_progress: 0,
      submitted: 0,
      manager_validated: 0,
      hr_validated: 0,
      rejected: 0,
    };

    let sum = 0;
    let count = 0;
    for (const item of items) {
      if (item.status in byStatus) {
        byStatus[item.status] += 1;
      }

      const score = Number(item.finalScore || item.score || 0);
      if (Number.isFinite(score) && score > 0) {
        sum += score;
        count += 1;
      }
    }

    return {
      total: items.length,
      byStatus,
      avgScore: count ? Math.round(sum / count) : 0,
    };
  },
};
