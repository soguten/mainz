import { startApp } from "mainz";
import { FixtureBasePathHomePage } from "./pages/Home.page.tsx";
import { FixtureBasePathNotFoundPage } from "./pages/NotFound.page.tsx";

startApp({
    mount: "#app",
    pages: [FixtureBasePathHomePage],
    notFound: FixtureBasePathNotFoundPage,
});
