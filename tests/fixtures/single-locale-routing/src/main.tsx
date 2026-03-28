import { startApp } from "mainz";
import { FixtureSingleLocaleHomePage } from "./pages/Home.page.tsx";
import { FixtureSingleLocaleQuickstartPage } from "./pages/Quickstart.page.tsx";

startApp({
    mount: "#app",
    pages: [FixtureSingleLocaleHomePage, FixtureSingleLocaleQuickstartPage],
});
