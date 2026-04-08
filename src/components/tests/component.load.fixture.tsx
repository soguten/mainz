import {
    Component,
    type ComponentLoadContext,
    type NoProps,
    type NoState,
    RenderPolicy,
    RenderStrategy,
} from "../index.ts";

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

export function createDeferLoadHarness(
    load: () => { title: string } | Promise<{ title: string }>,
    options?: {
        withPlaceholder?: boolean;
        policy?: "placeholder-in-ssg" | "hide-in-ssg" | "forbidden-in-ssg";
    },
) {
    const withPlaceholder = options?.withPlaceholder !== false;

    const DeferDocsPanel = withPlaceholder
        ? class DeferDocsPanelWithPlaceholder extends Component<NoProps, NoState, { title: string }> {
            override load() {
                return load();
            }

            override placeholder(): HTMLElement | DocumentFragment {
                return <p data-role="status">loading</p> as HTMLElement;
            }

            override render(): HTMLElement {
                return <p data-role="status">{this.data.title}</p>;
            }
        }
        : class DeferDocsPanelWithoutPlaceholder extends Component<NoProps, NoState, { title: string }> {
            override load() {
                return load();
            }

            override render(): HTMLElement {
                return <p data-role="status">{this.data.title}</p>;
            }
        };

    if (options?.policy === "placeholder-in-ssg") {
        RenderPolicy("placeholder-in-ssg")(DeferDocsPanel);
    } else if (options?.policy === "hide-in-ssg") {
        RenderPolicy("hide-in-ssg")(DeferDocsPanel);
    } else if (options?.policy === "forbidden-in-ssg") {
        RenderPolicy("forbidden-in-ssg")(DeferDocsPanel);
    }

    return DeferDocsPanel;
}

export function createExplicitDeferLoadHarness(
    load: () => { title: string } | Promise<{ title: string }>,
    options?: {
        withPlaceholder?: boolean;
    },
) {
    const withPlaceholder = options?.withPlaceholder !== false;

    @RenderStrategy("defer")
    class DeferDocsPanelWithPlaceholder extends Component<NoProps, NoState, { title: string }> {
        override load() {
            return load();
        }

        override placeholder(): HTMLElement | DocumentFragment {
            return <p data-role="status">loading</p> as HTMLElement;
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    @RenderStrategy("defer")
    class DeferDocsPanelWithoutPlaceholder extends Component<NoProps, NoState, { title: string }> {
        override load() {
            return load();
        }

        override render(): HTMLElement {
            return <p data-role="status">{this.data.title}</p>;
        }
    }

    return withPlaceholder ? DeferDocsPanelWithPlaceholder : DeferDocsPanelWithoutPlaceholder;
}

export function createForbiddenInSsgHarness() {
    @RenderPolicy("forbidden-in-ssg")
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
    class RoutedDocsPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load() {
            calls.push(this.props.slug);
            return requests.get(this.props.slug)?.promise ??
                Promise.reject(new Error(`Missing request for slug "${this.props.slug}".`));
        }

        override placeholder(): HTMLElement {
            return <p data-role="status">loading</p>;
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

        override placeholder(): HTMLElement {
            return <p data-role="status">loading</p>;
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
    class AbortAwareCleanupPanel extends Component<{ slug: string }, NoState, { title: string }> {
        override load(context: ComponentLoadContext) {
            const slug = this.props.slug;
            args.startedLoads.push(slug);
            context.signal.addEventListener("abort", () => {
                args.observedAborts.push(slug);
            }, { once: true });

            return args.request;
        }

        override placeholder(): HTMLElement {
            return <p data-role="status">loading</p>;
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

        override placeholder(): HTMLElement {
            return <p data-role="status">loading</p>;
        }

        override error(error: unknown): HTMLElement {
            return (
                <p data-role="status">
                    {error instanceof Error ? error.message : String(error)}
                </p>
            ) as HTMLElement;
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

        override placeholder(): HTMLElement {
            return <p data-role="primary-status">loading</p>;
        }

        override render(): HTMLElement {
            return <p data-role="primary-status">{this.data.title}</p>;
        }
    }

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

        override placeholder(): HTMLElement {
            return <p data-role="secondary-status">loading</p>;
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

        override placeholder(): HTMLElement {
            return <p data-role="primary-status">loading</p>;
        }

        override error(error: unknown): HTMLElement {
            return (
                <p data-role="primary-status">
                    {error instanceof Error ? error.message : String(error)}
                </p>
            ) as HTMLElement;
        }

        override render(): HTMLElement {
            return <p data-role="primary-status">{this.data.title}</p>;
        }
    }

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

        override placeholder(): HTMLElement {
            return <p data-role="secondary-status">loading</p>;
        }

        override error(error: unknown): HTMLElement {
            return (
                <p data-role="secondary-status">
                    {error instanceof Error ? error.message : String(error)}
                </p>
            ) as HTMLElement;
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
