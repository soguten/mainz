import { defineApp, startApp } from "mainz";
import { FixtureBasePathHomePage } from "./pages/Home.page.tsx";
import { FixtureBasePathNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    id: "base-path",
    pages: [FixtureBasePathHomePage],
    notFound: FixtureBasePathNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
