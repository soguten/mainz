import { startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

startApp({
    mount: "#app",
    pages: [HomePage],
    notFound: NotFoundPage,
});
