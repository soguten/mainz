import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";
import { buildDocsHref } from "../lib/links.ts";

interface RecentlyViewedDoc {
    slug: string;
    title: string;
}

const RECENT_DOCS_STORAGE_KEY = "mainz-docs-recent-pages";
const MAX_RECENT_DOCS = 4;

@CustomElement("x-mainz-docs-recently-viewed")
@RenderStrategy("client-only", {
    fallback: () => (
        <section class="docs-recent-pages docs-recent-pages-placeholder" aria-live="polite">
            <p class="docs-sidebar-title">Recent pages</p>
            <p class="docs-recent-pages-empty">
                Recent pages appear after you browse the docs in this browser.
            </p>
        </section>
    ),
})
export class RecentlyViewedDocs extends Component<NoProps, NoState, readonly RecentlyViewedDoc[]> {
    
    override async load(): Promise<readonly RecentlyViewedDoc[]> {
        return readRecentlyViewedDocs(this.route.params.slug);
    }

    override render() {
        return renderRecentlyViewedDocs(this.data);
    }
}

export function recordRecentlyViewedDoc(entry: RecentlyViewedDoc): void {
    if (!entry.slug.trim() || !entry.title.trim()) {
        return;
    }

    const next = [
        entry,
        ...readStoredRecentlyViewedDocs().filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_RECENT_DOCS);

    try {
        localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Ignore storage access failures in restricted environments.
    }
}

function renderRecentlyViewedDocs(items: readonly RecentlyViewedDoc[]) {
    if (items.length === 0) {
        return (
            <section class="docs-recent-pages" aria-live="polite">
                <p class="docs-sidebar-title">Recent pages</p>
                <p class="docs-recent-pages-empty">
                    Recent pages appear after you browse the docs in this browser.
                </p>
            </section>
        );
    }

    return (
        <section class="docs-recent-pages" aria-live="polite">
            <p class="docs-sidebar-title">Recent pages</p>
            <nav class="docs-nav" aria-label="Recently viewed pages">
                {items.map((item) => (
                    <a
                        class="docs-nav-link docs-nav-link-recent"
                        href={buildDocsHref(`/${item.slug}`)}
                    >
                        <span class="docs-nav-title">{item.title}</span>
                    </a>
                ))}
            </nav>
        </section>
    );
}

function readRecentlyViewedDocs(currentSlug?: string): readonly RecentlyViewedDoc[] {
    const items = readStoredRecentlyViewedDocs();
    if (!currentSlug) {
        return items;
    }

    return items.filter((item) => item.slug !== currentSlug);
}

function readStoredRecentlyViewedDocs(): readonly RecentlyViewedDoc[] {
    try {
        const serialized = localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
        if (!serialized) {
            return [];
        }

        const parsed = JSON.parse(serialized);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isRecentlyViewedDoc).slice(0, MAX_RECENT_DOCS);
    } catch {
        return [];
    }
}

function isRecentlyViewedDoc(value: unknown): value is RecentlyViewedDoc {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as { slug?: unknown; title?: unknown };
    return typeof candidate.slug === "string" && typeof candidate.title === "string";
}
