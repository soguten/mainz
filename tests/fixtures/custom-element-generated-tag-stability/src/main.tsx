import { defineApp, startApp } from "mainz";
import { StableNameHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "custom-element-generated-tag-stability",
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [StableNameHomePage],
});

startApp(app, {
    mount: "#app",
});
