import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type DialogSize = "lg" | "md" | "sm" | string;

export interface DialogProps {
    children?: unknown;
    className?: string;
    onBackdropClick?: (event: Event) => void;
    open?: boolean;
    showBackdrop?: boolean;
    style?: string;
    [key: string]: unknown;
}

export interface DialogPanelProps {
    children?: unknown;
    className?: string;
    label?: string;
    labelledBy?: string;
    size?: DialogSize;
    style?: string;
    [key: string]: unknown;
}

export interface DialogSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

const sizeMap: Record<string, string> = {
    "sm": "24rem",
    "md": "34rem",
    "lg": "44rem",
};

function DialogRoot(props: DialogProps) {
    const {
        children,
        className,
        onBackdropClick,
        open = false,
        showBackdrop = true,
        style,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-dialog", className)}
            data-open={open ? "true" : "false"}
            style={style}
        >
            {showBackdrop
                ? (
                    <button
                        aria-hidden="true"
                        className="tc-dialog-backdrop"
                        onClick={onBackdropClick}
                        tabIndex={-1}
                        type="button"
                    />
                )
                : null}
            {children}
        </div>
    );
}

function DialogPanel(props: DialogPanelProps) {
    const {
        children,
        className,
        label,
        labelledBy,
        size = "md",
        style,
        ...rest
    } = props;

    return (
        <section
            {...rest}
            aria-label={label}
            aria-labelledby={labelledBy}
            aria-modal="true"
            className={joinClassNames("tc-dialog-panel", className)}
            role="dialog"
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-dialog-width": sizeMap[size] ?? size,
                }),
                style,
            )}
            tabIndex={-1}
        >
            {children}
        </section>
    );
}

function DialogHeader(props: DialogSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-dialog-header", className)}>
            {children}
        </div>
    );
}

function DialogTitle(props: DialogSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <h2 {...rest} className={joinClassNames("tc-dialog-title", className)}>
            {children}
        </h2>
    );
}

function DialogBody(props: DialogSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-dialog-body", className)}>
            {children}
        </div>
    );
}

function DialogFooter(props: DialogSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-dialog-footer", className)}>
            {children}
        </div>
    );
}

export const Dialog = Object.assign(DialogRoot, {
    Body: DialogBody,
    Footer: DialogFooter,
    Header: DialogHeader,
    Panel: DialogPanel,
    Title: DialogTitle,
});
