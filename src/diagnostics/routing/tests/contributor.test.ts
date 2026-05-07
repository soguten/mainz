/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join, resolve } from "node:path";
import { discoverPagesFromFile } from "../../../routing/server.ts";
import { collectRouteDiagnostics } from "../index.ts";
import { setupMainzDom } from "../../../testing/index.ts";

Deno.test("diagnostics/routing: route diagnostics entrypoint should preserve current routing behavior", async () => {
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
    diagnostics.some((diagnostics) =>
      diagnostics.code === "authorization-policy-not-registered" &&
      diagnostics.exportName === "PolicyProtectedPage" &&
      diagnostics.routePath === "/org"
    ),
    true,
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "dynamic-ssg-missing-entries" &&
      diagnostics.exportName === "DynamicSsgWithoutEntriesPage"
    ),
    true,
  );
  assertEquals(
    diagnostics.some((diagnostics) =>
      diagnostics.code === "page-render-data-without-load" &&
      diagnostics.exportName === "RenderDataWithoutLoadPage"
    ),
    true,
  );
});
