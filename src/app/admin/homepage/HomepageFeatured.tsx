"use client";

import Image from "next/image";
import type { AdminProduct } from "@/lib/admin/catalog";
import { FEATURED_CHIP_BASE, featuredStatusChip } from "@/lib/admin/featured-status";
import { reorderFeaturedProductsAction } from "../actions";
import { DragReorderList } from "@/components/admin/DragReorderList";
import { FeaturedSlotModal } from "./FeaturedSlotModal";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const MAX_FEATURED = 3;

// Every tile (filled or empty) shares this width so a mix of draggable
// (DragReorderList, via its `contents` wrapper below) and plain empty
// placeholders sits in one even 3-across row regardless of which is which.
const TILE_WIDTH = "w-[calc((100%-1.5rem)/3)]";

function FilledTile({ product }: { product: AdminProduct }) {
  const photo = product.photos[0];
  const chip = featuredStatusChip(product);
  return (
    <div>
      {photo ? (
        <Image
          src={photo.url}
          alt={product.name}
          width={200}
          height={160}
          className={`aspect-[4/3] w-full rounded-lg border ${HAIRLINE} object-cover`}
        />
      ) : (
        <div className={`aspect-[4/3] w-full rounded-lg border ${HAIRLINE} bg-black/[.05] dark:bg-white/[.08]`} />
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
          {product.name}
        </p>
        {chip && (
          <span className={`shrink-0 ${FEATURED_CHIP_BASE} ${chip.className}`}>
            {chip.label}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyTile({ interactive }: { interactive: boolean }) {
  return (
    <div
      className={`flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed ${HAIRLINE} ${
        interactive ? "text-[#7A3B22] dark:text-[#C97A4E]" : "text-[#6E6A64] dark:text-[#A39C90]"
      }`}
    >
      <span className="text-sm">{interactive ? "+ Choose product" : "Empty"}</span>
    </div>
  );
}

export function HomepageFeatured({ products }: { products: AdminProduct[] }) {
  const featured = products
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0));
  const candidates = products.filter((p) => !p.featured);
  const emptyCount = MAX_FEATURED - featured.length;

  return (
    <div>
      {/* Position labels are fixed to their column — "Grid position 1" is
          always the first slot, regardless of which product currently
          occupies it — so they live in their own static row rather than
          traveling with the draggable tile below (which would also put
          the grip's absolute-positioned corner over this label instead
          of the image, since it positions relative to the whole
          draggable item). */}
      <div className="mb-1 flex flex-wrap gap-3">
        {Array.from({ length: MAX_FEATURED }).map((_, i) => (
          <p
            key={i}
            className={`${TILE_WIDTH} text-[.6875rem] font-medium uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]`}
          >
            Grid position {i + 1}
          </p>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {featured.length > 0 && (
          <DragReorderList
            items={featured}
            onReorder={reorderFeaturedProductsAction}
            className="contents"
            itemClassName={TILE_WIDTH}
            overlayGrip
          >
            {featured.map((product, index) => (
              <FeaturedSlotModal
                key={product.id}
                position={index}
                current={product}
                candidates={candidates}
                trigger={<FilledTile product={product} />}
              />
            ))}
          </DragReorderList>
        )}

        {Array.from({ length: emptyCount }).map((_, i) => {
          const position = featured.length + i;
          const isNext = i === 0;
          return (
            <div key={`empty-${position}`} className={TILE_WIDTH}>
              {isNext ? (
                <FeaturedSlotModal
                  position={position}
                  current={null}
                  candidates={candidates}
                  trigger={<EmptyTile interactive />}
                />
              ) : (
                <EmptyTile interactive={false} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
