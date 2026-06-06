import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRobot } from '../auth/guards';
import { TopBar } from '../components/TopBar';
import { listRobots } from '../services/api';
import { REGION_LABEL, STATE_META, batteryColor } from '../lib/format';
import type { Robot } from '../types/contract';

// Fleet overview (superadmin/admin only — clients are redirected to their robot).
// Cards are filtered by assignment in the component, not just hidden by CSS.
export function Fleet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [robots, setRobots] = useState<Robot[] | null>(null);

  useEffect(() => {
    listRobots().then(setRobots);
  }, []);

  const visible = robots?.filter((r) => user && canAccessRobot(user, r.id)) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Flotte" />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        <p className="mb-5 text-sm text-muted">
          {visible.length} robot{visible.length > 1 ? 's' : ''} accessible
          {visible.length > 1 ? 's' : ''}.
        </p>

        {!robots ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((r) => {
              const meta = STATE_META[r.state];
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/robots/${r.id}/dashboard`)}
                  className="surface-card group p-5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted">{r.id}</div>
                      <div className="mt-0.5 text-lg font-semibold tracking-tight">{r.name}</div>
                    </div>
                    <span className={`text-xs font-medium ${meta.color}`}>● {meta.label}</span>
                  </div>

                  <div className="mt-3 text-sm text-muted">
                    {r.site} · {REGION_LABEL[r.region]}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">Batterie</span>
                      <span className={batteryColor(r.battery)}>{r.battery}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${r.battery}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 truncate text-sm">
                    <span className="text-muted">Mission&nbsp;: </span>
                    {r.currentMission ?? <span className="text-muted">—</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
