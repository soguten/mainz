import { defineApp, startApp } from "mainz";
import { LocalizedHomePage } from "./pages/Home.page.tsx";
import { LocalizedNotFoundPage } from "./pages/NotFound.page.tsx";
import { LocalizedQuickstartPage } from "./pages/Quickstart.page.tsx";
import en from "./i18n/locales/en.ts";
import pt from "./i18n/locales/pt.ts";

const app = defineApp({
  id: "localized-app",
  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    localePrefix: "except-default",
    dictionaries: { en, pt },
  },
  pages: [LocalizedHomePage, LocalizedQuickstartPage],
  notFound: LocalizedNotFoundPage,
});

startApp(app, {
  mount: "#app",
});
