/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("diagnostics/components: collector should report Component.load strategy and placeholder intent", async () => {
  const file = resolve(
    Deno.cwd(),
    "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
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
      message:
        'Component "AllowAnonymousComponent" declares @AllowAnonymous(). ' +
        "@AllowAnonymous() is page-only; component authorization is always additive.",
      file,
      exportName: "AllowAnonymousComponent",
    },
    {
      code: "component-placeholder-in-ssg-missing-placeholder",
      severity: "error",
      message:
        'Component "PlaceholderInSsgWithoutPlaceholderComponent" declares @RenderPolicy("placeholder-in-ssg") without a placeholder(). ' +
        '@RenderPolicy("placeholder-in-ssg") requires placeholder() so Mainz can emit placeholder output during SSG.',
      file,
      exportName: "PlaceholderInSsgWithoutPlaceholderComponent",
    },
    {
      code: "component-render-data-without-explicit-data",
      severity: "error",
      message:
        'Component "RenderDataWithoutExplicitDataComponent" declares render(data) without an explicit Data generic on Component<Props, State, Data>. ' +
        "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
      file,
      exportName: "RenderDataWithoutExplicitDataComponent",
    },
    {
      code: "component-render-data-without-load",
      severity: "error",
      message:
        'Component "RenderDataWithoutLoadComponent" declares render(data) but does not declare load(). ' +
        "render(data) is only valid when lifecycle data is owned by load().",
      file,
      exportName: "RenderDataWithoutLoadComponent",
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
      message:
        'Component "PolicyProtectedComponent" declares @Authorize(...). ' +
        "Protected components cannot be rendered during SSG because shared prerender output must not include privileged content.",
      file,
      exportName: "PolicyProtectedComponent",
    },
    {
      code: "component-blocking-placeholder-conflict",
      severity: "warning",
      message:
        'Component "BlockingPlaceholderComponent" declares @RenderStrategy("blocking") with a placeholder(). ' +
        'Blocking components normally render resolved output instead of visible placeholder UI, so this placeholder may be misleading unless it is only intended for @RenderPolicy("placeholder-in-ssg").',
      file,
      exportName: "BlockingPlaceholderComponent",
    },
    {
      code: "component-blocking-placeholder-conflict",
      severity: "warning",
      message:
        'Component "PlaceholderWithoutLoadComponent" declares @RenderStrategy("blocking") with a placeholder(). ' +
        'Blocking components normally render resolved output instead of visible placeholder UI, so this placeholder may be misleading unless it is only intended for @RenderPolicy("placeholder-in-ssg").',
      file,
      exportName: "PlaceholderWithoutLoadComponent",
    },
    {
      code: "component-error-without-load",
      severity: "warning",
      message:
        'Component "ErrorWithoutLoadComponent" declares error(error) but does not declare load(). ' +
        "error(error) only participates when async component loading can reject.",
      file,
      exportName: "ErrorWithoutLoadComponent",
    },
    {
      code: "component-placeholder-without-load",
      severity: "warning",
      message:
        'Component "PlaceholderWithoutLoadComponent" declares placeholder() but does not declare load(). ' +
        'placeholder() should accompany async component loading or @RenderPolicy("placeholder-in-ssg").',
      file,
      exportName: "PlaceholderWithoutLoadComponent",
    },
    {
      code: "component-render-strategy-without-load",
      severity: "warning",
      message:
        'Component "StrategyWithoutLoadComponent" declares @RenderStrategy("blocking") but does not declare load(). ' +
        '@RenderStrategy("blocking") is allowed on synchronous components, but it is redundant because blocking is already the default.',
      file,
      exportName: "StrategyWithoutLoadComponent",
    },
  ]);
});

Deno.test("diagnostics/components: collector should report missing named authorization policies when diagnostics know the app policy names", async () => {
  const file = resolve(
    Deno.cwd(),
    "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
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
        "but that policy name is not declared in app.authorization.policyNames.",
      file,
      exportName: "PolicyProtectedComponent",
    },
  );
});

Deno.test("diagnostics/components: collector should validate and apply suppression comments above decorators", async () => {
  const file = resolve(
    Deno.cwd(),
    "src/diagnostics/components/tests/component-suppression.fixture.tsx",
  ).replaceAll("\\", "/");
  const diagnostics = await collectComponentDiagnostics([
    {
      file,
      source: await Deno.readTextFile(file),
    },
  ]);
  const normalizedDiagnostics = JSON.parse(JSON.stringify(diagnostics));

  assertEquals(normalizedDiagnostics, [
    {
      code: "component-load-missing-placeholder",
      severity: "warning",
      message:
        'Component "UnknownSuppressionComponent" declares load() with @RenderStrategy("defer") without a placeholder(). ' +
        "Add placeholder() to make the component's async placeholder explicit.",
      file,
      exportName: "UnknownSuppressionComponent",
    },
    {
      code: "invalid-diagnostic-suppression",
      severity: "warning",
      message:
        'Duplicate diagnostic suppression "component-load-missing-placeholder" on "DuplicateSuppressionComponent".',
      file,
      exportName: "DuplicateSuppressionComponent",
    },
    {
      code: "unknown-diagnostic-suppression",
      severity: "warning",
      message:
        'Unknown diagnostic suppression code "not-a-real-code" on "UnknownSuppressionComponent".',
      file,
      exportName: "UnknownSuppressionComponent",
    },
    {
      code: "unused-diagnostic-suppression",
      severity: "warning",
      message:
        'Diagnostic suppression "component-load-missing-placeholder" on "UnusedSuppressionComponent" was not used.',
      file,
      exportName: "UnusedSuppressionComponent",
    },
  ]);
});
