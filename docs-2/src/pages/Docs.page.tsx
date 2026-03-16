import { Page, type PageEntriesContext, type PageEntryDefinition, type PageLoadContext } from "mainz";
import { DocsShell } from "../components/DocsShell.tsx";
import { docsArticles, getDocsArticle, getDocsNavSections, getDocsPager } from "../lib/docs.ts";

type DocsRouteData = NonNullable<ReturnType<typeof getDocsArticle>>;

export class DocsPage extends Page<{ data?: DocsRouteData; route?: { params?: Record<string, string> } }> {
    static override customElementTag = "x-mainz-docs-2-docs-page";

    static override page = {
        path: "/docs/:slug",
        mode: "ssg" as const,
        locales: ["en"],
        head: {
            title: "Mainz Docs Article",
            meta: [
                {
                    name: "description",
                    content: "Documentation article from the Mainz Docs 2 demo.",
                },
            ],
        },
    };

    static async entries(_context: PageEntriesContext): Promise<readonly PageEntryDefinition[]> {
        return docsArticles.map((article) => ({
            params: {
                slug: article.slug,
            },
        }));
    }

    static async load(context: PageLoadContext): Promise<DocsRouteData | undefined> {
        return getDocsArticle(context.params.slug);
    }

    override render() {
        const article = this.props.data;
        const slug = this.props.route?.params?.slug;

        if (!article) {
            return (
                <DocsShell
                title="Document not found"
                summary="This slug is not part of the docs collection. The demo keeps the docs shell intact so missing content still feels deliberate."
                markdown={slug
                        ? `## Unknown slug

No docs article was found for \`${slug}\`.

Use the left navigation to jump back into a known article.`
                        : `## Unknown slug

No docs article matched the current route.

Use the left navigation to jump back into a known article.`}
                    navSections={getDocsNavSections()}
                    activeSlug={undefined}
                    statusLabel="Collection miss"
                />
            );
        }

        const pager = getDocsPager(article.slug);

        return (
            <DocsShell
                title={article.title}
                summary={article.summary}
                markdown={article.markdown}
                navSections={getDocsNavSections()}
                activeSlug={article.slug}
                previous={pager.previous}
                next={pager.next}
                statusLabel={article.navSection}
            />
        );
    }
}
