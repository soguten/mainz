import { Component, type ComponentLoadContext, type NoProps, type NoState, RenderStrategy } from "../index.ts";

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

export function createAbortAwareReloadHarness(args: {
    calls: string[];
    observedAborts: string[];
    requests: Map<string, { promise: Promise<{ title: string }> }>;
}) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="status">loading</p>,
    })
    class AbortAwareRoutedDocsPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.calls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.observedAborts.push(slug);
            }, { once: true });

            return args.requests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return AbortAwareRoutedDocsPanel;
}

export function createAbortAwareCleanupHarness(args: {
    startedLoads: string[];
    observedAborts: string[];
    request: Promise<{ title: string }>;
}) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="status">loading</p>,
    })
    class AbortAwareCleanupPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.startedLoads.push(slug);
            context.signal.addEventListener("abort", () => {
                args.observedAborts.push(slug);
            }, { once: true });

            return args.request;
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return AbortAwareCleanupPanel;
}

export function createAbortRejectingReloadHarness(args: {
    calls: string[];
    observedAborts: string[];
    requests: Map<string, { promise: Promise<{ title: string }> }>;
}) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="status">loading</p>,
        errorFallback: (error: unknown) => (
            <p data-role="status">
                {error instanceof Error ? error.message : String(error)}
            </p>
        ),
    })
    class AbortRejectingRoutedDocsPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.calls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.observedAborts.push(slug);
            }, { once: true });

            return args.requests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return AbortRejectingRoutedDocsPanel;
}

export function createMultiPanelAbortHarness(args: {
    primaryCalls: string[];
    secondaryCalls: string[];
    primaryObservedAborts: string[];
    secondaryObservedAborts: string[];
    primaryRequests: Map<string, { promise: Promise<{ title: string }> }>;
    secondaryRequests: Map<string, { promise: Promise<{ title: string }> }>;
}) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="primary-status">loading</p>,
    })
    class PrimaryPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.primaryCalls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.primaryObservedAborts.push(slug);
            }, { once: true });

            return args.primaryRequests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing primary request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="primary-status">{this.data.title}</p>;
        }
    }

    @RenderStrategy("deferred", {
        fallback: () => <p data-role="secondary-status">loading</p>,
    })
    class SecondaryPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.secondaryCalls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.secondaryObservedAborts.push(slug);
            }, { once: true });

            return args.secondaryRequests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing secondary request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="secondary-status">{this.data.title}</p>;
        }
    }

    class DocsPanelsHost extends Component<{ slug: string }> {
        override render(): HTMLElement {
            return (
                <section data-role="host">
                    <PrimaryPanel slug={this.props.slug} />
                    <SecondaryPanel slug={this.props.slug} />
                </section>
            ) as HTMLElement;
        }
    }

    return DocsPanelsHost;
}

export function createMultiPanelAbortAndErrorHarness(args: {
    primaryCalls: string[];
    secondaryCalls: string[];
    primaryObservedAborts: string[];
    secondaryObservedAborts: string[];
    primaryRequests: Map<string, { promise: Promise<{ title: string }> }>;
    secondaryRequests: Map<string, { promise: Promise<{ title: string }> }>;
}) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="primary-status">loading</p>,
        errorFallback: (error: unknown) => (
            <p data-role="primary-status">
                {error instanceof Error ? error.message : String(error)}
            </p>
        ),
    })
    class PrimaryPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.primaryCalls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.primaryObservedAborts.push(slug);
            }, { once: true });

            return args.primaryRequests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing primary request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="primary-status">{this.data.title}</p>;
        }
    }

    @RenderStrategy("deferred", {
        fallback: () => <p data-role="secondary-status">loading</p>,
        errorFallback: (error: unknown) => (
            <p data-role="secondary-status">
                {error instanceof Error ? error.message : String(error)}
            </p>
        ),
    })
    class SecondaryPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.secondaryCalls.push(slug);
            context.signal.addEventListener("abort", () => {
                args.secondaryObservedAborts.push(slug);
            }, { once: true });

            return args.secondaryRequests.get(slug)?.promise ??
                Promise.reject(new Error(`Missing secondary request for slug "${slug}".`));
        }

        override render(): HTMLElement {
            return <p data-role="secondary-status">{this.data.title}</p>;
        }
    }

    class DocsPanelsHost extends Component<{ slug: string }> {
        override render(): HTMLElement {
            return (
                <section data-role="host">
                    <PrimaryPanel slug={this.props.slug} />
                    <SecondaryPanel slug={this.props.slug} />
                </section>
            ) as HTMLElement;
        }
    }

    return DocsPanelsHost;
}
