import { resolveMainzTempPath } from "../../src/tooling/temp-paths.ts";

export async function makeMainzTempDir(args: {
  cwd: string;
  prefix: string;
  subdirectories: readonly string[];
}): Promise<string> {
  const parentDir = resolveMainzTempPath(args.cwd, ...args.subdirectories);
  await Deno.mkdir(parentDir, { recursive: true });
  return await Deno.makeTempDir({
    dir: parentDir,
    prefix: args.prefix,
  });
}
