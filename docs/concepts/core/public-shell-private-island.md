## Public shell, private island

This is one of the most important SSG rules in Mainz:

> A page can be static even when part of the UI is user-specific.

The trick is to keep those two concerns separate.

- the page shell stays public and deterministic
- the personalized part becomes a private island that resolves in the browser

## The rule

If a value depends on:

- cookies
- session
- auth token
- per-user settings
- browser-local state

then that value must not participate in the SSG path that generates shared HTML.

That does **not** mean the whole page must become CSR.

It means:

- the page can still use `@RenderMode("ssg")`
- the personalized component should usually use `@RenderStrategy("client-only")`
- the build should emit a neutral fallback instead of real private data

## This pattern is not the same as `@Authorize(...)`

These two tools solve different problems.

Use page authorization when the route itself is private:

- `/account`
- `/billing`
- `/org/settings`

In that case, the page should normally be a protected CSR route and Mainz should decide access
before `Page.load()` and before render.

Use the public-shell-private-island pattern when the route is public, but one area is personalized:

- docs article with a current-user menu
- marketing page with a saved-theme summary
- product page with browser-local recently viewed items

In that case:

- the route shell is still public
- the shared HTML must stay user-neutral
- only the personalized island resolves after hydration

If the whole route should be blocked for anonymous or unauthorized users, prefer
[Authorization](./authorization.md). If the route should remain public, prefer this pattern.

## A quick decision rule

Ask this question:

> Should two different users receive the same initial HTML for this route?

If the answer is yes, the route can still be SSG and the personalized part should become a private
island.

If the answer is no, the route is not a shared public shell anymore, so it is usually a better fit
for `@Authorize(...)` on the page and a CSR route contract.

## Example: docs page with authenticated menu

```tsx title="Docs.page.tsx"
import { Page, RenderMode, Route } from "mainz";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";
import { CurrentUserMenu } from "../components/CurrentUserMenu.tsx";
import { docsArticles } from "../lib/docs.ts";

@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    static entries() {
        return docsArticles.map((article) => ({
            params: { slug: article.slug },
        }));
    }

    override render() {
        return (
            <>
                <header class="docs-topbar">
                    <a href="/">Mainz Docs</a>
                    <CurrentUserMenu />
                </header>

                <DocsArticleContent />
            </>
        );
    }
}
```

The page is still SSG.

What changes is only the menu component.

## The private island

```tsx title="CurrentUserMenu.tsx"
import { Component, type NoProps, type NoState, RenderStrategy } from "mainz";

@RenderStrategy("client-only", {
    fallback: () => <a href="/login">Sign in</a>,
})
export class CurrentUserMenu extends Component<NoProps, NoState, CurrentUser | null> {
    override async load() {
        return await getCurrentUserFromBrowserSession();
    }

    override render() {
        return this.data ? <button>{this.data.name}</button> : <a href="/login">Sign in</a>;
    }
}
```

What happens here:

- during SSG, Mainz renders the fallback
- no private user data enters the HTML
- after hydration, the browser loads the current user
- the fallback is replaced by the personalized menu

## Why `client-only` is usually the right strategy

For this pattern, `client-only` is usually the clearest choice because it says two things at once:

- the data belongs to the browser runtime
- the build must not resolve that personalized state into shared HTML

That makes intent visible right on the component instead of burying it in route-level comments or
host-specific rules.

`deferred` can still be correct when the data is public but non-critical. The important split is not
"fast" versus "slow"; it is "shared public HTML" versus "private browser-only state".

## Why this is safe

For SSG, the output for the same route must be the same for every user.

That means the generated HTML for `/docs/routing` cannot depend on:

- who is logged in
- which cookie is present
- what session is active

So the safe HTML is something like:

```html
<header class="docs-topbar">
    <a href="/">Mainz Docs</a>
    <a href="/login">Sign in</a>
</header>
```

and not:

```html
<header class="docs-topbar">
    <a href="/">Mainz Docs</a>
    <button>Alexandre</button>
</header>
```

because that second version would be user-specific and unsafe to share.

## Unsafe version versus safe version

Unsafe:

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    override async load({ principal }) {
        return {
            currentUserName: principal?.claims.displayName,
        };
    }

    override render() {
        return <header>{this.data?.currentUserName}</header>;
    }
}
```

That is unsafe because the page itself is trying to prerender user-specific data into shared HTML.

Safer:

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    override render() {
        return (
            <>
                <header>
                    <CurrentUserMenu />
                </header>
                <DocsArticleContent />
            </>
        );
    }
}
```

Now the route shell stays stable, and only the island becomes personalized after hydration.

## When to use `client-only`

Use `client-only` when the component depends on:

- authenticated user data
- `localStorage`
- browser APIs
- anything that only makes sense after hydration

Typical examples:

- current user menu
- recently viewed docs
- saved theme preference summary
- local experiments or client-held flags

## Component authorization is a different tool too

A protected component and a private island are also different ideas.

Use `Component + @Authorize(...)` when:

- the surrounding route is already authenticated or role-aware
- one local block needs stricter access than the rest of the page
- the component is still part of a protected runtime path

Use a private island when:

- the route stays public
- the personalized state must not enter shared HTML at all
- the browser can safely resolve that state after hydration

So:

- `@Authorize(...)` answers "who may see this?"
- `client-only` private island answers "when and where may this resolve?"

Sometimes a product needs both, but they are not interchangeable.

## When not to use `client-only`

If the data is public and build-safe, prefer:

- `blocking` when it belongs in the first HTML
- `deferred` when it can appear later without hurting the page shell

The goal is not to make everything `client-only`.

The goal is to keep private state out of shared HTML while still letting the page stay SSG.

## A practical checklist

This pattern is a strong fit when all of these are true:

- the route should remain crawlable or publicly shareable
- the personalized state is not required for the first public HTML
- a neutral fallback is acceptable during prerender
- the browser can resolve the personalized state after hydration

It is usually the wrong fit when:

- the entire route is account-only
- `Page.load()` needs authenticated data before the route can render coherently
- the initial HTML must already be user-specific
- your delivery model depends on host-enforced protected documents instead of shared public output

## Mental model

- page decides the public route shell
- private component becomes an island
- `client-only` keeps personalization in the browser
- `Component.load()` keeps the ownership visible on the component itself
- `@Authorize(...)` remains the tool for truly protected routes

That is how Mainz lets a page be static without pretending that private data is static too.
