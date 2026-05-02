import { resolve } from "node:path";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";

export async function createGeneratedViteConfigDir(
    cwd: string,
    runtime: MainzToolingRuntime,
): Promise<string> {
    if (runtime.name === "node") {
        const tempDir = resolve(cwd, "node_modules", ".mainz", "vite");
        await runtime.mkdir(tempDir, { recursive: true });
        return tempDir;
    }

    return await runtime.makeTempDir({
        prefix: "mainz-vite-config-",
    });
}
