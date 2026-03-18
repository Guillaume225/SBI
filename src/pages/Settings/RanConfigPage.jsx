import { useState, useEffect, useCallback } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaCheck, FaBuilding } from 'react-icons/fa';
import api from '../../services/api';

export default function RanConfigPage() {
  const [journaux, setJournaux] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtre par société
  const [filterCompany, setFilterCompany] = useState('');

  // Formulaire d'ajout
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_id: '', journal_code: '', journal_label: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Édition inline
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchSocietes = useCallback(async () => {
    try {
      const res = await api.get('/societes/');
      setSocietes(res.data);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchJournaux = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterCompany ? `?company_id=${filterCompany}` : '';
      const res = await api.get(`/ran-config/${params}`);
      setJournaux(res.data);
    } catch {
      setError('Impossible de charger les journaux RAN.');
    } finally {
      setLoading(false);
    }
  }, [filterCompany]);

  useEffect(() => {
    fetchSocietes();
  }, [fetchSocietes]);

  useEffect(() => {
    fetchJournaux();
  }, [fetchJournaux]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ── Ajouter ───────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.journal_code.trim() || !form.company_id) return;
    clearMessages();
    setSaving(true);
    try {
      await api.post('/ran-config/', {
        company_id: form.company_id,
        journal_code: form.journal_code.trim().toUpperCase(),
        journal_label: form.journal_label.trim() || null,
        description: form.description.trim() || null,
        is_active: true,
      });
      const socName = societes.find(s => s.code === form.company_id)?.name || form.company_id;
      setSuccess(`Journal "${form.journal_code.toUpperCase()}" ajouté pour ${socName}.`);
      setForm({ company_id: form.company_id, journal_code: '', journal_label: '', description: '' });
      setShowForm(false);
      fetchJournaux();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'ajout.');
    } finally {
      setSaving(false);
    }
  };

  // ── Supprimer ─────────────────────────────────────────────
  const handleDelete = async (j) => {
    if (!confirm(`Supprimer le journal "${j.journal_code}" (${j.company_id}) ?`)) return;
    clearMessages();
    try {
      await api.delete(`/ran-config/${j.id}`);
      setSuccess(`Journal "${j.journal_code}" supprimé.`);
      fetchJournaux();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  // ── Activer / Désactiver ──────────────────────────────────
  const handleToggle = async (j) => {
    clearMessages();
    try {
      await api.put(`/ran-config/${j.id}`, { is_active: !j.is_active });
      fetchJournaux();
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  };

  // ── Édition inline ────────────────────────────────────────
  const startEdit = (j) => {
    setEditId(j.id);
    setEditForm({ journal_label: j.journal_label || '', description: j.description || '' });
  };

  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async (j) => {
    clearMessages();
    try {
      await api.put(`/ran-config/${j.id}`, {
        journal_label: editForm.journal_label.trim() || null,
        description: editForm.description.trim() || null,
      });
      setSuccess(`Journal "${j.journal_code}" mis à jour.`);
      setEditId(null);
      fetchJournaux();
    } catch {
      setError('Erreur lors de la sauvegarde.');
    }
  };

  // Noms de sociétés pour affichage
  const getCompanyName = (code) => {
    const soc = societes.find(s => s.code === code);
    return soc ? `${soc.code} — ${soc.name}` : code;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <FaClipboardList className="me-2 text-primary" />
          Journaux RAN
        </h4>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(!showForm); clearMessages(); }}
        >
          <FaPlus className="me-1" />
          Ajouter un journal
        </button>
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
          {success}
          <button type="button" className="btn-close btn-sm" onClick={() => setSuccess('')} />
        </div>
      )}

      {/* Filtre par société */}
      <div className="mb-3 d-flex align-items-center gap-2">
        <FaBuilding className="text-muted" />
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 300 }}
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
        >
          <option value="">Toutes les sociétés</option>
          {societes.filter(s => s.is_active).map(s => (
            <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
          ))}
        </select>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3">Nouveau journal RAN</h6>
            {societes.length === 0 ? (
              <div className="alert alert-warning py-2 mb-0">
                Aucune société configurée. Créez d'abord une société dans
                <strong> Paramètres → Base de données</strong>.
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small fw-bold">Société *</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.company_id}
                      onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                      required
                    >
                      <option value="">Sélectionner…</option>
                      {societes.filter(s => s.is_active).map(s => (
                        <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-bold">Code journal *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="AN, OUV…"
                      value={form.journal_code}
                      onChange={(e) => setForm({ ...form, journal_code: e.target.value })}
                      maxLength={20}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold">Libellé</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Report à nouveau"
                      value={form.journal_label}
                      onChange={(e) => setForm({ ...form, journal_label: e.target.value })}
                      maxLength={200}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Description</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Journal d'ouverture d'exercice"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      maxLength={500}
                    />
                  </div>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowForm(false)}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-muted small mb-3">
        Les journaux RAN (Report à Nouveau) identifient les écritures d'ouverture d'exercice
        pour chaque société. Ils sont utilisés pour distinguer les soldes d'ouverture des
        mouvements de la période lors du calcul de la balance générale.
      </p>

      {/* Tableau */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">Chargement…</div>
          ) : journaux.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaClipboardList size={40} className="mb-3 opacity-25" />
              <p>Aucun journal RAN configuré{filterCompany ? ` pour ${getCompanyName(filterCompany)}` : ''}.</p>
              <p className="small">
                Cliquez sur « Ajouter un journal » pour commencer.
                <br />
                Codes courants : <strong>AN</strong> (À-nouveau),{' '}
                <strong>OUV</strong> (Ouverture), <strong>RAN</strong> (Report).
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '180px' }}>Société</th>
                    <th style={{ width: '100px' }}>Code</th>
                    <th>Libellé</th>
                    <th>Description</th>
                    <th style={{ width: '90px' }} className="text-center">Statut</th>
                    <th style={{ width: '130px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {journaux.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <FaBuilding className="me-1 text-muted" />
                          {j.company_id}
                        </span>
                      </td>
                      <td>
                        <code className="fw-bold">{j.journal_code}</code>
                      </td>
                      <td>
                        {editId === j.id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.journal_label}
                            onChange={(e) =>
                              setEditForm({ ...editForm, journal_label: e.target.value })
                            }
                          />
                        ) : (
                          j.journal_label || <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {editId === j.id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                          />
                        ) : (
                          j.description || <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          className={`btn btn-sm ${j.is_active ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleToggle(j)}
                          title={j.is_active ? 'Actif — cliquer pour désactiver' : 'Inactif — cliquer pour activer'}
                          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                        >
                          {j.is_active ? (
                            <><FaCheck className="me-1" />Actif</>
                          ) : (
                            'Inactif'
                          )}
                        </button>
                      </td>
                      <td className="text-center">
                        {editId === j.id ? (
                          <div className="d-flex gap-1 justify-content-center">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => saveEdit(j)}
                              title="Sauvegarder"
                            >
                              <FaSave />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={cancelEdit}
                              title="Annuler"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex gap-1 justify-content-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => startEdit(j)}
                              title="Modifier"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(j)}
                              title="Supprimer"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
