/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { runMainzCliCommand } from "../../../tests/helpers/test-helpers.ts";

Deno.test("cli/mainz: publish-info should print artifact metadata resolved from a target profile", async () => {
    const { stdout } = await runMainzCliCommand(
        ["publish-info", "--target", "site", "--profile", "gh-pages"],
        "publish-info failed.",
    );
    const metadata = JSON.parse(stdout);

    assertEquals(metadata.target, "site");
    assertEquals(metadata.profile, "gh-pages");
    assertEquals(metadata.artifactDir, "dist/site/ssg");
    assertEquals(metadata.basePath, "/");
    assertEquals(metadata.renderMode, "ssg");
    assertEquals(metadata.navigationMode, "enhanced-mpa");
});

Deno.test("cli/mainz: publish-info should accept explicit navigation overrides without a dedicated profile", async () => {
    const { stdout } = await runMainzCliCommand(
        ["publish-info", "--target", "site", "--mode", "csr", "--navigation", "spa"],
        "publish-info failed.",
    );
    const metadata = JSON.parse(stdout);

    assertEquals(metadata.target, "site");
    assertEquals(metadata.profile, "production");
    assertEquals(metadata.renderMode, "csr");
    assertEquals(metadata.navigationMode, "spa");
});
