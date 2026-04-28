import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  panel?: React.ReactNode;
}

export default function DashboardLayout({ children, panel }: DashboardLayoutProps) {
  const panelItems = panel ? React.Children.toArray(panel) : [];
  const actionPanel = panelItems[0] ?? null;
  const criticalPanel = panelItems[1] ?? null;
  const referencePanels = panelItems.slice(2);

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">{children}</div>
      {panel && (
        <aside className="dashboard-panel pilotage-panel" aria-label="Colonne de pilotage">
          <div className="pilotage-zone pilotage-zone--actions">
            <div className="pilotage-zone__label">Actions a lancer</div>
            {actionPanel}
          </div>

          <div className="pilotage-zone pilotage-zone--critical">
            <div className="pilotage-zone__label">Statuts critiques / contraintes</div>
            {criticalPanel ?? (
              <section className="panel panel--secondary pilotage-empty">
                <div className="metric-row">
                  <span>Alerte active</span>
                  <strong>Aucune</strong>
                </div>
                <div className="metric-row">
                  <span>Controle requis</span>
                  <strong>Selon role</strong>
                </div>
              </section>
            )}
          </div>

          <div className="pilotage-zone pilotage-zone--reference">
            <div className="pilotage-zone__label">Informations de reference</div>
            {referencePanels.length ? (
              referencePanels
            ) : (
              <section className="panel panel--secondary pilotage-reference-card">
                <div className="metric-row">
                  <span>Perimetre</span>
                  <strong>Donnees visibles selon votre role</strong>
                </div>
                <div className="metric-row">
                  <span>Workflow</span>
                  <strong>Brouillon - Soumission - Validation</strong>
                </div>
                <div className="metric-row">
                  <span>Referentiel</span>
                  <strong>Agents, campagnes et profils metier</strong>
                </div>
              </section>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
