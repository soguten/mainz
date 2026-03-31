import { defineApp, startApp } from "mainz";
import { FixtureBasePathHomePage } from "./pages/Home.page.tsx";
import { FixtureBasePathNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    pages: [FixtureBasePathHomePage],
    notFound: FixtureBasePathNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
