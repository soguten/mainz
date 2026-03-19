import { startPagesApp } from "mainz";
import { CoreContractsHomePage } from "./pages/Home.page.tsx";
import { CoreContractsNotFoundPage } from "./pages/NotFound.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [CoreContractsHomePage],
    notFound: CoreContractsNotFoundPage,
});
