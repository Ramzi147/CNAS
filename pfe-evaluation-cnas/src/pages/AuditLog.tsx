/**
 * Vue d'ensemble du fichier : AuditLog.tsx
 * Role : page de consultation des traces d'audit et actions sensibles.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { useEffect, useMemo, useState } from "react";
import { auditAPI, type AuditEvent } from "../services/auditAPI";

export default function AuditLog() {
  const [auditRows, setAuditRows] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auditAPI
      .list()
      .then((res) => setAuditRows(res.data.data))
      .catch((err) => setError(err?.response?.data?.detail ?? err?.message ?? "Impossible de charger le journal d'audit."))
      .finally(() => setLoading(false));
  }, []);

  const events24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return auditRows.filter((row) => +new Date(row.createdAt) >= since).length;
  }, [auditRows]);
  const sensitiveActions = useMemo(
    () => auditRows.filter((row) => ["modification", "suppression", "export", "validation"].includes(row.action)).length,
    [auditRows]
  );
  const lastExport = useMemo(() => auditRows.find((row) => row.action === "export")?.createdAt, [auditRows]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Audit</div>
          <div style={styles.title}>Carnet automatise des operations</div>
          <div style={styles.sub}>
            Trace complete des consultations, modifications, exports, effacements logiques et operations de securite.
          </div>
        </div>
      </div>

      <div style={styles.metrics}>
        <MetricCard label="Evenements 24h" value={String(events24h)} />
        <MetricCard label="Actions sensibles" value={String(sensitiveActions)} />
        <MetricCard label="Dernier export" value={lastExport ? new Date(lastExport).toLocaleString() : "-"} />
        <MetricCard label="Recherche IP" value="Active" />
      </div>

      <section style={styles.card}>
        <div style={styles.cardTitle}>Journal recent</div>
        {error ? <div style={styles.error}>{error}</div> : null}
        {loading ? <div style={styles.empty}>Chargement du journal...</div> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Utilisateur</th>
                <th style={styles.th}>Entite</th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Horodatage</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Motif</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}><span style={styles.badge}>{row.action}</span></td>
                  <td style={styles.td}>{row.userEmail || "-"}</td>
                  <td style={styles.td}>{row.entity}</td>
                  <td style={styles.td}>{row.entityId}</td>
                  <td style={styles.td}>{new Date(row.createdAt).toLocaleString()}</td>
                  <td style={styles.td}>{row.ipAddress || "-"}</td>
                  <td style={styles.td}>{row.reason}</td>
                </tr>
              ))}
              {!loading && auditRows.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    Aucun evenement d'audit en base pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  kicker: { fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6 },
  sub: { color: "#64748b", fontSize: 14, marginTop: 6, maxWidth: 760 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 14 },
  metricCard: { padding: 18, borderRadius: 18, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)" },
  metricValue: { fontSize: 24, fontWeight: 950, color: "#0f172a" },
  metricLabel: { marginTop: 6, color: "#64748b", fontWeight: 700, fontSize: 13 },
  card: { padding: 20, borderRadius: 22, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)" },
  cardTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 16 },
  error: { padding: 12, marginBottom: 12, borderRadius: 12, background: "rgba(220,38,38,.08)", color: "#b91c1c", fontWeight: 700 },
  empty: { padding: 12, color: "#64748b" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid rgba(15,23,42,.08)" },
  td: { padding: "12px 10px", color: "#0f172a", borderBottom: "1px solid rgba(15,23,42,.06)" },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(15,61,145,.10)",
    color: "#0f3d91",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
};


