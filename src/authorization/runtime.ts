import type {
    AuthorizationPolicy,
    PageAuthorizationMetadata,
    Principal,
} from "./index.ts";
import type { RouteManifestEntry } from "../routing/types.ts";

/** Runtime hooks and policy registration used while evaluating authorization. */
export interface AuthorizationRuntimeOptions {
    /** Resolves the principal for the current request or runtime transition. */
    getPrincipal?: () => Principal | Promise<Principal>;
    /** Registered named authorization policies. */
    policies?: Readonly<Record<string, AuthorizationPolicy>>;
    /** Login route used when anonymous access should redirect to authentication. */
    loginPath?: string;
}

export interface AuthorizationAccessDecision {
    /** Final access result for the evaluated authorization request. */
    status: "authorized" | "redirect-login" | "forbidden";
    /** Principal used during evaluation. */
    principal: Principal;
    /** Authorization metadata that produced the decision, when present. */
    authorization?: PageAuthorizationMetadata;
}

let currentAuthorizationRuntimeOptions: AuthorizationRuntimeOptions | undefined;

export async function resolveCurrentPrincipal(
    options: AuthorizationRuntimeOptions | undefined,
): Promise<Principal> {
    if (typeof options?.getPrincipal !== "function") {
        return createAnonymousPrincipal();
    }

    const principal = await options.getPrincipal();
    return normalizePrincipal(principal);
}

/** Sets the active authorization runtime options for the current execution context. */
export function setAuthorizationRuntimeOptions(
    options: AuthorizationRuntimeOptions | undefined,
): void {
    currentAuthorizationRuntimeOptions = options;
}

/** Reads the currently active authorization runtime options, if any. */
export function readAuthorizationRuntimeOptions():
    | AuthorizationRuntimeOptions
    | undefined {
    return currentAuthorizationRuntimeOptions;
}

/** Evaluates page authorization and resolves the final access decision. */
export async function evaluatePageAuthorization(args: {
    authorization: PageAuthorizationMetadata | undefined;
    principal: Principal;
    policies?: AuthorizationRuntimeOptions["policies"];
}): Promise<AuthorizationAccessDecision> {
    if (!args.authorization?.requirement) {
        return {
            status: "authorized",
            principal: args.principal,
            authorization: args.authorization,
        };
    }

    if (!args.principal.authenticated) {
        return {
            status: "redirect-login",
            principal: args.principal,
            authorization: args.authorization,
        };
    }

    const requirementResult = await evaluateAuthorizationRequirement({
        principal: args.principal,
        requirement: args.authorization.requirement,
        policies: args.policies,
    });

    if (!requirementResult) {
        return {
            status: "forbidden",
            principal: args.principal,
            authorization: args.authorization,
        };
    }

    return {
        status: "authorized",
        principal: args.principal,
        authorization: args.authorization,
    };
}

/** Evaluates a normalized authorization requirement for a specific principal. */
export function evaluateAuthorizationRequirement(args: {
    principal: Principal;
    requirement: NonNullable<PageAuthorizationMetadata["requirement"]>;
    policies?: AuthorizationRuntimeOptions["policies"];
}): boolean | Promise<boolean> {
    const { principal, requirement } = args;

    if (
        requirement.roles?.length &&
        !requirement.roles.some((role) => principal.roles.includes(role))
    ) {
        return false;
    }

    if (!requirement.policy) {
        return true;
    }

    const policy = args.policies?.[requirement.policy];
    if (!policy) {
        throw new Error(
            `Authorization policy "${requirement.policy}" is not registered. ` +
                "Register it under auth.policies before evaluating protected pages or components.",
        );
    }

    return policy(principal);
}

/** Determines whether a route should be visible to the supplied principal. */
export async function isRouteVisible(args: {
    route: Pick<RouteManifestEntry, "authorization">;
    principal: Principal;
    policies?: AuthorizationRuntimeOptions["policies"];
}): Promise<boolean> {
    const accessDecision = await evaluatePageAuthorization({
        authorization: args.route.authorization,
        principal: args.principal,
        policies: args.policies,
    });

    return accessDecision.status === "authorized";
}

/** Filters a route list down to only routes visible to the supplied principal. */
export async function filterVisibleRoutes(args: {
    routes: readonly RouteManifestEntry[];
    principal: Principal;
    policies?: AuthorizationRuntimeOptions["policies"];
}): Promise<RouteManifestEntry[]> {
    const visibleRoutes: RouteManifestEntry[] = [];

    for (const route of args.routes) {
        if (
            await isRouteVisible({
                route,
                principal: args.principal,
                policies: args.policies,
            })
        ) {
            visibleRoutes.push(route);
        }
    }

    return visibleRoutes;
}

/** Returns policy names referenced by authorizations that are not currently registered. */
export function findMissingAuthorizationPolicies(args: {
    authorizations: readonly (PageAuthorizationMetadata | undefined)[];
    policies?: AuthorizationRuntimeOptions["policies"];
}): string[] {
    const registeredPolicies = args.policies
        ? new Set(Object.keys(args.policies))
        : new Set<string>();
    const missingPolicies = new Set<string>();

    for (const authorization of args.authorizations) {
        const policyName = authorization?.requirement?.policy;
        if (!policyName || registeredPolicies.has(policyName)) {
            continue;
        }

        missingPolicies.add(policyName);
    }

    return [...missingPolicies].sort((left, right) => left.localeCompare(right));
}

/** Creates the default anonymous principal used when no authenticated identity is available. */
export function createAnonymousPrincipal(): Principal {
    return {
        authenticated: false,
        roles: [],
        claims: {},
    };
}

function normalizePrincipal(principal: Principal | undefined): Principal {
    if (!principal) {
        return createAnonymousPrincipal();
    }

    return {
        authenticated: principal.authenticated === true,
        id: principal.id,
        roles: Array.isArray(principal.roles) ? [...principal.roles] : [],
        claims: isClaimsRecord(principal.claims) ? principal.claims : {},
    };
}

function isClaimsRecord(
    claims: Principal["claims"] | undefined,
): claims is Principal["claims"] {
    return typeof claims === "object" && claims !== null;
}
