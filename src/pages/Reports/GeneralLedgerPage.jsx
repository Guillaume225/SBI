import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaBook,
  FaSync,
  FaDownload,
  FaPrint,
  FaFilter,
  FaBuilding,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronRight,
  FaSearch,
} from 'react-icons/fa';
import api from '../../services/api';
import { useCompany } from '../../contexts/CompanyContext';

/* ─── Formater un montant ─────────────────────────────────────────── */
function fmt(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Formater une date ───────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR');
  } catch {
    return d;
  }
}

/* ─── Composant principal ─────────────────────────────────────────── */
export default function GeneralLedgerPage({ embedded = false }) {
  const { selectedCompany, fiscalYear } = useCompany();

  const [companies, setCompanies] = useState([]);
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [companyId, setCompanyId] = useState(selectedCompany?.code || '');
  const [year, setYear] = useState(fiscalYear || new Date().getFullYear());
  const [period, setPeriod] = useState('');
  const [journalCode, setJournalCode] = useState('');
  const [accountFrom, setAccountFrom] = useState('');
  const [accountTo, setAccountTo] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // expanded/collapsed accounts
  const [collapsed, setCollapsed] = useState(new Set());

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
      if (journalCode) params.journal_code = journalCode;
      if (accountFrom) params.account_from = accountFrom;
      if (accountTo) params.account_to = accountTo;
      const r = await api.get('/reports/general-ledger/data', { params });
      setData(r.data);
      setCollapsed(new Set()); // expand all on fresh load
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du Grand Livre.');
    } finally {
      setLoading(false);
    }
  }, [companyId, year, period, journalCode, accountFrom, accountTo]);

  useEffect(() => {
    if (companyId && year) fetchData();
  }, [companyId, year, period]);

  /* ── Toggle account collapse ───────────────────────────────────── */
  const toggleAccount = (acctNum) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(acctNum)) next.delete(acctNum);
      else next.add(acctNum);
      return next;
    });
  };

  const collapseAll = () => {
    if (data) setCollapsed(new Set(data.accounts.map((a) => a.account_number)));
  };
  const expandAll = () => setCollapsed(new Set());

  /* ── Filter accounts by search term ────────────────────────────── */
  const filteredAccounts = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data.accounts;
    const q = searchTerm.toLowerCase();
    return data.accounts.filter(
      (a) =>
        a.account_number.toLowerCase().includes(q) ||
        a.account_label.toLowerCase().includes(q) ||
        a.entries.some((e) => e.label?.toLowerCase().includes(q))
    );
  }, [data, searchTerm]);

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!data) return;
    const sep = ';';
    const lines = [`Compte${sep}Libellé compte${sep}Date${sep}Journal${sep}N° pièce${sep}Libellé${sep}Débit${sep}Crédit${sep}Solde`];
    for (const acct of data.accounts) {
      for (const e of acct.entries) {
        lines.push([
          acct.account_number,
          acct.account_label,
          fmtDate(e.entry_date),
          e.journal_code,
          e.entry_number,
          (e.label || '').replace(/;/g, ','),
          e.debit || '',
          e.credit || '',
          e.running_balance,
        ].join(sep));
      }
      lines.push([
        acct.account_number,
        'TOTAL ' + acct.account_label,
        '', '', '', 'Total du compte',
        acct.total_debit,
        acct.total_credit,
        acct.solde,
      ].join(sep));
    }
    lines.push(['', '', '', '', '', 'TOTAL GÉNÉRAL', data.totals.total_debit, data.totals.total_credit, data.totals.solde].join(sep));
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grand_livre_${companyId}_${year}.csv`;
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
            <div className="col-md-2">
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
            <div className="col-md-1">
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
            <div className="col-md-1">
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
            <div className="col-md-1">
              <label className="form-label small fw-bold mb-1">Journal</label>
              <select
                className="form-select form-select-sm"
                value={journalCode}
                onChange={(e) => setJournalCode(e.target.value)}
              >
                <option value="">Tous</option>
                {data?.journals?.map((j) => (
                  <option key={j.journal_code} value={j.journal_code}>
                    {j.journal_code}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-1">
              <label className="form-label small fw-bold mb-1">Compte de</label>
              <input
                className="form-control form-control-sm"
                placeholder="ex: 101"
                value={accountFrom}
                onChange={(e) => setAccountFrom(e.target.value)}
              />
            </div>
            <div className="col-md-1">
              <label className="form-label small fw-bold mb-1">Compte à</label>
              <input
                className="form-control form-control-sm"
                placeholder="ex: 512"
                value={accountTo}
                onChange={(e) => setAccountTo(e.target.value)}
              />
            </div>
            <div className="col-md-auto d-flex gap-2 flex-wrap">
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
          <p className="text-muted small mt-2">Chargement du Grand Livre…</p>
        </div>
      )}

      {/* ── Grand Livre ──────────────────────────────────────────── */}
      {data && !loading && (
        <div>
          {/* En-tête imprimable */}
          <div className="text-center mb-3 d-none d-print-block">
            <h4 className="fw-bold">{data.company_name}</h4>
            <h5>Grand Livre — Exercice {data.fiscal_year}{data.period ? ` — Période ${data.period}` : ''}</h5>
            <p className="text-muted small">
              Généré le {new Date(data.generated_at).toLocaleDateString('fr-FR')}
              {' '}— {data.accounts_count} comptes, {data.entries_count} écritures
            </p>
          </div>

          {/* Toolbar : recherche + expand/collapse */}
          <div className="d-flex gap-2 mb-2 align-items-center no-print">
            <div className="input-group input-group-sm" style={{ maxWidth: 300 }}>
              <span className="input-group-text"><FaSearch /></span>
              <input
                className="form-control"
                placeholder="Rechercher compte / libellé…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-outline-secondary btn-sm" onClick={expandAll}>
              Tout déplier
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={collapseAll}>
              Tout replier
            </button>
            <span className="ms-auto text-muted small">
              {data.accounts_count} comptes — {data.entries_count} écritures
            </span>
          </div>

          {/* Comptes */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header py-2" style={{ background: '#062A5A', color: '#fff' }}>
              <span className="fw-bold">
                <FaBook className="me-2" />
                Grand Livre{data.filters?.journal_code ? ` — Journal ${data.filters.journal_code}` : ''}
              </span>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredAccounts.length === 0 && (
                <div className="text-center py-4 text-muted">Aucun compte trouvé.</div>
              )}
              {filteredAccounts.map((acct) => {
                const isCollapsed = collapsed.has(acct.account_number);
                return (
                  <div key={acct.account_number}>
                    {/* Account header */}
                    <div
                      className="d-flex align-items-center px-3 py-2"
                      style={{
                        background: '#edf2f7',
                        cursor: 'pointer',
                        borderTop: '2px solid #cbd5e0',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleAccount(acct.account_number)}
                    >
                      {isCollapsed ? <FaChevronRight className="me-2 text-muted" /> : <FaChevronDown className="me-2 text-muted" />}
                      <span className="fw-bold" style={{ color: '#062A5A', fontSize: '0.88rem' }}>
                        {acct.account_number} — {acct.account_label}
                      </span>
                      <span className="ms-auto d-flex gap-4" style={{ fontSize: '0.82rem' }}>
                        <span>Débit : <strong>{fmt(acct.total_debit)}</strong></span>
                        <span>Crédit : <strong>{fmt(acct.total_credit)}</strong></span>
                        <span
                          className="fw-bold"
                          style={{ color: acct.solde < 0 ? '#c0392b' : acct.solde > 0 ? '#1e8449' : '#888' }}
                        >
                          Solde : {fmt(acct.solde)}
                        </span>
                      </span>
                    </div>

                    {/* Entries table */}
                    {!isCollapsed && (
                      <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr className="table-light">
                            <th style={{ width: '8%' }}>Date</th>
                            <th style={{ width: '6%' }}>Journal</th>
                            <th style={{ width: '8%' }}>N° pièce</th>
                            <th style={{ width: '36%' }}>Libellé</th>
                            <th style={{ width: '8%' }}>Référence</th>
                            <th className="text-end" style={{ width: '11%' }}>Débit</th>
                            <th className="text-end" style={{ width: '11%' }}>Crédit</th>
                            <th className="text-end" style={{ width: '12%' }}>Solde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acct.entries.map((e) => (
                            <tr key={e.id}>
                              <td>{fmtDate(e.entry_date)}</td>
                              <td><span className="badge bg-secondary bg-opacity-75" style={{ fontSize: '0.72rem' }}>{e.journal_code}</span></td>
                              <td className="text-muted">{e.entry_number}</td>
                              <td>
                                {e.label}
                                {e.auxiliary_number && (
                                  <span className="text-muted ms-1" style={{ fontSize: '0.72rem' }}>
                                    [{e.auxiliary_number}]
                                  </span>
                                )}
                              </td>
                              <td className="text-muted" style={{ fontSize: '0.75rem' }}>{e.reference || e.document_number || ''}</td>
                              <td className="text-end">{e.debit ? fmt(e.debit) : ''}</td>
                              <td className="text-end">{e.credit ? fmt(e.credit) : ''}</td>
                              <td
                                className="text-end fw-semibold"
                                style={{ color: e.running_balance < 0 ? '#c0392b' : e.running_balance > 0 ? '#1e8449' : '#888' }}
                              >
                                {fmt(e.running_balance)}
                              </td>
                            </tr>
                          ))}
                          {/* Account total row */}
                          <tr style={{ background: '#f7fafc', fontWeight: 600, borderTop: '2px solid #cbd5e0' }}>
                            <td colSpan={5} className="text-end" style={{ color: '#062A5A' }}>
                              Total {acct.account_number}
                            </td>
                            <td className="text-end" style={{ color: '#062A5A' }}>{fmt(acct.total_debit)}</td>
                            <td className="text-end" style={{ color: '#062A5A' }}>{fmt(acct.total_credit)}</td>
                            <td
                              className="text-end fw-bold"
                              style={{ color: acct.solde < 0 ? '#c0392b' : acct.solde > 0 ? '#1e8449' : '#888' }}
                            >
                              {fmt(acct.solde)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand total footer */}
            <div
              className="card-footer py-2 d-flex justify-content-end gap-4"
              style={{ background: '#062A5A', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}
            >
              <span>Total Débit : {fmt(data.totals.total_debit)}</span>
              <span>Total Crédit : {fmt(data.totals.total_credit)}</span>
              <span>Solde : {fmt(data.totals.solde)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── État vide ────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="text-center py-5 text-muted">
          <FaBook size={48} className="mb-3 opacity-25" />
          <p>Sélectionnez une société et un exercice pour afficher le Grand Livre.</p>
        </div>
      )}
    </div>
  );
}
