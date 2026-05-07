import { Locales, Page, RenderMode, Route } from "../../index.ts";

@Route("/")
export class HomePage extends Page {
  override head() {
    return {
      title: "Home",
      meta: [
        { name: "description", content: "Home page" },
      ],
    };
  }

  override render(): HTMLElement {
    return <main>Home</main>;
  }
}

@Route("/search")
@RenderMode("ssg")
@Locales("pt-BR", "en-US")
export class SearchPage extends Page {
  override render(): HTMLElement {
    return <main>Search</main>;
  }
}

export function Helper(): HTMLElement {
  return <div>helper</div>;
}
