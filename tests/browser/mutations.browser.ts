import { assertEquals } from "@std/assert";
import { chromium, firefox, webkit } from "playwright";
import { build, stop } from "esbuild";
import { fileURLToPath } from "node:url";

for (const browserType of [chromium, firefox, webkit]) {
  Deno.test({
    name:
      `browser/mutations: edit, save, retry and cancel in ${browserType.name()}`,
    sanitizeOps: false,
    sanitizeResources: false,
    async fn(t) {
      const root = fileURLToPath(new URL("../../", import.meta.url));
      let script: string;
      try {
        const result = await build({
          absWorkingDir: root,
          entryPoints: ["tests/browser/mutations.fixture.tsx"],
          bundle: true,
          write: false,
          format: "esm",
          platform: "browser",
          jsx: "automatic",
          jsxImportSource: "mainz",
          alias: {
            "mainz/jsx-runtime": `${root}src/jsx-runtime.ts`,
            mainz: `${root}src/public/core.ts`,
          },
        });
        script = result.outputFiles[0].text;
      } finally {
        stop();
      }

      const browser = await browserType.launch();
      try {
        const page = await browser.newPage();
        const errors: string[] = [];
        const requests: Array<{ title: string }> = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("http://localhost/", (route) =>
          route.fulfill({
            contentType: "text/html",
            body: "<!doctype html><html><body></body></html>",
          }));
        await page.route("**/api/items/1", async (route) => {
          const body = route.request().postDataJSON() as { title: string };
          requests.push(body);
          if (
            body.title === "Revised notebook" &&
            requests.filter((request) => request.title === body.title)
                .length ===
              1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            await route.fulfill({
              status: 422,
              contentType: "application/json",
              body: JSON.stringify({
                fieldErrors: { title: "That title is already in use." },
              }),
            });
            return;
          }
          if (body.title === "Cancelled change") {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ item: { id: "1", title: body.title } }),
          }).catch(() => {});
        });
        await page.goto("http://localhost/");
        await page.addScriptTag({ content: script, type: "module" });
        await page.waitForFunction(() =>
          (globalThis as typeof globalThis & {
            mutationFlow?: { mount(): void };
          }).mutationFlow !== undefined
        );
        await page.evaluate(() =>
          (globalThis as typeof globalThis & {
            mutationFlow: { mount(): void };
          }).mutationFlow.mount()
        );

        await t.step("list opens an editable item form", async () => {
          await page.getByRole("heading", { name: "Items" }).waitFor();
          await page.getByText("Notebook", { exact: true }).waitFor();
          await page.getByRole("button", { name: "Edit" }).click();
          await page.getByLabel("Title").waitFor();
          assertEquals(await page.getByLabel("Title").inputValue(), "Notebook");
        });

        await t.step(
          "duplicate submits issue one request and server field errors allow retry",
          async () => {
            await page.getByLabel("Title").fill("Revised notebook");
            await page.evaluate(() => {
              const form = document.querySelector("form")!;
              form.requestSubmit();
              form.requestSubmit();
            });
            await page.getByRole("alert").waitFor();
            assertEquals(requests, [{ title: "Revised notebook" }]);
            assertEquals(
              await page.getByRole("alert").textContent(),
              "That title is already in use.",
            );
            assertEquals(
              await page.getByLabel("Title").getAttribute("aria-invalid"),
              "true",
            );
            assertEquals(
              await page.getByLabel("Title").inputValue(),
              "Revised notebook",
            );

            await page.getByRole("button", { name: "Save" }).click();
            await page.getByText("Item saved.").waitFor();
            await page.getByText("Revised notebook", { exact: true }).waitFor();
            assertEquals(requests, [
              { title: "Revised notebook" },
              { title: "Revised notebook" },
            ]);
          },
        );

        await t.step(
          "cancelling a pending save aborts it and keeps the list intact",
          async () => {
            await page.getByRole("button", { name: "Edit" }).click();
            await page.getByLabel("Title").fill("Cancelled change");
            await page.getByRole("button", { name: "Save" }).click();
            await page.getByRole("button", { name: "Saving…" }).waitFor();
            await page.getByRole("button", { name: "Cancel save" }).click();
            await page.getByText("Save cancelled.").waitFor();
            assertEquals(
              await page.getByText("Revised notebook", { exact: true }).count(),
              1,
            );
            assertEquals(errors, []);
          },
        );
      } finally {
        await browser.close();
      }
    },
  });
}
