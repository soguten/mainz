import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceRoot = resolve(repoRoot, "..", "mainz-templates", "templates");
const destinationRoot = resolve(repoRoot, "templates");

await Deno.remove(destinationRoot, { recursive: true }).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
    }
});
await Deno.mkdir(destinationRoot, { recursive: true });

for await (const entry of Deno.readDir(sourceRoot)) {
    await copyRecursively(resolve(sourceRoot, entry.name), resolve(destinationRoot, entry.name));
}

console.log(`[mainz] Synced templates from ${sourceRoot}`);

async function copyRecursively(source: string, destination: string): Promise<void> {
    const stat = await Deno.stat(source);
    if (stat.isDirectory) {
        await Deno.mkdir(destination, { recursive: true });
        for await (const entry of Deno.readDir(source)) {
            await copyRecursively(resolve(source, entry.name), resolve(destination, entry.name));
        }
        return;
    }

    await Deno.mkdir(dirname(destination), { recursive: true });
    await Deno.copyFile(source, destination);
}
