# FAQ / Contact Us Design Brief

Status: **Agreed with the user and built** (`src/app/faq/page.tsx`,
`src/app/contact/page.tsx`, `src/app/contact/ContactForm.tsx`).

Applies the "Quiet & Confident" system from
[docs/design/STYLE_GUIDE.md](STYLE_GUIDE.md) to the two simplest content
pages on the site — same restyle-only scope as the shop/PDP pass
([docs/design/shop-page.md](shop-page.md)): no new sections, no copy
changes, no behavior changes.

## What changes

- **Background fix applied from the start** this time — outer `<main>`
  carries `bg-white`/`dark:bg-[#121110]` full width, inner
  `mx-auto max-w-3xl px-6 sm:px-10` wrapper holds the content. (Both
  pages are pure-text, so `max-w-3xl` — the STYLE_GUIDE's narrow
  container — not `max-w-6xl`.)
- **Type/color**: Archivo, scoped to each page; ink-soft for secondary
  text (FAQ answers, the contact intro paragraph, the "message sent"
  confirmation); heading treatment matches the rest of the site
  (`text-2xl font-semibold tracking-tight sm:text-3xl`).
- **FAQ items get a hairline divider** between entries (`divide-y` with
  the `--hairline` token) instead of plain gap spacing — reuses the
  divider component from the homepage rather than introducing a new
  pattern.
- **Contact links (email, Instagram) recolor to accent** — they're
  already underlined; only the color changes (ink → `--accent`), so the
  icon (via `currentColor`) picks it up too.
- **Contact form inputs**: border color swaps from the old
  `black/[.15]`/`white/[.2]` to the `--hairline` token, matching the PDP's
  option dropdown. Submit button stays monochrome ink fill — no change,
  already consistent with STYLE_GUIDE's "accent is never a background
  fill" rule. Error text stays `text-red-600` (semantic, not part of the
  decorative palette).

## What stays the same

- No new content, no new form fields, no validation changes.
- `ContactForm`'s submit/error/success logic is untouched — this is a
  color/type pass over existing markup only.
