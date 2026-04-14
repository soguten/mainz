import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type InlineTag = "div" | "section" | "nav" | "header" | "footer";
type InlineGap = "sm" | "md" | "lg" | string;
type InlineAlign = "flex-start" | "center" | "flex-end" | "stretch";
type InlineJustify =
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
};

export interface InlineProps {
    align?: InlineAlign;
    as?: InlineTag;
    children?: unknown;
    className?: string;
    gap?: InlineGap;
    justify?: InlineJustify;
    style?: string;
    wrap?: boolean;
    [key: string]: unknown;
}

export function Inline(props: InlineProps) {
    const {
        align = "center",
        as = "div",
        children,
        className,
        gap = "md",
        justify = "flex-start",
        style,
        wrap = true,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-inline", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-inline-align": align,
                    "--tc-inline-gap": gapMap[gap] ?? gap,
                    "--tc-inline-justify": justify,
                    "--tc-inline-wrap": wrap ? "wrap" : "nowrap",
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
