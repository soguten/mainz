/// <reference lib="deno.ns" />

/**
 * JSX factory tests
 *
 * Verifies low-level `h` and `Fragment` behavior: attribute mapping,
 * child normalization, SVG namespace handling, managed events, and component constructors.
 */

import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();

const domFactory = await import("../dom-factory.ts") as typeof import("../dom-factory.ts");
const fixtures = await import("./jsx.factory.fixture.tsx") as typeof import("./jsx.factory.fixture.tsx");

Deno.test("jsx/factory: should create HTML elements with primitive attributes", () => {
    const button = domFactory.h("button", {
        className: "btn primary",
        disabled: true,
        "data-id": 10,
    }, "go") as HTMLButtonElement;

    assertEquals(button.tagName, "BUTTON");
    assertEquals(button.getAttribute("class"), "btn primary");
    assertEquals(button.getAttribute("disabled"), "true");
    assertEquals(button.getAttribute("data-id"), "10");
    assertEquals(button.textContent, "go");
});

Deno.test("jsx/factory: should flatten children and ignore nullish/boolean values", () => {
    const span = domFactory.h("span", null, "z") as HTMLElement;
    const node = domFactory.h("div", null, ["a", [1, false, null, span], undefined, true]) as HTMLElement;

    assertEquals(node.childNodes.length, 3);
    assertEquals(node.textContent, "a1z");
    assertStrictEquals(node.lastChild, span);
});

Deno.test("jsx/factory: should invoke ref callback with the created element", () => {
    let refNode: HTMLElement | null = null;

    const input = domFactory.h("input", {
        ref: (el: HTMLElement) => {
            refNode = el;
        },
    }) as HTMLInputElement;

    assertStrictEquals(refNode, input);
});

Deno.test("jsx/factory: should create SVG elements in the proper namespace", () => {
    const path = domFactory.h("path", { d: "M0 0 L1 1" }) as SVGPathElement;
    const svg = domFactory.h("svg", null, path) as SVGSVGElement;

    assertEquals(svg.namespaceURI, "http://www.w3.org/2000/svg");
    assertEquals(path.namespaceURI, "http://www.w3.org/2000/svg");
});

Deno.test("jsx/factory: should register managed events from on* props", () => {
    let clicks = 0;

    const button = domFactory.h("button", {
        onClick: () => {
            clicks += 1;
        },
    }, "hit") as HTMLButtonElement;

    const managed = domFactory.getManagedDOMEvents(button);
    assertEquals(managed.length, 1);
    assertEquals(managed[0].type, "click");

    button.click();
    assertEquals(clicks, 1);
});

Deno.test("jsx/factory: should ignore non-primitive props that are not event handlers", () => {
    const node = domFactory.h("div", {
        payload: { x: 1 },
        onClick: "not-a-function",
    } as unknown as Record<string, unknown>) as HTMLElement;

    assertEquals(node.hasAttribute("payload"), false);
    assertEquals(domFactory.getManagedDOMEvents(node).length, 0);
    assert(node.hasAttribute("onClick") || node.hasAttribute("onclick"));
});

Deno.test("jsx/factory: should create class components and assign props and children", () => {
    const child = document.createElement("span");
    child.textContent = "child";

    const element = domFactory.h(fixtures.FactoryClassComponent, {
        label: "x",
    }, child) as HTMLElement & { props: Record<string, unknown> };

    assertEquals(element.tagName, fixtures.FactoryClassComponent.getTagName().toUpperCase());
    assertEquals(element.props.label, "x");
    assertStrictEquals(element.props.children, child);
});

Deno.test("jsx/factory: should invoke function components with normalized children", () => {
    const out = domFactory.h(fixtures.FactoryFunctionComponent, {
        prefix: "hi",
    }, "there") as HTMLElement;

    assertEquals(out.tagName, "P");
    assertEquals(out.textContent, "hi:there");
});

Deno.test("jsx/factory: Fragment should return a DocumentFragment with children", () => {
    const frag = domFactory.Fragment({
        children: ["a", domFactory.h("span", null, "b")],
    });

    assert(frag instanceof DocumentFragment);
    assertEquals(frag.childNodes.length, 2);
    assertEquals(frag.textContent, "ab");
});


