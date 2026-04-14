import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type OffcanvasTag = "aside" | "div" | "nav";
type OffcanvasMode = "overlay" | "inline" | "responsive";
type OffcanvasPlacement = "start" | "end";

type OffcanvasSectionProps = {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};

export interface OffcanvasProps extends OffcanvasSectionProps {
    as?: OffcanvasTag;
    mode?: OffcanvasMode;
    onBackdropClick?: (event: Event) => void;
    open?: boolean;
    placement?: OffcanvasPlacement;
    showBackdrop?: boolean;
    style?: string;
    width?: string;
}

function OffcanvasRoot(props: OffcanvasProps) {
    const {
        as = "aside",
        children,
        className,
        mode = "overlay",
        onBackdropClick,
        open = false,
        placement = "start",
        showBackdrop = true,
        style,
        width,
        ...rest
    } = props;

    const Tag = as;

    return (
        <div
            className={joinClassNames("tc-offcanvas-shell", className)}
            data-mode={mode}
            data-open={open ? "true" : "false"}
            data-placement={placement}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-offcanvas-width": width,
                }),
                style,
            )}
        >
            {showBackdrop
                ? (
                    <button
                        aria-hidden={open ? undefined : "true"}
                        className="tc-offcanvas-backdrop"
                        onClick={onBackdropClick}
                        tabIndex={-1}
                        type="button"
                    />
                )
                : null}
            <Tag {...rest} className="tc-offcanvas">
                {children}
            </Tag>
        </div>
    );
}

function OffcanvasHeader(props: OffcanvasSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-offcanvas-header", className)}>
            {children}
        </div>
    );
}

function OffcanvasTitle(props: OffcanvasSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <h2 {...rest} className={joinClassNames("tc-offcanvas-title", className)}>
            {children}
        </h2>
    );
}

function OffcanvasBody(props: OffcanvasSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-offcanvas-body", className)}>
            {children}
        </div>
    );
}

export const Offcanvas = Object.assign(OffcanvasRoot, {
    Body: OffcanvasBody,
    Header: OffcanvasHeader,
    Title: OffcanvasTitle,
});

export type { OffcanvasMode, OffcanvasPlacement };
