import {
    CustomElement,
    entries,
    Page,
    RenderMode,
    Route,
} from "mainz";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";
import { docsArticles } from "../lib/docs.ts";

@CustomElement("x-mainz-docs-docs-page")
@Route("/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{ route?: { params?: Record<string, string> } }> {
    static override page = {
        locales: ["en"],
        head: {
            title: "Mainz Docs Article",
            meta: [
                {
                    name: "description",
                    content: "Documentation article from the Mainz Docs demo.",
                },
            ],
        },
    };

    static entries = entries.from(docsArticles, (article) => ({
        slug: article.slug,
    }));

    override render() {
        const slug = this.props.route?.params?.slug;
        return <DocsArticleContent slug={slug} />;
    }
}
