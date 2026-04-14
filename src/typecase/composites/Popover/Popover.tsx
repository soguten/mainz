import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type PopoverAlign = "center" | "end" | "start";
export type PopoverPlacement = "bottom" | "left" | "right" | "top";

export interface PopoverProps {
    align?: PopoverAlign;
    children?: unknown;
    className?: string;
    open?: boolean;
    placement?: PopoverPlacement;
    style?: string;
    [key: string]: unknown;
}

export interface PopoverAnchorProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface PopoverContentProps {
    children?: unknown;
    className?: string;
    maxWidth?: string;
    role?: string;
    style?: string;
    [key: string]: unknown;
}

function PopoverRoot(props: PopoverProps) {
    const {
        align = "center",
        children,
        className,
        open = false,
        placement = "bottom",
        style,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-popover", className)}
            data-align={align}
            data-open={open ? "true" : "false"}
            data-placement={placement}
            style={style}
        >
            {children}
        </div>
    );
}

function PopoverAnchor(props: PopoverAnchorProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-popover-anchor", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function PopoverContent(props: PopoverContentProps) {
    const { children, className, maxWidth, role = "dialog", style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-popover-content", className)}
            role={role}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-popover-max-width": maxWidth,
                }),
                style,
            )}
        >
            {children}
        </div>
    );
}

export const Popover = Object.assign(PopoverRoot, {
    Anchor: PopoverAnchor,
    Content: PopoverContent,
});
