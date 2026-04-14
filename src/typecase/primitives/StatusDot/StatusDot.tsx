import { joinClassNames } from "../../utils/class-name.ts";

export type StatusDotSize = "sm" | "md";
export type StatusDotTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusDotProps {
    className?: string;
    label?: string;
    pulse?: boolean;
    size?: StatusDotSize;
    tone?: StatusDotTone;
    [key: string]: unknown;
}

export function StatusDot(props: StatusDotProps) {
    const {
        className,
        label,
        pulse = false,
        size = "md",
        tone = "neutral",
        ...rest
    } = props;

    return (
        <span
            {...rest}
            aria-hidden={label ? undefined : "true"}
            aria-label={label}
            className={joinClassNames("tc-status-dot", className)}
            data-pulse={pulse ? "true" : "false"}
            data-size={size}
            data-tone={tone}
            role={label ? "img" : undefined}
        />
    );
}
