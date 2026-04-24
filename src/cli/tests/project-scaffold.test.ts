/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createProjectEmptyScaffold } from "../scaffolds/index.ts";

Deno.test("cli/scaffolds/project: empty deno should compose base config and deno files", () => {
    const scaffold = createProjectEmptyScaffold({
        platform: "deno",
        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
    });

    assertEquals([...scaffold.files.keys()], ["mainz.config.ts", "deno.json"]);
    assertStringIncludes(scaffold.files.get("mainz.config.ts") ?? "", 'platform: "deno"');
    assertStringIncludes(
        scaffold.files.get("deno.json") ?? "",
        '"mainz": "jsr:@mainz/mainz@0.1.0-alpha.99"',
    );
});

Deno.test("cli/scaffolds/project: empty node should compose base config and node files", () => {
    const scaffold = createProjectEmptyScaffold({
        platform: "node",
        mainzSpecifier: "@mainz/mainz",
    });

    assertEquals(
        [...scaffold.files.keys()],
        ["mainz.config.ts", "package.json", "tsconfig.json"],
    );
    assertStringIncludes(scaffold.files.get("mainz.config.ts") ?? "", 'platform: "node"');
    assertStringIncludes(scaffold.files.get("package.json") ?? "", '"mainz": "@mainz/mainz"');
    assertStringIncludes(scaffold.files.get("package.json") ?? "", '"dev": "mainz dev"');
    assertStringIncludes(scaffold.files.get("tsconfig.json") ?? "", '"jsxImportSource": "mainz"');
});
