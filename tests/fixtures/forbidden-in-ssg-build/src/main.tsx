import { defineApp, startApp } from "mainz";
import { ForbiddenInSsgHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "forbidden-in-ssg-build",
    pages: [ForbiddenInSsgHomePage],
});

startApp(app, {
    mount: "#app",
});
