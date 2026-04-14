import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type CenterTag = "div" | "section" | "article" | "main" | "aside";
type CenterAxis = "inline" | "both";
type CenterMaxWidth = "sm" | "md" | "lg" | "xl" | "full" | string;
type CenterTextAlign = "inherit" | "left" | "center";

const maxWidthMap: Record<string, string> = {
    "sm": "24rem",
    "md": "36rem",
    "lg": "48rem",
    "xl": "64rem",
    "full": "100%",
};

export interface CenterProps {
    as?: CenterTag;
    axis?: CenterAxis;
    children?: unknown;
    className?: string;
    maxWidth?: CenterMaxWidth;
    minHeight?: string;
    style?: string;
    textAlign?: CenterTextAlign;
    [key: string]: unknown;
}

export function Center(props: CenterProps) {
    const {
        as = "div",
        axis = "inline",
        children,
        className,
        maxWidth = "md",
        minHeight,
        style,
        textAlign = axis === "both" ? "center" : "inherit",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-center", className)}
            data-axis={axis}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-center-max-width": maxWidthMap[maxWidth] ?? maxWidth,
                    "--tc-center-min-height": minHeight,
                    "--tc-center-text-align": textAlign,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
