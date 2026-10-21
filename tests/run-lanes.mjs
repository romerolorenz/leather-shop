#!/usr/bin/env node
// `npm test`: runs the test lanes from vitest.config.ts ("data",
// "settings", "content") as separate Vitest processes at the same time. Vitest's own
// projects setting runs them one after the other when each must stay
// one-file-at-a-time, so separate processes are what actually makes them
// overlap. Each output line is prefixed with its lane. The run fails if
// any lane fails.
//
// Extra arguments go to every lane, e.g. `npm test -- tests/psgc.test.ts`.
// A lane with no matching files just passes, but if no lane finds any
// file at all (e.g. a typo in the path), the run fails.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { checkTestTarget, formatTestTargetAbort } from "./setup/test-target.mjs";

// Last-resort cap on the whole run. Normal runs take about 3-4 minutes, and
// each request already times out after 10s (tests/setup/request-timeout.ts),
// so this only trips if something hangs outside a request. If it does,
// that lane's cleanup hooks may not have run, so check dev for leftover
// test rows.
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

const LANES = ["data", "settings", "content"];
const args = process.argv.slice(2);
const width = Math.max(...LANES.map((l) => l.length));

// Vitest's own entry file, run with this same Node binary. Going through
// `npx` would put an extra process in between, and a timeout's SIGTERM
// would stop npx but not necessarily Vitest.
const VITEST_ENTRY = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url)
);

// Never start a lane unless the target is the dev database. Each Vitest
// process checks again (tests/setup/test-target-guard.ts), but checking
// here first means one clear message instead of three.
const targetProblem = checkTestTarget();
if (targetProblem) {
  console.error(formatTestTargetAbort(targetProblem));
  process.exit(1);
}

function runLane(lane) {
  return new Promise((resolve) => {
    const prefix = `[${lane.padEnd(width)}] `;
    let foundNoFiles = false;
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ lane, code, foundNoFiles });
    };

    const child = spawn(
      process.execPath,
      [VITEST_ENTRY, "run", "--project", lane, "--passWithNoTests", ...args],
      { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, FORCE_COLOR: "1" } }
    );
    for (const stream of [child.stdout, child.stderr]) {
      createInterface({ input: stream }).on("line", (line) => {
        if (stripVTControlCharacters(line).startsWith("No test files found")) {
          foundNoFiles = true;
        }
        process.stdout.write(prefix + line + "\n");
      });
    }
    const timer = setTimeout(() => {
      process.stdout.write(
        `${prefix}Stopped: the whole run passed ${RUN_TIMEOUT_MS / 60000} minutes. ` +
          "Cleanup may not have run, so check dev for leftover test data.\n"
      );
      child.kill("SIGTERM");
    }, RUN_TIMEOUT_MS);
    child.on("error", (error) => {
      process.stdout.write(`${prefix}Couldn't start Vitest: ${error.message}\n`);
      finish(1);
    });
    child.on("close", (code) => finish(code ?? 1));
  });
}

const started = Date.now();
const results = await Promise.all(LANES.map(runLane));
const failed = results.filter((r) => r.code !== 0).map((r) => r.lane);
const seconds = Math.round((Date.now() - started) / 1000);

if (!failed.length && results.every((r) => r.foundNoFiles)) {
  console.log(
    `\nNo lane found any test file matching: ${args.join(" ")} ` +
      `(${seconds}s total). Check the path for typos.`
  );
  process.exit(1);
}

console.log(
  failed.length
    ? `\nFailed lanes: ${failed.join(", ")} (${seconds}s total)`
    : `\nAll lanes passed (${seconds}s total)`
);
process.exit(failed.length ? 1 : 0);
