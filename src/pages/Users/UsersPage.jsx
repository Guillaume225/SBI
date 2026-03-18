import { useState } from 'react';
import { FaUsers, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function UsersPage() {
  const [users] = useState([
    {
      id: '1',
      username: 'admin',
      email: 'admin@sbi.local',
      full_name: 'Administrateur',
      role: 'admin',
      is_active: true,
    },
  ]);

  const roleBadge = (role) => {
    const map = {
      admin: 'danger',
      editor: 'warning',
      viewer: 'info',
    };
    return <span className={`badge bg-${map[role] || 'secondary'}`}>{role}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <FaUsers className="me-2 text-primary" />
            Gestion des utilisateurs
          </h4>
          <p className="text-muted mb-0 small">
            Gérez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2">
          <FaPlus /> Nouvel utilisateur
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-sbi mb-0">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="fw-medium">{u.full_name}</td>
                  <td className="small">{u.username}</td>
                  <td className="small">{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>
                    <span className={`badge bg-${u.is_active ? 'success' : 'secondary'}`}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" title="Modifier">
                      <FaEdit />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" title="Supprimer">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
