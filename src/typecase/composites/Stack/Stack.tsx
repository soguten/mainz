import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type StackTag = "div" | "section" | "main" | "article" | "header" | "footer";
type StackGap = "sm" | "md" | "lg" | "xl" | string;
type StackAlign = "stretch" | "flex-start" | "center" | "flex-end";
type StackJustify =
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2.5rem",
};

export interface StackProps {
    align?: StackAlign;
    as?: StackTag;
    children?: unknown;
    className?: string;
    gap?: StackGap;
    justify?: StackJustify;
    style?: string;
    [key: string]: unknown;
}

export function Stack(props: StackProps) {
    const {
        align = "stretch",
        as = "div",
        children,
        className,
        gap = "md",
        justify = "flex-start",
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-stack", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-stack-align": align,
                    "--tc-stack-gap": gapMap[gap] ?? gap,
                    "--tc-stack-justify": justify,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
