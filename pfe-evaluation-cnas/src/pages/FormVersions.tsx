import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { complianceAPI, type EvaluationFormVersion } from "../services/complianceAPI";
import { evaluationProfileAPI } from "../services/entityAPI";
import type { EvaluationProfile } from "../types/entities";

type CriterionView = {
  name: string;
  weight: number;
  category: string;
};

type EditorState = {
  mode: "edit" | "duplicate";
  source?: EvaluationFormVersion;
  profileId: string;
  title: string;
  description: string;
  criteria: CriterionView[];
};

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  archived: "Archivee",
};

const categoryLabel: Record<string, string> = {
  quantitative: "Quantitatif",
  qualitative: "Qualitatif",
  attendance: "Assiduite",
  self: "Auto-evaluation",
  managerial: "Managerial",
};

const categoryOptions = ["quantitative", "qualitative", "attendance", "self", "managerial"];

export default function FormVersions() {
  const [versions, setVersions] = useState<EvaluationFormVersion[]>([]);
  const [profiles, setProfiles] = useState<EvaluationProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);

  const load = async () => {
    try {
      const [versionRes, profileRes] = await Promise.all([
        complianceAPI.listFormVersions(),
        evaluationProfileAPI.list(),
      ]);
      setVersions(versionRes.data.data);
      setProfiles(profileRes.data.data);
      setProfileId((current) => current || profileRes.data.data[0]?.id || "");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedProfile = profiles.find((item) => item.id === profileId);

  const nextVersionForProfile = (targetProfileId: string) =>
    Math.max(0, ...versions.filter((item) => item.profileId === targetProfileId).map((item) => item.version)) + 1;

  const fetchNextVersionForProfile = async (targetProfileId: string) => {
    const response = await complianceAPI.listFormVersions({ profileId: targetProfileId });
    return Math.max(0, ...response.data.data.map((item) => item.version)) + 1;
  };

  const openCreate = () => {
    if (!selectedProfile) return;
    setEditorError(null);
    const nextVersion = nextVersionForProfile(selectedProfile.id);
    setEditor({
      mode: "duplicate",
      profileId: selectedProfile.id,
      title: `Formulaire ${selectedProfile.name} v${nextVersion}`,
      description: "Nouvelle version du questionnaire d'evaluation.",
      criteria: [],
    });
  };

  const openEdit = (version: EvaluationFormVersion) => {
    setEditorError(null);
    const nextVersion = nextVersionForProfile(version.profileId);
    setEditor({
      mode: "edit",
      source: version,
      profileId: version.profileId,
      title: version.status === "active" ? `${version.title} - v${nextVersion}` : version.title,
      description: version.description,
      criteria: extractCriteria(version.schema),
    });
  };

  const openDuplicate = (version: EvaluationFormVersion) => {
    setEditorError(null);
    const nextVersion = nextVersionForProfile(version.profileId);
    setEditor({
      mode: "duplicate",
      source: version,
      profileId: version.profileId,
      title: `${version.profileName} v${nextVersion}`,
      description: version.description || "Version dupliquee du questionnaire d'evaluation.",
      criteria: extractCriteria(version.schema),
    });
  };

  const activate = async (version: EvaluationFormVersion) => {
    const criteria = extractCriteria(version.schema);
    const totalWeight = getTotalWeight(criteria);
    if (!isTotalBalanced(criteria)) {
      setError(`Activation bloquee : le poids total est de ${formatWeight(totalWeight)}. Il doit etre egal a 100%.`);
      return;
    }
    try {
      await complianceAPI.activateFormVersion(version.id);
      setNotice("Version activee avec succes.");
      setError(null);
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Activation impossible."));
    }
  };

  const archive = async (version: EvaluationFormVersion, label = "Version archivee avec succes.") => {
    try {
      await complianceAPI.archiveFormVersion(version.id);
      setNotice(label);
      setError(null);
      await load();
    } catch (err: any) {
      setError(readApiError(err, "Archivage impossible."));
    }
  };

  const updateEditorCriterion = (index: number, patch: Partial<CriterionView>) => {
    setEditor((current) => {
      if (!current) return current;
      return {
        ...current,
        criteria: current.criteria.map((criterion, idx) => idx === index ? { ...criterion, ...patch } : criterion),
      };
    });
  };

  const addCriterion = () => {
    setEditor((current) => current ? {
      ...current,
      criteria: [...current.criteria, { name: "Nouveau critere", weight: 0, category: "qualitative" }],
    } : current);
  };

  const removeCriterion = (index: number) => {
    setEditor((current) => current ? {
      ...current,
      criteria: current.criteria.filter((_, idx) => idx !== index),
    } : current);
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSavingEditor(true);
    setEditorError(null);
    setError(null);
    setNotice(null);
    const profile = profiles.find((item) => item.id === editor.profileId);
    if (!profile) {
      setEditorError("Profil introuvable.");
      setSavingEditor(false);
      return;
    }

    const cleanedCriteria = editor.criteria
      .map((criterion) => ({
        name: criterion.name.trim(),
        weight: Number(criterion.weight) || 0,
        category: criterion.category || "qualitative",
      }))
      .filter((criterion) => criterion.name);

    const schema = buildSchema(cleanedCriteria, editor.source?.schema);
    const activeSource = editor.source?.status === "active";

    try {
      if (editor.source && editor.mode === "edit" && !activeSource) {
        const response = await complianceAPI.updateFormVersion(editor.source.id, {
          title: editor.title,
          description: editor.description,
          schema,
        });
        setNotice(`Version ${response.data.data.version} mise a jour.`);
      } else {
        const nextVersion = await fetchNextVersionForProfile(editor.profileId);
        const response = await complianceAPI.createFormVersion({
          profileId: editor.profileId,
          version: nextVersion,
          status: "draft",
          title: editor.title || `Formulaire ${profile.name} v${nextVersion}`,
          description: editor.description,
          schema,
        });
        setProfileId(editor.profileId);
        setNotice(
          activeSource
            ? `Version active conservee : la version brouillon ${response.data.data.version} a ete creee.`
            : `Version brouillon ${response.data.data.version} creee.`
        );
      }
    } catch (err: any) {
      const message = readApiError(err, "Enregistrement impossible.");
      setEditorError(message);
      setError(message);
      return;
    } finally {
      setSavingEditor(false);
    }

    setEditor(null);
    setError(null);
    await load();
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.kicker}>Referentiel</div>
        <div style={styles.title}>Versioning des formulaires</div>
        <div style={styles.sub}>Creation, modification, activation et archivage logique des questionnaires utilises par profil d'evaluation.</div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <select style={styles.input} value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <button style={styles.primaryBtn} onClick={openCreate}>Creer une version</button>
        </div>
      </section>

      <section style={styles.grid}>
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            onEdit={openEdit}
            onDuplicate={openDuplicate}
            onActivate={activate}
            onArchive={archive}
          />
        ))}
      </section>

      {editor ? (
        <EditorModal
          editor={editor}
          profiles={profiles}
          error={editorError}
          saving={savingEditor}
          onClose={() => {
            if (!savingEditor) {
              setEditor(null);
              setEditorError(null);
            }
          }}
          onChange={setEditor}
          onSave={saveEditor}
          onAddCriterion={addCriterion}
          onRemoveCriterion={removeCriterion}
          onUpdateCriterion={updateEditorCriterion}
        />
      ) : null}
    </div>
  );
}

function VersionCard({
  version,
  onEdit,
  onDuplicate,
  onActivate,
  onArchive,
}: {
  version: EvaluationFormVersion;
  onEdit: (version: EvaluationFormVersion) => void;
  onDuplicate: (version: EvaluationFormVersion) => void;
  onActivate: (version: EvaluationFormVersion) => void;
  onArchive: (version: EvaluationFormVersion, label?: string) => void;
}) {
  const criteria = extractCriteria(version.schema);
  const totalWeight = getTotalWeight(criteria);
  const isBalanced = isTotalBalanced(criteria);
  const canActivate = version.status !== "active" && version.status !== "archived" && isBalanced;

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <strong style={styles.versionTitle}>{version.title}</strong>
          <div style={styles.meta}>{version.profileName} | version {version.version}</div>
        </div>
        <span style={version.status === "active" ? styles.active : styles.badge}>{statusLabel[version.status] ?? version.status}</span>
      </div>

      {version.description ? <div style={styles.description}>{version.description}</div> : null}

      <div style={styles.summary}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Criteres</span>
          <strong>{criteria.length}</strong>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Poids total</span>
          <strong>{formatWeight(totalWeight)}</strong>
        </div>
      </div>

      {criteria.length > 0 && !isBalanced ? (
        <div style={styles.warning}>Attention : la somme des poids est de {formatWeight(totalWeight)}, elle doit etre egale a 100% avant activation.</div>
      ) : null}

      <CriteriaPreview criteria={criteria} />

      <div style={styles.actions}>
        <button style={styles.secondaryBtn} onClick={() => onEdit(version)}>
          {version.status === "active" ? "Modifier via nouvelle version" : "Modifier"}
        </button>
        <button style={styles.secondaryBtn} onClick={() => onDuplicate(version)}>Dupliquer</button>
        {version.status === "active" ? (
          <button style={styles.warningBtn} onClick={() => onArchive(version, "Version desactivee et archivee.")}>Desactiver</button>
        ) : (
          <button
            style={canActivate ? styles.primaryBtn : styles.disabledBtn}
            disabled={!canActivate}
            title={!isBalanced ? "Le poids total doit etre egal a 100%." : undefined}
            onClick={() => void onActivate(version)}
          >
            Activer
          </button>
        )}
        {version.status !== "archived" ? (
          <button style={styles.warningBtn} onClick={() => onArchive(version)}>Archiver</button>
        ) : null}
      </div>
    </div>
  );
}

function CriteriaPreview({ criteria }: { criteria: CriterionView[] }) {
  if (criteria.length === 0) {
    return <div style={styles.emptyState}>Aucun critere detaille n'est encore associe a cette version.</div>;
  }

  return (
    <div style={styles.criteriaTable}>
      <div style={styles.tableHead}>
        <span>Critere</span>
        <span>Poids</span>
        <span>Categorie</span>
      </div>
      {criteria.map((criterion, index) => (
        <div key={`${criterion.name}-${index}`} style={styles.tableRow}>
          <span style={styles.criterionName}>{criterion.name}</span>
          <strong>{formatWeight(criterion.weight)}</strong>
          <span style={{ ...styles.categoryBadge, ...categoryStyle(criterion.category) }}>
            {categoryLabel[criterion.category] ?? criterion.category}
          </span>
        </div>
      ))}
    </div>
  );
}

function EditorModal({
  editor,
  profiles,
  error,
  saving,
  onClose,
  onChange,
  onSave,
  onAddCriterion,
  onRemoveCriterion,
  onUpdateCriterion,
}: {
  editor: EditorState;
  profiles: EvaluationProfile[];
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChange: (editor: EditorState) => void;
  onSave: () => void;
  onAddCriterion: () => void;
  onRemoveCriterion: (index: number) => void;
  onUpdateCriterion: (index: number, patch: Partial<CriterionView>) => void;
}) {
  const totalWeight = useMemo(() => getTotalWeight(editor.criteria), [editor.criteria]);
  const isActiveSource = editor.source?.status === "active";

  return createPortal(
    <div style={styles.modalOverlay} role="presentation" onMouseDown={onClose}>
      <div style={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.kickerDark}>{editor.mode === "duplicate" ? "Duplication" : "Modification"}</div>
            <div style={styles.modalTitle}>
              {isActiveSource ? "Nouvelle version depuis une version active" : "Edition du formulaire"}
            </div>
          </div>
          <button style={styles.iconBtn} onClick={onClose} disabled={saving}>x</button>
        </div>

        {isActiveSource ? (
          <div style={styles.infoBox}>Cette version est active : elle ne sera pas modifiee directement. L'enregistrement creera une nouvelle version brouillon.</div>
        ) : null}

        {error ? <div style={styles.modalError}>{error}</div> : null}

        <div style={styles.formGrid}>
          <label style={styles.field}>
            <span style={styles.label}>Profil</span>
            <select
              style={styles.input}
              value={editor.profileId}
              disabled={Boolean(editor.source)}
              onChange={(e) => onChange({ ...editor, profileId: e.target.value })}
            >
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Titre</span>
            <input style={styles.input} value={editor.title} onChange={(e) => onChange({ ...editor, title: e.target.value })} />
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Description</span>
          <textarea
            style={{ ...styles.input, minHeight: 76, resize: "vertical" }}
            value={editor.description}
            onChange={(e) => onChange({ ...editor, description: e.target.value })}
          />
        </label>

        <div style={styles.editorSummary}>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Criteres</span>
            <strong>{editor.criteria.length}</strong>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Poids total</span>
            <strong>{formatWeight(totalWeight)}</strong>
          </div>
          {Math.abs(totalWeight - 100) > 0.01 ? (
            <div style={styles.warning}>Le formulaire pourra etre enregistre, mais il ne pourra pas etre active tant que le total ne vaut pas 100%.</div>
          ) : (
            <div style={styles.okBox}>Total correct : la version pourra etre activee.</div>
          )}
        </div>

        <div style={styles.editorToolbar}>
          <strong>Criteres du formulaire</strong>
          <button style={styles.secondaryBtn} onClick={onAddCriterion} disabled={saving}>Ajouter un critere</button>
        </div>

        <div style={styles.editRows}>
          {editor.criteria.map((criterion, index) => (
            <div key={index} style={styles.editRow}>
              <input
                style={styles.input}
                value={criterion.name}
                onChange={(e) => onUpdateCriterion(index, { name: e.target.value })}
                placeholder="Nom du critere"
              />
              <input
                style={{ ...styles.input, minWidth: 90 }}
                type="number"
                min={0}
                max={100}
                value={criterion.weight}
                onChange={(e) => onUpdateCriterion(index, { weight: Number(e.target.value) })}
                placeholder="Poids"
              />
              <select style={styles.input} value={criterion.category} onChange={(e) => onUpdateCriterion(index, { category: e.target.value })}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{categoryLabel[category]}</option>
                ))}
              </select>
              <button style={styles.dangerBtn} onClick={() => onRemoveCriterion(index)} disabled={saving}>Supprimer</button>
            </div>
          ))}
          {editor.criteria.length === 0 ? <div style={styles.emptyState}>Ajoutez au moins un critere pour construire la version.</div> : null}
        </div>

        <div style={styles.modalActions}>
          <button style={styles.secondaryBtn} onClick={onClose} disabled={saving}>Annuler</button>
          <button style={saving ? styles.disabledBtn : styles.primaryBtn} onClick={() => void onSave()} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function extractCriteria(schema: Record<string, unknown> | unknown): CriterionView[] {
  const source = findCriteriaSource(schema);
  return source
    .map((item) => normalizeCriterion(item))
    .filter((item): item is CriterionView => Boolean(item));
}

function findCriteriaSource(schema: unknown): unknown[] {
  if (Array.isArray(schema)) return schema;
  if (!isObject(schema)) return [];

  for (const key of ["criteria", "criteres", "items", "questions"]) {
    const value = schema[key];
    if (Array.isArray(value)) return value;
  }

  const sections = schema.sections;
  if (Array.isArray(sections)) {
    return sections.flatMap((section) => {
      if (!isObject(section)) return [];
      if (Array.isArray(section.criteria)) return section.criteria;
      if (Array.isArray(section.questions)) return section.questions;
      if (Array.isArray(section.items)) return section.items;
      return [];
    });
  }

  return [];
}

function normalizeCriterion(item: unknown): CriterionView | null {
  if (!isObject(item)) return null;
  const name = stringValue(item.name) || stringValue(item.label) || stringValue(item.title) || stringValue(item.questionText);
  if (!name) return null;

  return {
    name,
    weight: numberValue(item.weight ?? item.poids ?? item.percentage),
    category: stringValue(item.category) || stringValue(item.type) || "non_classe",
  };
}

function buildSchema(criteria: CriterionView[], previousSchema?: Record<string, unknown>): Record<string, unknown> {
  const base = isObject(previousSchema) ? { ...previousSchema } : {};
  return {
    ...base,
    criteria: criteria.map((criterion, index) => ({
      id: isObject(previousSchema) ? undefined : index + 1,
      name: criterion.name,
      weight: criterion.weight,
      category: criterion.category,
    })).map((criterion, index) => ({
      id: criterion.id ?? index + 1,
      name: criterion.name,
      weight: criterion.weight,
      category: criterion.category,
    })),
  };
}

function getTotalWeight(criteria: CriterionView[]) {
  return criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
}

function isTotalBalanced(criteria: CriterionView[]) {
  return criteria.length > 0 && Math.abs(getTotalWeight(criteria) - 100) < 0.01;
}

function readApiError(err: any, fallback: string) {
  const data = err?.response?.data;
  if (!data) return err?.message ?? fallback;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue)) return String(firstValue[0]);
  if (typeof firstValue === "string") return firstValue;
  if (isObject(firstValue)) {
    const nestedValue = Object.values(firstValue)[0];
    if (Array.isArray(nestedValue)) return String(nestedValue[0]);
    if (typeof nestedValue === "string") return nestedValue;
  }
  if (err?.response?.status === 403) return "Action refusee : seuls l'administrateur et la RH peuvent gerer les versions.";
  return fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatWeight(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function categoryStyle(category: string): React.CSSProperties {
  if (category === "attendance") return { background: "rgba(8,145,178,.1)", color: "#0e7490" };
  if (category === "quantitative") return { background: "rgba(30,64,175,.1)", color: "#1e40af" };
  if (category === "qualitative") return { background: "rgba(5,150,105,.1)", color: "#047857" };
  if (category === "managerial") return { background: "rgba(217,119,6,.12)", color: "#b45309" };
  if (category === "self") return { background: "rgba(124,58,237,.1)", color: "#6d28d9" };
  return { background: "#f1f5f9", color: "#475569" };
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 18 },
  hero: { padding: 24, borderRadius: 18, background: "linear-gradient(135deg,#0f3d91,#7c3aed)", color: "white" },
  kicker: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 },
  kickerDark: { fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b" },
  title: { fontSize: 28, fontWeight: 950, marginTop: 6 },
  sub: { marginTop: 8, opacity: 0.88 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14 },
  card: { padding: 18, borderRadius: 16, background: "white", border: "1px solid rgba(15,23,42,.08)" },
  toolbar: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: { padding: 12, borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", minWidth: 0, width: "100%", boxSizing: "border-box" },
  primaryBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  secondaryBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", color: "#172033", fontWeight: 800, cursor: "pointer" },
  warningBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(217,119,6,.35)", background: "rgba(217,119,6,.08)", color: "#92400e", fontWeight: 800, cursor: "pointer" },
  dangerBtn: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(220,38,38,.25)", background: "rgba(220,38,38,.08)", color: "#b91c1c", fontWeight: 800, cursor: "pointer" },
  disabledBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#cbd5e1", color: "#64748b", fontWeight: 800, cursor: "not-allowed" },
  iconBtn: { width: 34, height: 34, borderRadius: 10, border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 900 },
  top: { display: "flex", justifyContent: "space-between", gap: 12 },
  badge: { padding: "5px 10px", borderRadius: 999, background: "#f1f5f9", color: "#475569", fontWeight: 800, height: "fit-content" },
  active: { padding: "5px 10px", borderRadius: 999, background: "rgba(34,197,94,.12)", color: "#15803d", fontWeight: 800, height: "fit-content" },
  meta: { marginTop: 8, color: "#64748b", fontSize: 13 },
  versionTitle: { color: "#172033", fontSize: 16 },
  description: { marginTop: 12, color: "#475569", fontSize: 14, lineHeight: 1.5 },
  summary: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 14 },
  metric: { padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 4 },
  metricLabel: { color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 },
  warning: { marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(217,119,6,.1)", color: "#92400e", fontWeight: 700, fontSize: 13 },
  okBox: { padding: 12, borderRadius: 12, background: "rgba(34,197,94,.12)", color: "#15803d", fontWeight: 800, fontSize: 13 },
  infoBox: { padding: 12, borderRadius: 12, background: "rgba(30,64,175,.08)", color: "#1e40af", fontWeight: 700, fontSize: 13 },
  criteriaTable: { marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  tableHead: { display: "grid", gridTemplateColumns: "1fr 76px 128px", gap: 10, padding: "10px 12px", background: "#f8fafc", color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { display: "grid", gridTemplateColumns: "1fr 76px 128px", gap: 10, alignItems: "center", padding: "10px 12px", borderTop: "1px solid #e2e8f0", fontSize: 13 },
  criterionName: { color: "#172033", fontWeight: 700 },
  categoryBadge: { justifySelf: "start", padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  emptyState: { marginTop: 14, padding: 14, borderRadius: 12, background: "#f8fafc", color: "#64748b", fontWeight: 700 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 },
  error: { padding: 12, borderRadius: 10, background: "rgba(220,38,38,.08)", color: "#b91c1c", fontWeight: 700 },
  notice: { padding: 12, borderRadius: 10, background: "rgba(34,197,94,.12)", color: "#15803d", fontWeight: 800 },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(2,6,23,.72)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 9999,
    boxSizing: "border-box",
    overflow: "hidden",
  },
  modal: {
    width: "min(720px, 100%)",
    maxWidth: "720px",
    maxHeight: "min(82vh, 760px)",
    overflowY: "auto",
    overflowX: "hidden",
    background: "#ffffff",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 30px 90px rgba(2,6,23,.38)",
    border: "1px solid rgba(255,255,255,.55)",
    display: "grid",
    gap: 14,
    boxSizing: "border-box",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, position: "sticky", top: -22, background: "#ffffff", padding: "2px 0 10px", zIndex: 1, borderBottom: "1px solid rgba(226,232,240,.8)" },
  modalTitle: { fontSize: 22, fontWeight: 950, color: "#172033", marginTop: 4 },
  modalError: { padding: 12, borderRadius: 12, background: "rgba(220,38,38,.09)", border: "1px solid rgba(220,38,38,.18)", color: "#b91c1c", fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  field: { display: "grid", gap: 6 },
  label: { color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4 },
  editorSummary: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "stretch" },
  editorToolbar: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" },
  editRows: { display: "grid", gap: 10 },
  editRow: { display: "grid", gridTemplateColumns: "minmax(180px,1fr) 96px minmax(150px,.6fr) auto", gap: 10, alignItems: "center" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, position: "sticky", bottom: -22, background: "#ffffff", padding: "12px 0 0", borderTop: "1px solid rgba(226,232,240,.8)" },
};
