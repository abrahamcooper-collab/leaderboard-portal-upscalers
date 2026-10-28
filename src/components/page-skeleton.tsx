/** Placeholder shown the instant a page is clicked, while its data loads. */
export function PageSkeleton({ dark = false }: { dark?: boolean }) {
  const block = dark ? "bg-white/10" : "bg-slate-200";
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className={`mb-6 h-8 w-48 rounded-md ${block}`} />
      <div className="flex flex-col gap-6">
        <div className={`h-40 rounded-xl ${block}`} />
        <div className={`h-64 rounded-xl ${block}`} />
      </div>
    </div>
  );
}
