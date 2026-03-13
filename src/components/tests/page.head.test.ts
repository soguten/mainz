/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import("./page.head.fixture.tsx") as typeof import("./page.head.fixture.tsx");

Deno.test("components/page head: should apply managed head tags when a Page is mounted", () => {
    const screen = renderMainzComponent(fixtures.HeadFixturePage);

    assertEquals(document.title, "Fixture Title");
    assertEquals(
        document.head.querySelector('meta[data-mainz-head-managed="true"][name="description"]')?.getAttribute("content"),
        "Fixture description",
    );
    assertEquals(
        document.head.querySelector('link[data-mainz-head-managed="true"][rel="canonical"]')?.getAttribute("href"),
        "/head",
    );

    screen.cleanup();
});
