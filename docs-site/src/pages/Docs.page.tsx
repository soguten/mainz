import {
    CustomElement,
    type PageEntriesContext,
    type PageHeadDefinition,
    Locales,
    NoProps,
    NoState,
    Page,
    RenderMode,
    Route,
} from "mainz";
import { inject } from "mainz/di";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";
import { OnThisPage } from "../components/OnThisPage.tsx";
import { DocsPageFrame } from "../components/docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "../components/docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "../components/docs-page/DocsTopbar.tsx";
import { DocsService } from "../services/DocsService.ts";

@CustomElement("x-mainz-docs-docs-page")
@Route("/:slug")
@RenderMode("ssg")
@Locales("en")
export class DocsPage extends Page<NoProps, NoState> {

    static readonly docs = inject(DocsService);
    readonly docs = inject(DocsService);

    static entries(_context: PageEntriesContext) {
        return this.docs.listSlugs().map((slug) => ({
            params: { slug },
        }));
    }

    override head(): PageHeadDefinition {
        const article = this.docs.getArticleMetaBySlug(this.route.params.slug);

        if (!article) {
            const page = this.docs.getPageById("collection-miss");
            if (!page) {
                throw new Error('Missing docs page content "collection-miss".');
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

        return {
            title: `${article.title} | Mainz Docs`,
            meta: [
                {
                    name: "description",
                    content: article.summary ?? article.title,
                },
            ],
        };
    }

    override render() {
        const slug = this.route.params.slug;

        return (
            <DocsPageFrame
                topbar={<DocsTopbar />}
                sidebar={<DocsSidebar activeSlug={slug} />}
                main={<DocsArticleContent />}
                rail={slug ? <OnThisPage /> : null}
            />
        );
    }
}
