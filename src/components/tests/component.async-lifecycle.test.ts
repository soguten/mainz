/// <reference lib="deno.ns" />

/**
 * Async lifecycle tests
 *
 * Verifies that defer state updates do not rerender detached components
 * and remain safe when components are later reconnected.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./component.async-lifecycle.fixture.tsx") as typeof import("./component.async-lifecycle.fixture.tsx");

Deno.test("async lifecycle: defer updates should not rerender a detached component after cleanup", async () => {
    const screen = renderMainzComponent(fixtures.AsyncAfterUnmountComponent);

    assertEquals(screen.getBySelector("p").textContent, "init");

    screen.cleanup();
    await Promise.resolve();

    assertEquals(screen.component.state.status, "ready");
    assertEquals(screen.component.textContent, "init");
    assertEquals(document.getElementById("test-root"), null);
});

Deno.test("async lifecycle: defer state should render when the component is connected again", async () => {
    const screen = renderMainzComponent(fixtures.AsyncAfterUnmountComponent);
    const component = screen.component;

    screen.cleanup();
    await Promise.resolve();

    const reconnectHost = document.createElement("div");
    document.body.appendChild(reconnectHost);
    reconnectHost.appendChild(component);

    try {
        assertEquals(component.textContent, "ready");
    } finally {
        reconnectHost.remove();
    }
});
