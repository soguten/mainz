import { defineApp, startApp } from "mainz";
import { singleton } from "mainz/di";
import { RoutedDiClientStoryPage } from "./pages/Story.page.tsx";
import {
    ClientRouteBoardService,
    ClientStorySummaryService,
} from "./services/client-story-services.ts";

const app = defineApp({
    id: "routed-di-client-app",
    pages: [RoutedDiClientStoryPage],
    services: [
        singleton(ClientRouteBoardService),
        singleton(ClientStorySummaryService),
    ],
});

startApp(app, {
    mount: "#app",
});
