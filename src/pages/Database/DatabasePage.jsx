import { useState } from 'react';
import { FaDatabase, FaSearch, FaTable } from 'react-icons/fa';

export default function DatabasePage() {
  const [tables] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <FaDatabase className="me-2 text-primary" />
            Explorateur de données
          </h4>
          <p className="text-muted mb-0 small">
            Naviguez dans les données synchronisées
          </p>
        </div>
      </div>

      <div className="row">
        {/* Liste des tables */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher une table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body p-0">
              {tables.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <FaTable size={24} className="mb-2 opacity-25" />
                  <p className="mb-0">Aucune table disponible</p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {tables
                    .filter((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((table) => (
                      <li
                        key={table}
                        className="list-group-item list-group-item-action small"
                        style={{ cursor: 'pointer' }}
                      >
                        <FaTable className="me-2 text-muted" />
                        {table}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Contenu de la table */}
        <div className="col-md-9">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5 text-muted">
              <FaDatabase size={48} className="mb-3 opacity-25" />
              <h5>Sélectionnez une table</h5>
              <p className="small">
                Les données seront disponibles après synchronisation avec un agent ou import manuel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
