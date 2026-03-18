import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaSearch,
  FaDownload,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaPlus,
  FaTrashAlt,
  FaCheck,
  FaExclamationTriangle,
} from 'react-icons/fa';
import api from '../../services/api';

/* ─── Formatage ───────────────────────────────────────────────────── */
const fmt = (val) => {
  if (val === 0 || val === null || val === undefined) return '';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const EDITABLE_FIELDS = [
  { key: 'journal_code',       label: 'Journal',         type: 'text',   width: 70 },
  { key: 'entry_number',       label: 'N° Pièce',       type: 'text',   width: 80 },
  { key: 'entry_date',         label: 'Date',            type: 'date',   width: 110 },
  { key: 'account_number',     label: 'N° Compte',      type: 'text',   width: 90 },
  { key: 'account_label',      label: 'Libellé compte',  type: 'text',   width: 150 },
  { key: 'auxiliary_number',   label: 'N° Auxiliaire',   type: 'text',   width: 90 },
  { key: 'auxiliary_label',    label: 'Libellé aux.',    type: 'text',   width: 140 },
  { key: 'label',              label: 'Libellé',         type: 'text',   width: 180 },
  { key: 'debit',              label: 'Débit',           type: 'number', width: 100 },
  { key: 'credit',             label: 'Crédit',          type: 'number', width: 100 },
  { key: 'reference',          label: 'Référence',       type: 'text',   width: 100 },
  { key: 'document_number',    label: 'N° Document',     type: 'text',   width: 100 },
  { key: 'period',             label: 'Période',         type: 'text',   width: 60 },
];

export default function EntriesPage() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [companies, setCompanies] = useState([]);
  const [years, setYears] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedJournal, setSelectedJournal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const searchTimer = useRef(null);

  /* ── Charger les sociétés ──────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/entries/browse/companies');
        setCompanies(res.data);
        if (res.data.length > 0) setSelectedCompany(res.data[0].company_id);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  /* ── Charger les exercices ─────────────────────────────────────── */
  useEffect(() => {
    if (!selectedCompany) { setYears([]); return; }
    const load = async () => {
      try {
        const res = await api.get('/entries/browse/years', { params: { company_id: selectedCompany } });
        setYears(res.data);
        if (res.data.length > 0) setSelectedYear(String(res.data[0].fiscal_year));
        else setSelectedYear('');
      } catch { setYears([]); }
    };
    load();
  }, [selectedCompany]);

  /* ── Charger les journaux ──────────────────────────────────────── */
  useEffect(() => {
    if (!selectedCompany) { setJournals([]); return; }
    const load = async () => {
      try {
        const params = { company_id: selectedCompany };
        if (selectedYear) params.fiscal_year = parseInt(selectedYear);
        const res = await api.get('/entries/browse/journals', { params });
        setJournals(res.data);
      } catch { setJournals([]); }
    };
    load();
  }, [selectedCompany, selectedYear]);

  /* ── Fetch entries ─────────────────────────────────────────────── */
  const fetchEntries = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, page_size: pageSize, sort_by: 'entry_date', sort_desc: false };
      if (selectedCompany) params.company_id = selectedCompany;
      if (selectedYear) params.fiscal_year = parseInt(selectedYear);
      if (selectedJournal) params.journal_code = selectedJournal;
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/entries/browse', { params });
      setEntries(res.data.items);
      setTotal(res.data.total);
      setPage(res.data.page);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des écritures.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedYear, selectedJournal, searchTerm, dateFrom, dateTo, pageSize, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedCompany, selectedYear, selectedJournal, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries(page);
  }, [page, selectedCompany, selectedYear, selectedJournal, dateFrom, dateTo]);

  /* ── Recherche avec debounce ───────────────────────────────────── */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchEntries(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchTerm]);

  /* ── Édition inline ────────────────────────────────────────────── */
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    setSavingId(editingId);
    try {
      const changes = {};
      const original = entries.find((e) => e.id === editingId);
      for (const field of EDITABLE_FIELDS) {
        const newVal = editData[field.key];
        const oldVal = original[field.key];
        if (newVal !== oldVal) {
          if (field.type === 'number') {
            changes[field.key] = parseFloat(newVal) || 0;
          } else {
            changes[field.key] = newVal === '' ? null : newVal;
          }
        }
      }

      if (Object.keys(changes).length === 0) {
        cancelEdit();
        return;
      }

      await api.put(`/entries/browse/${editingId}`, changes);
      setSuccess('Écriture modifiée avec succès');
      setEditingId(null);
      setEditData({});
      fetchEntries(page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification.');
    } finally {
      setSavingId(null);
    }
  };

  /* ── Suppression ───────────────────────────────────────────────── */
  const deleteEntry = async (id) => {
    if (!window.confirm(`Supprimer l'écriture #${id} ?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/entries/browse/${id}`);
      setSuccess('Écriture supprimée');
      fetchEntries(page);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Sélection / Suppression groupée ───────────────────────────── */
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await api.post('/entries/browse/bulk-delete', { ids: [...selectedIds] });
      setSuccess(`${selectedIds.size} écriture(s) supprimée(s)`);
      setSelectedIds(new Set());
      setConfirmBulk(false);
      fetchEntries(page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression groupée.');
    } finally {
      setBulkDeleting(false);
    }
  };

  /* ── Export CSV ─────────────────────────────────────────────────── */
  const exportCsv = () => {
    if (entries.length === 0) return;
    const sep = ';';
    const header = EDITABLE_FIELDS.map((f) => f.label).join(sep);
    const rows = entries.map((e) =>
      EDITABLE_FIELDS.map((f) => {
        const v = e[f.key];
        if (v === null || v === undefined) return '';
        if (typeof v === 'string' && v.includes(sep)) return `"${v}"`;
        return v;
      }).join(sep)
    );
    const bom = '\uFEFF';
    const csv = bom + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecritures_${selectedCompany || 'all'}_${selectedYear || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  const goPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  /* ── Rendu ─────────────────────────────────────────────────────── */
  return (
    <div className="entries-page">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h4 className="fw-bold mb-0">
            <FaBook className="me-2 text-primary" />
            Écritures comptables
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Consultez et modifiez les données brutes reçues via l'API.
            {total > 0 && <> — <strong>{total.toLocaleString('fr-FR')}</strong> écriture{total > 1 ? 's' : ''}</>}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
            onClick={exportCsv}
            disabled={entries.length === 0}
          >
            <FaDownload /> CSV
          </button>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            onClick={() => fetchEntries(page)}
            disabled={loading}
          >
            <FaSync className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible py-2">
          {error}
          <button type="button" className="btn-close btn-sm" onClick={() => setError('')} />
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible py-2">
          <FaCheck className="me-1" /> {success}
          <button type="button" className="btn-close btn-sm" onClick={() => setSuccess('')} />
        </div>
      )}

      {/* Filtres */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaBuilding className="me-1 text-muted" /> Société
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="">Toutes</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_id} — {c.company_name} ({c.entries_count})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" /> Exercice
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">Tous</option>
                {years.map((y) => (
                  <option key={y.fiscal_year} value={String(y.fiscal_year)}>
                    {y.fiscal_year} ({y.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaFilter className="me-1 text-muted" /> Journal
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedJournal}
                onChange={(e) => setSelectedJournal(e.target.value)}
              >
                <option value="">Tous</option>
                {journals.map((j) => (
                  <option key={j.journal_code} value={j.journal_code}>
                    {j.journal_code} — {j.journal_label || '?'} ({j.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" /> Du
              </label>
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaCalendarAlt className="me-1 text-muted" /> Au
              </label>
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">
                <FaSearch className="me-1 text-muted" /> Recherche
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="N° compte, libellé…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Actions groupées */}
          {selectedIds.size > 0 && (
            <div className="mt-2 d-flex align-items-center gap-2">
              <span className="badge bg-primary">{selectedIds.size} sélectionnée(s)</span>
              {!confirmBulk ? (
                <button
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={() => setConfirmBulk(true)}
                >
                  <FaTrashAlt /> Supprimer la sélection
                </button>
              ) : (
                <>
                  <span className="text-danger small fw-bold">
                    <FaExclamationTriangle className="me-1" />
                    Confirmer ?
                  </span>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={bulkDelete}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting ? 'Suppression…' : 'Oui, supprimer'}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setConfirmBulk(false)}
                  >
                    Annuler
                  </button>
                </>
              )}
              <button
                className="btn btn-outline-secondary btn-sm ms-auto"
                onClick={() => { setSelectedIds(new Set()); setConfirmBulk(false); }}
              >
                Désélectionner tout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      {loading && entries.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2">Chargement des écritures…</p>
        </div>
      ) : entries.length === 0 && !loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <FaBook size={48} className="text-muted opacity-25 mb-3" />
            <h5 className="text-muted">Aucune écriture trouvée</h5>
            <p className="text-muted small">
              {total === 0 && !selectedCompany
                ? "Aucune donnée n'a encore été envoyée via l'API entries/push."
                : 'Aucune écriture ne correspond aux filtres actuels.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              <table className="table table-hover table-sm mb-0 align-middle entries-table">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.size === entries.length && entries.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ width: 60 }}>ID</th>
                    {EDITABLE_FIELDS.map((f) => (
                      <th key={f.key} className={f.type === 'number' ? 'text-end' : ''} style={{ width: f.width, minWidth: f.width }}>
                        {f.label}
                      </th>
                    ))}
                    <th style={{ width: 80 }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isEditing = editingId === entry.id;
                    const isSaving = savingId === entry.id;
                    const isDeleting = deletingId === entry.id;

                    return (
                      <tr
                        key={entry.id}
                        className={isEditing ? 'table-warning' : selectedIds.has(entry.id) ? 'table-info' : ''}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            disabled={isEditing}
                          />
                        </td>
                        <td>
                          <small className="text-muted">{entry.id}</small>
                        </td>
                        {EDITABLE_FIELDS.map((f) => (
                          <td key={f.key} className={f.type === 'number' ? 'text-end' : ''}>
                            {isEditing ? (
                              f.type === 'number' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control form-control-sm py-0"
                                  style={{ width: f.width - 10, fontSize: '0.8rem' }}
                                  value={editData[f.key] ?? ''}
                                  onChange={(e) => handleEditChange(f.key, e.target.value)}
                                />
                              ) : f.type === 'date' ? (
                                <input
                                  type="date"
                                  className="form-control form-control-sm py-0"
                                  style={{ width: f.width - 10, fontSize: '0.8rem' }}
                                  value={editData[f.key] || ''}
                                  onChange={(e) => handleEditChange(f.key, e.target.value)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="form-control form-control-sm py-0"
                                  style={{ width: f.width - 10, fontSize: '0.8rem' }}
                                  value={editData[f.key] ?? ''}
                                  onChange={(e) => handleEditChange(f.key, e.target.value)}
                                />
                              )
                            ) : (
                              <span style={{ fontSize: '0.82rem' }}>
                                {f.type === 'number' ? fmt(entry[f.key]) : (entry[f.key] || '')}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="text-center">
                          {isEditing ? (
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-success btn-sm py-0 px-1"
                                onClick={saveEdit}
                                disabled={isSaving}
                                title="Sauvegarder"
                              >
                                {isSaving ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <FaSave size={12} />}
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm py-0 px-1"
                                onClick={cancelEdit}
                                title="Annuler"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-outline-primary btn-sm py-0 px-1"
                                onClick={() => startEdit(entry)}
                                title="Modifier"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm py-0 px-1"
                                onClick={() => deleteEntry(entry.id)}
                                disabled={isDeleting}
                                title="Supprimer"
                              >
                                {isDeleting ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <FaTrash size={12} />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
              <small className="text-muted">
                Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} écriture{total > 1 ? 's' : ''}
              </small>
              <div className="d-flex gap-1">
                <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => goPage(1)} title="Première page">
                  ««
                </button>
                <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  <FaChevronLeft size={10} />
                </button>

                {/* Pages proches */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => goPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}

                <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                  <FaChevronRight size={10} />
                </button>
                <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => goPage(totalPages)} title="Dernière page">
                  »»
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styles */}
      <style>{`
        .entries-table th {
          font-size: 0.78rem;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .entries-table td {
          font-size: 0.82rem;
          padding: 0.25rem 0.4rem;
          white-space: nowrap;
        }
        .entries-table .form-control-sm {
          min-height: 24px;
          height: 24px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
