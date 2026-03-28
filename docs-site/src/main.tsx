import { startApp } from "mainz";
import { DocsPage } from "./pages/Docs.page.tsx";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

startApp({
    mount: "#app",
    pages: [HomePage, DocsPage],
    notFound: NotFoundPage,
});
