/// <reference lib="deno.ns" />

/**
 * JSX runtime tests
 *
 * Verifies `jsx`, `jsxs`, and `jsxDEV` behavior, including key forwarding,
 * children semantics, Fragment runtime output, and class component props wiring.
 */

import { assert, assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();

const runtime = await import("../jsx-runtime.ts") as typeof import("../jsx-runtime.ts");
const fixtures = await import("./jsx.runtime.fixture.tsx") as typeof import("./jsx.runtime.fixture.tsx");

Deno.test("jsx/runtime: jsx should create elements when props is null", () => {
    const node = runtime.jsx("div", null);
    assertEquals(node.tagName, "DIV");
});

Deno.test("jsx/runtime: jsx should forward key and children to function components", () => {
    fixtures.resetRuntimeCapture();

    const out = runtime.jsx(fixtures.CapturePropsComponent, {
        label: "x",
        children: "child",
    }, "k1");

    assertEquals(out.tagName, "DIV");
    assertEquals(fixtures.runtimeCapture.lastProps?.key, "k1");
    assertEquals(fixtures.runtimeCapture.lastProps?.children, "child");
    assertEquals(fixtures.runtimeCapture.lastProps?.label, "x");
});

Deno.test("jsx/runtime: jsxs should preserve array children for function components", () => {
    fixtures.resetRuntimeCapture();

    runtime.jsxs(fixtures.CapturePropsComponent, {
        children: ["a", "b", "c"],
    });

    assert(Array.isArray(fixtures.runtimeCapture.lastProps?.children));
    assertEquals((fixtures.runtimeCapture.lastProps?.children as unknown[]).length, 3);
});

Deno.test("jsx/runtime: jsxDEV should behave like jsx for key forwarding", () => {
    fixtures.resetRuntimeCapture();

    runtime.jsxDEV(fixtures.CapturePropsComponent, {
        mode: "dev",
    }, "dev-key");

    assertEquals(fixtures.runtimeCapture.lastProps?.key, "dev-key");
    assertEquals(fixtures.runtimeCapture.lastProps?.mode, "dev");
});

Deno.test("jsx/runtime: should wire props and key on class component elements", () => {
    const child = document.createElement("span");
    child.textContent = "inner";

    const el = runtime.jsxs(fixtures.RuntimeClassComponent, {
        label: "ok",
        children: [child, "tail"],
    }, "class-key") as HTMLElement & { props: Record<string, unknown> };

    assertEquals(el.props.label, "ok");
    assertEquals(el.props.key, "class-key");
    assert(Array.isArray(el.props.children));
    assertEquals((el.props.children as unknown[]).length, 2);
});

Deno.test("jsx/runtime: Fragment export should produce a DocumentFragment", () => {
    const frag = runtime.jsxs(runtime.Fragment, {
        children: ["a", "b"],
    }) as unknown as DocumentFragment;

    assert(frag instanceof DocumentFragment);
    assertEquals(frag.childNodes.length, 2);
    assertEquals(frag.textContent, "ab");
});



