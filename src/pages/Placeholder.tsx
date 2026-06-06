// Routed placeholder for sections we refine later (Statistiques, Alertes,
// Rapports, Gestion, Paramètres). Real routing + guards, no content yet.
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="surface-card grid place-items-center p-12 text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-card border border-border text-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">À venir — section en cours de conception.</p>
      </div>
    </div>
  );
}
