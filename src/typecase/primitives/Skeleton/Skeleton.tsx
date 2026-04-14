import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type SkeletonVariant = "text" | "block" | "circle";
export type SkeletonTag = "span" | "div";

export interface SkeletonProps {
    animated?: boolean;
    as?: SkeletonTag;
    className?: string;
    height?: string;
    label?: string;
    style?: string;
    variant?: SkeletonVariant;
    width?: string;
    [key: string]: unknown;
}

export function Skeleton(props: SkeletonProps) {
    const {
        animated = true,
        as = "span",
        className,
        height,
        label,
        style,
        variant = "text",
        width,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            aria-hidden={label ? undefined : "true"}
            aria-label={label}
            className={joinClassNames("tc-skeleton", className)}
            data-animated={animated ? "true" : "false"}
            data-variant={variant}
            role={label ? "status" : undefined}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-skeleton-height": height,
                    "--tc-skeleton-width": width,
                }),
                style,
            )}
        />
    );
}
