import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type ScrollAreaTag = "div" | "section" | "aside" | "nav";

export interface ScrollAreaProps {
    as?: ScrollAreaTag;
    children?: unknown;
    className?: string;
    height?: string;
    maxHeight?: string;
    style?: string;
    [key: string]: unknown;
}

export function ScrollArea(props: ScrollAreaProps) {
    const {
        as = "div",
        children,
        className,
        height,
        maxHeight,
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-scroll-area", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-scroll-area-height": height,
                    "--tc-scroll-area-max-height": maxHeight,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
