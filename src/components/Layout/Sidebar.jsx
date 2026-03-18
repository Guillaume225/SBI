import { NavLink, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaChartBar,
  FaRobot,
  FaCog,
  FaBook,
} from 'react-icons/fa';

const navItems = [
  { section: 'Principal' },
  { path: '/', label: 'Tableau de bord', icon: FaTachometerAlt },
  { path: '/entries', label: 'Écritures', icon: FaBook },
  { path: '/reports', label: 'Reportings', icon: FaChartBar },
  { path: '/assistant', label: 'Assistant IA', icon: FaRobot },

  { section: 'Configuration' },
  { path: '/settings', label: 'Paramètres', icon: FaCog },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h4>SBI</h4>
        <small>Solution de Business Intelligente</small>
      </div>

      <ul className="sidebar-nav">
        {navItems.map((item, index) => {
          if (item.section) {
            return (
              <li key={`section-${index}`} className="nav-section">
                {item.section}
              </li>
            );
          }

          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                end={item.exact}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
