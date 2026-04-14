import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Shortcut } from "../../primitives/index.ts";
import { Dropdown, type DropdownAlign } from "../../composites/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { hasTypecaseRole, markTypecaseRole } from "../../utils/component-role.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";
import type { ShortcutChord, ShortcutPlatform } from "../../utils/shortcut.ts";

interface DropdownMenuState {
    open: boolean;
    portalStyle: string;
}

export interface DropdownMenuProps {
    align?: DropdownAlign;
    children?: unknown;
    className?: string;
    onSelect?: (value: string, event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownMenuTriggerProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownMenuContentProps {
    children?: unknown;
    className?: string;
    maxHeight?: string;
    style?: string;
    [key: string]: unknown;
}

export interface DropdownMenuItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    shortcut?: ShortcutChord;
    shortcutPlatform?: ShortcutPlatform;
    style?: string;
    trailing?: unknown;
    value?: string;
    [key: string]: unknown;
}

let dropdownMenuId = 0;
const DROPDOWN_MENU_CONTENT_ROLE = "DropdownMenu.Content";

class DropdownMenuComponent extends Component<DropdownMenuProps, DropdownMenuState> {
    private readonly dropdownId = `tc-dropdown-menu-${++dropdownMenuId}`;

    protected override initState(): DropdownMenuState {
        return {
            open: false,
            portalStyle: "",
        };
    }

    override onMount(): void {
        this.syncDOMBindings();
        this.syncGlobalBindings();
    }

    override afterRender(): void {
        this.syncDOMBindings();
        this.syncGlobalBindings();
    }

    private syncDOMBindings(): void {
        const trigger = this.getTriggerElement();

        if (trigger instanceof HTMLElement) {
            trigger.setAttribute("aria-expanded", this.state.open ? "true" : "false");
            trigger.setAttribute("aria-haspopup", "menu");
            this.registerDOMEvent(trigger, "click", this.toggle);
        }

        this.querySelectorAll(".tc-dropdown-menu-item").forEach((item) => {
            this.registerDOMEvent(item, "click", this.handleItemClick);
        });

        this.getPortalElement()?.querySelectorAll(".tc-dropdown-menu-item").forEach((item) => {
            this.registerDOMEvent(item, "click", this.handleItemClick);
        });
    }

    private syncGlobalBindings(): void {
        this.registerDOMEvent(document, "click", this.handleDocumentClick);
        this.registerDOMEvent(window, "keydown", this.handleWindowKeyDown);
        this.registerDOMEvent(window, "resize", this.handleWindowResize);
    }

    private getTriggerElement(): HTMLElement | null {
        const trigger = this.querySelector(".tc-dropdown-menu-trigger button") ??
            this.querySelector(".tc-dropdown-menu-trigger");

        return trigger instanceof HTMLElement ? trigger : null;
    }

    private getPortalElement(): HTMLElement | null {
        return this.ownerDocument.querySelector(
            `[data-tc-dropdown-menu-portal="${this.dropdownId}"]`,
        );
    }

    private handleDocumentClick = (event: Event): void => {
        if (!this.state.open) {
            return;
        }

        const target = event.target;

        if (target instanceof Node && this.contains(target)) {
            return;
        }

        if (target instanceof Node && this.getPortalElement()?.contains(target)) {
            return;
        }

        this.setState({ open: false });
    };

    private handleWindowKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || !this.state.open) {
            return;
        }

        if (event.key === "Escape") {
            this.setState({ open: false });
        }
    };

    private handleWindowResize = (): void => {
        if (!this.state.open) {
            return;
        }

        this.setState({ portalStyle: this.getPortalStyle() });
    };

    private toggle = (): void => {
        const nextOpen = !this.state.open;

        this.setState({
            open: nextOpen,
            portalStyle: nextOpen ? this.getPortalStyle() : "",
        });
    };

    private close = (): void => {
        this.setState({ open: false, portalStyle: "" });
    };

    private handleItemClick = (event: Event): void => {
        const currentTarget = event.currentTarget;
        const value = currentTarget instanceof HTMLElement
            ? currentTarget.getAttribute("data-value")
            : null;

        this.close();

        if (value) {
            this.props.onSelect?.(value, event);
        }
    };

    private getPortalStyle(): string {
        const trigger = this.getTriggerElement();

        if (!trigger) {
            return "";
        }

        const align = this.props.align ?? "end";
        const rect = trigger.getBoundingClientRect();
        const viewportWidth = this.ownerDocument.defaultView?.innerWidth ?? rect.right;
        const horizontal = align === "start"
            ? `left: ${rect.left}px;`
            : `right: ${Math.max(viewportWidth - rect.right, 0)}px;`;

        return [
            `top: ${rect.bottom + 8}px;`,
            horizontal,
            `--tc-dropdown-menu-min-width: ${rect.width}px;`,
        ].join(" ");
    }

    private partitionChildren(children: unknown): {
        content: unknown[];
        trigger: unknown[];
    } {
        const content: unknown[] = [];
        const trigger: unknown[] = [];

        for (const child of this.flattenChildren(children)) {
            if (this.isDropdownMenuContentNode(child)) {
                content.push(child);
                continue;
            }

            trigger.push(child);
        }

        return { content, trigger };
    }

    private flattenChildren(children: unknown): unknown[] {
        const childList = (Array.isArray(children) ? children : [children]).flat(Infinity);
        const flattened: unknown[] = [];

        for (const child of childList) {
            const fragmentCtor = this.ownerDocument.defaultView?.DocumentFragment;

            if (fragmentCtor && child instanceof fragmentCtor) {
                flattened.push(...Array.from(child.childNodes));
                continue;
            }

            flattened.push(child);
        }

        return flattened;
    }

    private isDropdownMenuContentNode(child: unknown): boolean {
        return hasTypecaseRole(child, DROPDOWN_MENU_CONTENT_ROLE);
    }

    override render() {
        const {
            align = "end",
            children,
            className,
            onSelect: _onSelect,
            style,
            ...rest
        } = this.props;
        const parts = this.partitionChildren(children);

        return (
            <Dropdown
                {...rest}
                align={align}
                className={joinClassNames("tc-dropdown-menu-root", className)}
                open={this.state.open}
                style={style}
            >
                {parts.trigger}
                {this.state.open && parts.content.length > 0
                    ? (
                        <Portal layer="popover">
                            <div {...getTypecaseRootShellProps(this)}>
                                <div
                                    className="tc-dropdown-menu-portal"
                                    data-tc-dropdown-menu-portal={this.dropdownId}
                                    style={this.state.portalStyle}
                                >
                                    {parts.content}
                                </div>
                            </div>
                        </Portal>
                    )
                    : null}
            </Dropdown>
        );
    }
}

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
    const { children, className, style, ...rest } = props;

    return (
        <Dropdown.Trigger
            {...rest}
            className={joinClassNames("tc-dropdown-menu-trigger", className)}
            style={style}
        >
            {children}
        </Dropdown.Trigger>
    );
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
    const { children, className, maxHeight, style, ...rest } = props;

    return markTypecaseRole(
        (
            <Dropdown.Menu
                {...rest}
                className={joinClassNames("tc-dropdown-menu-content", className)}
                maxHeight={maxHeight}
                style={style}
            >
                {children}
            </Dropdown.Menu>
        ) as HTMLElement,
        DROPDOWN_MENU_CONTENT_ROLE,
    );
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
    const {
        active,
        children,
        className,
        shortcut,
        shortcutPlatform = "auto",
        style,
        trailing,
        value,
        ...rest
    } = props;
    const trailingContent = shortcut
        ? (
            <Shortcut
                chord={shortcut}
                className="tc-dropdown-menu-item-shortcut"
                platform={shortcutPlatform}
                size="sm"
            />
        )
        : trailing;

    return (
        <button
            {...rest}
            aria-pressed={active ? "true" : "false"}
            className={joinClassNames("tc-dropdown-item tc-dropdown-menu-item", className)}
            data-active={active ? "true" : "false"}
            data-value={value}
            role="menuitemradio"
            style={style}
            type="button"
        >
            <span className="tc-dropdown-menu-item-content">
                {children}
            </span>
            {trailingContent
                ? <span className="tc-dropdown-menu-item-trailing">{trailingContent}</span>
                : null}
        </button>
    );
}

export const DropdownMenu = DropdownMenuComponent as typeof DropdownMenuComponent & {
    Content: typeof DropdownMenuContent;
    Item: typeof DropdownMenuItem;
    Trigger: typeof DropdownMenuTrigger;
};

DropdownMenu.Trigger = DropdownMenuTrigger;
DropdownMenu.Content = DropdownMenuContent;
DropdownMenu.Item = DropdownMenuItem;
