/// <reference lib="deno.ns" />

/**
 * Styles and tag-name tests
 *
 * Verifies that static styles are injected once and that tag names are
 * deterministic, cached, and collision-safe across components.
 */

import { assert, assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
    "./component.styles-tagname.fixture.tsx"
) as typeof import("./component.styles-tagname.fixture.tsx");

Deno.test("styles: should inject string styles only once across re-renders", async () => {
    const screen = renderMainzComponent(fixtures.StringStylesComponent);

    const styleBefore = screen.component.querySelectorAll("style");
    assertEquals(styleBefore.length, 1);
    assertEquals(styleBefore[0].textContent, ".counter { color: red; }");

    screen.component.setState({ count: 1 });
    screen.component.setState({ count: 2 });

    const styleAfter = screen.component.querySelectorAll("style");
    assertEquals(styleAfter.length, 1);
    assert(
        styleAfter[0] === styleBefore[0],
        "Expected style node identity to be preserved",
    );

    await screen.cleanup();
});

Deno.test("styles: should inject all styles from static array in declaration order", async () => {
    const screen = renderMainzComponent(fixtures.ArrayStylesComponent);

    const styles = Array.from(screen.component.querySelectorAll("style"));
    assertEquals(styles.length, 2);
    assertEquals(styles[0].textContent, ".a { color: blue; }");
    assertEquals(styles[1].textContent, ".b { color: green; }");

    await screen.cleanup();
});

Deno.test("tagName: getTagName should be stable and cached for the same constructor", () => {
    const first = fixtures.ArrayStylesComponent.getTagName();
    const second = fixtures.ArrayStylesComponent.getTagName();

    assertEquals(first, second);
    assert(
        first.startsWith("x-"),
        "Expected custom element tag names to use x- prefix",
    );
});

Deno.test("tagName: constructors with same class name should receive unique tags", () => {
    const a = fixtures.DuplicateTagNameA.getTagName();
    const b = fixtures.DuplicateTagNameB.getTagName();

    assert(a !== b, "Expected colliding class names to receive unique tag names");
    assertEquals(a, "x-shared-name");
    assertEquals(b, "x-shared-name-1");
});

Deno.test("tagName: should honor @CustomElement when provided", () => {
    const explicit = fixtures.DecoratedTagComponent.getTagName();
    assertEquals(explicit, "x-explicit-tag");
});
