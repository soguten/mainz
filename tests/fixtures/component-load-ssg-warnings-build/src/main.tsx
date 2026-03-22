import { startPagesApp } from "mainz";
import { ComponentLoadSsgWarningsHomePage } from "./pages/Home.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [ComponentLoadSsgWarningsHomePage],
});
