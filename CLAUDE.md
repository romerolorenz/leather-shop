@AGENTS.md

# Project Rules

Project docs (PRD, architecture, dev plan, user stories, manual
tasks/testing) live in [docs/](./docs/), not the repo root.

- **Settings are configurable, not hardcoded, unless stated otherwise.**
  Any business value/amount that behaves like a "setting" (shipping fee,
  delivery area, notification email, hold durations, thresholds, etc.)
  must live in admin-editable storage (the `settings` table — see
  docs/ARCHITECTURE.md § Data Model), not as a code constant. Only deployment
  secrets (API keys, connection strings) belong in environment variables
  instead. Default assumption: configurable. Hardcoding requires an
  explicit exception called out at the point of use.
- **Diagrams and flowcharts default to Mermaid.js.** When documenting
  architecture, data models, or process flows in markdown, use a
  ```mermaid``` code block instead of ASCII art, unless there's a specific
  reason Mermaid can't express it.
- **Manual tasks get tracked in MANUAL_TASKS.md, not just mentioned in
  chat.** Whenever a step can't be done directly (creating external
  accounts, pasting API keys, clicking through a dashboard, rotating a
  credential, uploading real assets, etc.), add it to
  [docs/MANUAL_TASKS.md](./docs/MANUAL_TASKS.md) as a checklist item instead of only
  saying it in conversation — so outstanding manual work doesn't get lost
  once the chat scrolls past it. Check items off there once done.
  **The file edit comes first** — update MANUAL_TASKS.md in the same turn
  where the task is identified, before or alongside asking the user to do
  it in chat. Asking in chat without having just added/updated the
  checklist item is the failure mode this rule exists to prevent.
- **Order MANUAL_TASKS.md's Outstanding list by what it blocks.** Items
  that block the next unstarted phase in DEVELOPMENT_PLAN.md go first,
  ahead of items that block a later phase, ahead of items that don't block
  any phase (content/business tasks like real photos or brand assets).
  Note which phase each blocking item is holding up. Re-sort whenever a
  phase completes or a task is checked off, since the "next phase" shifts.
- **Commit after every phase.** Each phase in DEVELOPMENT_PLAN.md gets its
  own git commit once its exit criteria are met, before moving on to the
  next phase — don't let multiple phases pile up uncommitted.
- **Verify with real test cases (`npm test`, Vitest), not one-off curl
  commands or throwaway scripts.** Business logic (`src/lib/*`) and API
  routes get test files under `tests/` that call the actual functions/route
  handlers directly and assert on results — not manual `curl` invocations
  or `node verify-*.mjs` scripts written once and deleted. Tests run
  against the real (dev) Supabase project, since there's no separate test
  database — every test must clean up any data/stock it touches (in
  `afterEach`/`afterAll`), and must push cleanup state *immediately* after
  a mutation, before any assertion that could throw and skip it. A
  temporary debugging script is fine mid-investigation, but once behavior
  is confirmed, encode it as a test rather than discarding it — the tests
  this rule produced already caught a real production bug
  (`cancelOrderAndRestoreStock` restoring stock before checking order
  status) that manual curl testing had missed.
- **Keep git commit messages concise.** A short summary line plus 2-4
  bullet points covering what changed and why is enough — don't restate
  the full reasoning already visible in the diff or in chat.
- **Manual testing checklists go in MANUAL_TESTING.md, not just chat.**
  Whenever verification needs a human to click through something I can't
  drive myself (forms, file uploads, real OAuth logins, anything needing
  a real browser session), write the steps into
  [docs/MANUAL_TESTING.md](./docs/MANUAL_TESTING.md) as checkboxes grouped by
  phase/feature, each with a spot for the user to record findings —
  instead of only listing steps in chat. Same discipline as
  MANUAL_TASKS.md: update the file in the same turn the checklist is
  identified. Distinct from MANUAL_TASKS.md — that file is for one-off
  external setup (accounts, credentials); this one is for repeatable
  verification steps and their results.
- **Ask before designing.** Before building any UI/artifact design (a page,
  flow, or mockup), ask what it's for and the creative direction/vibe
  wanted — mood, references, palette leanings, anything to avoid — and
  discuss options rather than jumping straight to a finished build.
  Calibrate to what's actually needed; don't over-design a simple ask.
- **Every design artifact gets logged in DESIGN_LOG.md.** Whenever a
  design/mockup is published (e.g. via the Artifact tool), add an entry to
  [docs/DESIGN_LOG.md](./docs/DESIGN_LOG.md) — date, name, link, and a
  short description of the concept — in the same turn it's published, so
  designs from one session are visible in the next.
