import api from "./api";

export type AuditEvent = {
  id: string | number;
  action: string;
  userEmail: string;
  entity: string;
  entityId: string;
  ipAddress?: string | null;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export const auditAPI = {
  list: (params?: { entity?: string; action?: string }) =>
    api.get<{ success: boolean; data: AuditEvent[] }>("/audit-events", { params }),
};
