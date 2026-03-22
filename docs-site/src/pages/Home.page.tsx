import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { DocsArticle } from "../components/docs-page/DocsArticle.tsx";
import { DocsPageFrame } from "../components/docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "../components/docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "../components/docs-page/DocsTopbar.tsx";
import { docsArticles, getDocsNavSections, getDocsPager } from "../lib/docs.ts";
import { parseMarkdown } from "../lib/markdown.ts";

const homeNavSections = getDocsNavSections();
const homeBlocks = parseMarkdown(`
## What this demo proves

The layout is intentionally recognizable as a documentation site, but the runtime model stays Mainz: pages own routes, the build owns artifacts, and the app entry stays tiny.

This demo also exercises dynamic routes through \`/:slug\`, which now expand through \`entries()\` while article components assemble their own content through \`Component.load()\`.

The docs article route now uses \`@RenderMode("ssg")\`, \`@Locales("en")\`, and a component-level \`@RenderStrategy("blocking")\` so the page owns routing while the article component owns async assembly.

The right rail reintroduces **On this page** as a \`deferred\` component, and article pages now show **Recent pages** in the sidebar as a \`client-only\` component backed by local browser state.

The diagnostics story is CLI-first: \`mainz diagnose\` now reuses the same framework diagnostics core for terminal use and CI without depending on one editor integration.

## Start with these pages

Open **Quickstart** for the minimal page model, **Routing Modes** for the render-versus-navigation split, **Diagnostics CLI** for the rule engine surface, and **Dynamic Routes** to see the new contract in practice.
`);

@CustomElement("x-mainz-docs-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en")
export class HomePage extends Page {
    static override page = {
        head: {
            title: "Mainz Docs",
            meta: [
                {
                    name: "description",
                    content:
                        "Documentation-style demo for Mainz with page-first routing, dynamic docs routes, and theme support.",
                },
            ],
        },
    };

    override render() {
        return (
            <DocsPageFrame
                topbar={<DocsTopbar />}
                sidebar={<DocsSidebar navSections={homeNavSections} activeSlug={undefined} />}
                main={
                    <DocsArticle
                        title="Build documentation that feels like a product"
                        summary="Docs is a Mainz demo that leans into a familiar docs layout while dogfooding page-first routing, dynamic entries, and runtime data loading."
                        overviewCards={docsArticles.map((article) => ({
                            title: article.title,
                            description: article.summary,
                            href: `/${article.slug}`,
                        }))}
                        blocks={homeBlocks}
                        next={getDocsPager().next}
                        statusLabel="Mainz demo"
                    />
                }
            />
        );
    }
}
