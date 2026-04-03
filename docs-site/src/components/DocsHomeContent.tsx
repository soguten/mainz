import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import { type DocsOverviewCard, DocsArticle } from "./docs-page/DocsArticle.tsx";
import { DocsService } from "../services/DocsService.ts";

interface DocsHomePageModel {
    title: string;
    summary: string;
    statusLabel?: string;
    overviewCards: readonly DocsOverviewCard[];
    markdown: string;
}

@CustomElement("x-mainz-docs-home-content")
@RenderStrategy("blocking")
export class DocsHomeContent extends Component<NoProps, NoState, DocsHomePageModel> {
    readonly docs = inject(DocsService);

    override load(): DocsHomePageModel {
        const page = this.docs.getPageById("home");
        if (!page) {
            throw new Error('Missing docs page content "home".');
        }

        return {
            title: page.title,
            summary: page.summary,
            statusLabel: page.statusLabel,
            overviewCards: this.docs.listArticles().map((article) => ({
                title: article.title,
                description: article.summary ?? article.title,
                href: `/${article.slug}`,
            })),
            markdown: page.markdown,
        };
    }

    override render() {
        return (
            <DocsArticle
                title={this.data.title}
                summary={this.data.summary}
                overviewCards={this.data.overviewCards}
                markdown={this.data.markdown}
                showFirstPager
                statusLabel={this.data.statusLabel}
                resolveMarkdownHref={(href) => this.docs.resolveMarkdownHref(undefined, href)}
            />
        );
    }
}
