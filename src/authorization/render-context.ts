import type { PageAuthorizationMetadata, Principal } from "./index.ts";

export interface AuthorizationRenderContext {
  principal?: Principal;
  pageAuthorization?: PageAuthorizationMetadata;
}

const authorizationRenderContextStack: AuthorizationRenderContext[] = [];

export function pushAuthorizationRenderContext(
  context: AuthorizationRenderContext,
): void {
  authorizationRenderContextStack.push(context);
}

export function popAuthorizationRenderContext(): void {
  authorizationRenderContextStack.pop();
}

export function getCurrentAuthorizationRenderContext():
  | AuthorizationRenderContext
  | undefined {
  return authorizationRenderContextStack[
    authorizationRenderContextStack.length - 1
  ];
}

export function resolveAuthorizationRenderContextFromProps(
  props: unknown,
): AuthorizationRenderContext | undefined {
  if (typeof props !== "object" || props === null) {
    return undefined;
  }

  const propsRecord = props as Record<string, unknown>;
  const routeValue = propsRecord.route;
  if (typeof routeValue !== "object" || routeValue === null) {
    return undefined;
  }

  const routeRecord = routeValue as Record<string, unknown>;
  return {
    principal: isPrincipal(routeRecord.principal)
      ? routeRecord.principal
      : undefined,
    pageAuthorization: isPageAuthorization(routeRecord.authorization)
      ? routeRecord.authorization
      : undefined,
  };
}

function isPrincipal(value: unknown): value is Principal {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.authenticated === "boolean" &&
    Array.isArray(candidate.roles) &&
    typeof candidate.claims === "object" &&
    candidate.claims !== null;
}

function isPageAuthorization(
  value: unknown,
): value is PageAuthorizationMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return "allowAnonymous" in candidate || "requirement" in candidate;
}
