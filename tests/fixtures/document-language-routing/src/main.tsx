import { defineApp, startApp } from "mainz";
import { FixtureDocumentLanguageHomePage } from "./pages/Home.page.tsx";
import { FixtureDocumentLanguageQuickstartPage } from "./pages/Quickstart.page.tsx";

const app = defineApp({
    id: "document-language-routing",
    documentLanguage: "pt-BR",
    pages: [FixtureDocumentLanguageHomePage, FixtureDocumentLanguageQuickstartPage],
});

startApp(app, {
    mount: "#app",
});
