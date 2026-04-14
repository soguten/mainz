import { joinClassNames } from "../../utils/class-name.ts";

export type CalloutTone = "neutral" | "info" | "success" | "warning" | "danger";
export type CalloutVariant = "soft" | "outline";
export type CalloutTag = "aside" | "section" | "div";

export interface CalloutProps {
    as?: CalloutTag;
    children?: unknown;
    className?: string;
    role?: string;
    tone?: CalloutTone;
    variant?: CalloutVariant;
    [key: string]: unknown;
}

export interface CalloutSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function CalloutRoot(props: CalloutProps) {
    const {
        as = "aside",
        children,
        className,
        role,
        tone = "neutral",
        variant = "soft",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-callout", className)}
            data-tone={tone}
            data-variant={variant}
            role={role}
        >
            {children}
        </Tag>
    );
}

function CalloutIcon(props: CalloutSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-callout-icon", className)}>
            {children}
        </div>
    );
}

function CalloutTitle(props: CalloutSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <strong {...rest} className={joinClassNames("tc-callout-title", className)}>
            {children}
        </strong>
    );
}

function CalloutBody(props: CalloutSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-callout-body", className)}>
            {children}
        </div>
    );
}

function CalloutActions(props: CalloutSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-callout-actions", className)}>
            {children}
        </div>
    );
}

export const Callout = Object.assign(CalloutRoot, {
    Actions: CalloutActions,
    Body: CalloutBody,
    Icon: CalloutIcon,
    Title: CalloutTitle,
});
