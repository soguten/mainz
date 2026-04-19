import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            appFile: "./site/src/main.tsx",
            appId: "site",
            buildConfig: "./site/mainz.build.ts",
            outDir: "dist/site",
        },
        {
            name: "playground",
            rootDir: "./playground",
            outDir: "dist/playground",
        },
        {
            name: "authorize-site",
            rootDir: "./examples/authorize-site",
            appFile: "./examples/authorize-site/src/main.tsx",
            appId: "authorize-site",
            outDir: "dist/examples/authorize-site",
        },
        {
            name: "di-http-site",
            rootDir: "./examples/di-http-site",
            appFile: "./examples/di-http-site/src/app.ts",
            appId: "site",
            outDir: "dist/examples/di-http-site",
        },
        {
            name: "typecase-site",
            rootDir: "./typecase-site",
            appFile: "./typecase-site/src/main.tsx",
            appId: "typecase-site",
            outDir: "dist/typecase-site",
        },
        {
            name: "docs",
            rootDir: "./docs-site",
            appFile: "./docs-site/src/main.tsx",
            appId: "docs-site",
            buildConfig: "./docs-site/mainz.build.ts",
            outDir: "dist/docs",
        },
    ],
});
