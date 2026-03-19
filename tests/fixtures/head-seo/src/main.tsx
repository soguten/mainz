import { startPagesApp } from "mainz";
import { FixtureHeadSeoHomePage } from "./pages/Home.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [FixtureHeadSeoHomePage],
});
