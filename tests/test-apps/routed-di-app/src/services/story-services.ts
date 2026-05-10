import { inject } from "mainz/di";

export class RouteAtlasConfigService {
  resolveSlug(locale?: string): string {
    return locale === "pt" ? "sinal-do-di" : "signal-from-di";
  }
}

export class StoryCatalogService {
  readonly config = inject(RouteAtlasConfigService);

  resolve(locale?: string): readonly { params: { slug: string } }[] {
    return [{
      params: {
        slug: this.config.resolveSlug(locale),
      },
    }];
  }
}

export class StorySummaryService {
  readonly config = inject(RouteAtlasConfigService);

  describe(locale: "en" | "pt", slug: string): string {
    const canonicalSlug = this.config.resolveSlug(locale);
    if (canonicalSlug !== slug) {
      return locale === "pt"
        ? `Resumo inesperado para ${slug}`
        : `Unexpected summary for ${slug}`;
    }

    return locale === "pt"
      ? "DI conectou entries, rota e resumo."
      : "DI connected entries, route, and summary.";
  }
}
