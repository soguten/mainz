import { defineApp, startApp } from "mainz";
import { ForbiddenInSsgHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    pages: [ForbiddenInSsgHomePage],
});

startApp(app, {
    mount: "#app",
});
