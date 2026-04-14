import { joinClassNames } from "../../utils/class-name.ts";

export type EmptyStateAlign = "start" | "center";
export type EmptyStateVariant = "default" | "subtle";

export interface EmptyStateProps {
    align?: EmptyStateAlign;
    children?: unknown;
    className?: string;
    variant?: EmptyStateVariant;
    [key: string]: unknown;
}

export interface EmptyStateSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function EmptyStateRoot(props: EmptyStateProps) {
    const { align = "center", children, className, variant = "default", ...rest } = props;

    return (
        <section
            {...rest}
            className={joinClassNames("tc-empty-state", className)}
            data-align={align}
            data-variant={variant}
        >
            {children}
        </section>
    );
}

function EmptyStateIcon(props: EmptyStateSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-empty-state-icon", className)}>
            {children}
        </div>
    );
}

function EmptyStateTitle(props: EmptyStateSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <h3 {...rest} className={joinClassNames("tc-empty-state-title", className)}>
            {children}
        </h3>
    );
}

function EmptyStateBody(props: EmptyStateSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-empty-state-body", className)}>
            {children}
        </div>
    );
}

function EmptyStateActions(props: EmptyStateSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-empty-state-actions", className)}>
            {children}
        </div>
    );
}

export const EmptyState = Object.assign(EmptyStateRoot, {
    Actions: EmptyStateActions,
    Body: EmptyStateBody,
    Icon: EmptyStateIcon,
    Title: EmptyStateTitle,
});
