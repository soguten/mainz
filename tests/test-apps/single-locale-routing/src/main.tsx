import { defineApp, startApp } from "mainz";
import { FixtureSingleLocaleHomePage } from "./pages/Home.page.tsx";
import { FixtureSingleLocaleQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
  id: "single-locale-routing",
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    localePrefix: "except-default",
  },
  pages: [FixtureSingleLocaleHomePage, FixtureSingleLocaleQuickstartPage],
});

startApp(app, {
  mount: "#app",
});
