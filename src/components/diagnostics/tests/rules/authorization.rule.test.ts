/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
    authorizationPolicyNotRegisteredComponentRule,
    componentAllowAnonymousNotSupportedRule,
    componentAuthorizationSsgWarningRule,
} from "../../index.ts";

Deno.test("components/diagnostics/rules: authorization rules should report additive auth issues", () => {
    const component = {
        file: "/repo/src/components/Secret.tsx",
        exportName: "SecretComponent",
        isAbstract: false,
        extendsComponent: true,
        extendsPage: false,
        hasLoad: false,
        renderStrategy: undefined,
        hasFallback: false,
        hasAuthorize: true,
        authorizationPolicy: "org-member",
        hasAllowAnonymous: true,
    };
    const diagnostics = [
        ...componentAllowAnonymousNotSupportedRule.run(component, {}),
        ...componentAuthorizationSsgWarningRule.run(component, {}),
        ...authorizationPolicyNotRegisteredComponentRule.run(component, {
            registeredPolicyNames: new Set(["billing-admin"]),
        }),
    ];

    assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
        "component-allow-anonymous-not-supported",
        "component-authorization-ssg-warning",
        "authorization-policy-not-registered",
    ]);
});
