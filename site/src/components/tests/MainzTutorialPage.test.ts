/// <reference lib="deno.ns" />

/**
 * Tutorial page layout tests
 *
 * Verifies that the site header stays in normal document flow
 * and that the mobile layout guards against horizontal overflow.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
import { buildSiteLocaleHref, setLocale } from "../../i18n/index.ts";
import { pageStyles } from "../../styles/pageStyles.ts";

await setupMainzDom();

const fixtures = await import(
  "./MainzTutorialPage.fixture.tsx"
) as typeof import("./MainzTutorialPage.fixture.tsx");
const sandboxFixtures = await import(
  "./InteractiveSandbox.fixture.tsx"
) as typeof import("./InteractiveSandbox.fixture.tsx");
const pageFixtures = await import(
  "../../pages/NotFound.page.tsx"
) as typeof import("../../pages/NotFound.page.tsx");

Deno.test("site/layout: should render the top nav without floating behavior classes", () => {
  setLocale("pt");
  window.history.replaceState(null, "", "/pt/");
  const screen = renderMainzComponent(fixtures.MainzTutorialPage);

  try {
    const header = screen.getBySelector<HTMLElement>("header.top-nav");
    assert(header.classList.contains("top-nav"));
    assert(!header.classList.contains("floating"));
  } finally {
    screen.cleanup();
  }
});

Deno.test("site/layout: should render a locale switcher that preserves the current section across languages", () => {
  setLocale("pt");
  window.history.replaceState(null, "", "/pt/");
  const screen = renderMainzComponent(fixtures.MainzTutorialPage);

  try {
    const activeLocale = screen.getBySelector<HTMLAnchorElement>(
      ".locale-chip.active",
    );
    const englishLocale = screen.getBySelector<HTMLAnchorElement>(
      '.locale-chip[data-locale="en"]',
    );
    const portugueseLocale = screen.getBySelector<HTMLAnchorElement>(
      '.locale-chip[data-locale="pt"]',
    );

    assertEquals(activeLocale.textContent?.trim(), "PT");
    assertEquals(portugueseLocale.getAttribute("aria-current"), "true");
    assertEquals(englishLocale.getAttribute("href"), "/");
    assertEquals(portugueseLocale.getAttribute("href"), "/pt/");
  } finally {
    screen.cleanup();
  }
});

Deno.test("site/layout: locale helper should preserve the active section when switching languages", () => {
  setLocale("pt");

  const englishHref = buildSiteLocaleHref("en", {
    pathname: "/pt/",
    search: "",
    hash: "#trilha",
  });

  const portugueseHref = buildSiteLocaleHref("pt", {
    pathname: "/en/",
    search: "",
    hash: "#journey",
  });

  assertEquals(englishHref, "/#journey");
  assertEquals(portugueseHref, "/pt/#trilha");
});

Deno.test("site/layout: notFound locale switcher should keep invalid paths while moving the locale prefix", () => {
  setLocale("en");
  window.history.replaceState(null, "", "/pgffhgh");
  const screen = renderMainzComponent(pageFixtures.NotFoundPage);

  try {
    const portugueseLocale = screen.getBySelector<HTMLAnchorElement>(
      '.locale-chip[data-locale="pt"]',
    );
    assertEquals(portugueseLocale.getAttribute("href"), "/pt/pgffhgh/");
  } finally {
    screen.cleanup();
  }
});

Deno.test("site/layout: should preserve injected styles when changing the journey stage", () => {
  setLocale("pt");
  const screen = renderMainzComponent(fixtures.MainzTutorialPage);

  try {
    const styleBefore = screen.component.querySelector("style");

    screen.click("button.chapter-button:nth-of-type(2)");

    const styleAfter = screen.component.querySelector("style");
    const activeButton = screen.getBySelector<HTMLButtonElement>(
      "button.chapter-button.active",
    );

    assert(styleAfter === styleBefore);
    assertEquals(screen.component.querySelectorAll("style").length, 1);
    assertEquals(activeButton.textContent?.trim(), "2. Estado");
  } finally {
    screen.cleanup();
  }
});

Deno.test("site/layout: checkpoint and workshop should coexist without cross-talk", () => {
  setLocale("pt");
  const hljs = sandboxFixtures.installHighlightStub();
  const screen = renderMainzComponent(fixtures.MainzTutorialPage);

  try {
    screen.click(".checkpoint .checkpoint-option:nth-of-type(1)");
    screen.click(".checkpoint .button.button-primary");

    const checkpointResultBefore = screen.getBySelector<HTMLElement>(
      ".checkpoint .checkpoint-result.ok",
    );
    const checkpointActiveBefore = screen.getBySelector<HTMLButtonElement>(
      ".checkpoint .checkpoint-option.active",
    );

    screen.input(
      ".sandbox textarea",
      'import { Component } from "mainz";\n\nclass Todo extends Component {\n}\n',
    );
    screen.click(".sandbox .button.button-primary");

    const workshopResult = screen.getBySelector<HTMLElement>(
      ".sandbox .checkpoint-result.ok",
    );
    const checkpointResultAfter = screen.getBySelector<HTMLElement>(
      ".checkpoint .checkpoint-result.ok",
    );
    const checkpointActiveAfter = screen.getBySelector<HTMLButtonElement>(
      ".checkpoint .checkpoint-option.active",
    );

    assertStringIncludes(workshopResult.textContent ?? "", "Passou");
    assertEquals(
      checkpointResultAfter.textContent,
      checkpointResultBefore.textContent,
    );
    assertEquals(
      checkpointActiveAfter.textContent,
      checkpointActiveBefore.textContent,
    );
    assert(hljs.calls.length >= 1);
  } finally {
    screen.cleanup();
    hljs.cleanup();
  }
});

Deno.test("site/layout: should keep mobile overflow protections in the page styles", () => {
  assertStringIncludes(pageStyles, ".page-shell > *");
  assertStringIncludes(pageStyles, "min-width: 0;");
  assertStringIncludes(pageStyles, "max-width: 100%;");
  assertStringIncludes(pageStyles, ".chapter-row");
  assertStringIncludes(pageStyles, "grid-template-columns: 1fr;");
  assertStringIncludes(pageStyles, ".locale-switcher");
  assertStringIncludes(pageStyles, ".top-nav-actions");
});

Deno.test("site/layout: should avoid page-load animation styles that cause enhanced-mpa flicker", () => {
  assertEquals(pageStyles.includes("press-reveal"), false);
  assertEquals(pageStyles.includes("mainz-page-enter"), false);
  assertEquals(pageStyles.includes("@view-transition"), false);
});
