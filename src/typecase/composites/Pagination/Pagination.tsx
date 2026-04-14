import { joinClassNames } from "../../utils/class-name.ts";

export type PaginationSize = "sm" | "md";

export interface PaginationProps {
    children?: unknown;
    className?: string;
    label?: string;
    size?: PaginationSize;
    [key: string]: unknown;
}

export interface PaginationItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    disabled?: boolean;
    href?: string;
    label?: string;
    onSelect?: (event: Event) => void;
    type?: "button" | "submit" | "reset";
    [key: string]: unknown;
}

export interface PaginationEllipsisProps {
    className?: string;
    label?: string;
    [key: string]: unknown;
}

function PaginationRoot(props: PaginationProps) {
    const {
        children,
        className,
        label = "Pagination",
        size = "md",
        ...rest
    } = props;

    return (
        <nav
            {...rest}
            aria-label={label}
            className={joinClassNames("tc-pagination", className)}
            data-size={size}
        >
            <ul className="tc-pagination-list">{children}</ul>
        </nav>
    );
}

function PaginationItem(props: PaginationItemProps) {
    const {
        active = false,
        children,
        className,
        disabled = false,
        href,
        label,
        onSelect,
        type = "button",
        ...rest
    } = props;

    const itemClassName = joinClassNames("tc-pagination-item", className);
    const controlProps = {
        ...rest,
        "aria-current": active ? "page" : undefined,
        "aria-disabled": disabled ? "true" : undefined,
        "aria-label": label,
        className: "tc-pagination-control",
        "data-active": active ? "true" : "false",
    };

    if (href && !disabled) {
        return (
            <li className={itemClassName}>
                <a {...controlProps} href={href} onClick={onSelect}>
                    {children}
                </a>
            </li>
        );
    }

    if (onSelect && !disabled) {
        return (
            <li className={itemClassName}>
                <button {...controlProps} onClick={onSelect} type={type}>
                    {children}
                </button>
            </li>
        );
    }

    return (
        <li className={itemClassName}>
            <span {...controlProps}>{children}</span>
        </li>
    );
}

function PaginationEllipsis(props: PaginationEllipsisProps) {
    const { className, label = "More pages", ...rest } = props;

    return (
        <li {...rest} className={joinClassNames("tc-pagination-item", className)}>
            <span aria-label={label} className="tc-pagination-ellipsis" role="separator">
                ...
            </span>
        </li>
    );
}

export const Pagination = Object.assign(PaginationRoot, {
    Ellipsis: PaginationEllipsis,
    Item: PaginationItem,
});
