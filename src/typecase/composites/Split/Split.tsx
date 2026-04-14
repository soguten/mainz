import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type SplitTag = "div" | "section" | "main";
type SplitGap = "sm" | "md" | "lg" | "xl" | string;
type SplitCollapseBelow = "sm" | "md" | "lg";
type SplitSectionTag = "div" | "section" | "aside" | "main";

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem",
};

type SplitSectionProps = {
    as?: SplitSectionTag;
    children?: unknown;
    className?: string;
    sticky?: boolean;
    style?: string;
    top?: string;
    [key: string]: unknown;
};

export interface SplitProps {
    as?: SplitTag;
    children?: unknown;
    className?: string;
    collapseBelow?: SplitCollapseBelow;
    endWidth?: string;
    gap?: SplitGap;
    mainMinWidth?: string;
    startWidth?: string;
    style?: string;
    [key: string]: unknown;
}

function SplitRoot(props: SplitProps) {
    const {
        as = "div",
        children,
        className,
        collapseBelow,
        endWidth,
        gap = "lg",
        mainMinWidth = "0",
        startWidth,
        style,
        ...rest
    } = props;

    const Tag = as;
    const columns = startWidth && endWidth
        ? `${startWidth} minmax(${mainMinWidth}, 1fr) ${endWidth}`
        : startWidth
        ? `${startWidth} minmax(${mainMinWidth}, 1fr)`
        : endWidth
        ? `minmax(${mainMinWidth}, 1fr) ${endWidth}`
        : `minmax(${mainMinWidth}, 1fr)`;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-split", className)}
            data-collapse-below={collapseBelow}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-split-columns": columns,
                    "--tc-split-gap": gapMap[gap] ?? gap,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

function SplitStart(props: SplitSectionProps) {
    return renderSplitSection("tc-split-start", props);
}

function SplitMain(props: SplitSectionProps) {
    return renderSplitSection("tc-split-main", props);
}

function SplitEnd(props: SplitSectionProps) {
    return renderSplitSection("tc-split-end", props);
}

function renderSplitSection(baseClassName: string, props: SplitSectionProps) {
    const {
        as = "div",
        children,
        className,
        sticky = false,
        style,
        top,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames(baseClassName, className)}
            data-sticky={sticky ? "true" : "false"}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-split-sticky-top": top,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

export const Split = Object.assign(SplitRoot, {
    End: SplitEnd,
    Main: SplitMain,
    Start: SplitStart,
});
