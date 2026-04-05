import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            viteConfig: "./vite.config.site.ts",
            pagesDir: "./site/src/pages",
            buildConfig: "./site/mainz.build.ts",
            locales: ["en", "pt"],
            i18n: {
                defaultLocale: "en",
                localePrefix: "auto",
                fallbackLocale: "en",
            },
            outDir: "dist/site",
        },
        {
            name: "playground",
            rootDir: "./playground",
            viteConfig: "./vite.config.playground.ts",
            locales: ["en"],
            outDir: "dist/playground",
        },
        {
            name: "authorize-site",
            rootDir: "./examples/authorize-site",
            viteConfig: "./vite.config.authorize-site.ts",
            pagesDir: "./examples/authorize-site/src/pages",
            locales: ["en"],
            authorization: {
                policyNames: ["org-member"],
            },
            outDir: "dist/examples/authorize-site",
        },
        {
            name: "di-http-site",
            rootDir: "./examples/di-http-site",
            viteConfig: "./vite.config.di-http-site.ts",
            pagesDir: "./examples/di-http-site/src/pages",
            locales: ["en"],
            outDir: "dist/examples/di-http-site",
        },
        {
            name: "docs",
            rootDir: "./docs-site",
            viteConfig: "./vite.config.docs-site.ts",
            pagesDir: "./docs-site/src/pages",
            buildConfig: "./docs-site/mainz.build.ts",
            locales: ["en"],
            i18n: {
                defaultLocale: "en",
                localePrefix: "auto",
                fallbackLocale: "en",
            },
            outDir: "dist/docs",
        },
    ],
});
