// Refuses to run the test suite against anything but the dev Supabase
// project. Tests create orders, zero and restore stock, change settings,
// run the real expiry sweep and create promo codes, so pointed at prod
// they would change real shop data.
//
// Used twice: by tests/run-lanes.mjs before it starts any lane (`npm
// test`), and by tests/setup/test-target-guard.ts as a Vitest global setup
// (plain `npx vitest run`). Plain JS so run-lanes.mjs can import it. The
// rule itself (findTestTargetProblem) is a pure function, unit-tested in
// tests/test-target.test.ts.
//
// The rule: `.env.local` itself must say SUPABASE_ENV=dev. Only the file
// that holds the Supabase URL and keys can vouch for them, so:
// - no `.env.local`, or one without the marker, is refused, whatever the
//   shell says;
// - a shell SUPABASE_ENV that differs from the file's is refused;
// - a shell-exported Supabase variable that differs from `.env.local` is
//   refused (dotenv never overrides shell variables, so a stale export
//   would otherwise win silently);
// - SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must be the same project;
// - if SUPABASE_PROD_REF is set, a URL containing it is refused.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const ENV_FILE = fileURLToPath(new URL("../../.env.local", import.meta.url));

// Every variable that decides which Supabase project the tests talk to.
const TARGET_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const quoted = (value) => (value === undefined ? "not set" : `"${value}"`);

/**
 * Pure: returns why the tests must not run, or null when the target is
 * dev. `fileVars` is `.env.local` parsed (null when there's no file);
 * `env` is the shell environment, which wins over the file the same way
 * dotenv loads it in vitest.config.ts.
 */
export function findTestTargetProblem(fileVars, env) {
  if (!fileVars) {
    return "There's no .env.local, so nothing marks the target as the dev database.";
  }
  if (fileVars.SUPABASE_ENV !== "dev") {
    return (
      "SUPABASE_ENV in .env.local " +
      (fileVars.SUPABASE_ENV === undefined
        ? "isn't set"
        : `is ${quoted(fileVars.SUPABASE_ENV)}, not "dev"`) +
      ", so the database it points at isn't confirmed to be dev. If (and only if) " +
      'that .env.local points at the dev Supabase project, add "SUPABASE_ENV=dev" to it.'
    );
  }
  if (env.SUPABASE_ENV !== undefined && env.SUPABASE_ENV !== fileVars.SUPABASE_ENV) {
    return (
      `SUPABASE_ENV is exported in your shell as ${quoted(env.SUPABASE_ENV)}, which ` +
      "differs from .env.local. Unset it (unset SUPABASE_ENV) and run again."
    );
  }

  const overridden = TARGET_VARS.filter(
    (key) => env[key] !== undefined && env[key] !== fileVars[key]
  );
  if (overridden.length) {
    const plural = overridden.length > 1;
    return (
      `${overridden.join(", ")} ${plural ? "are" : "is"} exported in your shell with a ` +
      "different value from .env.local, so the SUPABASE_ENV=dev marker there doesn't " +
      `vouch for ${plural ? "them" : "it"}. Unset ${plural ? "them" : "it"} ` +
      `(unset ${overridden.join(" ")}) and run again.`
    );
  }

  const merged = { ...fileVars, ...env };
  if (
    merged.SUPABASE_URL &&
    merged.NEXT_PUBLIC_SUPABASE_URL &&
    merged.SUPABASE_URL !== merged.NEXT_PUBLIC_SUPABASE_URL
  ) {
    return (
      "SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ, so some tests would talk to " +
      "a different project than others. Point both at the dev project."
    );
  }

  const prodRef = merged.SUPABASE_PROD_REF?.trim();
  if (prodRef) {
    const hits = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"].filter((key) =>
      merged[key]?.includes(prodRef)
    );
    if (hits.length) {
      return (
        `${hits.join(" and ")} point${hits.length > 1 ? "" : "s"} at the production ` +
        `project (${prodRef}, from SUPABASE_PROD_REF). Point .env.local at the dev project.`
      );
    }
  }

  return null;
}

/** Reads `.env.local` (null if missing) and applies the rule to process.env. */
export function checkTestTarget(envFile = ENV_FILE, env = process.env) {
  const fileVars = existsSync(envFile) ? parse(readFileSync(envFile)) : null;
  return findTestTargetProblem(fileVars, env);
}

export function formatTestTargetAbort(problem) {
  return (
    "\nRefusing to run the tests: they write to the database, and the target " +
    `isn't confirmed to be dev.\n${problem}\n` +
    "(see the 'mark your .env.local as dev' item in docs/MANUAL_TASKS.md)\n"
  );
}
