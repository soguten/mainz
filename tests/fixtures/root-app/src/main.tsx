import { defineApp, startApp } from "mainz";
import { RootAppHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "root-app",
    i18n: {
        locales: ["en", "pt"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [RootAppHomePage],
});

startApp(app, {
    mount: "#app",
});
