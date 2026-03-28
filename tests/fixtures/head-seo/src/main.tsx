import { startApp } from "mainz";
import { FixtureHeadSeoHomePage } from "./pages/Home.page.tsx";

startApp({
    mount: "#app",
    pages: [FixtureHeadSeoHomePage],
});
