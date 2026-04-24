/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createProjectEmptyScaffold } from "../scaffolds/index.ts";

Deno.test("cli/scaffolds/project: empty deno should compose base config and deno files", () => {
    const scaffold = createProjectEmptyScaffold({
        runtime: "deno",
        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
    });

    assertEquals([...scaffold.files.keys()], ["mainz.config.ts", "deno.json"]);
    assertStringIncludes(scaffold.files.get("mainz.config.ts") ?? "", 'runtime: "deno"');
    assertStringIncludes(
        scaffold.files.get("deno.json") ?? "",
        '"mainz": "jsr:@mainz/mainz@0.1.0-alpha.99"',
    );
});

Deno.test("cli/scaffolds/project: empty node should compose base config and node files", () => {
    const scaffold = createProjectEmptyScaffold({
        runtime: "node",
        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
    });

    assertEquals(
        [...scaffold.files.keys()],
        ["mainz.config.ts", "package.json", ".npmrc", "tsconfig.json"],
    );
    assertStringIncludes(scaffold.files.get("mainz.config.ts") ?? "", 'runtime: "node"');
    assertStringIncludes(
        scaffold.files.get("package.json") ?? "",
        '"mainz": "npm:@jsr/mainz__mainz@0.1.0-alpha.99"',
    );
    assertStringIncludes(scaffold.files.get("package.json") ?? "", '"dev": "mainz dev"');
    assertStringIncludes(scaffold.files.get(".npmrc") ?? "", "@jsr:registry=https://npm.jsr.io");
    assertStringIncludes(scaffold.files.get("tsconfig.json") ?? "", '"jsxImportSource": "mainz"');
});
