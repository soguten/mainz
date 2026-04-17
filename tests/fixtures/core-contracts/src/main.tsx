import { defineApp, startApp } from "mainz";
import { CoreContractsHomePage } from "./pages/Home.page.tsx";
import { CoreContractsNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    id: "core-contracts",
    i18n: {
        locales: ["en", "pt"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [CoreContractsHomePage],
    notFound: CoreContractsNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
