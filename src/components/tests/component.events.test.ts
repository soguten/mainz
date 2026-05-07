/// <reference lib="deno.ns" />

/**
 * Event dispatch tests
 *
 * Ensures that events dispatched through the testing helpers correctly
 * trigger component listeners and propagate element values.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./component.events.fixture.tsx"
) as typeof import("./component.events.fixture.tsx");

Deno.test("events: dispatch should trigger a generic custom event", () => {
  const screen = renderMainzComponent(fixtures.CustomDispatchComponent);

  screen.dispatch(
    "button[data-role='target']",
    new CustomEvent("x-ready", {
      bubbles: true,
      detail: "ok",
    }),
  );

  assertEquals(screen.getBySelector("p").textContent, "ok");
  screen.cleanup();
});

Deno.test("events: dispatch should trigger input listeners with the current element value", () => {
  const screen = renderMainzComponent(fixtures.InputDispatchComponent);

  const input = screen.getBySelector<HTMLInputElement>("input");
  input.value = "hello";

  screen.dispatch(
    "input",
    new Event("input", { bubbles: true }),
  );

  assertEquals(screen.getBySelector("p").textContent, "hello");
  screen.cleanup();
});

Deno.test("events: dispatch should trigger change listeners with the current input value", () => {
  const screen = renderMainzComponent(fixtures.ChangeDispatchComponent);

  const input = screen.getBySelector<HTMLInputElement>("input");
  input.value = "changed";

  screen.dispatch(
    "input",
    new Event("change", { bubbles: true }),
  );

  assertEquals(screen.getBySelector("p").textContent, "changed");
  screen.cleanup();
});

Deno.test("events: dispatch should trigger change listeners on select elements", () => {
  const screen = renderMainzComponent(fixtures.SelectChangeComponent);

  const select = screen.getBySelector<HTMLSelectElement>("select");
  select.value = "b";

  screen.dispatch(
    "select",
    new Event("change", { bubbles: true }),
  );

  assertEquals(screen.getBySelector("p").textContent, "b");
  screen.cleanup();
});

Deno.test("events: dispatch should support keyboard events", () => {
  const screen = renderMainzComponent(fixtures.KeyboardDispatchComponent);

  screen.dispatch(
    "input",
    new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
    }),
  );

  assertEquals(screen.getBySelector("p").textContent, "Enter");
  screen.cleanup();
});
