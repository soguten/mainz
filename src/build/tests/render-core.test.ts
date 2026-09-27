/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { createPageLoadContext } from "../../components/page.ts";
import { renderRouteAppHtml } from "../render-core.ts";

Deno.test("build/render-core: SSR request context stays isolated across concurrent renders", async () => {
  const seen: string[] = [];
  const render = (user: string) =>
    renderRouteAppHtml({
      html:
        '<!doctype html><div id="app"></div><script type="module" src="/app.js"></script>',
      absoluteOutputPath: "/tmp/index.html",
      outputDir: "/tmp",
      basePath: "/",
      renderPath: "/account",
      request: new Request("https://example.test/account", {
        headers: { "x-user": user },
      }),
      loadModule: async () => {
        const context = createPageLoadContext({
          params: {},
          url: new URL("https://example.test/account"),
          renderMode: "ssr",
          navigationMode: "spa",
        });
        seen.push(context.request?.headers.get("x-user") ?? "missing");
        assertEquals(context.signal, context.request?.signal);
        await new Promise((resolve) => setTimeout(resolve, 2));
      },
    });

  await Promise.all([render("alice"), render("bob")]);
  assertEquals(seen.sort(), ["alice", "bob"]);
});
