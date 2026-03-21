import {
    Component,
    ComponentResource,
    CustomElement,
    defineResource,
    RenderStrategy,
} from "mainz";
import { DocsShell, type DocsShellProps } from "./DocsShell.tsx";
import { getDocsArticle, getDocsNavSections, getDocsPager } from "../lib/docs.ts";

interface DocsArticleContentProps {
    slug?: string;
}

const docsArticleShellResource = defineResource<
    { slug?: string },
    void,
    DocsShellProps
>({
    name: "docs-article-shell",
    visibility: "public",
    execution: "either",
    cache: "static",
    key(params) {
        return ["docs-article-shell", params.slug ?? null];
    },
    load(params) {
        return buildDocsArticleShellProps(params.slug);
    },
});

@CustomElement("x-mainz-docs-article-content")
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<DocsArticleContentProps> {
    override render() {
        return (
            <ComponentResource
                resource={docsArticleShellResource}
                params={{ slug: this.props.slug }}
                context={undefined}
            >
                {(shell: DocsShellProps) => (
                    <DocsShell
                        title={shell.title}
                        summary={shell.summary}
                        markdown={shell.markdown}
                        navSections={shell.navSections}
                        activeSlug={shell.activeSlug}
                        overviewCards={shell.overviewCards}
                        previous={shell.previous}
                        next={shell.next}
                        statusLabel={shell.statusLabel}
                    />
                )}
            </ComponentResource>
        );
    }
}

function buildDocsArticleShellProps(slug?: string): DocsShellProps {
    const article = slug ? getDocsArticle(slug) : undefined;

    if (!article) {
        return {
            title: "Document not found",
            summary:
                "This slug is not part of the docs collection. The demo keeps the docs shell intact so missing content still feels deliberate.",
            markdown: slug
                ? `## Unknown slug

No docs article was found for \`${slug}\`.

Use the left navigation to jump back into a known article.`
                : `## Unknown slug

No docs article matched the current route.

Use the left navigation to jump back into a known article.`,
            navSections: getDocsNavSections(),
            activeSlug: undefined,
            statusLabel: "Collection miss",
        };
    }

    const pager = getDocsPager(article.slug);

    return {
        title: article.title,
        summary: article.summary,
        markdown: article.markdown,
        navSections: getDocsNavSections(),
        activeSlug: article.slug,
        previous: pager.previous,
        next: pager.next,
        statusLabel: article.navSection,
    };
}
