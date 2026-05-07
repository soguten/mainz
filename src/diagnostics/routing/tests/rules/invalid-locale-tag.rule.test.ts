/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectInvalidLocaleTagDiagnostics } from "../../rules/invalid-locale-tag.rule.ts";

Deno.test("diagnostics/routing/rules: invalid locale rule should ignore valid locale tags", () => {
  const diagnostics = collectInvalidLocaleTagDiagnostics({
    file: "/repo/src/pages/Home.page.tsx",
    exportName: "HomePage",
    page: {
      path: "/",
      mode: "ssg",
      locales: ["en-US"],
    },
  });

  assertEquals(diagnostics, []);
});

Deno.test("diagnostics/routing/rules: invalid locale rule should report invalid locale tags", () => {
  const diagnostics = collectInvalidLocaleTagDiagnostics({
    file: "/repo/src/pages/Home.page.tsx",
    exportName: "HomePage",
    page: {
      path: "/",
      mode: "ssg",
      locales: ["pt-BR!"],
    },
  });

  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0]?.code, "invalid-locale-tag");
});
