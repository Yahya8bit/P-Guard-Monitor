/* eslint-disable react-refresh/only-export-components -- guards + their helpers live together by design */
import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import type { Role, User } from '../types/contract';
import { useAuth } from './AuthContext';

// Where a logged-in user belongs by default. Clients have no fleet view, so
// they land straight on their single robot's dashboard (CLAUDE.md).
export function landingPath(user: User): string {
  if (user.role === 'client') {
    return `/robots/${user.assignedRobotIds[0]}/dashboard`;
  }
  return '/fleet';
}

// Robot access rule, reused by both routing guards and components (the sidebar,
// fleet cards) so visibility is never CSS-only.
export function canAccessRobot(user: User, robotId: string): boolean {
  return user.role === 'superadmin' || user.assignedRobotIds.includes(robotId);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Gate by role. superadmin + admin pass `/fleet` and `/gestion`; anyone else is
// bounced to their own landing page (clients never reach these).
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={landingPath(user)} replace />;
  return <>{children}</>;
}

// Gate `/robots/:id/*` — the id must be assigned to the user (superadmin bypass).
export function RequireRobotAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { id } = useParams();
  if (!user) return <Navigate to="/login" replace />;
  if (!id || !canAccessRobot(user, id)) return <Navigate to={landingPath(user)} replace />;
  return <>{children}</>;
}
