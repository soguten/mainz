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

## Example: docs page with authenticated menu

```tsx title="Docs.page.tsx"
import { CustomElement, entries, Page, RenderMode, Route } from "mainz";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";
import { CurrentUserMenu } from "../components/CurrentUserMenu.tsx";
import { docsArticles } from "../lib/docs.ts";

@CustomElement("x-mainz-docs-page")
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{ route?: { params?: Record<string, string> } }> {
    static entries = entries.from(docsArticles, (article) => ({
        slug: article.slug,
    }));

    override render() {
        const slug = this.props.route?.params?.slug;

        return (
            <>
                <header class="docs-topbar">
                    <a href="/">Mainz Docs</a>
                    <CurrentUserMenu />
                </header>

                <DocsArticleContent slug={slug} />
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

## When not to use `client-only`

If the data is public and build-safe, prefer:

- `blocking` when it belongs in the first HTML
- `deferred` when it can appear later without hurting the page shell

The goal is not to make everything `client-only`.

The goal is to keep private state out of shared HTML while still letting the page stay SSG.

## Mental model

- page decides the public route shell
- private component becomes an island
- `client-only` keeps personalization in the browser
- `Component.load()` keeps the ownership visible on the component itself

That is how Mainz lets a page be static without pretending that private data is static too.
