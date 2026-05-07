/**
 * Public authorization APIs for Mainz.
 */

export {
  AllowAnonymous,
  Authorize,
  resolveComponentAuthorization,
  resolvePageAuthorization,
} from "../authorization/index.ts";
export type {
  AuthorizationOptions,
  AuthorizationPolicy,
  AuthorizationRequirement,
  ComponentAuthorizationMetadata,
  PageAuthorizationMetadata,
  Principal,
} from "../authorization/index.ts";
export type { AuthorizationRuntimeOptions } from "../authorization/runtime.ts";
