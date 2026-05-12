import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";

const app = defineApp({
  id: "ssr-build-app",
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  pages: [HomePage],
});

startApp(app, {
  mount: "#app",
});
