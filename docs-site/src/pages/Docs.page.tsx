import {
    CustomElement,
    type PageHeadDefinition,
    Locales,
    NoProps,
    NoState,
    Page,
    RenderMode,
    Route,
} from "mainz";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";
import { docsArticles, getDocsArticle } from "../lib/docs.ts";

interface DocsPageData {
    slug: string;
    head: {
        title: string;
        meta: readonly [
            {
                name: "description";
                content: string;
            },
        ];
    };
}

@CustomElement("x-mainz-docs-docs-page")
@Route("/:slug")
@RenderMode("ssg")
@Locales("en")
export class DocsPage extends Page<NoProps, NoState, DocsPageData> {
    
    static entries() {
        return docsArticles.map((article) => ({
            params: { slug: article.slug },
        }));
    }

    override load(): DocsPageData {
        return buildDocsPageData(this.route.params.slug);
    }

    override head(): PageHeadDefinition {
        return this.data.head;
    }

    override render() {
        return <DocsArticleContent />;
    }
}

function buildDocsPageData(slug: string): DocsPageData {
    const article = getDocsArticle(slug);

    if (!article) {
        return {
            slug,
            head: {
                title: "Document not found | Mainz Docs",
                meta: [
                    {
                        name: "description",
                        content:
                            "This docs route did not match a known Mainz documentation article.",
                    },
                ],
            },
        };
    }

    return {
        slug: article.slug,
        head: {
            title: `${article.title} | Mainz Docs`,
            meta: [
                {
                    name: "description",
                    content: article.summary,
                },
            ],
        },
    };
}
