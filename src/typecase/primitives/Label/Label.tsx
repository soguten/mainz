import { joinClassNames } from "../../utils/class-name.ts";

export interface LabelProps {
    children?: unknown;
    className?: string;
    required?: boolean;
    [key: string]: unknown;
}

export function Label(props: LabelProps) {
    const {
        children,
        className,
        required = false,
        ...rest
    } = props;

    return (
        <label
            {...rest}
            className={joinClassNames("tc-label", className)}
            data-required={required ? "true" : "false"}
        >
            {children}
        </label>
    );
}
