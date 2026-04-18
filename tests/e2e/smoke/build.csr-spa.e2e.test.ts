/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { nextTick } from "../../../src/testing/async-testing.ts";
import { buildTargetWithEngine } from "../../helpers/build.ts";
import { extractModuleScriptSrc, resolveOutputScriptPath } from "../../helpers/fixture-io.ts";
import { cliTestsRepoRoot as repoRoot } from "../../helpers/types.ts";

Deno.test("e2e/csr spa: app without navigation should fall back to a direct-load spa shell", async () => {
    await buildPlaygroundCsrSpa();

    const rootHtmlPath = resolve(repoRoot, "dist/playground/csr/index.html");
    const html = await Deno.readTextFile(rootHtmlPath);
    const scriptSrc = extractModuleScriptSrc(html);

    assert(scriptSrc, "Could not find module script src in CSR SPA html.");
    assertStringIncludes(scriptSrc, "/assets/");

    const scriptPath = resolveOutputScriptPath({
        outputDir: resolve(repoRoot, "dist/playground/csr"),
        scriptSrc,
    });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-csr-spa-root`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "spa");
        assertStringIncludes(document.body.textContent ?? "", "Counter");
    }, { url: "https://mainz.local/" });
});

Deno.test("e2e/csr spa: task contract should route preview through the Mainz CLI", async () => {
    const denoJson = JSON.parse(await Deno.readTextFile(resolve(repoRoot, "deno.json"))) as {
        tasks?: Record<string, string>;
    };

    const previewTask = denoJson.tasks?.["preview"];
    const appSpecificPreviewTasks = Object.keys(denoJson.tasks ?? {}).filter((taskName) =>
        taskName.startsWith("preview:")
    );

    assert(previewTask, 'Expected deno task "preview" to exist.');
    assertStringIncludes(previewTask, "deno run -A ./src/cli/mainz.ts preview");
    assertEquals(appSpecificPreviewTasks, []);
});

async function buildPlaygroundCsrSpa(): Promise<void> {
    await buildTargetWithEngine({
        targetName: "playground",
        mode: "csr",
    });
}
