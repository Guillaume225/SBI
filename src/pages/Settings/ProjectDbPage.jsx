import { FaServer } from 'react-icons/fa';

export default function ProjectDbPage() {
  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FaServer className="me-2 text-primary" />
        Base de données projet
      </h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Connexion SQL Server</h6>
          <form>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-medium">Serveur</label>
                <input type="text" className="form-control" defaultValue="localhost" />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Base de données</label>
                <input type="text" className="form-control" defaultValue="SBI" />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Utilisateur</label>
                <input type="text" className="form-control" defaultValue="sa" />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Mot de passe</label>
                <input type="password" className="form-control" />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" defaultChecked id="trustedConn" />
                  <label className="form-check-label small" htmlFor="trustedConn">
                    Connexion Windows (Trusted Connection)
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="button" className="btn btn-primary">
                  Tester la connexion
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
