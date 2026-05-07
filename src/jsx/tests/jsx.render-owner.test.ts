/// <reference lib="deno.ns" />

/**
 * JSX render owner stack tests
 *
 * Verifies push/pop semantics for the render owner context used by JSX event registration.
 */

import { assertEquals } from "@std/assert";
import {
  getCurrentRenderOwner,
  popRenderOwner,
  pushRenderOwner,
} from "../render-owner.ts";

const fixtures = await import(
  "./jsx.render-owner.fixture.tsx"
) as typeof import("./jsx.render-owner.fixture.tsx");

function resetOwnerStack(): void {
  while (getCurrentRenderOwner()) {
    popRenderOwner();
  }
}

Deno.test("jsx/render-owner: should expose undefined when stack is empty", () => {
  resetOwnerStack();
  assertEquals(getCurrentRenderOwner(), undefined);
});

Deno.test("jsx/render-owner: should return the latest pushed owner (LIFO)", () => {
  resetOwnerStack();

  const a = fixtures.createOwner("a");
  const b = fixtures.createOwner("b");

  pushRenderOwner(a);
  assertEquals((getCurrentRenderOwner() as unknown as { id: string }).id, "a");

  pushRenderOwner(b);
  assertEquals((getCurrentRenderOwner() as unknown as { id: string }).id, "b");

  popRenderOwner();
  assertEquals((getCurrentRenderOwner() as unknown as { id: string }).id, "a");

  popRenderOwner();
  assertEquals(getCurrentRenderOwner(), undefined);
});

Deno.test("jsx/render-owner: extra pop on empty stack should be safe", () => {
  resetOwnerStack();

  popRenderOwner();
  popRenderOwner();

  assertEquals(getCurrentRenderOwner(), undefined);
});
