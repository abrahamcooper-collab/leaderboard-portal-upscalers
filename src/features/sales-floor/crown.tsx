/** Hand-drawn style crown, in the current text colour. */
export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" aria-hidden className={className}>
      <path d="M6 32 L4 10 L16 20 L24 4 L32 20 L44 10 L42 32 Z" />
      <path d="M8 37 H40" />
      <circle cx="4" cy="8" r="2.5" fill="currentColor" />
      <circle cx="24" cy="3" r="2.5" fill="currentColor" />
      <circle cx="44" cy="8" r="2.5" fill="currentColor" />
    </svg>
  );
}
