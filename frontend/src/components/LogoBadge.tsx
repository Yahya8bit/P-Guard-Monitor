// Shared brand mark — logo-clean.png placed DIRECTLY: no background, box, border,
// radius or light glow on the logo or any wrapper (the file has a white inner
// disc, so the gear reads on dark without backing). Over the login photo a faint
// DARK drop-shadow is added for legibility (nothing light behind it).
export function LogoBadge({ sizeClass, mode }: { sizeClass: string; mode: 'always' | 'auto' }) {
  return (
    <img
      src="/logo-clean.png"
      alt=""
      className={`${sizeClass} object-contain ${
        mode === 'always' ? '[filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.55))]' : ''
      }`}
    />
  );
}
