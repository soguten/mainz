import { joinClassNames } from "../../utils/class-name.ts";

type ShowTag = "div" | "span" | "section" | "nav";
type ShowBreakpoint = "sm" | "md" | "lg";

export interface ShowProps {
    above?: ShowBreakpoint;
    as?: ShowTag;
    below?: ShowBreakpoint;
    between?: readonly [ShowBreakpoint, ShowBreakpoint];
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export function Show(props: ShowProps) {
    const {
        above,
        as = "div",
        below,
        between,
        children,
        className,
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-show", className)}
            data-above={above}
            data-below={below}
            data-between-start={between?.[0]}
            data-between-end={between?.[1]}
            style={style}
        >
            {children}
        </Tag>
    );
}

export type { ShowBreakpoint };
