import { Page, type RouteContext } from "mainz";
import { createServiceContainer, singleton } from "../../../../src/di/index.ts";
import { attachServiceContainer } from "../../../../src/di/context.ts";
import { DocsArticleContent } from "../DocsArticleContent.tsx";
import { DocsService } from "../../services/DocsService.ts";

const serviceContainer = createServiceContainer([
  singleton(DocsService),
]);

export function createDocsRoute(slug: string): RouteContext {
  return {
    path: "/:slug",
    matchedPath: `/${slug}`,
    params: { slug },
    locale: "en",
    url: new URL(`https://docs.mainz.dev/${slug}`),
    renderMode: "ssg",
    navigationMode: "spa",
  };
}

export class DocsArticleContentRouteHost extends Page<{ route: RouteContext }> {
  constructor() {
    super();
    attachServiceContainer(this, serviceContainer);
  }

  override render() {
    return <DocsArticleContent />;
  }
}
