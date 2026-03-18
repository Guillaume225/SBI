import { useState, useEffect } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import api from '../../services/api';

export default function BatchSettingsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.get('/batch');
        setJobs(response.data.jobs || []);
      } catch (err) {
        console.error('Erreur chargement batch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FaCalendarAlt className="me-2 text-primary" />
        Planification des tâches
      </h4>

      <div className="card border-0 shadow-sm">
        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <FaCalendarAlt size={48} className="mb-3 opacity-25" />
            <h5>Aucune tâche planifiée</h5>
            <p className="small">
              Configurez des tâches de rafraîchissement automatique pour maintenir
              vos données à jour.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sbi mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Déclencheur</th>
                  <th>Prochaine exécution</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="small">{job.id}</td>
                    <td>{job.name}</td>
                    <td className="small">{job.trigger}</td>
                    <td className="small">{job.next_run || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
