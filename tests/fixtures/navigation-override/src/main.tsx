import { startPagesApp } from "mainz";
import { FixtureNavigationOverrideHomePage } from "./pages/Home.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [FixtureNavigationOverrideHomePage],
});
