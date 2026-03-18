import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaLock, FaUser } from 'react-icons/fa';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Erreur de connexion. Vérifiez vos identifiants.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="text-center mb-4">
          <h2 className="fw-bold" style={{ color: '#062A5A' }}>SBI</h2>
          <p className="text-muted">Solution de Business Intelligente</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-medium">Nom d'utilisateur</label>
            <div className="input-group">
              <span className="input-group-text">
                <FaUser className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Entrez votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-medium">Mot de passe</label>
            <div className="input-group">
              <span className="input-group-text">
                <FaLock className="text-muted" />
              </span>
              <input
                type="password"
                className="form-control"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 py-2 text-white"
            style={{ backgroundColor: '#EA761D', borderColor: '#E87017' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <small className="text-muted">
            Identifiants par défaut : admin / admin
          </small>
        </div>
      </div>
    </div>
  );
}
