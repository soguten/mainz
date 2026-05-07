/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join, resolve } from "node:path";
import { discoverPagesFromFile } from "../../../routing/server.ts";
import { collectRouteDiagnostics } from "../index.ts";
import { setupMainzDom } from "../../../testing/index.ts";
import { applyDiagnosticSuppressions } from "../../core/suppressions.ts";

Deno.test("diagnostics/routing: collector should report dynamic ssg, notFound, and routing-set warnings", async () => {
  await setupMainzDom();

  const file = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-diagnostics.fixture.tsx",
    ),
  );
  const pages = await discoverPagesFromFile(file);
  const diagnostics = sortDiagnostics(await collectRouteDiagnostics(pages));

  assertEquals(
    diagnostics,
    sortDiagnostics([
      {
        code: "page-authorization-anonymous-conflict",
        severity: "error",
        message:
          'Page "AllowAnonymousConflictPage" combines @AllowAnonymous() with @Authorize(...). ' +
          "@AllowAnonymous() cannot relax page authorization declared on the same page.",
        file: file.replaceAll("\\", "/"),
        exportName: "AllowAnonymousConflictPage",
        routePath: "/signin",
      },
      {
        code: "dynamic-ssg-missing-entries",
        severity: "error",
        message:
          'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgWithoutEntriesPage",
        routePath: "/docs/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        message:
          'entries() for dynamic SSG route "/news/:slug" returned a non-array result. Expected an array of entry definitions.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidEntriesShapePage",
        routePath: "/news/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/shared/:slug" returned an invalid entry at index 0: Dynamic route "/shared/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidSharedParamsPage",
        routePath: "/shared/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/helper/:slug" returned an invalid entry at index 0: Dynamic route "/helper/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidParamsHelperPage",
        routePath: "/helper/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/nested/:slug" returned an invalid entry at index 0: Dynamic route "/nested/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidNestedParamsHelperPage",
        routePath: "/nested/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/spread/:slug" returned an invalid entry at index 0: Dynamic route "/spread/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidSpreadParamsPage",
        routePath: "/spread/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/shared-spread/:slug" returned an invalid entry at index 0: Dynamic route "/shared-spread/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidSharedSpreadParamsPage",
        routePath: "/shared-spread/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/local-spread/:slug" returned an invalid entry at index 0: Dynamic route "/local-spread/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidLocalSpreadAliasPage",
        routePath: "/local-spread/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/entries-ref/:slug" returned an invalid entry at index 0: Dynamic route "/entries-ref/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidReferencedEntriesPage",
        routePath: "/entries-ref/:slug",
      },
      {
        code: "dynamic-ssg-invalid-entries",
        severity: "error",
        subject: "entry=0",
        message:
          'entries() for dynamic SSG route "/blog/:slug" returned an invalid entry at index 0: Dynamic route "/blog/:slug" requires "slug"; these params is missing from entries().',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidEntriesPage",
        routePath: "/blog/:slug",
      },
      {
        code: "dynamic-ssg-missing-load",
        severity: "warning",
        message:
          'Dynamic SSG route "/async/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidEntriesFromAsyncHelperPage",
        routePath: "/async/:slug",
      },
      {
        code: "dynamic-ssg-missing-load",
        severity: "warning",
        message:
          'Dynamic SSG route "/tips/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidEntriesHelperPage",
        routePath: "/tips/:slug",
      },
      {
        code: "dynamic-ssg-missing-load",
        severity: "warning",
        message:
          'Dynamic SSG route "/entry-helper/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgInvalidEntryHelperPage",
        routePath: "/entry-helper/:slug",
      },
      {
        code: "dynamic-ssg-missing-load",
        severity: "warning",
        message:
          'Dynamic SSG route "/guides/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
        file: file.replaceAll("\\", "/"),
        exportName: "DynamicSsgWithoutLoadPage",
        routePath: "/guides/:slug",
      },
      {
        code: "page-static-load-unsupported",
        severity: "error",
        message:
          'Page "MixedLoadPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
        file: file.replaceAll("\\", "/"),
        exportName: "MixedLoadPage",
        routePath: "/mixed",
      },
      {
        code: "page-render-data-without-explicit-data",
        severity: "error",
        message:
          'Page "RenderDataWithoutExplicitDataPage" declares render(data) without an explicit Data generic on Page<Props, State, Data>. ' +
          "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
        file: file.replaceAll("\\", "/"),
        exportName: "RenderDataWithoutExplicitDataPage",
        routePath: "/render-data/untyped",
      },
      {
        code: "page-render-data-without-load",
        severity: "error",
        message:
          'Page "RenderDataWithoutLoadPage" declares render(data) but does not declare load(). ' +
          "render(data) is only valid when page lifecycle data is owned by load().",
        file: file.replaceAll("\\", "/"),
        exportName: "RenderDataWithoutLoadPage",
        routePath: "/render-data/no-load",
      },
      {
        code: "page-authorization-ssg-warning",
        severity: "warning",
        message:
          'Page "AuthorizedSsgPage" uses @Authorize(...) with @RenderMode("ssg"). ' +
          "Mainz treats this as declarative route metadata only; protected delivery must be enforced by the host, adapter, gateway, or proxy.",
        file: file.replaceAll("\\", "/"),
        exportName: "AuthorizedSsgPage",
        routePath: "/private-docs",
      },
      {
        code: "page-static-load-unsupported",
        severity: "error",
        message:
          'Page "LegacyStaticLoadPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
        file: file.replaceAll("\\", "/"),
        exportName: "LegacyStaticLoadPage",
        routePath: "/legacy",
      },
    ]),
  );
});

Deno.test("diagnostics/routing: collector should report missing named authorization policies when diagnostics know the app policy names", async () => {
  await setupMainzDom();

  const file = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-diagnostics.fixture.tsx",
    ),
  );
  const pages = await discoverPagesFromFile(file);
  const diagnostics = await collectRouteDiagnostics(pages, {
    registeredPolicyNames: ["billing-admin"],
  });

  assertEquals(
    diagnostics.find((diagnostic) =>
      diagnostic.code === "authorization-policy-not-registered" &&
      diagnostic.exportName === "PolicyProtectedPage"
    ),
    {
      code: "authorization-policy-not-registered",
      severity: "error",
      message:
        'Page "PolicyProtectedPage" references @Authorize({ policy: "org-member" }), ' +
        "but that policy name is not declared in app.authorization.policyNames.",
      file: file.replaceAll("\\", "/"),
      exportName: "PolicyProtectedPage",
      routePath: "/org",
    },
  );
});

Deno.test("diagnostics/routing: suppression helper should support owner-wide and subject-scoped matching", async () => {
  const file = resolve(
    join(
      Deno.cwd(),
      "src/diagnostics/routing/tests/route-suppression.fixture.tsx",
    ),
  ).replaceAll("\\", "/");
  const diagnostics = sortDiagnostics(applyDiagnosticSuppressions([
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=pt_BR",
      message:
        'Page "OwnerWideLocaleSuppressionPage" declares invalid locale "pt_BR".',
      file,
      exportName: "OwnerWideLocaleSuppressionPage",
      routePath: "/owner-wide",
    },
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=en_US",
      message:
        'Page "OwnerWideLocaleSuppressionPage" declares invalid locale "en_US".',
      file,
      exportName: "OwnerWideLocaleSuppressionPage",
      routePath: "/owner-wide",
    },
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=pt_BR",
      message:
        'Page "SubjectScopedLocaleSuppressionPage" declares invalid locale "pt_BR".',
      file,
      exportName: "SubjectScopedLocaleSuppressionPage",
      routePath: "/subject-only",
    },
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=en_US",
      message:
        'Page "SubjectScopedLocaleSuppressionPage" declares invalid locale "en_US".',
      file,
      exportName: "SubjectScopedLocaleSuppressionPage",
      routePath: "/subject-only",
    },
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=pt_BR",
      message:
        'Page "InvalidSubjectLocaleSuppressionPage" declares invalid locale "pt_BR".',
      file,
      exportName: "InvalidSubjectLocaleSuppressionPage",
      routePath: "/invalid-subject",
    },
    {
      code: "invalid-locale-tag",
      severity: "error",
      subject: "locale=pt_BR",
      message:
        'Page "DuplicateSubjectLocaleSuppressionPage" declares invalid locale "pt_BR".',
      file,
      exportName: "DuplicateSubjectLocaleSuppressionPage",
      routePath: "/duplicate-subject",
    },
  ], [
    {
      file,
      source: await Deno.readTextFile(file),
    },
  ], {
    routePathsByOwner: new Map([
      [`${file}::OwnerWideLocaleSuppressionPage`, "/owner-wide"],
      [`${file}::SubjectScopedLocaleSuppressionPage`, "/subject-only"],
      [`${file}::InvalidSubjectLocaleSuppressionPage`, "/invalid-subject"],
      [`${file}::DuplicateSubjectLocaleSuppressionPage`, "/duplicate-subject"],
    ]),
  }));

  assertEquals(
    diagnostics,
    sortDiagnostics([
      {
        code: "invalid-diagnostic-suppression",
        severity: "warning",
        message:
          'Duplicate diagnostic suppression "invalid-locale-tag[locale=pt_BR]" on "DuplicateSubjectLocaleSuppressionPage".',
        file,
        exportName: "DuplicateSubjectLocaleSuppressionPage",
        routePath: "/duplicate-subject",
      },
      {
        code: "invalid-diagnostic-suppression",
        severity: "warning",
        message:
          'Invalid diagnostic suppression subject "token=pt_BR" for "invalid-locale-tag" on "InvalidSubjectLocaleSuppressionPage".',
        file,
        exportName: "InvalidSubjectLocaleSuppressionPage",
        routePath: "/invalid-subject",
      },
      {
        code: "invalid-locale-tag",
        severity: "error",
        subject: "locale=pt_BR",
        message:
          'Page "InvalidSubjectLocaleSuppressionPage" declares invalid locale "pt_BR".',
        file,
        exportName: "InvalidSubjectLocaleSuppressionPage",
        routePath: "/invalid-subject",
      },
      {
        code: "invalid-locale-tag",
        severity: "error",
        subject: "locale=en_US",
        message:
          'Page "SubjectScopedLocaleSuppressionPage" declares invalid locale "en_US".',
        file,
        exportName: "SubjectScopedLocaleSuppressionPage",
        routePath: "/subject-only",
      },
    ]),
  );
});

function sortDiagnostics<
  T extends {
    code: string;
    exportName: string;
    routePath?: string;
    subject?: string;
  },
>(
  diagnostics: readonly T[],
): T[] {
  return [...diagnostics].sort((a, b) => {
    if (a.code !== b.code) {
      return a.code.localeCompare(b.code);
    }

    if (a.exportName !== b.exportName) {
      return a.exportName.localeCompare(b.exportName);
    }

    if ((a.routePath ?? "") !== (b.routePath ?? "")) {
      return (a.routePath ?? "").localeCompare(b.routePath ?? "");
    }

    return (a.subject ?? "").localeCompare(b.subject ?? "");
  });
}
