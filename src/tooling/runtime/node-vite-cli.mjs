import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const vitePackageJsonPath = require.resolve("vite/package.json");
const viteCliPath = join(dirname(vitePackageJsonPath), "bin", "vite.js");

await import(pathToFileURL(viteCliPath).href);
