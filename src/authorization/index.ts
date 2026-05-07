/** Role- and policy-based authorization options declared on pages or components. */
export interface AuthorizationOptions {
  /** Roles that the principal must possess to satisfy the requirement. */
  roles?: readonly string[];
  /** Named authorization policy that must also approve the principal. */
  policy?: string;
}

/** Normalized authorization requirement applied to a protected target. */
export interface AuthorizationRequirement {
  /** Whether the requirement expects an authenticated principal. */
  authenticated: true;
  /** Roles that the principal must possess to satisfy the requirement. */
  roles?: readonly string[];
  /** Named authorization policy that must also approve the principal. */
  policy?: string;
}

/** Authorization metadata resolved from a page declaration. */
export interface PageAuthorizationMetadata {
  /** Whether the page explicitly allows anonymous access. */
  allowAnonymous?: true;
  /** Authorization requirement applied to the page when protection is enabled. */
  requirement?: AuthorizationRequirement;
}

/** Authorization metadata resolved from a component declaration. */
export interface ComponentAuthorizationMetadata {
  /** Authorization requirement applied to the component. */
  requirement: AuthorizationRequirement;
}

/** Authenticated or anonymous principal resolved for the current runtime request. */
export interface Principal {
  /** Whether the principal is authenticated. */
  authenticated: boolean;
  /** Stable principal identifier, when available. */
  id?: string;
  /** Roles granted to the principal. */
  roles: readonly string[];
  /** Arbitrary claims associated with the principal. */
  claims: Readonly<Record<string, string | readonly string[]>>;
}

/** Authorization policy callback that decides access for a resolved principal. */
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
/**
 * Declares an authorization requirement for a page or component.
 */
export function Authorize(
  options: AuthorizationOptions = {},
): <T extends abstract new (...args: unknown[]) => unknown>(
  value: T,
  _context?: ClassDecoratorContext<T>,
) => void {
  const decorator = <T extends abstract new (...args: unknown[]) => unknown>(
    value: T,
    _context?: ClassDecoratorContext<T>,
  ): void => {
    const owner = value as T & AuthorizationOwner;
    owner[AUTHORIZATION_REQUIREMENT] = requirement;
  };
  const requirement = normalizeAuthorizationRequirement(options);

  return decorator;
}

/**
 * Marks a page as accessible without authentication, even when parent flows are protected.
 */
export function AllowAnonymous(): <
  T extends abstract new (...args: unknown[]) => unknown,
>(
  value: T,
  _context?: ClassDecoratorContext<T>,
) => void {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    value: T,
    _context?: ClassDecoratorContext<T>,
  ): void {
    const owner = value as T & AuthorizationOwner;
    owner[AUTHORIZATION_ALLOW_ANONYMOUS] = true;
  };
}

/** Resolves normalized authorization metadata declared on a page constructor. */
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

/** Resolves normalized authorization metadata declared on a component constructor. */
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
