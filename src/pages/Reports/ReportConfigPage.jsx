import { FaCog } from 'react-icons/fa';

export default function ReportConfigPage() {
  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FaCog className="me-2 text-primary" />
        Configuration des Reportings
      </h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5 text-muted">
          <FaCog size={48} className="mb-3 opacity-25" />
          <h5>Configuration des reportings</h5>
          <p className="small">
            Personnalisez les colonnes, filtres et mises en forme de vos reportings financiers.
          </p>
        </div>
      </div>
    </div>
  );
}
