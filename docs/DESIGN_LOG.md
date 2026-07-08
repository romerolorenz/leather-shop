# Design Log — Leather Shop

Every design artifact published for review, newest first, so a design
made in one session is still visible in the next. See the "Ask before
designing, and write the design doc before building" rule in
[CLAUDE.md](../CLAUDE.md) — before adding to this list, a design brief
should already exist under `docs/design/` and be agreed with the user.

- **2026-07-08 — Homepage v3, "Quiet & Confident"**
  [artifact](https://claude.ai/code/artifact/dbb0209b-fc2d-40cd-bc50-d29f3cb23551) —
  brief: [docs/design/homepage.md](design/homepage.md). Built from a
  design-doc-first process (first design to follow it). Near-monochrome
  palette (white/warm-near-black/warm-grey) with a single oxblood accent
  used sparingly; Archivo as the sole type family across weights instead
  of a display/body pairing. Three sections only: full-screen product
  hero (slow Ken-Burns drift, no carousel chrome), top-3 admin-chosen
  products, short studio-brief paragraph. Uses free-license Pexels
  photography as realistic placeholders (embedded as data URIs — the
  Artifact CSP blocks remote image requests) since no real product
  photography exists yet; flagged in the brief that a `featured` field
  doesn't yet exist on `products` (only 2 real seed products exist, a
  belt was added as a placeholder third item).

## Dropped

Both prior homepage explorations were dropped at the user's request on
2026-07-08 to restart with a design-document-first process — not
superseded by a specific replacement, discarded outright.

- **Homepage v2, "Editorial Filipino"** (dropped)
  [artifact](https://claude.ai/code/artifact/d6c1cb42-5fb9-4204-89bb-8238aa6ebbda) —
  luxurious-editorial direction, white + light-brown palette, parchment/
  linen textures, Fraunces + Work Sans, baybayin/alibata as the signature
  native-Filipino element, category panels as generative material
  textures (solihiya, piña/linen, narra wood, capiz).
- **Homepage, "Atelier Ledger"** (dropped)
  [artifact](https://claude.ai/code/artifact/fc3a95e4-786e-4f8e-aa29-dc66e7494b52) —
  leatherworker's grading-card/spec-sheet concept, IBM Plex serif/sans/
  mono, cognac/brass/loden palette. Built before any vibe brief was
  collected.
