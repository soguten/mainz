/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import { matrixTest } from "../../harness.ts";

export const documentLanguageQuickstartCase = matrixTest({
  name: "documentLanguage child routes stay unprefixed and set html lang",
  fixture: "DocumentLanguageRoutedApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa"],
  },
  run: async ({ combo, artifact, fixture }) => {
    if (!(combo.render === "csr" && combo.navigation === "spa")) {
      const html = await fixture.readHtml(artifact, "/quickstart");
      assertStringIncludes(html, '<html lang="pt-BR">');
    }

    const preview = await fixture.preview(artifact, "/quickstart");
    if (typeof preview.responseStatus === "number") {
      assertEquals(preview.responseStatus, 200);
    }

    const screen = await fixture.render(artifact, "/quickstart");

    try {
      await waitFor(() =>
        document.documentElement.lang === "pt-BR" &&
        (document.body.textContent ?? "").includes("Idioma do documento")
      );

      assertEquals(window.location.pathname, "/quickstart");
      assertEquals(document.documentElement.lang, "pt-BR");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        combo.navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "O app declara idioma sem ativar i18n de rota.",
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
