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
