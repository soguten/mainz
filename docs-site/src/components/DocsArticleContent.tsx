import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import { DocsService } from "../services/DocsService.ts";
import { recordRecentlyViewedDoc } from "./RecentlyViewedDocs.tsx";
import { DocsArticle, type DocsArticleProps } from "./docs-page/DocsArticle.tsx";

interface DocsArticlePageModel extends DocsArticleProps {
    activeSlug?: string;
}

const lastRecordedDocSlug = new WeakMap<DocsArticleContent, string>();

@CustomElement("x-mainz-docs-article-content")
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<NoProps, NoState, DocsArticlePageModel> {
    
    readonly docs = inject(DocsService);

    override load(): DocsArticlePageModel {
        return this.buildDocsArticlePageModel(this.route.params.slug);
    }

    override afterRender(): void {
        this.recordCurrentDocVisit();
    }

    override render() {
        const page = this.data;

        return (
            <DocsArticle
                title={page.title}
                summary={page.summary}
                statusLabel={page.statusLabel}
                overviewCards={page.overviewCards}
                markdown={page.markdown}
                currentSlug={page.activeSlug}
                resolveMarkdownHref={(href) => this.docs.resolveMarkdownHref(page.activeSlug, href)}
            />
        );
    }

    private recordCurrentDocVisit(): void {
        if (!this.data) {
            return;
        }

        const { activeSlug, title } = this.data;

        if (!activeSlug || lastRecordedDocSlug.get(this) === activeSlug) {
            return;
        }

        lastRecordedDocSlug.set(this, activeSlug);
        recordRecentlyViewedDoc({
            slug: activeSlug,
            title,
        });
    }

    private buildDocsArticlePageModel(slug: string): DocsArticlePageModel {
        const article = this.docs.getArticleBySlug(slug);

        if (!article) {
            const page = this.docs.getPageById("collection-miss");
            if (!page) {
                throw new Error('Missing docs page content "collection-miss".');
            }

            return {
                title: page.title,
                summary: page.summary,
                markdown: applyMarkdownTemplate(page.markdown, {
                    slug: slug || "the current route",
                }),
                activeSlug: undefined,
                statusLabel: page.statusLabel,
            };
        }

        return {
            title: article.title,
            summary: article.summary ?? "",
            markdown: article.markdown,
            activeSlug: article.slug,
            statusLabel: article.groupTitle ?? article.sectionTitle,
        };
    }
}

function applyMarkdownTemplate(
    markdown: string,
    values: Record<string, string>,
): string {
    let result = markdown;

    for (const [key, value] of Object.entries(values)) {
        result = result.replaceAll(`{{${key}}}`, value);
    }

    return result;
}
