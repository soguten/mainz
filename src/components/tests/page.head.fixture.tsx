import { Page } from "../../index.ts";

export class HeadFixturePage extends Page {
    static override page = {
        path: "/head",
        head: {
            title: "Fixture Title",
            meta: [
                { name: "description", content: "Fixture description" },
            ],
            links: [
                { rel: "canonical", href: "/head" },
            ],
        },
    };

    override render(): HTMLElement {
        return <main>Head fixture</main>;
    }
}

export class AlternateHeadFixturePage extends Page {
    static override page = {
        path: "/head-alt",
        head: {
            title: "Alternate Fixture Title",
            meta: [
                { property: "og:title", content: "Alternate Fixture OG" },
            ],
            links: [
                { rel: "canonical", href: "/head-alt" },
                { rel: "alternate", href: "/head-alt", hreflang: "en" },
            ],
        },
    };

    override render(): HTMLElement {
        return <main>Alternate head fixture</main>;
    }
}

export class HeadlessFixturePage extends Page {
    static override page = {
        path: "/headless",
    };

    override render(): HTMLElement {
        return <main>Headless fixture</main>;
    }
}
