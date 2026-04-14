import { joinClassNames } from "../../utils/class-name.ts";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
    className?: string;
    decorative?: boolean;
    label?: string;
    size?: SpinnerSize;
    [key: string]: unknown;
}

export function Spinner(props: SpinnerProps) {
    const {
        className,
        decorative = false,
        label = "Loading",
        size = "md",
        ...rest
    } = props;

    return (
        <span
            {...rest}
            aria-hidden={decorative ? "true" : undefined}
            aria-label={decorative ? undefined : label}
            className={joinClassNames("tc-spinner", className)}
            data-size={size}
            role={decorative ? undefined : "status"}
        />
    );
}
