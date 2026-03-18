import { useState, useEffect, useCallback } from 'react';
import {
  FaBuilding,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaCheck,
} from 'react-icons/fa';
import api from '../../services/api';
import { useCompany } from '../../contexts/CompanyContext';

const emptyForm = {
  code: '',
  name: '',
  siret: '',
  address: '',
  fiscal_year_start: '',
  currency: 'EUR',
};

export default function SocietesPage() {
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulaire d'ajout
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Édition inline
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Accès au contexte pour rafraîchir la liste déroulante du header
  const { fetchCompanies } = useCompany();

  const fetchSocietes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/societes/');
      setSocietes(res.data);
    } catch {
      setError('Impossible de charger les sociétés.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocietes();
  }, [fetchSocietes]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // ── Ajouter ───────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    clearMessages();
    setSaving(true);
    try {
      await api.post('/societes/', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        siret: form.siret.trim() || null,
        address: form.address.trim() || null,
        fiscal_year_start: form.fiscal_year_start || null,
        currency: form.currency || 'EUR',
      });
      setSuccess(`Société "${form.code.toUpperCase()}" créée.`);
      setForm({ ...emptyForm });
      setShowForm(false);
      fetchSocietes();
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  // ── Supprimer ─────────────────────────────────────────────
  const handleDelete = async (s) => {
    if (!confirm(`Supprimer la société "${s.code} — ${s.name}" ?`)) return;
    clearMessages();
    try {
      await api.delete(`/societes/${s.id}`);
      setSuccess(`Société "${s.code}" supprimée.`);
      fetchSocietes();
      fetchCompanies();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  // ── Activer / Désactiver ──────────────────────────────────
  const handleToggle = async (s) => {
    clearMessages();
    try {
      await api.put(`/societes/${s.id}`, { is_active: !s.is_active });
      fetchSocietes();
      fetchCompanies();
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  };

  // ── Édition inline ────────────────────────────────────────
  const startEdit = (s) => {
    setEditId(s.id);
    setEditForm({
      name: s.name || '',
      siret: s.siret || '',
      address: s.address || '',
      fiscal_year_start: s.fiscal_year_start || '',
      currency: s.currency || 'EUR',
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveEdit = async (s) => {
    clearMessages();
    try {
      await api.put(`/societes/${s.id}`, {
        name: editForm.name.trim() || s.name,
        siret: editForm.siret.trim() || null,
        address: editForm.address.trim() || null,
        fiscal_year_start: editForm.fiscal_year_start || null,
        currency: editForm.currency || 'EUR',
      });
      setSuccess(`Société "${s.code}" mise à jour.`);
      setEditId(null);
      fetchSocietes();
      fetchCompanies();
    } catch {
      setError('Erreur lors de la sauvegarde.');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <FaBuilding className="me-2 text-primary" />
          Sociétés
        </h4>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setShowForm(!showForm);
            clearMessages();
          }}
        >
          <FaPlus className="me-1" />
          Ajouter une société
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

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3">Nouvelle société</h6>
            <form onSubmit={handleAdd}>
              <div className="row g-3">
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Code *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="SOC1"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    maxLength={50}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Raison sociale *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Ma Société SAS"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-bold">SIRET</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="123 456 789 00012"
                    value={form.siret}
                    onChange={(e) => setForm({ ...form, siret: e.target.value })}
                    maxLength={14}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-bold">Devise</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="MAD">MAD</option>
                    <option value="XOF">XOF</option>
                    <option value="XAF">XAF</option>
                  </select>
                </div>
              </div>
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Adresse</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="12 rue de Paris, 75001 Paris"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={500}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-bold">Début exercice</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="01-01"
                    value={form.fiscal_year_start}
                    onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })}
                    maxLength={5}
                  />
                  <div className="form-text" style={{ fontSize: '0.7rem' }}>
                    Format MM-JJ (ex: 01-01)
                  </div>
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
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-muted small mb-3">
        Gérez les sociétés rattachées à votre espace SBI. Chaque société peut avoir ses propres
        journaux RAN, écritures comptables et configurations spécifiques.
      </p>

      {/* Tableau */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">Chargement…</div>
          ) : societes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaBuilding size={40} className="mb-3 opacity-25" />
              <p>Aucune société configurée.</p>
              <p className="small">
                Cliquez sur « Ajouter une société » pour commencer.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '100px' }}>Code</th>
                    <th>Raison sociale</th>
                    <th style={{ width: '140px' }}>SIRET</th>
                    <th>Adresse</th>
                    <th style={{ width: '80px' }}>Devise</th>
                    <th style={{ width: '90px' }} className="text-center">
                      Statut
                    </th>
                    <th style={{ width: '130px' }} className="text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {societes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code className="fw-bold">{s.code}</code>
                      </td>
                      <td>
                        {editId === s.id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                          />
                        ) : (
                          s.name
                        )}
                      </td>
                      <td>
                        {editId === s.id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.siret}
                            onChange={(e) =>
                              setEditForm({ ...editForm, siret: e.target.value })
                            }
                          />
                        ) : (
                          s.siret || <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {editId === s.id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm({ ...editForm, address: e.target.value })
                            }
                          />
                        ) : (
                          s.address || <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {editId === s.id ? (
                          <select
                            className="form-select form-select-sm"
                            value={editForm.currency}
                            onChange={(e) =>
                              setEditForm({ ...editForm, currency: e.target.value })
                            }
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                            <option value="CHF">CHF</option>
                            <option value="MAD">MAD</option>
                            <option value="XOF">XOF</option>
                            <option value="XAF">XAF</option>
                          </select>
                        ) : (
                          <span className="badge bg-light text-dark border">{s.currency}</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          className={`btn btn-sm ${s.is_active ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleToggle(s)}
                          title={
                            s.is_active
                              ? 'Active — cliquer pour désactiver'
                              : 'Inactive — cliquer pour activer'
                          }
                          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                        >
                          {s.is_active ? (
                            <>
                              <FaCheck className="me-1" />
                              Active
                            </>
                          ) : (
                            'Inactive'
                          )}
                        </button>
                      </td>
                      <td className="text-center">
                        {editId === s.id ? (
                          <div className="d-flex gap-1 justify-content-center">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => saveEdit(s)}
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
                              onClick={() => startEdit(s)}
                              title="Modifier"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(s)}
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
