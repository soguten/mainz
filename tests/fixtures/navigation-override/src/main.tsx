import { startApp } from "mainz";
import { FixtureNavigationOverrideHomePage } from "./pages/Home.page.tsx";

startApp({
    mount: "#app",
    pages: [FixtureNavigationOverrideHomePage],
});
