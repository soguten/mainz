import { defineApp, startApp } from "mainz";
import { RoutedAppHomePage } from "./pages/Home.page.tsx";
import { RoutedAppNotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    pages: [RoutedAppHomePage],
    notFound: RoutedAppNotFoundPage,
});

startApp(app, {
    mount: "#app",
});
