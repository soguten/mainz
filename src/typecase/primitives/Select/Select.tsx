import { joinClassNames } from "../../utils/class-name.ts";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    size?: SelectSize;
    [key: string]: unknown;
}

export function Select(props: SelectProps) {
    const {
        children,
        className,
        invalid = false,
        size = "md",
        ...rest
    } = props;

    return (
        <select
            {...rest}
            aria-invalid={invalid ? "true" : undefined}
            className={joinClassNames("tc-select", className)}
            data-invalid={invalid ? "true" : undefined}
            data-size={size}
        >
            {children}
        </select>
    );
}
