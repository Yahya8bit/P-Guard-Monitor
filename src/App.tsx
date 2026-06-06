import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { landingPath, RequireAuth, RequireRobotAccess, RequireRole } from './auth/guards';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Fleet } from './pages/Fleet';
import { Login } from './pages/Login';
import { Placeholder } from './pages/Placeholder';
import { Statistiques } from './pages/Statistiques';

// Send "/" to the right place: the user's landing page if logged in, else login.
function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? landingPath(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Fleet — superadmin + admin only (clients are redirected away). */}
      <Route
        path="/fleet"
        element={
          <RequireRole roles={['superadmin', 'admin']}>
            <Fleet />
          </RequireRole>
        }
      />

      {/* Robot detail — id must be assigned (superadmin bypasses). Shared shell. */}
      <Route
        path="/robots/:id"
        element={
          <RequireAuth>
            <RequireRobotAccess>
              <AppShell />
            </RequireRobotAccess>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="statistiques" element={<Statistiques />} />
        <Route path="alertes" element={<Placeholder title="Alertes" />} />
        <Route path="rapports" element={<Placeholder title="Rapports" />} />
        <Route path="parametres" element={<Placeholder title="Paramètres" />} />
      </Route>

      {/* Gestion — superadmin + admin only. */}
      <Route
        path="/gestion"
        element={
          <RequireRole roles={['superadmin', 'admin']}>
            <AppShell />
          </RequireRole>
        }
      >
        <Route index element={<Placeholder title="Gestion" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
