#!/usr/bin/env node
// `npm test`: runs the test lanes from vitest.config.ts ("data",
// "settings", "content") as separate Vitest processes at the same time. Vitest's own
// projects setting runs them one after the other when each must stay
// one-file-at-a-time, so separate processes are what actually makes them
// overlap. Each output line is prefixed with its lane. The run fails if
// either lane fails.
//
// Extra arguments go to both lanes, e.g. `npm test -- tests/psgc.test.ts`.
// A lane with no matching files just passes.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// Last-resort cap on the whole run. Normal runs take about 3-4 minutes, and
// each request already times out after 10s (tests/setup/request-timeout.ts),
// so this only trips if something hangs outside a request. If it does,
// that lane's cleanup hooks may not have run, so check dev for leftover
// test rows.
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

const LANES = ["data", "settings", "content"];
const args = process.argv.slice(2);
const width = Math.max(...LANES.map((l) => l.length));

function runLane(lane) {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["vitest", "run", "--project", lane, "--passWithNoTests", ...args],
      { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, FORCE_COLOR: "1" } }
    );
    const prefix = `[${lane.padEnd(width)}] `;
    for (const stream of [child.stdout, child.stderr]) {
      createInterface({ input: stream }).on("line", (line) => {
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
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ lane, code: code ?? 1 });
    });
  });
}

const started = Date.now();
const results = await Promise.all(LANES.map(runLane));
const failed = results.filter((r) => r.code !== 0).map((r) => r.lane);
const seconds = Math.round((Date.now() - started) / 1000);

console.log(
  failed.length
    ? `\nFailed lanes: ${failed.join(", ")} (${seconds}s total)`
    : `\nAll lanes passed (${seconds}s total)`
);
process.exit(failed.length ? 1 : 0);
