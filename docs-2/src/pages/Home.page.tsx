import { Page } from "mainz";
import { DocsShell } from "../components/DocsShell.tsx";
import { docsArticles, getDocsNavSections, getDocsPager } from "../lib/docs.ts";

export class HomePage extends Page {
    static override customElementTag = "x-mainz-docs-2-home-page";

    static override page = {
        path: "/",
        mode: "ssg" as const,
        locales: ["en"],
        head: {
            title: "Mainz Docs 2",
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
            <DocsShell
                title="Build documentation that feels like a product"
                summary="Docs 2 is a Mainz demo that leans into a familiar docs layout while dogfooding page-first routing, dynamic entries, and runtime data loading."
                activeSlug={undefined}
                navSections={getDocsNavSections()}
                overviewCards={docsArticles.map((article) => ({
                    title: article.title,
                    description: article.summary,
                    href: `/docs/${article.slug}`,
                }))}
                markdown={`
## What this demo proves

The layout is intentionally recognizable as a documentation site, but the runtime model stays Mainz: pages own routes, the build owns artifacts, and the app entry stays tiny.

This demo also exercises dynamic routes through \`/docs/:slug\`, which now expand through \`entries()\` and load per-page data through \`load()\`.

## Start with these pages

Open **Quickstart** for the minimal page model, **Routing Modes** for the render-versus-navigation split, and **Dynamic Routes** to see the new contract in practice.
`}
                next={getDocsPager().next}
                statusLabel="Mainz demo"
            />
        );
    }
}
