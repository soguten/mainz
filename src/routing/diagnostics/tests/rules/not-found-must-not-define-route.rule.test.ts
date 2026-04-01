/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectNotFoundMustNotDefineRouteDiagnostics } from "../../rules/not-found-must-not-define-route.rule.ts";

Deno.test("routing/diagnostics/rules: notFound pages should not define @Route(...)", () => {
    const diagnostics = collectNotFoundMustNotDefineRouteDiagnostics({
        file: "/repo/src/pages/NotFound.page.tsx",
        exportName: "NotFoundPage",
        page: {
            path: "/404",
            declaredRoutePath: "/oops",
            mode: "ssg",
            notFound: true,
        },
    });

    assertEquals(diagnostics, [{
        code: "not-found-must-not-define-route",
        severity: "error",
        message:
            'notFound page "NotFoundPage" must not define @Route(...). Register it only through defineApp({ notFound }).',
        file: "/repo/src/pages/NotFound.page.tsx",
        exportName: "NotFoundPage",
        routePath: "/oops",
    }]);
});
