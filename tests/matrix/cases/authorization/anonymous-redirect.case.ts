/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { matrixTest } from "../../harness.ts";

export const anonymousRedirectCase = matrixTest({
  name: "authorization redirects anonymous users to localized login pages",
  fixture: "RoutedAuthorizationApp",
  exercise: [
    { render: "csr", navigation: "spa" },
  ],
  run: async ({ artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/pt/dashboard");

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
