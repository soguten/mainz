/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import(
    "./component.load.fixture.tsx"
) as typeof import("./component.load.fixture.tsx");

function createPendingRequest<T>() {
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

Deno.test("components/component load: should allow render(data: unknown) when Data is omitted", () => {
    const Harness = fixtures.createUnknownRenderDataHarness();
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Unknown Intro");
    screen.cleanup();
});

Deno.test("components/component load: should render placeholder before defer load resolves", async () => {
    const request = createPendingRequest<{ title: string }>();
    const Harness = fixtures.createDeferLoadHarness(() => request.promise);
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    request.resolve({ title: "Routing" });
    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/component load: should render placeholder-in-ssg output during ssg build", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    let loadCalls = 0;
    const Harness = fixtures.createDeferLoadHarness(() => {
        loadCalls += 1;
        return { title: "Preview" };
    }, {
        policy: "placeholder-in-ssg",
    });
    const screen = renderMainzComponent(Harness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
    assertEquals(loadCalls, 0);
    screen.cleanup();
});

Deno.test("components/component load: should resolve placeholder-in-ssg component in the browser runtime", async () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "client",
    });

    const Harness = fixtures.createDeferLoadHarness(
        async () => ({ title: "Preview" }),
        {
            policy: "placeholder-in-ssg",
        },
    );
    const screen = renderMainzComponent(Harness);

    await flushComponentLoadUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Preview");
    screen.cleanup();
});

Deno.test("components/component load: should warn when explicit defer has no placeholder()", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const Harness = fixtures.createExplicitDeferLoadHarness(
            async () => ({ title: "Routing" }),
            { withPlaceholder: false },
        );
        const screen = renderMainzComponent(Harness);

        assertEquals(screen.container.textContent ?? "", "");
        assertEquals(warningCapture.warnings, [
            'Component "DeferDocsPanelWithoutPlaceholder" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
        ]);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});

Deno.test("components/component load: should not warn when placeholder-in-ssg provides placeholder()", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const Harness = fixtures.createDeferLoadHarness(
            async () => ({ title: "Preview" }),
            {
                policy: "placeholder-in-ssg",
            },
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
        'Component "LivePreviewPanel" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG.',
    );
});

Deno.test("components/component load: should reload when props change and ignore stale resolutions", async () => {
    const calls: string[] = [];
    const requests = new Map<string, ReturnType<typeof createPendingRequest<{ title: string }>>>([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
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

Deno.test("components/component load: should abort the previous defer load when props change", async () => {
    const calls: string[] = [];
    const observedAborts: string[] = [];
    const requests = new Map<string, ReturnType<typeof createPendingRequest<{ title: string }>>>([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
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

Deno.test("components/component load: should abort an in-flight defer load on cleanup", async () => {
    const request = createPendingRequest<{ title: string }>();
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

Deno.test("components/component load: should not render the error placeholder path when an aborted load rejects with AbortError", async () => {
    const calls: string[] = [];
    const observedAborts: string[] = [];
    const requests = new Map<string, ReturnType<typeof createPendingRequest<{ title: string }>>>([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
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

Deno.test("components/component load: should abort stale work across multiple defer children when the host props change", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
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

    assertEquals(
        screen.getBySelector("[data-role='primary-status']").textContent,
        "Primary Routing",
    );
    assertEquals(
        screen.getBySelector("[data-role='secondary-status']").textContent,
        "Secondary Routing",
    );
    screen.cleanup();
});

Deno.test("components/component load: should keep abort and real error isolated across defer sibling components", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
        ["routing", createPendingRequest<{ title: string }>()],
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

    assertEquals(
        screen.getBySelector("[data-role='primary-status']").textContent,
        "Primary Routing",
    );
    assertEquals(
        screen.getBySelector("[data-role='secondary-status']").textContent,
        "Secondary failed",
    );
    screen.cleanup();
});

Deno.test("components/component load: should abort in-flight defer sibling loads when the host tree is cleaned up", async () => {
    const primaryCalls: string[] = [];
    const secondaryCalls: string[] = [];
    const primaryObservedAborts: string[] = [];
    const secondaryObservedAborts: string[] = [];
    const primaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
    ]);
    const secondaryRequests = new Map<
        string,
        ReturnType<typeof createPendingRequest<{ title: string }>>
    >([
        ["intro", createPendingRequest<{ title: string }>()],
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
