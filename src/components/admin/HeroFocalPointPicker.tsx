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
//
// Also used for the homepage studio photo (docs/design/studio-profile.md),
// which passes its own `previews`. Each preview's `aspectClass` must be a
// literal Tailwind class string (e.g. "aspect-[4/5]") so the class
// scanner picks it up; the defaults are the hero's two crops.
export type FocalPointPreview = { label: string; aspectClass: string };

const HERO_PREVIEWS: FocalPointPreview[] = [
  { label: "Mobile preview", aspectClass: "aspect-[9/16]" },
  { label: "Desktop preview", aspectClass: "aspect-[16/9]" },
];

export function HeroFocalPointPicker({
  imageUrl,
  initialFocalX,
  initialFocalY,
  saveFocalPointAction,
  previews = HERO_PREVIEWS,
  className,
  previewClassName = "flex-1",
}: {
  imageUrl: string;
  initialFocalX: number;
  initialFocalY: number;
  saveFocalPointAction: (x: number, y: number) => Promise<ActionResult>;
  previews?: FocalPointPreview[];
  // Optional width constraint on the whole picker (e.g. a tall 4:5 photo
  // shouldn't render full admin-page width) and on each preview tile.
  className?: string;
  previewClassName?: string;
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
    <div className={className}>
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
      <p className="mt-2 text-xs text-[#6E6A64] dark:text-[#A39C90]">
        Click anywhere on the image to set the focal point. Saves
        automatically.
      </p>

      <div className="mt-6 flex gap-4">
        {previews.map((preview) => (
          <div key={preview.label} className={previewClassName}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6E6A64] dark:text-[#A39C90]">
              {preview.label}
            </p>
            <div
              className={`relative ${preview.aspectClass} w-full overflow-hidden rounded-md`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="absolute h-full w-full object-cover"
                style={{ objectPosition }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
