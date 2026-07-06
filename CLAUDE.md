@AGENTS.md

# Project Rules

- **Settings are configurable, not hardcoded, unless stated otherwise.**
  Any business value/amount that behaves like a "setting" (shipping fee,
  delivery area, notification email, hold durations, thresholds, etc.)
  must live in admin-editable storage (the `settings` table — see
  ARCHITECTURE.md § Data Model), not as a code constant. Only deployment
  secrets (API keys, connection strings) belong in environment variables
  instead. Default assumption: configurable. Hardcoding requires an
  explicit exception called out at the point of use.
- **Diagrams and flowcharts default to Mermaid.js.** When documenting
  architecture, data models, or process flows in markdown, use a
  ```mermaid``` code block instead of ASCII art, unless there's a specific
  reason Mermaid can't express it.
