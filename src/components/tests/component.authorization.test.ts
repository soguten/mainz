/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";
import { setAuthorizationRuntimeOptions } from "../../authorization/runtime.ts";

await setupMainzDom();

const components = await import("../index.ts") as typeof import("../index.ts");

const fixtures = await import(
    "./component.authorization.fixture.tsx"
) as typeof import("./component.authorization.fixture.tsx");

Deno.test.afterEach(() => {
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    setAuthorizationRuntimeOptions(undefined);
});

Deno.test("components/authorization: should omit unauthorized component content while preserving the surrounding shell", () => {
    const screen = renderMainzComponent(fixtures.AdminPanelHost, {
        props: {
            route: fixtures.createRoutePrincipal(undefined),
        },
    });

    assertEquals(screen.getBySelector("[data-role='shell']").textContent, "shell");
    assertEquals(screen.queryBySelector("[data-role='admin-panel']"), null);
    screen.cleanup();
});

Deno.test("components/authorization: should render authorized component content and preserve context across child rerenders", () => {
    const screen = renderMainzComponent(fixtures.AdminPanelHost, {
        props: {
            route: fixtures.createRoutePrincipal({
                authenticated: true,
                id: "admin-1",
                roles: ["admin"],
                claims: {},
            }),
        },
    });

    assertEquals(screen.getBySelector("[data-role='admin-panel']").textContent, "0");

    screen.click("[data-role='admin-panel']");
    screen.click("[data-role='admin-panel']");

    assertEquals(screen.getBySelector("[data-role='admin-panel']").textContent, "2");
    screen.cleanup();
});

Deno.test("components/authorization: should skip protected component load when the principal is unauthorized", () => {
    fixtures.resetAuthorizedLoadCalls();

    const screen = renderMainzComponent(fixtures.AuthorizedLoadHost, {
        props: {
            route: fixtures.createRoutePrincipal(undefined),
        },
    });

    assertEquals(screen.queryBySelector("[data-role='authorized-load']"), null);
    assertEquals(fixtures.readAuthorizedLoadCalls(), 0);
    screen.cleanup();
});

Deno.test("components/authorization: should fail fast for protected components during ssg prerender", () => {
    (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__ = "ssg";
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = "build";

    assertThrows(
        () =>
            renderMainzComponent(fixtures.AdminPanelHost, {
                props: {
                    route: fixtures.createRoutePrincipal({
                        authenticated: true,
                        id: "admin-1",
                        roles: ["admin"],
                        claims: {},
                    }),
                },
            }),
        Error,
        'Component "AdminPanel" uses @Authorize(...) and cannot be rendered during SSG.',
    );
});

Deno.test("components/authorization: should reject async authorization policies during component render", () => {
    setAuthorizationRuntimeOptions({
        policies: {
            "org-member": async () => true,
        },
    });

    @components.Authorize({ policy: "org-member" })
    class PolicyPanel extends components.Component {
        override render(): HTMLElement {
            const paragraph = document.createElement("p");
            paragraph.setAttribute("data-role", "policy-panel");
            paragraph.textContent = "policy";
            return paragraph;
        }
    }

    class PolicyHost extends components.Component<{
        route?: {
            principal?: {
                authenticated: boolean;
                id?: string;
                roles: readonly string[];
                claims: Readonly<Record<string, string | readonly string[]>>;
            };
            authorization?: { requirement: { authenticated: true } };
        };
    }> {
        override render(): HTMLElement {
            const tagName = components.ensureMainzCustomElementDefined(
                PolicyPanel as unknown as CustomElementConstructor & {
                    getTagName(): string;
                },
            );
            return document.createElement(tagName);
        }
    }

    assertThrows(
        () =>
            renderMainzComponent(PolicyHost, {
                props: {
                    route: fixtures.createRoutePrincipal({
                        authenticated: true,
                        id: "member-1",
                        roles: ["member"],
                        claims: {},
                    }),
                },
            }),
        Error,
        "authorization policies must resolve synchronously",
    );
});
