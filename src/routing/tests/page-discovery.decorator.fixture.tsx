import { Page, RenderMode, Route } from "../../index.ts";

@Route("/")
export class DecoratedHomePage extends Page {
    override render(): HTMLElement {
        return <main>Home</main>;
    }
}

@Route("/search")
@RenderMode("ssg")
export class DecoratedSearchPage extends Page {
    static override page = {
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
