"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import { VIDEO_BUCKET } from "@/lib/supabase/storage";
import { removeTeamVideo, setTeamVideo } from "./actions";

// Matches the bucket's file_size_limit in the migration.
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
// Every upload gets a new path, so a file never changes and can be cached
// for a year — reloading the board doesn't re-download videos.
const IMMUTABLE_CACHE_SECONDS = String(365 * 24 * 60 * 60);

/**
 * Uploads straight from the browser to Supabase Storage (videos are too big
 * for a Server Action body), then tells the server to use the new file.
 */
export function VideoUploader({ teamId, videoUrl }: { teamId: string; videoUrl: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ isError: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload() {
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setMessage({ isError: true, text: "Video must be 50 MB or smaller." });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${teamId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false });
      if (error) {
        setMessage({ isError: true, text: `Upload failed: ${error.message}` });
        return;
      }

      const result = await setTeamVideo(teamId, path);
      if (result.status === "error") {
        await supabase.storage.from(VIDEO_BUCKET).remove([path]);
        setMessage({ isError: true, text: result.message });
        return;
      }
      setFile(null);
      setMessage({ isError: false, text: "Video saved." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {videoUrl ? (
        <video src={videoUrl} controls className="aspect-video w-full max-w-md rounded-lg bg-black" />
      ) : (
        <p className="text-sm text-slate-500">No video yet. Sales for this team will show a plain celebration.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="max-w-xs"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button type="button" onClick={upload} disabled={!file || isPending}>
          {isPending ? "Uploading…" : videoUrl ? "Replace video" : "Upload video"}
        </Button>
        {message && (
          <p role="status" className={`text-sm ${message.isError ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        )}
      </div>
      {videoUrl && (
        <ActionForm action={removeTeamVideo} submitLabel="Remove video" variant="danger">
          <input type="hidden" name="teamId" value={teamId} />
        </ActionForm>
      )}
    </div>
  );
}
