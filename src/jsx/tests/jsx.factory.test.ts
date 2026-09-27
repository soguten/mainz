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

const domFactory = await import(
  "../dom-factory.ts"
) as typeof import("../dom-factory.ts");
const fixtures = await import(
  "./jsx.factory.fixture.tsx"
) as typeof import("./jsx.factory.fixture.tsx");

Deno.test("jsx/factory: form values survive HTML serialization and parsing", () => {
  const form = domFactory.h(
    "form",
    null,
    domFactory.h("input", { value: 'hello <world> "quoted"' }),
    domFactory.h("textarea", { value: "text <content>" }),
    domFactory.h("input", { type: "checkbox", checked: true }),
    domFactory.h(
      "select",
      { value: "b" },
      domFactory.h("option", { value: "a" }, "A"),
      domFactory.h("option", { value: "b" }, "B"),
    ),
  ) as HTMLFormElement;
  const container = document.createElement("div");
  container.innerHTML = form.outerHTML;
  assertEquals(
    container.querySelector<HTMLInputElement>("input")!.value,
    'hello <world> "quoted"',
  );
  assertEquals(
    container.querySelector<HTMLTextAreaElement>("textarea")!.value,
    "text <content>",
  );
  assertEquals(
    container.querySelector<HTMLInputElement>("input[type=checkbox]")!.checked,
    true,
  );
  assertEquals(
    container.querySelector<HTMLSelectElement>("select")!.value,
    "b",
  );
});

Deno.test("jsx/factory: defaults are independent of JSX prop order", () => {
  for (
    const props of [
      { value: "current", defaultValue: "baseline" },
      { defaultValue: "baseline", value: "current" },
    ]
  ) {
    const input = domFactory.h("input", props) as HTMLInputElement;
    assertEquals([input.value, input.defaultValue], ["current", "baseline"]);
  }
  for (
    const props of [
      { checked: false, defaultChecked: true, type: "checkbox" },
      { type: "checkbox", defaultChecked: true, checked: false },
    ]
  ) {
    const input = domFactory.h("input", props) as HTMLInputElement;
    assertEquals([input.checked, input.defaultChecked], [false, true]);
  }
});

for (const attribute of ["required", "readonly", "multiple", "hidden"]) {
  Deno.test(`jsx/factory: ${attribute} follows HTML boolean presence semantics`, () => {
    for (const value of [false, true, null, undefined]) {
      const element = domFactory.h("input", {
        [attribute]: value,
      }) as HTMLInputElement;
      assertEquals(element.hasAttribute(attribute), value === true);
    }
  });
}

Deno.test("jsx/factory: false remains a string for ARIA, data and enumerated attributes", () => {
  const element = domFactory.h("div", {
    "aria-hidden": false,
    "data-enabled": false,
    contenteditable: false,
    draggable: false,
  }) as HTMLElement;
  for (
    const attribute of [
      "aria-hidden",
      "data-enabled",
      "contenteditable",
      "draggable",
    ]
  ) {
    assertEquals(element.getAttribute(attribute), "false");
  }
});

Deno.test("jsx/factory: hidden retains its until-found state", () => {
  const element = domFactory.h("div", { hidden: "until-found" }) as HTMLElement;
  assertEquals(element.getAttribute("hidden"), "until-found");
});

Deno.test("jsx/factory: should create HTML elements with primitive attributes", () => {
  const button = domFactory.h("button", {
    className: "btn primary",
    "data-id": 10,
  }, "go") as HTMLButtonElement;

  assertEquals(button.tagName, "BUTTON");
  assertEquals(button.getAttribute("class"), "btn primary");
  assertEquals(button.getAttribute("data-id"), "10");
  assertEquals(button.textContent, "go");
});

Deno.test("jsx/factory: should map disabled as a boolean property", () => {
  const enabledButton = domFactory.h("button", {
    disabled: false,
  }, "enabled") as HTMLButtonElement;
  const disabledButton = domFactory.h("button", {
    disabled: true,
  }, "disabled") as HTMLButtonElement;

  assertEquals(enabledButton.disabled, false);
  assertEquals(enabledButton.hasAttribute("disabled"), false);

  assertEquals(disabledButton.disabled, true);
  assertEquals(disabledButton.hasAttribute("disabled"), true);
  assertEquals(disabledButton.getAttribute("disabled"), "");
});

Deno.test("jsx/factory: should flatten children and ignore nullish/boolean values", () => {
  const span = domFactory.h("span", null, "z") as HTMLElement;
  const node = domFactory.h("div", null, [
    "a",
    [1, false, null, span],
    undefined,
    true,
  ]) as HTMLElement;

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

  assertEquals(
    element.tagName,
    fixtures.FactoryClassComponent.getTagName().toUpperCase(),
  );
  assertEquals(element.props.label, "x");
  assertStrictEquals(element.props.children, child);
});

Deno.test("jsx/factory: should keep event-named function props as component props without host listeners", () => {
  const onInput = (value: string) => value;

  const element = domFactory.h(fixtures.FactoryEventPropComponent, {
    onInput,
  }) as HTMLElement & { props: Record<string, unknown> };

  assertStrictEquals(element.props.onInput, onInput);
  assertEquals(domFactory.getManagedDOMEvents(element).length, 0);
  assertEquals(element.getAttribute("onInput"), null);
  assertEquals(element.getAttribute("oninput"), null);
});

Deno.test("jsx/factory: should not mirror arbitrary primitive component props to host attributes", () => {
  const element = domFactory.h(fixtures.FactoryEventPropComponent, {
    state: "ready",
    value: "abc",
    count: 2,
    checked: false,
  }) as HTMLElement & { props: Record<string, unknown> };

  assertEquals(element.props.state, "ready");
  assertEquals(element.props.value, "abc");
  assertEquals(element.props.count, 2);
  assertEquals(element.props.checked, false);

  assertEquals(element.getAttribute("state"), null);
  assertEquals(element.getAttribute("value"), null);
  assertEquals(element.getAttribute("count"), null);
  assertEquals(element.getAttribute("checked"), null);
});

Deno.test("jsx/factory: should still mirror explicit host attributes for class components", () => {
  const element = domFactory.h(fixtures.FactoryEventPropComponent, {
    className: "chip",
    style: "color: red;",
    tabIndex: 3,
    title: "host title",
    role: "status",
    "data-mode": "test",
    "aria-label": "factory probe",
  }) as HTMLElement & { props: Record<string, unknown> };

  assertEquals(element.getAttribute("class"), "chip");
  assertEquals(element.getAttribute("style"), "color: red;");
  assertEquals(element.getAttribute("tabindex"), "3");
  assertEquals(element.getAttribute("title"), "host title");
  assertEquals(element.getAttribute("role"), "status");
  assertEquals(element.getAttribute("data-mode"), "test");
  assertEquals(element.getAttribute("aria-label"), "factory probe");
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
