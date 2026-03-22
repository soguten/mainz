/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
    createAnonymousPrincipal,
    evaluateAuthorizationRequirement,
    filterVisibleRoutes,
    findMissingAuthorizationPolicies,
    isRouteVisible,
} from "../runtime.ts";
import type { RouteManifestEntry } from "../../routing/types.ts";

Deno.test("authorization/runtime: should treat public routes as visible and protected routes as hidden for anonymous principals", async () => {
    const publicRoute: RouteManifestEntry = {
        id: "home",
        source: "filesystem",
        path: "/",
        pattern: "/",
        mode: "csr",
        locales: ["en"],
    };
    const protectedRoute: RouteManifestEntry = {
        id: "dashboard",
        source: "filesystem",
        path: "/dashboard",
        pattern: "/dashboard",
        mode: "csr",
        locales: ["en"],
        authorization: {
            requirement: {
                authenticated: true,
            },
        },
    };

    assertEquals(
        await isRouteVisible({
            route: publicRoute,
            principal: createAnonymousPrincipal(),
        }),
        true,
    );
    assertEquals(
        await isRouteVisible({
            route: protectedRoute,
            principal: createAnonymousPrincipal(),
        }),
        false,
    );
});

Deno.test("authorization/runtime: should filter routes using roles and policies", async () => {
    const routes: RouteManifestEntry[] = [
        {
            id: "home",
            source: "filesystem",
            path: "/",
            pattern: "/",
            mode: "csr",
            locales: ["en"],
        },
        {
            id: "team",
            source: "filesystem",
            path: "/team",
            pattern: "/team",
            mode: "csr",
            locales: ["en"],
            authorization: {
                requirement: {
                    authenticated: true,
                    roles: ["member"],
                },
            },
        },
        {
            id: "org",
            source: "filesystem",
            path: "/org",
            pattern: "/org",
            mode: "csr",
            locales: ["en"],
            authorization: {
                requirement: {
                    authenticated: true,
                    policy: "org-member",
                },
            },
        },
    ];

    const visibleRoutes = await filterVisibleRoutes({
        routes,
        principal: {
            authenticated: true,
            id: "member-1",
            roles: ["member"],
            claims: {
                org: "mainz",
            },
        },
        policies: {
            "org-member": (principal) => principal.claims.org === "mainz",
        },
    });

    assertEquals(
        visibleRoutes.map((route) => route.id),
        ["home", "team", "org"],
    );
});

Deno.test("authorization/runtime: should report missing authorization policies from discovered metadata", () => {
    assertEquals(
        findMissingAuthorizationPolicies({
            authorizations: [
                undefined,
                {
                    requirement: {
                        authenticated: true,
                        policy: "org-member",
                    },
                },
                {
                    requirement: {
                        authenticated: true,
                        policy: "billing-admin",
                    },
                },
                {
                    requirement: {
                        authenticated: true,
                        policy: "org-member",
                    },
                },
            ],
            policies: {
                "billing-admin": () => true,
            },
        }),
        ["org-member"],
    );
});

Deno.test("authorization/runtime: should fail fast when a named policy is not registered", () => {
    assertThrows(
        () =>
            evaluateAuthorizationRequirement({
                principal: {
                    authenticated: true,
                    id: "member-1",
                    roles: ["member"],
                    claims: {},
                },
                requirement: {
                    authenticated: true,
                    policy: "org-member",
                },
            }),
        Error,
        'Authorization policy "org-member" is not registered.',
    );
});

Deno.test("authorization/runtime: should support async policy evaluation for route visibility helpers", async () => {
    const visibleRoutes = await filterVisibleRoutes({
        routes: [
            {
                id: "org",
                source: "filesystem",
                path: "/org",
                pattern: "/org",
                mode: "csr",
                locales: ["en"],
                authorization: {
                    requirement: {
                        authenticated: true,
                        policy: "org-member",
                    },
                },
            },
        ],
        principal: {
            authenticated: true,
            id: "member-1",
            roles: ["member"],
            claims: {},
        },
        policies: {
            "org-member": async () => true,
        },
    });

    assertEquals(
        visibleRoutes.map((route) => route.id),
        ["org"],
    );
});
