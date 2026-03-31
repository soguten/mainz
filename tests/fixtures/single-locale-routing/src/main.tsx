import { defineApp, startApp } from "mainz";
import { FixtureSingleLocaleHomePage } from "./pages/Home.page.tsx";
import { FixtureSingleLocaleQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
    pages: [FixtureSingleLocaleHomePage, FixtureSingleLocaleQuickstartPage],
});

startApp(app, {
    mount: "#app",
});
