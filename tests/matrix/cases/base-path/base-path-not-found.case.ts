/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { assertDocumentState, assertSeoState } from "../../../helpers/document.ts";
import { matrixTest } from "../../harness.ts";

const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";
const localBaseUrl = "https://mainz.local/docs/mainz";

export const basePathNotFoundCase = matrixTest({
    name: "basePath keeps localized notFound routes and SEO consistent",
    fixture: "BasePathApp",
    profile: "gh-pages",
    exercise: {
        render: ["csr", "ssg"],
        navigation: ["spa", "mpa", "enhanced-mpa"],
    },
    run: async ({ combo, artifact, fixture }) => {
        const screen = await fixture.renderDocument({
            artifact,
            documentHtmlPath: "404.html",
            url: `${localBaseUrl}/pt/nao-existe`,
            basePath: matrixBasePath,
            navigationReady: {
                locale: "pt",
                navigationType: "initial",
            },
        });

        try {
            assertDocumentState({
                navigation: combo.navigation,
                locale: "pt",
                bodyIncludes: "Essa rota nao existe na fixture.",
            });

            const localeLink = document.querySelector<HTMLAnchorElement>(
                '.locale-chip[data-locale="en"]',
            );
            assert(localeLink, "Expected the EN locale switcher link to exist on the localized 404 page.");
            assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}en/nao-existe`);
            assertSeoState({
                canonical: `${matrixSiteUrl}/pt/nao-existe`,
                alternates: {
                    en: `${matrixSiteUrl}/en/nao-existe`,
                    pt: `${matrixSiteUrl}/pt/nao-existe`,
                },
            });
        } finally {
            screen.cleanup();
        }
    },
});
