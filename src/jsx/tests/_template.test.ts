/// <reference lib="deno.ns" />

/**
 * [Group] JSX tests
 *
 * Verifies that [...]
 * and ensures [...]
 */

import { assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();

const domFactory = await import("../dom-factory.ts") as typeof import("../dom-factory.ts");
const fixtures = await import("./_template.fixture.tsx") as typeof import("./_template.fixture.tsx");

Deno.test.ignore("jsx/[group]: should ...", () => {
    const element = domFactory.h(fixtures.ExampleJSXTemplateComponent, {
        label: "example",
    }) as HTMLElement & { props: Record<string, unknown> };

    assertEquals(element.tagName, fixtures.ExampleJSXTemplateComponent.getTagName().toUpperCase());
    assertEquals(element.props.label, "example");
});

