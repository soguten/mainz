import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            viteConfig: "./vite.config.site.ts",
            appFile: "./site/src/main.tsx",
            appId: "site",
            pagesDir: "./site/src/pages",
            buildConfig: "./site/mainz.build.ts",
            outDir: "dist/site",
        },
        {
            name: "playground",
            rootDir: "./playground",
            viteConfig: "./vite.config.playground.ts",
            outDir: "dist/playground",
        },
        {
            name: "authorize-site",
            rootDir: "./examples/authorize-site",
            viteConfig: "./vite.config.authorize-site.ts",
            appFile: "./examples/authorize-site/src/main.tsx",
            appId: "authorize-site",
            pagesDir: "./examples/authorize-site/src/pages",
            outDir: "dist/examples/authorize-site",
        },
        {
            name: "di-http-site",
            rootDir: "./examples/di-http-site",
            viteConfig: "./vite.config.di-http-site.ts",
            appFile: "./examples/di-http-site/src/main.tsx",
            appId: "site",
            pagesDir: "./examples/di-http-site/src/pages",
            outDir: "dist/examples/di-http-site",
        },
        {
            name: "typecase-site",
            rootDir: "./typecase-site",
            viteConfig: "./vite.config.typecase-site.ts",
            appFile: "./typecase-site/src/main.tsx",
            appId: "typecase-site",
            pagesDir: "./typecase-site/src/pages",
            outDir: "dist/typecase-site",
        },
        {
            name: "docs",
            rootDir: "./docs-site",
            viteConfig: "./vite.config.docs-site.ts",
            appFile: "./docs-site/src/main.tsx",
            appId: "docs-site",
            pagesDir: "./docs-site/src/pages",
            buildConfig: "./docs-site/mainz.build.ts",
            outDir: "dist/docs",
        },
    ],
});
