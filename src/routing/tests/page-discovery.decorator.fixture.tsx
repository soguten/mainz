import { Page, Route } from "../../index.ts";

@Route("/")
export class DecoratedHomePage extends Page {
    override render(): HTMLElement {
        return <main>Home</main>;
    }
}

@Route("/search")
export class DecoratedSearchPage extends Page {
    static override page = {
        mode: "ssg" as const,
        locales: ["pt-BR", "en-US"],
        head: {
            title: "Search",
            meta: [
                { name: "description", content: "Search page" },
            ],
        },
    };

    override render(): HTMLElement {
        return <main>Search</main>;
    }
}
