import api from "./api";

export type ComplianceRequestType = "export" | "rectification" | "contestation" | "correction";
export type ComplianceRequestStatus = "open" | "in_review" | "approved" | "rejected" | "closed";

export type ComplianceRequest = {
  id: string;
  requestType: ComplianceRequestType;
  status: ComplianceRequestStatus;
  requesterEmail: string;
  employeeId?: string | null;
  employeeName?: string;
  evaluationId?: string | null;
  assignedManagerId?: string | null;
  assignedManagerName?: string;
  subject: string;
  reason: string;
  managerResponse?: string;
  managerReviewedAt?: string | null;
  response?: string;
  resolvedByName?: string;
  resolvedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingRegister = {
  id: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string;
  recipients: string;
  retentionPeriod: string;
  securityMeasures: string;
  dpdContact: string;
  status: "active" | "under_review" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type EvaluationFormVersion = {
  id: string;
  profileId: string;
  profileName: string;
  version: number;
  status: "draft" | "active" | "archived";
  title: string;
  description: string;
  schema: Record<string, unknown>;
  activatedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const complianceAPI = {
  listRequests: (params?: { requestType?: ComplianceRequestType; status?: ComplianceRequestStatus }) =>
    api.get<{ success: boolean; data: ComplianceRequest[] }>("/compliance-requests", { params }),

  createRequest: (payload: {
    requestType: ComplianceRequestType;
    employeeId?: string;
    evaluationId?: string;
    subject: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) => api.post<{ success: boolean; data: ComplianceRequest }>("/compliance-requests", payload),

  resolveRequest: (id: string, payload: { status: "approved" | "rejected" | "closed"; response: string }) =>
    api.post<{ success: boolean; data: ComplianceRequest }>(`/compliance-requests/${id}/resolve`, payload),

  managerReview: (id: string, payload: { managerResponse: string }) =>
    api.post<{ success: boolean; data: ComplianceRequest }>(`/compliance-requests/${id}/manager-review`, payload),

  listRegisters: () => api.get<{ success: boolean; data: ProcessingRegister[] }>("/processing-registers"),

  createRegister: (payload: Omit<ProcessingRegister, "id" | "createdAt" | "updatedAt">) =>
    api.post<{ success: boolean; data: ProcessingRegister }>("/processing-registers", payload),

  listFormVersions: (params?: { profileId?: string; status?: EvaluationFormVersion["status"] }) =>
    api.get<{ success: boolean; data: EvaluationFormVersion[] }>("/evaluation-form-versions", { params }),

  createFormVersion: (payload: {
    profileId: string;
    version: number;
    status: EvaluationFormVersion["status"];
    title: string;
    description?: string;
    schema?: Record<string, unknown>;
  }) => api.post<{ success: boolean; data: EvaluationFormVersion }>("/evaluation-form-versions", payload),

  updateFormVersion: (id: string, payload: Partial<{
    profileId: string;
    version: number;
    status: EvaluationFormVersion["status"];
    title: string;
    description: string;
    schema: Record<string, unknown>;
  }>) => api.patch<{ success: boolean; data: EvaluationFormVersion }>(`/evaluation-form-versions/${id}`, payload),

  activateFormVersion: (id: string) =>
    api.post<{ success: boolean; data: EvaluationFormVersion }>(`/evaluation-form-versions/${id}/activate`),

  archiveFormVersion: (id: string) =>
    api.post<{ success: boolean; data: EvaluationFormVersion }>(`/evaluation-form-versions/${id}/archive`),
};
