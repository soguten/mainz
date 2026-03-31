import { defineApp, startApp } from "mainz";
import { StableNameHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    pages: [StableNameHomePage],
});

startApp(app, {
    mount: "#app",
});
