import { startPagesApp } from "mainz";
import { FixtureSingleLocaleHomePage } from "./pages/Home.page.tsx";
import { FixtureSingleLocaleQuickstartPage } from "./pages/Quickstart.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [FixtureSingleLocaleHomePage, FixtureSingleLocaleQuickstartPage],
});
