/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { discoverDiFacts } from "../index.ts";

Deno.test("diagnostics/di: discover should collect registrations, injections, and cycles", async () => {
  const file = resolve(
    Deno.cwd(),
    "src/diagnostics/di/tests/di-diagnostics.fixture.tsx",
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

Deno.test("diagnostics/di: discover should resolve imported default app definitions and service classes", async () => {
  const testAppRoot = resolve(
    Deno.cwd(),
    "tests/test-apps/diagnostics-di-imported-app/src",
  ).replaceAll("\\", "/");
  const files = [
    `${testAppRoot}/main.tsx`,
    `${testAppRoot}/app.ts`,
    `${testAppRoot}/pages/Home.page.tsx`,
    `${testAppRoot}/services/NeedsMissingDependency.ts`,
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
      file: `${testAppRoot}/app.ts`,
    },
  );
});

Deno.test("diagnostics/di: discover should ignore internal startNavigation bootstrap", async () => {
  const file = "/virtual/internal-navigation-test.tsx";

  const facts = await discoverDiFacts([
    {
      file,
      source: `
                import { singleton } from "../di/index.ts";
                import { startNavigation } from "../navigation/internal.ts";

                class InternalOnlyService {}

                startNavigation({
                    mode: "spa",
                    services: [singleton(InternalOnlyService)],
                });
            `,
    },
  ]);

  assertEquals(facts.registrations, []);
});
