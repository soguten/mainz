import { type AuthorizationPolicy, createAnonymousPrincipal, type Principal } from "mainz";

const SESSION_STORAGE_KEY = "mainz.authorize-site.session";

export type SessionPresetId = "member" | "billing-admin" | "owner" | "outsider";

interface AuthorizeSiteSessionRecord {
    userId: string;
    displayName: string;
    orgId: string;
    roles: readonly string[];
    persona: string;
}

export interface SessionPresetDefinition {
    id: SessionPresetId;
    label: string;
    description: string;
    defaultPath: string;
    session: AuthorizeSiteSessionRecord;
}

const sessionPresets = [
    {
        id: "member",
        label: "Mainz Member",
        description: "Authenticated org member. Sees account and policy-protected billing routes.",
        defaultPath: "/billing",
        session: {
            userId: "u-member",
            displayName: "Mara Member",
            orgId: "mainz",
            roles: ["member"],
            persona: "Mainz member",
        },
    },
    {
        id: "billing-admin",
        label: "Billing Admin",
        description:
            "Authenticated org member with the billing-admin role required by the reports page.",
        defaultPath: "/reports",
        session: {
            userId: "u-billing",
            displayName: "Riley Billing",
            orgId: "mainz",
            roles: ["member", "billing-admin"],
            persona: "Billing administrator",
        },
    },
    {
        id: "owner",
        label: "Owner",
        description:
            "Authenticated org member with the owner role required by the privileged component.",
        defaultPath: "/account",
        session: {
            userId: "u-owner",
            displayName: "Avery Owner",
            orgId: "mainz",
            roles: ["member", "owner"],
            persona: "Organization owner",
        },
    },
    {
        id: "outsider",
        label: "Outside Guest",
        description: "Authenticated, but not part of the Mainz org claim used by the named policy.",
        defaultPath: "/account",
        session: {
            userId: "u-outsider",
            displayName: "Sky Visitor",
            orgId: "outside-co",
            roles: ["member"],
            persona: "Authenticated outsider",
        },
    },
] as const satisfies readonly SessionPresetDefinition[];

export const authorizeSitePolicies: Readonly<Record<string, AuthorizationPolicy>> = {
    "org-member": (principal) => readStringClaim(principal, "orgId") === "mainz",
};

export function listSessionPresets(): readonly SessionPresetDefinition[] {
    return sessionPresets;
}

export function getAuthorizeSitePrincipal(): Principal {
    const session = readStoredSession();
    if (!session) {
        return createAnonymousPrincipal();
    }

    return {
        authenticated: true,
        id: session.userId,
        roles: [...session.roles],
        claims: {
            displayName: session.displayName,
            orgId: session.orgId,
            persona: session.persona,
        },
    };
}

export function activateSessionAndNavigate(presetId: SessionPresetId): void {
    const preset = sessionPresets.find((candidate) => candidate.id === presetId);
    if (!preset || typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(preset.session));
    window.location.assign(preset.defaultPath);
}

export function signOutAndNavigate(nextPath = "/"): void {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.location.assign(nextPath);
}

export function describeAuthorizeSitePrincipal(principal: Principal): {
    authenticated: boolean;
    label: string;
    summary: string;
    roles: string[];
    orgId?: string;
} {
    if (!principal.authenticated) {
        return {
            authenticated: false,
            label: "Anonymous visitor",
            summary: "Only public routes stay visible until a session is chosen.",
            roles: [],
        };
    }

    const displayName = readStringClaim(principal, "displayName") ?? principal.id ?? "User";
    const persona = readStringClaim(principal, "persona") ?? "Authenticated principal";
    const orgId = readStringClaim(principal, "orgId");

    return {
        authenticated: true,
        label: displayName,
        summary: `${persona}${orgId ? ` in ${orgId}` : ""}.`,
        roles: [...principal.roles],
        orgId,
    };
}

function readStoredSession(): AuthorizeSiteSessionRecord | null {
    if (typeof window === "undefined") {
        return null;
    }

    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawSession) as Record<string, unknown>;
        if (
            typeof parsed.userId !== "string" ||
            typeof parsed.displayName !== "string" ||
            typeof parsed.orgId !== "string" ||
            typeof parsed.persona !== "string" ||
            !Array.isArray(parsed.roles)
        ) {
            return null;
        }

        const roles = parsed.roles.filter((role): role is string => typeof role === "string");
        return {
            userId: parsed.userId,
            displayName: parsed.displayName,
            orgId: parsed.orgId,
            persona: parsed.persona,
            roles,
        };
    } catch {
        return null;
    }
}

function readStringClaim(principal: Principal, claimName: string): string | undefined {
    const value = principal.claims[claimName];
    return typeof value === "string" ? value : undefined;
}
