/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join, resolve } from "node:path";
import { collectCommandDiagnostics, discoverCommandFacts } from "../index.ts";

Deno.test("commands/diagnostics: should discover stable app command registrations from app definitions", async () => {
    const fixtureFile = resolve(
        join(Deno.cwd(), "src/commands/diagnostics/tests/command-diagnostics.fixture.ts"),
    ).replaceAll("\\", "/");
    const source = await Deno.readTextFile(fixtureFile);

    const facts = await discoverCommandFacts([{
        file: fixtureFile,
        source,
    }], {
        appId: "docs-app",
    });

    assertEquals(
        facts.map((fact) => ({
            appId: fact.appId,
            commandId: fact.commandId,
            exportName: fact.exportName,
        })),
        [
            {
                appId: "docs-app",
                commandId: "docs.search.open",
                exportName: "duplicatePrimaryCommand",
            },
            {
                appId: "docs-app",
                commandId: "docs.search.open",
                exportName: "duplicateSecondaryCommand",
            },
            {
                appId: "docs-app",
                commandId: "docs.help.open",
                exportName: "uniqueCommand",
            },
        ],
    );
});

Deno.test("commands/diagnostics: should report duplicate stable command ids per app and respect app selection", async () => {
    const fixtureFile = resolve(
        join(Deno.cwd(), "src/commands/diagnostics/tests/command-diagnostics.fixture.ts"),
    ).replaceAll("\\", "/");
    const source = await Deno.readTextFile(fixtureFile);

    const diagnostics = await collectCommandDiagnostics([{
        file: fixtureFile,
        source,
    }]);
    const selectedDiagnostics = await collectCommandDiagnostics([{
        file: fixtureFile,
        source,
    }], {
        appId: "guides-app",
    });

    assertEquals(
        diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            exportName: diagnostic.exportName,
            subject: diagnostic.subject,
        })),
        [
            {
                code: "app-command-duplicate-id",
                exportName: "duplicatePrimaryCommand",
                subject: "commandId=docs.search.open",
            },
            {
                code: "app-command-duplicate-id",
                exportName: "duplicateSecondaryCommand",
                subject: "commandId=docs.search.open",
            },
        ],
    );
    assertEquals(selectedDiagnostics, []);
});
