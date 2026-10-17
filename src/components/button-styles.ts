// Storefront button classes, mirroring docs/design/STYLE_GUIDE.md § Buttons
// (the source of truth). Compose as BTN + size + variant, e.g.
// `${BTN} ${BTN_DEFAULT} ${BTN_PRIMARY} w-full`. Customer-facing pages only;
// the admin keeps its own buttons. The corner comes from the `--radius-btn`
// token in globals.css.
//
// Kept as full literal strings so Tailwind's source scan picks them up.

export const BTN =
  "inline-flex items-center justify-center gap-2 rounded-btn whitespace-nowrap text-xs sm:text-sm font-medium uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

export const BTN_DEFAULT = "h-12 px-6";
export const BTN_COMPACT = "h-10 px-4";

// Solid ink. Pending = disabled + aria-busy, kept at full strength.
export const BTN_PRIMARY =
  "bg-foreground text-background hover:bg-[#383838] active:bg-[#383838] focus-visible:outline-[#1C1A18] disabled:opacity-50 aria-busy:disabled:opacity-100";

// Sand fill. Disabled uses cream + ink-soft (not opacity), except while
// pending, when it stays at full strength like the primary.
export const BTN_SECONDARY =
  "bg-[#E7E2D9] text-[#1C1A18] hover:bg-[#DDD6CA] active:bg-[#D3CBBD] focus-visible:outline-[#1C1A18] disabled:bg-[#F3F1EC] disabled:text-[#6E6A64] aria-busy:disabled:bg-[#E7E2D9] aria-busy:disabled:text-[#1C1A18]";

// Only over full-bleed photography with a scrim (homepage hero).
export const BTN_GHOST_ON_PHOTO =
  "border border-white/70 text-white hover:bg-white hover:text-[#1C1A18] active:bg-white/90 active:text-[#1C1A18] focus-visible:outline-white";

// Non-interactive "can't act" block in the button's shape. Render as <p>.
export const STATUS_BLOCK =
  "flex h-12 w-full items-center justify-center rounded-btn bg-[#F3F1EC] px-6 text-xs sm:text-sm font-medium uppercase tracking-[0.08em] text-[#6E6A64]";

// Text link, inline style (STYLE_GUIDE § Buttons, variant 4).
export const TEXT_LINK_INLINE =
  "text-[#7A3B22] underline underline-offset-4 hover:no-underline";
