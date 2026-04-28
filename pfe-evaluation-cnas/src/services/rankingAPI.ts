import api from "./api";

export type RankingSnapshot = {
  id: string;
  campaignId?: string | null;
  employeeId: string;
  employeeName: string;
  serviceName: string;
  jobFamilyName: string;
  comparisonScope: string;
  rankGlobal: number;
  rankService: number;
  rankJobFamily: number;
  performanceScore: number;
  competencyScore: number;
  finalScore: number;
  isBestEmployee: boolean;
  isWorstEmployee: boolean;
  createdAt: string;
};

export type EvaluationCampaign = {
  id: string;
  name: string;
  periodType: "monthly" | "quarterly" | "semester" | "yearly";
  startDate: string;
  endDate: string;
  status: "draft" | "open" | "closed";
  description: string;
  assignmentsCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignAssignment = {
  id: string;
  campaignId: string;
  campaignName: string;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  managerId?: string | null;
  managerName: string;
  evaluationId?: string | null;
  evaluationDisplayScore?: number | null;
  evaluationStatus?: "draft" | "in_progress" | "submitted" | "manager_validated" | "hr_validated" | "rejected" | null;
  evaluationFinalScore?: number | null;
  evaluationUpdatedAt?: string | null;
  evaluationComments?: string;
  status: "planned" | "assigned" | "in_progress" | "completed" | "cancelled";
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationCriterion = {
  id: string;
  profileId: string;
  name: string;
  description: string;
  category: "quantitative" | "qualitative" | "attendance" | "self" | "managerial";
  scoreType: "numeric" | "rating";
  weight: number;
  minScore: number;
  maxScore: number;
  isRequired: boolean;
};

export const rankingSnapshotAPI = {
  list: (campaignId?: string, jobFamilyId?: string) => {
    const params = new URLSearchParams();
    if (campaignId) params.set("campaignId", campaignId);
    if (jobFamilyId) params.set("jobFamilyId", jobFamilyId);
    const query = params.toString();
    const url = query ? `/ranking-snapshots?${query}` : "/ranking-snapshots";
    return api.get<{ success: boolean; data: RankingSnapshot[] }>(url);
  },
  recalculate: (campaignId?: string) =>
    api.post<{ success: boolean; data: { snapshots: number } }>("/ranking-snapshots/recalculate", { campaignId }),
};

export const evaluationCampaignAPI = {
  list: () => api.get<{ success: boolean; data: EvaluationCampaign[] }>("/evaluation-campaigns"),
  create: (data: {
    name: string;
    periodType: EvaluationCampaign["periodType"];
    startDate: string;
    endDate: string;
    status: EvaluationCampaign["status"];
    description?: string;
  }) => api.post<{ success: boolean; data: EvaluationCampaign }>("/evaluation-campaigns", data),
  update: (id: string, data: Partial<EvaluationCampaign>) =>
    api.patch<{ success: boolean; data: EvaluationCampaign }>(`/evaluation-campaigns/${id}`, data),
  remove: (id: string) => api.delete<{ success: boolean; data: EvaluationCampaign }>(`/evaluation-campaigns/${id}`),
  open: (id: string) => api.post<{ success: boolean; data: EvaluationCampaign }>(`/evaluation-campaigns/${id}/open`),
  close: (id: string) => api.post<{ success: boolean; data: EvaluationCampaign }>(`/evaluation-campaigns/${id}/close`),
  assign: (id: string, agentIds: string[]) =>
    api.post<{ success: boolean; data: CampaignAssignment[] }>(`/evaluation-campaigns/${id}/assign`, { agentIds }),
};

export const campaignAssignmentAPI = {
  list: (campaignId?: string) =>
    api.get<{ success: boolean; data: CampaignAssignment[] }>("/campaign-assignments", {
      params: campaignId ? { campaignId } : undefined,
    }),
  update: (id: string, data: Partial<CampaignAssignment>) =>
    api.patch<{ success: boolean; data: CampaignAssignment }>(`/campaign-assignments/${id}`, data),
};

export const evaluationCriterionAPI = {
  list: (profileId?: string) => {
    const url = profileId ? `/evaluation-criteria?profileId=${profileId}` : "/evaluation-criteria";
    return api.get<{ success: boolean; data: EvaluationCriterion[] }>(url);
  },
};
