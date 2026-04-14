import { joinClassNames } from "../../utils/class-name.ts";

export type BadgeTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";
export type BadgeTag = "span" | "strong";

export interface BadgeProps {
    as?: BadgeTag;
    children?: unknown;
    className?: string;
    size?: BadgeSize;
    tone?: BadgeTone;
    variant?: BadgeVariant;
    [key: string]: unknown;
}

export function Badge(props: BadgeProps) {
    const {
        as = "span",
        children,
        className,
        size = "md",
        tone = "neutral",
        variant = "soft",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-badge", className)}
            data-size={size}
            data-tone={tone}
            data-variant={variant}
        >
            {children}
        </Tag>
    );
}
