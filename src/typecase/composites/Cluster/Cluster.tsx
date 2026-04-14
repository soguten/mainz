import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type ClusterTag = "div" | "section" | "nav" | "header" | "footer";
type ClusterGap = "sm" | "md" | "lg" | string;
type ClusterAlign = "flex-start" | "center" | "flex-end" | "stretch";
type ClusterJustify =
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";

const gapMap: Record<string, string> = {
    "sm": "0.5rem",
    "md": "0.75rem",
    "lg": "1rem",
};

export interface ClusterProps {
    align?: ClusterAlign;
    as?: ClusterTag;
    children?: unknown;
    className?: string;
    gap?: ClusterGap;
    justify?: ClusterJustify;
    style?: string;
    [key: string]: unknown;
}

export function Cluster(props: ClusterProps) {
    const {
        align = "center",
        as = "div",
        children,
        className,
        gap = "sm",
        justify = "flex-start",
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-cluster", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-cluster-align": align,
                    "--tc-cluster-gap": gapMap[gap] ?? gap,
                    "--tc-cluster-justify": justify,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
