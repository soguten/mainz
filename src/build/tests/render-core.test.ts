/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { createPageLoadContext } from "../../components/page.ts";
import { renderRouteAppHtml } from "../render-core.ts";

Deno.test("build/render-core: SSR request context stays isolated across concurrent renders", async () => {
  const seen: Array<{
    user: string;
    cookie: string | null;
    query: string;
    location: string;
    domMarker: string;
  }> = [];
  let activeRenders = 0;
  let maxActiveRenders = 0;
  const render = async (user: string) => ({
    user,
    result: await renderRouteAppHtml({
      html:
        '<!doctype html><div id="app"></div><script type="module" src="/app.js"></script>',
      absoluteOutputPath: "/tmp/index.html",
      outputDir: "/tmp",
      basePath: "/",
      renderPath: `/account/${user}`,
      request: new Request(`https://example.test/account/${user}?tab=profile`, {
        headers: { "x-user": user, cookie: `session=${user}` },
      }),
      loadModule: async () => {
        activeRenders++;
        maxActiveRenders = Math.max(maxActiveRenders, activeRenders);
        const context = createPageLoadContext({
          params: {},
          url: new URL(`https://example.test/account/${user}?tab=profile`),
          renderMode: "ssr",
          navigationMode: "spa",
        });
        assertEquals(context.request?.headers.get("x-user"), user);
        assertEquals(context.signal, context.request?.signal);
        document.querySelector("#app")!.setAttribute("data-user", user);
        console.warn(`warning:${user}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        seen.push({
          user: context.request?.headers.get("x-user") ?? "missing",
          cookie: context.request?.headers.get("cookie") ?? null,
          query: new URL(context.request!.url).search,
          location: window.location.pathname,
          domMarker: document.querySelector("#app")!.getAttribute("data-user")!,
        });
        activeRenders--;
      },
    }),
  });

  const results = await Promise.all([render("alice"), render("bob")]);
  assertEquals(maxActiveRenders, 2);
  assertEquals(seen.sort((a, b) => a.user.localeCompare(b.user)), [
    {
      user: "alice",
      cookie: "session=alice",
      query: "?tab=profile",
      location: "/account/alice/",
      domMarker: "alice",
    },
    {
      user: "bob",
      cookie: "session=bob",
      query: "?tab=profile",
      location: "/account/bob/",
      domMarker: "bob",
    },
  ]);
  assertEquals(
    results.map(({ user, result }) => ({ user, warnings: result.warnings }))
      .sort((a, b) => a.user.localeCompare(b.user)),
    [
      { user: "alice", warnings: ["warning:alice"] },
      { user: "bob", warnings: ["warning:bob"] },
    ],
  );
});
