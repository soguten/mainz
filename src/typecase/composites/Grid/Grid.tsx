import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type GridTag = "div" | "section" | "main" | "nav";
type GridGap = "sm" | "md" | "lg" | string;

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
};

export interface GridProps {
    as?: GridTag;
    children?: unknown;
    className?: string;
    columns?: number;
    gap?: GridGap;
    minItemWidth?: string;
    style?: string;
    [key: string]: unknown;
}

export function Grid(props: GridProps) {
    const {
        as = "div",
        children,
        className,
        columns,
        gap = "md",
        minItemWidth,
        style,
        ...rest
    } = props;

    const Tag = as;
    const gridColumns = columns
        ? `repeat(${columns}, minmax(0, 1fr))`
        : `repeat(auto-fit, minmax(${minItemWidth ?? "16rem"}, 1fr))`;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-grid", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-grid-gap": gapMap[gap] ?? gap,
                    "--tc-grid-columns": gridColumns,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
