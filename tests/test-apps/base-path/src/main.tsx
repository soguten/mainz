import { defineApp, startApp } from "mainz";
import { FixtureBasePathHomePage } from "./pages/Home.page.tsx";
import { FixtureBasePathNotFoundPage } from "./pages/NotFound.page.tsx";
import { FixtureBasePathQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
  id: "base-path",
  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    localePrefix: "except-default",
  },
  pages: [FixtureBasePathHomePage, FixtureBasePathQuickstartPage],
  notFound: FixtureBasePathNotFoundPage,
});

startApp(app, {
  mount: "#app",
});
