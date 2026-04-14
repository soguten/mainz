import { joinClassNames } from "../../utils/class-name.ts";

export type StatAlign = "start" | "center" | "end";
export type StatVariant = "default" | "subtle";

export interface StatProps {
    align?: StatAlign;
    children?: unknown;
    className?: string;
    variant?: StatVariant;
    [key: string]: unknown;
}

export interface StatSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function StatRoot(props: StatProps) {
    const {
        align = "start",
        children,
        className,
        variant = "default",
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-stat", className)}
            data-align={align}
            data-variant={variant}
        >
            {children}
        </div>
    );
}

function StatLabel(props: StatSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <span {...rest} className={joinClassNames("tc-stat-label", className)}>
            {children}
        </span>
    );
}

function StatValue(props: StatSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <strong {...rest} className={joinClassNames("tc-stat-value", className)}>
            {children}
        </strong>
    );
}

function StatHelpText(props: StatSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <span {...rest} className={joinClassNames("tc-stat-help-text", className)}>
            {children}
        </span>
    );
}

export const Stat = Object.assign(StatRoot, {
    HelpText: StatHelpText,
    Label: StatLabel,
    Value: StatValue,
});
