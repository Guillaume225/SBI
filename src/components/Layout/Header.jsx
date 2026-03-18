import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import CompanySelector from '../Company/CompanySelector';
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa';

export default function Header() {
  const { user, logout } = useAuth();
  const { selectedCompany } = useCompany();

  return (
    <header className="main-header">
      <div className="d-flex align-items-center gap-3">
        <CompanySelector />
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2 text-muted">
          <FaUserCircle size={20} />
          <span className="small fw-medium">{user?.full_name || user?.username}</span>
          <span className="badge" style={{ backgroundColor: '#EA761D20', color: '#E87017' }}>{user?.role}</span>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
          onClick={logout}
          title="Déconnexion"
        >
          <FaSignOutAlt />
          <span className="d-none d-md-inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
