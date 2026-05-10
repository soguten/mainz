/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { assertSeoState } from "../../../helpers/document.ts";
import {
  type ScenarioApp,
  scenarioTest,
} from "../../scenario-harness.ts";
import { nextTick, waitFor } from "../../../../src/testing/async-testing.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";

export const routingScenarioCase = scenarioTest({
  name: "routing preserves localized navigation across SSG and CSR routes",
  app: "RoutedApp",
  run: async ({ app }) => {
    await assertRoute({
      app,
      path: "/",
      expectedStatus: 200,
      expectedLocale: "en",
      expectedTitle: "Mainz",
      expectedText: "Start guided journey",
    });

    await assertRoute({
      app,
      path: "/pt/",
      expectedStatus: 200,
      expectedLocale: "pt",
      expectedTitle: "Mainz",
      expectedText: "Iniciar trilha guiada",
    });

    await assertRoute({
      app,
      path: "/pt/dfdfhsdfsdf",
      expectedStatus: 404,
      expectedLocale: "pt",
      expectedTitle: "404 | Mainz",
      expectedText: "Essa rota nao existe no Mainz.",
    });

    await assertRoute({
      app,
      path: "/quickstart",
      expectedStatus: 200,
      expectedLocale: "en",
      expectedTitle: "Quickstart | Mainz",
      expectedText: "Quickstart step",
    });

    await assertRoute({
      app,
      path: "/pt/quickstart",
      expectedStatus: 200,
      expectedLocale: "pt",
      expectedTitle: "Quickstart | Mainz",
      expectedText: "Passo rapido",
    });
  },
});

export const notFoundScenarioCase = scenarioTest({
  name: "notFound preserves localized 404 behavior",
  app: "RoutedApp",
  run: async ({ app }) => {
    await assertNotFoundCase({
      app,
      routePath: "/pgffhgh",
      expectedLocale: "en",
      expectedText: "That route does not exist in Mainz.",
      alternateLocale: "pt",
      expectedAlternateHref: "/pt/pgffhgh/",
    });

    await assertNotFoundCase({
      app,
      routePath: "/pt/dfdfhsdfsdf",
      expectedLocale: "pt",
      expectedText: "Essa rota nao existe no Mainz.",
      alternateLocale: "en",
      expectedAlternateHref: "/dfdfhsdfsdf",
    });
  },
});

export const i18nScenarioCase = scenarioTest({
  name: "i18n preserves localized bootstrap across SSG and CSR routes",
  app: "RoutedApp",
  run: async ({ app }) => {
    const englishHome = await app.route("/").render();
    try {
      assertEquals(document.documentElement.lang, "en");
      assertStringIncludes(
        document.body.textContent ?? "",
        "Start guided journey",
      );
      assertEquals(
        document.querySelector<HTMLAnchorElement>('a[data-locale="pt"]')
          ?.getAttribute("href"),
        "/pt/",
      );
    } finally {
      englishHome.cleanup();
    }

    const portugueseHome = await app.route("/pt/").render();
    try {
      assertEquals(document.documentElement.lang, "pt");
      assertStringIncludes(
        document.body.textContent ?? "",
        "Iniciar trilha guiada",
      );
      assertEquals(
        document.querySelector<HTMLAnchorElement>('a[data-locale="en"]')
          ?.getAttribute("href"),
        "/",
      );
    } finally {
      portugueseHome.cleanup();
    }

    const englishQuickstart = await app.route("/quickstart").render();
    try {
      assertEquals(document.documentElement.lang, "en");
      assertStringIncludes(document.body.textContent ?? "", "Quickstart step");
      assertEquals(
        document.querySelector<HTMLAnchorElement>('a[data-locale="pt"]')
          ?.getAttribute("href"),
        "/pt/quickstart",
      );
    } finally {
      englishQuickstart.cleanup();
    }

    const portugueseQuickstart = await app.route("/pt/quickstart").render();
    try {
      assertEquals(document.documentElement.lang, "pt");
      assertStringIncludes(document.body.textContent ?? "", "Passo rapido");
      assertEquals(
        document.querySelector<HTMLAnchorElement>('a[data-locale="en"]')
          ?.getAttribute("href"),
        "/quickstart",
      );
    } finally {
      portugueseQuickstart.cleanup();
    }
  },
});

export const headScenarioCase = scenarioTest({
  name:
    "head preserves canonical and alternate links across SSG and CSR routes",
  app: "RoutedApp",
  run: async ({ app }) => {
    const localizedHome = await app.route("/pt/").render();
    try {
      assertSeoLinks({
        canonical: "/pt/",
        alternates: {
          en: "/",
          pt: "/pt/",
          "x-default": "/",
        },
      });
    } finally {
      localizedHome.cleanup();
    }

    const localizedQuickstart = await app.route("/pt/quickstart").render();
    try {
      assertSeoLinks({
        canonical: "/pt/quickstart",
        alternates: {
          en: "/quickstart",
          pt: "/pt/quickstart",
          "x-default": "/quickstart",
        },
      });
    } finally {
      localizedQuickstart.cleanup();
    }
  },
});

export const navigationScenarioCase = scenarioTest({
  name: "navigation preserves locale switching semantics",
  app: "RoutedApp",
  run: async ({ navigation, app }) => {
    const screen = await app.route("/").render();

    try {
      await waitFor(() =>
        document.querySelector<HTMLAnchorElement>(
            '.locale-chip[data-locale="pt"]',
          ) !== null &&
        document.documentElement.lang === "en"
      );

      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Start guided journey",
      );

      const localeLink = document.querySelector<HTMLAnchorElement>(
        '.locale-chip[data-locale="pt"]',
      );
      assert(
        localeLink,
        "Expected the PT locale switcher link to be rendered.",
      );
      assertEquals(localeLink.getAttribute("href"), "/pt/");

      const initialText = document.body.textContent ?? "";

      localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
      await nextTick();

      const prefetchHref =
        document.head.querySelector('link[rel="prefetch"][as="document"]')
          ?.getAttribute("href") ?? null;
      const clickEvent = new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      const started = navigation === "spa"
        ? waitForNextNavigationStart({
          mode: "spa",
          path: "/",
          matchedPath: "/",
          locale: "pt",
          navigationType: "push",
        })
        : undefined;
      const clickResult = localeLink.dispatchEvent(clickEvent);
      await waitForPostClick(navigation, started);

      if (navigation === "spa") {
        assertEquals(clickResult, false);
        assertEquals(clickEvent.defaultPrevented, true);
        assertEquals(window.location.pathname, "/pt/");
        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(
          document.body.textContent ?? "",
          "Iniciar trilha guiada",
        );
        assertEquals(
          document.documentElement.dataset.mainzTransitionPhase,
          undefined,
        );
        assertEquals(prefetchHref, null);
        return;
      }

      assertEquals(clickResult, true);
      assertEquals(clickEvent.defaultPrevented, false);
      assertEquals(document.documentElement.lang, "en");
      assertStringIncludes(
        document.body.textContent ?? "",
        "Start guided journey",
      );
      assertEquals(document.body.textContent ?? "", initialText);
      assertEquals(prefetchHref, "https://mainz.local/pt/");
      assertEquals(
        document.documentElement.dataset.mainzTransitionPhase,
        "leaving",
      );
    } finally {
      screen.cleanup();
    }
  },
});

export const hydrationScenarioCase = scenarioTest({
  name: "hydration preserves prerender and interactive continuity",
  app: "RootApp",
  run: async ({ navigation, app }) => {
    const screen = await app.route("/pt/").render();

    try {
      const hydrationManifest = await app.route("/pt/").json<
        {
          target: string;
          hydration: string;
          navigation: "spa" | "mpa";
        } | null
      >("hydration.json").catch((error) => {
        if (error instanceof Deno.errors.NotFound) {
          return null;
        }

        throw error;
      });
      if (hydrationManifest) {
        assertEquals(hydrationManifest.navigation, navigation);
      }

      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertEquals(document.documentElement.lang, "pt");
      assertEquals(
        document.querySelectorAll("#app [class*=chapter-row]").length,
        1,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Iniciar trilha guiada",
      );

      if ((document.body.textContent ?? "").includes("Start guided journey")) {
        throw new Error(
          `Expected ssg + ${navigation} to stay in Portuguese after boot.`,
        );
      }

      const chapterButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".chapter-row .chapter-button",
        ),
      );

      assert(
        chapterButtons.length >= 2,
        "Expected at least two chapter buttons after hydration.",
      );

      const activeBefore = document.querySelector(
        ".chapter-row .chapter-button.active",
      )
        ?.textContent?.trim();
      chapterButtons[1].click();

      await waitFor(() => {
        const activeAfterCandidate = document.querySelector(
          ".chapter-row .chapter-button.active",
        )?.textContent?.trim();
        return Boolean(
          activeBefore && activeAfterCandidate &&
            activeAfterCandidate !== activeBefore,
        );
      });

      const activeAfter = document.querySelector(
        ".chapter-row .chapter-button.active",
      )
        ?.textContent?.trim();

      assert(activeBefore, "Expected an active chapter before interaction.");
      assert(activeAfter, "Expected an active chapter after interaction.");
      assertNotEquals(activeAfter, activeBefore);
    } finally {
      screen.cleanup();
    }
  },
});

export const coreScenarioCases = [
  routingScenarioCase,
  notFoundScenarioCase,
  i18nScenarioCase,
  headScenarioCase,
  navigationScenarioCase,
  hydrationScenarioCase,
] as const;

async function assertRoute(args: {
  app: ScenarioApp;
  path: string;
  expectedStatus: 200 | 404;
  expectedLocale: "en" | "pt";
  expectedTitle: string;
  expectedText: string;
}): Promise<void> {
  const response = await args.app.route(args.path).load();
  if (typeof response.status === "number") {
    assertEquals(response.status, args.expectedStatus);
  }

  const screen = await args.app.route(args.path).render();

  try {
    assertEquals(document.documentElement.lang, args.expectedLocale);
    assertEquals(document.title, args.expectedTitle);
    assertStringIncludes(document.body.textContent ?? "", args.expectedText);
  } finally {
    screen.cleanup();
  }
}

async function assertNotFoundCase(args: {
  app: ScenarioApp;
  routePath: string;
  expectedLocale: "en" | "pt";
  expectedText: string;
  alternateLocale: "en" | "pt";
  expectedAlternateHref: string;
}): Promise<void> {
  const response = await args.app.route(args.routePath).load();
  if (typeof response.status === "number") {
    assertEquals(response.status, 404);
  }

  const screen = await args.app.route(args.routePath).render();
  try {
    assertEquals(document.documentElement.lang, args.expectedLocale);
    assertEquals(document.title, "404 | Mainz");
    assertStringIncludes(document.body.textContent ?? "", args.expectedText);
    assertEquals(
      document.querySelector<HTMLAnchorElement>(
        `a[data-locale="${args.alternateLocale}"]`,
      )
        ?.getAttribute("href"),
      args.expectedAlternateHref,
    );
  } finally {
    screen.cleanup();
  }
}

function assertSeoLinks(args: {
  canonical: string;
  alternates: Record<string, string>;
}): void {
  assertEquals(
    document.head.querySelectorAll('link[rel="canonical"]').length,
    1,
  );
  assertEquals(
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').length,
    Object.keys(args.alternates).length,
  );
  assertEquals(
    document.head.querySelectorAll(
      'link[rel="canonical"][data-mainz-head-managed="true"]',
    ).length,
    1,
  );
  assertEquals(
    document.head.querySelectorAll(
      'link[rel="alternate"][hreflang][data-mainz-head-managed="true"]',
    ).length,
    Object.keys(args.alternates).length,
  );
  assertSeoState({
    canonical: args.canonical,
    alternates: args.alternates,
  });
}

async function waitForPostClick(
  navigationMode: "spa" | "mpa",
  started?: Promise<unknown>,
): Promise<void> {
  if (navigationMode === "spa") {
    await Promise.all([
      started,
      waitForNextNavigationReady({
        mode: "spa",
        path: "/",
        matchedPath: "/",
        locale: "pt",
        navigationType: "push",
      }),
    ]);
    return;
  }

  await nextTick();
}
