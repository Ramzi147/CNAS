/**
 * Vue d'ensemble du fichier : DailyFollowup.tsx
 * Role : page de suivi quotidien, presence et discipline des agents.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { useEffect, useMemo, useState } from "react";
import { attendanceRecordAPI, dailyFollowupAPI, agentAPI } from "../services/entityAPI";
import type { Agent, AttendanceRecord, DailyFollowUp } from "../types/entities";

export default function DailyFollowup() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [followups, setFollowups] = useState<DailyFollowUp[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [presenceStatus, setPresenceStatus] = useState<AttendanceRecord["status"]>("present");
  const [minutesLate, setMinutesLate] = useState(0);
  const [qualityNote, setQualityNote] = useState(3);
  const [disciplineNote, setDisciplineNote] = useState(3);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [agentRes, attendanceRes, followupRes] = await Promise.all([
        agentAPI.list(),
        attendanceRecordAPI.list(),
        dailyFollowupAPI.list(),
      ]);
      setAgents(agentRes.data.data);
      setAttendance(attendanceRes.data.data);
      setFollowups(followupRes.data.data);
      setSelectedAgentId((prev) => prev || agentRes.data.data[0]?.id || "");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Chargement impossible.");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const recentAttendance = useMemo(() => attendance.slice(0, 8), [attendance]);
  const recentFollowups = useMemo(() => followups.slice(0, 8), [followups]);

  const submit = async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await dailyFollowupAPI.complete({
        agentId: selectedAgentId,
        date: today,
        presenceStatus,
        minutesLate,
        remark,
        qualityNote,
        disciplineNote,
      });
      setRemark("");
      setMinutesLate(0);
      setQualityNote(3);
      setDisciplineNote(3);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div>
        <div style={styles.kicker}>Suivi quotidien</div>
        <div style={styles.title}>Presence, retards et remarques manager</div>
        <div style={styles.sub}>Cette page permet enfin de saisir un vrai suivi journalier dans l'application.</div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardTitle}>Nouvelle fiche quotidienne</div>
          <div style={styles.form}>
            <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} style={styles.input}>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName} - {agent.matricule}
                </option>
              ))}
            </select>

            <select value={presenceStatus} onChange={(e) => setPresenceStatus(e.target.value as AttendanceRecord["status"])} style={styles.input}>
              <option value="present">Present</option>
              <option value="late">Retard</option>
              <option value="absent">Absent</option>
              <option value="sick_leave">Conge maladie</option>
            </select>

            <input
              style={styles.input}
              type="number"
              min={0}
              value={minutesLate}
              onChange={(e) => setMinutesLate(Number(e.target.value))}
              placeholder="Minutes de retard"
            />

            <input
              style={styles.input}
              type="number"
              min={1}
              max={5}
              value={qualityNote}
              onChange={(e) => setQualityNote(Number(e.target.value))}
              placeholder="Note qualite"
            />

            <input
              style={styles.input}
              type="number"
              min={1}
              max={5}
              value={disciplineNote}
              onChange={(e) => setDisciplineNote(Number(e.target.value))}
              placeholder="Note discipline"
            />

            <textarea
              style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Remarques manager"
            />

            <button type="button" style={styles.primaryBtn} onClick={() => void submit()} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer la fiche"}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Dernieres presences</div>
          <div style={styles.stack}>
            {recentAttendance.map((item) => (
              <div key={item.id} style={styles.item}>
                <strong>{item.agentName}</strong>
                <div style={styles.meta}>{item.date} Â· {item.status} {item.minutesLate ? `Â· ${item.minutesLate} min` : ""}</div>
                <div style={styles.meta}>{item.remark || "Sans remarque"}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={styles.card}>
        <div style={styles.cardTitle}>Derniers suivis manager</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employe</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Presence</th>
                <th style={styles.th}>Qualite</th>
                <th style={styles.th}>Discipline</th>
                <th style={styles.th}>Remarque</th>
              </tr>
            </thead>
            <tbody>
              {recentFollowups.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.agentName}</td>
                  <td style={styles.td}>{item.date}</td>
                  <td style={styles.td}>{item.presenceStatus}</td>
                  <td style={styles.td}>{item.qualityNote}/5</td>
                  <td style={styles.td}>{item.disciplineNote}/5</td>
                  <td style={styles.td}>{item.remark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  kicker: { fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6 },
  sub: { color: "#64748b", fontSize: 14, marginTop: 6 },
  grid: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 },
  card: { padding: 20, borderRadius: 22, background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  cardTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 14 },
  form: { display: "grid", gap: 12 },
  input: { padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)", background: "#fff", outline: "none" },
  primaryBtn: { padding: "13px 16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#0f3d91,#1d9bf0)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  stack: { display: "grid", gap: 12 },
  item: { padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)" },
  meta: { marginTop: 6, color: "#64748b", fontSize: 13 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid rgba(15,23,42,.08)" },
  td: { padding: "12px 10px", borderBottom: "1px solid rgba(15,23,42,.06)", color: "#0f172a" },
  error: { padding: 14, borderRadius: 12, background: "rgba(239,68,68,.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,.18)", fontWeight: 700 },
};


