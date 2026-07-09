import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next. "**/" prefixes so
  // these also match nested occurrences — e.g. a Claude Code worktree's
  // own build output at .claude/worktrees/<name>/.next/**, which the
  // non-prefixed defaults below don't reach.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
