/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectPageAuthorizationPolicyDiagnostics } from "../../rules/authorization-policy-not-registered.rule.ts";
import { collectPageAuthorizationAnonymousConflictDiagnostics } from "../../rules/page-authorization-anonymous-conflict.rule.ts";
import { collectPageAuthorizationSsgDiagnostics } from "../../rules/page-authorization-ssg-warning.rule.ts";

Deno.test("diagnostics/routing/rules: page authorization rules should report conflict, policy, and ssg warnings", () => {
  const page = {
    file: "/repo/src/pages/Org.page.tsx",
    exportName: "OrgPage",
    page: {
      path: "/org",
      mode: "ssg" as const,
      authorization: {
        allowAnonymous: true as const,
        requirement: {
          authenticated: true as const,
          policy: "org-member",
        },
      },
    },
  };
  const diagnostics = [
    ...collectPageAuthorizationAnonymousConflictDiagnostics(page),
    ...collectPageAuthorizationPolicyDiagnostics(page, {
      registeredPolicyNames: new Set(["billing-admin"]),
    }),
    ...collectPageAuthorizationSsgDiagnostics(page),
  ];

  assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
    "page-authorization-anonymous-conflict",
    "authorization-policy-not-registered",
    "page-authorization-ssg-warning",
  ]);
});
