/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertStringIncludes, assertRejects } from "@std/assert";
import { main } from "../mainz.ts";

Deno.test("cli/mainz node host: init should default to node without --runtime", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-host-init-" });
    const previousCwd = Deno.cwd();

    try {
        Deno.chdir(cwd);

        const exitCode = await main(
            ["init", "--mainz", "jsr:@mainz/mainz@0.1.0-alpha.99"],
            { hostRuntime: "node" },
        );

        assertEquals(exitCode, 0);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');

        const packageJson = await Deno.readTextFile(resolve(cwd, "package.json"));
        assertStringIncludes(packageJson, '"mainz": "npm:@jsr/mainz__mainz@0.1.0-alpha.99"');
    } finally {
        Deno.chdir(previousCwd);
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz node host: app create and dev should use the node host runtime implicitly", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-host-dev-" });
    const previousCwd = Deno.cwd();

    try {
        Deno.chdir(cwd);

        const initExitCode = await main(
            ["init", "--mainz", "jsr:@mainz/mainz@0.1.0-alpha.99"],
            { hostRuntime: "node" },
        );
        assertEquals(initExitCode, 0);

        const createExitCode = await main(
            ["app", "create", "site"],
            { hostRuntime: "node" },
        );
        assertEquals(createExitCode, 0);

        await assertRejects(
            () =>
                main(
                    ["dev", "--target", "missing-target"],
                    { hostRuntime: "node" },
                ),
            Error,
            'No targets matched "missing-target".',
        );

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');
        assertStringIncludes(config, 'name: "site"');
    } finally {
        Deno.chdir(previousCwd);
        await Deno.remove(cwd, { recursive: true });
    }
});
