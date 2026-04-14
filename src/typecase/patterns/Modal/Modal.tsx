import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Dialog, type DialogSize } from "../../composites/index.ts";
import { Button, type ButtonProps } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { findTypecaseRoleElements, markTypecaseRole } from "../../utils/component-role.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";

interface ModalState {
    open: boolean;
}

export interface ModalProps {
    children?: unknown;
    className?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    contentClassName?: string;
    label?: string;
    labelledBy?: string;
    showBackdrop?: boolean;
    size?: DialogSize;
    style?: string;
    trigger?: unknown;
    triggerLabel?: string;
    [key: string]: unknown;
}

export type ModalHeaderProps = {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};
export type ModalTitleProps = ModalHeaderProps;
export type ModalBodyProps = ModalHeaderProps;
export type ModalFooterProps = ModalHeaderProps;
export type ModalCloseProps = ButtonProps;

let modalId = 0;
const MODAL_CLOSE_ROLE = "Modal.Close";

class ModalComponent extends Component<ModalProps, ModalState> {
    private readonly modalId = `tc-modal-${++modalId}`;
    private restoreFocusElement: HTMLElement | null = null;
    private shouldFocusPanel = false;

    protected override initState(): ModalState {
        return {
            open: false,
        };
    }

    override onMount(): void {
        this.syncDOMBindings();
    }

    override afterRender(): void {
        this.syncDOMBindings();
        this.focusPanelWhenNeeded();
    }

    private syncDOMBindings(): void {
        this.registerDOMEvent(window, "keydown", this.handleWindowKeyDown);

        const trigger = this.querySelector(".tc-modal-trigger button") ??
            this.querySelector(".tc-modal-trigger");

        if (trigger instanceof HTMLElement) {
            trigger.setAttribute("aria-expanded", this.state.open ? "true" : "false");
            trigger.setAttribute("aria-haspopup", "dialog");
        }

        const portalElement = this.getPortalElement();

        if (!portalElement) {
            return;
        }

        for (const closeElement of findTypecaseRoleElements(portalElement, MODAL_CLOSE_ROLE)) {
            this.registerDOMEvent(closeElement, "click", this.close);
        }
    }

    private getPortalElement(): HTMLElement | null {
        return this.ownerDocument.querySelector(`[data-tc-modal-portal="${this.modalId}"]`);
    }

    private getPanelElement(): HTMLElement | null {
        return this.ownerDocument.querySelector(`[data-tc-modal-panel="${this.modalId}"]`);
    }

    private open = (): void => {
        const activeElement = this.ownerDocument.activeElement;

        this.restoreFocusElement = activeElement instanceof HTMLElement ? activeElement : null;
        this.shouldFocusPanel = true;
        this.setState({ open: true });
    };

    private close = (): void => {
        this.shouldFocusPanel = false;
        this.setState({ open: false });
        this.restoreFocus();
    };

    private restoreFocus(): void {
        if (!this.restoreFocusElement?.isConnected) {
            this.restoreFocusElement = null;
            return;
        }

        this.restoreFocusElement.focus();
        this.restoreFocusElement = null;
    }

    private focusPanelWhenNeeded(): void {
        if (!this.shouldFocusPanel || !this.state.open) {
            return;
        }

        this.shouldFocusPanel = false;
        this.getPanelElement()?.focus();
    }

    private handleBackdropClick = (): void => {
        if (this.props.closeOnBackdrop === false) {
            return;
        }

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
            children,
            className,
            closeOnBackdrop: _closeOnBackdrop,
            closeOnEscape: _closeOnEscape,
            contentClassName,
            label,
            labelledBy,
            showBackdrop = true,
            size = "md",
            style,
            trigger,
            triggerLabel = "Open modal",
            ...rest
        } = this.props;

        return (
            <div
                {...rest}
                className={joinClassNames("tc-modal", className)}
                data-open={this.state.open ? "true" : "false"}
                style={style}
            >
                <span className="tc-modal-trigger" onClick={this.open}>
                    {this.renderTrigger(trigger, triggerLabel)}
                </span>

                {this.state.open
                    ? (
                        <Portal layer="overlay">
                            <div {...getTypecaseRootShellProps(this)}>
                                <div
                                    className={joinClassNames("tc-modal-portal", contentClassName)}
                                    data-tc-modal-portal={this.modalId}
                                >
                                    <Dialog
                                        onBackdropClick={this.handleBackdropClick}
                                        open
                                        showBackdrop={showBackdrop}
                                    >
                                        <Dialog.Panel
                                            data-tc-modal-panel={this.modalId}
                                            label={label}
                                            labelledBy={labelledBy}
                                            size={size}
                                        >
                                            {children}
                                        </Dialog.Panel>
                                    </Dialog>
                                </div>
                            </div>
                        </Portal>
                    )
                    : null}
            </div>
        );
    }
}

export function ModalHeader(props: ModalHeaderProps) {
    return <Dialog.Header {...props} />;
}

export function ModalTitle(props: ModalTitleProps) {
    return <Dialog.Title {...props} />;
}

export function ModalBody(props: ModalBodyProps) {
    return <Dialog.Body {...props} />;
}

export function ModalFooter(props: ModalFooterProps) {
    return <Dialog.Footer {...props} />;
}

export function ModalClose(props: ModalCloseProps) {
    const { children, className, type = "button", variant = "ghost", ...rest } = props;

    return markTypecaseRole(
        (
            <Button
                {...rest}
                className={joinClassNames("tc-modal-close", className)}
                type={type}
                variant={variant}
            >
                {children}
            </Button>
        ) as HTMLElement,
        MODAL_CLOSE_ROLE,
    );
}

export const Modal = ModalComponent as typeof ModalComponent & {
    Body: typeof ModalBody;
    Close: typeof ModalClose;
    Footer: typeof ModalFooter;
    Header: typeof ModalHeader;
    Title: typeof ModalTitle;
};

Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Close = ModalClose;
