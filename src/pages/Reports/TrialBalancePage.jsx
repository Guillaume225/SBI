import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaBalanceScale,
  FaSearch,
  FaDownload,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaChevronDown,
  FaChevronRight,
  FaFilter,
  FaPrint,
  FaTimes,
  FaEye,
} from 'react-icons/fa';
import api from '../../services/api';

/* ─── Classes comptables françaises ───────────────────────────────── */
const ACCOUNT_CLASSES = {
  '1': 'Comptes de capitaux',
  '2': "Comptes d'immobilisations",
  '3': 'Comptes de stocks',
  '4': 'Comptes de tiers',
  '5': 'Comptes financiers',
  '6': 'Comptes de charges',
  '7': 'Comptes de produits',
};

const CLASS_COLORS = {
  '1': '#062A5A',
  '2': '#1a5276',
  '3': '#117864',
  '4': '#6c3483',
  '5': '#1e8449',
  '6': '#c0392b',
  '7': '#2471a3',
};

/* ─── Modes d'affichage de la balance ─────────────────────────────── */
const VIEW_CONFIGS = {
  complete: {
    label: 'Complète',
    groups: [
      { title: 'Ouverture', cols: [
        { key: 'opening_debit', label: 'Débit' },
        { key: 'opening_credit', label: 'Crédit' },
      ]},
      { title: 'Mouvements', cols: [
        { key: 'period_debit', label: 'Débit' },
        { key: 'period_credit', label: 'Crédit' },
      ]},
      { title: 'Cumul', cols: [
        { key: 'cumulative_debit', label: 'Débit' },
        { key: 'cumulative_credit', label: 'Crédit' },
      ]},
    ],
    showBalance: true,
    getBalance: (l) => l.balance,
  },
  soldes: {
    label: 'Soldes',
    groups: [
      { title: null, cols: [
        { key: 'cumulative_debit', label: 'Débit' },
        { key: 'cumulative_credit', label: 'Crédit' },
      ]},
    ],
    showBalance: true,
    getBalance: (l) => l.balance,
  },
  mouvements: {
    label: 'Mouvements',
    groups: [
      { title: null, cols: [
        { key: 'period_debit', label: 'Débit' },
        { key: 'period_credit', label: 'Crédit' },
      ]},
    ],
    showBalance: true,
    getBalance: (l) => l.period_debit - l.period_credit,
  },
  ouv_mvt: {
    label: 'Ouverture + Mouvements',
    groups: [
      { title: 'Ouverture', cols: [
        { key: 'opening_debit', label: 'Débit' },
        { key: 'opening_credit', label: 'Crédit' },
      ]},
      { title: 'Mouvements', cols: [
        { key: 'period_debit', label: 'Débit' },
        { key: 'period_credit', label: 'Crédit' },
      ]},
    ],
    showBalance: true,
    getBalance: (l) => l.balance,
  },
  ouverture: {
    label: 'Ouverture seule',
    groups: [
      { title: null, cols: [
        { key: 'opening_debit', label: 'Débit' },
        { key: 'opening_credit', label: 'Crédit' },
      ]},
    ],
    showBalance: true,
    getBalance: (l) => l.opening_debit - l.opening_credit,
  },
};

const VIEW_ORDER = ['complete', 'soldes', 'mouvements', 'ouv_mvt', 'ouverture'];

/* ─── Formatage nombre ────────────────────────────────────────────── */
const fmt = (val) => {
  if (val === 0 || val === null || val === undefined) return '';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const fmtTotal = (val) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

/* ─── Mois français ───────────────────────────────────────────────── */
const MONTHS = {
  '01': 'Janvier',
  '02': 'Février',
  '03': 'Mars',
  '04': 'Avril',
  '05': 'Mai',
  '06': 'Juin',
  '07': 'Juillet',
  '08': 'Août',
  '09': 'Septembre',
  '10': 'Octobre',
  '11': 'Novembre',
  '12': 'Décembre',
  'AN': 'À-nouveau',
  'OUV': 'Ouverture',
};

export default function TrialBalancePage({ embedded = false }) {
  /* ── State ─────────────────────────────────────────────────────── */
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedClasses, setCollapsedClasses] = useState({});
  const [showZeroBalances, setShowZeroBalances] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [displayMode, setDisplayMode] = useState('complete');
  const [groupByClass, setGroupByClass] = useState(true);

  /* ── Charger les sociétés ──────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const res = await api.get('/reports/trial-balance/companies');
        setCompanies(res.data);
        if (res.data.length > 0) {
          setSelectedCompany(res.data[0].company_id);
        }
      } catch {
        setError('Impossible de charger les sociétés.');
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
  }, []);

  /* ── Charger les exercices quand la société change ─────────────── */
  useEffect(() => {
    if (!selectedCompany) {
      setYears([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get('/reports/trial-balance/years', {
          params: { company_id: selectedCompany },
        });
        setYears(res.data.years || []);
        if (res.data.years?.length > 0) {
          setSelectedYear(String(res.data.years[0]));
        } else {
          setSelectedYear('');
        }
      } catch {
        setYears([]);
      }
    };
    load();
  }, [selectedCompany]);

  /* ── Charger les périodes quand l'exercice change ───────────────── */
  useEffect(() => {
    if (!selectedCompany || !selectedYear) {
      setPeriods([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get('/reports/trial-balance/periods', {
          params: { company_id: selectedCompany, fiscal_year: selectedYear },
        });
        setPeriods(res.data.periods || []);
        setSelectedPeriod(''); // cumul annuel par défaut
      } catch {
        setPeriods([]);
      }
    };
    load();
  }, [selectedCompany, selectedYear]);

  /* ── Charger la balance ────────────────────────────────────────── */
  const fetchBalance = useCallback(async () => {
    if (!selectedCompany || !selectedYear) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        company_id: selectedCompany,
        fiscal_year: parseInt(selectedYear),
      };
      if (selectedPeriod) params.period = selectedPeriod;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/reports/trial-balance/data', { params });
      setBalanceData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement de la balance.');
      setBalanceData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedYear, selectedPeriod, dateFrom, dateTo]);

  useEffect(() => {
    if (selectedCompany && selectedYear) {
      fetchBalance();
    }
  }, [fetchBalance]);

  /* ── Filtrage et groupement par classe ─────────────────────────── */
  const groupedLines = useMemo(() => {
    if (!balanceData?.lines) return {};

    let filtered = balanceData.lines;

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.account_number.toLowerCase().includes(term) ||
          (l.account_label || '').toLowerCase().includes(term)
      );
    }

    // Masquer soldes nuls
    if (!showZeroBalances) {
      filtered = filtered.filter(
        (l) => l.cumulative_debit !== 0 || l.cumulative_credit !== 0
      );
    }

    // Filtre par classe
    if (classFilter) {
      filtered = filtered.filter((l) => l.account_number.startsWith(classFilter));
    }

    // Grouper par classe
    const groups = {};
    for (const line of filtered) {
      const cls = line.account_number.charAt(0);
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(line);
    }

    return groups;
  }, [balanceData, searchTerm, showZeroBalances, classFilter]);

  /* ── Totaux filtrés ────────────────────────────────────────────── */
  const filteredTotals = useMemo(() => {
    const totals = {
      opening_debit: 0,
      opening_credit: 0,
      period_debit: 0,
      period_credit: 0,
      cumulative_debit: 0,
      cumulative_credit: 0,
      balance: 0,
    };
    for (const lines of Object.values(groupedLines)) {
      for (const l of lines) {
        totals.opening_debit += l.opening_debit;
        totals.opening_credit += l.opening_credit;
        totals.period_debit += l.period_debit;
        totals.period_credit += l.period_credit;
        totals.cumulative_debit += l.cumulative_debit;
        totals.cumulative_credit += l.cumulative_credit;
        totals.balance += l.balance;
      }
    }
    return totals;
  }, [groupedLines]);

  const totalFilteredLines = Object.values(groupedLines).reduce(
    (sum, lines) => sum + lines.length,
    0
  );

  /* ── Configuration de la vue active ────────────────────────────── */
  const viewConfig = VIEW_CONFIGS[displayMode];
  const viewColsFlat = useMemo(() => {
    const result = [];
    for (const g of viewConfig.groups) {
      g.cols.forEach((col, i) => {
        result.push({ ...col, borderStart: i === 0 });
      });
    }
    return result;
  }, [displayMode]);
  const hasTwoRowHeader = viewConfig.groups.some(g => g.title);
  const totalColumns = 2 + viewColsFlat.length + (viewConfig.showBalance ? 1 : 0);

  /* ── Toggle classe ─────────────────────────────────────────────── */
  const toggleClass = (cls) => {
    setCollapsedClasses((prev) => ({ ...prev, [cls]: !prev[cls] }));
  };

  /* ── Export CSV ─────────────────────────────────────────────────── */
  const exportCsv = () => {
    if (!balanceData?.lines?.length) return;

    const sep = ';';
    const csvLabels = {
      opening_debit: 'Débit ouverture',
      opening_credit: 'Crédit ouverture',
      period_debit: 'Débit période',
      period_credit: 'Crédit période',
      cumulative_debit: 'Cumul débit',
      cumulative_credit: 'Cumul crédit',
    };
    const csvColHeaders = viewColsFlat.map(c => csvLabels[c.key] || c.label);
    const header = [
      'N° Compte',
      'Libellé',
      ...csvColHeaders,
      ...(viewConfig.showBalance ? ['Solde'] : []),
    ].join(sep);

    const rows = [];
    for (const cls of Object.keys(groupedLines).sort()) {
      for (const line of groupedLines[cls]) {
        const vals = viewColsFlat.map(c => line[c.key]);
        if (viewConfig.showBalance) vals.push(viewConfig.getBalance(line));
        rows.push(
          [
            line.account_number,
            `"${(line.account_label || '').replace(/"/g, '""')}"`,
            ...vals,
          ].join(sep)
        );
      }
    }

    const bom = '\uFEFF';
    const csv = bom + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_generale_${selectedCompany}_${selectedYear}${selectedPeriod ? '_P' + selectedPeriod : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Sous-totaux par classe ────────────────────────────────────── */
  const classSubtotal = (lines) => {
    const t = {
      opening_debit: 0,
      opening_credit: 0,
      period_debit: 0,
      period_credit: 0,
      cumulative_debit: 0,
      cumulative_credit: 0,
      balance: 0,
    };
    for (const l of lines) {
      t.opening_debit += l.opening_debit;
      t.opening_credit += l.opening_credit;
      t.period_debit += l.period_debit;
      t.period_credit += l.period_credit;
      t.cumulative_debit += l.cumulative_debit;
      t.cumulative_credit += l.cumulative_credit;
      t.balance += l.balance;
    }
    return t;
  };

  /* ── Impression ────────────────────────────────────────────────── */
  const handlePrint = () => window.print();

  /* ── Rendu ─────────────────────────────────────────────────────── */
  const companyName =
    companies.find((c) => c.company_id === selectedCompany)?.company_name || selectedCompany;

  return (
    <div className="trial-balance-page">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h4 className="fw-bold mb-0">
            <FaBalanceScale className="me-2 text-primary" />
            Balance Générale
          </h4>
          {balanceData && (
            <p className="text-muted small mb-0 mt-1">
              {companyName} — Exercice {selectedYear}
              {selectedPeriod ? ` — ${MONTHS[selectedPeriod] || `Période ${selectedPeriod}`}` : ' — Cumul annuel'}
              {' '}— {balanceData.lines_count} compte{balanceData.lines_count > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="d-flex gap-2 no-print">
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={handlePrint}
            disabled={!balanceData?.lines?.length}
          >
            <FaPrint /> Imprimer
          </button>
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
            onClick={exportCsv}
            disabled={!balanceData?.lines?.length}
          >
            <FaDownload /> Export CSV
          </button>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            onClick={fetchBalance}
            disabled={loading || !selectedCompany || !selectedYear}
          >
            <FaSync className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="alert alert-danger alert-dismissible py-2 no-print">
          {error}
          <button type="button" className="btn-close btn-sm" onClick={() => setError('')} />
        </div>
      )}

      {/* Sélecteurs */}
      <div className="card border-0 shadow-sm mb-3 no-print">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">
                <FaBuilding className="me-1 text-muted" />
                Société
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                disabled={loadingMeta}
              >
                {companies.length === 0 && (
                  <option value="">Aucune donnée</option>
                )}
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_id} — {c.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" />
                Exercice
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={years.length === 0}
              >
                {years.length === 0 && <option value="">—</option>}
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Période</label>
              <select
                className="form-select form-select-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">Cumul annuel</option>
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {MONTHS[p] || `Période ${p}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaSearch className="me-1 text-muted" />
                Recherche
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="N° compte ou libellé…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-1">
              <label className="form-label small fw-bold mb-1">
                <FaFilter className="me-1 text-muted" />
                Classe
              </label>
              <select
                className="form-select form-select-sm"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">Toutes</option>
                {Object.entries(ACCOUNT_CLASSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k} — {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row g-3 align-items-end mt-0">
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" />
                Date début
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" />
                Date fin
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="col-md-auto">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  title="Effacer les dates"
                >
                  <FaTimes className="me-1" />
                  Effacer dates
                </button>
              </div>
            )}
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">
                <FaEye className="me-1 text-muted" />
                Affichage
              </label>
              <select
                className="form-select form-select-sm"
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value)}
              >
                {VIEW_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {VIEW_CONFIGS[id].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 d-flex align-items-center gap-3">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="showZeroBalances"
                checked={showZeroBalances}
                onChange={(e) => setShowZeroBalances(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="showZeroBalances">
                Afficher les comptes à solde nul
              </label>
            </div>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="groupByClass"
                checked={groupByClass}
                onChange={(e) => setGroupByClass(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="groupByClass">
                Regrouper par classe
              </label>
            </div>
            {balanceData && (
              <span className="small text-muted">
                {totalFilteredLines} / {balanceData.lines_count} comptes affichés
              </span>
            )}
          </div>
        </div>
      </div>

      {/* État vide / chargement */}
      {loadingMeta ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2">Chargement des paramètres…</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <FaBalanceScale size={48} className="text-muted opacity-25 mb-3" />
            <h5 className="text-muted">Aucune donnée disponible</h5>
            <p className="text-muted small">
              Les données seront disponibles après synchronisation des écritures comptables
              depuis un agent desktop via l'API <code>entries/push</code>.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2">Calcul de la balance…</p>
        </div>
      ) : balanceData && balanceData.lines_count > 0 ? (
        /* ── Tableau de la balance ──────────────────────────────────── */
        <div className="card border-0 shadow-sm">
          {/* En-tête impression */}
          <div className="d-none print-header" style={{ display: 'none' }}>
            <h3 className="text-center mb-0">Balance Générale</h3>
            <p className="text-center text-muted mb-2">
              {companyName} — Exercice {selectedYear}
              {selectedPeriod ? ` — ${MONTHS[selectedPeriod] || selectedPeriod}` : ''}
            </p>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle trial-balance-table">
                <thead className="table-light sticky-top">
                  {hasTwoRowHeader ? (
                    <>
                      <tr>
                        <th rowSpan={2} style={{ width: '100px', verticalAlign: 'middle' }}>N° Compte</th>
                        <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Libellé</th>
                        {viewConfig.groups.map((g, i) => (
                          <th key={i} colSpan={g.cols.length} className="text-center border-start" style={{ fontSize: '0.8rem' }}>
                            {g.title}
                          </th>
                        ))}
                        {viewConfig.showBalance && (
                          <th rowSpan={2} className="text-end border-start" style={{ width: '110px', verticalAlign: 'middle' }}>Solde</th>
                        )}
                      </tr>
                      <tr>
                        {viewConfig.groups.map((g, gi) =>
                          g.cols.map((col, ci) => (
                            <th key={`${gi}-${ci}`} className={`text-end${ci === 0 ? ' border-start' : ''}`} style={{ width: '100px', fontSize: '0.75rem' }}>
                              {col.label}
                            </th>
                          ))
                        )}
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <th style={{ width: '100px' }}>N° Compte</th>
                      <th>Libellé</th>
                      {viewColsFlat.map((col) => (
                        <th key={col.key} className={`text-end${col.borderStart ? ' border-start' : ''}`} style={{ width: '110px' }}>
                          {col.label}
                        </th>
                      ))}
                      {viewConfig.showBalance && (
                        <th className="text-end border-start" style={{ width: '110px' }}>Solde</th>
                      )}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {groupByClass ? (
                    /* ── Affichage GROUPÉ par classe ────────────────── */
                    Object.keys(groupedLines)
                    .sort()
                    .map((cls) => {
                      const lines = groupedLines[cls];
                      const collapsed = collapsedClasses[cls];
                      const sub = classSubtotal(lines);

                      return [
                        /* En-tête de classe */
                        <tr
                          key={`class-${cls}`}
                          className="class-header"
                          style={{
                            backgroundColor: `${CLASS_COLORS[cls] || '#555'}11`,
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleClass(cls)}
                        >
                          <td
                            colSpan={totalColumns}
                            className="fw-bold py-2"
                            style={{ color: CLASS_COLORS[cls] || '#555' }}
                          >
                            {collapsed ? (
                              <FaChevronRight className="me-2" style={{ fontSize: '0.7rem' }} />
                            ) : (
                              <FaChevronDown className="me-2" style={{ fontSize: '0.7rem' }} />
                            )}
                            Classe {cls} — {ACCOUNT_CLASSES[cls] || 'Autres'}
                            <span className="fw-normal text-muted ms-2 small">
                              ({lines.length} compte{lines.length > 1 ? 's' : ''})
                            </span>
                          </td>
                        </tr>,
                        /* Lignes de comptes */
                        ...(!collapsed
                          ? lines.map((line) => (
                              <tr key={line.account_number}>
                                <td>
                                  <code style={{ fontSize: '0.85rem' }}>{line.account_number}</code>
                                </td>
                                <td className="text-truncate" style={{ maxWidth: 280 }}>
                                  {line.account_label || '—'}
                                </td>
                                {viewColsFlat.map((col) => (
                                  <td key={col.key} className={`text-end${col.borderStart ? ' border-start' : ''}`}>
                                    {fmt(line[col.key])}
                                  </td>
                                ))}
                                {viewConfig.showBalance && (
                                  <td
                                    className={`text-end fw-semibold border-start ${
                                      viewConfig.getBalance(line) > 0
                                        ? 'text-primary'
                                        : viewConfig.getBalance(line) < 0
                                          ? 'text-danger'
                                          : ''
                                    }`}
                                  >
                                    {fmt(viewConfig.getBalance(line))}
                                  </td>
                                )}
                              </tr>
                            ))
                          : []),
                        /* Sous-total de classe */
                        <tr
                          key={`subtotal-${cls}`}
                          className="fw-bold"
                          style={{
                            backgroundColor: `${CLASS_COLORS[cls] || '#555'}08`,
                            borderTop: `2px solid ${CLASS_COLORS[cls] || '#555'}44`,
                          }}
                        >
                          <td colSpan={2} className="text-end small" style={{ color: CLASS_COLORS[cls] }}>
                            Total Classe {cls}
                          </td>
                          {viewColsFlat.map((col) => (
                            <td key={col.key} className={`text-end${col.borderStart ? ' border-start' : ''}`}>
                              {fmtTotal(sub[col.key])}
                            </td>
                          ))}
                          {viewConfig.showBalance && (
                            <td className="text-end border-start">{fmtTotal(viewConfig.getBalance(sub))}</td>
                          )}
                        </tr>,
                      ];
                    })
                  ) : (
                    /* ── Affichage PLAT sans regroupement ───────────── */
                    Object.keys(groupedLines)
                      .sort()
                      .flatMap((cls) => groupedLines[cls])
                      .map((line) => (
                        <tr key={line.account_number}>
                          <td>
                            <code style={{ fontSize: '0.85rem' }}>{line.account_number}</code>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 280 }}>
                            {line.account_label || '—'}
                          </td>
                          {viewColsFlat.map((col) => (
                            <td key={col.key} className={`text-end${col.borderStart ? ' border-start' : ''}`}>
                              {fmt(line[col.key])}
                            </td>
                          ))}
                          {viewConfig.showBalance && (
                            <td
                              className={`text-end fw-semibold border-start ${
                                viewConfig.getBalance(line) > 0
                                  ? 'text-primary'
                                  : viewConfig.getBalance(line) < 0
                                    ? 'text-danger'
                                    : ''
                              }`}
                            >
                              {fmt(viewConfig.getBalance(line))}
                            </td>
                          )}
                        </tr>
                      ))
                  )}
                </tbody>
                <tfoot>
                  <tr
                    className="fw-bold"
                    style={{
                      backgroundColor: '#062A5A',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  >
                    <td colSpan={2} className="text-end">
                      TOTAL GÉNÉRAL
                    </td>
                    {viewColsFlat.map((col) => (
                      <td key={col.key} className={`text-end${col.borderStart ? ' border-start' : ''}`}>
                        {fmtTotal(filteredTotals[col.key])}
                      </td>
                    ))}
                    {viewConfig.showBalance && (
                      <td className="text-end border-start">{fmtTotal(viewConfig.getBalance(filteredTotals))}</td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : balanceData && balanceData.lines_count === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <FaBalanceScale size={40} className="text-muted opacity-25 mb-3" />
            <h6 className="text-muted">Aucune écriture trouvée</h6>
            <p className="text-muted small mb-0">
              Aucune écriture comptable pour {companyName} — Exercice {selectedYear}
              {selectedPeriod ? `, période ${MONTHS[selectedPeriod] || selectedPeriod}` : ''}.
            </p>
          </div>
        </div>
      ) : null}

      {/* Styles spécifiques */}
      <style>{`
        .trial-balance-table th {
          font-size: 0.8rem;
          white-space: nowrap;
          position: relative;
        }
        .trial-balance-table td {
          font-size: 0.82rem;
          padding: 0.35rem 0.5rem;
          white-space: nowrap;
        }
        .trial-balance-table .class-header td {
          font-size: 0.85rem;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .sidebar, .top-navbar { display: none !important; }
          .main-content { margin: 0; padding: 0; }
          .trial-balance-table td,
          .trial-balance-table th {
            font-size: 9pt;
            padding: 2px 4px;
          }
        }
      `}</style>
    </div>
  );
}
