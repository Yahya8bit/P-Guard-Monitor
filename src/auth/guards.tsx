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

// Calm fallback when a robot id can't be resolved — never a blank page.
export function RobotIntrouvable() {
  return (
    <div className="grid min-h-[40vh] place-items-center p-8 text-center">
      <div>
        <div className="text-lg font-semibold">Robot introuvable</div>
        <p className="mt-1 text-sm text-muted">Le robot demandé n'existe pas ou ne vous est pas accessible.</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Retour →
        </a>
      </div>
    </div>
  );
}

// Gate `/robots/:id/*`. Reject a missing/"undefined"/inaccessible id: recover to
// the user's first accessible robot, else show a calm "Robot introuvable" (never
// a white screen). Existence of an accessible-but-unknown id is handled in the
// dashboard itself.
export function RequireRobotAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { id } = useParams();
  if (!user) return <Navigate to="/login" replace />;

  const valid = !!id && id !== 'undefined' && canAccessRobot(user, id);
  if (valid) return <>{children}</>;

  if (user.role !== 'client') return <Navigate to="/fleet" replace />;
  const rid = user.assignedRobotIds[0];
  if (rid && rid !== 'undefined' && rid !== id) return <Navigate to={`/robots/${rid}/dashboard`} replace />;
  return <RobotIntrouvable />;
}
