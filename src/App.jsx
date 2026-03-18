import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ReportsPage from './pages/Reports/ReportsPage';
const ReportDetailPage = lazy(() => import('./pages/Reports/ReportDetailPage'));
import ReportConfigPage from './pages/Reports/ReportConfigPage';
import AssistantPage from './pages/Assistant/AssistantPage';
import DatabasePage from './pages/Database/DatabasePage';
import SettingsPage from './pages/Settings/SettingsPage';
import EntriesPage from './pages/Entries/EntriesPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/entries" element={<EntriesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/config" element={<ReportConfigPage />} />
                <Route path="/reports/:reportId" element={<Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-primary" /></div>}><ReportDetailPage /></Suspense>} />
                <Route path="/assistant" element={<AssistantPage />} />
                <Route path="/database" element={<DatabasePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
