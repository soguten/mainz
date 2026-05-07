/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  Component,
  RenderPolicy,
  RenderStrategy,
  resolveComponentRenderConfig,
  resolveComponentRenderPolicy,
  resolveComponentRenderStrategy,
} from "../index.ts";
import { setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

Deno.test("components/render-strategy: should resolve strategy declared with decorator", () => {
  @RenderStrategy("blocking")
  class UserMenu extends Component {
    override render(): HTMLElement {
      return document.createElement("div");
    }
  }

  assertEquals(resolveComponentRenderStrategy(UserMenu), "blocking");
});

Deno.test("components/render-strategy: should default Component.load() owners to blocking", () => {
  class AsyncSection extends Component {
    override load() {
      return { title: "Loaded" };
    }

    override render(): HTMLElement {
      return document.createElement("div");
    }
  }

  const renderConfig = resolveComponentRenderConfig(AsyncSection);

  assertEquals(renderConfig?.strategy, "blocking");
});

Deno.test("components/render-strategy: should infer defer from load plus placeholder()", () => {
  class DeferPanel extends Component {
    override load() {
      return { title: "Deferred" };
    }

    override placeholder(): HTMLElement {
      return document.createElement("section");
    }

    override render(): HTMLElement {
      return document.createElement("section");
    }
  }

  assertEquals(resolveComponentRenderStrategy(DeferPanel), "defer");
});

Deno.test("components/render-strategy: should inherit strategy from a decorated base component", () => {
  @RenderStrategy("defer")
  class DeferPanel extends Component {
    override render(): HTMLElement {
      return document.createElement("section");
    }
  }

  class RelatedDocs extends DeferPanel {}

  assertEquals(resolveComponentRenderStrategy(RelatedDocs), "defer");
});

Deno.test("components/render-strategy: should allow subclasses to override inherited strategy", () => {
  @RenderStrategy("defer")
  class DeferPanel extends Component {
    override render(): HTMLElement {
      return document.createElement("section");
    }
  }

  @RenderStrategy("blocking")
  class CriticalRelatedDocs extends DeferPanel {}

  assertEquals(resolveComponentRenderStrategy(CriticalRelatedDocs), "blocking");
});

Deno.test("components/render-strategy: should resolve policy declared with decorator", () => {
  @RenderPolicy("placeholder-in-ssg")
  class UserMenu extends Component {
    override render(): HTMLElement {
      return document.createElement("div");
    }
  }

  const renderConfig = resolveComponentRenderConfig(UserMenu);

  assertEquals(renderConfig?.policy, "placeholder-in-ssg");
  assertEquals(resolveComponentRenderPolicy(UserMenu), "placeholder-in-ssg");
});

Deno.test("components/render-strategy: should expose explicit strategy and policy metadata", () => {
  @RenderStrategy("defer")
  @RenderPolicy("hide-in-ssg")
  class RelatedDocs extends Component {
    override load() {
      return { title: "Docs" };
    }

    override placeholder(): HTMLElement {
      return document.createElement("div");
    }

    override render(): HTMLElement {
      return document.createElement("div");
    }
  }

  const renderConfig = resolveComponentRenderConfig(RelatedDocs);

  assertEquals(renderConfig?.strategy, "defer");
  assertEquals(renderConfig?.policy, "hide-in-ssg");
  assertEquals(renderConfig?.hasExplicitStrategy, true);
  assertEquals(renderConfig?.hasExplicitPolicy, true);
});
