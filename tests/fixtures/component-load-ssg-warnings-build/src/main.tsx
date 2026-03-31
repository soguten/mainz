import { defineApp, startApp } from "mainz";
import { ComponentLoadSsgWarningsHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    pages: [ComponentLoadSsgWarningsHomePage],
});

startApp(app, {
    mount: "#app",
});
