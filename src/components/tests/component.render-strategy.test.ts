/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
    Component,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderStrategy,
} from "../index.ts";
import { setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

Deno.test("components/render-strategy: should resolve strategy declared with decorator", () => {
    @RenderStrategy("client-only")
    class UserMenu extends Component {
        override render(): HTMLElement {
            return document.createElement("div");
        }
    }

    assertEquals(resolveComponentRenderStrategy(UserMenu), "client-only");
});

Deno.test("components/render-strategy: should inherit strategy from a decorated base component", () => {
    @RenderStrategy("deferred")
    class DeferredPanel extends Component {
        override render(): HTMLElement {
            return document.createElement("section");
        }
    }

    class RelatedDocs extends DeferredPanel {}

    assertEquals(resolveComponentRenderStrategy(RelatedDocs), "deferred");
});

Deno.test("components/render-strategy: should allow subclasses to override inherited strategy", () => {
    @RenderStrategy("deferred")
    class DeferredPanel extends Component {
        override render(): HTMLElement {
            return document.createElement("section");
        }
    }

    @RenderStrategy("blocking")
    class CriticalRelatedDocs extends DeferredPanel {}

    assertEquals(resolveComponentRenderStrategy(CriticalRelatedDocs), "blocking");
});

Deno.test("components/render-strategy: should expose fallback metadata declared on the decorator", () => {
    const fallback = () => {
        const element = document.createElement("button");
        element.textContent = "Login";
        return element;
    };

    @RenderStrategy("client-only", { fallback })
    class UserMenu extends Component {
        override render(): HTMLElement {
            return document.createElement("div");
        }
    }

    const renderConfig = resolveComponentRenderConfig(UserMenu);

    assertEquals(renderConfig?.strategy, "client-only");
    assertEquals(renderConfig?.fallback, fallback);
});

Deno.test("components/render-strategy: should expose error fallback metadata declared on the decorator", () => {
    const errorFallback = (error: unknown) => {
        const element = document.createElement("p");
        element.textContent = error instanceof Error ? error.message : String(error);
        return element;
    };

    @RenderStrategy("deferred", { errorFallback })
    class RelatedDocs extends Component {
        override render(): HTMLElement {
            return document.createElement("div");
        }
    }

    const renderConfig = resolveComponentRenderConfig(RelatedDocs);

    assertEquals(renderConfig?.strategy, "deferred");
    assertEquals(renderConfig?.errorFallback, errorFallback);
});
