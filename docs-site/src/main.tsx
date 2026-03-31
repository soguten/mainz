import { defineApp, startApp } from "mainz";
import { DocsPage } from "./pages/Docs.page.tsx";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    pages: [HomePage, DocsPage],
    notFound: NotFoundPage,
});

startApp(app, {
    mount: "#app",
});
