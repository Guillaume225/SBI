import { useState } from 'react';
import { FaBrain } from 'react-icons/fa';

export default function AiSettingsPage() {
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FaBrain className="me-2 text-primary" />
        Configuration IA
      </h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Fournisseur d'intelligence artificielle</h6>
          <form>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-medium">Fournisseur</label>
                <select
                  className="form-select"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  <option value="openai">OpenAI</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="ollama">Ollama (local)</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Modèle</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: gpt-4, claude-3, etc."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label small fw-medium">Clé API</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Votre clé API"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="col-12">
                <button type="button" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
