// src/hooks/useEvaluations.ts
import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

export interface CampaignStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  averageScore: number;
}

export interface EvaluationStats {
  byService: Record<string, number>;
  byStatus: Record<string, number>;
  performanceLevels: {
    insufficient: number;
    average: number;
    good: number;
    excellent: number;
  };
}

/**
 * Hook for managing evaluations
 */
export const useEvaluations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatistics = useCallback(async (campaignId?: number): Promise<CampaignStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.append("campaignId", campaignId.toString());

      const response = await api.get(`/evaluations${params.toString() ? `?${params}` : ""}`);
      if (!response.data.success) throw new Error("Impossible de récupérer les statistiques");

      const rows = response.data.data ?? [];
      const completed = rows.filter((item: any) => item.status === "hr_validated").length;
      const pending = rows.filter((item: any) => item.status === "submitted" || item.status === "manager_validated").length;
      const inProgress = rows.filter((item: any) => item.status === "draft" || item.status === "in_progress").length;
      const scored = rows.map((item: any) => Number(item.finalScore || item.score || 0)).filter((score: number) => score > 0);

      return {
        total: rows.length,
        completed,
        pending,
        inProgress,
        averageScore: scored.length ? Math.round(scored.reduce((sum: number, score: number) => sum + score, 0) / scored.length) : 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEvaluationDetails = useCallback(async (evaluationId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/evaluations/${evaluationId}`);
      if (!response.data.success) throw new Error("Evaluation introuvable");

      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitEvaluation = useCallback(async (evaluationId: number, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/evaluations/${evaluationId}/submit`, data);
      if (!response.data.success) throw new Error("Impossible de soumettre l&#39;évaluation");

      toast.success("Évaluation soumise avec succès");
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la soumission";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (evaluationId: number, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/evaluations/${evaluationId}/draft`, data);
      if (!response.data.success) throw new Error("Impossible d'enregistrer le brouillon");

      toast.success("Brouillon enregistré");
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateEvaluation = useCallback(async (evaluationId: number, approved: boolean, feedback?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/evaluations/${evaluationId}/validate`, {
        approved,
        feedback,
      });
      if (!response.data.success) throw new Error("Impossible de valider l'évaluation");

      toast.success(approved ? "Évaluation approuvée" : "Évaluation rejetée");
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la validation";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getStatistics,
    getEvaluationDetails,
    submitEvaluation,
    saveDraft,
    validateEvaluation,
  };
};

/**
 * Hook for managing evaluation campaigns
 */
export const useEvaluationCampaigns = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/evaluation-campaigns");
      if (!response.data.success) throw new Error("Impossible de récupérer les campagnes");

      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getCampaignDetails = useCallback(async (campaignId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/evaluation-campaigns/${campaignId}`);
      if (!response.data.success) throw new Error("Campagne introuvable");

      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/evaluation-campaigns", data);
      if (!response.data.success) throw new Error("Impossible de créer la campagne");

      toast.success("Campagne créée avec succès");
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getCampaigns,
    getCampaignDetails,
    createCampaign,
  };
};
