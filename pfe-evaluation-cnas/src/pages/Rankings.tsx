import { useEffect, useMemo, useState } from "react";
import { jobFamilyAPI } from "../services/entityAPI";
import { evaluationCampaignAPI, rankingSnapshotAPI, type EvaluationCampaign, type RankingSnapshot } from "../services/rankingAPI";
import type { JobFamily } from "../types/entities";

export default function Rankings() {
  const [campaigns, setCampaigns] = useState<EvaluationCampaign[]>([]);
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [rankings, setRankings] = useState<RankingSnapshot[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedJobFamilyId, setSelectedJobFamilyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    setLoading(true);
    Promise.all([evaluationCampaignAPI.list(), rankingSnapshotAPI.list(), jobFamilyAPI.list()])
      .then(([campaignRes, rankingRes, familyRes]) => {
        const loadedCampaigns = campaignRes.data.data;
        const loadedFamilies = familyRes.data.data;
        setCampaigns(loadedCampaigns);
        setJobFamilies(loadedFamilies);
        setRankings(rankingRes.data.data);
        setSelectedCampaignId(loadedCampaigns[0]?.id ?? "");
        setSelectedJobFamilyId(loadedFamilies[0]?.id ?? "");
      })
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || "Chargement impossible."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const recalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      await rankingSnapshotAPI.recalculate(selectedCampaignId || undefined);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Recalcul impossible.");
    } finally {
      setRecalculating(false);
    }
  };

  const selectedFamily = useMemo(
    () => jobFamilies.find((family) => family.id === selectedJobFamilyId),
    [jobFamilies, selectedJobFamilyId]
  );

  const filtered = useMemo(
    () =>
      rankings.filter(
        (item) =>
          (!selectedCampaignId || item.campaignId === selectedCampaignId) &&
          (!selectedFamily || item.jobFamilyName === selectedFamily.name)
      ),
    [rankings, selectedCampaignId, selectedFamily]
  );

  const best = filtered.find((item) => item.isBestEmployee) ?? filtered[0];
  const worst = filtered.find((item) => item.isWorstEmployee) ?? filtered[filtered.length - 1];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Comparaison metier</div>
          <div style={styles.title}>Comparaison par famille de poste</div>
          <div style={styles.sub}>
            Cette vue limite l'analyse a une population comparable. Elle ne produit aucun classement global CNAS.
          </div>
        </div>

        <div style={styles.filters}>
          <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)} style={styles.select}>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>

          <select value={selectedJobFamilyId} onChange={(e) => setSelectedJobFamilyId(e.target.value)} style={styles.select}>
            {jobFamilies.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
          <button style={styles.primaryBtn} onClick={() => void recalculate()} disabled={recalculating}>
            {recalculating ? "Recalcul..." : "Recalculer"}
          </button>
        </div>
      </div>

      {selectedFamily && (
        <section style={styles.scopeCard}>
          <div style={styles.scopeTitle}>{selectedFamily.name}</div>
          <div style={styles.scopeMeta}>
            Poids performance {selectedFamily.performanceWeight}% · poids competences {selectedFamily.competencyWeight}%
          </div>
          <div style={styles.scopeText}>{selectedFamily.description || "Famille metier configurable pour une evaluation non uniforme."}</div>
        </section>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Chargement des comparaisons...</div>
      ) : (
        <>
          <div style={styles.heroGrid}>
            <div style={{ ...styles.heroCard, ...styles.bestCard }}>
              <div style={styles.heroLabel}>Repere haut de la famille</div>
              <div style={styles.heroName}>{best?.employeeName ?? "-"}</div>
              <div style={styles.heroMeta}>
                {best?.serviceName ?? "-"} · global {best?.finalScore ?? 0} · perf {best?.performanceScore ?? 0} · comp {best?.competencyScore ?? 0}
              </div>
            </div>

            <div style={{ ...styles.heroCard, ...styles.worstCard }}>
              <div style={styles.heroLabel}>Repere bas a accompagner</div>
              <div style={styles.heroName}>{worst?.employeeName ?? "-"}</div>
              <div style={styles.heroMeta}>
                {worst?.serviceName ?? "-"} · global {worst?.finalScore ?? 0} · perf {worst?.performanceScore ?? 0} · comp {worst?.competencyScore ?? 0}
              </div>
            </div>
          </div>

          <section style={styles.card}>
            <div style={styles.cardTitle}>Lecture detaillee</div>
            <div style={styles.scopeHint}>{best?.comparisonScope ?? "Comparaison intra-famille metier"}</div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Position famille</th>
                    <th style={styles.th}>Employe</th>
                    <th style={styles.th}>Famille</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Performance</th>
                    <th style={styles.th}>Competences</th>
                    <th style={styles.th}>Score global</th>
                    <th style={styles.th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>#{item.rankJobFamily || item.rankGlobal}</td>
                      <td style={styles.td}>{item.employeeName}</td>
                      <td style={styles.td}>{item.jobFamilyName || "-"}</td>
                      <td style={styles.td}>{item.serviceName || "-"}</td>
                      <td style={styles.td}>{item.performanceScore}</td>
                      <td style={styles.td}>{item.competencyScore}</td>
                      <td style={styles.td}>{item.finalScore}</td>
                      <td style={styles.td}>
                        {item.isBestEmployee ? "Repere haut" : item.isWorstEmployee ? "Accompagnement recommande" : "Zone intermediaire"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  filters: { display: "flex", gap: 12, flexWrap: "wrap" },
  kicker: { fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6 },
  sub: { color: "#64748b", fontSize: 14, marginTop: 6, maxWidth: 760 },
  select: { padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)", background: "#fff", minWidth: 240 },
  primaryBtn: { padding: "12px 14px", borderRadius: 14, border: "none", background: "#0f3d91", color: "white", fontWeight: 900, cursor: "pointer" },
  scopeCard: {
    padding: 18,
    borderRadius: 22,
    background: "linear-gradient(135deg, rgba(14,116,144,.10), rgba(16,185,129,.08))",
    border: "1px solid rgba(14,116,144,.14)",
  },
  scopeTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },
  scopeMeta: { marginTop: 6, fontSize: 13, fontWeight: 800, color: "#0f766e" },
  scopeText: { marginTop: 8, color: "#475569", fontSize: 14, lineHeight: 1.5 },
  heroGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  heroCard: { padding: 24, borderRadius: 24, color: "#fff", boxShadow: "0 18px 36px rgba(15,23,42,.14)" },
  bestCard: { background: "linear-gradient(135deg,#0f766e,#14b8a6)" },
  worstCard: { background: "linear-gradient(135deg,#9f1239,#ef4444)" },
  heroLabel: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.84 },
  heroName: { marginTop: 10, fontSize: 28, fontWeight: 950 },
  heroMeta: { marginTop: 6, fontSize: 15, opacity: 0.88 },
  card: { padding: 20, borderRadius: 22, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  cardTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },
  scopeHint: { marginTop: 6, marginBottom: 14, color: "#64748b", fontSize: 13, fontWeight: 700 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid rgba(15,23,42,.08)" },
  td: { padding: "12px 10px", borderBottom: "1px solid rgba(15,23,42,.06)", color: "#0f172a" },
  error: { padding: 14, borderRadius: 12, background: "rgba(239,68,68,.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,.18)", fontWeight: 700 },
  loading: { padding: 24, borderRadius: 16, background: "rgba(255,255,255,.9)", color: "#64748b", fontWeight: 700 },
};
