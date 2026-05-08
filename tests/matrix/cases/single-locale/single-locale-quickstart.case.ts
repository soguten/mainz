/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import { matrixTest } from "../../harness.ts";

export const singleLocaleQuickstartCase = matrixTest({
  name: "single-locale child routes stay unprefixed across navigation modes",
  fixture: "SingleLocaleRoutedApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa"],
  },
  run: async ({ combo, artifact, fixture }) => {
    const preview = await fixture.preview(artifact, "/quickstart");
    if (typeof preview.responseStatus === "number") {
      assertEquals(preview.responseStatus, 200);
    }

    const screen = await fixture.render(artifact, "/quickstart");

    try {
      await waitFor(() =>
        document.documentElement.lang === "en" &&
        (document.body.textContent ?? "").includes("Why Mainz")
      );

      assertEquals(window.location.pathname, "/quickstart");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        combo.navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Create your first page",
      );

      assertLinkHref("Overview", "/");
      assertLinkHref("Guides", "/quickstart");
      assertLinkHref("Reference", "/reference");
    } finally {
      screen.cleanup();
    }
  },
});

function assertLinkHref(label: string, expectedHref: string): void {
  const link = Array.from(document.querySelectorAll("a"))
    .find((candidate) => candidate.textContent?.trim() === label);
  assertEquals(link?.getAttribute("href") ?? null, expectedHref);
}
