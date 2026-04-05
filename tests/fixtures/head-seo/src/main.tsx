import { defineApp, startApp } from "mainz";
import { FixtureHeadSeoHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "head-seo",
    pages: [FixtureHeadSeoHomePage],
});

startApp(app, {
    mount: "#app",
});
