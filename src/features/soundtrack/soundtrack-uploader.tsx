"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import { SOUNDTRACK_BUCKET, SOUNDTRACK_FOLDER } from "@/lib/supabase/storage";
import { removeSoundtrack, setSoundtrack } from "./actions";

// Matches the bucket's file_size_limit in the soundtrack migration.
const MAX_TRACK_BYTES = 30 * 1024 * 1024;
const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/wav", "audio/webm"];
// Every upload gets a new path, so a file never changes and can be cached for a year.
const IMMUTABLE_CACHE_SECONDS = String(365 * 24 * 60 * 60);

/**
 * Admin: choose the soundtrack that plays in the background of the TV pages.
 * Uploads straight from the browser to Supabase Storage (audio can be too big
 * for a Server Action body), then tells the server to use the new file.
 */
export function SoundtrackUploader({ trackUrl }: { trackUrl: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ isError: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload() {
    if (!file) return;
    if (file.size > MAX_TRACK_BYTES) {
      setMessage({ isError: true, text: "The soundtrack must be 30 MB or smaller." });
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ isError: true, text: "Choose an MP3, M4A, OGG or WAV file." });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const path = `${SOUNDTRACK_FOLDER}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(SOUNDTRACK_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false });
      if (error) {
        setMessage({ isError: true, text: `Upload failed: ${error.message}` });
        return;
      }

      const result = await setSoundtrack(path);
      if (result.status === "error") {
        await supabase.storage.from(SOUNDTRACK_BUCKET).remove([path]);
        setMessage({ isError: true, text: result.message });
        return;
      }
      setFile(null);
      setMessage({ isError: false, text: result.status === "success" ? result.message : "Saved." });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeSoundtrack();
      setMessage({ isError: result.status === "error", text: result.status === "idle" ? "" : result.message });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {trackUrl ? (
        <audio src={trackUrl} controls className="w-full max-w-md" />
      ) : (
        <p className="text-sm text-slate-500">No soundtrack yet. The TV screens play no background music.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="max-w-xs"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button type="button" onClick={upload} disabled={!file || isPending}>
          {isPending ? "Saving…" : trackUrl ? "Replace soundtrack" : "Upload soundtrack"}
        </Button>
        {trackUrl && (
          <Button type="button" variant="danger" onClick={remove} disabled={isPending}>
            Remove soundtrack
          </Button>
        )}
        {message && (
          <p role="status" className={`text-sm ${message.isError ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
