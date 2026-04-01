import { type RouteContext, Page } from "mainz";
import { RecentlyViewedDocs } from "../RecentlyViewedDocs.tsx";

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

export class RecentlyViewedDocsRouteHost extends Page<{ route: RouteContext }> {
    override render() {
        return <RecentlyViewedDocs />;
    }
}
