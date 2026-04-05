import { defineApp, startApp } from "mainz";
import { singleton } from "mainz/di";
import { RoutedDiStoryPage } from "./pages/Story.page.tsx";
import {
    RouteAtlasConfigService,
    StoryCatalogService,
    StorySummaryService,
} from "./services/story-services.ts";

const app = defineApp({
    pages: [RoutedDiStoryPage],
    services: [
        singleton(RouteAtlasConfigService),
        singleton(StoryCatalogService),
        singleton(StorySummaryService),
    ],
});

startApp(app, {
    mount: "#app",
});
