import { inject } from "mainz/di";

export class BuildEntriesConfigService {
  resolveSlugPrefix(locale?: string): string {
    return locale === "pt" ? "ola" : "hello";
  }
}

export class StorySlugCatalog {
  readonly config = inject(BuildEntriesConfigService);

  list(locale?: string): readonly string[] {
    return [`${this.config.resolveSlugPrefix(locale)}-from-di`];
  }
}

export class StoryEntriesService {
  readonly catalog = inject(StorySlugCatalog);

  resolve(locale?: string): readonly { params: { slug: string } }[] {
    return this.catalog.list(locale).map((slug) => ({
      params: { slug },
    }));
  }
}
