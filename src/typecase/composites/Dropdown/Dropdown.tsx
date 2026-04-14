import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type DropdownAlign = "start" | "end";

export interface DropdownProps {
    align?: DropdownAlign;
    children?: unknown;
    className?: string;
    open?: boolean;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownTriggerProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownContentProps {
    children?: unknown;
    className?: string;
    maxHeight?: string;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    onSelect?: (event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export function Dropdown(props: DropdownProps) {
    const {
        align = "end",
        children,
        className,
        open = false,
        style,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-dropdown", className)}
            data-align={align}
            data-open={open ? "true" : "false"}
            style={style}
        >
            {children}
        </div>
    );
}

export function DropdownTrigger(props: DropdownTriggerProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-dropdown-trigger", className)}
            style={style}
        >
            {children}
        </div>
    );
}

export function DropdownMenu(props: DropdownContentProps) {
    const { children, className, maxHeight, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-dropdown-menu", className)}
            role="menu"
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-dropdown-menu-max-height": maxHeight,
                }),
                style,
            )}
        >
            {children}
        </div>
    );
}

export function DropdownItem(props: DropdownItemProps) {
    const {
        active = false,
        children,
        className,
        onSelect,
        style,
        ...rest
    } = props;

    return (
        <button
            {...rest}
            aria-pressed={active ? "true" : "false"}
            className={joinClassNames("tc-dropdown-item", className)}
            data-active={active ? "true" : "false"}
            onClick={onSelect}
            role="menuitemradio"
            style={style}
            type="button"
        >
            {children}
        </button>
    );
}

Dropdown.Trigger = DropdownTrigger;
Dropdown.Menu = DropdownMenu;
Dropdown.Item = DropdownItem;
