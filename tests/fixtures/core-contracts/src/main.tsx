import { defineApp, startApp } from "mainz";
import { CoreContractsHomePage } from "./pages/Home.page.tsx";
import { CoreContractsNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    id: "core-contracts",
    pages: [CoreContractsHomePage],
    notFound: CoreContractsNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
