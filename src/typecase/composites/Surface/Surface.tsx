import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type SurfaceTag = "div" | "section" | "article" | "header" | "footer" | "nav";
type SurfaceVariant = "default" | "subtle" | "ghost";
type SurfacePadding = "sm" | "md" | "lg" | string;

const paddingMap: Record<string, string> = {
    "sm": "1rem",
    "md": "1.5rem",
    "lg": "2rem",
};

export interface SurfaceProps {
    as?: SurfaceTag;
    children?: unknown;
    className?: string;
    padding?: SurfacePadding;
    style?: string;
    variant?: SurfaceVariant;
    [key: string]: unknown;
}

export function Surface(props: SurfaceProps) {
    const {
        as = "div",
        children,
        className,
        padding = "md",
        style,
        variant = "default",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-surface", className)}
            data-variant={variant}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-surface-padding": paddingMap[padding] ?? padding,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
