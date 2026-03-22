import { startPagesApp } from "mainz";
import { StableNameHomePage } from "./pages/Home.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [StableNameHomePage],
});
