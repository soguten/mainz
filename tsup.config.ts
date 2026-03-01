import { defineConfig } from "npm:tsup@8.5.1";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        "jsx-runtime": "src/jsx-runtime.ts",
        "jsx-dev-runtime": "src/jsx-dev-runtime.ts",
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    treeshake: true,
    tsconfig: "tsconfig.json",
});