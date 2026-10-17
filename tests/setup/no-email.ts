// Tests never send real email. `.env.local` holds a real RESEND_API_KEY
// (vitest.config.ts loads it), and every order a test places would
// otherwise email the admin inbox and a bouncing @example.com customer.
// With the key unset, src/lib/email.ts skips each send with a warning.
// The email builders are pure functions, tested in tests/email.test.ts.
delete process.env.RESEND_API_KEY;
