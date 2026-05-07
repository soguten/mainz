/// <reference lib="deno.ns" />

/**
 * Initial state tests
 *
 * Verifies that component state is correctly initialized before the first
 * render and behaves normally during subsequent updates.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./component.initial-state.fixture.tsx"
) as typeof import("./component.initial-state.fixture.tsx");

Deno.test("initial state: should be available in the very first render", () => {
  const screen = renderMainzComponent(fixtures.InitialStateComponent);

  assertEquals(screen.getBySelector("p").textContent, "7");
  assertEquals(screen.component.renderCalls, 1);

  screen.cleanup();
});

Deno.test("initial state: initState should receive props before first render", () => {
  const screen = renderMainzComponent(fixtures.PropsInitialStateComponent, {
    props: { initial: 12 },
  });

  assertEquals(screen.getBySelector("p").textContent, "12");
  assertEquals(screen.component.renderCalls, 1);

  screen.cleanup();
});

Deno.test("initial state: should not require onMount + setState to bootstrap initial state", () => {
  const screen = renderMainzComponent(fixtures.NoBootstrapRenderComponent);

  assertEquals(screen.getBySelector("p").textContent, "ready");
  assertEquals(screen.component.renderCalls, 1);
  assertEquals(screen.component.mountCalls, 1);

  screen.cleanup();
});

Deno.test("initial state: initState should run only once", () => {
  const screen = renderMainzComponent(fixtures.InitOnceComponent);

  screen.component.setState({ count: 2 });
  screen.component.setState({ count: 3 });

  assertEquals(screen.component.initCalls, 1);
  assertEquals(screen.component.renderCalls, 3);
  assertEquals(screen.getBySelector("p").textContent, "3");

  screen.cleanup();
});

Deno.test("initial state: setState should update from initialized state normally", () => {
  const screen = renderMainzComponent(fixtures.StatefulComponent);

  assertEquals(screen.getBySelector("p").textContent, "10");

  screen.component.setState({ count: 11 });

  assertEquals(screen.getBySelector("p").textContent, "11");

  screen.cleanup();
});

Deno.test("initial state: stateOverride should bypass initState on first connect", () => {
  const screen = renderMainzComponent(fixtures.StateOverrideComponent, {
    props: { initial: 10 },
    stateOverride: { count: 99 },
  });

  assertEquals(screen.getBySelector("p").textContent, "99");
  assertEquals(screen.component.initCalls, 0);

  screen.cleanup();
});

Deno.test("initial state: attrs should be applied before connect", () => {
  const screen = renderMainzComponent(fixtures.AttrAwareComponent, {
    attrs: {
      "data-role": "admin",
    },
  });

  assertEquals(screen.getBySelector("p").textContent, "admin");

  screen.cleanup();
});
