/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join, resolve } from "node:path";
import {
  collectCommandDiagnostics,
  collectDiagnosticsFromModel,
  collectTargetDiagnostics,
  createDiagnosticsTargetModel,
  diagnosticsContributors,
} from "../index.ts";
import { discoverPagesFromFile } from "../../routing/server.ts";
import { setupMainzDom } from "../../testing/index.ts";
import type { DiagnosticsContributor } from "../index.ts";

Deno.test("diagnostics: central contributors registry should aggregate routing, component, and di diagnostics", async () => {
  await setupMainzDom();

  const routeFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-diagnostics.fixture.tsx",
    ),
  );
  const componentFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
    ),
  )
    .replaceAll("\\", "/");
  const diFile = resolve(
    join(Deno.cwd(), "src/diagnostics/di/tests/di-diagnostics.fixture.tsx"),
  )
    .replaceAll(
      "\\",
      "/",
    );
  const commandFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/commands/tests/command-diagnostics.fixture.ts",
    ),
  ).replaceAll("\\", "/");
  const pages = await discoverPagesFromFile(routeFile);
  const diagnostics = await collectTargetDiagnostics({
    pages,
    sourceInputs: [
      {
        file: componentFile,
        source: await Deno.readTextFile(componentFile),
      },
      {
        file: diFile,
        source: await Deno.readTextFile(diFile),
      },
      {
        file: commandFile,
        source: await Deno.readTextFile(commandFile),
      },
    ],
    registeredPolicyNames: ["billing-admin"],
    routePathsByOwner: new Map([[
      `${diFile}::DiagnosticsDiFixturePage`,
      "/di",
    ]]),
  });

  assertEquals(
    diagnosticsContributors.map((contributor) => contributor.name),
    ["routing", "components", "di", "commands"],
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "dynamic-ssg-missing-entries"
    ),
    true,
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "component-placeholder-without-load"
    ),
    true,
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "di-token-not-registered"
    ),
    true,
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "app-command-duplicate-id"
    ),
    true,
  );
});

Deno.test("diagnostics: contributors should collect from the shared target model without extra selection wrappers", async () => {
  await setupMainzDom();

  const routeFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-diagnostics.fixture.tsx",
    ),
  );
  const componentFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
    ),
  )
    .replaceAll("\\", "/");
  const diFile = resolve(
    join(Deno.cwd(), "src/diagnostics/di/tests/di-diagnostics.fixture.tsx"),
  )
    .replaceAll(
      "\\",
      "/",
    );
  const commandFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/commands/tests/command-diagnostics.fixture.ts",
    ),
  ).replaceAll("\\", "/");
  const model = createDiagnosticsTargetModel({
    pages: await discoverPagesFromFile(routeFile),
    sourceInputs: [
      {
        file: componentFile,
        source: await Deno.readTextFile(componentFile),
      },
      {
        file: diFile,
        source: await Deno.readTextFile(diFile),
      },
      {
        file: commandFile,
        source: await Deno.readTextFile(commandFile),
      },
    ],
    registeredPolicyNames: ["billing-admin"],
    routePathsByOwner: new Map([[
      `${diFile}::DiagnosticsDiFixturePage`,
      "/di",
    ]]),
  });
  const diagnostics = await collectDiagnosticsFromModel(model);
  const collectedDiagnostics = await Promise.all(
    diagnosticsContributors.map(async (contributor) => ({
      name: contributor.name,
      diagnostics: await contributor.collect(model),
    })),
  );

  assertEquals(
    collectedDiagnostics.map((entry) => entry.name),
    ["routing", "components", "di", "commands"],
  );
  assertEquals(
    collectedDiagnostics.every((entry) => entry.diagnostics.length > 0),
    true,
  );
  assertEquals(diagnostics.length > 0, true);
});

Deno.test("diagnostics: command diagnostics helper should collect duplicate ids from stable app commands", async () => {
  const commandFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/commands/tests/command-diagnostics.fixture.ts",
    ),
  ).replaceAll("\\", "/");
  const diagnostics = await collectCommandDiagnostics([{
    file: commandFile,
    source: await Deno.readTextFile(commandFile),
  }]);

  assertEquals(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["app-command-duplicate-id", "app-command-duplicate-id"],
  );
});

Deno.test("diagnostics: central collection should apply declaration suppressions after contributor aggregation", async () => {
  const componentFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/components/tests/component-suppression.fixture.tsx",
    ),
  ).replaceAll("\\", "/");
  const routeFile = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-suppression.fixture.tsx",
    ),
  ).replaceAll("\\", "/");
  const model = createDiagnosticsTargetModel({
    pages: [],
    sourceInputs: [
      {
        file: componentFile,
        source: await Deno.readTextFile(componentFile),
      },
      {
        file: routeFile,
        source: await Deno.readTextFile(routeFile),
      },
    ],
    registeredPolicyNames: [],
    routePathsByOwner: new Map([
      [`${routeFile}::OwnerWideLocaleSuppressionPage`, "/owner-wide"],
      [`${routeFile}::SubjectScopedLocaleSuppressionPage`, "/subject-only"],
      [`${routeFile}::InvalidSubjectLocaleSuppressionPage`, "/invalid-subject"],
      [
        `${routeFile}::DuplicateSubjectLocaleSuppressionPage`,
        "/duplicate-subject",
      ],
    ]),
  });

  const contributors: readonly DiagnosticsContributor[] = [{
    name: "synthetic",
    async collect() {
      return [
        {
          code: "component-load-missing-placeholder",
          severity: "warning",
          message: "synthetic component suppression hit",
          file: componentFile,
          exportName: "UsedSuppressedComponent",
        },
        {
          code: "component-load-missing-placeholder",
          severity: "warning",
          message: "synthetic component suppression miss",
          file: componentFile,
          exportName: "UnknownSuppressionComponent",
        },
        {
          code: "invalid-locale-tag",
          severity: "error",
          message: "synthetic locale owner-wide hit",
          file: routeFile,
          exportName: "OwnerWideLocaleSuppressionPage",
          routePath: "/owner-wide",
          subject: "locale=pt_BR",
        },
        {
          code: "invalid-locale-tag",
          severity: "error",
          message: "synthetic locale subject hit",
          file: routeFile,
          exportName: "SubjectScopedLocaleSuppressionPage",
          routePath: "/subject-only",
          subject: "locale=pt_BR",
        },
        {
          code: "invalid-locale-tag",
          severity: "error",
          message: "synthetic locale subject miss",
          file: routeFile,
          exportName: "SubjectScopedLocaleSuppressionPage",
          routePath: "/subject-only",
          subject: "locale=en_US",
        },
      ];
    },
  }];

  const diagnostics = await collectDiagnosticsFromModel(model, contributors);

  assertEquals(
    diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      exportName: diagnostic.exportName,
      subject: diagnostic.subject,
    })),
    [
      {
        code: "invalid-locale-tag",
        exportName: "SubjectScopedLocaleSuppressionPage",
        subject: "locale=en_US",
      },
      {
        code: "component-load-missing-placeholder",
        exportName: "UnknownSuppressionComponent",
        subject: undefined,
      },
      {
        code: "invalid-diagnostic-suppression",
        exportName: "DuplicateSuppressionComponent",
        subject: undefined,
      },
      {
        code: "invalid-diagnostic-suppression",
        exportName: "DuplicateSubjectLocaleSuppressionPage",
        subject: undefined,
      },
      {
        code: "invalid-diagnostic-suppression",
        exportName: "InvalidSubjectLocaleSuppressionPage",
        subject: undefined,
      },
      {
        code: "unknown-diagnostic-suppression",
        exportName: "UnknownSuppressionComponent",
        subject: undefined,
      },
      {
        code: "unused-diagnostic-suppression",
        exportName: "DuplicateSuppressionComponent",
        subject: undefined,
      },
      {
        code: "unused-diagnostic-suppression",
        exportName: "UnusedSuppressionComponent",
        subject: undefined,
      },
      {
        code: "unused-diagnostic-suppression",
        exportName: "DuplicateSubjectLocaleSuppressionPage",
        subject: undefined,
      },
    ],
  );
});
