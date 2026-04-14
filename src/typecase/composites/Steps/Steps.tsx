import { joinClassNames } from "../../utils/class-name.ts";

export type StepsOrientation = "vertical" | "horizontal";
export type StepStatus = "complete" | "current" | "upcoming";

export interface StepsProps {
    children?: unknown;
    className?: string;
    label?: string;
    orientation?: StepsOrientation;
    [key: string]: unknown;
}

export interface StepItemProps {
    children?: unknown;
    className?: string;
    status?: StepStatus;
    [key: string]: unknown;
}

export interface StepSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function StepsRoot(props: StepsProps) {
    const {
        children,
        className,
        label = "Progress",
        orientation = "vertical",
        ...rest
    } = props;

    return (
        <ol
            {...rest}
            aria-label={label}
            className={joinClassNames("tc-steps", className)}
            data-orientation={orientation}
        >
            {children}
        </ol>
    );
}

function StepItem(props: StepItemProps) {
    const { children, className, status = "upcoming", ...rest } = props;

    return (
        <li
            {...rest}
            className={joinClassNames("tc-step", className)}
            data-status={status}
        >
            {children}
        </li>
    );
}

function StepIndicator(props: StepSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <span {...rest} className={joinClassNames("tc-step-indicator", className)}>
            {children}
        </span>
    );
}

function StepContent(props: StepSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-step-content", className)}>
            {children}
        </div>
    );
}

function StepTitle(props: StepSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <strong {...rest} className={joinClassNames("tc-step-title", className)}>
            {children}
        </strong>
    );
}

function StepDescription(props: StepSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <span {...rest} className={joinClassNames("tc-step-description", className)}>
            {children}
        </span>
    );
}

export const Steps = Object.assign(StepsRoot, {
    Content: StepContent,
    Description: StepDescription,
    Indicator: StepIndicator,
    Item: StepItem,
    Title: StepTitle,
});
