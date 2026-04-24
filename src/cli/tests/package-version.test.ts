import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEquals } from "@std/assert";
import {
    resolvePublishedMainzSpecifier,
    resolvePublishedMainzSpecifierFromModuleUrl,
} from "../package-version.ts";

Deno.test("cli/package-version: should resolve the package specifier from a JSR module URL", () => {
    assertEquals(
        resolvePublishedMainzSpecifierFromModuleUrl(
            "https://jsr.io/@mainz/mainz/0.1.0-alpha.26/src/cli/mainz.ts",
        ),
        "jsr:@mainz/mainz@0.1.0-alpha.26",
    );
});

Deno.test("cli/package-version: should ignore non-Mainz JSR module URLs", () => {
    assertEquals(
        resolvePublishedMainzSpecifierFromModuleUrl(
            "https://jsr.io/@std/assert/1.0.19/mod.ts",
        ),
        undefined,
    );
});

Deno.test("cli/package-version: should resolve the Mainz specifier from cli package URLs", () => {
    assertEquals(
        resolvePublishedMainzSpecifierFromModuleUrl(
            "https://jsr.io/@mainz/cli-deno/0.1.0-alpha.26/mod.cli-deno.ts",
        ),
        "jsr:@mainz/mainz@0.1.0-alpha.26",
    );
});

Deno.test("cli/package-version: should read the local package version for file URLs", async () => {
    const root = await Deno.makeTempDir({ prefix: "mainz-package-version-" });

    try {
        await Deno.mkdir(resolve(root, "src", "cli"), { recursive: true });
        await Deno.writeTextFile(
            resolve(root, "jsr.json"),
            JSON.stringify({ version: "0.1.0-alpha.123" }),
        );

        assertEquals(
            await resolvePublishedMainzSpecifier(
                pathToFileURL(resolve(root, "src", "cli", "mainz.ts")).href,
            ),
            "jsr:@mainz/mainz@0.1.0-alpha.123",
        );
    } finally {
        await Deno.remove(root, { recursive: true });
    }
});
