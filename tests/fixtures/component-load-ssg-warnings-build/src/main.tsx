import { startApp } from "mainz";
import { ComponentLoadSsgWarningsHomePage } from "./pages/Home.page.tsx";

startApp({
    mount: "#app",
    pages: [ComponentLoadSsgWarningsHomePage],
});
