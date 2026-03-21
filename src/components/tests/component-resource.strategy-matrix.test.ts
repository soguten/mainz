/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { defineResource, type RenderStrategy } from "../../resources/index.ts";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import("./component-resource.strategy-matrix.fixture.tsx") as typeof import("./component-resource.strategy-matrix.fixture.tsx");

interface MatrixCase {
    name: string;
    renderMode: "csr" | "ssg";
    runtime: "client" | "build";
    strategy: RenderStrategy;
    expectedText: string;
    expectedLoadCalls: number;
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

async function flushComponentResourceUpdates(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test.afterEach(() => {
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
});

const matrix: readonly MatrixCase[] = [
    {
        name: "csr + client + blocking resolves in the browser",
        renderMode: "csr",
        runtime: "client",
        strategy: "blocking",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "csr + client + deferred resolves in the browser",
        renderMode: "csr",
        runtime: "client",
        strategy: "deferred",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "csr + client + client-only resolves in the browser",
        renderMode: "csr",
        runtime: "client",
        strategy: "client-only",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "ssg + build + blocking participates in prerender",
        renderMode: "ssg",
        runtime: "build",
        strategy: "blocking",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "ssg + build + deferred stays on fallback during prerender",
        renderMode: "ssg",
        runtime: "build",
        strategy: "deferred",
        expectedText: "loading",
        expectedLoadCalls: 0,
    },
    {
        name: "ssg + build + client-only stays on fallback during prerender",
        renderMode: "ssg",
        runtime: "build",
        strategy: "client-only",
        expectedText: "loading",
        expectedLoadCalls: 0,
    },
    {
        name: "ssg + client + blocking resolves after hydration",
        renderMode: "ssg",
        runtime: "client",
        strategy: "blocking",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "ssg + client + deferred resolves after hydration",
        renderMode: "ssg",
        runtime: "client",
        strategy: "deferred",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
    {
        name: "ssg + client + client-only resolves after hydration",
        renderMode: "ssg",
        runtime: "client",
        strategy: "client-only",
        expectedText: "resolved",
        expectedLoadCalls: 1,
    },
];

for (const testCase of matrix) {
    Deno.test(`components/component-resource matrix: ${testCase.name}`, async () => {
        setMainzRuntimeEnvironment({
            renderMode: testCase.renderMode,
            runtime: testCase.runtime,
        });

        let loadCalls = 0;
        const resource = defineResource({
            name: `matrix-${testCase.renderMode}-${testCase.runtime}-${testCase.strategy}`,
            visibility: "public" as const,
            execution: "either" as const,
            async load() {
                loadCalls += 1;
                return { title: "resolved" };
            },
        });

        const Harness = fixtures.createStrategyMatrixHarness(testCase.strategy, resource);
        const screen = renderMainzComponent(Harness);

        await flushComponentResourceUpdates();

        assertEquals(screen.getBySelector("[data-role='status']").textContent, testCase.expectedText);
        assertEquals(loadCalls, testCase.expectedLoadCalls);
        screen.cleanup();
    });
}
