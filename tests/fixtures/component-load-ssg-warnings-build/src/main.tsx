import { defineApp, startApp } from "mainz";
import { ComponentLoadSsgWarningsHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "component-load-ssg-warnings-build",
    pages: [ComponentLoadSsgWarningsHomePage],
});

startApp(app, {
    mount: "#app",
});
