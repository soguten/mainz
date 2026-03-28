import { startApp } from "mainz";
import { singleton } from "mainz/di";
import { HttpClient } from "mainz/http";
import { createDiHttpExampleFetch, HttpStoriesApi, MockStoriesApi, StoriesApi } from "./lib/api.ts";
import { readBackendMode } from "./lib/runtime.ts";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";
import { StoryPage } from "./pages/Story.page.tsx";

const backendMode = readBackendMode();

startApp({
    mount: "#app",
    pages: [HomePage, StoryPage],
    notFound: NotFoundPage,
    services: [
        singleton(HttpClient, () =>
            new HttpClient({
                baseUrl: "https://di-http.mainz.example",
                headers: {
                    "x-mainz-example": "di-http-site",
                },
                timeoutMs: 2500,
                fetch: createDiHttpExampleFetch({ latencyMs: 320 }),
            })),
        singleton(
            StoriesApi,
            ({ get }) =>
                backendMode === "mock" ? new MockStoriesApi() : new HttpStoriesApi(get(HttpClient)),
        ),
    ],
});
