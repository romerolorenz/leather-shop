// Vitest global setup: runs once per `vitest` process, before any test
// file loads, and aborts the run unless the target is the dev database.
// Covers plain `npx vitest run`; `npm test` also checks before starting
// any lane (tests/run-lanes.mjs). The rule lives in ./test-target.mjs.
import { checkTestTarget, formatTestTargetAbort } from "./test-target.mjs";

export default function assertDevTarget() {
  const problem = checkTestTarget();
  if (!problem) return;
  const error = new Error(formatTestTargetAbort(problem));
  // The message says it all; a stack trace into Vitest internals is noise.
  error.stack = error.message;
  throw error;
}
