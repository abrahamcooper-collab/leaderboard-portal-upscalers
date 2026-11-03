import { PageSkeleton } from "@/components/page-skeleton";

export default function OperationsCloseoutLoading() {
  return (
    <main className="min-h-dvh flex-1 bg-[#0b1120] px-6 py-6">
      <PageSkeleton dark />
    </main>
  );
}
