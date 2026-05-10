/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
  invalidLocalePageDiscoveryErrorKind,
  pageDiscoveryFailedErrorKind,
} from "../page-discovery-errors.ts";
import {
  resolveDiscoveredPagesFromDirectory,
  resolveTargetDiscoveredPagesForTarget,
} from "../target-page-discovery.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { makeMainzTempDir } from "../../../tests/helpers/temp.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("routing/target-page-discovery: should classify invalid locale discovery failures with a structured kind", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-invalid-locales",
    targetName: "diagnostics-invalid-locales",
  });

  try {
    const { discoveryErrors } = await resolveDiscoveredPagesFromDirectory(
      resolve(testApp.testAppRoot, "src", "pages"),
    );

    assertEquals(discoveryErrors?.length, 1);
    assertEquals(
      discoveryErrors?.[0]?.kind,
      invalidLocalePageDiscoveryErrorKind,
    );
    assertStringIncludes(
      discoveryErrors?.[0]?.message ?? "",
      '@Locales() received invalid locale "en--US"',
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should classify generic page discovery failures with a structured kind", async () => {
  const tempRoot = await makeMainzTempDir({
    cwd: cliTestsRepoRoot,
    prefix: "route-pages-",
    subdirectories: ["tests", "routing"],
  });
  const pagesDir = resolve(tempRoot, "src", "pages");
  const pageFile = resolve(pagesDir, "Broken.page.tsx");

  try {
    await Deno.mkdir(pagesDir, { recursive: true });
    await Deno.writeTextFile(
      pageFile,
      [
        `import { Page } from ${
          JSON.stringify(
            pathToFileURL(
              resolve(cliTestsRepoRoot, "src", "components", "page.ts"),
            ).href,
          )
        };`,
        "",
        "export class BrokenPage extends Page {}",
        "",
      ].join("\n"),
    );

    const { discoveryErrors } = await resolveDiscoveredPagesFromDirectory(
      pagesDir,
    );

    assertEquals(discoveryErrors?.length, 1);
    assertEquals(discoveryErrors?.[0]?.kind, pageDiscoveryFailedErrorKind);
    assertStringIncludes(
      discoveryErrors?.[0]?.message ?? "",
      "must define a route with @Route(...)",
    );
  } finally {
    await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
  }
});

Deno.test("routing/target-page-discovery: should discover routed pages from the conventional app module", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-di",
    targetName: "diagnostics-di-app-file",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveredPages, discoveryErrors } =
      await resolveTargetDiscoveredPagesForTarget(
        target,
      );

    assertEquals(discoveryErrors, undefined);
    assertEquals(
      discoveredPages?.map((page) => ({
        file: page.file,
        exportName: page.exportName,
        path: page.path,
      })),
      [{
        file: resolve(testApp.testAppRoot, "src", "pages", "Home.page.tsx")
          .replaceAll(
            "\\",
            "/",
          ),
        exportName: "DiagnosticsDiFixturePage",
        path: "/",
      }],
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should discover routed pages when main.tsx imports a default-exported app definition", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-di-imported-app",
    targetName: "diagnostics-di-imported-app",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveredPages, discoveryErrors } =
      await resolveTargetDiscoveredPagesForTarget(
        target,
      );

    assertEquals(discoveryErrors, undefined);
    assertEquals(
      discoveredPages?.map((page) => ({
        file: page.file,
        exportName: page.exportName,
        path: page.path,
      })),
      [{
        file: resolve(
          testApp.testAppRoot,
          "src",
          "pages",
          "Home.page.tsx",
        ).replaceAll("\\", "/"),
        exportName: "DiagnosticsImportedAppPage",
        path: "/",
      }],
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should discover app-level notFound pages without requiring @Route(...)", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "not-found-csr-default",
    targetName: "not-found-csr-default-app-file",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveredPages, discoveryErrors } =
      await resolveTargetDiscoveredPagesForTarget(
        target,
      );

    assertEquals(discoveryErrors, undefined);
    assertEquals(
      discoveredPages?.map((page) => ({
        exportName: page.exportName,
        path: page.path,
        mode: page.mode,
        notFound: page.notFound,
      })),
      [
        {
          exportName: "HomePage",
          path: "/",
          mode: "csr",
          notFound: undefined,
        },
        {
          exportName: "NotFoundPage",
          path: "/404",
          mode: "csr",
          notFound: true,
        },
      ],
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should select the configured appId when resolving discovered pages for a target", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-multi-app",
    targetName: "diagnostics-multi-app-selected",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        appId: "beta-app",
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveredPages, discoveryErrors } =
      await resolveTargetDiscoveredPagesForTarget(
        target,
      );

    assertEquals(discoveryErrors, undefined);
    assertEquals(
      discoveredPages?.map((page) => ({
        exportName: page.exportName,
        path: page.path,
      })),
      [{
        exportName: "BetaPage",
        path: "/beta",
      }],
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should require appId when app discovery finds multiple routed apps", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-multi-app",
    targetName: "diagnostics-multi-app-ambiguous",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
      target,
    );

    assertStringIncludes(
      discoveryErrors?.[0]?.message ?? "",
      "found multiple routed apps",
    );
    assertStringIncludes(
      discoveryErrors?.[0]?.message ?? "",
      "Add appId to select one",
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("routing/target-page-discovery: should report an explicit error when target appId matches no discovered app", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-multi-app",
    targetName: "diagnostics-multi-app-missing-selection",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        appId: "missing-app",
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const { discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
      target,
    );

    assertStringIncludes(
      discoveryErrors?.[0]?.message ?? "",
      'selects appId "missing-app", but',
    );
  } finally {
    await testApp.cleanup();
  }
});
