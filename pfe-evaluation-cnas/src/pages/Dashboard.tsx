import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FadeIn from '../components/ui/FadeIn';
import DashboardLayout from '../components/layout/DashboardLayout';
import { evaluationAPI } from '../services/evaluationAPI';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(evaluationAPI.stats([]));
  const [recentActivities, setRecentActivities] = useState<Array<{ text: string; time: string }>>(() =>
    [].slice(0, 5).map((e: any) => ({
      text: `Évaluation ${e.employeeName} (${e.status})`,
      time: new Date(e.updatedAt).toLocaleString(),
    }))
  );

  useEffect(() => {
    evaluationAPI.list().then((items) => {
      setStats(evaluationAPI.stats(items));
    setRecentActivities(
      items.slice(0, 5).map((e) => ({
        text: `Évaluation ${e.employeeName} (${e.status})`,
        time: new Date(e.updatedAt).toLocaleString(),
      }))
    );
    }).catch(() => undefined);
  }, []);

  const kpiCards = useMemo(() => {
    return [
      { label: "Évaluations en cours", value: String(stats.byStatus.draft + stats.byStatus.submitted), trend: "+0%", color: "blue" },
      { label: "Employés évalués", value: String(stats.total), trend: "+0%", color: "green" },
      { label: "Alertes / retards", value: String(stats.byStatus.rejected), trend: "+0%", color: "orange" },
      { label: "Score moyen", value: `${stats.avgScore} / 100`, trend: "+0%", color: "purple" },
    ];
  }, [stats]);

  const goToEvaluations = () => navigate("/evaluations");

  return (
    <DashboardLayout
      panel={
        <>
          <FadeIn delay={400} direction="right">
            <section className="panel">
              <div className="panel-title">Actions rapides</div>
              <div className="quick-actions">
                <button className="quick-action" onClick={goToEvaluations}>
                  <span className="action-text">Nouvelle évaluation</span>
                </button>
                <button className="quick-action">
                  <span className="action-text">Exporter données</span>
                </button>
                <button className="quick-action">
                  <span className="action-text">Gérer utilisateurs</span>
                </button>
                <button className="quick-action">
                  <span className="action-text">Rapports</span>
                </button>
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={600} direction="right">
            <section className="panel">
              <div className="panel-title">Notifications</div>
              <div className="notifications">
                <div className="notification-item">
                  <div className="notification-dot"></div>
                  <div className="notification-content">
                    <div className="notification-text">{stats.byStatus.submitted} évaluations en attente</div>
                    <div className="notification-time">juste maintenant</div>
                  </div>
                </div>
                <div className="notification-item">
                  <div className="notification-dot"></div>
                  <div className="notification-content">
                    <div className="notification-text">Rapport mensuel généré</div>
                    <div className="notification-time">1 heure</div>
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      }
    >
      <FadeIn>
        <section className="hero">
          <div className="hero-title">Tableau de bord</div>
          <p className="hero-sub">Indicateurs clés de performance et gestion des évaluations</p>
        </section>
      </FadeIn>

      <FadeIn delay={200}>
        <div className="kpi-grid">
          {kpiCards.map((card, index) => (
            <FadeIn key={card.label} delay={300 + index * 100} direction="up">
              <div className="kpi-card">
                <div className="kpi-top">
                  <div>
                    <div className="kpi-label">{card.label}</div>
                    <div className="kpi-value">{card.value}</div>
                  </div>
                  <div className="kpi-badge">{card.trend}</div>
                </div>
                <div className="kpi-trend">
                  <span className="trend-up">Hausse</span>
                  <span className="trend-text">vs période précédente</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={600}>
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">Activités récentes</div>
                <button className="btn-link">Voir tout →</button>
              </div>
              <div className="activity-list">
                {recentActivities.map((activity, index) => (
                  <FadeIn key={index} delay={700 + index * 100} direction="left">
                    <div className="activity-item">
                      <div className="activity-indicator"></div>
                      <div className="activity-content">
                        <div className="activity-text">{activity.text}</div>
                        <div className="activity-time">{activity.time}</div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </section>
          </div>

          <div className="dashboard-section">
            <section className="panel">
              <div className="panel-title">Synthèse du mois</div>
              <div className="chart-placeholder">
                <div className="chart-text">Graphique d'évolution</div>
                <div className="chart-value">+3.2%</div>
              </div>
            </section>
          </div>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
