import { Page, type RouteContext } from "mainz";
import { OnThisPage } from "../OnThisPage.tsx";

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

export class OnThisPageHarness extends Page<{ route: RouteContext }> {
  override render() {
    return (
      <>
        <div class="docs-article-body">
          <h2 id="overview" class="docs-section-heading">Overview</h2>
          <h3 id="details" class="docs-subheading">Details</h3>
        </div>
        <OnThisPage />
      </>
    );
  }
}
