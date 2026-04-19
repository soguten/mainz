export interface AuthorizationOptions {
    roles?: readonly string[];
    policy?: string;
}

export interface AuthorizationRequirement {
    authenticated: true;
    roles?: readonly string[];
    policy?: string;
}

export interface PageAuthorizationMetadata {
    allowAnonymous?: true;
    requirement?: AuthorizationRequirement;
}

export interface ComponentAuthorizationMetadata {
    requirement: AuthorizationRequirement;
}

export interface Principal {
    authenticated: boolean;
    id?: string;
    roles: readonly string[];
    claims: Readonly<Record<string, string | readonly string[]>>;
}

export type AuthorizationPolicy = (
    principal: Principal,
) => boolean | Promise<boolean>;

const AUTHORIZATION_REQUIREMENT = Symbol("mainz.authorization.requirement");
const AUTHORIZATION_ALLOW_ANONYMOUS = Symbol(
    "mainz.authorization.allow-anonymous",
);

type AuthorizationOwner = {
    [AUTHORIZATION_REQUIREMENT]?: AuthorizationRequirement;
    [AUTHORIZATION_ALLOW_ANONYMOUS]?: boolean;
};
type AuthorizationDecoratedClass = abstract new (...args: unknown[]) => unknown;
type AuthorizationDecorator = <T extends AuthorizationDecoratedClass>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void;

export function Authorize(options: AuthorizationOptions = {}): AuthorizationDecorator {
    const requirement = normalizeAuthorizationRequirement(options);

    return function <T extends AuthorizationDecoratedClass>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        const owner = value as T & AuthorizationOwner;
        owner[AUTHORIZATION_REQUIREMENT] = requirement;
    };
}

export function AllowAnonymous(): AuthorizationDecorator {
    return function <T extends AuthorizationDecoratedClass>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        const owner = value as T & AuthorizationOwner;
        owner[AUTHORIZATION_ALLOW_ANONYMOUS] = true;
    };
}

export function resolvePageAuthorization(
    pageCtor: object,
): PageAuthorizationMetadata | undefined {
    const owner = pageCtor as AuthorizationOwner;
    const requirement = cloneAuthorizationRequirement(
        owner[AUTHORIZATION_REQUIREMENT],
    );
    const allowAnonymous = owner[AUTHORIZATION_ALLOW_ANONYMOUS] === true
        ? true
        : undefined;

    if (!requirement && !allowAnonymous) {
        return undefined;
    }

    return {
        allowAnonymous,
        requirement,
    };
}

export function resolveComponentAuthorization(
    componentCtor: object,
): ComponentAuthorizationMetadata | undefined {
    const owner = componentCtor as AuthorizationOwner;
    const requirement = cloneAuthorizationRequirement(
        owner[AUTHORIZATION_REQUIREMENT],
    );

    if (!requirement) {
        return undefined;
    }

    return {
        requirement,
    };
}

function normalizeAuthorizationRequirement(
    options: AuthorizationOptions,
): AuthorizationRequirement {
    const roles = normalizeRoles(options.roles);
    const policy = normalizePolicy(options.policy);

    return {
        authenticated: true,
        roles,
        policy,
    };
}

function normalizeRoles(
    roles: readonly string[] | undefined,
): readonly string[] | undefined {
    if (!roles?.length) {
        return undefined;
    }

    const normalizedRoles = roles
        .map((role) => role.trim())
        .filter((role) => role.length > 0);

    return normalizedRoles.length > 0 ? normalizedRoles : undefined;
}

function normalizePolicy(policy: string | undefined): string | undefined {
    const normalizedPolicy = policy?.trim();
    return normalizedPolicy ? normalizedPolicy : undefined;
}

function cloneAuthorizationRequirement(
    requirement: AuthorizationRequirement | undefined,
): AuthorizationRequirement | undefined {
    if (!requirement) {
        return undefined;
    }

    return {
        authenticated: true,
        roles: requirement.roles ? [...requirement.roles] : undefined,
        policy: requirement.policy,
    };
}
