import { defineApp, startApp } from "mainz";
import { FixtureNavigationOverrideHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "navigation-override",
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [FixtureNavigationOverrideHomePage],
});

startApp(app, {
    mount: "#app",
});
