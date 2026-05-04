import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    id: "site",
    navigation: "enhanced-mpa",
    i18n: {
        locales: ["en", "pt"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [HomePage],
    notFound: NotFoundPage,
});

startApp(app, {
    mount: "#app",
});
