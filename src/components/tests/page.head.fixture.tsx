import { Page } from "../../index.ts";

export class HeadFixturePage extends Page {
  override head() {
    return {
      title: "Fixture Title",
      meta: [
        { name: "description", content: "Fixture description" },
      ],
      links: [
        { rel: "canonical", href: "/head" },
      ],
    };
  }

  override render(): HTMLElement {
    return <main>Head fixture</main>;
  }
}

export class AlternateHeadFixturePage extends Page {
  override head() {
    return {
      title: "Alternate Fixture Title",
      meta: [
        { property: "og:title", content: "Alternate Fixture OG" },
      ],
      links: [
        { rel: "canonical", href: "/head-alt" },
        { rel: "alternate", href: "/head-alt", hreflang: "en" },
      ],
    };
  }

  override render(): HTMLElement {
    return <main>Alternate head fixture</main>;
  }
}

export class HeadlessFixturePage extends Page {
  override render(): HTMLElement {
    return <main>Headless fixture</main>;
  }
}

abstract class MergedHeadBasePage extends Page {
  override head() {
    return {
      title: "Merged Fixture Title",
      meta: [
        { name: "description", content: "Base description" },
        { property: "og:type", content: "website" },
      ],
      links: [
        { rel: "canonical", href: "/base" },
        { rel: "preconnect", href: "https://cdn.example.com" },
      ],
    };
  }
}

export class MergedHeadFixturePage extends MergedHeadBasePage {
  override render(): HTMLElement {
    return <main>Merged head fixture</main>;
  }
}
