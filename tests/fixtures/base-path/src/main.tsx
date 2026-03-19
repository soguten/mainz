import { startPagesApp } from "mainz";
import { FixtureBasePathHomePage } from "./pages/Home.page.tsx";
import { FixtureBasePathNotFoundPage } from "./pages/NotFound.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [FixtureBasePathHomePage],
    notFound: FixtureBasePathNotFoundPage,
});
