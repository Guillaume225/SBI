import { useState, useEffect, useCallback } from 'react';
import {
  FaFileInvoiceDollar,
  FaSync,
  FaDownload,
  FaPrint,
  FaFilter,
  FaBuilding,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronRight,
  FaCheck,
  FaExclamationTriangle,
} from 'react-icons/fa';
import api from '../../services/api';
import { useCompany } from '../../contexts/CompanyContext';

/* ─── Formater un montant ─────────────────────────────────────────── */
function fmt(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Composant principal ─────────────────────────────────────────── */
export default function BalanceSheetPage({ embedded = false }) {
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

  const [collapsedActif, setCollapsedActif] = useState({});
  const [collapsedPassif, setCollapsedPassif] = useState({});

  /* ── Charger les sociétés disponibles ──────────────────────────── */
  useEffect(() => {
    api.get('/reports/trial-balance/companies')
      .then((r) => setCompanies(r.data))
      .catch(() => {});
  }, []);

  /* ── Charger les exercices disponibles ─────────────────────────── */
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

  /* ── Charger les périodes disponibles ──────────────────────────── */
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

  /* ── Charger le bilan ──────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!companyId || !year) return;
    setLoading(true);
    setError('');
    try {
      const params = { company_id: companyId, fiscal_year: year };
      if (period) params.period = period;
      const r = await api.get('/reports/balance-sheet/data', { params });
      setData(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du bilan.');
    } finally {
      setLoading(false);
    }
  }, [companyId, year, period]);

  useEffect(() => {
    if (companyId && year) fetchData();
  }, [companyId, year, period]);

  /* ── Toggle sections ───────────────────────────────────────────── */
  const toggleActif = (idx) => setCollapsedActif((p) => ({ ...p, [idx]: !p[idx] }));
  const togglePassif = (idx) => setCollapsedPassif((p) => ({ ...p, [idx]: !p[idx] }));

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!data) return;
    const lines = ['Rubrique;Brut;Amort. / Dépréc.;Net'];

    lines.push('');
    lines.push('=== ACTIF ===');
    for (const section of data.actif.sections) {
      lines.push(`--- ${section.section} ---`);
      for (const item of section.items) {
        lines.push(`${item.label};${item.brut};${item.amort};${item.net}`);
      }
      lines.push(`TOTAL ${section.section};${section.total_brut};${section.total_amort};${section.total_net}`);
    }
    lines.push(`TOTAL ACTIF;${data.actif.total_brut};${data.actif.total_amort};${data.actif.total_net}`);

    lines.push('');
    lines.push('Rubrique;Montant');
    lines.push('=== PASSIF ===');
    for (const section of data.passif.sections) {
      lines.push(`--- ${section.section} ---`);
      for (const item of section.items) {
        lines.push(`${item.label};${item.montant}`);
      }
      lines.push(`TOTAL ${section.section};${section.total}`);
    }
    lines.push(`TOTAL PASSIF;${data.passif.total}`);

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan_${companyId}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Impression ────────────────────────────────────────────────── */
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
          <p className="text-muted small mt-2">Calcul du bilan…</p>
        </div>
      )}

      {/* ── Bilan ────────────────────────────────────────────────── */}
      {data && !loading && (
        <div>
          {/* En-tête imprimable */}
          <div className="text-center mb-3 d-none d-print-block">
            <h4 className="fw-bold">{data.company_name}</h4>
            <h5>Bilan Comptable — Exercice {data.fiscal_year}{data.period ? ` — Période ${data.period}` : ''}</h5>
            <p className="text-muted small">Généré le {new Date(data.generated_at).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Indicateur d'équilibre */}
          {data.equilibre !== 0 && (
            <div className="alert alert-warning py-2 mb-3 no-print">
              <FaExclamationTriangle className="me-2" />
              <strong>Attention :</strong> Le bilan n'est pas équilibré. Écart : <strong>{fmt(data.equilibre)} €</strong>
            </div>
          )}
          {data.equilibre === 0 && (
            <div className="alert alert-success py-2 mb-3 no-print">
              <FaCheck className="me-2" />
              Le bilan est équilibré. Actif Net = Passif = <strong>{fmt(data.actif.total_net)} €</strong>
            </div>
          )}

          <div className="row g-3">
            {/* ── ACTIF ───────────────────────────────────────────── */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header py-2" style={{ background: '#062A5A', color: '#fff' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">ACTIF</span>
                    <span className="fw-bold">{fmt(data.actif.total_net)} €</span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr className="table-light">
                        <th style={{ width: '50%' }}>Rubrique</th>
                        <th className="text-end" style={{ width: '18%' }}>Brut</th>
                        <th className="text-end" style={{ width: '18%' }}>Amort.</th>
                        <th className="text-end" style={{ width: '14%' }}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.actif.sections.map((section, sIdx) => (
                        <SectionActif
                          key={sIdx}
                          section={section}
                          collapsed={!!collapsedActif[sIdx]}
                          onToggle={() => toggleActif(sIdx)}
                        />
                      ))}
                      <tr style={{ background: '#062A5A', color: '#fff', fontWeight: 700 }}>
                        <td>TOTAL ACTIF</td>
                        <td className="text-end">{fmt(data.actif.total_brut)}</td>
                        <td className="text-end">{fmt(data.actif.total_amort)}</td>
                        <td className="text-end">{fmt(data.actif.total_net)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── PASSIF ──────────────────────────────────────────── */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header py-2" style={{ background: '#1a5276', color: '#fff' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">PASSIF</span>
                    <span className="fw-bold">{fmt(data.passif.total)} €</span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr className="table-light">
                        <th style={{ width: '65%' }}>Rubrique</th>
                        <th className="text-end" style={{ width: '35%' }}>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.passif.sections.map((section, sIdx) => (
                        <SectionPassif
                          key={sIdx}
                          section={section}
                          collapsed={!!collapsedPassif[sIdx]}
                          onToggle={() => togglePassif(sIdx)}
                        />
                      ))}
                      <tr style={{ background: '#1a5276', color: '#fff', fontWeight: 700 }}>
                        <td>TOTAL PASSIF</td>
                        <td className="text-end">{fmt(data.passif.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Résumé ──────────────────────────────────────────── */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body py-2">
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="text-muted small">Actif Brut</div>
                  <div className="fw-bold">{fmt(data.actif.total_brut)} €</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Amort. & Dépréc.</div>
                  <div className="fw-bold text-danger">{fmt(data.actif.total_amort)} €</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Actif Net = Passif</div>
                  <div className="fw-bold text-primary">{fmt(data.actif.total_net)} €</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── État vide ────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="text-center py-5 text-muted">
          <FaFileInvoiceDollar size={48} className="mb-3 opacity-25" />
          <p>Sélectionnez une société et un exercice pour afficher le bilan comptable.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Sous-composant : Section Actif (pliable) ────────────────────── */
function SectionActif({ section, collapsed, onToggle }) {
  const hasValues = section.items.some((i) => i.brut !== 0 || i.amort !== 0 || i.net !== 0);

  return (
    <>
      <tr
        style={{ background: '#f0f4f8', cursor: 'pointer', fontWeight: 600 }}
        onClick={onToggle}
      >
        <td>
          {collapsed ? <FaChevronRight className="me-1" style={{ fontSize: '0.65rem' }} /> : <FaChevronDown className="me-1" style={{ fontSize: '0.65rem' }} />}
          {section.section}
        </td>
        <td className="text-end">{fmt(section.total_brut)}</td>
        <td className="text-end">{fmt(section.total_amort)}</td>
        <td className="text-end fw-bold">{fmt(section.total_net)}</td>
      </tr>
      {!collapsed && section.items.map((item, idx) => (
        <tr key={idx} className={item.net === 0 && item.brut === 0 ? 'text-muted' : ''}>
          <td className="ps-4">{item.label}</td>
          <td className="text-end">{fmt(item.brut)}</td>
          <td className="text-end">{fmt(item.amort)}</td>
          <td className="text-end">{fmt(item.net)}</td>
        </tr>
      ))}
    </>
  );
}

/* ─── Sous-composant : Section Passif (pliable) ──────────────────── */
function SectionPassif({ section, collapsed, onToggle }) {
  return (
    <>
      <tr
        style={{ background: '#f0f4f8', cursor: 'pointer', fontWeight: 600 }}
        onClick={onToggle}
      >
        <td>
          {collapsed ? <FaChevronRight className="me-1" style={{ fontSize: '0.65rem' }} /> : <FaChevronDown className="me-1" style={{ fontSize: '0.65rem' }} />}
          {section.section}
        </td>
        <td className="text-end fw-bold">{fmt(section.total)}</td>
      </tr>
      {!collapsed && section.items.map((item, idx) => (
        <tr key={idx} className={item.montant === 0 ? 'text-muted' : ''}>
          <td className="ps-4">{item.label}</td>
          <td className="text-end">{fmt(item.montant)}</td>
        </tr>
      ))}
    </>
  );
}
