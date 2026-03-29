/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectPageMetadataDiagnostics } from "../../rules/page-metadata.rule.ts";

Deno.test("routing/diagnostics/rules: page metadata should report notFound conflicts and missing policy names", () => {
    const diagnostics = collectPageMetadataDiagnostics(
        [
            {
                file: "/repo/src/pages/Missing.page.tsx",
                exportName: "MissingPage",
                page: {
                    path: "/missing",
                    mode: "csr",
                    notFound: true,
                    authorization: {
                        allowAnonymous: true,
                        requirement: {
                            authenticated: true,
                        },
                    },
                },
            },
            {
                file: "/repo/src/pages/Org.page.tsx",
                exportName: "OrgPage",
                page: {
                    path: "/org",
                    mode: "csr",
                    authorization: {
                        requirement: {
                            authenticated: true,
                            policy: "org-member",
                        },
                    },
                },
            },
            {
                file: "/repo/src/pages/SignIn.page.tsx",
                exportName: "SignInPage",
                page: {
                    path: "/signin",
                    mode: "csr",
                    authorization: {
                        allowAnonymous: true,
                        requirement: {
                            authenticated: true,
                        },
                    },
                },
            },
            {
                file: "/repo/src/pages/NotFound.page.tsx",
                exportName: "NotFoundPage",
                page: {
                    path: "/404",
                    mode: "ssg",
                    notFound: true,
                },
            },
        ],
        {
            registeredPolicyNames: ["billing-admin"],
        },
    );

    assertEquals(diagnostics.length, 6);
    assertEquals(
        diagnostics.filter((diagnostics) => diagnostics.code === "multiple-not-found-pages").length,
        2,
    );
    assertEquals(
        diagnostics.some((diagnostics) => diagnostics.code === "not-found-must-use-ssg"),
        true,
    );
    assertEquals(
        diagnostics.filter((diagnostics) =>
            diagnostics.code === "page-authorization-anonymous-conflict"
        ).length,
        2,
    );
    assertEquals(
        diagnostics.some((diagnostics) => diagnostics.code === "authorization-policy-not-registered"),
        true,
    );
});



