import { useEffect, useState } from "react";
import { evaluationCampaignAPI, type EvaluationCampaign } from "../services/rankingAPI";
import { reportAPI, type Report } from "../services/reportAPI";

const reportTypeLabel = {
  campaign: "Campagne",
  team: "Equipe",
  individual: "Individuel",
  audit: "Audit",
  compliance: "Conformite",
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [campaigns, setCampaigns] = useState<EvaluationCampaign[]>([]);
  const [title, setTitle] = useState("Rapport RH de campagne");
  const [reportType, setReportType] = useState<Report["reportType"]>("campaign");
  const [format, setFormat] = useState<Report["format"]>("summary");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [reportRes, campaignRes] = await Promise.all([reportAPI.list(), evaluationCampaignAPI.list()]);
      setReports(reportRes.data.data);
      setCampaigns(campaignRes.data.data);
      setCampaignId((current) => current || campaignRes.data.data[0]?.id || "");
    } catch (err: any) {
      setError(err?.message ?? "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createReport = async () => {
    setError(null);
    try {
      await reportAPI.create({
        title,
        reportType,
        format,
        campaignId: campaignId || undefined,
        filters: { generatedFrom: "reports-ui" },
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Generation impossible.");
    }
  };

  const downloadReport = async (report: Report) => {
    setError(null);
    try {
      const res = await reportAPI.download(report.id);
      const blob = new Blob([res.data], {
        type: report.format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.fileName || `rapport-cnas.${report.format === "summary" ? "csv" : report.format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Telechargement impossible.");
    }
  };

  const removeReport = async (report: Report) => {
    const confirmed = window.confirm(`Supprimer le rapport "${report.title}" ?`);
    if (!confirmed) return;
    setError(null);
    setBusyReportId(report.id);
    try {
      await reportAPI.remove(report.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Suppression impossible.");
    } finally {
      setBusyReportId(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.kicker}>Reporting</div>
        <div style={styles.title}>Rapports RH et exports historises</div>
        <div style={styles.sub}>Generation, historisation et synthese des rapports de campagne, equipe, audit et conformite.</div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        <div style={styles.cardTitle}>Generer un rapport</div>
        <div style={styles.formGrid}>
          <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          <select style={styles.input} value={reportType} onChange={(e) => setReportType(e.target.value as Report["reportType"])}>
            {Object.entries(reportTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select style={styles.input} value={format} onChange={(e) => setFormat(e.target.value as Report["format"])}>
            <option value="summary">Synthese</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
          <select style={styles.input} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Toutes campagnes</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
          <button style={styles.primaryBtn} onClick={() => void createReport()}>Generer</button>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardTitle}>Historique des rapports</div>
        <div style={styles.reportGrid}>
          {reports.map((report) => (
            <div key={report.id} style={styles.reportCard}>
              <div style={styles.reportTop}>
                <strong>{report.title}</strong>
                <span>{reportTypeLabel[report.reportType]}</span>
              </div>
              <div style={styles.meta}>{report.campaignName || "Toutes campagnes"} | {report.format.toUpperCase()}</div>
              <div style={styles.metrics}>
                <Metric label="Evaluations" value={String(report.summary.evaluations ?? 0)} />
                <Metric label="Score moyen" value={`${report.summary.averageScore ?? 0}/100`} />
                <Metric label="Validees" value={String(report.summary.validated ?? 0)} />
                <Metric label="En attente" value={String(report.summary.pending ?? 0)} />
              </div>
              <div style={styles.meta}>Fichier : {report.fileName || "-"}</div>
              <div style={styles.cardActions}>
                <button style={styles.secondaryBtn} onClick={() => void downloadReport(report)}>Telecharger</button>
                <button
                  style={busyReportId === report.id ? styles.disabledDangerBtn : styles.dangerBtn}
                  onClick={() => void removeReport(report)}
                  disabled={busyReportId === report.id}
                >
                  {busyReportId === report.id ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          ))}
          {reports.length === 0 ? <div style={styles.empty}>Aucun rapport genere.</div> : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><strong>{value}</strong><span>{label}</span></div>;
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 18 },
  hero: { padding: 24, borderRadius: 18, background: "linear-gradient(135deg,#0f3d91,#334155)", color: "white" },
  kicker: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: 950, marginTop: 6 },
  sub: { marginTop: 8, opacity: 0.88 },
  card: { padding: 20, borderRadius: 16, background: "white", border: "1px solid rgba(15,23,42,.08)" },
  cardTitle: { fontSize: 18, fontWeight: 900, marginBottom: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 170px 130px 220px auto", gap: 10 },
  input: { padding: 12, borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", fontFamily: "inherit" },
  primaryBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  secondaryBtn: { marginTop: 12, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", background: "white", color: "#0f172a", fontWeight: 800, cursor: "pointer" },
  dangerBtn: { marginTop: 12, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(220,38,38,.25)", background: "white", color: "#b91c1c", fontWeight: 800, cursor: "pointer" },
  disabledDangerBtn: { marginTop: 12, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.25)", background: "#e2e8f0", color: "#64748b", fontWeight: 800, cursor: "not-allowed" },
  reportGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 },
  reportCard: { padding: 16, borderRadius: 14, border: "1px solid rgba(148,163,184,.25)", background: "#f8fafc" },
  cardActions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  reportTop: { display: "flex", justifyContent: "space-between", gap: 12 },
  meta: { marginTop: 8, color: "#64748b", fontSize: 13 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 },
  metric: { display: "grid", gap: 3, padding: 10, borderRadius: 10, background: "white" },
  error: { padding: 12, borderRadius: 10, background: "rgba(220,38,38,.08)", color: "#b91c1c" },
  empty: { color: "#64748b" },
};
