import { Component } from "mainz";
import type { DocsNavSection, DocsPagerLink } from "../lib/docs.ts";
import { highlightDocsCodeBlocks } from "../lib/highlight.ts";
import { buildDocsHref } from "../lib/links.ts";
import { parseMarkdown, type MarkdownBlock } from "../lib/markdown.ts";
import { docsStyles } from "../styles/docsStyles.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

interface DocsShellProps {
    title: string;
    summary: string;
    markdown?: string;
    navSections: readonly DocsNavSection[];
    activeSlug?: string;
    overviewCards?: readonly {
        title: string;
        description: string;
        href: string;
    }[];
    previous?: DocsPagerLink;
    next?: DocsPagerLink;
    statusLabel?: string;
}

export class DocsShell extends Component<DocsShellProps> {
    static override customElementTag = "x-mainz-docs-shell";
    static override styles = docsStyles;

    override onMount(): void {
        this.registerDOMEvent(window, "load", this.handleWindowLoad);
        this.handleWindowLoad();
    }

    override afterRender(): void {
        highlightDocsCodeBlocks(this);
    }

    override render() {
        const props = this.props;
        const blocks = props.markdown ? parseMarkdown(props.markdown) : [];

        return (
            <div class="docs-app" data-theme={document.documentElement.dataset.theme ?? "light"}>
                <div class="docs-frame">
                    <header class="docs-topbar">
                        <a class="docs-brand" href={buildDocsHref("/")}>
                            <span class="docs-brand-mark">Mz</span>
                            <span class="docs-brand-copy">
                                <span class="docs-brand-label">Mainz Docs</span>
                                <span class="docs-brand-meta">Documentation demo for Mainz</span>
                            </span>
                        </a>

                        <div class="docs-topbar-actions">
                            <nav class="docs-top-links" aria-label="Primary">
                                <a href={buildDocsHref("/")}>Overview</a>
                                <a href={buildDocsHref("/quickstart")}>Guides</a>
                                <a href={buildDocsHref("/data-loading")}>Reference</a>
                            </nav>
                            <ThemeToggle />
                        </div>
                    </header>

                    <div class="docs-grid">
                        <aside class="docs-sidebar">
                            <p class="docs-sidebar-title">Documentation</p>
                            <div class="docs-nav-sections">
                                <a
                                    class={`docs-nav-link docs-nav-link-root${!props.activeSlug ? " active" : ""}`}
                                    href={buildDocsHref("/")}
                                    aria-current={!props.activeSlug ? "page" : undefined}
                                >
                                    <span class="docs-nav-title">Overview</span>
                                </a>

                                {props.navSections.map((section) => (
                                    <section class="docs-nav-section">
                                        <h2 class="docs-nav-section-title">{section.title}</h2>

                                        {section.items.length > 0
                                            ? (
                                                <nav class="docs-nav">
                                                    {section.items.map((item) => (
                                                        <a
                                                            class={`docs-nav-link${item.slug === props.activeSlug ? " active" : ""}`}
                                                            href={buildDocsHref(`/${item.slug}`)}
                                                            aria-current={item.slug === props.activeSlug ? "page" : undefined}
                                                        >
                                                            <span class="docs-nav-title">{item.title}</span>
                                                        </a>
                                                    ))}
                                                </nav>
                                            )
                                            : null}

                                        {section.groups?.map((group) => (
                                            <div class="docs-nav-subgroup">
                                                <p class="docs-nav-subgroup-title">{group.title}</p>
                                                <nav class="docs-nav docs-nav-nested">
                                                    {group.items.map((item) => (
                                                        <a
                                                            class={`docs-nav-link docs-nav-link-nested${item.slug === props.activeSlug ? " active" : ""}`}
                                                            href={buildDocsHref(`/${item.slug}`)}
                                                            aria-current={item.slug === props.activeSlug ? "page" : undefined}
                                                        >
                                                            <span class="docs-nav-title">{item.title}</span>
                                                        </a>
                                                    ))}
                                                </nav>
                                            </div>
                                        ))}
                                    </section>
                                ))}
                            </div>
                        </aside>

                        <article class="docs-article">
                            <div class="docs-hero">
                                <span class="docs-kicker">{props.statusLabel ?? "Mainz"}</span>
                                <h1 class="docs-title">{props.title}</h1>
                                <p class="docs-summary">{props.summary}</p>
                            </div>

                            <div class="docs-content">
                                {props.overviewCards?.length
                                    ? (
                                        <div class="docs-overview-grid">
                                            {props.overviewCards.map((card) => (
                                                <a class="docs-card" href={buildDocsHref(card.href)}>
                                                    <h3>{card.title}</h3>
                                                    <p>{card.description}</p>
                                                </a>
                                            ))}
                                        </div>
                                    )
                                    : null}

                                {blocks.length > 0
                                    ? blocks.map((block) => <MarkdownBlockView block={block} />)
                                    : <div class="docs-empty">This page is still being drafted.</div>}

                                {props.previous || props.next
                                    ? (
                                        <div class="docs-pager">
                                            {props.previous
                                                ? (
                                                    <a class="docs-pager-link" href={buildDocsHref(`/${props.previous.slug}`)}>
                                                        <span class="docs-pager-kicker">Previous page</span>
                                                        <strong>{props.previous.title}</strong>
                                                    </a>
                                                )
                                                : <div />}

                                            {props.next
                                                ? (
                                                    <a class="docs-pager-link" href={buildDocsHref(`/${props.next.slug}`)}>
                                                        <span class="docs-pager-kicker">Next page</span>
                                                        <strong>{props.next.title}</strong>
                                                    </a>
                                                )
                                                : <div />}
                                        </div>
                                    )
                                    : null}
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        );
    }

    private handleWindowLoad = () => {
        highlightDocsCodeBlocks(this);
    };
}

function MarkdownBlockView(props: { block: MarkdownBlock }) {
    const block = props.block;

    if (block.type === "heading") {
        if (block.level === 2) {
            return <h2 id={block.id} class="docs-section-heading">{block.text}</h2>;
        }

        return <h3 id={block.id} class="docs-subheading">{block.text}</h3>;
    }

    if (block.type === "paragraph") {
        return <p>{renderInlineMarkdown(block.text)}</p>;
    }

    if (block.type === "blockquote") {
        return <div class="docs-note">{renderInlineMarkdown(block.text)}</div>;
    }

    return <DocsCodeBlock language={block.language} label={block.label ?? block.language} content={block.content} />;
}

interface DocsCodeBlockProps {
    label: string;
    language: string;
    content: string;
}

interface DocsCodeBlockState {
    copied: boolean;
}

export class DocsCodeBlock extends Component<DocsCodeBlockProps, DocsCodeBlockState> {
    static override customElementTag = "x-mainz-docs-code-block";
    static copyFeedbackDurationMs = 1200;

    protected override initState(): DocsCodeBlockState {
        return {
            copied: false,
        };
    }

    override onUnmount(): void {
        if (this.resetCopyTimeoutId !== undefined) {
            window.clearTimeout(this.resetCopyTimeoutId);
        }
    }

    override render() {
        return (
            <div class="docs-code">
                <div class="docs-code-header">
                    <div class="docs-code-header-copy">
                        <span class="docs-code-label">{this.props.label}</span>
                        <span class="docs-code-language">{this.props.language}</span>
                    </div>

                    <button
                        type="button"
                        class="docs-copy-button"
                        aria-label={`Copy ${this.props.label}`}
                        onClick={() => void this.copyCode()}
                    >
                        {this.state.copied ? "Copied" : "Copy"}
                    </button>
                </div>
                <div class="docs-code-body">
                    <pre>
                        <code data-code-language={normalizeCodeLanguage(this.props.language)} data-raw-code={this.props.content}>
                            {this.props.content}
                        </code>
                    </pre>
                </div>
            </div>
        );
    }

    private resetCopyTimeoutId?: number;

    private async copyCode(): Promise<void> {
        const copied = await copyTextToClipboard(this.props.content);

        if (!copied) {
            return;
        }

        this.setState({ copied: true });

        if (this.resetCopyTimeoutId !== undefined) {
            window.clearTimeout(this.resetCopyTimeoutId);
        }

        this.resetCopyTimeoutId = window.setTimeout(() => {
            this.setState({ copied: false });
            this.resetCopyTimeoutId = undefined;
        }, (this.constructor as typeof DocsCodeBlock).copyFeedbackDurationMs);
    }
}

function normalizeCodeLanguage(language: string): string {
    const normalized = language.trim().toLowerCase();
    if (normalized === "tsx") {
        return "typescript";
    }
    if (normalized === "sh") {
        return "bash";
    }
    return normalized || "plaintext";
}

function renderInlineMarkdown(text: string): Array<string | HTMLElement> {
    const parts: Array<string | HTMLElement> = [];
    const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > cursor) {
            parts.push(text.slice(cursor, match.index));
        }

        if (match[1]) {
            parts.push(<code class="docs-inline-code">{match[1]}</code>);
        } else if (match[2] && match[3]) {
            parts.push(
                <a class="docs-inline-link" href={match[3]}>
                    {match[2]}
                </a>,
            );
        } else if (match[4]) {
            parts.push(<strong>{match[4]}</strong>);
        }

        cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
        parts.push(text.slice(cursor));
    }

    return parts;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    if (typeof document === "undefined") {
        return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;

    try {
        copied = document.execCommand?.("copy") ?? false;
    } catch {
        copied = false;
    } finally {
        textarea.remove();
    }

    return copied;
}
