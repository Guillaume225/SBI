import { useState, useEffect, useCallback } from 'react';
import {
  FaChartLine,
  FaSync,
  FaDownload,
  FaPrint,
  FaFilter,
  FaBuilding,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaChartBar,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from 'react-icons/fa';
import api from '../../services/api';
import { useCompany } from '../../contexts/CompanyContext';

/* ─── Formater un montant ─────────────────────────────────────────── */
function fmt(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Couleurs par type de ligne ──────────────────────────────────── */
const LINE_STYLES = {
  section_header:    { bg: '#edf2f7', fw: '700', color: '#062A5A', border: '2px solid #cbd5e0' },
  detail:            { bg: 'transparent', fw: 'normal', color: '#333', border: 'none' },
  subtotal:          { bg: '#f7fafc', fw: '600', color: '#2d3748', border: '1px solid #e2e8f0' },
  total_section:     { bg: '#e8f0fe', fw: '700', color: '#062A5A', border: '2px solid #b8cff5' },
  resultat:          { bg: '#dbeafe', fw: '700', color: '#1e40af', border: '2px solid #93c5fd' },
  resultat_important:{ bg: '#c7d2fe', fw: '700', color: '#3730a3', border: '2px solid #818cf8' },
  grand_total:       { bg: '#f0fdf4', fw: '700', color: '#166534', border: '2px solid #86efac' },
  resultat_final:    { bg: '#062A5A', fw: '700', color: '#fff', border: 'none' },
};

/* ─── Composant principal ─────────────────────────────────────────── */
export default function IncomeStatementPage({ embedded = false }) {
  const { selectedCompany, fiscalYear } = useCompany();

  const [companies, setCompanies] = useState([]);
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [companyId, setCompanyId] = useState(selectedCompany?.code || '');
  const [year, setYear] = useState(fiscalYear || new Date().getFullYear());
  const [period, setPeriod] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Charger sociétés ──────────────────────────────────────────── */
  useEffect(() => {
    api.get('/reports/trial-balance/companies')
      .then((r) => setCompanies(r.data))
      .catch(() => {});
  }, []);

  /* ── Charger exercices ─────────────────────────────────────────── */
  useEffect(() => {
    if (!companyId) return;
    api.get('/reports/trial-balance/years', { params: { company_id: companyId } })
      .then((r) => {
        setYears(r.data.years || []);
        if (r.data.years?.length > 0 && !r.data.years.includes(year)) {
          setYear(r.data.years[0]);
        }
      })
      .catch(() => {});
  }, [companyId]);

  /* ── Charger périodes ──────────────────────────────────────────── */
  useEffect(() => {
    if (!companyId || !year) return;
    api.get('/reports/trial-balance/periods', {
      params: { company_id: companyId, fiscal_year: year },
    })
      .then((r) => setPeriods(r.data.periods || []))
      .catch(() => {});
  }, [companyId, year]);

  /* ── Sélection auto ────────────────────────────────────────────── */
  useEffect(() => {
    if (selectedCompany?.code && !companyId) setCompanyId(selectedCompany.code);
  }, [selectedCompany]);

  /* ── Charger les données ───────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!companyId || !year) return;
    setLoading(true);
    setError('');
    try {
      const params = { company_id: companyId, fiscal_year: year };
      if (period) params.period = period;
      const r = await api.get('/reports/income-statement/data', { params });
      setData(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du Compte de Résultat.');
    } finally {
      setLoading(false);
    }
  }, [companyId, year, period]);

  useEffect(() => {
    if (companyId && year) fetchData();
  }, [companyId, year, period]);

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!data) return;
    const csvLines = ['Libellé;Montant'];
    for (const line of data.lines) {
      const prefix = line.level > 0 ? '  '.repeat(line.level) : '';
      csvLines.push(`${prefix}${line.label};${line.montant ?? ''}`);
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compte_resultat_${companyId}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  /* ── Helpers KPI ───────────────────────────────────────────────── */
  const kpiItems = data?.summary
    ? [
        { label: "Chiffre d'affaires", value: data.chiffre_affaires },
        { label: 'Rés. exploitation', value: data.summary.resultat_exploitation },
        { label: 'Rés. financier', value: data.summary.resultat_financier },
        { label: 'RCAI', value: data.summary.rcai },
        { label: 'Rés. exceptionnel', value: data.summary.resultat_exceptionnel },
        { label: 'Résultat net', value: data.summary.resultat_net },
      ]
    : [];

  return (
    <div className={embedded ? '' : 'container-fluid py-3'}>
      {/* ── Filtres ──────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-3 no-print">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">
                <FaBuilding className="me-1" /> Société
              </label>
              <select
                className="form-select form-select-sm"
                value={companyId}
                onChange={(e) => { setCompanyId(e.target.value); setPeriod(''); }}
              >
                <option value="">— Sélectionner —</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name} ({c.company_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1" /> Exercice
              </label>
              <select
                className="form-select form-select-sm"
                value={year}
                onChange={(e) => { setYear(parseInt(e.target.value)); setPeriod(''); }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
                {years.length === 0 && <option value={year}>{year}</option>}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaFilter className="me-1" /> Période
              </label>
              <select
                className="form-select form-select-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="">Toutes</option>
                {periods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-auto d-flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={fetchData} disabled={loading}>
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Actualiser
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={exportCSV} disabled={!data}>
                <FaDownload className="me-1" /> CSV
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint} disabled={!data}>
                <FaPrint className="me-1" /> Imprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Erreur ───────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-danger py-2">
          <FaExclamationTriangle className="me-2" />{error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted small mt-2">Calcul du Compte de Résultat…</p>
        </div>
      )}

      {/* ── Compte de Résultat ───────────────────────────────────── */}
      {data && !loading && (
        <div>
          {/* En-tête imprimable */}
          <div className="text-center mb-3 d-none d-print-block">
            <h4 className="fw-bold">{data.company_name}</h4>
            <h5>Compte de Résultat — Exercice {data.fiscal_year}{data.period ? ` — Période ${data.period}` : ''}</h5>
            <p className="text-muted small">Généré le {new Date(data.generated_at).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* KPI cards */}
          <div className="row g-3 mb-3 no-print">
            {kpiItems.map((kpi) => (
              <div key={kpi.label} className="col-md-4 col-lg-2">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body py-2 text-center">
                    <div className="text-muted small mb-1">{kpi.label}</div>
                    <div
                      className={`fw-bold ${kpi.value < 0 ? 'text-danger' : kpi.value > 0 ? 'text-success' : ''}`}
                      style={{ fontSize: '1.05rem' }}
                    >
                      {fmt(kpi.value)} €
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau principal */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header py-2" style={{ background: '#062A5A', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <FaChartLine className="me-2" />
                  Compte de Résultat
                </span>
                <span className="small">
                  CA : {fmt(data.chiffre_affaires)} €
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr className="table-light">
                    <th style={{ width: '65%' }}>Libellé</th>
                    <th className="text-end" style={{ width: '35%' }}>Montant (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, idx) => {
                    const style = LINE_STYLES[line.type] || LINE_STYLES.detail;
                    const isHeader = line.type === 'section_header';
                    return (
                      <tr
                        key={`${line.section}_${idx}`}
                        style={{
                          backgroundColor: style.bg,
                          fontWeight: style.fw,
                          color: style.color,
                          borderTop: style.border,
                        }}
                      >
                        <td style={{ paddingLeft: `${0.75 + line.level * 1.5}rem` }}>
                          {line.label}
                        </td>
                        <td className="text-end">
                          {isHeader
                            ? ''
                            : (
                              <span
                                style={{
                                  color: line.type === 'resultat_final'
                                    ? style.color
                                    : line.montant < 0
                                    ? '#c0392b'
                                    : line.montant > 0
                                    ? '#1e8449'
                                    : '#888',
                                }}
                              >
                                {fmt(line.montant)}
                              </span>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graphique barres */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0 fw-bold">
                <FaChartBar className="me-2 text-primary" />
                Synthèse des résultats
              </h6>
            </div>
            <div className="card-body">
              <ResultsBarChart summary={data.summary} />
            </div>
          </div>
        </div>
      )}

      {/* ── État vide ────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="text-center py-5 text-muted">
          <FaChartLine size={48} className="mb-3 opacity-25" />
          <p>Sélectionnez une société et un exercice pour afficher le Compte de Résultat.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Graphique barres horizontales ───────────────────────────────── */
function ResultsBarChart({ summary }) {
  const items = [
    { key: 'resultat_exploitation', label: 'Rés. exploitation' },
    { key: 'resultat_financier', label: 'Rés. financier' },
    { key: 'rcai', label: 'RCAI' },
    { key: 'resultat_exceptionnel', label: 'Rés. exceptionnel' },
    { key: 'resultat_net', label: 'Résultat net' },
  ];

  const values = items.map((it) => summary[it.key] || 0);
  const maxAbs = Math.max(...values.map(Math.abs), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {items.map((it, i) => {
        const v = values[i];
        const pct = Math.min((Math.abs(v) / maxAbs) * 100, 100);
        const isNeg = v < 0;
        return (
          <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 130, fontSize: '0.78rem', textAlign: 'right', color: '#555', flexShrink: 0 }}>
              {it.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 24, background: '#f3f4f6', borderRadius: 4 }}>
              <div
                style={{
                  position: 'absolute',
                  left: isNeg ? `${50 - pct / 2}%` : '50%',
                  width: `${Math.max(pct / 2, 1)}%`,
                  height: '100%',
                  background: isNeg ? '#e74c3c' : '#27ae60',
                  borderRadius: 4,
                  opacity: 0.85,
                  transition: 'width 0.3s, left 0.3s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: '#ccc',
                }}
              />
            </div>
            <div
              style={{
                width: 100,
                fontSize: '0.78rem',
                fontWeight: 600,
                textAlign: 'right',
                color: isNeg ? '#c0392b' : '#1e8449',
                flexShrink: 0,
              }}
            >
              {fmt(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
