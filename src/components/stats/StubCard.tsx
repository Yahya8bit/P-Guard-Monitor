// Honest placeholder for sections whose data isn't derivable yet — labelled
// clearly so it reads as "à venir", never fabricated values.
export function StubCard({ title, message }: { title: string; message: string }) {
  return (
    <section className="surface-card p-card">
      <h3 className="text-[18px] font-medium">{title}</h3>
      <div className="mt-4 grid place-items-center rounded-btn border border-dashed border-border py-10 text-center">
        <span className="text-sm text-muted">{message}</span>
      </div>
    </section>
  );
}
