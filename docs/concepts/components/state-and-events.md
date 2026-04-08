---
title: State and Events
summary: Use initState(), setState(), and managed DOM events to build interactive components.
---

## State starts with `initState()`

Mainz components can preload local state before the first render with `initState()`.

```tsx title="ToggleCard.tsx"
import { Component, type NoProps } from "mainz";

interface ToggleState {
    open: boolean;
}

export class ToggleCard extends Component<NoProps, ToggleState> {
    protected override initState(): ToggleState {
        return { open: false };
    }

    override render() {
        return (
            <button onClick={this.toggle}>
                {this.state.open ? "Open" : "Closed"}
            </button>
        );
    }

    private toggle = () => {
        this.setState({ open: !this.state.open });
    };
}
```

## `setState()` rerenders the host

`setState()` merges the partial update into the current state and rerenders the component when it is
connected.

That gives you a small, predictable model for interactive UI without introducing extra scheduling
concepts into every component.

## `initState()` is not a loading placeholder

Use `initState()` when the component already knows its local UI state before the first render.

Good fits:

- panel open or closed
- filter text typed by the user
- selected tab
- sort order

Do not use `initState()` just to represent "data has not loaded yet".

That state already has a better home:

- `load()` owns the async data
- `placeholder()` owns the visible loading state before the data arrives

In other words:

- `initState()` is for local UI state the component can bootstrap immediately
- `load()` is for async data that does not exist yet
- `placeholder()` is for the visible loading state

If a component only needs async data, prefer `NoState` and keep the model small.

If a component needs async data plus local UI behavior, keep them separate:

```tsx title="FilterableArticleList.tsx"
import { Component, type NoProps, RenderStrategy } from "mainz";

interface FilterableArticleListState {
    filter: string;
    panelOpen: boolean;
}

interface ArticleSummary {
    slug: string;
    title: string;
}

@RenderStrategy("defer")
export class FilterableArticleList extends Component<
    NoProps,
    FilterableArticleListState,
    readonly ArticleSummary[]
> {
    protected override initState(): FilterableArticleListState {
        return {
            filter: "",
            panelOpen: true,
        };
    }

    override async load(): Promise<readonly ArticleSummary[]> {
        return await fetchArticleSummaries();
    }

    override placeholder() {
        return <p>Loading articles...</p>;
    }

    override render() {
        const visibleArticles = this.data.filter((article) =>
            article.title.toLowerCase().includes(this.state.filter.toLowerCase())
        );

        return (
            <section>
                <button type="button" onClick={this.togglePanel}>
                    {this.state.panelOpen ? "Hide filters" : "Show filters"}
                </button>

                {this.state.panelOpen
                    ? <input value={this.state.filter} onInput={this.handleFilterInput} />
                    : null}

                <ul>
                    {visibleArticles.map((article) => <li>{article.title}</li>)}
                </ul>
            </section>
        );
    }

    private togglePanel = () => {
        this.setState({ panelOpen: !this.state.panelOpen });
    };

    private handleFilterInput = (event: Event) => {
        const input = event.target as HTMLInputElement;
        this.setState({ filter: input.value });
    };
}
```

Here:

- `initState()` owns the local filter and panel visibility
- `load()` owns the async article list
- `placeholder()` owns the loading placeholder

For the async loading model itself, see [Data Loading](../core/data-loading.md).

## DOM events work well inline or imperatively

Most components can attach events inline in JSX, like `onClick={this.toggle}`.

For host-level or global listeners, lifecycle methods can register events more explicitly:

```tsx title="ResizeAware.tsx"
override onMount(): void {
  this.registerDOMEvent(window, "resize", this.handleResize);
}
```

That registration is tracked so Mainz can clean it up when the component unmounts.

## Attributes and props are related, but not identical

Mainz syncs standard DOM attributes on host elements, while component instances receive structured
`props`.

That split is useful because reusable components often want object-shaped input, but plain DOM nodes
still need normal attribute updates like `class`, `value`, `checked`, and `selected`.

## This area can grow

This page is the base layer for component state and event behavior.

Good follow-up additions later would be keyed patching, render owner behavior, and lifecycle
guarantees for async state updates.
