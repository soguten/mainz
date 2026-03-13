import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            viteConfig: "./vite.config.site.ts",
            routes: "./site/routes.ts",
            routing: "explicit",
            locales: ["en", "pt"],
            outDir: "dist/site",
            defaultMode: "ssg",
        },
        {
            name: "playground",
            rootDir: "./playground",
            viteConfig: "./vite.config.playground.ts",
            routes: "./playground/routes.ts",
            routing: "explicit",
            locales: ["en"],
            outDir: "dist/playground",
            defaultMode: "ssg",
        },
    ],
    render: {
        modes: ["csr", "ssg"],
    },
    i18n: {
        defaultLocale: "en",
        locales: ["en", "pt"],
        localePrefix: "auto",
        detectLocale: "path-first",
        fallbackLocale: "en",
    },
});
