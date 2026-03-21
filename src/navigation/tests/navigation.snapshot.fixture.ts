import { CustomElement, load, Page, Route } from "../../index.ts";

let snapshotLoadCount = 0;

export function resetSnapshotLoadCount(): void {
    snapshotLoadCount = 0;
}

export function readSnapshotLoadCount(): number {
    return snapshotLoadCount;
}

@CustomElement("x-mainz-navigation-snapshot-page")
@Route("/docs/:slug")
export class SnapshotDocsPage extends Page<{ data?: { slug: string; source: string } }> {
    static load = load.byParam("slug", (slug) => {
        snapshotLoadCount += 1;
        return {
            slug,
            source: "load",
        };
    });

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = `${this.props.data?.source ?? "missing"}:${this.props.data?.slug ?? ""}`;
        return element;
    }
}
