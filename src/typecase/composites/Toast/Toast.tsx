import { joinClassNames } from "../../utils/class-name.ts";

export type ToastTone = "neutral" | "info" | "success" | "warning" | "danger";
export type ToastVariant = "soft" | "outline" | "solid";
export type ToastTag = "div" | "section" | "aside";

export interface ToastProps {
    as?: ToastTag;
    children?: unknown;
    className?: string;
    role?: string;
    tone?: ToastTone;
    variant?: ToastVariant;
    [key: string]: unknown;
}

export interface ToastSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function ToastRoot(props: ToastProps) {
    const {
        as = "div",
        children,
        className,
        role = "status",
        tone = "neutral",
        variant = "soft",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            aria-live={role === "alert" ? "assertive" : "polite"}
            className={joinClassNames("tc-toast", className)}
            data-tone={tone}
            data-variant={variant}
            role={role}
        >
            {children}
        </Tag>
    );
}

function ToastTitle(props: ToastSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <strong {...rest} className={joinClassNames("tc-toast-title", className)}>
            {children}
        </strong>
    );
}

function ToastBody(props: ToastSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-toast-body", className)}>
            {children}
        </div>
    );
}

function ToastActions(props: ToastSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-toast-actions", className)}>
            {children}
        </div>
    );
}

export const Toast = Object.assign(ToastRoot, {
    Actions: ToastActions,
    Body: ToastBody,
    Title: ToastTitle,
});
