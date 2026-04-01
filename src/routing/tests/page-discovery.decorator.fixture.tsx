import { Locales, Page, RenderMode, Route } from "../../index.ts";

@Route("/")
export class DecoratedHomePage extends Page {
    override render(): HTMLElement {
        return <main>Home</main>;
    }
}

@Route("/search")
@RenderMode("ssg")
@Locales("pt-BR", "en-US")
export class DecoratedSearchPage extends Page {
    override head() {
        return {
            title: "Search",
            meta: [
                { name: "description", content: "Search page" },
            ],
        };
    }

    override render(): HTMLElement {
        return <main>Search</main>;
    }
}
