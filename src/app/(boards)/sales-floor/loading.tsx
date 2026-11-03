import { PageSkeleton } from "@/components/page-skeleton";

export default function SalesFloorLoading() {
  return (
    <main className="min-h-full flex-1 bg-[#070707] px-6 py-6">
      <PageSkeleton dark />
    </main>
  );
}
