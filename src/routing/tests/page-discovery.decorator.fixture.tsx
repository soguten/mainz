import { Locales, Page, RenderMode, Route } from "../../index.ts";

@Route("/")
export class DecoratedHomePage extends Page {
  override render(): HTMLElement {
    return <main>Home</main>;
  }
}

@Route("/search")
@RenderMode("ssg", { fallback: "csr" })
@Locales("pt-BR", "en-US")
export class DecoratedSearchPage extends Page {
  override metadata() {
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

@Route("/account")
@RenderMode("ssr")
export class DecoratedAccountPage extends Page {
  override render(): HTMLElement {
    return <main>Account</main>;
  }
}

