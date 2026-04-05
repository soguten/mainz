import { defineApp, startApp } from "mainz";
import { RootAppHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    pages: [RootAppHomePage],
});

startApp(app, {
    mount: "#app",
});
