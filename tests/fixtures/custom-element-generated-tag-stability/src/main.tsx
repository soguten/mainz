import { startApp } from "mainz";
import { StableNameHomePage } from "./pages/Home.page.tsx";

startApp({
    mount: "#app",
    pages: [StableNameHomePage],
});
