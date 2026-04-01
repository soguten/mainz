import { CustomElement, Locales, Page, RenderMode } from "mainz";
import { DocsArticle } from "../components/docs-page/DocsArticle.tsx";
import { DocsPageFrame } from "../components/docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "../components/docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "../components/docs-page/DocsTopbar.tsx";
import { getDocsNavSections } from "../lib/docs.ts";
import { parseMarkdown } from "../lib/markdown.ts";

const notFoundNavSections = getDocsNavSections();
const notFoundBlocks = parseMarkdown(`
## Get back to a known page

Start from the overview or jump directly to one of the core documentation articles in the left navigation.

This page uses the same shell and theme system as the rest of the docs so the failure mode still feels intentional.
`);

@CustomElement("x-mainz-docs-not-found-page")
@RenderMode("ssg")
@Locales("en")
export class NotFoundPage extends Page {
    override head() {
        return {
            title: "404 | Mainz Docs",
            meta: [
                {
                    name: "description",
                    content: "The requested page was not found in the Mainz Docs demo.",
                },
            ],
        };
    }

    override render() {
        return (
            <DocsPageFrame
                topbar={<DocsTopbar />}
                sidebar={<DocsSidebar navSections={notFoundNavSections} activeSlug={undefined} />}
                main={
                    <DocsArticle
                        title="That page never made it into the docs"
                        summary="The URL is outside this demo site, so Mainz is rendering the custom notFound page instead of falling back to a generic server response."
                        blocks={notFoundBlocks}
                        statusLabel="Not found"
                    />
                }
            />
        );
    }
}
