import { Component } from "mainz";
import { Button, CheckIcon, CodeBlock, CopyIcon } from "mainz/typecase";
import { renderHighlightedTypecaseCode } from "../lib/highlight.ts";

interface TypecaseDocsSnippetProps {
    className?: string;
    code: string;
    language?: string;
}

interface TypecaseDocsSnippetState {
    copied: boolean;
}

export class TypecaseDocsSnippet extends Component<
    TypecaseDocsSnippetProps,
    TypecaseDocsSnippetState
> {
    static copyFeedbackDurationMs = 1200;

    private copiedResetTimeoutId: number | null = null;

    protected override initState(): TypecaseDocsSnippetState {
        return {
            copied: false,
        };
    }

    override onUnmount(): void {
        this.clearCopiedResetTimeout();
    }

    private clearCopiedResetTimeout(): void {
        if (this.copiedResetTimeoutId == null) {
            return;
        }

        clearTimeout(this.copiedResetTimeoutId);
        this.copiedResetTimeoutId = null;
    }

    private handleCopy = (): void => {
        const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;

        if (clipboard?.writeText) {
            void clipboard.writeText(this.props.code).catch(() => undefined);
        }

        this.clearCopiedResetTimeout();
        this.setState({ copied: true });

        this.copiedResetTimeoutId = setTimeout(() => {
            this.copiedResetTimeoutId = null;
            this.setState({ copied: false });
        }, (this.constructor as typeof TypecaseDocsSnippet).copyFeedbackDurationMs);
    };

    override render(): HTMLElement | DocumentFragment {
        const copyLabel = this.state.copied ? "Copied" : "Copy";
        const highlightedCode = renderHighlightedTypecaseCode(this.props.code, this.props.language);

        return (
            <CodeBlock className={`typecase-docs-snippet ${this.props.className ?? ""}`.trim()}>
                <CodeBlock.Header>
                    <CodeBlock.Language>{this.props.language ?? "text"}</CodeBlock.Language>
                    <CodeBlock.Actions>
                        <Button
                            aria-label={copyLabel}
                            className="tc-snippet-copy-button"
                            data-slot="typecase-docs-snippet-copy"
                            onClick={this.handleCopy}
                            size="sm"
                            title={copyLabel}
                            variant="ghost"
                        >
                            {this.state.copied
                                ? <CheckIcon aria-hidden="true" size={16} />
                                : <CopyIcon aria-hidden="true" size={16} />}
                            <span className="tc-visually-hidden">{copyLabel}</span>
                        </Button>
                    </CodeBlock.Actions>
                </CodeBlock.Header>

                <pre className="tc-code-block-body">
                    <code className={highlightedCode.highlighted ? "hljs" : undefined}>
                        {highlightedCode.content}
                    </code>
                </pre>
            </CodeBlock>
        );
    }
}
