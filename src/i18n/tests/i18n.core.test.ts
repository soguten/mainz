/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import {
    createDictionaryI18n,
    normalizeLocaleTag,
    toLocalePathSegment,
    validateMessagesForLocales,
} from "../index.ts";

Deno.test("i18n/core: should normalize locale tags and locale path segment", () => {
    assertEquals(normalizeLocaleTag("en-us"), "en-US");
    assertEquals(normalizeLocaleTag("pt_br"), "pt-BR");
    assertEquals(normalizeLocaleTag("zh-hant-hk"), "zh-Hant-HK");
    assertEquals(toLocalePathSegment("pt-BR"), "pt-br");
});

Deno.test("i18n/core: should resolve locale and fallback to base language", () => {
    const i18n = createDictionaryI18n({
        defaultLocale: "en",
        locales: ["en", "pt-BR"],
        dictionaries: {
            en: { common: { title: "Hello" } },
            "pt-BR": { common: { title: "Ola" } },
        },
        initialLocale: "pt-PT",
    });

    assertEquals(i18n.getLocale(), "pt-BR");
    assertEquals(i18n.t("common.title"), "Ola");
});

Deno.test("i18n/core: should return key when translation is missing", () => {
    const i18n = createDictionaryI18n({
        defaultLocale: "en",
        locales: ["en"],
        dictionaries: {
            en: { common: { title: "Hello" } },
        },
    });

    assertEquals(i18n.t("common.unknown"), "common.unknown");
});

Deno.test("i18n/core: should validate message availability for all locales", async () => {
    await validateMessagesForLocales(["en", "pt-BR"], async (locale) => {
        if (locale === "en") {
            return { common: { title: "Hello" } };
        }

        if (locale === "pt-BR") {
            return { common: { title: "Ola" } };
        }

        return {};
    });

    await assertRejects(
        async () => {
            await validateMessagesForLocales(["en", "pt-BR"], async (locale) => {
                if (locale === "en") {
                    return { common: { title: "Hello" } };
                }

                if (locale === "pt-BR") {
                    return {};
                }

                return {};
            });
        },
        Error,
        "has no resolvable messages",
    );
});
