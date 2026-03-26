import type { PageLoadContext } from "../../index.ts";
import { Authorize, CustomElement, Page, Route } from "../../index.ts";

let protectedLoadCount = 0;
let abortAwareLoadStartedCount = 0;
let abortAwareExpensiveCallCount = 0;
let abortAwareAbortObservedCount = 0;
let resolveAbortAwareLoadStarted: (() => void) | undefined;
let abortAwareLoadStartedPromise = Promise.resolve();

function createAbortAwareLoadStartedPromise(): Promise<void> {
    return new Promise<void>((resolve) => {
        resolveAbortAwareLoadStarted = resolve;
    });
}

abortAwareLoadStartedPromise = createAbortAwareLoadStartedPromise();

export function resetAbortAwareLoadStats(): void {
    abortAwareLoadStartedCount = 0;
    abortAwareExpensiveCallCount = 0;
    abortAwareAbortObservedCount = 0;
    abortAwareLoadStartedPromise = createAbortAwareLoadStartedPromise();
}

export function readAbortAwareLoadStartedCount(): number {
    return abortAwareLoadStartedCount;
}

export function readAbortAwareExpensiveCallCount(): number {
    return abortAwareExpensiveCallCount;
}

export function readAbortAwareAbortObservedCount(): number {
    return abortAwareAbortObservedCount;
}

export async function waitForAbortAwareLoadStart(): Promise<void> {
    await abortAwareLoadStartedPromise;
}

export function readProtectedLoadCount(): number {
    return protectedLoadCount;
}

export function resetProtectedLoadCount(): void {
    protectedLoadCount = 0;
}

@CustomElement("x-mainz-navigation-spa-home-page")
@Route("/")
export class SpaHomePage extends Page {
    static override page = {
        head: {
            title: "Home",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Home page";
        element.setAttribute("data-page", "home");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-docs-page")
@Route("/docs/:slug")
export class SpaDocsPage extends Page {
    static override page = {
        head: {
            title: "Docs",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        const slug = String(this.props?.route?.params?.slug ?? "");
        element.textContent = `Docs page:${slug}`;
        element.setAttribute("data-page", "docs");
        if (slug) {
            element.setAttribute("data-slug", slug);
        }
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-not-found-page")
@Route("/404")
export class SpaNotFoundPage extends Page {
    static override page = {
        head: {
            title: "Not Found",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Not found page";
        element.setAttribute("data-page", "not-found");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-login-page")
@Route("/login")
export class SpaLoginPage extends Page {
    static override page = {
        head: {
            title: "Login",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Login page";
        element.setAttribute("data-page", "login");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-protected-page")
@Authorize()
@Route("/dashboard")
export class SpaProtectedPage extends Page {
    static override page = {
        head: {
            title: "Dashboard",
        },
    };

    static load(context: PageLoadContext) {
        protectedLoadCount += 1;
        return {
            userId: context.principal?.id ?? "anonymous",
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        const userId = String(this.props?.data?.userId ?? "");
        element.textContent = `Dashboard page:${userId}`;
        element.setAttribute("data-page", "dashboard");
        if (userId) {
            element.setAttribute("data-user-id", userId);
        }
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-admin-page")
@Authorize({ roles: ["admin"] })
@Route("/admin")
export class SpaAdminPage extends Page {
    static override page = {
        head: {
            title: "Admin",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Admin page";
        element.setAttribute("data-page", "admin");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-policy-page")
@Authorize({ policy: "org-member" })
@Route("/org")
export class SpaPolicyPage extends Page {
    static override page = {
        head: {
            title: "Organization",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Organization page";
        element.setAttribute("data-page", "org");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-broken-page")
@Route("/broken")
export class SpaBrokenPage extends Page {
    static override page = {
        head: {
            title: "Broken",
        },
    };

    static load(): never {
        throw new Error("Broken route load.");
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Broken page";
        element.setAttribute("data-page", "broken");
        return element;
    }
}

@CustomElement("x-mainz-navigation-spa-slow-page")
@Route("/slow")
export class SpaSlowPage extends Page {
    static override page = {
        head: {
            title: "Slow",
        },
    };

    static async load(context: PageLoadContext) {
        abortAwareLoadStartedCount += 1;
        resolveAbortAwareLoadStarted?.();
        resolveAbortAwareLoadStarted = undefined;

        await new Promise<void>((resolve) => setTimeout(resolve, 40));

        if (context.signal.aborted) {
            abortAwareAbortObservedCount += 1;
            throw new DOMException("Aborted", "AbortError");
        }

        abortAwareExpensiveCallCount += 1;
        return {
            status: "slow-finished",
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Slow page";
        element.setAttribute("data-page", "slow");
        return element;
    }
}
