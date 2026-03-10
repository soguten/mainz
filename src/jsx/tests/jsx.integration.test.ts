/// <reference lib="deno.ns" />

/**
 * JSX integration tests
 *
 * Verifies TSX-to-runtime integration with Mainz components, including
 * event handling, ref/className mapping, composition, children propagation,
 * normalization, and nested class components.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./jsx.integration.fixture.tsx") as typeof import("./jsx.integration.fixture.tsx");

Deno.test("jsx/integration: should render TSX class components and update on click", () => {
    const screen = renderMainzComponent(fixtures.JSXCounterComponent);

    const button = screen.getBySelector<HTMLButtonElement>("button");
    assertEquals(button.getAttribute("class"), "counter");
    assertEquals(screen.component.lastRefTag, "BUTTON");

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("jsx/integration: should compose function components and Fragments", () => {
    const screen = renderMainzComponent(fixtures.JSXCompositionComponent, {
        props: { label: "B" },
    });

    assertEquals(screen.getBySelector("[data-role='badge']").textContent, "B");
    assertEquals(screen.getBySelector("[data-role='frag-a']").textContent, "A");
    assertEquals(screen.getBySelector("[data-role='frag-b']").textContent, "B");
    assertEquals(screen.getBySelector("[data-role='saved']").textContent, "none");

    screen.click("button[data-role='save']");

    assertEquals(screen.getBySelector("[data-role='saved']").textContent, "B");
    screen.cleanup();
});

Deno.test("jsx/integration: should pass children to class components through props.children", () => {
    const screen = renderMainzComponent(fixtures.JSXChildrenHostComponent);

    assertEquals(screen.getBySelector("[data-role='inner']").textContent, "ok");
    assertEquals(screen.getBySelector("[data-role='consumer']").textContent, "ok-tail");
    screen.cleanup();
});

Deno.test("jsx/integration: should normalize null and boolean children in TSX", () => {
    const screen = renderMainzComponent(fixtures.JSXChildrenNormalizationComponent);

    assertEquals(screen.getBySelector("[data-role='norm']").textContent, "0x");
    screen.cleanup();
});

Deno.test("jsx/integration: should render nested class components declared in TSX", () => {
    const screen = renderMainzComponent(fixtures.JSXNestedClassHostComponent);

    assertEquals(screen.getBySelector("[data-role='leaf']").textContent, "leaf");
    assertEquals(
        customElements.get(fixtures.JSXLeafComponent.getTagName()),
        fixtures.JSXLeafComponent,
    );

    screen.cleanup();
});

Deno.test("jsx/integration: should keep nested class component content after parent re-render", () => {
    const screen = renderMainzComponent(fixtures.JSXNestedClassRerenderHostComponent);

    assertEquals(screen.getBySelector("[data-role='leaf']").textContent, "leaf");
    assertEquals(screen.getBySelector("[data-role='tick']").textContent, "0");

    screen.click("button[data-role='rerender']");

    assertEquals(screen.getBySelector("[data-role='tick']").textContent, "1");
    assertEquals(screen.getBySelector("[data-role='leaf']").textContent, "leaf");
    screen.cleanup();
});

Deno.test("jsx/integration: controlled textarea should keep value/property in sync", () => {
    const screen = renderMainzComponent(fixtures.JSXControlledTextareaComponent);
    const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");

    assertEquals(textarea.value, "");

    textarea.value = "mainz";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    assertEquals(screen.getBySelector<HTMLTextAreaElement>("textarea").value, "mainz");
    assertEquals(screen.getBySelector("[data-role='value']").textContent, "mainz");

    screen.component.setState({ text: "mainz framework" });
    assertEquals(screen.getBySelector<HTMLTextAreaElement>("textarea").value, "mainz framework");

    screen.cleanup();
});

