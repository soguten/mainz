import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Popover, type PopoverAlign, type PopoverPlacement } from "../../composites/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { getAnchoredFloatingStyle } from "../../utils/floating-style.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";

interface TooltipState {
    open: boolean;
    portalStyle: string;
}

export interface TooltipProps {
    align?: PopoverAlign;
    children?: unknown;
    className?: string;
    closeDelay?: number;
    content: unknown;
    disabled?: boolean;
    maxWidth?: string;
    openDelay?: number;
    placement?: PopoverPlacement;
    style?: string;
    [key: string]: unknown;
}

let tooltipId = 0;

export class Tooltip extends Component<TooltipProps, TooltipState> {
    private readonly tooltipId = `tc-tooltip-${++tooltipId}`;
    private closeTimeoutId: number | null = null;
    private openTimeoutId: number | null = null;

    protected override initState(): TooltipState {
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

    override onUnmount(): void {
        this.clearTimers();
    }

    private syncGlobalBindings(): void {
        this.registerDOMEvent(window, "keydown", this.handleWindowKeyDown);
        this.registerDOMEvent(window, "resize", this.handleWindowResize);
        this.registerDOMEvent(window, "scroll", this.handleWindowScroll);
    }

    private getAnchorElement(): HTMLElement | null {
        const anchor = this.querySelector(".tc-tooltip-anchor");
        return anchor instanceof HTMLElement ? anchor : null;
    }

    private clearTimers(): void {
        if (this.openTimeoutId != null) {
            clearTimeout(this.openTimeoutId);
            this.openTimeoutId = null;
        }

        if (this.closeTimeoutId != null) {
            clearTimeout(this.closeTimeoutId);
            this.closeTimeoutId = null;
        }
    }

    private scheduleOpen = (): void => {
        if (this.props.disabled || this.props.content == null) {
            return;
        }

        this.clearTimers();
        const delay = this.props.openDelay ?? 150;

        this.openTimeoutId = setTimeout(() => {
            this.openTimeoutId = null;
            this.setState({
                open: true,
                portalStyle: this.getPortalStyle(),
            });
        }, delay);
    };

    private scheduleClose = (): void => {
        this.clearTimers();
        const delay = this.props.closeDelay ?? 80;

        this.closeTimeoutId = setTimeout(() => {
            this.closeTimeoutId = null;
            this.setState({ open: false, portalStyle: "" });
        }, delay);
    };

    private close = (): void => {
        this.clearTimers();
        this.setState({ open: false, portalStyle: "" });
    };

    private handleWindowKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || !this.state.open) {
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
            offset: 6,
            placement: this.props.placement,
        });
    }

    override render(): HTMLElement | DocumentFragment {
        const {
            align = "center",
            children,
            className,
            closeDelay: _closeDelay,
            content,
            disabled: _disabled,
            maxWidth,
            openDelay: _openDelay,
            placement = "top",
            style,
            ...rest
        } = this.props;

        return (
            <Popover
                {...rest}
                align={align}
                className={joinClassNames("tc-tooltip-root", className)}
                open={this.state.open}
                placement={placement}
                style={style}
            >
                <Popover.Anchor>
                    <span
                        aria-describedby={this.state.open ? this.tooltipId : undefined}
                        className="tc-tooltip-anchor"
                        onFocusIn={this.scheduleOpen}
                        onFocusOut={this.scheduleClose}
                        onMouseEnter={this.scheduleOpen}
                        onMouseLeave={this.scheduleClose}
                    >
                        {children}
                    </span>
                </Popover.Anchor>

                {this.state.open
                    ? (
                        <Portal layer="popover">
                            <div {...getTypecaseRootShellProps(this)}>
                                <div
                                    className="tc-tooltip-portal"
                                    data-tc-tooltip-portal={this.tooltipId}
                                    style={this.state.portalStyle}
                                >
                                    <Popover.Content
                                        className="tc-tooltip-content"
                                        id={this.tooltipId}
                                        maxWidth={maxWidth}
                                        role="tooltip"
                                    >
                                        {content}
                                    </Popover.Content>
                                </div>
                            </div>
                        </Portal>
                    )
                    : null}
            </Popover>
        );
    }
}
