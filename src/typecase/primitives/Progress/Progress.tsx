import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type ProgressSize = "sm" | "md";
export type ProgressTone = "primary" | "success" | "warning" | "danger";

export interface ProgressProps {
    className?: string;
    label?: string;
    max?: number;
    size?: ProgressSize;
    style?: string;
    tone?: ProgressTone;
    value?: number;
    [key: string]: unknown;
}

function clampProgressValue(value: number, max: number): number {
    return Math.min(Math.max(value, 0), max);
}

export function Progress(props: ProgressProps) {
    const {
        className,
        label,
        max = 100,
        size = "md",
        style,
        tone = "primary",
        value,
        ...rest
    } = props;

    const hasValue = typeof value === "number" && Number.isFinite(value);
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const currentValue = hasValue ? clampProgressValue(value, safeMax) : undefined;
    const width = currentValue === undefined ? undefined : `${(currentValue / safeMax) * 100}%`;

    return (
        <div
            {...rest}
            aria-label={label}
            aria-valuemax={safeMax}
            aria-valuemin={0}
            aria-valuenow={currentValue}
            className={joinClassNames("tc-progress", className)}
            data-indeterminate={currentValue === undefined ? "true" : "false"}
            data-size={size}
            data-tone={tone}
            role="progressbar"
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-progress-value": width,
                }),
                style,
            )}
        >
            <span className="tc-progress-bar" />
        </div>
    );
}
