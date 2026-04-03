import { CustomElement, Locales, Page, RenderMode } from "mainz";
import { inject } from "mainz/di";
import { DocsArticle } from "../components/docs-page/DocsArticle.tsx";
import { DocsPageFrame } from "../components/docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "../components/docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "../components/docs-page/DocsTopbar.tsx";
import { DocsService } from "../services/DocsService.ts";

@CustomElement("x-mainz-docs-not-found-page")
@RenderMode("ssg")
@Locales("en")
export class NotFoundPage extends Page {
    readonly docs = inject(DocsService);

    override head() {
        const page = this.docs.getPageById("not-found");
        if (!page) {
            throw new Error('Missing docs page content "not-found".');
        }

        return {
            title: page.pageTitle ?? page.title,
            meta: [
                {
                    name: "description",
                    content: page.description ?? page.summary,
                },
            ],
        };
    }

    override render() {
        const page = this.docs.getPageById("not-found");
        if (!page) {
            throw new Error('Missing docs page content "not-found".');
        }

        return (
            <DocsPageFrame
                topbar={<DocsTopbar />}
                sidebar={<DocsSidebar activeSlug={undefined} />}
                main={
                    <DocsArticle
                        title={page.title}
                        summary={page.summary}
                        markdown={page.markdown}
                        statusLabel={page.statusLabel}
                        resolveMarkdownHref={(href) => this.docs.resolveMarkdownHref(undefined, href)}
                    />
                }
            />
        );
    }
}
