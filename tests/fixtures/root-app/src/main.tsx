import { defineApp, startApp } from "mainz";
import { RootAppHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "root-app",
    pages: [RootAppHomePage],
});

startApp(app, {
    mount: "#app",
});
