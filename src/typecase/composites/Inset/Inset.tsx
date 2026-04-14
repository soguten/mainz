import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type InsetTag = "div" | "section" | "article" | "main" | "aside";
type InsetSpacing = "sm" | "md" | "lg" | string;

const spacingMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
};

export interface InsetProps {
    as?: InsetTag;
    children?: unknown;
    className?: string;
    padding?: InsetSpacing;
    paddingX?: InsetSpacing;
    paddingY?: InsetSpacing;
    style?: string;
    [key: string]: unknown;
}

export function Inset(props: InsetProps) {
    const {
        as = "div",
        children,
        className,
        padding = "md",
        paddingX,
        paddingY,
        style,
        ...rest
    } = props;

    const resolvedPadding = spacingMap[padding] ?? padding;
    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-inset", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-inset-padding": resolvedPadding,
                    "--tc-inset-padding-x": paddingX ? spacingMap[paddingX] ?? paddingX : resolvedPadding,
                    "--tc-inset-padding-y": paddingY ? spacingMap[paddingY] ?? paddingY : resolvedPadding,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
