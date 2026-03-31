/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { discoverDiFacts } from "../index.ts";

Deno.test("di/diagnostics: discover should collect registrations, injections, and cycles", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/di/diagnostics/tests/di-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const facts = await discoverDiFacts([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(
        facts.registrations.find((registration) =>
            registration.token.name === "NeedsMissingDependency"
        ),
        {
            token: {
                key: "NeedsMissingDependency",
                name: "NeedsMissingDependency",
            },
            lifetime: "singleton",
            dependencies: [{
                key: "MissingDependency",
                name: "MissingDependency",
            }],
            file,
        },
    );
    assertEquals(
        facts.registrations.find((registration) =>
            registration.token.name === "UsesRegisteredDependencyApi"
        ),
        {
            token: {
                key: "UsesRegisteredDependencyApi",
                name: "UsesRegisteredDependencyApi",
            },
            lifetime: "singleton",
            dependencies: [{
                key: "RegisteredDependency",
                name: "RegisteredDependency",
            }],
            file,
        },
    );
    assertEquals(facts.injections.length, 2);
    assertEquals(facts.cycles.length, 1);
});

Deno.test("di/diagnostics: discover should resolve imported default app definitions and service classes", async () => {
    const fixtureRoot = resolve(
        Deno.cwd(),
        "tests/fixtures/diagnostics-di-imported-app/src",
    ).replaceAll("\\", "/");
    const files = [
        `${fixtureRoot}/main.tsx`,
        `${fixtureRoot}/app.ts`,
        `${fixtureRoot}/pages/Home.page.tsx`,
        `${fixtureRoot}/services/NeedsMissingDependency.ts`,
    ];

    const facts = await discoverDiFacts(
        await Promise.all(
            files.map(async (file) => ({
                file,
                source: await Deno.readTextFile(file),
            })),
        ),
    );

    assertEquals(
        facts.registrations.find((registration) =>
            registration.token.name === "NeedsMissingDependency"
        ),
        {
            token: {
                key: "NeedsMissingDependency",
                name: "NeedsMissingDependency",
            },
            lifetime: "singleton",
            dependencies: [{
                key: "MissingDependency",
                name: "MissingDependency",
            }],
            file: `${fixtureRoot}/app.ts`,
        },
    );
});
