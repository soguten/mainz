/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import type { Resource } from "../../resources/index.ts";
import { defineResource } from "../../resources/index.ts";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();
const fixtures = await import("./resource-boundary.fixture.tsx") as typeof import("./resource-boundary.fixture.tsx");

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

async function flushResourceBoundaryUpdates(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test.afterEach(() => {
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
});

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

Deno.test("components/resource-boundary: should render fallback before async resource resolves", async () => {
    const request = createDeferred<{ title: string }>();
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        load() {
            return request.promise;
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(resource as Resource<void, void, { title: string }>);
    const screen = renderMainzComponent(ResourceBoundaryHarness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    request.resolve({ title: "Intro" });
    await flushResourceBoundaryUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Intro");
    screen.cleanup();
});

Deno.test("components/resource-boundary: should render error fallback when resource rejects", async () => {
    const request = createDeferred<{ title: string }>();
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        load() {
            return request.promise;
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
        resource as Resource<void, void, { title: string }>,
        {
            errorFallback: (error: unknown) => error instanceof Error ? error.message : String(error),
        },
    );
    const screen = renderMainzComponent(ResourceBoundaryHarness);

    request.reject(new Error("boom"));
    await flushResourceBoundaryUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "boom");
    screen.cleanup();
});

Deno.test("components/resource-boundary: should reload when the resource key changes", async () => {
    const calls: string[] = [];
    const deferredBySlug = new Map<string, ReturnType<typeof createDeferred<{ title: string }>>>();
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        key(params: { slug: string }) {
            return ["docs", params.slug];
        },
        load(params: { slug: string }) {
            calls.push(params.slug);
            const deferred = createDeferred<{ title: string }>();
            deferredBySlug.set(params.slug, deferred);
            return deferred.promise;
        },
    });

    const ResourceBoundaryHarness = fixtures.createSlugResourceBoundaryHarness(
        resource as Resource<{ slug: string }, void, { title: string }>,
    );
    const screen = renderMainzComponent(ResourceBoundaryHarness, {
        props: { slug: "intro" },
    });

    await flushResourceBoundaryUpdates();
    deferredBySlug.get("intro")?.resolve({ title: "Intro" });
    await flushResourceBoundaryUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Intro");

    screen.component.props = { slug: "routing" };
    screen.component.rerender();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    await flushResourceBoundaryUpdates();
    deferredBySlug.get("routing")?.resolve({ title: "Routing" });
    await flushResourceBoundaryUpdates();

    assertEquals(calls, ["intro", "routing"]);
    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Routing");
    screen.cleanup();
});

Deno.test("components/resource-boundary: should keep fallback during ssg build for deferred resources", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    let loadCalls = 0;
    const resource = defineResource({
        name: "related-docs",
        visibility: "public" as const,
        execution: "either" as const,
        load() {
            loadCalls += 1;
            return [{ slug: "routing" }];
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(resource as Resource<void, void, { slug: string }[]>);
    const screen = renderMainzComponent(ResourceBoundaryHarness);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
    assertEquals(loadCalls, 0);
    screen.cleanup();
});

Deno.test("components/resource-boundary: should load client-only resources after hydration on ssg routes", async () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "client",
    });

    const resource = defineResource({
        name: "current-user",
        visibility: "private" as const,
        execution: "client" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
        resource as Resource<void, void, { title: string }>,
        { renderStrategy: "client-only" },
    );
    const screen = renderMainzComponent(ResourceBoundaryHarness);

    await flushResourceBoundaryUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Alexandre");
    screen.cleanup();
});

Deno.test("components/resource-boundary: should fail fast for forbidden-in-ssg during ssg build", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const resource = defineResource({
        name: "live-preview",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Preview" };
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
        resource as Resource<void, void, { title: string }>,
        {
            errorFallback: (error: unknown) => error instanceof Error ? error.message : String(error),
            renderStrategy: "forbidden-in-ssg",
        },
    );
    assertThrows(
        () => renderMainzComponent(ResourceBoundaryHarness),
        Error,
        'Resource "live-preview" is being read by a component marked forbidden-in-ssg and cannot be used during SSG.',
    );
});

Deno.test("components/resource-boundary: should fail fast for blocking private resources during ssg build", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const resource = defineResource({
        name: "current-user",
        visibility: "private" as const,
        execution: "either" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
        resource as Resource<void, void, { title: string }>,
        {
            errorFallback: (error: unknown) => error instanceof Error ? error.message : String(error),
            renderStrategy: "blocking",
        },
    );

    assertThrows(
        () => renderMainzComponent(ResourceBoundaryHarness),
        Error,
        'Resource "current-user" is private and cannot be read during SSG.',
    );
});

Deno.test("components/resource-boundary: should warn when deferred ssg placeholder has no fallback", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const resource = defineResource({
            name: "related-docs",
            visibility: "public" as const,
            execution: "either" as const,
            load() {
                return [{ slug: "routing" }];
            },
        });

        const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
            resource as Resource<void, void, { slug: string }[]>,
            { withFallback: false },
        );
        const screen = renderMainzComponent(ResourceBoundaryHarness);

        assertEquals(screen.container.textContent ?? "", "");
        assertEquals(warningCapture.warnings, [
            'ResourceBoundary for resource "related-docs" is using strategy "deferred" during SSG without a fallback. Provide a fallback to avoid empty prerender output.',
        ]);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});

Deno.test("components/resource-boundary: should not warn when client-only ssg placeholder provides a fallback", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    const warningCapture = captureConsoleWarnings();
    try {
        const resource = defineResource({
            name: "current-user",
            visibility: "public" as const,
            execution: "either" as const,
            load() {
                return { title: "Alexandre" };
            },
        });

        const ResourceBoundaryHarness = fixtures.createResourceBoundaryHarness(
            resource as Resource<void, void, { title: string }>,
            { renderStrategy: "client-only" },
        );
        const screen = renderMainzComponent(ResourceBoundaryHarness);

        assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");
        assertEquals(warningCapture.warnings, []);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});
