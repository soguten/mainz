import { startPagesApp } from "mainz";
import { ForbiddenInSsgHomePage } from "./pages/Home.page.tsx";

startPagesApp({
    mount: "#app",
    pages: [ForbiddenInSsgHomePage],
});
