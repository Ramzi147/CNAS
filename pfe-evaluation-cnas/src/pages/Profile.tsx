import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentAPI } from "../services/entityAPI";
import { evaluationAPI } from "../services/evaluationAPI";
import type { Agent } from "../types/entities";
import type { Evaluation } from "../types/evaluation";

function formatRole(role?: string) {
  if (role === "superadmin") return "Super administrateur";
  if (role === "admin") return "Administrateur";
  if (role === "hr") return "Ressources humaines";
  if (role === "manager") return "Manager";
  if (role === "employee" || role === "agent") return "Employe";
  return "Invite";
}

export default function Profile() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([agentAPI.list(), evaluationAPI.list()])
      .then(([agentRes, evals]) => {
        const foundAgent = agentRes.data.data.find(
          (item) => item.email?.toLowerCase() === user?.email?.toLowerCase() || item.fullName === user?.fullName
        );
        setAgent(foundAgent ?? null);
        if (foundAgent) {
          setEvaluations(evals.filter((item) => item.employeeMatricule === foundAgent.matricule));
        } else {
          setEvaluations(evals.filter((item) => item.evaluatorName === user?.fullName));
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user?.email, user?.fullName]);

  const initials = useMemo(() => {
    const name = user?.fullName?.trim() ?? "Utilisateur";
    const parts = name.split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }, [user?.fullName]);

  const filteredEvaluations = useMemo(() => {
    if (!query) return evaluations;
    return evaluations.filter((item) =>
      `${item.employeeName} ${item.employeeMatricule} ${item.evaluatorName} ${item.period} ${item.comments ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [evaluations, query]);

  const stats = useMemo(() => evaluationAPI.stats(filteredEvaluations), [filteredEvaluations]);
  const recent = useMemo(() => filteredEvaluations.slice(0, 4), [filteredEvaluations]);

  return (
    <div style={styles.page}>
      <div style={styles.pageHead}>
        <div>
          <div style={styles.pageKicker}>Compte utilisateur</div>
          <div style={styles.pageTitle}>Profil et rattachement</div>
          <div style={styles.pageSub}>Vue consolidee du compte, du poste et des evaluations liees au profil connecte.</div>
        </div>
      </div>

      {query ? <div style={styles.searchInfo}>Filtre actif : {searchParams.get("q")}</div> : null}

      <div style={styles.gridTop}>
        <section style={styles.profileCard}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.identityBlock}>
            <div style={styles.userName}>{user?.fullName ?? "Invite"}</div>
            <div style={styles.userEmail}>{user?.email ?? "-"}</div>
            <span style={styles.roleChip}>{formatRole(user?.role)}</span>
          </div>

          <div style={styles.infoGrid}>
            <Info label="Identifiant" value={user?.id ?? "-"} />
            <Info label="Role" value={formatRole(user?.role)} />
            <Info label="Matricule" value={agent?.matricule ?? "Non rattache"} />
            <Info label="Statut" value={agent?.status === "inactive" ? "Inactif" : "Actif"} />
            <Info label="Poste" value={agent?.position ?? "Compte fonctionnel"} />
            <Info label="Entree" value={agent?.hireDate ?? "-"} />
          </div>
        </section>

        <section style={styles.summaryCard}>
          <div style={styles.sectionTitle}>Resume metier</div>
          <div style={styles.kpiGrid}>
            <Kpi label="Evaluations visibles" value={stats.total} />
            <Kpi label="Score moyen" value={stats.avgScore} />
            <Kpi label="Validees" value={stats.byStatus.hr_validated} />
            <Kpi label="En attente" value={stats.byStatus.submitted + stats.byStatus.manager_validated} />
          </div>

          <div style={styles.summaryList}>
            <SummaryRow label="Adresse email" value={user?.email ?? "-"} />
            <SummaryRow label="Rattachement employe" value={agent ? agent.fullName : "Aucun rattachement direct"} />
            <SummaryRow label="Telephone" value={agent?.phone ?? "Non renseigne"} />
            <SummaryRow label="Dernier contexte" value={user?.role === "employee" || user?.role === "agent" ? "Consultation des resultats" : "Gestion et suivi des evaluations"} />
          </div>
        </section>
      </div>

      <section style={styles.timelineCard}>
        <div style={styles.sectionTitle}>Dernieres evaluations liees au profil</div>
        {loading ? (
          <div style={styles.loading}>Chargement du profil...</div>
        ) : recent.length === 0 ? (
          <div style={styles.empty}>Aucune evaluation rattachee a ce profil pour le moment.</div>
        ) : (
          <div style={styles.timeline}>
            {recent.map((item) => (
              <div key={item.id} style={styles.timelineItem}>
                <div style={styles.timelineDot} />
                <div style={styles.timelineContent}>
                  <div style={styles.timelineTitle}>{item.employeeName} - {item.period}</div>
                  <div style={styles.timelineSub}>{item.evaluatorName} - score {item.score} - statut {item.status}</div>
                </div>
                <div style={styles.timelineTime}>{new Date(item.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryKey}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  pageHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  pageKicker: { fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" },
  pageTitle: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6 },
  pageSub: { color: "#64748b", fontSize: 14, marginTop: 6 },
  searchInfo: { padding: 12, borderRadius: 14, background: "rgba(37,99,235,.08)", color: "#1d4ed8", fontWeight: 700, fontSize: 13 },
  gridTop: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 },
  profileCard: { background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 22, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  summaryCard: { background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 22, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,.05)", display: "grid", gap: 18 },
  avatar: { width: 74, height: 74, borderRadius: 22, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #0ea5e9, #2563eb)", color: "white", fontWeight: 900, fontSize: 28 },
  identityBlock: { marginTop: 16, display: "grid", gap: 6 },
  userName: { fontSize: 24, fontWeight: 950, color: "#0f172a" },
  userEmail: { color: "#64748b", fontSize: 14 },
  roleChip: { display: "inline-flex", width: "fit-content", marginTop: 8, padding: "7px 12px", borderRadius: 999, background: "rgba(37,99,235,.10)", color: "#1d4ed8", fontSize: 12, fontWeight: 900 },
  infoGrid: { marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  infoItem: { padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)" },
  infoLabel: { fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  infoValue: { marginTop: 6, fontSize: 15, color: "#0f172a", fontWeight: 800 },
  sectionTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  kpiCard: { padding: 16, borderRadius: 18, background: "linear-gradient(180deg, #fff, #f8fafc)", border: "1px solid rgba(15,23,42,.08)" },
  kpiValue: { fontSize: 26, fontWeight: 950, color: "#0f172a" },
  kpiLabel: { marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 700 },
  summaryList: { display: "grid", gap: 12 },
  summaryRow: { display: "flex", justifyContent: "space-between", gap: 14, paddingBottom: 10, borderBottom: "1px solid rgba(15,23,42,.08)" },
  summaryKey: { color: "#64748b", fontWeight: 700, fontSize: 13 },
  summaryValue: { color: "#0f172a", fontWeight: 800, fontSize: 13, textAlign: "right" },
  timelineCard: { background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 22, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  loading: { padding: 18, color: "#64748b", fontWeight: 700 },
  empty: { padding: 18, borderRadius: 16, background: "#f8fafc", color: "#64748b", fontWeight: 700 },
  timeline: { marginTop: 16, display: "grid", gap: 14 },
  timelineItem: { display: "grid", gridTemplateColumns: "16px minmax(0,1fr) auto", gap: 14, alignItems: "start", padding: 14, borderRadius: 16, background: "#f8fafc" },
  timelineDot: { width: 10, height: 10, borderRadius: 999, background: "#2563eb", marginTop: 6 },
  timelineContent: { display: "grid", gap: 4 },
  timelineTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a" },
  timelineSub: { fontSize: 13, color: "#64748b" },
  timelineTime: { fontSize: 12, color: "#64748b", fontWeight: 700 },
};
