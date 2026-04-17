import { defineApp, startApp } from "mainz";
import { ComponentLoadSsgWarningsHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "component-load-ssg-warnings-build",
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [ComponentLoadSsgWarningsHomePage],
});

startApp(app, {
    mount: "#app",
});
