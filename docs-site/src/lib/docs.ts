export interface DocsArticle {
    slug: string;
    title: string;
    summary: string;
    navSection: string;
    navGroup?: string;
    markdown: string;
}

export interface DocsNavLeaf {
    slug: string;
    title: string;
}

export interface DocsNavSection {
    title: string;
    items: readonly DocsNavLeaf[];
    groups?: readonly {
        title: string;
        items: readonly DocsNavLeaf[];
    }[];
}

export interface DocsPagerLink {
    slug: string;
    title: string;
}

interface DocsArticleSource {
    slug: string;
    title: string;
    summary: string;
    navSection: string;
    navGroup?: string;
    contentPath: string;
}

const docsOrder = [
    "quickstart",
    "installation",
    "project-structure",
    "routing",
    "route-metadata",
    "data-loading",
    "navigation-runtime",
    "component-model",
    "functional-components",
    "custom-elements",
    "state-and-events",
    "render-owner",
    "page-model",
    "head-and-seo",
    "not-found",
    "styling",
    "testing-matrix",
    "deploy-gh-pages",
] as const;

const docsArticleSources: readonly DocsArticleSource[] = [
    {
        slug: "quickstart",
        title: "Quickstart",
        summary: "Start with a page-first app, ship static HTML, and keep hydration predictable.",
        navSection: "Getting Started",
        contentPath: "../../../docs/getting-started/quickstart.md",
    },
    {
        slug: "installation",
        title: "Installation",
        summary: "Set up Mainz in a repo and understand the minimum moving pieces.",
        navSection: "Getting Started",
        contentPath: "../../../docs/getting-started/installation.md",
    },
    {
        slug: "project-structure",
        title: "Project Structure",
        summary: "Organize targets, pages, and content without hiding how the framework works.",
        navSection: "Getting Started",
        contentPath: "../../../docs/getting-started/project-structure.md",
    },
    {
        slug: "routing",
        title: "Routing Modes",
        summary:
            "Separate render from navigation and choose the combination that matches the product.",
        navSection: "Concepts",
        navGroup: "Core",
        contentPath: "../../../docs/concepts/core/routing.md",
    },
    {
        slug: "route-metadata",
        title: "Route Metadata",
        summary: "Keep route patterns, params, and page ownership visible right on the class.",
        navSection: "Concepts",
        navGroup: "Core",
        contentPath: "../../../docs/concepts/core/route-metadata.md",
    },
    {
        slug: "data-loading",
        title: "Dynamic Routes with entries() and load()",
        summary: "Expand dynamic SSG paths at build time and load page data with one contract.",
        navSection: "Concepts",
        navGroup: "Core",
        contentPath: "../../../docs/concepts/core/data-loading.md",
    },
    {
        slug: "navigation-runtime",
        title: "Navigation Runtime",
        summary: "Understand what SPA, MPA, and enhanced-MPA do in practice inside the browser.",
        navSection: "Concepts",
        navGroup: "Core",
        contentPath: "../../../docs/concepts/core/navigation-runtime.md",
    },
    {
        slug: "component-model",
        title: "Component Model",
        summary:
            "Understand how Component, props, state, and render fit together before page-specific concerns.",
        navSection: "Concepts",
        navGroup: "Components",
        contentPath: "../../../docs/concepts/components/component-model.md",
    },
    {
        slug: "functional-components",
        title: "Functional Components",
        summary:
            "Use functions for composition, while class components remain the stateful runtime boundary.",
        navSection: "Concepts",
        navGroup: "Components",
        contentPath: "../../../docs/concepts/components/functional-components.md",
    },
    {
        slug: "custom-elements",
        title: "Custom Elements",
        summary:
            "Define stable explicit tags with @customElement(...) and keep registration predictable.",
        navSection: "Concepts",
        navGroup: "Components",
        contentPath: "../../../docs/concepts/components/custom-elements.md",
    },
    {
        slug: "state-and-events",
        title: "State and Events",
        summary:
            "Use initState(), setState(), and managed DOM events to build interactive components.",
        navSection: "Concepts",
        navGroup: "Components",
        contentPath: "../../../docs/concepts/components/state-and-events.md",
    },
    {
        slug: "render-owner",
        title: "Render Owner",
        summary:
            "Understand how Mainz assigns DOM listener ownership to the class component currently rendering.",
        navSection: "Concepts",
        navGroup: "Components",
        contentPath: "../../../docs/concepts/components/render-owner.md",
    },
    {
        slug: "page-model",
        title: "Page Model",
        summary: "Keep routes, head metadata, and behavior close to the page itself.",
        navSection: "Concepts",
        navGroup: "Pages",
        contentPath: "../../../docs/concepts/pages/page-model.md",
    },
    {
        slug: "head-and-seo",
        title: "Head and SEO",
        summary:
            "Let Mainz manage canonical, hreflang, and page metadata without head duplication.",
        navSection: "Concepts",
        navGroup: "Pages",
        contentPath: "../../../docs/concepts/pages/head-and-seo.md",
    },
    {
        slug: "not-found",
        title: "NotFound Pages",
        summary: "Model custom 404 behavior across SPA and document-first navigation.",
        navSection: "Concepts",
        navGroup: "Pages",
        contentPath: "../../../docs/concepts/pages/not-found.md",
    },
    {
        slug: "styling",
        title: "Styling and Theme",
        summary:
            "Build a bold docs interface without giving up static output or progressive enhancement.",
        navSection: "Advanced",
        contentPath: "../../../docs/advanced/styling.md",
    },
    {
        slug: "testing-matrix",
        title: "Testing Matrix",
        summary: "Protect the render and navigation combinations with focused matrix tests.",
        navSection: "Advanced",
        contentPath: "../../../docs/advanced/testing-matrix.md",
    },
    {
        slug: "deploy-gh-pages",
        title: "Deploy to GitHub Pages",
        summary: "Handle basePath, siteUrl, and localized routes when publishing under a subpath.",
        navSection: "Advanced",
        contentPath: "../../../docs/advanced/deploy-gh-pages.md",
    },
];

const docsArticles = docsArticleSources.map((source) => ({
    ...source,
    markdown: readMarkdownContent(source.contentPath),
})) satisfies readonly DocsArticle[];

const docsArticleMap = new Map(
    docsArticles.map((article) => [article.slug, article] as const),
);

export { docsArticles };

export function getDocsArticle(slug: string): DocsArticle | undefined {
    return docsArticleMap.get(slug);
}

export function getDocsNavSections(): readonly DocsNavSection[] {
    const bySection = new Map<
        string,
        { items: DocsNavLeaf[]; groups: Map<string, DocsNavLeaf[]> }
    >();

    for (const article of docsArticles) {
        const section = bySection.get(article.navSection) ?? {
            items: [],
            groups: new Map<string, DocsNavLeaf[]>(),
        };

        const item = { slug: article.slug, title: article.title };

        if (article.navGroup) {
            const groupItems = section.groups.get(article.navGroup) ?? [];
            groupItems.push(item);
            section.groups.set(article.navGroup, groupItems);
        } else {
            section.items.push(item);
        }

        bySection.set(article.navSection, section);
    }

    return Array.from(bySection.entries()).map(([title, value]) => ({
        title,
        items: value.items,
        groups: Array.from(value.groups.entries()).map(([groupTitle, items]) => ({
            title: groupTitle,
            items,
        })),
    }));
}

export function getDocsPager(
    slug?: string,
): { previous?: DocsPagerLink; next?: DocsPagerLink } {
    if (!slug) {
        const first = docsArticles[0];
        return {
            next: first ? { slug: first.slug, title: first.title } : undefined,
        };
    }

    const index = docsOrder.findIndex((candidate) => candidate === slug);
    if (index === -1) {
        return {};
    }

    const previousSlug = docsOrder[index - 1];
    const nextSlug = docsOrder[index + 1];

    const previous = previousSlug ? docsArticleMap.get(previousSlug) : undefined;
    const next = nextSlug ? docsArticleMap.get(nextSlug) : undefined;

    return {
        previous: previous ? { slug: previous.slug, title: previous.title } : undefined,
        next: next ? { slug: next.slug, title: next.title } : undefined,
    };
}

function readMarkdownContent(contentPath: string): string {
    const normalizedKey = contentPath.replace(/\\/g, "/");
    let markdownModules: Record<string, string> | null = null;

    try {
        markdownModules = import.meta.glob<string>("../../../docs/**/*.md", {
            eager: true,
            query: "?raw",
            import: "default",
        });
    } catch {
        markdownModules = null;
    }

    const markdown = markdownModules?.[normalizedKey];

    if (markdown) {
        return markdown;
    }

    const maybeDeno = (globalThis as { Deno?: { readTextFileSync(path: URL): string } }).Deno;

    if (maybeDeno) {
        return maybeDeno.readTextFileSync(new URL(contentPath, import.meta.url));
    }

    throw new Error(`Missing docs markdown content for path "${contentPath}".`);
}
