import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { colors } from "../../styles/constants";
import ScoreCircle from "./ScoreCircle";
import SkillScoreBar from "./SkillScoreBar";

export interface EvaluationCriteria {
  id: string;
  name: string;
  description?: string;
  weight: number;
  score: number;
  maxScore: number;
}

export interface EvaluationQuestion {
  id: string;
  type: "scale" | "yesno" | "text";
  label: string;
  description?: string;
  answer?: string | number;
}

export interface EvaluationFormData {
  criteria: EvaluationCriteria[];
  questions: EvaluationQuestion[];
  comments: string;
}

interface EvaluationFormProps {
  employeeName: string;
  evaluationType: "manager" | "self" | "hr";
  criteria: EvaluationCriteria[];
  questions: EvaluationQuestion[];
  comments?: string;
  onSubmit: (data: EvaluationFormData) => Promise<void>;
  onSaveDraft?: (data: EvaluationFormData) => Promise<void>;
  readOnly?: boolean;
  loading?: boolean;
}

const evaluationTypeLabels: Record<EvaluationFormProps["evaluationType"], string> = {
  manager: "Evaluation manager",
  self: "Auto-evaluation",
  hr: "Validation RH",
};

const EvaluationForm = ({
  employeeName,
  evaluationType,
  criteria,
  questions,
  comments: initialComments = "",
  onSubmit,
  onSaveDraft,
  readOnly = false,
  loading = false,
}: EvaluationFormProps) => {
  const [formData, setFormData] = useState<EvaluationFormData>({
    criteria,
    questions,
    comments: initialComments,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      criteria,
      questions,
      comments: initialComments,
    });
  }, [criteria, initialComments, questions]);

  const totalScore = useMemo(() => {
    if (formData.criteria.length === 0) {
      return 0;
    }

    const totalWeight = formData.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (totalWeight === 0) {
      return 0;
    }

    const weightedScore = formData.criteria.reduce((sum, criterion) => {
      const ratio = criterion.maxScore > 0 ? criterion.score / criterion.maxScore : 0;
      return sum + ratio * criterion.weight;
    }, 0);

    return (weightedScore / totalWeight) * 100;
  }, [formData.criteria]);

  const handleCriteriaScoreChange = (criteriaId: string, score: number) => {
    setFormData((previous) => ({
      ...previous,
      criteria: previous.criteria.map((criterion) =>
        criterion.id === criteriaId ? { ...criterion, score } : criterion,
      ),
    }));
  };

  const handleQuestionAnswerChange = (questionId: string, answer: string | number) => {
    setFormData((previous) => ({
      ...previous,
      questions: previous.questions.map((question) =>
        question.id === questionId ? { ...question, answer } : question,
      ),
    }));
  };

  const handleCommentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormData((previous) => ({ ...previous, comments: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) {
      return;
    }

    setSubmitting(true);
    try {
      await onSaveDraft(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader
          title={evaluationTypeLabels[evaluationType]}
          subheader={`Employe: ${employeeName}`}
          sx={{
            backgroundColor: colors.primary[50],
            borderBottom: `1px solid ${colors.primary[200]}`,
          }}
        />
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography sx={{ mb: 0.5, color: colors.neutral[600], fontSize: "0.875rem" }}>
                Score estime
              </Typography>
              <Typography sx={{ color: colors.primary[700], fontSize: "1.5rem", fontWeight: 700 }}>
                {totalScore.toFixed(1)}/100
              </Typography>
            </Box>
            <ScoreCircle score={Math.round(totalScore)} showLabel={false} size="medium" />
          </Box>
        </CardContent>
      </Card>

      {formData.criteria.length > 0 && (
        <Card>
          <CardHeader
            title="Criteres de competence"
            subheader={`${formData.criteria.length} competences a evaluer`}
            titleTypographyProps={{ variant: "h5" }}
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {formData.criteria.map((criterion) => (
                <Box key={criterion.id}>
                  <SkillScoreBar
                    name={criterion.name}
                    description={criterion.description}
                    score={criterion.score}
                    maxScore={criterion.maxScore}
                    weight={criterion.weight}
                    size="medium"
                  />
                  {!readOnly && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end", mt: 1.5 }}>
                      {Array.from({ length: criterion.maxScore }, (_, index) => index + 1).map((score) => (
                        <Button
                          key={score}
                          variant={criterion.score === score ? "contained" : "outlined"}
                          size="small"
                          onClick={() => handleCriteriaScoreChange(criterion.id, score)}
                          sx={{ minWidth: 40, p: 1 }}
                        >
                          {score}
                        </Button>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {formData.questions.length > 0 && (
        <Card>
          <CardHeader
            title="Questions d'evaluation"
            subheader={`${formData.questions.length} questions`}
            titleTypographyProps={{ variant: "h5" }}
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {formData.questions.map((question) => (
                <Box key={question.id}>
                  <Typography sx={{ mb: 1, color: colors.neutral[900], fontSize: "1rem", fontWeight: 600 }}>
                    {question.label}
                  </Typography>
                  {question.description && (
                    <Typography
                      sx={{
                        mb: 1.5,
                        color: colors.neutral[600],
                        fontSize: "0.875rem",
                        fontStyle: "italic",
                      }}
                    >
                      {question.description}
                    </Typography>
                  )}

                  {question.type === "scale" && (
                    <RadioGroup
                      row
                      value={question.answer ?? ""}
                      onChange={(event) =>
                        handleQuestionAnswerChange(question.id, Number.parseInt(event.target.value, 10))
                      }
                      sx={{ gap: 2 }}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <FormControlLabel
                          key={value}
                          value={value}
                          control={<Radio disabled={readOnly} />}
                          label={value.toString()}
                        />
                      ))}
                    </RadioGroup>
                  )}

                  {question.type === "yesno" && (
                    <RadioGroup
                      row
                      value={question.answer ?? ""}
                      onChange={(event) => handleQuestionAnswerChange(question.id, event.target.value)}
                      sx={{ gap: 2 }}
                    >
                      <FormControlLabel value="yes" control={<Radio disabled={readOnly} />} label="Oui" />
                      <FormControlLabel value="no" control={<Radio disabled={readOnly} />} label="Non" />
                    </RadioGroup>
                  )}

                  {question.type === "text" && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={typeof question.answer === "string" ? question.answer : ""}
                      onChange={(event) => handleQuestionAnswerChange(question.id, event.target.value)}
                      disabled={readOnly}
                      placeholder="Votre reponse..."
                    />
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader title="Commentaires generaux" titleTypographyProps={{ variant: "h5" }} />
        <Divider />
        <CardContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Ajouter des commentaires..."
            value={formData.comments}
            onChange={handleCommentsChange}
            disabled={readOnly}
            placeholder="Commentaires sur la performance, points forts, points a ameliorer..."
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "flex-end" }}>
          {onSaveDraft && (
            <Button variant="outlined" onClick={handleSaveDraft} disabled={submitting || loading}>
              Enregistrer le brouillon
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || loading}
            sx={{ minWidth: 180 }}
          >
            {submitting || loading ? "Traitement..." : "Soumettre l'evaluation"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default EvaluationForm;
