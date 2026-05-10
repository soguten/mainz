import { defineApp, startApp } from "mainz";
import { singleton } from "mainz/di";
import { EntriesDiStoryPage } from "./pages/Story.page.tsx";
import {
  BuildEntriesConfigService,
  StoryEntriesService,
  StorySlugCatalog,
} from "./services/story-services.ts";

const app = defineApp({
  id: "entries-di-build",
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    localePrefix: "except-default",
  },
  pages: [EntriesDiStoryPage],
  services: [
    singleton(BuildEntriesConfigService),
    singleton(StorySlugCatalog),
    singleton(StoryEntriesService),
  ],
});

export default app;

startApp(app, {
  mount: "#app",
});
