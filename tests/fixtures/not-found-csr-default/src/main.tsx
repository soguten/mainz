import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    id: "not-found-csr-default",
    pages: [HomePage],
    notFound: NotFoundPage,
});

startApp(app, {
    mount: "#app",
});
