import {
    filterVisibleRoutes,
    type Principal,
    resolvePageAuthorization,
    type RouteManifestEntry,
} from "mainz";
import { authorizeSitePolicies } from "./session.ts";

export interface AuthorizeSiteNavItem {
    id: string;
    path: string;
    label: string;
    summary: string;
    access: string;
    active: boolean;
}

interface AuthorizeSiteRouteDefinition extends RouteManifestEntry {
    label: string;
    summary: string;
    access: string;
}

export async function getAuthorizeSiteNavigation(args: {
    principal: Principal;
    currentPath: string;
}): Promise<AuthorizeSiteNavItem[]> {
    const routes = await loadAuthorizeSiteRouteDefinitions();
    const visibleRoutes = await filterVisibleRoutes({
        routes,
        principal: args.principal,
        policies: authorizeSitePolicies,
    });
    const visibleRouteIds = new Set(visibleRoutes.map((route) => route.id));

    return routes
        .filter((route) => visibleRouteIds.has(route.id))
        .map((route) => ({
            id: route.id,
            path: route.path,
            label: route.label,
            summary: route.summary,
            access: route.access,
            active: route.path === args.currentPath,
        }));
}

async function loadAuthorizeSiteRouteDefinitions(): Promise<AuthorizeSiteRouteDefinition[]> {
    const [
        { HomePage },
        { AccountPage },
        { BillingPage },
        { ReportsPage },
    ] = await Promise.all([
        import("../pages/Home.page.tsx"),
        import("../pages/Account.page.tsx"),
        import("../pages/Billing.page.tsx"),
        import("../pages/Reports.page.tsx"),
    ]);

    return [
        createRouteDefinition({
            id: "home",
            path: "/",
            label: "Home",
            summary: "Public overview of the authorization model.",
            access: "public",
            pageCtor: HomePage,
        }),
        createRouteDefinition({
            id: "account",
            path: "/account",
            label: "Account",
            summary: "Requires authentication through plain @Authorize().",
            access: "authenticated",
            pageCtor: AccountPage,
        }),
        createRouteDefinition({
            id: "billing",
            path: "/billing",
            label: "Billing",
            summary: "Uses the named org-member policy from auth.policies.",
            access: 'policy "org-member"',
            pageCtor: BillingPage,
        }),
        createRouteDefinition({
            id: "reports",
            path: "/reports",
            label: "Reports",
            summary: "Requires the billing-admin role.",
            access: 'role "billing-admin"',
            pageCtor: ReportsPage,
        }),
    ];
}

function createRouteDefinition(args: {
    id: string;
    path: string;
    label: string;
    summary: string;
    access: string;
    pageCtor: object;
}): AuthorizeSiteRouteDefinition {
    return {
        id: args.id,
        source: "filesystem",
        path: args.path,
        pattern: args.path,
        mode: "csr",
        locales: ["en"],
        authorization: resolvePageAuthorization(args.pageCtor),
        label: args.label,
        summary: args.summary,
        access: args.access,
    };
}
