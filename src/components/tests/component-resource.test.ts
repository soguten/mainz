/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { defineResource } from "../../resources/index.ts";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import("./component-resource.fixture.tsx") as typeof import("./component-resource.fixture.tsx");

async function flushComponentResourceUpdates(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function captureConsoleWarnings(): {
    warnings: string[];
    restore(): void;
} {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        warnings.push(args.map((value) => String(value)).join(" "));
    };

    return {
        warnings,
        restore() {
            console.warn = originalWarn;
        },
    };
}

Deno.test("components/component-resource: should inherit fallback and strategy from the owner component decorator", async () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    const Harness = fixtures.createComponentResourceHarness(resource);
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    await flushComponentResourceUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Alexandre");
    screen.cleanup();
});

Deno.test("components/component-resource: should use decorator errorFallback through the owner component", async () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            throw new Error("auth failed");
        },
    });

    const Harness = fixtures.createComponentResourceHarness(resource);
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    await flushComponentResourceUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "auth failed");
    screen.cleanup();
});

Deno.test("components/component-resource: should fail when the owner component does not declare @RenderStrategy(...)", () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    const Harness = fixtures.createComponentResourceHarnessWithoutStrategy(resource);

    let thrown: unknown;

    try {
        renderMainzComponent(Harness);
    } catch (error) {
        thrown = error;
    }

    assertEquals(
        thrown instanceof Error ? thrown.message : thrown,
        'ComponentResource owner "MissingStrategyComponentResourceHarness" must declare @RenderStrategy(...). ' +
            "ComponentResource requires a fixed component-level render strategy.",
    );
});

Deno.test("components/component-resource: should warn when deferred owner omits a fallback", () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    const Harness = fixtures.createComponentResourceHarnessWithoutFallback(resource);
    const warningCapture = captureConsoleWarnings();

    try {
        const screen = renderMainzComponent(Harness);
        assertEquals(screen.container.textContent ?? "", "");
        assertEquals(warningCapture.warnings, [
            'ComponentResource owner "MissingFallbackComponentResourceHarness" uses @RenderStrategy("deferred") without a fallback. Add a fallback to make the component\'s async placeholder explicit.',
        ]);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});
