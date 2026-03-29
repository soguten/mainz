/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectNotFoundMustUseSsgDiagnostics } from "../../rules/not-found-must-use-ssg.rule.ts";

Deno.test("routing/diagnostics/rules: notFound render mode rule should ignore ssg pages", () => {
    const diagnostics = collectNotFoundMustUseSsgDiagnostics({
        file: "/repo/src/pages/NotFound.page.tsx",
        exportName: "NotFoundPage",
        page: {
            path: "/404",
            mode: "ssg",
            notFound: true,
        },
    });

    assertEquals(diagnostics, []);
});



