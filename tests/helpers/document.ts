import { assertEquals, assertStringIncludes } from "@std/assert";
import type { TestNavigationMode } from "./types.ts";

export function readCanonicalHref(): string | null {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
}

export function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
        ?.getAttribute("href") ?? null;
}

export function assertDocumentState(args: {
    navigation?: TestNavigationMode;
    locale?: string;
    title?: string;
    bodyIncludes?: string | readonly string[];
}): void {
    if (args.navigation) {
        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
    }

    if (args.locale) {
        assertEquals(document.documentElement.lang, args.locale);
    }

    if (typeof args.title === "string") {
        assertEquals(document.title, args.title);
    }

    const snippets = typeof args.bodyIncludes === "string"
        ? [args.bodyIncludes]
        : args.bodyIncludes ?? [];

    for (const snippet of snippets) {
        assertStringIncludes(document.body.textContent ?? "", snippet);
    }
}

export function assertSeoState(args: {
    canonical?: string;
    alternates?: Readonly<Record<string, string>>;
}): void {
    if (typeof args.canonical === "string") {
        assertEquals(readCanonicalHref(), args.canonical);
    }

    for (const [hreflang, href] of Object.entries(args.alternates ?? {})) {
        assertEquals(readAlternateHref(hreflang), href);
    }
}
