import { joinClassNames } from "../../utils/class-name.ts";

type CodeBlockSectionProps = {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};

export interface CodeBlockProps extends CodeBlockSectionProps {
}

function CodeBlockRoot(props: CodeBlockProps) {
    const { children, className, ...rest } = props;

    return (
        <section {...rest} className={joinClassNames("tc-code-block", className)}>
            {children}
        </section>
    );
}

function CodeBlockHeader(props: CodeBlockSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-code-block-header", className)}>
            {children}
        </div>
    );
}

function CodeBlockLanguage(props: CodeBlockSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <span {...rest} className={joinClassNames("tc-code-block-language", className)}>
            {children}
        </span>
    );
}

function CodeBlockActions(props: CodeBlockSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-code-block-actions", className)}>
            {children}
        </div>
    );
}

function CodeBlockBody(props: CodeBlockSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <pre {...rest} className={joinClassNames("tc-code-block-body", className)}>
            <code>{children}</code>
        </pre>
    );
}

export const CodeBlock = Object.assign(CodeBlockRoot, {
    Actions: CodeBlockActions,
    Body: CodeBlockBody,
    Header: CodeBlockHeader,
    Language: CodeBlockLanguage,
});
