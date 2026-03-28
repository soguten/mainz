import { startApp } from "mainz";
import { CoreContractsHomePage } from "./pages/Home.page.tsx";
import { CoreContractsNotFoundPage } from "./pages/NotFound.page.tsx";

startApp({
    mount: "#app",
    pages: [CoreContractsHomePage],
    notFound: CoreContractsNotFoundPage,
});
