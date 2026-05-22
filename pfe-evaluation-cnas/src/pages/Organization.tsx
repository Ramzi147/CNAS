/**
 * Vue d'ensemble du fichier : Organization.tsx
 * Role : page de gestion de la structure organisationnelle et des agents.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { agencyAPI, structureAPI, serviceAPI, agentAPI } from "../services/entityAPI";
import type { Agency, Structure, Service, Agent } from "../types/entities";

type OrgEditor =
  | { type: "agency"; mode: "create" | "edit"; item?: Agency; data: { name: string; code: string; address: string; city: string } }
  | { type: "structure"; mode: "create" | "edit"; item?: Structure; data: { agencyId: string; name: string; code: string; headOfStructure: string } }
  | { type: "service"; mode: "create" | "edit"; item?: Service; data: { structureId: string; name: string; code: string; serviceHead: string } }
  | { type: "agent"; mode: "create" | "edit"; item?: Agent; data: { serviceId: string; fullName: string; matricule: string; position: string; email: string; phone: string; hireDate: string; status: Agent["status"]; managerId?: string } };

export default function Organization() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<OrgEditor | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agencyRes, structureRes, serviceRes, agentRes] = await Promise.all([agencyAPI.list(), structureAPI.list(), serviceAPI.list(), agentAPI.list()]);
      setAgencies(agencyRes.data.data);
      setStructures(structureRes.data.data);
      setServices(serviceRes.data.data);
      setAgents(agentRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const agencyStats = useMemo(() => {
    return agencies.map((agency) => {
      const agencyStructures = structures.filter((structure) => structure.agencyId === agency.id);
      const structureIds = new Set(agencyStructures.map((structure) => structure.id));
      const agencyServices = services.filter((service) => structureIds.has(service.structureId));
      const serviceIds = new Set(agencyServices.map((service) => service.id));
      const agencyAgents = agents.filter((agent) => serviceIds.has(agent.serviceId));
      return {
        ...agency,
        structuresCount: agencyStructures.length,
        servicesCount: agencyServices.length,
        agentsCount: agencyAgents.length,
      };
    });
  }, [agencies, agents, services, structures]);

  const filteredAgencyStats = useMemo(() => {
    if (!query) return agencyStats;

    const matchingAgencyIds = new Set<string>();

    agencyStats.forEach((agency) => {
      if (`${agency.name} ${agency.code} ${agency.city} ${agency.address}`.toLowerCase().includes(query)) {
        matchingAgencyIds.add(agency.id);
      }
    });

    structures.forEach((structure) => {
      if (`${structure.name} ${structure.code} ${structure.headOfStructure}`.toLowerCase().includes(query)) {
        matchingAgencyIds.add(structure.agencyId);
      }
    });

    services.forEach((service) => {
      if (`${service.name} ${service.code} ${service.serviceHead}`.toLowerCase().includes(query)) {
        const parent = structures.find((structure) => structure.id === service.structureId);
        if (parent) matchingAgencyIds.add(parent.agencyId);
      }
    });

    agents.forEach((agent) => {
      if (`${agent.fullName} ${agent.matricule} ${agent.email ?? ""} ${agent.position ?? ""}`.toLowerCase().includes(query)) {
        const parentService = services.find((service) => service.id === agent.serviceId);
        const parentStructure = parentService
          ? structures.find((structure) => structure.id === parentService.structureId)
          : null;
        if (parentStructure) matchingAgencyIds.add(parentStructure.agencyId);
      }
    });

    return agencyStats.filter((agency) => matchingAgencyIds.has(agency.id));
  }, [agencyStats, agents, query, services, structures]);

  useEffect(() => {
    if (!query || filteredAgencyStats.length === 0) return;

    const firstAgency = filteredAgencyStats[0];
    const relatedStructures = structures.filter((structure) => structure.agencyId === firstAgency.id);
    const firstStructure =
      relatedStructures.find((structure) =>
        `${structure.name} ${structure.code} ${structure.headOfStructure}`.toLowerCase().includes(query)
      ) ?? relatedStructures[0];

    const relatedServices = firstStructure
      ? services.filter((service) => service.structureId === firstStructure.id)
      : [];
    const firstService =
      relatedServices.find((service) =>
        `${service.name} ${service.code} ${service.serviceHead}`.toLowerCase().includes(query)
      ) ?? relatedServices[0];

    setSelectedAgency(firstAgency.id);
    setSelectedStructure(firstStructure?.id ?? null);
    setSelectedService(firstService?.id ?? null);
  }, [filteredAgencyStats, query, services, structures]);

  const currentAgency = agencies.find((agency) => agency.id === selectedAgency) ?? null;
  const agencyStructures = selectedAgency ? structures.filter((structure) => structure.agencyId === selectedAgency) : [];
  const currentStructure = structures.find((structure) => structure.id === selectedStructure) ?? null;
  const structureServices = selectedStructure ? services.filter((service) => service.structureId === selectedStructure) : [];
  const currentService = services.find((service) => service.id === selectedService) ?? null;
  const serviceAgents = selectedService ? agents.filter((agent) => agent.serviceId === selectedService) : [];

  const openCreate = (type: OrgEditor["type"]) => {
    if (type === "agency") setEditor({ type, mode: "create", data: { name: "", code: "", address: "", city: "" } });
    if (type === "structure") setEditor({ type, mode: "create", data: { agencyId: selectedAgency || agencies[0]?.id || "", name: "", code: "", headOfStructure: "" } });
    if (type === "service") setEditor({ type, mode: "create", data: { structureId: selectedStructure || structures[0]?.id || "", name: "", code: "", serviceHead: "" } });
    if (type === "agent") setEditor({ type, mode: "create", data: { serviceId: selectedService || services[0]?.id || "", fullName: "", matricule: "", position: "", email: "", phone: "", hireDate: "", status: "active", managerId: "" } });
  };

  const openEdit = (type: OrgEditor["type"], item: Agency | Structure | Service | Agent) => {
    if (type === "agency") {
      const row = item as Agency;
      setEditor({ type, mode: "edit", item: row, data: { name: row.name, code: row.code, address: row.address, city: row.city } });
    }
    if (type === "structure") {
      const row = item as Structure;
      setEditor({ type, mode: "edit", item: row, data: { agencyId: row.agencyId, name: row.name, code: row.code, headOfStructure: row.headOfStructure } });
    }
    if (type === "service") {
      const row = item as Service;
      setEditor({ type, mode: "edit", item: row, data: { structureId: row.structureId, name: row.name, code: row.code, serviceHead: row.serviceHead } });
    }
    if (type === "agent") {
      const row = item as Agent;
      setEditor({ type, mode: "edit", item: row, data: { serviceId: row.serviceId, fullName: row.fullName, matricule: row.matricule, position: row.position, email: row.email, phone: row.phone, hireDate: row.hireDate || "", status: row.status, managerId: row.managerId || "" } });
    }
  };

  const saveEditor = async () => {
    if (!editor) return;
    setError(null);
    try {
      if (editor.type === "agency") {
        if (editor.mode === "edit" && editor.item) await agencyAPI.update(editor.item.id, editor.data);
        else await agencyAPI.create(editor.data as Omit<Agency, "id" | "createdAt">);
      }
      if (editor.type === "structure") {
        if (editor.mode === "edit" && editor.item) await structureAPI.update(editor.item.id, editor.data);
        else await structureAPI.create(editor.data as Omit<Structure, "id" | "createdAt">);
      }
      if (editor.type === "service") {
        if (editor.mode === "edit" && editor.item) await serviceAPI.update(editor.item.id, editor.data);
        else await serviceAPI.create(editor.data as Omit<Service, "id" | "createdAt">);
      }
      if (editor.type === "agent") {
        const payload = { ...editor.data, managerId: editor.data.managerId || undefined };
        if (editor.mode === "edit" && editor.item) await agentAPI.update(editor.item.id, payload);
        else await agentAPI.create(payload as Omit<Agent, "id">);
      }
      setNotice(editor.mode === "edit" ? "Modification enregistree." : "Creation enregistree.");
      setEditor(null);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Enregistrement impossible.");
    }
  };

  const removeItem = async (type: OrgEditor["type"], id: string) => {
    if (!confirm("Confirmer la suppression ?")) return;
    setError(null);
    try {
      if (type === "agency") await agencyAPI.delete(id);
      if (type === "structure") await structureAPI.delete(id);
      if (type === "service") await serviceAPI.delete(id);
      if (type === "agent") await agentAPI.delete(id);
      setNotice("Suppression effectuee.");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Suppression impossible.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Organisation CNAS</div>
          <div style={styles.title}>Cartographie des agences, structures, services et employes</div>
          <div style={styles.sub}>Vue consolidee de la base temporaire pour l'administration et les RH.</div>
        </div>

        <div style={styles.searchWrap}>
          <input
            style={styles.searchInput}
            value={searchParams.get("q") ?? ""}
            placeholder="Rechercher une agence, structure, service ou employe..."
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value.trim()) next.set("q", e.target.value);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
          />
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.notice}>{notice}</div>}

      <div style={styles.statsGrid}>
        <MetricCard label="Agences" value={agencies.length} />
        <MetricCard label="Structures" value={structures.length} />
        <MetricCard label="Services" value={services.length} />
        <MetricCard label="Employes" value={agents.length} />
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement de l'organisation...</div>
      ) : (
        <div style={styles.layout}>
          <section style={styles.masterCard}>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionTitle}>Agences</div>
                <div style={styles.sectionSub}>Choisis une agence pour afficher sa hierarchie complete.</div>
              </div>
              <button style={styles.smallBtn} onClick={() => openCreate("agency")}>Ajouter</button>
            </div>

            <div style={styles.masterList}>
              {filteredAgencyStats.map((agency) => (
                <button
                  key={agency.id}
                  type="button"
                  style={{
                    ...styles.masterItem,
                    ...(selectedAgency === agency.id ? styles.masterItemActive : {}),
                  }}
                  onClick={() => {
                    setSelectedAgency(agency.id);
                    setSelectedStructure(null);
                    setSelectedService(null);
                  }}
                >
                  <div>
                    <div style={styles.masterItemTitle}>{agency.name}</div>
                    <div style={styles.masterItemSub}>{agency.code} - {agency.city}</div>
                  </div>
                  <div style={styles.masterItemMeta}>
                    {agency.structuresCount} structures - {agency.agentsCount} employes
                  </div>
                  <span style={styles.rowActions} onClick={(event) => event.stopPropagation()}>
                    <button style={styles.miniBtn} onClick={() => openEdit("agency", agency)}>Modifier</button>
                    <button style={styles.dangerMiniBtn} onClick={() => void removeItem("agency", agency.id)}>Supprimer</button>
                  </span>
                </button>
              ))}

              {filteredAgencyStats.length === 0 && (
                <div style={styles.emptyState}>Aucun resultat ne correspond a cette recherche.</div>
              )}
            </div>
          </section>

          <section style={styles.detailCard}>
            {!currentAgency ? (
              <div style={styles.emptyState}>Selectionne une agence pour voir ses structures, services et employes.</div>
            ) : (
              <>
                <div style={styles.sectionHeader}>
                  <div>
                    <div style={styles.sectionTitle}>{currentAgency.name}</div>
                    <div style={styles.sectionSub}>{currentAgency.address} - {currentAgency.city}</div>
                  </div>
                  <button style={styles.smallBtn} onClick={() => openCreate("structure")}>Ajouter structure</button>
                </div>

                <div style={styles.columns}>
                  <div style={styles.column}>
                    <div style={styles.columnTitle}>Structures</div>
                    {agencyStructures.map((structure) => (
                      <button
                        key={structure.id}
                        type="button"
                        style={{
                          ...styles.columnItem,
                          ...(selectedStructure === structure.id ? styles.columnItemActive : {}),
                        }}
                        onClick={() => {
                          setSelectedStructure(structure.id);
                          setSelectedService(null);
                        }}
                      >
                        <div style={styles.columnItemTitle}>{structure.name}</div>
                        <div style={styles.columnItemSub}>{structure.headOfStructure}</div>
                        <span style={styles.rowActions} onClick={(event) => event.stopPropagation()}>
                          <button style={styles.miniBtn} onClick={() => openEdit("structure", structure)}>Modifier</button>
                          <button style={styles.dangerMiniBtn} onClick={() => void removeItem("structure", structure.id)}>Supprimer</button>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div style={styles.column}>
                    <div style={styles.columnTitle}>
                      Services
                      <button style={styles.inlineBtn} disabled={!currentStructure} onClick={() => openCreate("service")}>Ajouter</button>
                    </div>
                    {!currentStructure ? (
                      <div style={styles.columnPlaceholder}>Choisis d'abord une structure.</div>
                    ) : structureServices.length === 0 ? (
                      <div style={styles.columnPlaceholder}>Aucun service pour cette structure.</div>
                    ) : (
                      structureServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          style={{
                            ...styles.columnItem,
                            ...(selectedService === service.id ? styles.columnItemActive : {}),
                          }}
                          onClick={() => setSelectedService(service.id)}
                        >
                          <div style={styles.columnItemTitle}>{service.name}</div>
                          <div style={styles.columnItemSub}>{service.serviceHead}</div>
                          <span style={styles.rowActions} onClick={(event) => event.stopPropagation()}>
                            <button style={styles.miniBtn} onClick={() => openEdit("service", service)}>Modifier</button>
                            <button style={styles.dangerMiniBtn} onClick={() => void removeItem("service", service.id)}>Supprimer</button>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <section style={styles.agentsCard}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.sectionTitle}>Employes du service</div>
                      <div style={styles.sectionSub}>{currentService ? currentService.name : "Choisis un service pour afficher ses employes."}</div>
                    </div>
                    <button style={styles.smallBtn} disabled={!currentService} onClick={() => openCreate("agent")}>Ajouter employe</button>
                  </div>

                  {!currentService ? (
                    <div style={styles.emptyState}>Aucun service selectionne.</div>
                  ) : serviceAgents.length === 0 ? (
                    <div style={styles.emptyState}>Aucun employe enregistre pour ce service.</div>
                  ) : (
                    <div style={styles.agentGrid}>
                      {serviceAgents.map((agent) => (
                        <div key={agent.id} style={styles.agentCard}>
                          <div style={styles.agentTop}>
                            <div>
                              <div style={styles.agentName}>{agent.fullName}</div>
                              <div style={styles.agentMatricule}>{agent.matricule}</div>
                            </div>
                            <span style={{ ...styles.agentBadge, ...(agent.status === "active" ? styles.agentBadgeActive : styles.agentBadgeInactive) }}>
                              {agent.status === "active" ? "Actif" : "Inactif"}
                            </span>
                          </div>
                          <div style={styles.agentMeta}><strong>Poste :</strong> {agent.position}</div>
                          <div style={styles.agentMeta}><strong>Email :</strong> {agent.email}</div>
                          <div style={styles.agentMeta}><strong>Telephone :</strong> {agent.phone}</div>
                          <div style={styles.agentMeta}><strong>Entree :</strong> {agent.hireDate}</div>
                          <div style={styles.cardActions}>
                            <button style={styles.miniBtn} onClick={() => openEdit("agent", agent)}>Modifier</button>
                            <button style={styles.dangerMiniBtn} onClick={() => void removeItem("agent", agent.id)}>Supprimer</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      )}
      {editor ? (
        <OrgModal
          editor={editor}
          agencies={agencies}
          structures={structures}
          services={services}
          agents={agents}
          onChange={setEditor}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function OrgModal({
  editor,
  agencies,
  structures,
  services,
  agents,
  onChange,
  onClose,
  onSave,
}: {
  editor: OrgEditor;
  agencies: Agency[];
  structures: Structure[];
  services: Service[];
  agents: Agent[];
  onChange: (editor: OrgEditor) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const title = `${editor.mode === "edit" ? "Modifier" : "Ajouter"} ${
    editor.type === "agency" ? "une agence" : editor.type === "structure" ? "une structure" : editor.type === "service" ? "un service" : "un employe"
  }`;

  const update = (patch: Record<string, string>) => {
    onChange({ ...editor, data: { ...editor.data, ...patch } } as OrgEditor);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <strong>{title}</strong>
          <button style={styles.iconBtn} onClick={onClose}>x</button>
        </div>

        {editor.type === "agency" ? (
          <div style={styles.formGrid}>
            <Field label="Nom" value={editor.data.name} onChange={(value) => update({ name: value })} />
            <Field label="Code" value={editor.data.code} onChange={(value) => update({ code: value })} />
            <Field label="Ville" value={editor.data.city} onChange={(value) => update({ city: value })} />
            <Field label="Adresse" value={editor.data.address} onChange={(value) => update({ address: value })} />
          </div>
        ) : null}

        {editor.type === "structure" ? (
          <div style={styles.formGrid}>
            <SelectField label="Agence" value={editor.data.agencyId} onChange={(value) => update({ agencyId: value })} options={agencies.map((item) => ({ value: item.id, label: item.name }))} />
            <Field label="Nom" value={editor.data.name} onChange={(value) => update({ name: value })} />
            <Field label="Code" value={editor.data.code} onChange={(value) => update({ code: value })} />
            <Field label="Chef de structure" value={editor.data.headOfStructure} onChange={(value) => update({ headOfStructure: value })} />
          </div>
        ) : null}

        {editor.type === "service" ? (
          <div style={styles.formGrid}>
            <SelectField label="Structure" value={editor.data.structureId} onChange={(value) => update({ structureId: value })} options={structures.map((item) => ({ value: item.id, label: item.name }))} />
            <Field label="Nom" value={editor.data.name} onChange={(value) => update({ name: value })} />
            <Field label="Code" value={editor.data.code} onChange={(value) => update({ code: value })} />
            <Field label="Chef de service" value={editor.data.serviceHead} onChange={(value) => update({ serviceHead: value })} />
          </div>
        ) : null}

        {editor.type === "agent" ? (
          <div style={styles.formGrid}>
            <SelectField label="Service" value={editor.data.serviceId} onChange={(value) => update({ serviceId: value })} options={services.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Manager" value={editor.data.managerId || ""} onChange={(value) => update({ managerId: value })} options={[{ value: "", label: "Aucun" }, ...agents.map((item) => ({ value: item.id, label: item.fullName }))]} />
            <Field label="Nom complet" value={editor.data.fullName} onChange={(value) => update({ fullName: value })} />
            <Field label="Matricule" value={editor.data.matricule} onChange={(value) => update({ matricule: value })} />
            <Field label="Poste" value={editor.data.position} onChange={(value) => update({ position: value })} />
            <Field label="Email" value={editor.data.email} onChange={(value) => update({ email: value })} />
            <Field label="Telephone" value={editor.data.phone} onChange={(value) => update({ phone: value })} />
            <Field label="Date entree" value={editor.data.hireDate} type="date" onChange={(value) => update({ hireDate: value })} />
            <SelectField label="Statut" value={editor.data.status} onChange={(value) => update({ status: value })} options={[{ value: "active", label: "Actif" }, { value: "inactive", label: "Inactif" }]} />
          </div>
        ) : null}

        <div style={styles.modalActions}>
          <button style={styles.smallBtn} onClick={onClose}>Annuler</button>
          <button style={styles.primaryBtn} onClick={() => void onSave()}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      <input style={styles.input} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label style={styles.field}>
      <span>{label}</span>
      <select style={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  searchWrap: { minWidth: "min(360px, 100%)", flex: "1 1 320px", display: "flex", justifyContent: "flex-end" },
  searchInput: {
    width: "min(420px, 100%)",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,.12)",
    background: "rgba(255,255,255,.95)",
    color: "#0f172a",
    outline: "none",
    boxShadow: "0 8px 20px rgba(15,23,42,.05)",
  },
  kicker: { fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { fontSize: 28, fontWeight: 950, color: "#0f172a", marginTop: 6, lineHeight: 1.1 },
  sub: { fontSize: 14, color: "#64748b", marginTop: 6 },
  error: { padding: 14, borderRadius: 12, background: "rgba(239,68,68,.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,.18)", fontWeight: 700 },
  notice: { padding: 14, borderRadius: 12, background: "rgba(34,197,94,.10)", color: "#15803d", border: "1px solid rgba(34,197,94,.18)", fontWeight: 700 },
  loading: { padding: 32, borderRadius: 16, background: "rgba(255,255,255,.9)", textAlign: "center", color: "#64748b", fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 14 },
  metricCard: { background: "rgba(255,255,255,.92)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 18, padding: 18, boxShadow: "0 16px 40px rgba(15,23,42,.06)" },
  metricValue: { fontSize: 28, fontWeight: 950, color: "#0f172a" },
  metricLabel: { marginTop: 6, color: "#64748b", fontSize: 13, fontWeight: 700 },
  layout: { display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 18 },
  masterCard: { background: "rgba(255,255,255,.94)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 22, padding: 18, boxShadow: "0 16px 40px rgba(15,23,42,.05)" },
  detailCard: { background: "rgba(255,255,255,.94)", border: "1px solid rgba(15,23,42,.08)", borderRadius: 22, padding: 18, boxShadow: "0 16px 40px rgba(15,23,42,.05)", display: "grid", gap: 18 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  sectionTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },
  sectionSub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  masterList: { display: "grid", gap: 10 },
  masterItem: { padding: 16, borderRadius: 16, border: "1px solid rgba(15,23,42,.08)", background: "#fff", cursor: "pointer", textAlign: "left" },
  masterItemActive: { border: "1px solid rgba(37,99,235,.30)", background: "rgba(37,99,235,.06)" },
  masterItemTitle: { fontSize: 15, fontWeight: 900, color: "#0f172a" },
  masterItemSub: { marginTop: 4, fontSize: 12, color: "#64748b" },
  masterItemMeta: { marginTop: 10, fontSize: 12, color: "#334155", fontWeight: 700 },
  columns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  column: { display: "grid", gap: 10, alignContent: "start" },
  columnTitle: { fontSize: 14, fontWeight: 900, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" },
  columnItem: { padding: 14, borderRadius: 16, border: "1px solid rgba(15,23,42,.08)", background: "#fff", cursor: "pointer", textAlign: "left" },
  columnItemActive: { border: "1px solid rgba(14,165,233,.30)", background: "rgba(14,165,233,.06)" },
  columnItemTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a" },
  columnItemSub: { marginTop: 6, fontSize: 12, color: "#64748b" },
  columnPlaceholder: { padding: 16, borderRadius: 14, background: "rgba(248,250,252,.9)", color: "#64748b", fontWeight: 600 },
  agentsCard: { display: "grid", gap: 14 },
  agentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  agentCard: { padding: 16, borderRadius: 18, background: "linear-gradient(180deg, #ffffff, #f8fafc)", border: "1px solid rgba(15,23,42,.08)" },
  agentTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  agentName: { fontSize: 15, fontWeight: 900, color: "#0f172a" },
  agentMatricule: { marginTop: 4, fontSize: 12, color: "#64748b" },
  agentMeta: { marginTop: 8, fontSize: 13, color: "#334155", lineHeight: 1.5 },
  rowActions: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  cardActions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
  smallBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 92, width: "fit-content", whiteSpace: "nowrap", padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", fontWeight: 800, cursor: "pointer", lineHeight: 1.1 },
  inlineBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 74, width: "fit-content", whiteSpace: "nowrap", marginLeft: 10, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,.35)", background: "white", fontWeight: 800, cursor: "pointer", lineHeight: 1.1 },
  miniBtn: { padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(148,163,184,.35)", background: "white", color: "#0f172a", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  dangerMiniBtn: { padding: "6px 8px", borderRadius: 8, border: "none", background: "rgba(220,38,38,.10)", color: "#b91c1c", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  primaryBtn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#0f3d91", color: "white", fontWeight: 800, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 20, background: "rgba(15,23,42,.45)" },
  modal: { width: "min(720px, 100%)", maxHeight: "90vh", overflow: "auto", display: "grid", gap: 16, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 24px 70px rgba(15,23,42,.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", fontSize: 20, color: "#0f172a" },
  iconBtn: { width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(148,163,184,.35)", background: "white", cursor: "pointer", fontWeight: 900 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  field: { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 },
  input: { padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", fontFamily: "inherit", color: "#0f172a" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  agentBadge: { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900 },
  agentBadgeActive: { background: "rgba(34,197,94,.12)", color: "#15803d" },
  agentBadgeInactive: { background: "rgba(239,68,68,.12)", color: "#b91c1c" },
  emptyState: { padding: 22, borderRadius: 16, background: "rgba(248,250,252,.9)", color: "#64748b", fontWeight: 700 },
};


