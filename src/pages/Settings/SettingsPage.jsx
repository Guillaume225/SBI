import { useState, lazy, Suspense } from 'react';
import {
  FaCog,
  FaPlug,
  FaServer,
  FaBrain,
  FaClipboardList,
  FaCalendarAlt,
  FaUsers,
  FaKey,
  FaBuilding,
} from 'react-icons/fa';

/* ─── Lazy-load des sous-pages ────────────────────────────────────── */
const AgentsSettingsPage    = lazy(() => import('./AgentsSettingsPage'));
const ProjectDbPage         = lazy(() => import('./ProjectDbPage'));
const AiSettingsPage        = lazy(() => import('./AiSettingsPage'));
const SocietesPage          = lazy(() => import('./SocietesPage'));
const RanConfigPage         = lazy(() => import('./RanConfigPage'));
const BatchSettingsPage     = lazy(() => import('./BatchSettingsPage'));
const ApiKeysSettingsPage   = lazy(() => import('./ApiKeysSettingsPage'));
const UsersPage             = lazy(() => import('../Users/UsersPage'));

/* ─── Définition des onglets ──────────────────────────────────────── */
const TABS = [
  { id: 'agents',     label: 'Agents connectés',  icon: FaPlug,          component: AgentsSettingsPage },
  { id: 'project-db', label: 'Base de données',    icon: FaServer,        component: ProjectDbPage },
  { id: 'ai',         label: 'Configuration IA',   icon: FaBrain,         component: AiSettingsPage },
  { id: 'societes',   label: 'Sociétés',           icon: FaBuilding,      component: SocietesPage },
  { id: 'ran-config', label: 'Journaux RAN',       icon: FaClipboardList, component: RanConfigPage },
  { id: 'batch',      label: 'Planification',      icon: FaCalendarAlt,   component: BatchSettingsPage },
  { id: 'api-keys',   label: 'Clés API',           icon: FaKey,           component: ApiKeysSettingsPage },
  { id: 'users',      label: 'Utilisateurs',       icon: FaUsers,         component: UsersPage },
];

/* ─── Spinner ─────────────────────────────────────────────────────── */
function TabLoader() {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" />
      <p className="text-muted mt-2 small">Chargement…</p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const current = TABS.find(t => t.id === activeTab);
  const Component = current?.component;

  return (
    <div>
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="mb-3">
        <h4 className="fw-bold mb-1">
          <FaCog className="me-2 text-primary" />
          Paramètres
        </h4>
        <p className="text-muted mb-0 small">
          Configuration générale de la plateforme SBI
        </p>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────── */}
      <ul className="nav nav-tabs mb-3" style={{ flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="nav-item">
              <button
                className={`nav-link d-flex align-items-center gap-1 ${
                  activeTab === tab.id ? 'active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
                style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Contenu de l'onglet actif ────────────────────────────── */}
      <Suspense fallback={<TabLoader />}>
        {Component && <Component />}
      </Suspense>
    </div>
  );
}
