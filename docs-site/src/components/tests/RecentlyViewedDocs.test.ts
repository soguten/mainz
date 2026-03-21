/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const { RecentlyViewedDocs, recordRecentlyViewedDoc } = await import("../RecentlyViewedDocs.tsx") as typeof import("../RecentlyViewedDocs.tsx");

const STORAGE_KEY = "mainz-docs-recent-pages";

Deno.test("RecentlyViewedDocs renders the client-only fallback before hydration resolves", () => {
    localStorage.removeItem(STORAGE_KEY);

    const view = renderMainzComponent(RecentlyViewedDocs, {
        props: { currentSlug: "routing" },
    });

    try {
        assertEquals(
            view.getBySelector(".docs-recent-pages-empty").textContent,
            "Recent pages appear after you browse the docs in this browser.",
        );
    } finally {
        view.cleanup();
        localStorage.removeItem(STORAGE_KEY);
    }
});

Deno.test("RecentlyViewedDocs resolves recent docs from local storage after hydration", async () => {
    recordRecentlyViewedDoc({ slug: "quickstart", title: "Quickstart" });
    recordRecentlyViewedDoc({ slug: "routing", title: "Routing Modes" });
    recordRecentlyViewedDoc({ slug: "page-model", title: "Page Model" });

    const view = renderMainzComponent(RecentlyViewedDocs, {
        props: { currentSlug: "routing" },
    });

    try {
        await Promise.resolve();
        await Promise.resolve();

        const links = view.container.querySelectorAll(".docs-nav-link-recent");
        assertEquals(links.length, 2);
        assertEquals(links[0]?.textContent?.trim(), "Page Model");
        assertEquals((links[0] as HTMLAnchorElement | undefined)?.getAttribute("href"), "/page-model");
        assertEquals(links[1]?.textContent?.trim(), "Quickstart");
    } finally {
        view.cleanup();
        localStorage.removeItem(STORAGE_KEY);
    }
});

