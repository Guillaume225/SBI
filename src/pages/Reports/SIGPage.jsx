import { useState, useEffect, useCallback } from 'react';
import {
  FaLayerGroup,
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

/* ─── Couleurs / styles par type de ligne ─────────────────────────── */
const LINE_STYLES = {
  detail: { bg: 'transparent', fw: 'normal', color: '#333' },
  solde: { bg: '#f0f4f8', fw: '600', color: '#062A5A' },
  solde_important: { bg: '#e8f0fe', fw: '700', color: '#062A5A' },
  resultat_final: { bg: '#062A5A', fw: '700', color: '#fff' },
};

/* ─── Composant principal ─────────────────────────────────────────── */
export default function SIGPage({ embedded = false }) {
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

  /* ── Charger les données SIG ───────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!companyId || !year) return;
    setLoading(true);
    setError('');
    try {
      const params = { company_id: companyId, fiscal_year: year };
      if (period) params.period = period;
      const r = await api.get('/reports/sig/data', { params });
      setData(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du SIG.');
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
    const csvLines = ['Libellé;Montant;% CA'];
    for (const line of data.lines) {
      const pct = data.chiffre_affaires ? ((line.montant / data.chiffre_affaires) * 100).toFixed(1) + '%' : '';
      csvLines.push(`${line.label};${line.montant};${pct}`);
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sig_${companyId}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

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
          <p className="text-muted small mt-2">Calcul du SIG…</p>
        </div>
      )}

      {/* ── SIG ──────────────────────────────────────────────────── */}
      {data && !loading && (
        <div>
          {/* En-tête imprimable */}
          <div className="text-center mb-3 d-none d-print-block">
            <h4 className="fw-bold">{data.company_name}</h4>
            <h5>Soldes Intermédiaires de Gestion — Exercice {data.fiscal_year}{data.period ? ` — Période ${data.period}` : ''}</h5>
            <p className="text-muted small">Généré le {new Date(data.generated_at).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Tableau SIG */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header py-2" style={{ background: '#062A5A', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <FaLayerGroup className="me-2" />
                  Soldes Intermédiaires de Gestion
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
                    <th style={{ width: '55%' }}>Libellé</th>
                    <th className="text-end" style={{ width: '25%' }}>Montant (€)</th>
                    <th className="text-end" style={{ width: '20%' }}>% CA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => {
                    const style = LINE_STYLES[line.type] || LINE_STYLES.detail;
                    const pctCA = data.chiffre_affaires
                      ? ((line.montant / data.chiffre_affaires) * 100).toFixed(1) + ' %'
                      : '—';
                    return (
                      <tr
                        key={line.key}
                        style={{
                          backgroundColor: style.bg,
                          fontWeight: style.fw,
                          color: style.color,
                        }}
                      >
                        <td style={{ paddingLeft: `${1 + line.level * 1.5}rem` }}>
                          {line.label}
                        </td>
                        <td className="text-end">
                          <span style={{ color: line.type !== 'resultat_final' ? (line.montant < 0 ? '#c0392b' : line.montant > 0 ? '#1e8449' : '#888') : style.color }}>
                            {fmt(line.montant)}
                          </span>
                        </td>
                        <td className="text-end" style={{ opacity: line.type === 'detail' ? 0.6 : 1 }}>
                          {pctCA}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicateurs clés */}
          {data.ratios && (
            <div className="row g-3 mb-3">
              <KPICard label="Chiffre d'affaires" value={data.summary.chiffre_affaires} />
              <KPICard label="Valeur ajoutée" value={data.summary.valeur_ajoutee} pct={data.ratios.taux_valeur_ajoutee} />
              <KPICard label="EBE" value={data.summary.ebe} pct={data.ratios.taux_ebe} />
              <KPICard label="Résultat exploitation" value={data.summary.resultat_exploitation} pct={data.ratios.taux_resultat_exploitation} />
              <KPICard label="Résultat net" value={data.summary.resultat_net} pct={data.ratios.taux_resultat_net} />
              <KPICard label="CAF" value={data.summary.caf} pct={data.ratios.taux_caf} />
            </div>
          )}

          {/* Graphique simplifié (barres) */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0 fw-bold">
                <FaChartBar className="me-2 text-primary" />
                Cascade des soldes
              </h6>
            </div>
            <div className="card-body">
              <WaterfallChart data={data} />
            </div>
          </div>
        </div>
      )}

      {/* ── État vide ────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="text-center py-5 text-muted">
          <FaLayerGroup size={48} className="mb-3 opacity-25" />
          <p>Sélectionnez une société et un exercice pour afficher les SIG.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Carte KPI ───────────────────────────────────────────────────── */
function KPICard({ label, value, pct }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <div className="col-md-4 col-lg-2">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body py-2 text-center">
          <div className="text-muted small mb-1">{label}</div>
          <div className={`fw-bold ${isNegative ? 'text-danger' : isPositive ? 'text-success' : ''}`} style={{ fontSize: '1.05rem' }}>
            {fmt(value)} €
          </div>
          {pct != null && (
            <div className="small mt-1">
              {isPositive && <FaArrowUp className="text-success me-1" style={{ fontSize: '0.6rem' }} />}
              {isNegative && <FaArrowDown className="text-danger me-1" style={{ fontSize: '0.6rem' }} />}
              {!isPositive && !isNegative && <FaMinus className="text-muted me-1" style={{ fontSize: '0.6rem' }} />}
              <span className={isNegative ? 'text-danger' : isPositive ? 'text-success' : 'text-muted'}>
                {pct} % CA
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Graphique en cascade simplifié (CSS) ────────────────────────── */
function WaterfallChart({ data }) {
  const keys = [
    { key: 'marge_commerciale', label: 'Marge comm.' },
    { key: 'valeur_ajoutee', label: 'VA' },
    { key: 'ebe', label: 'EBE' },
    { key: 'resultat_exploitation', label: 'Rés. exploit.' },
    { key: 'rcai', label: 'RCAI' },
    { key: 'resultat_net', label: 'Rés. net' },
    { key: 'caf', label: 'CAF' },
  ];

  const values = keys.map((k) => data.summary[k.key] || 0);
  const maxAbs = Math.max(...values.map(Math.abs), 1);

  return (
    <div className="d-flex align-items-end gap-2" style={{ height: 180 }}>
      {keys.map((k, i) => {
        const v = values[i];
        const pct = Math.abs(v / maxAbs) * 100;
        const isNeg = v < 0;
        return (
          <div key={k.key} className="flex-fill text-center" style={{ minWidth: 0 }}>
            <div className="small fw-bold mb-1" style={{ fontSize: '0.7rem', color: isNeg ? '#c0392b' : '#1e8449' }}>
              {fmt(v)}
            </div>
            <div className="d-flex flex-column justify-content-end align-items-center" style={{ height: 120 }}>
              <div
                style={{
                  width: '70%',
                  height: `${Math.max(pct, 5)}%`,
                  backgroundColor: isNeg ? '#e74c3c' : '#27ae60',
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.85,
                  transition: 'height 0.3s',
                }}
              />
            </div>
            <div className="small text-muted mt-1" style={{ fontSize: '0.68rem', lineHeight: 1.1 }}>
              {k.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
