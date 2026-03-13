/// <reference lib="deno.ns" />

/**
 * Tutorial page layout tests
 *
 * Verifies that the site header stays in normal document flow
 * and that the mobile layout guards against horizontal overflow.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
import { setLocale } from "../../i18n/index.ts";
import { pageStyles } from "../../styles/pageStyles.ts";

await setupMainzDom();

const fixtures = await import("./MainzTutorialPage.fixture.tsx") as typeof import("./MainzTutorialPage.fixture.tsx");

Deno.test("site/layout: should render the top nav without floating behavior classes", () => {
    setLocale("pt");
    const screen = renderMainzComponent(fixtures.MainzTutorialPage);

    try {
        const header = screen.getBySelector<HTMLElement>("header.top-nav");
        assert(header.classList.contains("top-nav"));
        assert(!header.classList.contains("floating"));
    } finally {
        screen.cleanup();
    }
});

Deno.test("site/layout: should keep mobile overflow protections in the page styles", () => {
    assertStringIncludes(pageStyles, ".page-shell > *");
    assertStringIncludes(pageStyles, "min-width: 0;");
    assertStringIncludes(pageStyles, "max-width: 100%;");
    assertStringIncludes(pageStyles, ".chapter-row");
    assertStringIncludes(pageStyles, "grid-template-columns: 1fr;");
});
