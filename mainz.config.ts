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
            defaultMode: "ssg",
            defaultNavigation: "enhanced-mpa",
        },
        {
            name: "playground",
            rootDir: "./playground",
            viteConfig: "./vite.config.playground.ts",
            locales: ["en"],
            outDir: "dist/playground",
            defaultMode: "ssg",
            defaultNavigation: "spa",
        },
    ],
    render: {
        modes: ["csr", "ssg"],
    },
});
