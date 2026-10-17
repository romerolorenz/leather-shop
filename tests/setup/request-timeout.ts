// Every network request made during tests (Supabase, mostly) gets a hard
// time limit. Without this, a stalled connection to the dev project can
// hang a single request, and the whole run with it, for many minutes:
// Vitest's per-test timeout marks the test failed but can't cancel the
// request itself, and the cleanup hooks then queue up behind it. Aborting
// the request makes it fail fast with a clear error instead.
//
// Normal requests to dev take ~0.3s, so 10s only ever trips on a real hang.
const REQUEST_TIMEOUT_MS = 10_000;

const originalFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return originalFetch(input, { ...init, signal });
};
