import { BoardExitLink } from "@/components/board-exit-link";
import { AlternatingImage } from "@/features/slideshow/alternating-image";
import { PAGE_4_IMAGES } from "@/features/slideshow/images";
import { requireUser } from "@/lib/auth";

/** Page 4: one of two pictures, full screen, the other one on each visit. Any signed-in user can open it. */
export default async function Page4() {
  const user = await requireUser();
  return (
    <main className="relative h-dvh flex-1 bg-black">
      <AlternatingImage images={PAGE_4_IMAGES} alt="Creative Giants" />
      <BoardExitLink role={user.role} />
    </main>
  );
}
