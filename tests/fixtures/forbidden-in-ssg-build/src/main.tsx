import { startApp } from "mainz";
import { ForbiddenInSsgHomePage } from "./pages/Home.page.tsx";

startApp({
    mount: "#app",
    pages: [ForbiddenInSsgHomePage],
});
