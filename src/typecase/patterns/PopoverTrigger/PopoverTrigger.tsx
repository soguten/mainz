import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Popover, type PopoverAlign, type PopoverPlacement } from "../../composites/index.ts";
import { Button, type ButtonProps } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { hasTypecaseRole, markTypecaseRole } from "../../utils/component-role.ts";
import { getAnchoredFloatingStyle } from "../../utils/floating-style.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";

interface PopoverTriggerState {
    open: boolean;
    portalStyle: string;
}

export interface PopoverTriggerProps {
    align?: PopoverAlign;
    children?: unknown;
    className?: string;
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
    placement?: PopoverPlacement;
    style?: string;
    trigger?: unknown;
    triggerLabel?: string;
    [key: string]: unknown;
}

export interface PopoverTriggerAnchorProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface PopoverTriggerContentProps {
    children?: unknown;
    className?: string;
    maxWidth?: string;
    role?: string;
    style?: string;
    [key: string]: unknown;
}

export type PopoverTriggerDefaultAnchorProps = ButtonProps;

let popoverTriggerId = 0;
const POPOVER_TRIGGER_ANCHOR_ROLE = "PopoverTrigger.Anchor";
const POPOVER_TRIGGER_CONTENT_ROLE = "PopoverTrigger.Content";

class PopoverTriggerComponent extends Component<PopoverTriggerProps, PopoverTriggerState> {
    private readonly popoverId = `tc-popover-trigger-${++popoverTriggerId}`;

    protected override initState(): PopoverTriggerState {
        return {
            open: false,
            portalStyle: "",
        };
    }

    override onMount(): void {
        this.syncGlobalBindings();
    }

    override afterRender(): void {
        this.syncGlobalBindings();
    }

    private syncGlobalBindings(): void {
        this.registerDOMEvent(document, "click", this.handleDocumentClick);
        this.registerDOMEvent(window, "keydown", this.handleWindowKeyDown);
        this.registerDOMEvent(window, "resize", this.handleWindowResize);
        this.registerDOMEvent(window, "scroll", this.handleWindowScroll);
    }

    private getAnchorElement(): HTMLElement | null {
        const anchor = this.querySelector(".tc-popover-trigger-anchor");
        return anchor instanceof HTMLElement ? anchor : null;
    }

    private getPortalElement(): HTMLElement | null {
        return this.ownerDocument.querySelector(
            `[data-tc-popover-trigger-portal="${this.popoverId}"]`,
        );
    }

    private partitionChildren(children: unknown): {
        anchors: unknown[];
        content: unknown[];
    } {
        const anchors: unknown[] = [];
        const content: unknown[] = [];

        for (const child of this.flattenChildren(children)) {
            if (hasTypecaseRole(child, POPOVER_TRIGGER_CONTENT_ROLE)) {
                content.push(child);
                continue;
            }

            if (hasTypecaseRole(child, POPOVER_TRIGGER_ANCHOR_ROLE)) {
                anchors.push(child);
                continue;
            }

            content.push(child);
        }

        return { anchors, content };
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

    private handleAnchorClick = (): void => {
        const nextOpen = !this.state.open;

        this.setState({
            open: nextOpen,
            portalStyle: nextOpen ? this.getPortalStyle() : "",
        });
    };

    private close = (): void => {
        this.setState({ open: false, portalStyle: "" });
    };

    private handleDocumentClick = (event: Event): void => {
        if (!this.state.open || this.props.closeOnOutsideClick === false) {
            return;
        }

        const target = event.target;

        if (target instanceof Node && this.contains(target)) {
            return;
        }

        if (target instanceof Node && this.getPortalElement()?.contains(target)) {
            return;
        }

        this.close();
    };

    private handleWindowKeyDown = (event: Event): void => {
        if (
            !(event instanceof KeyboardEvent) ||
            !this.state.open ||
            this.props.closeOnEscape === false
        ) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            this.close();
        }
    };

    private handleWindowResize = (): void => {
        this.syncPortalPosition();
    };

    private handleWindowScroll = (): void => {
        this.syncPortalPosition();
    };

    private syncPortalPosition(): void {
        if (!this.state.open) {
            return;
        }

        this.setState({ portalStyle: this.getPortalStyle() });
    }

    private getPortalStyle(): string {
        const anchor = this.getAnchorElement();

        if (!anchor) {
            return "";
        }

        return getAnchoredFloatingStyle({
            align: this.props.align,
            anchor,
            placement: this.props.placement,
        });
    }

    private renderFallbackAnchor(trigger: unknown, triggerLabel: string) {
        return trigger ?? (
            <Button size="sm" type="button" variant="secondary">
                {triggerLabel}
            </Button>
        );
    }

    override render(): HTMLElement | DocumentFragment {
        const {
            align = "center",
            children,
            className,
            closeOnEscape: _closeOnEscape,
            closeOnOutsideClick: _closeOnOutsideClick,
            placement = "bottom",
            style,
            trigger,
            triggerLabel = "Open popover",
            ...rest
        } = this.props;
        const parts = this.partitionChildren(children);
        const anchor = parts.anchors.length > 0
            ? parts.anchors
            : this.renderFallbackAnchor(trigger, triggerLabel);

        return (
            <Popover
                {...rest}
                align={align}
                className={joinClassNames("tc-popover-trigger-root", className)}
                open={this.state.open}
                placement={placement}
                style={style}
            >
                <Popover.Anchor>
                    <div
                        aria-controls={this.state.open ? this.popoverId : undefined}
                        aria-expanded={this.state.open ? "true" : "false"}
                        className="tc-popover-trigger-anchor"
                        onClick={this.handleAnchorClick}
                    >
                        {anchor}
                    </div>
                </Popover.Anchor>

                {this.state.open && parts.content.length > 0
                    ? (
                        <Portal layer="popover">
                            <div {...getTypecaseRootShellProps(this)}>
                                <div
                                    className="tc-popover-trigger-portal"
                                    data-tc-popover-trigger-portal={this.popoverId}
                                    id={this.popoverId}
                                    style={this.state.portalStyle}
                                >
                                    {parts.content}
                                </div>
                            </div>
                        </Portal>
                    )
                    : null}
            </Popover>
        );
    }
}

export function PopoverTriggerAnchor(props: PopoverTriggerAnchorProps) {
    const { children, className, style, ...rest } = props;

    return markTypecaseRole(
        (
            <div
                {...rest}
                className={joinClassNames("tc-popover-trigger-anchor-slot", className)}
                style={style}
            >
                {children}
            </div>
        ) as HTMLElement,
        POPOVER_TRIGGER_ANCHOR_ROLE,
    );
}

export function PopoverTriggerContent(props: PopoverTriggerContentProps) {
    const { children, className, maxWidth, role, style, ...rest } = props;

    return markTypecaseRole(
        (
            <Popover.Content
                {...rest}
                className={joinClassNames("tc-popover-trigger-content", className)}
                maxWidth={maxWidth}
                role={role}
                style={style}
            >
                {children}
            </Popover.Content>
        ) as HTMLElement,
        POPOVER_TRIGGER_CONTENT_ROLE,
    );
}

export const PopoverTrigger = PopoverTriggerComponent as typeof PopoverTriggerComponent & {
    Anchor: typeof PopoverTriggerAnchor;
    Content: typeof PopoverTriggerContent;
};

PopoverTrigger.Anchor = PopoverTriggerAnchor;
PopoverTrigger.Content = PopoverTriggerContent;
