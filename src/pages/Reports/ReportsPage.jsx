import { useState, useCallback, lazy, Suspense } from 'react';
import {
  FaChartBar,
  FaTimes,
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaChartLine,
  FaLayerGroup,
  FaBook,
  FaUsers,
  FaProjectDiagram,
} from 'react-icons/fa';

/* ─── Composants chargés en lazy ──────────────────────────────────── */
const TrialBalancePage = lazy(() => import('./TrialBalancePage'));
const SubsidiaryBalancePage = lazy(() => import('./SubsidiaryBalancePage'));
const BalanceSheetPage = lazy(() => import('./BalanceSheetPage'));
const SIGPage = lazy(() => import('./SIGPage'));
const IncomeStatementPage = lazy(() => import('./IncomeStatementPage'));
const GeneralLedgerPage = lazy(() => import('./GeneralLedgerPage'));
const ReportDetailPage = lazy(() => import('./ReportDetailPage'));

/* ─── Catalogue des états disponibles ─────────────────────────────── */
const AVAILABLE_REPORTS = [
  { id: 'trial_balance', name: 'Balance Générale', description: 'Balance générale des comptes (Trial Balance)', icon: 'FaBalanceScale', category: 'financial', component: 'TrialBalancePage' },
  { id: 'balance_sheet', name: 'Bilan Comptable', description: 'Bilan comptable (Actif / Passif)', icon: 'FaFileInvoiceDollar', category: 'financial', component: 'BalanceSheetPage' },
  { id: 'income_statement', name: 'Compte de Résultat', description: 'Compte de résultat (Produits & Charges)', icon: 'FaChartLine', category: 'financial', component: 'IncomeStatementPage' },
  { id: 'sig', name: 'SIG', description: 'Soldes Intermédiaires de Gestion', icon: 'FaLayerGroup', category: 'financial', component: 'SIGPage' },
  { id: 'general_ledger', name: 'Grand Livre', description: 'Grand Livre général (General Ledger)', icon: 'FaBook', category: 'financial', component: 'GeneralLedgerPage' },
  { id: 'subsidiary_balance', name: 'Balance Auxiliaire', description: 'Balance auxiliaire (clients/fournisseurs)', icon: 'FaUsers', category: 'auxiliary', component: 'SubsidiaryBalancePage' },
  { id: 'analytical_balance', name: 'Balance Analytique', description: 'Balance par axe analytique', icon: 'FaProjectDiagram', category: 'analytical', component: 'ReportDetailPage' },
];

const iconMap = {
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaChartLine,
  FaLayerGroup,
  FaBook,
  FaUsers,
  FaProjectDiagram,
};

const categoryLabels = {
  financial: 'États financiers',
  auxiliary: 'Analyses auxiliaires',
  analytical: 'Analyses analytiques',
};

/* ─── Spinner pour le lazy loading ────────────────────────────────── */
function PanelLoader() {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" />
      <p className="text-muted mt-2 small">Chargement de l'état…</p>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────── */
export default function ReportsPage() {
  // Onglets ouverts : [{ id, reportId, title, icon, component }]
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [tabCounter] = useState({ current: 0 });

  /* Ouvrir un état dans un nouvel onglet */
  const openReport = useCallback((reportDef) => {
    tabCounter.current += 1;
    const instanceKey = `${reportDef.id}_${tabCounter.current}`;
    const newTab = {
      id: instanceKey,
      reportId: reportDef.id,
      title: reportDef.name,
      icon: reportDef.icon,
      component: reportDef.component,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(instanceKey);
  }, [tabCounter]);

  /* Fermer un onglet */
  const closeTab = useCallback((tabId, e) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((curr) => {
        if (curr !== tabId) return curr;
        if (next.length === 0) return null;
        const closedIdx = prev.findIndex((t) => t.id === tabId);
        return next[Math.min(closedIdx, next.length - 1)]?.id || null;
      });
      return next;
    });
  }, []);

  /* Rendre le composant d'un onglet */
  const renderTabContent = (tab) => {
    if (tab.component === 'TrialBalancePage') {
      return <TrialBalancePage embedded />;
    }
    if (tab.component === 'SubsidiaryBalancePage') {
      return <SubsidiaryBalancePage embedded />;
    }
    if (tab.component === 'BalanceSheetPage') {
      return <BalanceSheetPage embedded />;
    }
    if (tab.component === 'SIGPage') {
      return <SIGPage embedded />;
    }
    if (tab.component === 'IncomeStatementPage') {
      return <IncomeStatementPage embedded />;
    }
    if (tab.component === 'GeneralLedgerPage') {
      return <GeneralLedgerPage embedded />;
    }
    return <ReportDetailPage reportId={tab.reportId} embedded />;
  };

  /* Grouper les rapports par catégorie pour le catalogue */
  const grouped = AVAILABLE_REPORTS.reduce((acc, report) => {
    const cat = report.category || 'financial';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(report);
    return acc;
  }, {});

  return (
    <div className="reports-workspace d-flex flex-column" style={{ height: 'calc(100vh - 80px)' }}>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
        <div>
          <h4 className="fw-bold mb-0">
            <FaChartBar className="me-2 text-primary" />
            Reportings
          </h4>
          <p className="text-muted mb-0 small">
            Cliquez sur un état pour l'ouvrir dans un volet. Plusieurs états peuvent être ouverts simultanément.
          </p>
        </div>
      </div>

      {/* ── Barre d'onglets ─────────────────────────────────────── */}
      {tabs.length > 0 && (
        <div className="reports-tabs-bar d-flex align-items-center border-bottom flex-shrink-0 no-print" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button
            className={`reports-tab-btn ${activeTabId === null ? 'active' : ''}`}
            onClick={() => setActiveTabId(null)}
            title="Catalogue des états"
          >
            <FaChartBar className="me-1" style={{ fontSize: '0.75rem' }} />
            Catalogue
          </button>
          {tabs.map((tab) => {
            const Icon = iconMap[tab.icon] || FaChartLine;
            return (
              <button
                key={tab.id}
                className={`reports-tab-btn ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                title={tab.title}
              >
                <Icon className="me-1" style={{ fontSize: '0.75rem' }} />
                <span className="tab-label">{tab.title}</span>
                <span
                  className="tab-close ms-2"
                  onClick={(e) => closeTab(tab.id, e)}
                  title="Fermer"
                >
                  <FaTimes style={{ fontSize: '0.6rem' }} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────────────── */}
      <div className="flex-grow-1" style={{ overflowY: 'auto', minHeight: 0 }}>
        {/* Catalogue (visible quand aucun onglet actif) */}
        {activeTabId === null && (
          <div className="py-3">
            {Object.entries(grouped).map(([category, categoryReports]) => (
              <div key={category} className="mb-4">
                <h6 className="text-muted text-uppercase small fw-bold mb-3">
                  {categoryLabels[category] || category}
                </h6>
                <div className="row g-3">
                  {categoryReports.map((report) => {
                    const Icon = iconMap[report.icon] || FaChartLine;
                    return (
                      <div key={report.id} className="col-md-6 col-lg-4">
                        <div
                          className="report-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => openReport(report)}
                        >
                          <div className="d-flex align-items-start gap-3">
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{
                                width: 44,
                                height: 44,
                                backgroundColor: 'rgba(72, 132, 189, 0.12)',
                                color: '#4884BD',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={20} />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-semibold">{report.name}</h6>
                              <p className="text-muted small mb-0">{report.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Panneaux des onglets ouverts (gardés montés pour préserver l'état) */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="reports-tab-panel py-2"
            style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
          >
            <Suspense fallback={<PanelLoader />}>
              {renderTabContent(tab)}
            </Suspense>
          </div>
        ))}
      </div>

      {/* ── Styles ──────────────────────────────────────────────── */}
      <style>{`
        .reports-tabs-bar {
          gap: 2px;
          padding: 4px 0 0;
          background: #f8f9fa;
          border-radius: 6px 6px 0 0;
        }
        .reports-tab-btn {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border: 1px solid transparent;
          border-bottom: none;
          background: transparent;
          color: #6c757d;
          font-size: 0.82rem;
          font-weight: 500;
          border-radius: 6px 6px 0 0;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          max-width: 220px;
        }
        .reports-tab-btn:hover {
          background: #e9ecef;
          color: #062A5A;
        }
        .reports-tab-btn.active {
          background: #fff;
          color: #062A5A;
          border-color: #dee2e6 #dee2e6 #fff;
          font-weight: 600;
          box-shadow: 0 -2px 0 #EA761D inset;
        }
        .reports-tab-btn .tab-label {
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
          display: inline-block;
        }
        .reports-tab-btn .tab-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          opacity: 0.5;
          transition: all 0.15s;
        }
        .reports-tab-btn .tab-close:hover {
          opacity: 1;
          background: #dc3545;
          color: #fff;
        }
        .reports-tab-panel {
          min-height: 200px;
        }
        @media print {
          .reports-tabs-bar,
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
