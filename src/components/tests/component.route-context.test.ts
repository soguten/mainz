/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const mainz = await import("../index.ts") as typeof import("../index.ts");
const fixtures = await import("./component.route-context.fixture.tsx") as typeof import(
    "./component.route-context.fixture.tsx"
);

Deno.test("components/route-context: should expose route context to descendant component load() and this.route without prop drilling", () => {
    const route = mainz.createPageLoadContext({
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        params: { slug: "intro" },
        locale: "pt",
        url: new URL("https://example.com/docs/intro"),
        renderMode: "ssg",
        navigationMode: "spa",
    }).route;

    const screen = renderMainzComponent(fixtures.RouteAwarePageHost, {
        props: {
            route,
        },
    });

    try {
        assertEquals(
            screen.getBySelector('[data-role="route-panel"]').textContent,
            "intro:pt",
        );
    } finally {
        screen.cleanup();
    }
});
