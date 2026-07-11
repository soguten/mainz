const packageConfigs = [
  "./jsr.json",
  "./jsr.cli-deno.json",
] as const;

const warningPatterns = [
  "warning[unanalyzable-dynamic-import]",
] as const;

const decoder = new TextDecoder();
let failureCount = 0;
const strictWarnings = Deno.args.includes("--strict");

for (const configPath of packageConfigs) {
  const command = new Deno.Command("deno", {
    args: [
      "publish",
      "--dry-run",
      "--allow-dirty",
      "--quiet",
      "--config",
      configPath,
    ],
    cwd: Deno.cwd(),
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  const stdout = decoder.decode(result.stdout);
  const stderr = decoder.decode(result.stderr);
  const combinedOutput = `${stdout}\n${stderr}`;
  const matchedWarnings = warningPatterns.filter((pattern) =>
    combinedOutput.includes(pattern)
  );

  if (result.code !== 0 || (strictWarnings && matchedWarnings.length > 0)) {
    failureCount += 1;
    console.error(`[check-jsr-publish] ${configPath} failed.`);
    if (matchedWarnings.length > 0) {
      console.error(
        `[check-jsr-publish] Found publish warnings: ${
          matchedWarnings.join(", ")
        }`,
      );
    }
    const relevantLines = combinedOutput
      .split("\n")
      .filter((line) =>
        warningPatterns.some((pattern) => line.includes(pattern)) ||
        line.includes("unable to analyze dynamic import") ||
        line.includes("src/public/tooling-vite-build.ts")
      )
      .join("\n")
      .trim();
    if (relevantLines) {
      console.error(relevantLines);
    }
  } else {
    if (matchedWarnings.length > 0) {
      console.warn(`[check-jsr-publish] ${configPath} reported publish warnings.`);
      console.warn(
        `[check-jsr-publish] Found publish warnings: ${matchedWarnings.join(", ")}`,
      );
    }
    console.log(`[check-jsr-publish] ${configPath} passed.`);
  }
}

if (failureCount > 0) {
  Deno.exit(1);
}
