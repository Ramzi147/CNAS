/**
 * Vue d'ensemble du fichier : UsersAccess.tsx
 * Role : page d'administration des utilisateurs, roles et acces.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { useEffect, useState } from "react";
import { userAPI } from "../services/entityAPI";
import type { AppUser, AppUserRole } from "../types/entities";

const roleOptions: Array<{ value: AppUserRole; label: string }> = [
  { value: "admin", label: "Administrateur" },
  { value: "hr", label: "DRH" },
  { value: "manager", label: "Responsable" },
  { value: "agent", label: "Employe" },
];

type FormState = {
  email: string;
  password: string;
  full_name: string;
  role: AppUserRole;
  is_active: boolean;
  is_staff: boolean;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  full_name: "",
  role: "agent",
  is_active: true,
  is_staff: false,
};

export default function UsersAccess() {
  const [items, setItems] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userAPI.list();
      setItems(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: "",
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      is_staff: user.is_staff,
    });
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await userAPI.update(editing.id, form.password ? form : { ...form, password: undefined });
      } else {
        await userAPI.create(form);
      }
      openCreate();
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user: AppUser) => {
    if (!confirm(`Supprimer ${user.full_name} ?`)) return;
    try {
      await userAPI.delete(user.id);
      if (editing?.id === user.id) {
        openCreate();
      }
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Suppression impossible.");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Utilisateurs et acces</div>
          <div style={styles.subtitle}>CRUD des comptes, roles et droits d'activation.</div>
        </div>
        <button style={styles.primaryBtn} onClick={openCreate}>
          Nouveau compte
        </button>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.layout}>
        <section style={styles.card}>
          <div style={styles.cardTitle}>{editing ? "Modifier un utilisateur" : "Creer un utilisateur"}</div>
          <div style={styles.formGrid}>
            <label style={styles.label}>
              Nom complet
              <input style={styles.input} value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
            </label>
            <label style={styles.label}>
              Email
              <input style={styles.input} type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </label>
            <label style={styles.label}>
              Mot de passe
              <input
                style={styles.input}
                type="password"
                value={form.password}
                placeholder={editing ? "Laisser vide pour conserver" : "Mot de passe initial"}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
            </label>
            <label style={styles.label}>
              Role
              <select style={styles.input} value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as AppUserRole }))}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} />
              Compte actif
            </label>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={form.is_staff} onChange={(e) => setForm((s) => ({ ...s, is_staff: e.target.checked }))} />
              Acces staff Django
            </label>
          </div>

          <div style={styles.actions}>
            <button style={styles.ghostBtn} onClick={openCreate}>
              Reinitialiser
            </button>
            <button style={styles.primaryBtn} onClick={() => void submit()} disabled={saving}>
              {saving ? "Enregistrement..." : editing ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Comptes existants</div>
          {loading ? (
            <div style={styles.empty}>Chargement...</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Etat</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700 }}>{user.full_name}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{user.email}</div>
                    </td>
                    <td style={styles.td}>{roleOptions.find((item) => item.value === user.role)?.label ?? user.role}</td>
                    <td style={styles.td}>{user.is_active ? "Actif" : "Inactif"}</td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.smallBtn} onClick={() => openEdit(user)}>
                          Modifier
                        </button>
                        <button style={{ ...styles.smallBtn, borderColor: "rgba(220,38,38,.25)" }} onClick={() => void removeUser(user)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={4}>
                      <div style={styles.empty}>Aucun utilisateur disponible.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  title: { fontSize: 24, fontWeight: 900, color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 4 },
  layout: { display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 18 },
  card: {
    background: "rgba(255,255,255,.95)",
    border: "1px solid rgba(15,23,42,.08)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 18px 40px rgba(15,23,42,.05)",
  },
  cardTitle: { fontWeight: 800, fontSize: 18, color: "#0f172a", marginBottom: 16 },
  formGrid: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 8, fontWeight: 600, color: "#0f172a", fontSize: 13 },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,.35)",
    background: "white",
    color: "#0f172a",
  },
  checkboxRow: { display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" },
  checkbox: { display: "flex", gap: 8, alignItems: "center", color: "#334155", fontSize: 14 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#0f3d91",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,.35)",
    background: "white",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  },
  smallBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,.35)",
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, color: "#64748b", padding: "10px 8px", borderBottom: "1px solid rgba(15,23,42,.08)" },
  td: { padding: "12px 8px", borderBottom: "1px solid rgba(15,23,42,.06)", verticalAlign: "top" },
  empty: { padding: 20, color: "#64748b", textAlign: "center" },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(220,38,38,.2)",
    background: "rgba(220,38,38,.08)",
    color: "#b91c1c",
    fontWeight: 700,
  },
};


