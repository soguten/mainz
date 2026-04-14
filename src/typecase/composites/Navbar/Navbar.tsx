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

    return (
        <Tag {...rest} className={joinClassNames(baseClassName, className)}>
            {children}
        </Tag>
    );
}

export const Navbar = Object.assign(NavbarRoot, {
    Actions: NavbarActions,
    Brand: NavbarBrand,
    Nav: NavbarNav,
    Start: NavbarStart,
});
