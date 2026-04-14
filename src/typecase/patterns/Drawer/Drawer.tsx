import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Offcanvas, type OffcanvasPlacement } from "../../composites/index.ts";
import { Button, type ButtonProps } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";

interface DrawerState {
    open: boolean;
}

type DrawerTag = "aside" | "div" | "nav";

export interface DrawerProps {
    as?: DrawerTag;
    children?: unknown;
    className?: string;
    closeOnEscape?: boolean;
    contentClassName?: string;
    placement?: OffcanvasPlacement;
    showBackdrop?: boolean;
    style?: string;
    trigger?: unknown;
    triggerLabel?: string;
    width?: string;
    [key: string]: unknown;
}

export type DrawerHeaderProps = {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};

export type DrawerTitleProps = DrawerHeaderProps;
export type DrawerBodyProps = DrawerHeaderProps;
export type DrawerCloseProps = ButtonProps;

let drawerId = 0;

class DrawerComponent extends Component<DrawerProps, DrawerState> {
    private readonly drawerId = `tc-drawer-${++drawerId}`;

    protected override initState(): DrawerState {
        return {
            open: false,
        };
    }

    override onMount(): void {
        this.syncDOMBindings();
    }

    override afterRender(): void {
        this.syncDOMBindings();
    }

    private syncDOMBindings(): void {
        this.registerDOMEvent(window, "keydown", this.handleWindowKeyDown);

        const trigger = this.querySelector(".tc-drawer-trigger button") ??
            this.querySelector(".tc-drawer-trigger");

        if (trigger instanceof HTMLElement) {
            trigger.setAttribute("aria-expanded", this.state.open ? "true" : "false");
            trigger.setAttribute("aria-haspopup", "dialog");
        }

        this.getPortalElement()?.querySelectorAll(".tc-drawer-close").forEach((closeButton) => {
            this.registerDOMEvent(closeButton, "click", this.close);
        });
    }

    private getPortalElement(): HTMLElement | null {
        return this.ownerDocument.querySelector(`[data-tc-drawer-portal="${this.drawerId}"]`);
    }

    private open = (): void => {
        this.setState({ open: true });
    };

    private close = (): void => {
        this.setState({ open: false });
    };

    private handleBackdropClick = (): void => {
        this.close();
    };

    private handleWindowKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || !this.state.open) {
            return;
        }

        if (this.props.closeOnEscape !== false && event.key === "Escape") {
            event.preventDefault();
            this.close();
        }
    };

    private renderTrigger(trigger: unknown, triggerLabel: string) {
        return trigger ?? (
            <Button size="sm" type="button" variant="secondary">
                {triggerLabel}
            </Button>
        );
    }

    override render(): HTMLElement | DocumentFragment {
        const {
            as = "aside",
            children,
            className,
            closeOnEscape: _closeOnEscape,
            contentClassName,
            placement = "start",
            showBackdrop = true,
            style,
            trigger,
            triggerLabel = "Open drawer",
            width,
            ...rest
        } = this.props;

        return (
            <div
                {...rest}
                className={joinClassNames("tc-drawer", className)}
                data-open={this.state.open ? "true" : "false"}
                style={style}
            >
                <span className="tc-drawer-trigger" onClick={this.open}>
                    {this.renderTrigger(trigger, triggerLabel)}
                </span>

                {this.state.open
                    ? (
                        <Portal layer="overlay">
                            <div {...getTypecaseRootShellProps(this)}>
                                <div
                                    className={joinClassNames("tc-drawer-portal", contentClassName)}
                                    data-tc-drawer-portal={this.drawerId}
                                >
                                    <Offcanvas
                                        as={as}
                                        mode="overlay"
                                        onBackdropClick={this.handleBackdropClick}
                                        open
                                        placement={placement}
                                        showBackdrop={showBackdrop}
                                        width={width}
                                    >
                                        {children}
                                    </Offcanvas>
                                </div>
                            </div>
                        </Portal>
                    )
                    : null}
            </div>
        );
    }
}

export function DrawerHeader(props: DrawerHeaderProps) {
    return <Offcanvas.Header {...props} />;
}

export function DrawerTitle(props: DrawerTitleProps) {
    return <Offcanvas.Title {...props} />;
}

export function DrawerBody(props: DrawerBodyProps) {
    return <Offcanvas.Body {...props} />;
}

export function DrawerClose(props: DrawerCloseProps) {
    const { children, className, type = "button", variant = "ghost", ...rest } = props;

    return (
        <Button
            {...rest}
            className={joinClassNames("tc-drawer-close", className)}
            type={type}
            variant={variant}
        >
            {children}
        </Button>
    );
}

export const Drawer = DrawerComponent as typeof DrawerComponent & {
    Body: typeof DrawerBody;
    Close: typeof DrawerClose;
    Header: typeof DrawerHeader;
    Title: typeof DrawerTitle;
};

Drawer.Header = DrawerHeader;
Drawer.Title = DrawerTitle;
Drawer.Body = DrawerBody;
Drawer.Close = DrawerClose;
