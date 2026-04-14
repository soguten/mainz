import { joinClassNames } from "../../utils/class-name.ts";

export type LinkBoxTag = "article" | "section" | "div";
export type LinkBoxVariant = "default" | "subtle" | "ghost";

export interface LinkBoxProps {
    as?: LinkBoxTag;
    children?: unknown;
    className?: string;
    variant?: LinkBoxVariant;
    [key: string]: unknown;
}

export interface LinkBoxLinkProps {
    children?: unknown;
    className?: string;
    href: string;
    [key: string]: unknown;
}

export interface LinkBoxSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function LinkBoxRoot(props: LinkBoxProps) {
    const {
        as = "article",
        children,
        className,
        variant = "default",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-link-box", className)}
            data-variant={variant}
        >
            {children}
        </Tag>
    );
}

function LinkBoxLink(props: LinkBoxLinkProps) {
    const { children, className, href, ...rest } = props;

    return (
        <a {...rest} className={joinClassNames("tc-link-box-link", className)} href={href}>
            {children}
        </a>
    );
}

function LinkBoxBody(props: LinkBoxSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-link-box-body", className)}>
            {children}
        </div>
    );
}

function LinkBoxMeta(props: LinkBoxSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-link-box-meta", className)}>
            {children}
        </div>
    );
}

export const LinkBox = Object.assign(LinkBoxRoot, {
    Body: LinkBoxBody,
    Link: LinkBoxLink,
    Meta: LinkBoxMeta,
});
