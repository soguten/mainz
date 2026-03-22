import { Component, type NoProps, type NoState, RenderStrategy } from "../index.ts";

export function createBlockingLoadHarness() {
    @RenderStrategy("blocking")
    class BlockingDocsPanel extends Component<NoProps, NoState, { title: string }> {
        override load() {
            return { title: "Intro" };
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return BlockingDocsPanel;
}

export function createDeferredLoadHarness(
    load: () => { title: string } | Promise<{ title: string }>,
    strategy: "deferred" | "client-only" = "deferred",
    options?: {
        withFallback?: boolean;
    },
) {
    const renderOptions = options?.withFallback === false ? undefined : {
        fallback: () => <p data-role="status">loading</p>,
    };

    @RenderStrategy(strategy, renderOptions)
    class DeferredDocsPanel extends Component<NoProps, NoState, { title: string }> {
        override load() {
            return load();
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return DeferredDocsPanel;
}

export function createForbiddenInSsgHarness() {
    @RenderStrategy("forbidden-in-ssg")
    class LivePreviewPanel extends Component<NoProps, NoState, { title: string }> {
        override async load() {
            return { title: "Preview" };
        }

        override render(): HTMLElement {
            return <p>{this.data.title}</p>;
        }
    }

    return LivePreviewPanel;
}

export function createReloadHarness(
    calls: string[],
    requests: Map<string, { promise: Promise<{ title: string }> }>,
) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="status">loading</p>,
    })
    class RoutedDocsPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load() {
            calls.push(this.props.slug);
            return requests.get(this.props.slug)?.promise ??
                Promise.reject(new Error(`Missing request for slug "${this.props.slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return RoutedDocsPanel;
}
