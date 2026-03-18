import { useCompany } from '../../contexts/CompanyContext';
import {
  FaMoneyBillWave,
  FaChartLine,
  FaShoppingCart,
  FaBoxes,
  FaSyncAlt,
  FaExclamationTriangle,
} from 'react-icons/fa';

export default function DashboardPage() {
  const { selectedCompany, fiscalYear } = useCompany();

  // KPIs de démonstration
  const kpis = [
    {
      id: 'revenue',
      label: "Chiffre d'affaires",
      value: '—',
      icon: FaMoneyBillWave,
      color: '#4884BD',
      trend: null,
    },
    {
      id: 'result',
      label: 'Résultat net',
      value: '—',
      icon: FaChartLine,
      color: '#198754',
      trend: null,
    },
    {
      id: 'treasury',
      label: 'Trésorerie',
      value: '—',
      icon: FaMoneyBillWave,
      color: '#0dcaf0',
      trend: null,
    },
    {
      id: 'sales',
      label: 'Ventes du mois',
      value: '—',
      icon: FaShoppingCart,
      color: '#EA761D',
      trend: null,
    },
    {
      id: 'purchases',
      label: 'Achats du mois',
      value: '—',
      icon: FaBoxes,
      color: '#E87017',
      trend: null,
    },
    {
      id: 'sync',
      label: 'Dernière synchro.',
      value: '—',
      icon: FaSyncAlt,
      color: '#6c757d',
      trend: null,
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Tableau de bord</h4>
          <p className="text-muted mb-0 small">
            {selectedCompany
              ? `${selectedCompany.name} — Exercice ${fiscalYear}`
              : 'Sélectionnez une société pour commencer'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="col-md-6 col-lg-4 col-xl-2">
              <div className="kpi-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="kpi-label">{kpi.label}</span>
                  <Icon style={{ color: kpi.color }} />
                </div>
                <div className="kpi-value">{kpi.value}</div>
                {kpi.trend !== null && (
                  <span className={`kpi-trend ${kpi.trend >= 0 ? 'up' : 'down'}`}>
                    {kpi.trend >= 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info panel */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 text-muted">
            <FaExclamationTriangle className="text-warning" size={24} />
            <div>
              <h6 className="mb-1">Aucune donnée disponible</h6>
              <p className="mb-0 small">
                Pour commencer à utiliser SBI, vous devez soit connecter un <strong>Agent Desktop</strong> qui
                synchronisera automatiquement vos données comptables, soit <strong>importer manuellement</strong>{' '}
                vos fichiers de balance / grand livre via la section Reportings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
