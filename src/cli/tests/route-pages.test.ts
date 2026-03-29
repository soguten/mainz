/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import {
    invalidLocalePageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "../../routing/page-discovery-errors.ts";
import { resolveTargetDiscoveredPages } from "../route-pages.ts";
import { createCliFixtureTargetConfig, cliTestsRepoRoot } from "../../../tests/helpers/test-helpers.ts";

Deno.test("cli/route-pages: should classify invalid locale discovery failures with a structured kind", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-invalid-locales",
        targetName: "diagnostics-invalid-locales",
        locales: ["en"],
    });

    try {
        const { discoveryErrors } = await resolveTargetDiscoveredPages(
            resolve(fixture.fixtureRoot, "src", "pages"),
        );

        assertEquals(discoveryErrors?.length, 1);
        assertEquals(discoveryErrors?.[0]?.kind, invalidLocalePageDiscoveryErrorKind);
        assertStringIncludes(discoveryErrors?.[0]?.message ?? "", '@Locales() received invalid locale "en--US"');
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/route-pages: should classify generic page discovery failures with a structured kind", async () => {
    const tempRoot = await Deno.makeTempDir({
        dir: cliTestsRepoRoot,
        prefix: ".mainz-route-pages-",
    });
    const pagesDir = resolve(tempRoot, "src", "pages");
    const pageFile = resolve(pagesDir, "Broken.page.tsx");

    try {
        await Deno.mkdir(pagesDir, { recursive: true });
        await Deno.writeTextFile(
            pageFile,
            [
                'import { Page } from "../../../src/components/page.ts";',
                "",
                "export class BrokenPage extends Page {}",
                "",
            ].join("\n"),
        );

        const { discoveryErrors } = await resolveTargetDiscoveredPages(pagesDir);

        assertEquals(discoveryErrors?.length, 1);
        assertEquals(discoveryErrors?.[0]?.kind, pageDiscoveryFailedErrorKind);
        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            'must define a route with @Route(...)',
        );
    } finally {
        await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
    }
});
