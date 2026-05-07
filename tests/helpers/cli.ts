import { cliTestsRepoRoot } from "./types.ts";

const decoder = new TextDecoder();

export async function runCliCommand(
  args: readonly string[],
  errorMessage: string,
  cwd = cliTestsRepoRoot,
): Promise<{ stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [...args],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const result = await command.output();
  const stdout = decoder.decode(result.stdout);
  const stderr = decoder.decode(result.stderr);

  if (!result.success) {
    throw new Error(`${errorMessage}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  return { stdout, stderr };
}

export async function runMainzCliCommand(
  args: readonly string[],
  errorMessage: string,
): Promise<{ stdout: string; stderr: string }> {
  return await runCliCommand(
    ["run", "-A", "./src/cli/mainz.ts", ...args],
    errorMessage,
  );
}
