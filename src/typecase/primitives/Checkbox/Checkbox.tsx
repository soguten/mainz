import { joinClassNames } from "../../utils/class-name.ts";

export type CheckboxSize = "sm" | "md";

export interface CheckboxProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    size?: CheckboxSize;
    [key: string]: unknown;
}

export function Checkbox(props: CheckboxProps) {
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
            data-kind="checkbox"
            data-size={size}
        >
            <input
                {...rest}
                aria-invalid={invalid ? "true" : undefined}
                className="tc-choice-input"
                type="checkbox"
            />
            {children ? <span className="tc-choice-label">{children}</span> : null}
        </label>
    );
}
