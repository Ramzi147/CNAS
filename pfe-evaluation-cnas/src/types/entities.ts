export type Agency = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  createdAt: string;
};

export type Structure = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  headOfStructure: string;
  createdAt: string;
};

export type Service = {
  id: string;
  structureId: string;
  name: string;
  code: string;
  serviceHead: string;
  createdAt: string;
};

export type JobFamily = {
  id: string;
  name: string;
  code: string;
  description: string;
  performanceWeight: number;
  competencyWeight: number;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  serviceId: string;
  userId?: string | null;
  managerId?: string | null;
  managerName?: string;
  jobFamilyId?: string | null;
  jobFamilyName?: string;
  jobPositionId?: string | null;
  jobPositionTitle?: string;
  evaluationProfileId?: string | null;
  evaluationProfileName?: string;
  fullName: string;
  matricule: string;
  position: string;
  email: string;
  phone: string;
  hireDate: string;
  status: "active" | "inactive";
};

export type JobPosition = {
  id: string;
  title: string;
  code: string;
  jobFamilyId?: string | null;
  jobFamilyName?: string;
  category: "execution" | "support" | "management" | "strategic";
  hierarchyLevel: number;
  isQuantitative: boolean;
  isManagerial: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationProfile = {
  id: string;
  name: string;
  jobFamilyId?: string | null;
  jobFamilyName?: string;
  description: string;
  targetCategory: JobPosition["category"];
  quantitativeWeight: number;
  qualitativeWeight: number;
  attendanceWeight: number;
  selfWeight: number;
  managerialWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRecord = {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  status: "present" | "absent" | "late" | "sick_leave";
  minutesLate: number;
  remark: string;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRecord = {
  id: string;
  agentId: string;
  agentName: string;
  leaveType: "sick" | "paid" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  justified: boolean;
  medicalCertificate: boolean;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyFollowUp = {
  id: string;
  agentId: string;
  agentName: string;
  managerId?: string | null;
  managerName?: string;
  date: string;
  presenceStatus: AttendanceRecord["status"];
  qualityNote: number;
  disciplineNote: number;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceMetrics = {
  totalEvaluations: number;
  averageScore: number;
  pendingEvaluations: number;
  completedEvaluations: number;
};

export type AppUserRole = "superadmin" | "admin" | "hr" | "manager" | "agent" | "employee";

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  role: AppUserRole;
  is_active: boolean;
  is_staff: boolean;
};
