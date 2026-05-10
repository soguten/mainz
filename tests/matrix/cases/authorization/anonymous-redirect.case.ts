/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { scenarioTest } from "../../scenario-harness.ts";

export const anonymousRedirectCase = scenarioTest({
  name: "authorization redirects anonymous users to localized login pages",
  run: async ({ app }) => {
    const screen = await app.route("/pt/dashboard").render();

    try {
      assertEquals(window.location.pathname, "/pt/login");
      assertEquals(document.documentElement.lang, "pt");
      assertEquals(document.title, "Entrar");
      assertEquals(
        document.querySelector("[data-page='login']")?.textContent?.trim(),
        "Pagina de login",
      );
    } finally {
      screen.cleanup();
    }
  },
});
