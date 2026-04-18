/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { diTokenNotRegisteredRule } from "../../index.ts";

Deno.test("diagnostics/di/rules: missing injected token should report route path when available", () => {
    const diagnostics = diTokenNotRegisteredRule.run(
        {
            token: {
                key: "MissingApi",
                name: "MissingApi",
            },
            file: "/repo/src/pages/Home.page.tsx",
            exportName: "HomePage",
        },
        {
            registrationsByToken: new Map(),
            routePathsByOwner: new Map([["/repo/src/pages/Home.page.tsx::HomePage", "/home"]]),
        },
    );

    assertEquals(diagnostics, [{
        code: "di-token-not-registered",
        severity: "error",
        subject: "token=MissingApi",
        message: 'Class "HomePage" injects "MissingApi" with mainz/di, ' +
            "but that token is not registered in app startup services.",
        file: "/repo/src/pages/Home.page.tsx",
        exportName: "HomePage",
        routePath: "/home",
    }]);
});
