import { Shortcut } from "../../primitives/index.ts";
import type { ShortcutChord, ShortcutPlatform } from "../../utils/shortcut.ts";
import { joinClassNames } from "../../utils/class-name.ts";

type QuickMenuSectionProps = {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
};

export type QuickMenuSize = "sm" | "md";

export interface QuickMenuProps extends QuickMenuSectionProps {
    size?: QuickMenuSize;
}

export interface QuickMenuItemProps extends QuickMenuSectionProps {
    active?: boolean;
    description?: unknown;
    icon?: unknown;
    onSelect?: (event: Event) => void;
    shortcut?: ShortcutChord;
    shortcutPlatform?: ShortcutPlatform;
    trailing?: unknown;
}

function QuickMenuRoot(props: QuickMenuProps) {
    const { children, className, size = "md", style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu", className)}
            data-size={size}
            role="menu"
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuHeader(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-header", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuKicker(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-kicker", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuTitle(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-title", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuList(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-list", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuGroup(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <section
            {...rest}
            className={joinClassNames("tc-quick-menu-group", className)}
            style={style}
        >
            {children}
        </section>
    );
}

function QuickMenuGroupLabel(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-group-label", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuEmpty(props: QuickMenuSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-quick-menu-empty", className)}
            style={style}
        >
            {children}
        </div>
    );
}

function QuickMenuItem(props: QuickMenuItemProps) {
    const {
        active = false,
        children,
        className,
        description,
        icon,
        onSelect,
        shortcut,
        shortcutPlatform,
        style,
        trailing,
        ...rest
    } = props;

    return (
        <button
            {...rest}
            className={joinClassNames("tc-quick-menu-item", className)}
            data-active={active ? "true" : "false"}
            onClick={onSelect}
            role="menuitem"
            style={style}
            type="button"
        >
            {icon ? <span className="tc-quick-menu-item-icon">{icon}</span> : null}
            <span className="tc-quick-menu-item-body">
                <span className="tc-quick-menu-item-title">{children}</span>
                {description
                    ? <span className="tc-quick-menu-item-description">{description}</span>
                    : null}
            </span>
            {shortcut
                ? (
                    <span className="tc-quick-menu-item-shortcut">
                        <Shortcut chord={shortcut} platform={shortcutPlatform} />
                    </span>
                )
                : null}
            {trailing ? <span className="tc-quick-menu-item-trailing">{trailing}</span> : null}
        </button>
    );
}

export const QuickMenu = Object.assign(QuickMenuRoot, {
    Empty: QuickMenuEmpty,
    Group: QuickMenuGroup,
    GroupLabel: QuickMenuGroupLabel,
    Header: QuickMenuHeader,
    Item: QuickMenuItem,
    Kicker: QuickMenuKicker,
    List: QuickMenuList,
    Title: QuickMenuTitle,
});
