/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import { matrixTest } from "../../harness.ts";

export const hydrationCase = matrixTest({
  name: "hydration preserves prerender and interactive continuity",
  fixture: "RootApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa", "enhanced-mpa"],
  },
  run: async ({ combo, artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/pt/");

    try {
      const hydrationManifest = await fixture.readJson<
        {
          target: string;
          hydration: string;
          navigation: "spa" | "mpa" | "enhanced-mpa";
        } | null
      >(artifact, "hydration.json").catch((error) => {
        if (error instanceof Deno.errors.NotFound) {
          return null;
        }

        throw error;
      });
      if (hydrationManifest) {
        assertEquals(hydrationManifest.navigation, combo.navigation);
      }

      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        combo.navigation,
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
          `Expected ${combo.render} + ${combo.navigation} to stay in Portuguese after boot.`,
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
