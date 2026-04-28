type Props = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function DashboardTile({ title, value, subtitle }: Props) {
  return (
    <div className="card card-pad" style={styles.card}>
      <div style={styles.top}>
        <div style={styles.title}>{title}</div>
        <span className="badge">KPI</span>
      </div>
      <div style={styles.value}>{value}</div>
      {subtitle ? <div className="p" style={{ marginTop: 6 }}>{subtitle}</div> : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.85) 100%)",
  },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontWeight: 900, color: "#0f172a" },
  value: { fontSize: 28, fontWeight: 950, letterSpacing: -0.6, marginTop: 10 },
};