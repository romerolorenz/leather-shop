"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({
  photos,
  productName,
}: {
  photos: string[];
  productName: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="aspect-square w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Image
        src={photos[selectedIndex]}
        alt={productName}
        width={800}
        height={800}
        priority
        className="aspect-square w-full rounded-lg object-cover"
      />
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-pressed={index === selectedIndex}
              aria-label={`Show photo ${index + 1}`}
              className={`aspect-square overflow-hidden rounded-lg border-2 ${
                index === selectedIndex
                  ? "border-foreground"
                  : "border-transparent"
              }`}
            >
              <Image
                src={url}
                alt={productName}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
