import { defineApp, startApp } from "mainz";
import { ForbiddenInSsgHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
  id: "forbidden-in-ssg-build",
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    localePrefix: "except-default",
  },
  pages: [ForbiddenInSsgHomePage],
});

startApp(app, {
  mount: "#app",
});
