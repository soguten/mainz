import { Component, CustomElement, type NoState, RenderStrategy } from "mainz";
import type { DocsNavSection } from "../lib/docs.ts";
import { getDocsArticle, getDocsNavSections, getDocsPager } from "../lib/docs.ts";
import { parseMarkdown } from "../lib/markdown.ts";
import { OnThisPage } from "./OnThisPage.tsx";
import { recordRecentlyViewedDoc } from "./RecentlyViewedDocs.tsx";
import { DocsArticle, type DocsArticleProps } from "./docs-page/DocsArticle.tsx";
import { DocsPageFrame } from "./docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "./docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "./docs-page/DocsTopbar.tsx";

interface DocsArticleContentProps {
    slug?: string;
}

interface DocsArticlePageModel extends DocsArticleProps {
    navSections: readonly DocsNavSection[];
    activeSlug?: string;
}

const lastRecordedDocSlug = new WeakMap<DocsArticleContent, string>();

@CustomElement("x-mainz-docs-article-content")
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<DocsArticleContentProps, NoState, DocsArticlePageModel> {

    override load(): DocsArticlePageModel {
        return buildDocsArticlePageModel(this.props.slug);
    }

    override afterRender(): void {
        this.recordCurrentDocVisit();
    }

    override render() {
        const page = this.data;

        return (
            <DocsPageFrame
                topbar={<DocsTopbar />}
                sidebar={
                    <DocsSidebar
                        navSections={page.navSections}
                        activeSlug={page.activeSlug}
                    />
                }
                main={
                    <DocsArticle
                        title={page.title}
                        summary={page.summary}
                        statusLabel={page.statusLabel}
                        overviewCards={page.overviewCards}
                        previous={page.previous}
                        next={page.next}
                        blocks={page.blocks}
                        currentSlug={page.activeSlug}
                    />
                }
                rail={page.activeSlug ? <OnThisPage slug={page.activeSlug} /> : null}
            />
        );
    }

    private recordCurrentDocVisit(): void {
        const article = this.props.slug ? getDocsArticle(this.props.slug) : undefined;

        if (!article || lastRecordedDocSlug.get(this) === article.slug) {
            return;
        }

        lastRecordedDocSlug.set(this, article.slug);
        recordRecentlyViewedDoc({
            slug: article.slug,
            title: article.title,
        });
    }
}

function buildDocsArticlePageModel(slug?: string): DocsArticlePageModel {
    const article = slug ? getDocsArticle(slug) : undefined;

    if (!article) {
        return {
            title: "Document not found",
            summary:
                "This slug is not part of the docs collection. The demo keeps the docs shell intact so missing content still feels deliberate.",
            blocks: parseMarkdown(
                slug
                    ? `## Unknown slug

No docs article was found for \`${slug}\`.

Use the left navigation to jump back into a known article.`
                    : `## Unknown slug

No docs article matched the current route.

Use the left navigation to jump back into a known article.`,
            ),
            navSections: getDocsNavSections(),
            activeSlug: undefined,
            statusLabel: "Collection miss",
        };
    }

    const pager = getDocsPager(article.slug);

    return {
        title: article.title,
        summary: article.summary,
        blocks: parseMarkdown(article.markdown),
        navSections: getDocsNavSections(),
        activeSlug: article.slug,
        previous: pager.previous,
        next: pager.next,
        statusLabel: article.navSection,
    };
}
