import { defineApp } from "mainz";
import { singleton } from "mainz/di";
import { HttpClient } from "mainz/http";
import {
    createDiHttpExampleHttpClient,
    HttpStoriesApi,
    StoriesApi,
} from "./lib/api.ts";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";
import { StoryPage } from "./pages/Story.page.tsx";

export const app = defineApp({
    id: "site",
    navigation: "spa",
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [HomePage, StoryPage],
    notFound: NotFoundPage,
    services: [
        singleton(HttpClient, createDiHttpExampleHttpClient),
        singleton(StoriesApi, HttpStoriesApi),
    ],
});
