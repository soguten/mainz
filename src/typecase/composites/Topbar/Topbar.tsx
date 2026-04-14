import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type TopbarTag = "div" | "header";
type TopbarVariant = "default" | "subtle" | "strong";

export interface TopbarProps {
    as?: TopbarTag;
    children?: unknown;
    blur?: boolean;
    className?: string;
    sticky?: boolean;
    style?: string;
    top?: string;
    variant?: TopbarVariant;
    zIndex?: number | string;
    [key: string]: unknown;
}

export function Topbar(props: TopbarProps) {
    const {
        as = "header",
        blur = false,
        children,
        className,
        sticky = false,
        style,
        top,
        variant = "default",
        zIndex,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-topbar", className)}
            data-blur={blur ? "true" : "false"}
            data-sticky={sticky ? "true" : "false"}
            data-variant={variant}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-topbar-top": top,
                    "--tc-topbar-z-index": zIndex == null ? undefined : String(zIndex),
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

export type { TopbarVariant };
