import { useState, useEffect } from 'react';
import { FaKey, FaCopy, FaTrash, FaPlus, FaCheck } from 'react-icons/fa';
import api from '../../services/api';

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchKeys = async () => {
    try {
      const response = await api.get('/api-keys/list');
      setKeys(response.data);
    } catch (err) {
      console.error('Erreur chargement clés API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!tenantId.trim()) {
      setError('Le Tenant ID est obligatoire.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const response = await api.post('/api-keys/generate', {
        tenant_id: tenantId.trim(),
        tenant_name: tenantName.trim(),
      });
      setNewKey(response.data.api_key);
      setTenantId('');
      setTenantName('');
      fetchKeys();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (apiKeyFull) => {
    if (!window.confirm('Révoquer cette clé API ? Les agents qui l\'utilisent ne pourront plus se connecter.')) {
      return;
    }
    try {
      await api.post('/api-keys/revoke', { api_key: apiKeyFull });
      fetchKeys();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la révocation.');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FaKey className="me-2" style={{ color: '#EA761D' }} />
        Clés API — Tenants
      </h4>

      {/* Formulaire de génération */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">
            <FaPlus className="me-2" />
            Générer une nouvelle clé API
          </h6>
          <p className="text-muted small mb-3">
            Chaque clé API est liée à un tenant. L'agent desktop utilise cette clé
            pour s'authentifier et toutes les données remontées seront automatiquement
            associées au tenant correspondant.
          </p>

          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}

          <form onSubmit={handleGenerate}>
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label small fw-medium">Tenant ID *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: client-abc, default"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-medium">Nom du tenant</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: Cabinet ABC Comptabilité"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <button
                  type="submit"
                  className="btn w-100"
                  style={{ backgroundColor: '#EA761D', color: '#fff' }}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <FaKey className="me-2" />
                      Générer la clé
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Affichage de la clé générée */}
          {newKey && (
            <div className="alert alert-success mt-3">
              <h6 className="alert-heading fw-semibold">
                <FaCheck className="me-2" />
                Clé API générée avec succès
              </h6>
              <p className="small mb-2">
                Copiez cette clé maintenant. Elle ne sera plus affichée en clair par la suite.
              </p>
              <div className="d-flex align-items-center gap-2">
                <code
                  className="flex-grow-1 p-2 rounded"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    fontSize: '0.85rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {newKey}
                </code>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => handleCopy(newKey)}
                  title="Copier"
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              <hr />
              <p className="small mb-0 text-muted">
                <strong>Usage dans l'agent desktop :</strong> Ajoutez le header{' '}
                <code>X-API-Key: {newKey.substring(0, 12)}...</code> à toutes les requêtes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Liste des clés existantes */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Clés API existantes</h6>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FaKey size={32} className="mb-2 opacity-50" />
              <p className="mb-0">Aucune clé API. Générez-en une ci-dessus.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Clé API</th>
                    <th className="small fw-semibold">Tenant ID</th>
                    <th className="small fw-semibold">Nom</th>
                    <th className="small fw-semibold">Créée le</th>
                    <th className="small fw-semibold">Statut</th>
                    <th className="small fw-semibold text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, i) => (
                    <tr key={i}>
                      <td>
                        <code className="small">{k.api_key}</code>
                        <button
                          className="btn btn-link btn-sm p-0 ms-2"
                          onClick={() => handleCopy(k.api_key_full)}
                          title="Copier la clé complète"
                        >
                          <FaCopy size={12} />
                        </button>
                      </td>
                      <td className="small fw-medium">{k.tenant_id}</td>
                      <td className="small text-muted">{k.tenant_name || '—'}</td>
                      <td className="small text-muted">
                        {new Date(k.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        {k.active ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Révoquée</span>
                        )}
                      </td>
                      <td className="text-end">
                        {k.active && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRevoke(k.api_key_full)}
                            title="Révoquer cette clé"
                          >
                            <FaTrash size={12} className="me-1" />
                            Révoquer
                          </button>
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
