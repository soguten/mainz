import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type NavbarTag = "div" | "header" | "nav";
type NavbarSectionTag = "div" | "section" | "nav";
type NavbarGap = "sm" | "md" | "lg" | string;

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
};

type NavbarSectionProps = {
    as?: NavbarSectionTag;
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};

export interface NavbarProps {
    as?: NavbarTag;
    children?: unknown;
    className?: string;
    gap?: NavbarGap;
    minHeight?: string;
    style?: string;
    [key: string]: unknown;
}

function NavbarRoot(props: NavbarProps) {
    const {
        as = "nav",
        children,
        className,
        gap = "md",
        minHeight,
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-navbar", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-navbar-gap": gapMap[gap] ?? gap,
                    "--tc-navbar-min-height": minHeight,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

function NavbarBrand(props: NavbarSectionProps) {
    return renderNavbarSection("tc-navbar-brand", props);
}

function NavbarStart(props: NavbarSectionProps) {
    return renderNavbarSection("tc-navbar-start", props);
}

function NavbarNav(props: NavbarSectionProps) {
    return renderNavbarSection("tc-navbar-nav", props);
}

function NavbarActions(props: NavbarSectionProps) {
    return renderNavbarSection("tc-navbar-actions", props);
}

function renderNavbarSection(baseClassName: string, props: NavbarSectionProps) {
    const {
        as = "div",
        children,
        className,
        ...rest
    } = props;

    const Tag = as;
    const responsiveChildAttributes = getResponsiveChildAttributes(children);

    return (
        <Tag
            {...rest}
            className={joinClassNames(baseClassName, className)}
            {...responsiveChildAttributes}
        >
            {children}
        </Tag>
    );
}

function getResponsiveChildAttributes(children: unknown): Record<string, string> {
    const child = getOnlyElementChild(children);

    if (!child?.classList?.contains("tc-show")) {
        return {};
    }

    const attributes: Record<string, string> = {};
    const below = child.getAttribute("data-below");
    const above = child.getAttribute("data-above");
    const betweenStart = child.getAttribute("data-between-start");
    const betweenEnd = child.getAttribute("data-between-end");

    if (below) {
        attributes["data-responsive-child-below"] = below;
    }

    if (above) {
        attributes["data-responsive-child-above"] = above;
    }

    if (betweenStart && betweenEnd) {
        attributes["data-responsive-child-between-start"] = betweenStart;
        attributes["data-responsive-child-between-end"] = betweenEnd;
    }

    return attributes;
}

function getOnlyElementChild(children: unknown): Element | null {
    const normalizedChildren = Array.isArray(children)
        ? children.filter((child) => child != null && child !== false)
        : [children];

    if (normalizedChildren.length !== 1) {
        return null;
    }

    const [child] = normalizedChildren;
    return isElementLike(child) ? child : null;
}

function isElementLike(value: unknown): value is Element {
    return typeof value === "object" && value !== null && "nodeType" in value &&
        (value as { nodeType?: number }).nodeType === 1 && "classList" in value &&
        "getAttribute" in value;
}

export const Navbar = Object.assign(NavbarRoot, {
    Actions: NavbarActions,
    Brand: NavbarBrand,
    Nav: NavbarNav,
    Start: NavbarStart,
});
