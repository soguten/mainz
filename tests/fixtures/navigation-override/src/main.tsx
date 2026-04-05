import { defineApp, startApp } from "mainz";
import { FixtureNavigationOverrideHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "navigation-override",
    pages: [FixtureNavigationOverrideHomePage],
});

startApp(app, {
    mount: "#app",
});
