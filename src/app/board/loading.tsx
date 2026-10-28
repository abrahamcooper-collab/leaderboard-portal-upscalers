import { PageSkeleton } from "@/components/page-skeleton";

export default function BoardLoading() {
  return (
    <main className="min-h-full flex-1 bg-slate-950 px-6 py-6">
      <PageSkeleton dark />
    </main>
  );
}
