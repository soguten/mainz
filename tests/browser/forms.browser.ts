import { assertEquals } from "@std/assert";
import { chromium, firefox, webkit } from "playwright";
import { build, stop } from "esbuild";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import { createArtifactPreviewHandler } from "../../src/preview/artifact-server.ts";
import { buildRootAppForNavigation } from "../helpers/build.ts";

// Deliberately separate from the Happy DOM suite. Run explicitly with:
// deno test -A tests/browser/forms.browser.ts
for (const browserType of [chromium, firefox, webkit]) {
  Deno.test({
    name: `browser/forms: native controls in ${browserType.name()}`,
    sanitizeOps: false,
    sanitizeResources: false,
    async fn(t) {
      const root = fileURLToPath(new URL("../../", import.meta.url));
      let script: string;
      try {
        const result = await build({
          absWorkingDir: root,
          entryPoints: ["tests/browser/forms.fixture.ts"],
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
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setContent(`<!doctype html><html><body>
          <x-mainz-hydration-form>
            <form>
              <input name="title" value="server value">
              <textarea name="description">server description</textarea>
              <output>0</output>
            </form>
          </x-mainz-hydration-form>
        </body></html>`);
        const preHydrationInput = page.locator('input[name="title"]');
        await preHydrationInput.fill("typed before boot");
        await preHydrationInput.evaluate((node: HTMLInputElement) => {
          node.setSelectionRange(3, 8);
        });
        await preHydrationInput.focus();
        await page.addScriptTag({ content: script, type: "module" });
        await page.waitForFunction(() =>
          customElements.get("x-mainz-hydration-form") !== undefined
        );
        await t.step(
          "first render hydrates prerendered form controls without losing edits or focus",
          async () => {
            const result = await preHydrationInput.evaluate(
              (node: HTMLInputElement) => [
                node.value,
                document.activeElement === node,
                node.selectionStart,
                node.selectionEnd,
              ],
            );
            assertEquals(result, ["typed before boot", true, 3, 8]);
            assertEquals(
              await page.locator("textarea").inputValue(),
              "server description",
            );
          },
        );
        await t.step(
          "multiple select submits all values and follows state",
          async () => {
            const result = await page.evaluate(() => {
              forms.mount("MultipleFormComponent");
              const form = document.querySelector("form")!;
              const before = new FormData(form).getAll("tags");
              forms.update({ values: ["b", "d"], options: ["d", "c", "b"] });
              const after = new FormData(form).getAll("tags");
              forms.update({ values: [] });
              return [before, after, new FormData(form).getAll("tags")];
            });
            assertEquals(result, [["a", "c"], ["d", "b"], []]);
          },
        );
        await t.step(
          "uncontrolled multiple select preserves edits and resets every default",
          async () => {
            const result = await page.evaluate(() => {
              forms.mount("DefaultMultipleFormComponent");
              const form = document.querySelector("form")!;
              const select = document.querySelector("select")!;
              for (const option of select.options) {
                option.selected = option.value === "b";
              }
              forms.update({ count: 1 });
              const edited = new FormData(form).getAll("tags");
              form.reset();
              return [edited, new FormData(form).getAll("tags")];
            });
            assertEquals(result, [["b"], ["a", "c"]]);
          },
        );
        await t.step(
          "typing, focus and selection survive unrelated render",
          async () => {
            await page.evaluate(() => forms.mount("DefaultsFormComponent"));
            const input = page.locator('input[name="title"]');
            await input.fill("user edit");
            const result = await page.evaluate(() => {
              const input = document.querySelector<HTMLInputElement>(
                'input[name="title"]',
              )!;
              input.setSelectionRange(2, 5);
              forms.update({ count: 1 });
              return [
                input.value,
                document.activeElement === input,
                input.selectionStart,
                input.selectionEnd,
              ];
            });
            assertEquals(result, ["user edit", true, 2, 5]);
          },
        );
        await t.step(
          "native validation and Enter submit use the component listener once",
          async () => {
            await page.evaluate(() => forms.mount("DefaultsFormComponent"));
            const input = page.locator('input[name="title"]');
            await input.fill("");
            await input.press("Enter");
            assertEquals(await page.evaluate(() => forms.submissions()), 0);
            await input.fill("valid");
            await page.evaluate(() => {
              forms.update({ count: 1 });
              forms.update({ count: 2 });
            });
            await input.press("Enter");
            assertEquals(await page.evaluate(() => forms.submissions()), 1);
          },
        );
        await t.step(
          "selected files survive render and submit with their contents",
          async () => {
            await page.evaluate(() => forms.mount("FileFormComponent"));
            await page.locator('input[type="file"]').setInputFiles({
              name: "hello.txt",
              mimeType: "text/plain",
              buffer: Buffer.from("hello"),
            });
            const result = await page.evaluate(async () => {
              forms.update({ count: 1 });
              const file = new FormData(document.querySelector("form")!).get(
                "attachment",
              ) as File;
              return [file.name, await file.text()];
            });
            assertEquals(result, ["hello.txt", "hello"]);
          },
        );
        await t.step(
          "submitter, successful controls and formNoValidate survive rerender",
          async () => {
            await page.evaluate(() => {
              forms.mount("SubmissionFormComponent");
              forms.update({ count: 1 });
            });
            await page.getByRole("button", { name: "Save", exact: true })
              .click();
            assertEquals(
              await page.locator("output").textContent(),
              JSON.stringify([
                ["code", "ABC"],
                ["quantity", "2"],
                ["action", "save"],
              ]),
            );
            await page.locator('input[name="code"]').fill("");
            await page.getByRole("button", { name: "Save", exact: true })
              .click();
            assertEquals(
              await page.locator("output").getAttribute("data-submissions"),
              "1",
            );
            // Firefox's automated pointer click can hang after native validation
            // with this layout, also in plain HTML. Exercise keyboard activation.
            const draft = page.getByRole("button", {
              name: "Draft",
              exact: true,
            });
            await draft.focus();
            await draft.press("Enter");
            assertEquals(
              await page.locator("output").textContent(),
              JSON.stringify([
                ["code", ""],
                ["quantity", "2"],
                ["action", "draft"],
              ]),
            );
            assertEquals(
              await page.locator("output").getAttribute("data-submissions"),
              "2",
            );
          },
        );
        await t.step(
          "pattern, range, step and custom validity remain native",
          async () => {
            const result = await page.evaluate(() => {
              forms.mount("SubmissionFormComponent");
              const form = document.querySelector("form")!;
              const code = form.elements.namedItem("code") as HTMLInputElement;
              const quantity = form.elements.namedItem(
                "quantity",
              ) as HTMLInputElement;
              code.value = "bad";
              const pattern = code.validity.patternMismatch &&
                !form.checkValidity();
              code.value = "ABC";
              quantity.value = "1";
              const min = quantity.validity.rangeUnderflow;
              quantity.value = "7";
              const max = quantity.validity.rangeOverflow;
              quantity.value = "3";
              const step = quantity.validity.stepMismatch;
              quantity.value = "4";
              code.setCustomValidity("Server error");
              forms.update({ count: 1 });
              const custom = code.validationMessage === "Server error" &&
                !form.reportValidity();
              code.setCustomValidity("");
              return [pattern, min, max, step, custom, form.checkValidity()];
            });
            assertEquals(result, [true, true, true, true, true, true]);
          },
        );
        await t.step(
          "keyed moves retain field identity and edited values",
          async () => {
            const result = await page.evaluate(() => {
              forms.mount("KeyedFormComponent");
              const input = document.querySelector<HTMLInputElement>(
                'input[name="b"]',
              )!;
              input.value = "edited";
              forms.update({ order: ["c", "b", "a"] });
              return [
                document.querySelector('input[name="b"]') === input,
                Array.from(
                  new FormData(document.querySelector("form")!).entries(),
                ),
              ];
            });
            assertEquals(result, [true, [["c", "c"], ["b", "edited"], [
              "a",
              "a",
            ]]]);
          },
        );
        await t.step(
          "controlled reset restores defaults until state renders again",
          async () => {
            const result = await page.evaluate(() => {
              forms.mount("ResetControlledFormComponent");
              const form = document.querySelector("form")!;
              const values = () =>
                Array.from(
                  form.querySelectorAll("input, textarea"),
                  (node) => (node as HTMLInputElement).value,
                );
              const before = values();
              form.reset();
              const reset = values();
              forms.update({ text: "updated" });
              return [before, reset, values()];
            });
            assertEquals(result, [["current", "current"], [
              "baseline",
              "baseline",
            ], ["updated", "updated"]]);
          },
        );
        assertEquals(errors, []);
      } finally {
        await browser.close();
      }
    },
  });
}

Deno.test({
  name: "browser/built app: SSG markup hydrates and responds in three engines",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const scenario = await buildRootAppForNavigation("mpa");
    const artifactRoot = scenario.artifactRootDir;
    if (!artifactRoot) throw new Error("Root app build has no artifact path.");

    const handler = createArtifactPreviewHandler(artifactRoot);
    const server = Deno.serve(
      { hostname: "127.0.0.1", port: 0 },
      (request) => handler(request),
    );
    const port = (server.addr as Deno.NetAddr).port;
    try {
      for (const browserType of [chromium, firefox, webkit]) {
        const browser = await browserType.launch();
        try {
          const page = await browser.newPage();
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.goto(`http://127.0.0.1:${port}/pt/`);
          await page.getByRole("heading", { name: "Iniciar trilha guiada" })
            .waitFor();
          const chapters = page.getByRole("button", { name: "Capitulos" });
          await chapters.click();
          assertEquals(
            await chapters.getAttribute("class"),
            "chapter-button active",
          );
          assertEquals(errors, []);
        } finally {
          await browser.close();
        }
      }
    } finally {
      await server.shutdown();
      await scenario.cleanup?.();
    }
  },
});

declare const forms: {
  mount(name: string): void;
  update(state: Record<string, unknown>): void;
  submissions(): number;
};
