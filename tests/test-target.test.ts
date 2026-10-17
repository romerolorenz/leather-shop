import { describe, expect, it } from "vitest";
import { findTestTargetProblem } from "./setup/test-target.mjs";

// The "never run against prod" rule, as a pure function: no file reads,
// no database. See tests/setup/test-target.mjs.

const DEV_URL = "https://devref.supabase.co";
const PROD_URL = "https://prodref.supabase.co";

const devFile = {
  SUPABASE_ENV: "dev",
  SUPABASE_URL: DEV_URL,
  NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
  SUPABASE_SERVICE_ROLE_KEY: "dev-service-key",
};

describe("findTestTargetProblem", () => {
  it("passes when .env.local has the dev marker", () => {
    expect(findTestTargetProblem(devFile, {})).toBeNull();
  });

  it("passes when the shell holds the same values .env.local loaded", () => {
    // Inside Vitest, dotenv has already copied the file into process.env.
    expect(findTestTargetProblem(devFile, { ...devFile })).toBeNull();
  });

  it("refuses when .env.local has no marker, even if the shell says dev", () => {
    const noMarker = { ...devFile, SUPABASE_ENV: undefined };
    expect(findTestTargetProblem(noMarker, { SUPABASE_ENV: "dev" })).toMatch(
      /SUPABASE_ENV in \.env\.local isn't set/
    );
  });

  it("refuses when .env.local says prod and the shell says dev", () => {
    expect(
      findTestTargetProblem(
        { ...devFile, SUPABASE_ENV: "prod" },
        { SUPABASE_ENV: "dev" }
      )
    ).toMatch(/is "prod", not "dev"/);
  });

  it("refuses when the shell's SUPABASE_ENV differs from the file's", () => {
    expect(findTestTargetProblem(devFile, { SUPABASE_ENV: "prod" })).toMatch(
      /unset SUPABASE_ENV/
    );
  });

  it("refuses when SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ", () => {
    expect(
      findTestTargetProblem({ ...devFile, NEXT_PUBLIC_SUPABASE_URL: PROD_URL }, {})
    ).toMatch(/SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ/);
  });

  it("refuses a URL that matches SUPABASE_PROD_REF", () => {
    expect(
      findTestTargetProblem(
        { ...devFile, SUPABASE_PROD_REF: "devref" },
        {}
      )
    ).toMatch(/production project \(devref/);
  });

  it("refuses a shell Supabase variable that differs from .env.local", () => {
    expect(findTestTargetProblem(devFile, { SUPABASE_URL: PROD_URL })).toMatch(
      /unset SUPABASE_URL/
    );
    expect(
      findTestTargetProblem(devFile, { SUPABASE_SERVICE_ROLE_KEY: "prod-key" })
    ).toMatch(/unset SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("refuses when there's no .env.local", () => {
    expect(
      findTestTargetProblem(null, { ...devFile, SUPABASE_ENV: "dev" })
    ).toMatch(/no \.env\.local/);
  });
});
