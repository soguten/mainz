import { defineApp, startApp } from "mainz";
import { StableNameHomePage } from "./pages/Home.page.tsx";

const app = defineApp({
    id: "custom-element-generated-tag-stability",
    pages: [StableNameHomePage],
});

startApp(app, {
    mount: "#app",
});
