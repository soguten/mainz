import { joinClassNames } from "../../utils/class-name.ts";

export type BreadcrumbVariant = "default" | "subtle";

export interface BreadcrumbProps {
    children?: unknown;
    className?: string;
    label?: string;
    variant?: BreadcrumbVariant;
    [key: string]: unknown;
}

export interface BreadcrumbItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    href?: string;
    [key: string]: unknown;
}

function BreadcrumbRoot(props: BreadcrumbProps) {
    const {
        children,
        className,
        label = "Breadcrumb",
        variant = "default",
        ...rest
    } = props;

    return (
        <nav {...rest} aria-label={label} className={joinClassNames("tc-breadcrumb", className)}>
            <ol className="tc-breadcrumb-list" data-variant={variant}>
                {children}
            </ol>
        </nav>
    );
}

function BreadcrumbItem(props: BreadcrumbItemProps) {
    const {
        active = false,
        children,
        className,
        href,
        ...rest
    } = props;

    return (
        <li
            {...rest}
            className={joinClassNames("tc-breadcrumb-item", className)}
            data-active={active ? "true" : "false"}
        >
            {href && !active ? <a className="tc-breadcrumb-link" href={href}>{children}</a> : (
                <span
                    aria-current={active ? "page" : undefined}
                    className="tc-breadcrumb-current"
                >
                    {children}
                </span>
            )}
        </li>
    );
}

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
    Item: BreadcrumbItem,
});
