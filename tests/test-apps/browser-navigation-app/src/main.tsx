import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { QuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
  id: "browser-navigation-app",
  pages: [HomePage, QuickstartPage],
});

startApp(app, {
  mount: "#app",
});
