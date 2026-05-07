/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { matrixTest } from "../../harness.ts";

export const forbiddenMemberCase = matrixTest({
  name:
    "authorization renders forbidden output for blocked authenticated members",
  fixture: "RoutedAuthorizationApp",
  exercise: [
    { render: "csr", navigation: "spa" },
  ],
  run: async ({ artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/admin");

    try {
      assertEquals(window.location.pathname, "/admin");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.querySelector("[data-mainz-authorization='forbidden']")
          ?.textContent
          ?.trim(),
        "403 Forbidden",
      );
      assertStringIncludes(document.body.textContent ?? "", "403 Forbidden");
      assertEquals(
        document.querySelector("[data-page='admin']"),
        null,
      );
    } finally {
      screen.cleanup();
    }
  },
});
