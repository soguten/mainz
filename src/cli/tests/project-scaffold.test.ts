/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createProjectEmptyScaffold } from "../scaffolds/index.ts";

Deno.test("cli/scaffolds/project: empty deno should compose base config and deno files", () => {
    const scaffold = createProjectEmptyScaffold({
        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
    });

    assertEquals([...scaffold.files.keys()], ["mainz.config.ts", "deno.json"]);
    assertStringIncludes(scaffold.files.get("mainz.config.ts") ?? "", 'runtime: "deno"');
    assertStringIncludes(
        scaffold.files.get("deno.json") ?? "",
        '"mainz": "jsr:@mainz/mainz@0.1.0-alpha.99"',
    );
});
