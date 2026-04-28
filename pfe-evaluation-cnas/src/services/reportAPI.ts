import api from "./api";

export type Report = {
  id: string;
  title: string;
  reportType: "campaign" | "team" | "individual" | "audit" | "compliance";
  format: "pdf" | "csv" | "summary";
  campaignId?: string | null;
  campaignName: string;
  filters: Record<string, unknown>;
  summary: {
    evaluations?: number;
    averageScore?: number;
    validated?: number;
    pending?: number;
    statusCounts?: Record<string, number>;
  };
  fileName: string;
  generatedByName?: string;
  createdAt: string;
};

export const reportAPI = {
  list: (params?: { reportType?: Report["reportType"]; campaignId?: string }) =>
    api.get<{ success: boolean; data: Report[] }>("/reports", { params }),
  create: (payload: {
    title: string;
    reportType: Report["reportType"];
    format: Report["format"];
    campaignId?: string;
    filters?: Record<string, unknown>;
  }) => api.post<{ success: boolean; data: Report }>("/reports", payload),
  download: (id: string) => api.get<Blob>(`/reports/${id}/download`, { responseType: "blob" }),
  remove: (id: string) => api.delete<{ success: boolean; data: Report }>(`/reports/${id}`),
};
