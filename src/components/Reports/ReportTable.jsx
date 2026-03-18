/**
 * Composant générique pour afficher les données d'un reporting sous forme de tableau
 */

import { useState } from 'react';
import { FaDownload, FaFilter, FaSearch } from 'react-icons/fa';

export default function ReportTable({ title, columns = [], rows = [], totals = null, loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = rows.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatNumber = (val) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    }
    return val;
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 fw-semibold">{title}</h5>
        <div className="d-flex gap-2">
          <div className="input-group input-group-sm" style={{ width: 250 }}>
            <span className="input-group-text">
              <FaSearch className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            <FaDownload /> Exporter
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2">Chargement des données...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>Aucune donnée disponible</p>
            <small>Les données seront disponibles après synchronisation avec un agent ou import manuel.</small>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sbi table-hover mb-0">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className={typeof col === 'object' ? col.className : ''}>
                      {typeof col === 'object' ? col.label : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col, j) => {
                      const key = typeof col === 'object' ? col.key : col;
                      return (
                        <td key={j} className={typeof col === 'object' ? col.className : ''}>
                          {formatNumber(row[key])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="fw-bold bg-light">
                    <td>TOTAL</td>
                    {columns.slice(1).map((col, j) => {
                      const key = typeof col === 'object' ? col.key : col;
                      return <td key={j}>{formatNumber(totals[key] || '')}</td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
