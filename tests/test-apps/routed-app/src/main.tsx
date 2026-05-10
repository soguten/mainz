import { defineApp, startApp } from "mainz";
import { RoutedAppHomePage } from "./pages/Home.page.tsx";
import { RoutedAppNotFoundPage } from "./pages/NotFound.page.tsx";
import { RoutedAppQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
  id: "routed-app",
  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    localePrefix: "except-default",
  },
  pages: [RoutedAppHomePage, RoutedAppQuickstartPage],
  notFound: RoutedAppNotFoundPage,
});

startApp(app, {
  mount: "#app",
});
