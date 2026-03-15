import { startPagesApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [HomePage],
    notFound: NotFoundPage,
});
