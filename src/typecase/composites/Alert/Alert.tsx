import { joinClassNames } from "../../utils/class-name.ts";

export type AlertTone = "neutral" | "info" | "success" | "warning" | "danger";
export type AlertVariant = "soft" | "outline";
export type AlertTag = "div" | "section" | "aside";

export interface AlertProps {
    as?: AlertTag;
    children?: unknown;
    className?: string;
    role?: string;
    tone?: AlertTone;
    variant?: AlertVariant;
    [key: string]: unknown;
}

export interface AlertSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function AlertRoot(props: AlertProps) {
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
            className={joinClassNames("tc-alert", className)}
            data-tone={tone}
            data-variant={variant}
            role={role}
        >
            {children}
        </Tag>
    );
}

function AlertIcon(props: AlertSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-alert-icon", className)}>
            {children}
        </div>
    );
}

function AlertTitle(props: AlertSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <strong {...rest} className={joinClassNames("tc-alert-title", className)}>
            {children}
        </strong>
    );
}

function AlertBody(props: AlertSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-alert-body", className)}>
            {children}
        </div>
    );
}

function AlertActions(props: AlertSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-alert-actions", className)}>
            {children}
        </div>
    );
}

export const Alert = Object.assign(AlertRoot, {
    Actions: AlertActions,
    Body: AlertBody,
    Icon: AlertIcon,
    Title: AlertTitle,
});
