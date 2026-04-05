import { createAnonymousPrincipal, type Principal } from "mainz";
import { type AuthorizeSiteNavItem, getAuthorizeSiteNavigation } from "./navigation.ts";
import { authorizeSitePolicies } from "./session.ts";
import { describeAuthorizeSitePrincipal } from "./session.ts";

export interface AuthorizeSiteAccessCheck {
    label: string;
    result: "pass" | "fail";
    reason: string;
}

export interface AuthorizeSiteShellData {
    authenticated: boolean;
    principalLabel: string;
    principalSummary: string;
    roles: string[];
    orgId?: string;
    currentPath: string;
    navigation: AuthorizeSiteNavItem[];
    resolvedPrincipalJson: string;
    accessChecks: AuthorizeSiteAccessCheck[];
}

export async function buildAuthorizeSiteShellData(args: { principal?: Principal; url: URL; }): Promise<AuthorizeSiteShellData> {
    const principal = args.principal ?? createAnonymousPrincipal();
    const currentPath = args.url.pathname || "/";
    const principalDetails = describeAuthorizeSitePrincipal(principal);

    return {
        authenticated: principalDetails.authenticated,
        principalLabel: principalDetails.label,
        principalSummary: principalDetails.summary,
        roles: principalDetails.roles,
        orgId: principalDetails.orgId,
        currentPath,
        navigation: await getAuthorizeSiteNavigation({
            principal,
            currentPath,
        }),
        resolvedPrincipalJson: JSON.stringify(toPrincipalSnapshot(principal), null, 2),
        accessChecks: await buildAccessChecks(principal),
    };
}

async function buildAccessChecks(principal: Principal): Promise<AuthorizeSiteAccessCheck[]> {
    const isOrgMember = await authorizeSitePolicies["org-member"](principal);

    return [
        {
            label: "@Authorize()",
            result: principal.authenticated ? "pass" : "fail",
            reason: principal.authenticated
                ? "principal.authenticated === true"
                : "principal.authenticated === false",
        },
        {
            label: 'policy "org-member"',
            result: isOrgMember ? "pass" : "fail",
            reason: isOrgMember
                ? 'claims.orgId === "mainz"'
                : `claims.orgId === ${JSON.stringify(principal.claims.orgId ?? undefined)}`,
        },
        {
            label: 'role "owner"',
            result: principal.roles.includes("owner") ? "pass" : "fail",
            reason: principal.roles.includes("owner")
                ? 'roles includes "owner"'
                : 'roles does not include "owner"',
        },
        {
            label: 'role "billing-admin"',
            result: principal.roles.includes("billing-admin") ? "pass" : "fail",
            reason: principal.roles.includes("billing-admin")
                ? 'roles includes "billing-admin"'
                : 'roles does not include "billing-admin"',
        },
    ];
}

function toPrincipalSnapshot(principal: Principal): Principal {
    return {
        authenticated: principal.authenticated,
        id: principal.id,
        roles: [...principal.roles],
        claims: {
            ...principal.claims,
        },
    };
}
