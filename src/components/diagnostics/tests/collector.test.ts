/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("components/diagnostics: collector should report Component.load strategy and fallback intent", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/components/diagnostics/tests/component-load-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");
    const diagnostics = await collectComponentDiagnostics([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(diagnostics, [
        {
            code: "component-allow-anonymous-not-supported",
            severity: "error",
            message: 'Component "AllowAnonymousComponent" declares @AllowAnonymous(). ' +
                "@AllowAnonymous() is page-only; component authorization is always additive.",
            file,
            exportName: "AllowAnonymousComponent",
        },
        {
            code: "component-authorization-ssg-warning",
            severity: "warning",
            message: 'Component "AuthorizedComponent" declares @Authorize(...). ' +
                "Protected components cannot be rendered during SSG because shared prerender output must not include privileged content.",
            file,
            exportName: "AuthorizedComponent",
        },
        {
            code: "component-authorization-ssg-warning",
            severity: "warning",
            message: 'Component "PolicyProtectedComponent" declares @Authorize(...). ' +
                "Protected components cannot be rendered during SSG because shared prerender output must not include privileged content.",
            file,
            exportName: "PolicyProtectedComponent",
        },
        {
            code: "component-blocking-fallback-misleading",
            severity: "warning",
            message:
                'Component "BlockingFallbackComponent" declares @RenderStrategy("blocking") with a fallback. ' +
                "Blocking components normally render resolved output instead of visible fallback UI, so this fallback may be misleading.",
            file,
            exportName: "BlockingFallbackComponent",
        },
        {
            code: "component-load-missing-fallback",
            severity: "warning",
            message:
                'Component "MissingFallbackLoadComponent" declares load() with @RenderStrategy("client-only") without a fallback. ' +
                "Add a fallback to make the component's async placeholder explicit.",
            file,
            exportName: "MissingFallbackLoadComponent",
        },
        {
            code: "component-render-strategy-without-load",
            severity: "warning",
            message:
                'Component "StrategyWithoutLoadComponent" declares @RenderStrategy("blocking") but does not declare load(). ' +
                "@RenderStrategy(...) only affects Component.load() and has no effect on synchronous components.",
            file,
            exportName: "StrategyWithoutLoadComponent",
        },
    ]);
});

Deno.test("components/diagnostics: collector should report missing named authorization policies when diagnostics know the target policy names", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/components/diagnostics/tests/component-load-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");
    const diagnostics = await collectComponentDiagnostics(
        [
            {
                file,
                source: await Deno.readTextFile(file),
            },
        ],
        {
            registeredPolicyNames: ["billing-admin"],
        },
    );

    assertEquals(
        diagnostics.find((diagnostic) =>
            diagnostic.code === "authorization-policy-not-registered" &&
            diagnostic.exportName === "PolicyProtectedComponent"
        ),
        {
            code: "authorization-policy-not-registered",
            severity: "error",
            message:
                'Component "PolicyProtectedComponent" references @Authorize({ policy: "org-member" }), ' +
                "but that policy name is not declared in target.authorization.policyNames for diagnostics.",
            file,
            exportName: "PolicyProtectedComponent",
        },
    );
});
