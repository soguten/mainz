/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { defineResource } from "../../resources/index.ts";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();
const components = await import("../index.ts") as typeof import("../index.ts");

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

async function flushAsyncComponentUpdates(): Promise<void> {
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

Deno.test.afterEach(() => {
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
});

Deno.test("components/resource-component: should render fallback and resolved content through the component contract", async () => {
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Intro" };
        },
    });

    @components.RenderStrategy("deferred")
    class DocsArticle extends components.ResourceComponent<Record<string, never>, void, void, { title: string }> {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResourceFallback(): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = "loading";
            return element;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = value.title;
            return element;
        }
    }

    const screen = renderMainzComponent(DocsArticle);
    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    await flushAsyncComponentUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Intro");
    screen.cleanup();
});

Deno.test("components/resource-component: decorated client-only strategy should win over a blocking resource during ssg build", () => {
    setMainzRuntimeEnvironment({
        renderMode: "ssg",
        runtime: "build",
    });

    let loadCalls = 0;
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        load() {
            loadCalls += 1;
            return { title: "Alexandre" };
        },
    });

    @components.RenderStrategy("client-only")
    class UserMenu extends components.ResourceComponent<Record<string, never>, void, void, { title: string }> {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResourceFallback(): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = "login";
            return element;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = value.title;
            return element;
        }
    }

    const screen = renderMainzComponent(UserMenu);

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "login");
    assertEquals(loadCalls, 0);
    screen.cleanup();
});

Deno.test("components/resource-component: should use decorator fallback when the component does not override fallback rendering", async () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Alexandre" };
        },
    });

    @components.RenderStrategy("deferred", {
        fallback: () => {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = "login";
            return element;
        },
    })
    class UserMenu extends components.ResourceComponent<Record<string, never>, void, void, { title: string }> {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = value.title;
            return element;
        }
    }

    const screen = renderMainzComponent(UserMenu);
    assertEquals(screen.getBySelector("[data-role='status']").textContent, "login");

    await flushAsyncComponentUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "Alexandre");
    screen.cleanup();
});

Deno.test("components/resource-component: should use decorator errorFallback when the component does not override error rendering", async () => {
    const resource = defineResource({
        name: "current-user",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            throw new Error("auth failed");
        },
    });

    @components.RenderStrategy("blocking", {
        fallback: () => {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = "loading";
            return element;
        },
        errorFallback: (error: unknown) => {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = error instanceof Error ? error.message : String(error);
            return element;
        },
    })
    class UserMenu extends components.ResourceComponent<Record<string, never>, void, void, { title: string }> {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = value.title;
            return element;
        }
    }

    const screen = renderMainzComponent(UserMenu);
    assertEquals(screen.getBySelector("[data-role='status']").textContent, "loading");

    await flushAsyncComponentUpdates();

    assertEquals(screen.getBySelector("[data-role='status']").textContent, "auth failed");
    screen.cleanup();
});

Deno.test("components/resource-component: should fail when the component does not declare @RenderStrategy(...)", () => {
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Intro" };
        },
    });

    class MissingStrategyComponent extends components.ResourceComponent<
        Record<string, never>,
        void,
        void,
        { title: string }
    > {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.textContent = value.title;
            return element;
        }
    }

    let thrown: unknown;

    try {
        renderMainzComponent(MissingStrategyComponent);
    } catch (error) {
        thrown = error;
    }

    assertEquals(
        thrown instanceof Error ? thrown.message : thrown,
        'ResourceComponent "MissingStrategyComponent" must declare @RenderStrategy(...). ' +
            "ResourceComponent requires a fixed component-level render strategy.",
    );
});

Deno.test("components/resource-component: should warn when deferred component omits a fallback", () => {
    const resource = defineResource({
        name: "docs-article",
        visibility: "public" as const,
        execution: "either" as const,
        async load() {
            return { title: "Intro" };
        },
    });

    @components.RenderStrategy("deferred")
    class MissingFallbackResourceComponent extends components.ResourceComponent<
        Record<string, never>,
        void,
        void,
        { title: string }
    > {
        protected override getResource() {
            return resource;
        }

        protected override getResourceParams(): void {
            return undefined;
        }

        protected override renderResolved(value: { title: string }): HTMLElement {
            const element = document.createElement("p");
            element.dataset.role = "status";
            element.textContent = value.title;
            return element;
        }
    }

    const warningCapture = captureConsoleWarnings();

    try {
        const screen = renderMainzComponent(MissingFallbackResourceComponent);
        assertEquals(screen.container.textContent ?? "", "");
        assertEquals(warningCapture.warnings, [
            'ResourceComponent "MissingFallbackResourceComponent" uses @RenderStrategy("deferred") without a fallback. Add a fallback to make the component\'s async placeholder explicit.',
        ]);
        screen.cleanup();
    } finally {
        warningCapture.restore();
    }
});
