/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { createAppDictionaryI18n } from "../index.ts";
import { withHappyDom } from "../../ssg/happy-dom.ts";

Deno.test({
    name: "i18n/app: should prefer locale from path segment",
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await withHappyDom(async () => {
            const i18n = createAppDictionaryI18n({
                defaultLocale: "en",
                dictionaries: {
                    en: { common: { title: "Hello" } },
                    pt: { common: { title: "Ola" } },
                },
            });

            assertEquals(i18n.getLocale(), "pt");
            assertEquals(i18n.t("common.title"), "Ola");
        }, { url: "https://mainz.local/pt/" });
    },
});

Deno.test({
    name: "i18n/app: should fallback to html lang when path has no locale",
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await withHappyDom(async () => {
            document.documentElement.lang = "pt";

            const i18n = createAppDictionaryI18n({
                defaultLocale: "en",
                dictionaries: {
                    en: { common: { title: "Hello" } },
                    pt: { common: { title: "Ola" } },
                },
            });

            assertEquals(i18n.getLocale(), "pt");
            assertEquals(i18n.t("common.title"), "Ola");
        }, { url: "https://mainz.local/docs/" });
    },
});

Deno.test({
    name: "i18n/app: should allow disabling path detection",
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await withHappyDom(async () => {
            const i18n = createAppDictionaryI18n({
                defaultLocale: "en",
                dictionaries: {
                    en: { common: { title: "Hello" } },
                    pt: { common: { title: "Ola" } },
                },
                detect: {
                    path: false,
                    document: false,
                    navigator: false,
                },
            });

            assertEquals(i18n.getLocale(), "en");
            assertEquals(i18n.t("common.title"), "Hello");
        }, { url: "https://mainz.local/pt/" });
    },
});
