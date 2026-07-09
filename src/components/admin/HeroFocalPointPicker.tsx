"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import type { ActionResult } from "@/lib/action-result";

// Click-to-set focal point for the standalone hero image (US-38) — no
// existing object-position/focal-point pattern exists elsewhere in the
// repo, so this is a new, narrow piece of UI. Plain <img>, not next/image:
// this is a fixed-URL admin-only click target where getBoundingClientRect
// coordinate math is the point, and next/image's wrapping adds nothing
// here (unlike the admin product thumbnails, which use next/image but
// aren't interactive click targets).
export function HeroFocalPointPicker({
  imageUrl,
  initialFocalX,
  initialFocalY,
  saveFocalPointAction,
}: {
  imageUrl: string;
  initialFocalX: number;
  initialFocalY: number;
  saveFocalPointAction: (x: number, y: number) => Promise<ActionResult>;
}) {
  const [focalX, setFocalX] = useState(initialFocalX);
  const [focalY, setFocalY] = useState(initialFocalY);
  const [, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setFocalX(x);
    setFocalY(y);
    startTransition(async () => {
      const result = await saveFocalPointAction(x, y);
      if (!result.success) {
        showToast({ type: "error", message: result.error });
      }
    });
  }

  const objectPosition = `${focalX}% ${focalY}%`;

  return (
    <div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          onClick={handleClick}
          className="w-full cursor-crosshair rounded-md"
        />
        <div
          aria-hidden
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40 shadow"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Click anywhere on the image to set the focal point. Saves
        automatically.
      </p>

      <div className="mt-6 flex gap-4">
        <div className="flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Mobile preview
          </p>
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="absolute h-full w-full object-cover"
              style={{ objectPosition }}
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Desktop preview
          </p>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="absolute h-full w-full object-cover"
              style={{ objectPosition }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
