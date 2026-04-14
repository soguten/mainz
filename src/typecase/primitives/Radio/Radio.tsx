import { joinClassNames } from "../../utils/class-name.ts";

export type RadioSize = "sm" | "md";

export interface RadioProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    size?: RadioSize;
    [key: string]: unknown;
}

export function Radio(props: RadioProps) {
    const {
        children,
        className,
        invalid = false,
        size = "md",
        ...rest
    } = props;

    return (
        <label
            className={joinClassNames("tc-choice", className)}
            data-invalid={invalid ? "true" : undefined}
            data-kind="radio"
            data-size={size}
        >
            <input
                {...rest}
                aria-invalid={invalid ? "true" : undefined}
                className="tc-choice-input"
                type="radio"
            />
            {children ? <span className="tc-choice-label">{children}</span> : null}
        </label>
    );
}
