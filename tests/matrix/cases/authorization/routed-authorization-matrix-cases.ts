/// <reference lib="deno.ns" />

import { anonymousRedirectCase } from "./anonymous-redirect.case.ts";
import { forbiddenMemberCase } from "./forbidden-member.case.ts";

export const routedAuthorizationCases = [
    anonymousRedirectCase,
    forbiddenMemberCase,
] as const;
