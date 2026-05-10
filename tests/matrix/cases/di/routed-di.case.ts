/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { type ScenarioApp, scenarioTest } from "../../scenario-harness.ts";

export const routedDiCase = scenarioTest({
  name: "di resolves route entries and page summaries",
  run: async ({ app }) => {
    await assertStoryRoute({
      app,
      path: "/stories/signal-from-di/",
      expectedLocale: "en",
      expectedTitle: "DI Atlas",
      expectedSlug: "signal-from-di",
      expectedSummary: "DI connected entries, route, and summary.",
    });

    await assertStoryRoute({
      app,
      path: "/pt/stories/sinal-do-di/",
      expectedLocale: "pt",
      expectedTitle: "Atlas DI",
      expectedSlug: "sinal-do-di",
      expectedSummary: "DI conectou entries, rota e resumo.",
    });
  },
});

async function assertStoryRoute(args: {
  app: ScenarioApp;
  path: string;
  expectedLocale: "en" | "pt";
  expectedTitle: string;
  expectedSlug: string;
  expectedSummary: string;
}): Promise<void> {
  const response = await args.app.route(args.path).load();
  if (typeof response.status === "number") {
    assertEquals(response.status, 200);
  }

  const screen = await args.app.route(args.path).render();

  try {
    assertEquals(document.documentElement.lang, args.expectedLocale);
    assertEquals(document.title, args.expectedTitle);
    assertEquals(
      document.querySelector("[data-story-locale]")?.textContent?.trim(),
      args.expectedLocale,
    );
    assertEquals(
      document.querySelector("[data-story-slug]")?.textContent?.trim(),
      args.expectedSlug,
    );
    assertEquals(
      document.querySelector("[data-story-summary]")?.textContent?.trim(),
      args.expectedSummary,
    );
    assertStringIncludes(
      document.body.textContent ?? "",
      args.expectedLocale === "pt" ? "Atlas de servicos" : "Service atlas",
    );
  } finally {
    screen.cleanup();
  }
}
