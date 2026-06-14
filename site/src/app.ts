import { defineApp } from "mainz";
import { assets } from "./assets.ts";
import en from "./i18n/locales/en.ts";
import pt from "./i18n/locales/pt.ts";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

export const app = defineApp({
  id: "site",
  navigation: "mpa",
  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    localePrefix: "except-default",
    dictionaries: {
      en,
      pt,
    },
  },
  pages: [HomePage],
  notFound: NotFoundPage,
  assets: assets,
});
