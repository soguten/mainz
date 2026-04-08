import { CustomElement, Page, type PageHeadDefinition, Route } from "../../index.ts";

let snapshotLoadCount = 0;

export function resetSnapshotLoadCount(): void {
    snapshotLoadCount = 0;
}

export function readSnapshotLoadCount(): number {
    return snapshotLoadCount;
}

@CustomElement("x-mainz-navigation-snapshot-page")
@Route("/docs/:slug")
export class SnapshotDocsPage extends Page<{}, {}, { slug: string; source: string }> {
    override head(): PageHeadDefinition {
        const parent = super.head();

        return {
            ...parent,
            title: "Snapshot",
            meta: [
                ...(parent?.meta ?? []),
                { name: "description", content: `Snapshot description:${this.data.slug}` },
                { property: "og:type", content: "article" },
            ],
            links: [
                ...(parent?.links ?? []),
                { rel: "preconnect", href: "https://cdn.mainz.dev" },
                { rel: "canonical", href: `/docs/${this.data.slug}` },
            ],
        };
    }

    override load() {
        snapshotLoadCount += 1;
        const slug = this.route.params.slug ?? "";
        return {
            slug,
            source: "load",
        };
    }

    override render(data: { slug: string; source: string }): HTMLElement {
        const element = document.createElement("section");
        element.textContent = `${data.source}:${data.slug}`;
        return element;
    }
}
