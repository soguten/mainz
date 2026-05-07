/// <reference lib="deno.ns" />

/**
 * Testing helper render tests
 *
 * Verifies the base render contract from `renderMainzComponent`,
 * including props/attrs bootstrap, state override behavior, and async updates.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./mainz-testing.render.fixture.tsx"
) as typeof import("./mainz-testing.render.fixture.tsx");

Deno.test("testing helper/render: should expose props before first render", () => {
  const screen = renderMainzComponent(fixtures.PropsAwareComponent, {
    props: { label: "hello" },
  });

  assertEquals(screen.getBySelector("p").textContent, "hello");
  screen.cleanup();
});

Deno.test("testing helper/render: should apply attrs before connect", () => {
  const screen = renderMainzComponent(fixtures.AttrAwareComponent, {
    attrs: { "data-mode": "strict" },
  });

  assertEquals(screen.getBySelector("p").textContent, "strict");
  screen.cleanup();
});

Deno.test("testing helper/render: stateOverride should merge with preloaded state", () => {
  const screen = renderMainzComponent(fixtures.OverrideStateComponent, {
    stateOverride: { b: 9 },
  });

  assertEquals(screen.component.state, { a: 1, b: 9, c: 3 });
  assertEquals(screen.getBySelector("p").textContent, "1-9-3");
  screen.cleanup();
});

Deno.test("testing helper/render: should support async state update triggered in onMount", async () => {
  const screen = renderMainzComponent(fixtures.AsyncOnMountComponent);

  assertEquals(screen.getBySelector("p").textContent, "init");
  await Promise.resolve();
  assertEquals(screen.getBySelector("p").textContent, "ready");
  screen.cleanup();
});

Deno.test("testing helper/render: container should match host reference", () => {
  const screen = renderMainzComponent(fixtures.PropsAwareComponent);

  assertEquals(screen.container, screen.host);
  screen.cleanup();
});
