/// <reference lib="deno.ns" />

/**
 * JSX typing tests
 *
 * Verifies that `key` is accepted by TSX on components whose props do not
 * explicitly declare a `key` field.
 */

import { assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./jsx.types.fixture.tsx"
) as typeof import("./jsx.types.fixture.tsx");

Deno.test("jsx/types: should allow key on typed class and function components", () => {
  fixtures.resetTypedCapture();

  const { classNode, functionNode } = fixtures.createTypedKeyUsages();

  assertEquals(
    classNode.tagName,
    fixtures.NarrowPropsClassComponent.getTagName().toUpperCase(),
  );

  const classProps =
    (classNode as HTMLElement & { props: Record<string, unknown> }).props;
  assertEquals(classProps.title, "class-ok");
  assertEquals(classProps.key, "class-key");

  assertEquals(functionNode.tagName, "P");
  assertEquals(fixtures.typedCapture.lastProps?.label, "function-ok");
  assertEquals(fixtures.typedCapture.lastProps?.key, "fn-key");
});
