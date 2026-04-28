export type SelfEvaluationStatus = "draft" | "submitted" | "reviewed" | "integrated";

export type SelfEvaluationAnswerType = "rating" | "select" | "yes_no" | "text";

export type SelfEvaluationQuestion = {
  key: string;
  criterionId?: string | null;
  text: string;
  type: SelfEvaluationAnswerType;
  required: boolean;
  options?: string[];
};

export type SelfEvaluationSection = {
  key: string;
  title: string;
  questions: SelfEvaluationQuestion[];
};

export type SelfEvaluationAnswer = {
  id?: string;
  criterionId?: string | null;
  questionKey: string;
  sectionKey: string;
  sectionTitle: string;
  questionText: string;
  answerType: SelfEvaluationAnswerType;
  score?: number | null;
  selectedValue?: string;
  comment: string;
  isRequired: boolean;
};

export type ManagerEvaluationSummary = {
  id: string;
  status: string;
  finalScore: number;
  selfScore: number;
  managerialScore: number;
  period: string;
};

export type SelfEvaluation = {
  id: string;
  evaluationId?: string | null;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  serviceId: string;
  serviceName: string;
  campaignId?: string | null;
  campaignName: string;
  period: string;
  status: SelfEvaluationStatus;
  overallComment: string;
  positivePoints: string;
  difficulties: string;
  supportNeeds: string;
  improvementSuggestions: string;
  collaborationComment: string;
  submittedAt?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string;
  reviewedAt?: string | null;
  integratedAt?: string | null;
  averageScore: number;
  answers: SelfEvaluationAnswer[];
  managerEvaluation?: ManagerEvaluationSummary | null;
  createdAt: string;
  updatedAt: string;
};
