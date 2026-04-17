import { defineApp, startApp } from "mainz";
import { FixtureHeadSeoHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "head-seo",
    i18n: {
        locales: ["en", "pt"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [FixtureHeadSeoHomePage],
});

startApp(app, {
    mount: "#app",
});
