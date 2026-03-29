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
    assertEquals(facts.injections.length, 2);
    assertEquals(facts.cycles.length, 1);
});
