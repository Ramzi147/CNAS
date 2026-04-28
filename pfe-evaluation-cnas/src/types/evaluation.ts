export type EvaluationStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "manager_validated"
  | "hr_validated"
  | "rejected";

export type CriterionCategory =
  | "quantitative"
  | "qualitative"
  | "attendance"
  | "self"
  | "managerial";

export type EvaluationCriterion = {
  id: string;
  name: string;
  description: string;
  category: CriterionCategory;
  scoreType: "numeric" | "rating";
  weight: number;
  minScore: number;
  maxScore: number;
  isRequired: boolean;
};

export type EvaluationCriterionScore = {
  id?: string;
  criterionId: string;
  score: number;
  comment: string;
  criterion?: EvaluationCriterion;
};

export type Evaluation = {
  id: string;
  agentId?: string;
  evaluatorId?: string;
  campaignId?: string | null;

  employeeName: string;
  employeeMatricule: string;
  jobFamilyId?: string | null;
  jobFamilyName?: string;

  period: string; // ex: "2025-S2"
  score: number; // 0..100
  performanceScore: number;
  competencyScore: number;
  quantitativeScore: number;
  qualitativeScore: number;
  attendanceScore: number;
  selfScore: number;
  managerialScore: number;
  finalScore: number;
  status: EvaluationStatus;
  managerValidated: boolean;
  hrValidated: boolean;
  criteriaScores: EvaluationCriterionScore[];
  selfEvaluation?: {
    id: string;
    status: string;
    averageScore: number;
    overallComment: string;
    positivePoints: string;
    difficulties: string;
    supportNeeds: string;
    improvementSuggestions: string;
    collaborationComment: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    integratedAt?: string | null;
    answers: Array<{
      id: string;
      questionKey: string;
      sectionKey: string;
      sectionTitle: string;
      questionText: string;
      answerType: string;
      score?: number | null;
      selectedValue?: string;
      comment: string;
      isRequired: boolean;
    }>;
  } | null;

  createdAt: string; // ISO
  updatedAt: string; // ISO

  evaluatorName: string; // manager/RH
  comments?: string;
};
