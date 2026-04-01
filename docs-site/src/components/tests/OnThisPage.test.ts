/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const fixtures = await import("./OnThisPage.fixture.tsx") as typeof import("./OnThisPage.fixture.tsx");

Deno.test("OnThisPage renders a deferred placeholder and then client headings", async () => {
    const view = renderMainzComponent(fixtures.OnThisPageHarness, {
        props: { route: fixtures.createDocsRoute("quickstart") },
    });

    try {
        assertEquals(
            view.getBySelector(".docs-on-this-page-placeholder").textContent,
            "Scanning sections...",
        );

        await Promise.resolve();
        await Promise.resolve();

        const links = view.container.querySelectorAll(".docs-on-this-page-link");
        assertEquals(links.length, 2);
        assertEquals(links[0]?.textContent, "Overview");
        assertEquals((links[0] as HTMLAnchorElement | undefined)?.getAttribute("href"), "#overview");
        assertEquals(links[1]?.textContent, "Details");
    } finally {
        view.cleanup();
    }
});
