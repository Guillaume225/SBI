import { useState, useEffect } from 'react';
import syncService from '../../services/syncService';
import api from '../../services/api';
import {
  FaPlug,
  FaCircle,
  FaSyncAlt,
  FaDownload,
  FaDesktop,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
} from 'react-icons/fa';

/* ─── Formater une taille de fichier ──────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function AgentsSettingsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await syncService.getAgents();
        setAgents(response.data);
      } catch (err) {
        console.error('Erreur chargement agents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  /* ── Charger les infos du fichier d'installation ───────────────── */
  useEffect(() => {
    api.get('/agent/download/info')
      .then((r) => setDownloadInfo(r.data))
      .catch(() => setDownloadInfo({ available: false }));
  }, []);

  /* ── Télécharger l'agent ───────────────────────────────────────── */
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await api.get('/agent/download', { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AgentDesktopSBI.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement agent:', err);
      alert('Erreur lors du téléchargement de l\'agent.');
    } finally {
      setDownloading(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      online: { class: 'success', label: 'En ligne' },
      syncing: { class: 'info', label: 'Synchronisation' },
      error: { class: 'danger', label: 'Erreur' },
      offline: { class: 'secondary', label: 'Hors ligne' },
    };
    const s = map[status] || map.offline;
    return <span className={`badge bg-${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <FaPlug className="me-2 text-primary" />
            Agents connectés
          </h4>
          <p className="text-muted mb-0 small">
            Agents desktop synchronisant les données depuis vos sources
          </p>
        </div>
      </div>

      {/* ── Carte d'installation de l'agent ──────────────────────── */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #062A5A' }}>
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 56, height: 56, background: '#edf2f7' }}
              >
                <FaDesktop size={28} style={{ color: '#062A5A' }} />
              </div>
            </div>
            <div className="col">
              <h5 className="fw-bold mb-1" style={{ color: '#062A5A' }}>
                Agent Desktop SBI
              </h5>
              <p className="text-muted small mb-2">
                Installez l'agent desktop sur vos postes ou serveurs pour synchroniser
                automatiquement les données comptables depuis vos sources (Sage, ERP, etc.).
              </p>
              <div className="d-flex align-items-center gap-3 small">
                {downloadInfo?.available ? (
                  <>
                    <span className="text-success">
                      <FaCheckCircle className="me-1" />
                      Disponible
                    </span>
                    <span className="text-muted">
                      Taille : {fmtSize(downloadInfo.size)}
                    </span>
                    {downloadInfo.last_modified && (
                      <span className="text-muted">
                        Mis à jour le : {new Date(downloadInfo.last_modified).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </>
                ) : downloadInfo && !downloadInfo.available ? (
                  <span className="text-danger">
                    <FaTimesCircle className="me-1" />
                    Fichier d'installation non disponible sur le serveur
                  </span>
                ) : (
                  <span className="text-muted">
                    <FaInfoCircle className="me-1" />
                    Vérification…
                  </span>
                )}
              </div>
            </div>
            <div className="col-auto">
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={!downloadInfo?.available || downloading}
              >
                {downloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Téléchargement…
                  </>
                ) : (
                  <>
                    <FaDownload className="me-2" />
                    Télécharger l'agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instructions rapides */}
          <div className="mt-3 pt-3 border-top">
            <h6 className="fw-bold small mb-2">
              <FaInfoCircle className="me-1 text-primary" />
              Instructions d'installation
            </h6>
            <ol className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.8 }}>
              <li>Téléchargez le fichier <strong>AgentDesktopSBI.zip</strong></li>
              <li>Décompressez l'archive sur le poste cible</li>
              <li>Lancez <strong>AgentDesktopSBI.exe</strong></li>
              <li>Configurez la clé API et l'URL du serveur dans l'interface de l'agent</li>
              <li>L'agent apparaîtra automatiquement dans la liste ci-dessous une fois connecté</li>
            </ol>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : agents.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <FaPlug size={48} className="mb-3 opacity-25" />
            <h5>Aucun agent connecté</h5>
            <p className="small">
              Installez un Agent Desktop sur vos serveurs pour synchroniser automatiquement
              les données depuis Sage, ERP ou autres sources.
            </p>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-sbi mb-0">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Source</th>
                  <th>Hôte</th>
                  <th>Statut</th>
                  <th>Dernière synchro.</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.agent_id}>
                    <td className="fw-medium">{agent.agent_name}</td>
                    <td>
                      <span className="badge bg-light text-dark">{agent.source_type}</span>
                      <span className="ms-1 small text-muted">{agent.source_name}</span>
                    </td>
                    <td className="small">{agent.hostname}</td>
                    <td>{statusBadge(agent.status)}</td>
                    <td className="small text-muted">
                      {agent.last_sync || '—'}
                    </td>
                    <td className="small">{agent.version || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
