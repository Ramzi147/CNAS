import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agentAPI, evaluationProfileAPI, jobPositionAPI } from "../services/entityAPI";
import { evaluationCriterionAPI, type EvaluationCriterion } from "../services/rankingAPI";
import type { Agent, EvaluationProfile, JobPosition } from "../types/entities";

export default function JobProfiles() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [profiles, setProfiles] = useState<EvaluationProfile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      jobPositionAPI.list(),
      evaluationProfileAPI.list(),
      agentAPI.list(),
      evaluationCriterionAPI.list(),
    ])
      .then(([positionRes, profileRes, agentRes, criteriaRes]) => {
        setPositions(positionRes.data.data);
        setProfiles(profileRes.data.data);
        setAgents(agentRes.data.data);
        setCriteria(criteriaRes.data.data);
        setSelectedProfile(profileRes.data.data[0]?.id ?? "");
      })
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || "Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  const filteredCriteria = useMemo(
    () => criteria.filter((criterion) => criterion.profileId === selectedProfile),
    [criteria, selectedProfile]
  );

  const profileAgents = useMemo(
    () => agents.filter((agent) => agent.evaluationProfileId === selectedProfile),
    [agents, selectedProfile]
  );

  return (
    <div style={styles.page}>
      <div style={styles.head}>
        <div>
          <div style={styles.kicker}>Configuration RH</div>
          <div style={styles.title}>Postes et profils d'evaluation</div>
          <div style={styles.sub}>Gestion des criteres centralisee dans les versions de formulaires.</div>
          <div style={styles.sub}>Visualise les types de poste, les pondérations et les critères hybrides déjà intégrés au backend.</div>
        </div>
        <button style={styles.primaryBtn} onClick={() => navigate("/form-versions")}>Gerer les formulaires</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Chargement des postes et profils...</div>
      ) : (
        <>
          <div style={styles.stats}>
            <Metric label="Postes" value={positions.length} />
            <Metric label="Profils" value={profiles.length} />
            <Metric label="Criteres" value={criteria.length} />
            <Metric label="Agents affectes" value={agents.filter((agent) => !!agent.evaluationProfileId).length} />
          </div>

          <div style={styles.grid}>
            <section style={styles.card}>
              <div style={styles.cardTitle}>Postes disponibles</div>
              <div style={styles.stack}>
                {positions.map((position) => (
                  <div key={position.id} style={styles.item}>
                    <div style={styles.itemTop}>
                      <strong>{position.title}</strong>
                      <span style={styles.badge}>{position.category}</span>
                    </div>
                    <div style={styles.meta}>{position.code} · niveau {position.hierarchyLevel}</div>
                    <div style={styles.meta}>
                      {position.isQuantitative ? "Quantitatif" : "Qualitatif"} · {position.isManagerial ? "Managerial" : "Non managerial"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardTitle}>Profils d'evaluation</div>
              <div style={styles.stack}>
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfile(profile.id)}
                    style={{
                      ...styles.selectable,
                      ...(selectedProfile === profile.id ? styles.selectableActive : {}),
                    }}
                  >
                    <div style={styles.itemTop}>
                      <strong>{profile.name}</strong>
                      <span style={styles.badge}>{profile.targetCategory}</span>
                    </div>
                    <div style={styles.weightRow}>
                      <span>Qte {profile.quantitativeWeight}%</span>
                      <span>Qli {profile.qualitativeWeight}%</span>
                      <span>Ass {profile.attendanceWeight}%</span>
                    </div>
                    <div style={styles.weightRow}>
                      <span>Auto {profile.selfWeight}%</span>
                      <span>Mgr {profile.managerialWeight}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div style={styles.grid}>
            <section style={styles.card}>
              <div style={styles.cardTitle}>Criteres du profil selectionne</div>
              <div style={styles.stack}>
                {filteredCriteria.map((criterion) => (
                  <div key={criterion.id} style={styles.item}>
                    <div style={styles.itemTop}>
                      <strong>{criterion.name}</strong>
                      <span style={styles.badge}>{criterion.category}</span>
                    </div>
                    <div style={styles.meta}>Poids {criterion.weight}% · score {criterion.minScore} à {criterion.maxScore}</div>
                    <div style={styles.meta}>{criterion.description || "Critère métier exploité dans l'évaluation hybride."}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardTitle}>Agents lies a ce profil</div>
              <div style={styles.stack}>
                {profileAgents.length === 0 ? (
                  <div style={styles.empty}>Aucun agent n'est encore affecté à ce profil.</div>
                ) : (
                  profileAgents.map((agent) => (
                    <div key={agent.id} style={styles.item}>
                      <div style={styles.itemTop}>
                        <strong>{agent.fullName}</strong>
                        <span style={styles.badge}>{agent.jobPositionTitle || agent.position}</span>
                      </div>
                      <div style={styles.meta}>{agent.matricule} · {agent.email}</div>
                      <div style={styles.meta}>Manager : {agent.managerName || "Non affecte"}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  primaryBtn: { padding: "11px 14px", borderRadius: 12, border: "none", background: "#0f3d91", color: "white", fontWeight: 900, cursor: "pointer" },
  kicker: { fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6 },
  sub: { color: "#64748b", fontSize: 14, marginTop: 6 },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 14 },
  metric: { padding: 18, borderRadius: 18, background: "rgba(255,255,255,.95)", border: "1px solid rgba(15,23,42,.08)" },
  metricValue: { fontSize: 28, fontWeight: 950, color: "#0f172a" },
  metricLabel: { marginTop: 6, color: "#64748b", fontWeight: 700, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  card: { padding: 20, borderRadius: 22, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  cardTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 14 },
  stack: { display: "grid", gap: 12 },
  item: { padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)" },
  selectable: { padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)", textAlign: "left", cursor: "pointer" },
  selectableActive: { border: "1px solid rgba(37,99,235,.32)", background: "rgba(37,99,235,.06)" },
  itemTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  badge: { display: "inline-flex", padding: "5px 10px", borderRadius: 999, background: "rgba(37,99,235,.1)", color: "#1d4ed8", fontSize: 11, fontWeight: 900 },
  meta: { marginTop: 6, color: "#64748b", fontSize: 13 },
  weightRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, color: "#334155", fontSize: 13, fontWeight: 700 },
  loading: { padding: 24, borderRadius: 16, background: "rgba(255,255,255,.9)", color: "#64748b", fontWeight: 700 },
  error: { padding: 14, borderRadius: 12, background: "rgba(239,68,68,.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,.18)", fontWeight: 700 },
  empty: { padding: 14, borderRadius: 14, background: "#f8fafc", color: "#64748b", fontWeight: 700 },
};
