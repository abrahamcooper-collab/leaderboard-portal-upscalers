"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/features/sales-floor/avatar";
import type { ActionState } from "@/lib/action-state";
import { removeAvatar, updateAvatar } from "./avatar-actions";
import type { AvatarSrc } from "./avatars";
import { toSquareJpeg } from "./resize-photo";

/**
 * A closer's or agent's photo with buttons to change or remove it, for the
 * admin and closer pages. The photo shows on the boards and the race.
 * `hasUpload` is whether `src` is an uploaded photo (only those can be removed;
 * otherwise `src` is the team photo or null for initials).
 */
export function AvatarEditor({
  kind,
  id,
  name,
  src,
  hasUpload,
  size = 36,
}: {
  kind: "closer" | "agent";
  id: string;
  name: string;
  src: AvatarSrc | null;
  hasUpload: boolean;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);

  function formFor(photo?: Blob): FormData {
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("id", id);
    if (photo) formData.set("photo", photo, "photo.jpg");
    return formData;
  }

  function choose(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      let photo: Blob;
      try {
        photo = await toSquareJpeg(file);
      } catch {
        setResult({ status: "error", message: "That photo couldn't be read. Use a JPG or PNG." });
        return;
      }
      setResult(await updateAvatar(formFor(photo)));
    });
  }

  function remove() {
    startTransition(async () => setResult(await removeAvatar(formFor())));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Avatar name={name} src={src} size={size} tone="light" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`New photo for ${name}`}
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="rounded-md px-2 py-1 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Change photo"}
        </button>
        {hasUpload && (
          <button
            type="button"
            disabled={isPending}
            onClick={remove}
            className="rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            Remove
          </button>
        )}
        {result && result.status !== "idle" && (
          <span role="status" className={result.status === "error" ? "text-red-600" : "text-emerald-600"}>
            {result.message}
          </span>
        )}
      </div>
    </div>
  );
}
