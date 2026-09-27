import { assert, assertEquals } from "@std/assert";
import { chromium, firefox, webkit } from "playwright";
import { createArtifactPreviewHandler } from "../../src/preview/artifact-server.ts";
import { buildBrowserNavigationAppForNavigation } from "../helpers/build.ts";

for (const navigation of ["spa", "mpa"] as const) {
  Deno.test({
    name:
      `browser/navigation: ${navigation} history and direct routes in three engines`,
    sanitizeOps: false,
    sanitizeResources: false,
    async fn(t) {
      const scenario = await buildBrowserNavigationAppForNavigation(navigation);
      const artifactRoot = scenario.artifactRootDir;
      assert(
        artifactRoot,
        "Browser navigation app build has no artifact path.",
      );

      const handler = createArtifactPreviewHandler(artifactRoot);
      const server = Deno.serve(
        { hostname: "127.0.0.1", port: 0 },
        (request) => handler(request),
      );
      const origin = `http://127.0.0.1:${(server.addr as Deno.NetAddr).port}`;

      try {
        for (const browserType of [chromium, firefox, webkit]) {
          await t.step(browserType.name(), async () => {
            const browser = await browserType.launch();
            try {
              const page = await browser.newPage();
              const errors: string[] = [];
              page.on("pageerror", (error) => errors.push(error.message));

              const response = await page.goto(`${origin}/`);
              assertEquals(response?.status(), 200);
              await page.getByRole("heading", { name: "Navigation home" })
                .waitFor();

              await page.getByRole("link", { name: "Quickstart" }).click();
              await page.waitForURL((url) => url.pathname === "/quickstart");
              await page.getByRole("heading", {
                name: "Quickstart step",
              }).waitFor();

              const back = page.waitForURL((url) => url.pathname === "/");
              await page.goBack();
              await back;
              await page.getByRole("heading", { name: "Navigation home" })
                .waitFor();

              const forward = page.waitForURL((url) =>
                url.pathname === "/quickstart"
              );
              await page.goForward();
              await forward;
              await page.getByRole("heading", {
                name: "Quickstart step",
              }).waitFor();

              const reload = await page.reload();
              assertEquals(reload?.status(), 200);
              await page.getByRole("heading", {
                name: "Quickstart step",
              }).waitFor();

              const direct = await page.goto(`${origin}/quickstart`);
              assertEquals(direct?.status(), 200);
              await page.getByRole("heading", { name: "Quickstart step" })
                .waitFor();
              assertEquals(errors, []);
            } finally {
              await browser.close();
            }
          });
        }
      } finally {
        await server.shutdown();
        await scenario.cleanup?.();
      }
    },
  });
}
