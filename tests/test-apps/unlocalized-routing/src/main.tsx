import { defineApp, startApp } from "mainz";
import { FixtureUnlocalizedRoutingHomePage } from "./pages/Home.page.tsx";
import { FixtureUnlocalizedRoutingQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
  id: "unlocalized-routing",
  pages: [
    FixtureUnlocalizedRoutingHomePage,
    FixtureUnlocalizedRoutingQuickstartPage,
  ],
});

startApp(app, {
  mount: "#app",
});
