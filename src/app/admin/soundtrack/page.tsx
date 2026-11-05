import { Card, PageHeader } from "@/components/ui";
import { getSoundtrackPath } from "@/features/soundtrack/queries";
import { SoundtrackUploader } from "@/features/soundtrack/soundtrack-uploader";
import { requireAdmin } from "@/lib/auth";
import { soundtrackPublicUrl } from "@/lib/supabase/storage";

export default async function AdminSoundtrackPage() {
  await requireAdmin();
  const path = await getSoundtrackPath();

  return (
    <>
      <PageHeader title="Soundtrack" />
      <Card
        title="Background music for the TV screens"
        description="Loops quietly behind the Sales Floor, Operations Closeout, Page 3, Page 4 and the slideshow, and pauses while a sale's celebration video plays. MP3, M4A, OGG or WAV, up to 30 MB."
      >
        <SoundtrackUploader trackUrl={path ? soundtrackPublicUrl(path) : null} />
      </Card>
    </>
  );
}
