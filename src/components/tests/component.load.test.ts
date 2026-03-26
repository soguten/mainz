/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import(
    "./component.load.fixture.tsx"
) as typeof import("./component.load.fixture.tsx");

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function setMainzRuntimeEnvironment(args: {
    renderMode?: "csr" | "ssg";
    runtime?: "build" | "client";
}): void {
    if (args.renderMode) {
        (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__ = args.renderMode;
    } else {
        delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    }

    if (args.runtime) {
        (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = args.runtime;
    } else {
        delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    }
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

async function flushComponentLoadUpdates(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test.afterEach(() => {
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
});

Deno.test("components/component load: should expose blocking load data on the first render path", () => {
    const Harness = fixtures.createBlockingLoadHarness();
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Intro");
    screen.cleanup();
});

Deno.test("components/component load: should render fallback before deferred load resolves", async () => {
    const request = createDeferred<{ title: string }>();
    const Harness = fixtures.createDeferredLoadHarness(() => request.promise);
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    request.resolve({ title: "Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/component load: should skip client-only load during ssg build", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    let loadCalls = 0;
    const Harness = fixtures.createDeferredLoadHarness(() => {
        loadCalls += 1;
        return { title: "Preview" };
    }, "client-only");
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
    assertEquals(loadCalls, 0);
    screen.cleanup();
});

Deno.test("components/component load: should resolve client-only load in the browser runtime", async () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "client",
    });

    const Harness = fixtures.createDeferredLoadHarness(
        async () => ({ title: "Preview" }),
        "client-only",
    );
    const screen = renderMainzComponent(Harness);

    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Preview");
    screen.cleanup();
});

Deno.test("components/component load: should warn when deferred ssg placeholder has no fallback", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const Harness = fixtures.createDeferredLoadHarness(
            async () => ({ title: "Routing" }),
            "deferred",
            { withFallback: false },
        );
        const screen = renderMainzComponent(Harness);

        assertEquals(screen.container.textContent ?? "", "");
        assertEquals(warningCapture.warnings, [
            'Component "DeferredDocsPanel" uses @RenderStrategy("deferred") without a fallback. Add a fallback to make the component\'s async placeholder explicit.',
        ]);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});

Deno.test("components/component load: should not warn when client-only ssg placeholder provides a fallback", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const Harness = fixtures.createDeferredLoadHarness(
            async () => ({ title: "Preview" }),
            "client-only",
        );
        const screen = renderMainzComponent(Harness);

        assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
        assertEquals(warningCapture.warnings, []);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});

Deno.test("components/component load: should fail fast for forbidden-in-ssg during prerender", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const Harness = fixtures.createForbiddenInSsgHarness();

    assertThrows(
        () => renderMainzComponent(Harness),
        Error,
        'Component "LivePreviewPanel" uses @RenderStrategy("forbidden-in-ssg") and cannot be rendered during SSG.',
    );
});

Deno.test("components/component load: should reload when props change and ignore stale resolutions", async () => {
    const calls: string[] = [];
    const requests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createReloadHarness(calls, requests);
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
    assertEquals(calls, ["intro", "routing"]);

    requests.get("intro")?.resolve({ title: "Intro" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    requests.get("routing")?.resolve({ title: "Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/component load: should abort the previous deferred load when props change", async () => {
    const calls: string[] = [];
    const observedAborts: string[] = [];
    const requests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createAbortAwareReloadHarness({
        calls,
        observedAborts,
        requests,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    assertEquals(calls, ["intro", "routing"]);
    assertEquals(observedAborts, ["intro"]);

    requests.get("intro")?.resolve({ title: "Intro" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    requests.get("routing")?.resolve({ title: "Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/component load: should abort an in-flight deferred load on cleanup", async () => {
    const request = createDeferred<{ title: string }>();
    const startedLoads: string[] = [];
    const observedAborts: string[] = [];

    const Harness = fixtures.createAbortAwareCleanupHarness({
        startedLoads,
        observedAborts,
        request: request.promise,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
    assertEquals(startedLoads, ["intro"]);

    screen.cleanup();
    await flushComponentLoadUpdates();

    assertEquals(observedAborts, ["intro"]);
});

Deno.test("components/component load: should not render the error fallback when an aborted load rejects with AbortError", async () => {
    const calls: string[] = [];
    const observedAborts: string[] = [];
    const requests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createAbortRejectingReloadHarness({
        calls,
        observedAborts,
        requests,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    requests.get("intro")?.reject(new DOMException("stale load", "AbortError"));
    await flushComponentLoadUpdates();

    assertEquals(calls, ["intro", "routing"]);
    assertEquals(observedAborts, ["intro"]);
    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    requests.get("routing")?.resolve({ title: "Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/component load: should abort stale work across multiple deferred children when the host props change", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createMultiPanelAbortHarness({
        primaryCalls,
        secondaryCalls,
        primaryObservedAborts,
        secondaryObservedAborts,
        primaryRequests,
        secondaryRequests,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "loading");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "loading");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    assertEquals(primaryCalls, ["intro", "routing"]);
    assertEquals(secondaryCalls, ["intro", "routing"]);
    assertEquals(primaryObservedAborts, ["intro"]);
    assertEquals(secondaryObservedAborts, ["intro"]);

    primaryRequests.get("intro")?.resolve({ title: "Primary Intro" });
    secondaryRequests.get("intro")?.resolve({ title: "Secondary Intro" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "loading");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "loading");

    primaryRequests.get("routing")?.resolve({ title: "Primary Routing" });
    secondaryRequests.get("routing")?.resolve({ title: "Secondary Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "Primary Routing");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "Secondary Routing");
    screen.cleanup();
});

Deno.test("components/component load: should keep abort and real error isolated across deferred sibling components", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
        ["routing", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createMultiPanelAbortAndErrorHarness({
        primaryCalls,
        secondaryCalls,
        primaryObservedAborts,
        secondaryObservedAborts,
        primaryRequests,
        secondaryRequests,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "loading");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "loading");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    primaryRequests.get("intro")?.reject(new DOMException("stale load", "AbortError"));
    secondaryRequests.get("intro")?.reject(new DOMException("stale load", "AbortError"));
    await flushComponentLoadUpdates();

    assertEquals(primaryCalls, ["intro", "routing"]);
    assertEquals(secondaryCalls, ["intro", "routing"]);
    assertEquals(primaryObservedAborts, ["intro"]);
    assertEquals(secondaryObservedAborts, ["intro"]);
    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "loading");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "loading");

    primaryRequests.get("routing")?.resolve({ title: "Primary Routing" });
    secondaryRequests.get("routing")?.reject(new Error("Secondary failed"));
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "Primary Routing");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "Secondary failed");
    screen.cleanup();
});

Deno.test("components/component load: should abort in-flight deferred sibling loads when the host tree is cleaned up", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>([
        ["intro", createDeferred<{ title: string }>()],
    ]);

    const Harness = fixtures.createMultiPanelAbortHarness({
        primaryCalls,
        secondaryCalls,
        primaryObservedAborts,
        secondaryObservedAborts,
        primaryRequests,
        secondaryRequests,
    });
    const screen = renderMainzComponent(Harness, {
        props: { slug: "intro" },
    });

    assertEquals(screen.getBySelector("[data-role='primary-status']").textContent, "loading");
    assertEquals(screen.getBySelector("[data-role='secondary-status']").textContent, "loading");
    assertEquals(primaryCalls, ["intro"]);
    assertEquals(secondaryCalls, ["intro"]);

    const detachedHost = screen.component;
    screen.cleanup();

    assertEquals(primaryObservedAborts, ["intro"]);
    assertEquals(secondaryObservedAborts, ["intro"]);

    primaryRequests.get("intro")?.resolve({ title: "Primary Intro" });
    secondaryRequests.get("intro")?.resolve({ title: "Secondary Intro" });
    await flushComponentLoadUpdates();

    assertEquals(detachedHost.isConnected, false);
    assertEquals(detachedHost.textContent?.includes("Primary Intro") ?? false, false);
    assertEquals(detachedHost.textContent?.includes("Secondary Intro") ?? false, false);
});
