/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectMultipleNotFoundPagesDiagnostics } from "../../rules/multiple-not-found-pages.rule.ts";

Deno.test("diagnostics/routing/rules: multiple notFound rule should allow a single notFound page", () => {
  const diagnostics = collectMultipleNotFoundPagesDiagnostics([
    {
      file: "/repo/src/pages/NotFound.page.tsx",
      exportName: "NotFoundPage",
      page: {
        path: "/404",
        mode: "ssg",
        notFound: true,
      },
    },
  ]);

  assertEquals(diagnostics, []);
});
