/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { matrixTest } from "../../harness.ts";

export const routedDiCase = matrixTest({
  name: "di resolves route entries and page summaries",
  fixture: "RoutedDIEntriesApp",
  exercise: {
    render: ["ssg"],
    navigation: ["spa", "mpa", "enhanced-mpa"],
  },
  run: async ({ artifact, fixture }) => {
    await assertStoryRoute({
      artifact,
      fixture,
      path: "/stories/signal-from-di/",
      expectedLocale: "en",
      expectedTitle: "DI Atlas",
      expectedSlug: "signal-from-di",
      expectedSummary: "DI connected entries, route, and summary.",
    });

    await assertStoryRoute({
      artifact,
      fixture,
      path: "/pt/stories/sinal-do-di/",
      expectedLocale: "pt",
      expectedTitle: "Atlas DI",
      expectedSlug: "sinal-do-di",
      expectedSummary: "DI conectou entries, rota e resumo.",
    });
  },
});

async function assertStoryRoute(args: {
  artifact: Parameters<typeof routedDiCase.run>[0]["artifact"];
  fixture: Parameters<typeof routedDiCase.run>[0]["fixture"];
  path: string;
  expectedLocale: "en" | "pt";
  expectedTitle: string;
  expectedSlug: string;
  expectedSummary: string;
}): Promise<void> {
  const preview = await args.fixture.preview(args.artifact, args.path);
  if (typeof preview.responseStatus === "number") {
    assertEquals(preview.responseStatus, 200);
  }

  const screen = await args.fixture.render(args.artifact, args.path);

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
