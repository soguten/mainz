import { joinClassNames } from "../../utils/class-name.ts";

export type SwitchSize = "sm" | "md";

export interface SwitchProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    size?: SwitchSize;
    [key: string]: unknown;
}

export function Switch(props: SwitchProps) {
    const {
        children,
        className,
        invalid = false,
        size = "md",
        ...rest
    } = props;

    return (
        <label
            className={joinClassNames("tc-switch", className)}
            data-invalid={invalid ? "true" : undefined}
            data-size={size}
        >
            <input
                {...rest}
                aria-invalid={invalid ? "true" : undefined}
                className="tc-switch-input"
                type="checkbox"
            />
            <span aria-hidden="true" className="tc-switch-control">
                <span className="tc-switch-thumb" />
            </span>
            {children ? <span className="tc-switch-label">{children}</span> : null}
        </label>
    );
}
