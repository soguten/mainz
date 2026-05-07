/// <reference lib="deno.ns" />

/**
 * State override tests
 *
 * Verifies that state overrides are merged before the first render
 * and correctly replace or preserve existing state.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./component.state-override.fixture.tsx"
) as typeof import("./component.state-override.fixture.tsx");

Deno.test("stateOverride: should merge with preloaded instance state before first render", () => {
  const screen = renderMainzComponent(fixtures.PreloadedStateComponent, {
    stateOverride: {
      count: 5,
      ready: true,
    },
  });

  assertEquals(screen.component.state.count, 5);
  assertEquals(screen.component.state.label, "initial");
  assertEquals(screen.component.state.ready, true);
  assertEquals(
    screen.getBySelector("p").textContent,
    JSON.stringify({
      count: 5,
      label: "initial",
      ready: true,
    }),
  );

  screen.cleanup();
});

Deno.test("stateOverride: should preserve existing state keys not present in override", () => {
  const screen = renderMainzComponent(fixtures.PreserveExistingKeysComponent, {
    stateOverride: {
      b: 20,
    },
  });

  assertEquals(screen.component.state.a, 1);
  assertEquals(screen.component.state.b, 20);
  assertEquals(screen.component.state.c, 3);
  assertEquals(screen.getBySelector("p").textContent, "1-20-3");

  screen.cleanup();
});

Deno.test("stateOverride: should overwrite only the provided keys", () => {
  const screen = renderMainzComponent(fixtures.PartialOverrideComponent, {
    stateOverride: {
      status: "done",
      selected: true,
    },
  });

  assertEquals(screen.component.state.status, "done");
  assertEquals(screen.component.state.count, 0);
  assertEquals(screen.component.state.selected, true);
  assertEquals(screen.getBySelector("p").textContent, "done|0|true");

  screen.cleanup();
});

Deno.test("stateOverride: should bypass initState when merged state is already present", () => {
  const screen = renderMainzComponent(fixtures.InitStateBypassedComponent, {
    stateOverride: {
      count: 5,
    },
  });

  assertEquals(screen.component.initCalls, 0);
  assertEquals(screen.component.state.count, 5);
  assertEquals(screen.component.state.label, "preloaded");
  assertEquals(screen.getBySelector("p").textContent, "5:preloaded");

  screen.cleanup();
});

Deno.test("stateOverride: should be reflected in the very first render after merge", () => {
  const screen = renderMainzComponent(
    fixtures.FirstRenderMergedStateComponent,
    {
      stateOverride: {
        visible: true,
      },
    },
  );

  assertEquals(screen.component.renderCalls, 1);
  assertEquals(screen.getBySelector("p").textContent, "draft:true");

  screen.cleanup();
});

Deno.test("stateOverride: should support overriding all preloaded state keys", () => {
  const screen = renderMainzComponent(fixtures.FullOverrideComponent, {
    stateOverride: {
      mode: "edit",
      count: 10,
    },
  });

  assertEquals(screen.component.state.mode, "edit");
  assertEquals(screen.component.state.count, 10);
  assertEquals(screen.getBySelector("p").textContent, "edit:10");

  screen.cleanup();
});
