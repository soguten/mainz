import { Component } from "../../../components/index.ts";
import { CheckIcon, CopyIcon } from "../../icons/index.ts";
import { CodeBlock } from "../../composites/index.ts";
import { Button } from "../../primitives/index.ts";
import { childrenToText } from "../../utils/children-text.ts";

interface SnippetState {
    copied: boolean;
}

export interface SnippetProps {
    children?: unknown;
    className?: string;
    copyLabel?: string;
    copiedLabel?: string;
    language?: string;
}

export class Snippet extends Component<SnippetProps, SnippetState> {
    private copiedResetTimeoutId: number | null = null;

    protected override initState(): SnippetState {
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
        const code = childrenToText(this.props.children);
        const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;

        if (clipboard?.writeText) {
            void clipboard.writeText(code).catch(() => undefined);
        }

        this.clearCopiedResetTimeout();
        this.setState({ copied: true });
        this.copiedResetTimeoutId = setTimeout(() => {
            this.copiedResetTimeoutId = null;
            this.setState({ copied: false });
        }, 1200);
    };

    override render(): HTMLElement | DocumentFragment {
        const copyLabel = this.state.copied
            ? this.props.copiedLabel ?? "Copied"
            : this.props.copyLabel ?? "Copy";

        return (
            <CodeBlock className={this.props.className}>
                <CodeBlock.Header>
                    <CodeBlock.Language>
                        {this.props.language ?? "text"}
                    </CodeBlock.Language>
                    <CodeBlock.Actions>
                        <Button
                            aria-label={copyLabel}
                            className="tc-snippet-copy-button"
                            data-slot="snippet-copy"
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
                <CodeBlock.Body>{this.props.children}</CodeBlock.Body>
            </CodeBlock>
        );
    }
}
