export function isFullSuiteEnabled(): boolean {
  return Deno.env.get("MAINZ_TEST_FULL") === "1";
}

export function fullSuiteIgnore(): boolean {
  return !isFullSuiteEnabled();
}
