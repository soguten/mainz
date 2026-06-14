/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { withHappyDom } from "../../ssg/happy-dom.ts";
import {
  buildLocaleHref,
  buildLocaleRootHref,
  getLocale,
  setLocale,
  t,
} from "../index.ts";
import { installTestAppI18n } from "./fixtures.ts";

Deno.test({
  name: "i18n/app-runtime: should interpolate string translations from app dictionaries",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n();

      assertEquals(t("greeting", { name: "Alex" }), "Hello, Alex");
      setLocale("pt");
      assertEquals(t("greeting", { name: "Alex" }), "Ola, Alex");
    });
  },
});

Deno.test({
  name: "i18n/app-runtime: should build locale hrefs from app i18n configuration",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n({
        localePrefix: "except-default",
      });

      window.history.replaceState(null, "", "/pt/");
      assertEquals(getLocale(), "pt");
      assertEquals(
        buildLocaleHref("en", {
          locationLike: {
            pathname: "/pt/",
            search: "",
            hash: "#trilha",
          },
          hashDictionaryPath: "anchors",
        }),
        "/#journey",
      );
      assertEquals(
        buildLocaleHref("pt", {
          locationLike: {
            pathname: "/missing-route",
            search: "",
            hash: "",
          },
        }),
        "/pt/missing-route/",
      );
    }, { url: "https://mainz.local/pt/" });
  },
});

Deno.test({
  name: "i18n/app-runtime: should build localized app root hrefs directly",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await withHappyDom(async () => {
      installTestAppI18n({
        localePrefix: "except-default",
      });

      assertEquals(buildLocaleRootHref("en"), "/");
      assertEquals(buildLocaleRootHref("pt"), "/pt/");
    });
  },
});
