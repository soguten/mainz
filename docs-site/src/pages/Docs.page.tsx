import { CustomElement, entries, load, Locales, Page, RenderMode, Route } from "mainz";
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
export class DocsPage extends Page<{
    data?: DocsPageData;
    route?: { params?: Record<string, string> };
}> {
    static override page = {
        head: {
            title: "Mainz Docs",
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

    static load = load.byParam("slug", (slug): DocsPageData => buildDocsPageData(slug));

    override render() {
        const slug = this.props.data?.slug ?? this.props.route?.params?.slug;
        return <DocsArticleContent slug={slug} />;
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
