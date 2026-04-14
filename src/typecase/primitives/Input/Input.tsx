import { joinClassNames } from "../../utils/class-name.ts";

export type InputVariant = "default";
export type InputSize = "sm" | "md" | "lg";

export interface InputProps {
    className?: string;
    invalid?: boolean;
    size?: InputSize;
    variant?: InputVariant;
    [key: string]: unknown;
}

export function Input(props: InputProps) {
    const {
        className,
        invalid = false,
        size = "md",
        variant = "default",
        ...rest
    } = props;

    return (
        <input
            {...rest}
            aria-invalid={invalid ? "true" : undefined}
            className={joinClassNames("tc-input", className)}
            data-invalid={invalid ? "true" : undefined}
            data-size={size}
            data-variant={variant}
        />
    );
}
