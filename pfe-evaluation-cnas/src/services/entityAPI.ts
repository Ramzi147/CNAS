import api from "./api";
import type {
  Structure,
  Service,
  Agent,
  Agency,
  JobFamily,
  JobPosition,
  EvaluationProfile,
  AttendanceRecord,
  LeaveRecord,
  DailyFollowUp,
  AppUser,
} from "../types/entities";

// ========== AGENCIES ==========
export const agencyAPI = {
  list: () => api.get<{ success: boolean; data: Agency[] }>("/agencies"),
  get: (id: string) => api.get<{ success: boolean; data: Agency }>(`/agencies/${id}`),
  create: (data: Omit<Agency, "id" | "createdAt">) =>
    api.post<{ success: boolean; data: Agency }>("/agencies", data),
  update: (id: string, data: Partial<Agency>) =>
    api.put<{ success: boolean; data: Agency }>(`/agencies/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; data: Agency }>(`/agencies/${id}`),
};

// ========== STRUCTURES ==========
export const structureAPI = {
  list: (agencyId?: string) => {
    const url = agencyId ? `/structures?agencyId=${agencyId}` : "/structures";
    return api.get<{ success: boolean; data: Structure[] }>(url);
  },
  get: (id: string) => api.get<{ success: boolean; data: Structure }>(`/structures/${id}`),
  create: (data: Omit<Structure, "id" | "createdAt">) =>
    api.post<{ success: boolean; data: Structure }>("/structures", data),
  update: (id: string, data: Partial<Structure>) =>
    api.put<{ success: boolean; data: Structure }>(`/structures/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; data: Structure }>(`/structures/${id}`),
};

// ========== SERVICES ==========
export const serviceAPI = {
  list: (structureId?: string) => {
    const url = structureId ? `/services?structureId=${structureId}` : "/services";
    return api.get<{ success: boolean; data: Service[] }>(url);
  },
  get: (id: string) => api.get<{ success: boolean; data: Service }>(`/services/${id}`),
  create: (data: Omit<Service, "id" | "createdAt">) =>
    api.post<{ success: boolean; data: Service }>("/services", data),
  update: (id: string, data: Partial<Service>) =>
    api.put<{ success: boolean; data: Service }>(`/services/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; data: Service }>(`/services/${id}`),
};

// ========== AGENTS ==========
export const agentAPI = {
  list: (serviceId?: string, managerId?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.set("serviceId", serviceId);
    if (managerId) params.set("managerId", managerId);
    const url = params.toString() ? `/agents?${params.toString()}` : "/agents";
    return api.get<{ success: boolean; data: Agent[] }>(url);
  },
  get: (id: string) => api.get<{ success: boolean; data: Agent }>(`/agents/${id}`),
  create: (data: Omit<Agent, "id">) => api.post<{ success: boolean; data: Agent }>("/agents", data),
  update: (id: string, data: Partial<Agent>) =>
    api.put<{ success: boolean; data: Agent }>(`/agents/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; data: Agent }>(`/agents/${id}`),
};

export const jobPositionAPI = {
  list: () => api.get<{ success: boolean; data: JobPosition[] }>("/job-positions"),
  get: (id: string) => api.get<{ success: boolean; data: JobPosition }>(`/job-positions/${id}`),
};

export const jobFamilyAPI = {
  list: () => api.get<{ success: boolean; data: JobFamily[] }>("/job-families"),
  get: (id: string) => api.get<{ success: boolean; data: JobFamily }>(`/job-families/${id}`),
};

export const evaluationProfileAPI = {
  list: () => api.get<{ success: boolean; data: EvaluationProfile[] }>("/evaluation-profiles"),
  get: (id: string) => api.get<{ success: boolean; data: EvaluationProfile }>(`/evaluation-profiles/${id}`),
};

export const attendanceRecordAPI = {
  list: (agentId?: string) => {
    const url = agentId ? `/attendance-records?agentId=${agentId}` : "/attendance-records";
    return api.get<{ success: boolean; data: AttendanceRecord[] }>(url);
  },
  create: (data: {
    agentId: string;
    date: string;
    status: AttendanceRecord["status"];
    minutesLate?: number;
    remark?: string;
    recordedById?: string;
  }) => api.post<{ success: boolean; data: AttendanceRecord }>("/attendance-records", data),
};

export const leaveRecordAPI = {
  list: (agentId?: string) => {
    const url = agentId ? `/leave-records?agentId=${agentId}` : "/leave-records";
    return api.get<{ success: boolean; data: LeaveRecord[] }>(url);
  },
};

export const dailyFollowupAPI = {
  list: (agentId?: string, managerId?: string) => {
    const params = new URLSearchParams();
    if (agentId) params.set("agentId", agentId);
    if (managerId) params.set("managerId", managerId);
    const url = params.toString() ? `/daily-followups?${params.toString()}` : "/daily-followups";
    return api.get<{ success: boolean; data: DailyFollowUp[] }>(url);
  },
  create: (data: {
    agentId: string;
    managerId?: string;
    date: string;
    presenceStatus: DailyFollowUp["presenceStatus"];
    qualityNote: number;
    disciplineNote: number;
    remark?: string;
  }) => api.post<{ success: boolean; data: DailyFollowUp }>("/daily-followups", data),
  complete: (data: {
    agentId: string;
    date: string;
    presenceStatus: DailyFollowUp["presenceStatus"];
    minutesLate?: number;
    qualityNote: number;
    disciplineNote: number;
    remark?: string;
  }) => api.post<{ success: boolean; data: { attendance: AttendanceRecord; followup: DailyFollowUp } }>("/daily-followups/complete", data),
};

export const userAPI = {
  list: () => api.get<{ success: boolean; data: AppUser[] }>("/auth/users"),
  create: (data: {
    email: string;
    password?: string;
    full_name: string;
    role: AppUser["role"];
    is_active?: boolean;
    is_staff?: boolean;
  }) => api.post<{ success: boolean; data: AppUser }>("/auth/users", data),
  update: (id: string, data: Partial<AppUser> & { password?: string }) =>
    api.put<{ success: boolean; data: AppUser }>(`/auth/users/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; data: AppUser }>(`/auth/users/${id}`),
};
