import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { InvalidNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    pages: [HomePage],
    notFound: InvalidNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
