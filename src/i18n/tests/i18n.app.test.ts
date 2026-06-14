/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  getLocale,
  t,
} from "../index.ts";
import { withHappyDom } from "../../ssg/happy-dom.ts";
import { MAINZ_LOCALE_CHANGE_EVENT } from "../../runtime-events.ts";
import { installTestAppI18n } from "./fixtures.ts";

Deno.test({
  name: "i18n/app: installed app runtime should prefer locale from path segment",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n();

      assertEquals(getLocale(), "pt");
      assertEquals(t("common.title"), "Ola");
    }, { url: "https://mainz.local/pt/" });
  },
});

Deno.test({
  name: "i18n/app: installed app runtime should fallback to html lang when path has no locale",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      document.documentElement.lang = "pt";

      installTestAppI18n();

      assertEquals(getLocale(), "pt");
      assertEquals(t("common.title"), "Ola");
    }, { url: "https://mainz.local/docs/" });
  },
});

Deno.test({
  name:
    "i18n/app: installed app runtime should fallback to html lang when a base path comes before the locale segment",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      document.documentElement.lang = "pt";

      installTestAppI18n();

      assertEquals(getLocale(), "pt");
      assertEquals(t("common.title"), "Ola");
    }, { url: "https://mainz.local/mainz/pt/" });
  },
});

Deno.test({
  name: "i18n/app: installed app runtime should fallback to default locale when no stronger signal exists",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n();

      assertEquals(getLocale(), "en");
      assertEquals(t("common.title"), "Hello");
    }, { url: "https://mainz.local/" });
  },
});

Deno.test({
  name: "i18n/app: installed app runtime should follow Mainz locale change events after startup",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n();

      document.dispatchEvent(
        new CustomEvent(MAINZ_LOCALE_CHANGE_EVENT, {
          detail: {
            locale: "pt",
            url: "https://mainz.local/pt/",
            basePath: "/",
          },
        }),
      );

      assertEquals(getLocale(), "pt");
      assertEquals(t("common.title"), "Ola");
    }, { url: "https://mainz.local/" });
  },
});
